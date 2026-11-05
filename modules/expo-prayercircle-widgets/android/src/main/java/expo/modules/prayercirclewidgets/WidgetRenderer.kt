package expo.modules.prayercirclewidgets

import android.app.PendingIntent
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Path
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import kotlin.math.roundToLong

/** The widgets and the provider class + compiled layout each renders.
 * The first six are v438's; v441 adds the three rectangles (W-3). */
enum class WidgetKind(
  val providerClass: Class<out AppWidgetProvider>,
  val layoutRes: Int,
) {
  PRAY_TODAY(PrayTodayWidgetProvider::class.java, R.layout.widget_pray_today),
  EMERGENCY(EmergencyWidgetProvider::class.java, R.layout.widget_emergency),
  YOUR_FAST(YourFastWidgetProvider::class.java, R.layout.widget_your_fast),
  REACH_OUT(ReachOutWidgetProvider::class.java, R.layout.widget_reach_out),
  UP_NEXT(UpNextWidgetProvider::class.java, R.layout.widget_up_next),
  YOUR_STUDY(YourStudyWidgetProvider::class.java, R.layout.widget_your_study),
  PRAY_STRIP(PrayStripWidgetProvider::class.java, R.layout.widget_pray_strip),
  PRAY_NEXT(PrayNextWidgetProvider::class.java, R.layout.widget_pray_next),
  REACH_PAIR(ReachPairWidgetProvider::class.java, R.layout.widget_reach_pair),
}

/**
 * v438 — the whole render path, in plain Android. Each render builds
 * RemoteViews over a compiled layout and fills fixed slots from the
 * snapshot JSON (WidgetSnapshotStore), toggling slots by visibility
 * — the classic RemoteViews pattern. No JS, no headless task, no
 * generated code: if the snapshot is absent the layouts' own
 * defaults stand, which are the widgets' quiet faces.
 *
 * Colours arrive as hex strings in the JSON (people carry their own
 * avatar colours; Study carries its book's ROYGBIV set) and are
 * painted onto white shape drawables via ImageView setColorFilter —
 * the mechanism RemoteViews actually supports for runtime colour.
 */
object WidgetRenderer {
  private val INK = Color.parseColor("#F4F1FD")
  private val MUTED = Color.parseColor("#AAA2C6")
  private val SEED = Color.parseColor("#A78BFA")
  private val RING_OFF = Color.parseColor("#4A3D78")
  private val STATE_PRAYED = Color.parseColor("#9D8CFF")
  private val STATE_NEXT = Color.parseColor("#CFC8EE")
  private val STATE_WAITING = Color.parseColor("#8D84B3")

  fun render(context: Context, kind: WidgetKind, minHeightDp: Int): RemoteViews {
    val root = WidgetSnapshotStore.read(context)
    val scheme = root?.optString("scheme")?.takeIf { it.isNotBlank() }
    val views = RemoteViews(context.packageName, kind.layoutRes)
    when (kind) {
      WidgetKind.PRAY_TODAY -> renderPrayToday(context, views, root?.optJSONObject("prayToday"), scheme)
      WidgetKind.EMERGENCY -> renderEmergency(context, views, root?.optJSONObject("emergency"), scheme)
      WidgetKind.YOUR_FAST -> renderYourFast(context, views, root?.optJSONObject("fast"), scheme)
      WidgetKind.REACH_OUT -> renderReachOut(context, views, root?.optJSONObject("reachOut"), scheme)
      WidgetKind.UP_NEXT -> renderUpNext(context, views, root?.optJSONObject("upNext"), scheme)
      WidgetKind.YOUR_STUDY -> renderYourStudy(context, views, root?.optJSONObject("study"), scheme, minHeightDp)
      WidgetKind.PRAY_STRIP -> renderPrayStrip(context, views, root, scheme)
      WidgetKind.PRAY_NEXT -> renderPrayNext(context, views, root, scheme)
      WidgetKind.REACH_PAIR -> renderReachPair(context, views, root, scheme)
    }
    return views
  }

  // ─── Shared helpers ───────────────────────────────────────────────────────

  private fun colorOr(hex: String?, fallback: Int): Int {
    if (hex.isNullOrBlank()) return fallback
    return try {
      Color.parseColor(hex)
    } catch (_: Exception) {
      fallback
    }
  }

  /** A tap that opens the app at a deep link (open-to-act — a widget
   * tap never completes or saves anything). */
  private fun uriPendingIntent(context: Context, uri: String, requestCode: Int): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getActivity(context, requestCode, intent, flags)
  }

  /** A tap that simply opens the app (the quiet faces' behaviour). */
  private fun launchPendingIntent(context: Context, requestCode: Int): PendingIntent {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    } ?: Intent(Intent.ACTION_MAIN).apply {
      setPackage(context.packageName)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getActivity(context, requestCode, intent, flags)
  }

  private fun prayUri(scheme: String, personId: String, kind: String): String =
    "$scheme:///?widgetPrayPersonId=${Uri.encode(personId)}&widgetPrayKind=$kind"

  // ─── v441: people's photos ────────────────────────────────────────────────
  //
  // A face in the snapshot may carry "photo": the person's photoUri
  // — a file:// path in the APP's own storage (the same field the
  // in-app AvatarImage renders). The providers run in the app's
  // process, so the file is legitimately readable here. The bitmap
  // is decoded small, centre-cropped square and circle-clipped in
  // THIS process, then shipped to the launcher like the v439
  // glyphs. ANY failure — a non-file URI (content://, http…), a
  // missing file, a decode error — returns null and the caller
  // renders the initials exactly as before v441. People whose face
  // is a bundled avatarAsset carry no photo and keep initials.

  private val photoCache = LinkedHashMap<String, Bitmap>()

  private fun dpPx(context: Context, dp: Int): Int =
    (dp * context.resources.displayMetrics.density).toInt().coerceIn(48, 256)

  private fun photoBitmap(context: Context, rawPath: String?, sizePx: Int): Bitmap? {
    val path = rawPath?.trim()?.takeIf { it.isNotBlank() } ?: return null
    // Only plain local files the app itself wrote: file:// URIs
    // and absolute paths. Anything else keeps the initials.
    val filePath = when {
      path.startsWith("file://") -> try {
        Uri.parse(path).path
      } catch (_: Exception) {
        null
      }
      path.startsWith("/") -> path
      else -> null
    } ?: return null
    val key = "$filePath@$sizePx"
    synchronized(photoCache) { photoCache[key]?.let { return it } }
    val bitmap = try {
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(filePath, bounds)
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
      var sample = 1
      while (bounds.outWidth / (sample * 2) >= sizePx && bounds.outHeight / (sample * 2) >= sizePx) {
        sample *= 2
      }
      val decoded = BitmapFactory.decodeFile(
        filePath,
        BitmapFactory.Options().apply { inSampleSize = sample },
      ) ?: return null
      val side = minOf(decoded.width, decoded.height)
      val square = Bitmap.createBitmap(
        decoded,
        (decoded.width - side) / 2,
        (decoded.height - side) / 2,
        side,
        side,
      )
      val scaled = if (square.width != sizePx) {
        Bitmap.createScaledBitmap(square, sizePx, sizePx, true)
      } else {
        square
      }
      val out = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(out)
      val clip = Path().apply {
        addCircle(sizePx / 2f, sizePx / 2f, sizePx / 2f, Path.Direction.CW)
      }
      canvas.clipPath(clip)
      canvas.drawBitmap(scaled, 0f, 0f, null)
      out
    } catch (_: Exception) {
      null
    } ?: return null
    synchronized(photoCache) {
      photoCache[key] = bitmap
      // A small cache: faces repeat across widgets, and 24 small
      // circles is plenty before the eldest can go.
      while (photoCache.size > 24) {
        photoCache.remove(photoCache.keys.first())
      }
    }
    return bitmap
  }

  /**
   * One avatar slot, photo-or-initials: where the face carries a
   * photo that decodes, the image view takes the circle photo and
   * the initials blank (and NO colour tint touches the photo —
   * setImageViewBitmap replaces the tinted circle drawable whole).
   * Otherwise the slot renders exactly as it did before v441: the
   * person's colour as the circle's tint, their initials on top.
   */
  private fun applyFace(
    context: Context,
    views: RemoteViews,
    imgId: Int,
    textId: Int,
    face: JSONObject,
    fallbackColor: Int,
    sizeDp: Int,
  ) {
    val photo = photoBitmap(context, face.optString("photo"), dpPx(context, sizeDp))
    if (photo != null) {
      views.setImageViewBitmap(imgId, photo)
      views.setTextViewText(textId, "")
    } else {
      // Re-set the circle drawable too: RemoteViews reuses the
      // placed view hierarchy across updates, so a photo bitmap
      // from an earlier render must be replaced, not just tinted.
      views.setImageViewResource(imgId, R.drawable.widget_circle_white)
      views.setInt(imgId, "setColorFilter", colorOr(face.optString("color"), fallbackColor))
      views.setTextViewText(textId, face.optString("initials"))
    }
  }

  // ─── v441: the widget palette (the rectangles' dress) ─────────────────────
  //
  // The three rectangles carry no dress colours of their own: the
  // snapshot root's "palette" object (lib/widget-palette — the
  // app's seed × appearance, derived on the JS side) paints their
  // white shape drawables and text. An absent palette (a snapshot
  // written before v441) falls back to the W-3 drawing's
  // Classic-light values, which are also the layouts' XML defaults.

  private class WidgetPalette(root: JSONObject?) {
    private val pal = root?.optJSONObject("palette")
    private fun hex(key: String, fallback: String): Int =
      colorOr(pal?.optString(key)?.takeIf { it.isNotBlank() } ?: fallback, Color.parseColor(fallback))

    val surface = hex("surface", "#F7F3FE")
    val surfaceAlt = hex("surfaceAlt", "#EFE9FB")
    val ink = hex("ink", "#221A3E")
    val body = hex("body", "#4A4270")
    val muted = hex("muted", "#7A72A0")
    val primary = hex("primary", "#6D4BD8")
    val onPrimary = hex("onPrimary", "#FFFFFF")
    val container = hex("container", "#E6DEF9")
    val onContainer = hex("onContainer", "#2A1666")
    val chip = hex("chip", "#E9E2FA")
    val track = hex("track", "#E0D8F5")
    val green = hex("green", "#2E7D46")
    val greenContainer = hex("greenContainer", "#DFF0E4")
  }

  private fun paletteOf(root: JSONObject?): WidgetPalette = WidgetPalette(root)

  // ─── 1. Pray Today ────────────────────────────────────────────────────────

  private val PT_SLOTS = intArrayOf(R.id.pt_face_1, R.id.pt_face_2, R.id.pt_face_3, R.id.pt_face_4, R.id.pt_face_5, R.id.pt_face_6)
  private val PT_RINGS = intArrayOf(R.id.pt_face_ring_1, R.id.pt_face_ring_2, R.id.pt_face_ring_3, R.id.pt_face_ring_4, R.id.pt_face_ring_5, R.id.pt_face_ring_6)
  private val PT_IMGS = intArrayOf(R.id.pt_face_img_1, R.id.pt_face_img_2, R.id.pt_face_img_3, R.id.pt_face_img_4, R.id.pt_face_img_5, R.id.pt_face_img_6)
  private val PT_TEXTS = intArrayOf(R.id.pt_face_text_1, R.id.pt_face_text_2, R.id.pt_face_text_3, R.id.pt_face_text_4, R.id.pt_face_text_5, R.id.pt_face_text_6)
  private val PT_NAMES = intArrayOf(R.id.pt_face_name_1, R.id.pt_face_name_2, R.id.pt_face_name_3, R.id.pt_face_name_4, R.id.pt_face_name_5, R.id.pt_face_name_6)
  private val PT_STATES = intArrayOf(R.id.pt_face_state_1, R.id.pt_face_state_2, R.id.pt_face_state_3, R.id.pt_face_state_4, R.id.pt_face_state_5, R.id.pt_face_state_6)

  private fun renderPrayToday(context: Context, views: RemoteViews, snap: JSONObject?, scheme: String?) {
    val base = 100
    val state = snap?.optString("state") ?: "no-queue"
    if (snap == null || state == "no-queue") {
      // The layout defaults already say it; just wire the tap.
      views.setOnClickPendingIntent(R.id.pt_root, launchPendingIntent(context, base))
      return
    }
    val faces = snap.optJSONArray("faces") ?: JSONArray()
    fillPrayFaces(context, views, faces, snap.optString("personId"), state == "next")
    views.setTextViewText(R.id.pt_count, "${snap.optInt("prayed")} of ${snap.optInt("total")} prayed")
    if (state == "complete") {
      views.setTextViewText(R.id.pt_msg_title, "Pray Today complete")
      views.setViewVisibility(R.id.pt_msg_title, View.VISIBLE)
      views.setViewVisibility(R.id.pt_msg_sub, View.GONE)
      views.setViewVisibility(R.id.pt_faces, View.VISIBLE)
      views.setOnClickPendingIntent(R.id.pt_root, launchPendingIntent(context, base))
      return
    }
    // state == "next"
    views.setViewVisibility(R.id.pt_msg_title, View.GONE)
    views.setViewVisibility(R.id.pt_msg_sub, View.GONE)
    views.setViewVisibility(R.id.pt_hero, View.VISIBLE)
    views.setViewVisibility(R.id.pt_faces, View.VISIBLE)
    applyFace(context, views, R.id.pt_avatar_img, R.id.pt_avatar_text, snap, SEED, 54)
    views.setTextViewText(R.id.pt_who, "NEXT UP · ${snap.optString("name").uppercase(Locale.US)}")
    val needTitle = snap.optString("needTitle")
    views.setTextViewText(R.id.pt_need, needTitle)
    views.setViewVisibility(R.id.pt_need, if (needTitle.isBlank()) View.GONE else View.VISIBLE)
    val needLine = snap.optString("needLine")
    views.setTextViewText(R.id.pt_line, needLine)
    views.setViewVisibility(R.id.pt_line, if (needLine.isBlank()) View.GONE else View.VISIBLE)
    val tap = if (scheme != null) {
      uriPendingIntent(context, prayUri(scheme, snap.optString("personId"), "today"), base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.pt_root, tap)
    views.setOnClickPendingIntent(R.id.pt_pill, tap)
  }

  private fun fillPrayFaces(context: Context, views: RemoteViews, faces: JSONArray, nextPersonId: String?, hasNext: Boolean) {
    val overflow = faces.length() > PT_SLOTS.size
    for (i in PT_SLOTS.indices) {
      if (i >= faces.length()) {
        views.setViewVisibility(PT_SLOTS[i], View.GONE)
        continue
      }
      views.setViewVisibility(PT_SLOTS[i], View.VISIBLE)
      if (overflow && i == PT_SLOTS.size - 1) {
        // Slot 6 becomes the +N counter for the faces beyond it.
        views.setInt(PT_RINGS[i], "setColorFilter", RING_OFF)
        views.setInt(PT_IMGS[i], "setColorFilter", RING_OFF)
        views.setTextViewText(PT_TEXTS[i], "+${faces.length() - (PT_SLOTS.size - 1)}")
        views.setTextViewText(PT_NAMES[i], "")
        views.setTextViewText(PT_STATES[i], "")
        continue
      }
      val face = faces.optJSONObject(i) ?: continue
      val prayed = face.optBoolean("prayed")
      views.setInt(PT_RINGS[i], "setColorFilter", if (prayed) SEED else RING_OFF)
      applyFace(context, views, PT_IMGS[i], PT_TEXTS[i], face, SEED, 28)
      views.setTextViewText(PT_NAMES[i], face.optString("firstName"))
      views.setTextColor(PT_NAMES[i], if (prayed) SEED else MUTED)
      when {
        prayed -> {
          views.setTextViewText(PT_STATES[i], "PRAYED")
          views.setTextColor(PT_STATES[i], STATE_PRAYED)
        }
        hasNext && face.optString("personId") == nextPersonId -> {
          views.setTextViewText(PT_STATES[i], "NEXT")
          views.setTextColor(PT_STATES[i], STATE_NEXT)
        }
        else -> {
          views.setTextViewText(PT_STATES[i], "WAITING")
          views.setTextColor(PT_STATES[i], STATE_WAITING)
        }
      }
    }
  }

  // ─── 2. Emergency ─────────────────────────────────────────────────────────

  /**
   * The app's own countdown wording (lib/bell-header formatHoursLeft
   * + the banner's "of 24"), mirrored so the provider can re-format
   * it from expiresAtMillis on every OS refresh — the hours stay
   * honest while the app sleeps. Keep the two in step.
   */
  fun emergencyLeftText(expiresAtMillis: Long, nowMillis: Long): String {
    val ms = expiresAtMillis - nowMillis
    val raw = when {
      ms <= 0 -> "ending now"
      ms / 60000.0 < 55 -> "under an hour left"
      else -> {
        val hours = (ms / 3600000.0).roundToLong()
        if (hours <= 1) "about 1 hour left" else "about $hours hours left"
      }
    }
    return raw.replaceFirstChar { it.uppercase(Locale.US) } + " of 24"
  }

  private val EM_ROWS = intArrayOf(R.id.em_row_1, R.id.em_row_2)
  private val EM_AVATAR_IMGS = intArrayOf(R.id.em_avatar_img_1, R.id.em_avatar_img_2)
  private val EM_AVATAR_TEXTS = intArrayOf(R.id.em_avatar_text_1, R.id.em_avatar_text_2)
  private val EM_NAMES = intArrayOf(R.id.em_name_1, R.id.em_name_2)
  private val EM_TITLES = intArrayOf(R.id.em_title_1, R.id.em_title_2)
  private val EM_NOTES = intArrayOf(R.id.em_note_1, R.id.em_note_2)
  private val EM_LEFTS = intArrayOf(R.id.em_left_1, R.id.em_left_2)
  private val EM_PILLS = intArrayOf(R.id.em_pill_1, R.id.em_pill_2)

  private fun renderEmergency(context: Context, views: RemoteViews, snap: JSONObject?, scheme: String?) {
    val base = 200
    val now = System.currentTimeMillis()
    val all = mutableListOf<JSONObject>()
    if (snap != null && snap.optString("state") == "active") {
      for (key in listOf("rows", "extraRows")) {
        val arr = snap.optJSONArray(key) ?: continue
        for (i in 0 until arr.length()) arr.optJSONObject(i)?.let { all.add(it) }
      }
    }
    // Rows whose window has closed since the snapshot was pushed
    // drop out at render — the widget never shows a dead emergency.
    val live = all.filter { row ->
      val expires = row.optLong("expiresAtMillis", 0L)
      expires <= 0L || expires > now
    }
    if (live.isEmpty()) {
      views.setInt(R.id.em_root, "setBackgroundResource", R.drawable.widget_bg)
      views.setTextViewText(R.id.em_kicker, "EMERGENCY")
      views.setTextColor(R.id.em_kicker, MUTED)
      views.setOnClickPendingIntent(R.id.em_root, launchPendingIntent(context, base))
      return
    }
    views.setInt(R.id.em_root, "setBackgroundResource", R.drawable.widget_bg_emergency)
    views.setTextViewText(R.id.em_kicker, "EMERGENCY · ${live.size} ACTIVE")
    views.setTextColor(R.id.em_kicker, Color.parseColor("#FFD9D2"))
    views.setViewVisibility(R.id.em_msg_title, View.GONE)
    views.setViewVisibility(R.id.em_msg_sub, View.GONE)
    for (slot in EM_ROWS.indices) {
      if (slot >= live.size) {
        views.setViewVisibility(EM_ROWS[slot], View.GONE)
        continue
      }
      val row = live[slot]
      views.setViewVisibility(EM_ROWS[slot], View.VISIBLE)
      applyFace(context, views, EM_AVATAR_IMGS[slot], EM_AVATAR_TEXTS[slot], row, SEED, 52)
      views.setTextViewText(EM_NAMES[slot], row.optString("name").uppercase(Locale.US))
      views.setTextViewText(EM_TITLES[slot], row.optString("title"))
      val note = row.optString("note")
      views.setTextViewText(EM_NOTES[slot], note)
      views.setViewVisibility(EM_NOTES[slot], if (note.isBlank()) View.GONE else View.VISIBLE)
      val expires = row.optLong("expiresAtMillis", 0L)
      views.setTextViewText(
        EM_LEFTS[slot],
        if (expires > 0L) emergencyLeftText(expires, now) else row.optString("leftText"),
      )
      if (scheme != null) {
        val tap = uriPendingIntent(context, prayUri(scheme, row.optString("personId"), "emergency"), base + 1 + slot)
        views.setOnClickPendingIntent(EM_ROWS[slot], tap)
        views.setOnClickPendingIntent(EM_PILLS[slot], tap)
      }
    }
    val firstTap = if (scheme != null) {
      uriPendingIntent(context, prayUri(scheme, live[0].optString("personId"), "emergency"), base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.em_root, firstTap)
  }

  // ─── 3. Your Fast ─────────────────────────────────────────────────────────

  private val FAST_HEARTS = intArrayOf(R.id.fast_heart_1, R.id.fast_heart_2, R.id.fast_heart_3, R.id.fast_heart_4, R.id.fast_heart_5, R.id.fast_heart_6)

  private fun renderYourFast(context: Context, views: RemoteViews, snap: JSONObject?, scheme: String?) {
    val base = 300
    if (scheme != null) {
      views.setOnClickPendingIntent(R.id.fast_root, uriPendingIntent(context, "$scheme://fasting-tracker", base))
    } else {
      views.setOnClickPendingIntent(R.id.fast_root, launchPendingIntent(context, base))
    }
    if (snap == null || snap.optString("state") != "active") return
    views.setViewVisibility(R.id.fast_msg, View.GONE)
    views.setViewVisibility(R.id.fast_day, View.VISIBLE)
    views.setViewVisibility(R.id.fast_name, View.VISIBLE)
    views.setTextViewText(R.id.fast_day, "Day ${snap.optInt("dayNumber")}")
    views.setTextViewText(R.id.fast_name, "${snap.optString("name")} · of ${snap.optInt("totalDays")}")
    if (snap.isNull("hearts") || snap.isNull("maxHearts")) {
      views.setViewVisibility(R.id.fast_hearts, View.GONE)
      return
    }
    val hearts = snap.optInt("hearts")
    val maxHearts = snap.optInt("maxHearts")
    views.setViewVisibility(R.id.fast_hearts, View.VISIBLE)
    for (i in FAST_HEARTS.indices) {
      val slot = i + 1
      if (slot > maxHearts) {
        views.setViewVisibility(FAST_HEARTS[i], View.GONE)
      } else {
        views.setViewVisibility(FAST_HEARTS[i], View.VISIBLE)
        views.setImageViewBitmap(FAST_HEARTS[i], heartBitmap(if (slot <= hearts) SEED else RING_OFF))
      }
    }
  }

  // ─── 4. Due to Reach Out ──────────────────────────────────────────────────

  private fun renderReachOut(context: Context, views: RemoteViews, snap: JSONObject?, scheme: String?) {
    val base = 400
    if (scheme != null) {
      views.setOnClickPendingIntent(R.id.reach_root, uriPendingIntent(context, "$scheme://due-to-reach", base))
    } else {
      views.setOnClickPendingIntent(R.id.reach_root, launchPendingIntent(context, base))
    }
    if (snap == null || snap.optString("state") != "due") return
    val lead = snap.optJSONObject("lead") ?: return
    views.setViewVisibility(R.id.reach_msg_title, View.GONE)
    views.setViewVisibility(R.id.reach_msg_sub, View.GONE)
    views.setViewVisibility(R.id.reach_lead, View.VISIBLE)
    applyFace(context, views, R.id.reach_avatar_img, R.id.reach_avatar_text, lead, SEED, 40)
    views.setTextViewText(R.id.reach_days, "${lead.optInt("days")} days")
    views.setTextViewText(R.id.reach_since, "since you reached ${lead.optString("firstName")}")
    val second = snap.optJSONObject("second")
    if (second == null) {
      views.setViewVisibility(R.id.reach_second, View.GONE)
      return
    }
    views.setViewVisibility(R.id.reach_second, View.VISIBLE)
    applyFace(context, views, R.id.reach_second_img, R.id.reach_second_text_init, second, SEED, 24)
    views.setTextViewText(R.id.reach_second_text, "${second.optString("firstName")} · ${second.optInt("days")}d")
    val totalDue = snap.optInt("totalDue")
    views.setTextViewText(R.id.reach_more, if (totalDue > 2) "+${totalDue - 2} more due" else "")
  }

  // ─── 5. Up Next ───────────────────────────────────────────────────────────

  private fun renderUpNext(context: Context, views: RemoteViews, snap: JSONObject?, scheme: String?) {
    val base = 500
    if (scheme != null) {
      views.setOnClickPendingIntent(R.id.next_root, uriPendingIntent(context, "$scheme:///?navTab=schedule", base))
    } else {
      views.setOnClickPendingIntent(R.id.next_root, launchPendingIntent(context, base))
    }
    if (snap == null || snap.optString("state") != "next") return
    views.setViewVisibility(R.id.next_msg, View.GONE)
    views.setViewVisibility(R.id.next_main, View.VISIBLE)
    views.setTextViewText(R.id.next_time, snap.optString("timeLabel"))
    views.setTextViewText(R.id.next_title, snap.optString("title"))
    val line = snap.optString("line")
    views.setTextViewText(R.id.next_line, line)
    views.setViewVisibility(R.id.next_line, if (line.isBlank()) View.GONE else View.VISIBLE)
    val then = snap.optString("thenOpenText")
    if (then.isBlank()) {
      views.setViewVisibility(R.id.next_divider, View.GONE)
      views.setViewVisibility(R.id.next_then, View.GONE)
    } else {
      views.setViewVisibility(R.id.next_divider, View.VISIBLE)
      views.setViewVisibility(R.id.next_then, View.VISIBLE)
      views.setTextViewText(R.id.next_then, then)
    }
  }

  // ─── 6. Your Study ────────────────────────────────────────────────────────

  private fun renderYourStudy(context: Context, views: RemoteViews, snap: JSONObject?, scheme: String?, minHeightDp: Int) {
    val base = 600
    if (snap == null || snap.optString("state") != "active") {
      views.setOnClickPendingIntent(R.id.study_root, launchPendingIntent(context, base))
      return
    }
    val primary = colorOr(snap.optString("colorPrimary"), SEED)
    views.setInt(R.id.study_bg_img, "setColorFilter", colorOr(snap.optString("colorTint"), Color.parseColor("#2C2140")))
    views.setInt(R.id.study_dot, "setColorFilter", primary)
    views.setInt(R.id.study_tile, "setColorFilter", primary)
    views.setInt(R.id.study_pill_img, "setColorFilter", primary)
    views.setViewVisibility(R.id.study_msg, View.GONE)
    views.setViewVisibility(R.id.study_main, View.VISIBLE)
    views.setImageViewBitmap(R.id.study_book_glyph, bookBitmap())
    views.setViewVisibility(R.id.study_footer, View.VISIBLE)
    val nextChapter = if (snap.isNull("nextChapter")) null else snap.optInt("nextChapter")
    val book = snap.optString("book")
    views.setTextViewText(R.id.study_book, if (nextChapter != null) "$book $nextChapter" else book)
    views.setTextViewText(R.id.study_next, if (nextChapter != null) "Next to write" else "Fully written")
    val verse = snap.optString("verseText")
    // Short placements shed the verse first, then the restudy row —
    // the chapter itself always stands.
    if (verse.isBlank() || (minHeightDp in 1..199)) {
      views.setViewVisibility(R.id.study_verse, View.GONE)
    } else {
      views.setViewVisibility(R.id.study_verse, View.VISIBLE)
      val ref = snap.optString("verseRef")
      views.setTextViewText(R.id.study_verse, if (ref.isBlank()) verse else "$verse — $ref")
    }
    val lastChapter = if (snap.isNull("lastWrittenChapter")) null else snap.optInt("lastWrittenChapter")
    if (lastChapter == null) {
      views.setViewVisibility(R.id.study_last, View.GONE)
    } else {
      views.setViewVisibility(R.id.study_last, View.VISIBLE)
      val notes = if (snap.isNull("lastWrittenNotes")) null else snap.optInt("lastWrittenNotes")
      views.setTextViewText(
        R.id.study_last,
        "Last written · Chapter $lastChapter" + if (notes != null) " · $notes notes" else "",
      )
    }
    val restudy = snap.optString("restudyLine")
    if (restudy.isBlank() || (minHeightDp in 1..214)) {
      views.setViewVisibility(R.id.study_restudy, View.GONE)
    } else {
      views.setViewVisibility(R.id.study_restudy, View.VISIBLE)
      views.setTextViewText(R.id.study_restudy, "Restudy · $restudy")
    }
    views.setTextViewText(R.id.study_prog, "${snap.optInt("chaptersWritten")} of ${snap.optInt("totalChapters")} written")
    val openChapter = nextChapter ?: lastChapter ?: 1
    val tap = if (scheme != null) {
      uriPendingIntent(context, "$scheme://bible-chapter?book=${Uri.encode(book)}&chapter=$openChapter", base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.study_root, tap)
    views.setOnClickPendingIntent(R.id.study_pill, tap)
    views.setTextColor(R.id.study_prog, MUTED)
    views.setTextColor(R.id.study_last, MUTED)
  }

  // ─── 7. Pray Strip (v441, W-3 R-1) ────────────────────────────────────────

  private val PS_SLOTS = intArrayOf(R.id.ps_face_1, R.id.ps_face_2, R.id.ps_face_3, R.id.ps_face_4, R.id.ps_face_5, R.id.ps_face_6)
  private val PS_RINGS = intArrayOf(R.id.ps_face_ring_1, R.id.ps_face_ring_2, R.id.ps_face_ring_3, R.id.ps_face_ring_4, R.id.ps_face_ring_5, R.id.ps_face_ring_6)
  private val PS_IMGS = intArrayOf(R.id.ps_face_img_1, R.id.ps_face_img_2, R.id.ps_face_img_3, R.id.ps_face_img_4, R.id.ps_face_img_5, R.id.ps_face_img_6)
  private val PS_TEXTS = intArrayOf(R.id.ps_face_text_1, R.id.ps_face_text_2, R.id.ps_face_text_3, R.id.ps_face_text_4, R.id.ps_face_text_5, R.id.ps_face_text_6)
  private val PS_NAMES = intArrayOf(R.id.ps_face_name_1, R.id.ps_face_name_2, R.id.ps_face_name_3, R.id.ps_face_name_4, R.id.ps_face_name_5, R.id.ps_face_name_6)
  private val PS_STATES = intArrayOf(R.id.ps_face_state_1, R.id.ps_face_state_2, R.id.ps_face_state_3, R.id.ps_face_state_4, R.id.ps_face_state_5, R.id.ps_face_state_6)

  /** The rectangle form of Pray Today: same snapshot, same queue
   * order, same overflow rule — five faces stand and the rest fold
   * into the +N slot (the big widget fits six; the strip is
   * narrower, so its fold starts one earlier). */
  private fun renderPrayStrip(context: Context, views: RemoteViews, root: JSONObject?, scheme: String?) {
    val base = 700
    val pal = paletteOf(root)
    val snap = root?.optJSONObject("prayToday")
    // The palette paints the whole card, quiet face included.
    views.setInt(R.id.ps_bg, "setColorFilter", pal.surface)
    views.setInt(R.id.ps_dot, "setColorFilter", pal.primary)
    views.setTextColor(R.id.ps_kicker, pal.muted)
    views.setTextColor(R.id.ps_count, pal.muted)
    views.setTextColor(R.id.ps_msg_title, pal.ink)
    views.setTextColor(R.id.ps_msg_sub, pal.body)
    val state = snap?.optString("state") ?: "no-queue"
    if (snap == null || state == "no-queue") {
      views.setOnClickPendingIntent(R.id.ps_root, launchPendingIntent(context, base))
      return
    }
    views.setTextViewText(R.id.ps_count, "${snap.optInt("prayed")} of ${snap.optInt("total")} prayed")
    val faces = snap.optJSONArray("faces") ?: JSONArray()
    fillStripFaces(context, views, faces, snap.optString("personId"), state == "next", pal)
    views.setViewVisibility(R.id.ps_faces, View.VISIBLE)
    if (state == "complete") {
      views.setTextViewText(R.id.ps_msg_title, "Pray Today complete")
      views.setViewVisibility(R.id.ps_msg_title, View.VISIBLE)
      views.setViewVisibility(R.id.ps_msg_sub, View.GONE)
      views.setOnClickPendingIntent(R.id.ps_root, launchPendingIntent(context, base))
      return
    }
    views.setViewVisibility(R.id.ps_msg_title, View.GONE)
    views.setViewVisibility(R.id.ps_msg_sub, View.GONE)
    val tap = if (scheme != null) {
      uriPendingIntent(context, prayUri(scheme, snap.optString("personId"), "today"), base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.ps_root, tap)
  }

  private fun fillStripFaces(
    context: Context,
    views: RemoteViews,
    faces: JSONArray,
    nextPersonId: String?,
    hasNext: Boolean,
    pal: WidgetPalette,
  ) {
    val visible = 5
    val overflow = faces.length() > visible
    for (i in PS_SLOTS.indices) {
      if (i >= faces.length() || (overflow && i > visible)) {
        views.setViewVisibility(PS_SLOTS[i], View.GONE)
        continue
      }
      views.setViewVisibility(PS_SLOTS[i], View.VISIBLE)
      if (overflow && i == visible) {
        // The last slot becomes the +N counter (never a photo).
        views.setInt(PS_RINGS[i], "setColorFilter", pal.container)
        views.setImageViewResource(PS_IMGS[i], R.drawable.widget_circle_white)
        views.setInt(PS_IMGS[i], "setColorFilter", pal.container)
        views.setTextViewText(PS_TEXTS[i], "+${faces.length() - visible}")
        views.setTextColor(PS_TEXTS[i], pal.onContainer)
        views.setTextViewText(PS_NAMES[i], "")
        views.setTextViewText(PS_STATES[i], "")
        continue
      }
      val face = faces.optJSONObject(i) ?: continue
      val prayed = face.optBoolean("prayed")
      val isNext = hasNext && face.optString("personId") == nextPersonId
      views.setInt(PS_RINGS[i], "setColorFilter", if (prayed || isNext) pal.primary else pal.container)
      applyFace(context, views, PS_IMGS[i], PS_TEXTS[i], face, pal.primary, 40)
      views.setTextColor(PS_TEXTS[i], Color.WHITE)
      views.setTextViewText(PS_NAMES[i], face.optString("firstName"))
      views.setTextColor(PS_NAMES[i], if (prayed) pal.primary else pal.ink)
      when {
        prayed -> {
          views.setTextViewText(PS_STATES[i], "PRAYED")
          views.setTextColor(PS_STATES[i], pal.primary)
        }
        isNext -> {
          views.setTextViewText(PS_STATES[i], "NEXT")
          views.setTextColor(PS_STATES[i], pal.primary)
        }
        else -> {
          views.setTextViewText(PS_STATES[i], "WAITING")
          views.setTextColor(PS_STATES[i], pal.muted)
        }
      }
    }
  }

  // ─── 8. Pray Next (v441, W-3 R-2) ─────────────────────────────────────────

  /** The rectangle given to one person: the prayToday snapshot's
   * next person, their need composed the way the big widget
   * composes it (title, else the note line), and the same pray
   * deep link on the pill (and the card). */
  private fun renderPrayNext(context: Context, views: RemoteViews, root: JSONObject?, scheme: String?) {
    val base = 800
    val pal = paletteOf(root)
    val snap = root?.optJSONObject("prayToday")
    views.setInt(R.id.pn_bg, "setColorFilter", pal.surface)
    views.setTextColor(R.id.pn_msg_title, pal.ink)
    views.setTextColor(R.id.pn_msg_sub, pal.body)
    val state = snap?.optString("state") ?: "no-queue"
    if (snap == null || state != "next") {
      // No next person (empty queue, or the day complete): the
      // quiet face stands — msg is the layout default.
      views.setOnClickPendingIntent(R.id.pn_root, launchPendingIntent(context, base))
      return
    }
    views.setViewVisibility(R.id.pn_msg, View.GONE)
    views.setViewVisibility(R.id.pn_hero, View.VISIBLE)
    views.setInt(R.id.pn_ring, "setColorFilter", pal.primary)
    // The hero IS the next person: the snapshot's top-level face
    // fields ride the same face shape applyFace reads.
    applyFace(context, views, R.id.pn_img, R.id.pn_text, snap, pal.primary, 62)
    views.setTextColor(R.id.pn_text, Color.WHITE)
    views.setTextColor(R.id.pn_kicker, pal.primary)
    views.setTextViewText(R.id.pn_name, snap.optString("firstName"))
    views.setTextColor(R.id.pn_name, pal.ink)
    val needTitle = snap.optString("needTitle")
    val needLine = snap.optString("needLine")
    val need = when {
      needTitle.isNotBlank() && needLine.isNotBlank() -> "$needTitle — $needLine"
      needTitle.isNotBlank() -> needTitle
      else -> needLine
    }
    views.setTextViewText(R.id.pn_need, need)
    views.setViewVisibility(R.id.pn_need, if (need.isBlank()) View.GONE else View.VISIBLE)
    views.setTextColor(R.id.pn_need, pal.body)
    views.setInt(R.id.pn_pill_img, "setColorFilter", pal.primary)
    views.setTextColor(R.id.pn_pill, pal.onPrimary)
    val tap = if (scheme != null) {
      uriPendingIntent(context, prayUri(scheme, snap.optString("personId"), "today"), base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.pn_root, tap)
    views.setOnClickPendingIntent(R.id.pn_pill, tap)
  }

  // ─── 9. Reach Pair (v441, W-3 R-3) ────────────────────────────────────────

  private val RP_IMGS = intArrayOf(R.id.rp_img_1, R.id.rp_img_2)
  private val RP_TEXTS = intArrayOf(R.id.rp_text_1, R.id.rp_text_2)
  private val RP_NAMES = intArrayOf(R.id.rp_name_1, R.id.rp_name_2)
  private val RP_CHIP_IMGS = intArrayOf(R.id.rp_chip_img_1, R.id.rp_chip_img_2)
  private val RP_CHIPS = intArrayOf(R.id.rp_chip_1, R.id.rp_chip_2)

  /** The two most overdue people side by side (the reachOut
   * snapshot's lead + second), each with its "{days} days" chip in
   * the reached green's kind-tones. One due: the second column
   * hides and the spacers show, centring the lead. */
  private fun renderReachPair(context: Context, views: RemoteViews, root: JSONObject?, scheme: String?) {
    val base = 900
    val pal = paletteOf(root)
    val snap = root?.optJSONObject("reachOut")
    views.setInt(R.id.rp_bg, "setColorFilter", pal.surface)
    views.setInt(R.id.rp_dot, "setColorFilter", pal.green)
    views.setTextColor(R.id.rp_kicker, pal.muted)
    views.setTextColor(R.id.rp_msg_title, pal.ink)
    views.setTextColor(R.id.rp_msg_sub, pal.body)
    val tap = if (scheme != null) {
      uriPendingIntent(context, "$scheme://due-to-reach", base)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.rp_root, tap)
    if (snap == null || snap.optString("state") != "due") return
    val lead = snap.optJSONObject("lead") ?: return
    views.setViewVisibility(R.id.rp_msg_title, View.GONE)
    views.setViewVisibility(R.id.rp_msg_sub, View.GONE)
    views.setViewVisibility(R.id.rp_pair, View.VISIBLE)
    views.setViewVisibility(R.id.rp_due_wrap, View.VISIBLE)
    views.setInt(R.id.rp_due_img, "setColorFilter", pal.greenContainer)
    views.setTextViewText(R.id.rp_due, "${snap.optInt("totalDue")} due")
    views.setTextColor(R.id.rp_due, pal.green)
    val people = listOf(lead, snap.optJSONObject("second"))
    for (i in people.indices) {
      val person = people[i]
      if (person == null) continue
      applyFace(context, views, RP_IMGS[i], RP_TEXTS[i], person, pal.green, 52)
      views.setTextColor(RP_TEXTS[i], Color.WHITE)
      views.setTextViewText(RP_NAMES[i], person.optString("firstName"))
      views.setTextColor(RP_NAMES[i], pal.ink)
      views.setInt(RP_CHIP_IMGS[i], "setColorFilter", pal.greenContainer)
      views.setTextViewText(RP_CHIPS[i], "${person.optInt("days")} days")
      views.setTextColor(RP_CHIPS[i], pal.green)
    }
    if (people[1] == null) {
      views.setViewVisibility(R.id.rp_col_2, View.GONE)
      views.setViewVisibility(R.id.rp_sp_1, View.VISIBLE)
      views.setViewVisibility(R.id.rp_sp_2, View.VISIBLE)
    }
  }

  // ─── Runtime-drawn glyphs (v439) ──────────────────────────────────────────
  //
  // v438 shipped the fast hearts and the Study book as <vector>
  // drawables in res — and on his phone the widgets carrying them
  // failed to load at all ("Couldn't add widget"), while the
  // vector-free Emergency widget rendered. RemoteViews inflation
  // happens in the LAUNCHER's process, which cannot be trusted with
  // anything beyond the vanilla widget subset. So the glyphs are
  // drawn HERE, in our own process at render time, and shipped to
  // the launcher as plain bitmaps — the one image form every
  // launcher accepts. Nothing vector-based remains in res.

  private val heartLitBitmap: Bitmap by lazy { drawHeartBitmap(SEED) }
  private val heartRestingBitmap: Bitmap by lazy { drawHeartBitmap(RING_OFF) }
  private val bookGlyphBitmap: Bitmap by lazy { drawBookBitmap() }

  /** The heart for a fast slot: seed-lit or resting, cached per colour. */
  private fun heartBitmap(color: Int): Bitmap = when (color) {
    SEED -> heartLitBitmap
    RING_OFF -> heartRestingBitmap
    else -> drawHeartBitmap(color)
  }

  /** The Study tile's book glyph (white outline, drawn once, cached). */
  private fun bookBitmap(): Bitmap = bookGlyphBitmap

  /**
   * The fast heart, drawn with the same path geometry the deleted
   * vector carried (24-unit viewport): M12 21 s-7.5-4.7 -10-9.3
   * C.3 8.6 1.8 4.9 5.2 4.4 c2-.3 3.9.7 4.9 2.2 l1.9 2.7 1.9-2.7
   * c1-1.5 2.9-2.5 4.9-2.2 3.4.5 4.9 4.2 3.2 7.3 C19.5 16.3 12 21
   * 12 21 z — the s/c shorthand expanded to absolute cubicTo calls
   * below, scaled onto a 64x64 bitmap.
   */
  private fun drawHeartBitmap(color: Int): Bitmap {
    val size = 64
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val path = Path().apply {
      moveTo(12f, 21f)
      // s-7.5-4.7 -10-9.3 (first control point = current point: the
      // previous command was a move, so there is no curve to reflect)
      cubicTo(12f, 21f, 4.5f, 16.3f, 2f, 11.7f)
      // C.3 8.6 1.8 4.9 5.2 4.4
      cubicTo(0.3f, 8.6f, 1.8f, 4.9f, 5.2f, 4.4f)
      // c2-.3 3.9.7 4.9 2.2
      cubicTo(7.2f, 4.1f, 9.1f, 5.1f, 10.1f, 6.6f)
      // l1.9 2.7 1.9-2.7 (the notch at the top of the heart)
      lineTo(12f, 9.3f)
      lineTo(13.9f, 6.6f)
      // c1-1.5 2.9-2.5 4.9-2.2, then its implicit second segment
      // 3.4.5 4.9 4.2 3.2 7.3
      cubicTo(14.9f, 5.1f, 16.8f, 4.1f, 18.8f, 4.4f)
      cubicTo(22.2f, 4.9f, 23.7f, 8.6f, 22f, 11.7f)
      // C19.5 16.3 12 21 12 21
      cubicTo(19.5f, 16.3f, 12f, 21f, 12f, 21f)
      close()
    }
    val matrix = Matrix().apply { setScale(size / 24f, size / 24f) }
    path.transform(matrix)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.FILL
      this.color = color
    }
    canvas.drawPath(path, paint)
    return bitmap
  }

  /**
   * An open-book outline for the Study tile, drawn with Path
   * primitives only: two page curves (quadTo), the outer edges, the
   * bottom page curves and the centre spine — a simple, legible
   * book at the ~24dp it renders. 72x72, white stroke.
   */
  private fun drawBookBitmap(): Bitmap {
    val size = 72
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      color = Color.WHITE
      strokeWidth = 5f
      strokeCap = Paint.Cap.ROUND
      strokeJoin = Paint.Join.ROUND
    }
    val path = Path().apply {
      // Left page: top curve in from the spine, outer edge down,
      // bottom curve back to the spine.
      moveTo(36f, 14f)
      quadTo(24f, 8f, 10f, 12f)
      lineTo(10f, 54f)
      quadTo(24f, 60f, 36f, 56f)
      // Right page: bottom curve out from the spine, outer edge up,
      // top curve back to the spine.
      quadTo(48f, 60f, 62f, 54f)
      lineTo(62f, 12f)
      quadTo(48f, 8f, 36f, 14f)
      // The spine.
      moveTo(36f, 14f)
      lineTo(36f, 56f)
    }
    canvas.drawPath(path, paint)
    return bitmap
  }
}
