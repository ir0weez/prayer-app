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
import android.graphics.RectF
import android.net.Uri
import android.os.Build
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import java.util.Calendar
import java.util.Locale
import kotlin.math.roundToLong
import org.json.JSONArray
import org.json.JSONObject

/** The widgets and the provider class + compiled layout each renders.
 * The first six are v438's; v441 adds the three rectangles (W-3).
 * v442: Emergency and Up Next pick a second compiled layout at
 * render time by the widget's real height (the enum keeps the
 * standard layout as the registration default). v443 adds the
 * two 2×1 strips (Emergency ES-1, Reading ST-2) and recomposes
 * the three rectangles at 2×1 in the same layouts. */
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
  EMERGENCY_STRIP(EmergencyStripWidgetProvider::class.java, R.layout.widget_emergency_strip),
  READING_STRIP(ReadingStripWidgetProvider::class.java, R.layout.widget_reading_strip),
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
 *
 * v442 — the dress. All nine widgets paint from an EFFECTIVE
 * palette resolved per render: the DEVICE's Material You system
 * colours first (API 31+, read in-process through the provider
 * context; the system resources are night-qualified, so the values
 * already follow the DEVICE's dark mode as resolved in this
 * context — not the app's appearance setting). When the system
 * colours are unavailable or any read fails, the snapshot
 * "palette" (the app seed x appearance, lib/widget-palette.ts) is
 * used whole, exactly as v441 built it. Meaning hues are never
 * device-mapped: Emergency red, the ROYGBIV book colours, and the
 * reached-green family — green and greenContainer always come
 * from the snapshot palette.
 */
object WidgetRenderer {
  private val SEED = Color.parseColor("#A78BFA")
  private val RING_OFF = Color.parseColor("#4A3D78")

  fun render(context: Context, kind: WidgetKind, minHeightDp: Int): RemoteViews {
    val root = WidgetSnapshotStore.read(context)
    val scheme = root?.optString("scheme")?.takeIf { it.isNotBlank() }
    val pal = effectivePalette(context, root)
    return when (kind) {
      WidgetKind.PRAY_TODAY ->
        renderPrayToday(context, root?.optJSONObject("prayToday"), scheme, pal)
      WidgetKind.EMERGENCY ->
        renderEmergency(context, root?.optJSONObject("emergency"), scheme, pal, minHeightDp)
      WidgetKind.YOUR_FAST ->
        renderYourFast(context, root?.optJSONObject("fast"), scheme, pal)
      WidgetKind.REACH_OUT ->
        renderReachOut(context, root?.optJSONObject("reachOut"), scheme, pal)
      WidgetKind.UP_NEXT ->
        renderUpNext(context, root?.optJSONObject("upNext"), scheme, pal, minHeightDp)
      WidgetKind.YOUR_STUDY ->
        renderYourStudy(context, root?.optJSONObject("study"), scheme, pal)
      WidgetKind.PRAY_STRIP -> renderPrayStrip(context, root, scheme, pal)
      WidgetKind.PRAY_NEXT -> renderPrayNext(context, root, scheme, pal)
      WidgetKind.REACH_PAIR -> renderReachPair(context, root, scheme, pal)
      WidgetKind.EMERGENCY_STRIP ->
        renderEmergencyStrip(context, root?.optJSONObject("emergency"), scheme, pal)
      WidgetKind.READING_STRIP ->
        renderReadingStrip(context, root?.optJSONObject("study"), scheme, pal)
    }
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

  // ─── The palette (v441 dress, v442 effective resolution) ──────────────────
  //
  // The snapshot root's "palette" object (lib/widget-palette — the
  // app's seed × appearance, derived on the JS side) is the dress
  // of last resort: an absent palette (a snapshot written before
  // v441) falls back to the W-3 drawing's Classic-light values,
  // which are also the layouts' XML defaults. v442 resolves the
  // EFFECTIVE palette per render — device Material You first (see
  // devicePalette), this snapshot palette when the device cannot
  // answer. The reached-green family is a meaning hue: it is read
  // from the snapshot palette in both worlds.

  private class WidgetPalette private constructor(
    val surface: Int,
    val surfaceAlt: Int,
    val ink: Int,
    val body: Int,
    val muted: Int,
    val primary: Int,
    val onPrimary: Int,
    val container: Int,
    val onContainer: Int,
    val chip: Int,
    val track: Int,
    val green: Int,
    val greenContainer: Int,
  ) {
    companion object {
      /** Full construction for callers outside the class (the
       *  device-palette path); the constructor itself stays private. */
      fun of(
        surface: Int,
        surfaceAlt: Int,
        ink: Int,
        body: Int,
        muted: Int,
        primary: Int,
        onPrimary: Int,
        container: Int,
        onContainer: Int,
        chip: Int,
        track: Int,
        green: Int,
        greenContainer: Int,
      ): WidgetPalette = WidgetPalette(
        surface = surface,
        surfaceAlt = surfaceAlt,
        ink = ink,
        body = body,
        muted = muted,
        primary = primary,
        onPrimary = onPrimary,
        container = container,
        onContainer = onContainer,
        chip = chip,
        track = track,
        green = green,
        greenContainer = greenContainer,
      )

      /** The snapshot's own palette, Classic-light fallbacks. */
      fun fromSnapshot(root: JSONObject?): WidgetPalette {
        val pal = root?.optJSONObject("palette")
        fun hex(key: String, fallback: String): Int =
          colorOr(pal?.optString(key)?.takeIf { it.isNotBlank() } ?: fallback, Color.parseColor(fallback))
        return WidgetPalette(
          surface = hex("surface", "#F7F3FE"),
          surfaceAlt = hex("surfaceAlt", "#EFE9FB"),
          ink = hex("ink", "#221A3E"),
          body = hex("body", "#4A4270"),
          muted = hex("muted", "#7A72A0"),
          primary = hex("primary", "#6D4BD8"),
          onPrimary = hex("onPrimary", "#FFFFFF"),
          container = hex("container", "#E6DEF9"),
          onContainer = hex("onContainer", "#2A1666"),
          chip = hex("chip", "#E9E2FA"),
          track = hex("track", "#E0D8F5"),
          green = hex("green", "#2E7D46"),
          greenContainer = hex("greenContainer", "#DFF0E4"),
        )
      }
    }
  }

  private fun paletteOf(root: JSONObject?): WidgetPalette = WidgetPalette.fromSnapshot(root)

  /** The effective palette for one render: the device's Material
   *  You colours when they can be read, the snapshot palette
   *  (paletteOf) whole when they cannot — never a mix of the two,
   *  except the greens, which are the snapshot's in both worlds. */
  private fun effectivePalette(context: Context, root: JSONObject?): WidgetPalette {
    val snapshot = paletteOf(root)
    return devicePalette(context, snapshot) ?: snapshot
  }

  /** The device's Material You system colours mapped onto the
   *  palette roles: accent1 600 is the primary; accent2's light
   *  tones carry containers and chips, its 900 the ink on them;
   *  neutral1 carries surface and ink, neutral2 the softer
   *  surfaces, body/muted text and the track. The system
   *  resources are night-qualified, so light/dark follows the
   *  DEVICE's system dark mode as resolved in the widget
   *  provider's context. Null on any failure (pre-31 device, a
   *  missing tone) — the caller falls back whole. */
  private fun devicePalette(context: Context, snapshot: WidgetPalette): WidgetPalette? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return null
    return try {
      val res = context.resources
      fun sys(id: Int): Int = res.getColor(id, context.theme)
      val primary = sys(android.R.color.system_accent1_600)
      // White ink on the primary, unless the tone is light, where
      // the near-black neutral reads better.
      val onPrimary =
        if (luminance(primary) > 0.72) sys(android.R.color.system_neutral1_900) else Color.WHITE
      WidgetPalette.of(
        surface = sys(android.R.color.system_neutral1_50),
        surfaceAlt = sys(android.R.color.system_neutral2_100),
        ink = sys(android.R.color.system_neutral1_900),
        body = sys(android.R.color.system_neutral2_700),
        muted = sys(android.R.color.system_neutral2_600),
        primary = primary,
        onPrimary = onPrimary,
        container = sys(android.R.color.system_accent2_100),
        onContainer = sys(android.R.color.system_accent2_900),
        chip = sys(android.R.color.system_accent2_200),
        track = sys(android.R.color.system_neutral2_200),
        green = snapshot.green,
        greenContainer = snapshot.greenContainer,
      )
    } catch (_: Exception) {
      null
    }
  }

  private fun luminance(color: Int): Double =
    (0.299 * Color.red(color) + 0.587 * Color.green(color) + 0.114 * Color.blue(color)) / 255.0

  /** Blend two colours: fraction 0 = a, 1 = b. (The rail's resting
   *  dots wear the primary softened toward the surface.) */
  private fun blend(a: Int, b: Int, fraction: Float): Int {
    val f = fraction.coerceIn(0f, 1f)
    return Color.rgb(
      kotlin.math.round(Color.red(a) + (Color.red(b) - Color.red(a)) * f).toInt(),
      kotlin.math.round(Color.green(a) + (Color.green(b) - Color.green(a)) * f).toInt(),
      kotlin.math.round(Color.blue(a) + (Color.blue(b) - Color.blue(a)) * f).toInt(),
    )
  }

  // ─── Drawn bars and the rail check (v442) ─────────────────────────────────
  //
  // Progress in this widget subset is a bitmap drawn in THIS
  // process (the v439 glyph pattern): a rounded track with a
  // rounded fill, colours and fraction passed in per render.

  private val barCache = HashMap<String, Bitmap>()

  private fun barBitmap(fillColor: Int, trackColor: Int, fraction: Float): Bitmap {
    val frac = fraction.coerceIn(0f, 1f)
    val key = "$fillColor|$trackColor|${(frac * 100).toInt()}"
    barCache[key]?.let { return it }
    val w = 720
    val h = 36
    val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    paint.color = trackColor
    canvas.drawRoundRect(RectF(0f, 0f, w.toFloat(), h.toFloat()), h / 2f, h / 2f, paint)
    val fillW = frac * w
    if (fillW > 0f) {
      paint.color = fillColor
      val fw = maxOf(fillW, h.toFloat())
      canvas.drawRoundRect(RectF(0f, 0f, fw, h.toFloat()), h / 2f, h / 2f, paint)
    }
    if (barCache.size > 24) barCache.clear()
    barCache[key] = bitmap
    return bitmap
  }

  private var checkCache: Pair<Int, Bitmap>? = null

  /** The rail's done check — the W-6 drawing's bold check path,
   *  stroked round in the given colour. */
  private fun checkBitmap(color: Int): Bitmap {
    checkCache?.let { if (it.first == color) return it.second }
    val size = 54
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      this.color = color
      strokeWidth = 6f
      strokeCap = Paint.Cap.ROUND
      strokeJoin = Paint.Join.ROUND
    }
    val s = size / 24f
    val path = Path().apply {
      moveTo(4.5f * s, 12.5f * s)
      lineTo(9.5f * s, 17.5f * s)
      lineTo(19.5f * s, 7f * s)
    }
    canvas.drawPath(path, paint)
    checkCache = color to bitmap
    return bitmap
  }

  // ─── 1. Pray Today (v442, W-4 D-1) ────────────────────────────────────────

  private val PT_SLOTS = intArrayOf(R.id.pt_face_1, R.id.pt_face_2, R.id.pt_face_3, R.id.pt_face_4, R.id.pt_face_5, R.id.pt_face_6)
  private val PT_RINGS = intArrayOf(R.id.pt_face_ring_1, R.id.pt_face_ring_2, R.id.pt_face_ring_3, R.id.pt_face_ring_4, R.id.pt_face_ring_5, R.id.pt_face_ring_6)
  private val PT_IMGS = intArrayOf(R.id.pt_face_img_1, R.id.pt_face_img_2, R.id.pt_face_img_3, R.id.pt_face_img_4, R.id.pt_face_img_5, R.id.pt_face_img_6)
  private val PT_TEXTS = intArrayOf(R.id.pt_face_text_1, R.id.pt_face_text_2, R.id.pt_face_text_3, R.id.pt_face_text_4, R.id.pt_face_text_5, R.id.pt_face_text_6)
  private val PT_NAMES = intArrayOf(R.id.pt_face_name_1, R.id.pt_face_name_2, R.id.pt_face_name_3, R.id.pt_face_name_4, R.id.pt_face_name_5, R.id.pt_face_name_6)
  private val PT_STATES = intArrayOf(R.id.pt_face_state_1, R.id.pt_face_state_2, R.id.pt_face_state_3, R.id.pt_face_state_4, R.id.pt_face_state_5, R.id.pt_face_state_6)

  private fun renderPrayToday(context: Context, snap: JSONObject?, scheme: String?, pal: WidgetPalette): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_pray_today)
    val base = 100
    // The palette paints the chrome in every state, quiet included.
    views.setInt(R.id.pt_bg, "setColorFilter", pal.surface)
    views.setInt(R.id.pt_dot, "setColorFilter", pal.primary)
    views.setTextColor(R.id.pt_kicker, pal.muted)
    views.setTextColor(R.id.pt_count, pal.muted)
    views.setTextColor(R.id.pt_msg_title, pal.ink)
    views.setTextColor(R.id.pt_msg_sub, pal.body)
    val state = snap?.optString("state") ?: "no-queue"
    if (snap == null || state == "no-queue") {
      // The quiet face, restored whole — a busier render may have
      // left its own texts and toggles on these views.
      views.setTextViewText(R.id.pt_msg_title, "Open PrayerCircle")
      views.setViewVisibility(R.id.pt_msg_title, View.VISIBLE)
      views.setTextViewText(R.id.pt_msg_sub, "Today's prayer list will stand here.")
      views.setViewVisibility(R.id.pt_msg_sub, View.VISIBLE)
      views.setTextViewText(R.id.pt_count, "")
      views.setViewVisibility(R.id.pt_hero, View.GONE)
      views.setViewVisibility(R.id.pt_faces, View.GONE)
      views.setViewVisibility(R.id.pt_daybar, View.GONE)
      views.setOnClickPendingIntent(R.id.pt_root, launchPendingIntent(context, base))
      return views
    }
    val faces = snap.optJSONArray("faces") ?: JSONArray()
    fillPrayFaces(context, views, faces, snap.optString("personId"), state == "next", pal)
    views.setTextViewText(R.id.pt_count, "${snap.optInt("prayed")} of ${snap.optInt("total")} prayed")
    // The day bar along the bottom: prayed of total, drawn.
    val total = snap.optInt("total")
    views.setViewVisibility(R.id.pt_daybar, View.VISIBLE)
    views.setImageViewBitmap(
      R.id.pt_daybar,
      barBitmap(pal.primary, pal.track, if (total > 0) snap.optInt("prayed").toFloat() / total else 0f),
    )
    if (state == "complete") {
      views.setTextViewText(R.id.pt_msg_title, "Pray Today complete")
      views.setViewVisibility(R.id.pt_msg_title, View.VISIBLE)
      views.setViewVisibility(R.id.pt_msg_sub, View.GONE)
      views.setViewVisibility(R.id.pt_hero, View.GONE)
      views.setViewVisibility(R.id.pt_faces, View.VISIBLE)
      views.setOnClickPendingIntent(R.id.pt_root, launchPendingIntent(context, base))
      return views
    }
    // state == "next"
    views.setViewVisibility(R.id.pt_msg_title, View.GONE)
    views.setViewVisibility(R.id.pt_msg_sub, View.GONE)
    views.setViewVisibility(R.id.pt_hero, View.VISIBLE)
    views.setViewVisibility(R.id.pt_faces, View.VISIBLE)
    views.setInt(R.id.pt_avatar_ring, "setColorFilter", pal.primary)
    applyFace(context, views, R.id.pt_avatar_img, R.id.pt_avatar_text, snap, pal.primary, 54)
    views.setTextColor(R.id.pt_avatar_text, Color.WHITE)
    views.setTextViewText(R.id.pt_who, "NEXT UP · ${snap.optString("name").uppercase(Locale.US)}")
    views.setTextColor(R.id.pt_who, pal.primary)
    val needTitle = snap.optString("needTitle")
    views.setTextViewText(R.id.pt_need, needTitle)
    views.setTextColor(R.id.pt_need, pal.ink)
    views.setViewVisibility(R.id.pt_need, if (needTitle.isBlank()) View.GONE else View.VISIBLE)
    val needLine = snap.optString("needLine")
    views.setTextViewText(R.id.pt_line, needLine)
    views.setTextColor(R.id.pt_line, pal.body)
    views.setViewVisibility(R.id.pt_line, if (needLine.isBlank()) View.GONE else View.VISIBLE)
    views.setInt(R.id.pt_pill_img, "setColorFilter", pal.primary)
    views.setTextColor(R.id.pt_pill_text, pal.onPrimary)
    val tap = if (scheme != null) {
      uriPendingIntent(context, prayUri(scheme, snap.optString("personId"), "today"), base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.pt_root, tap)
    views.setOnClickPendingIntent(R.id.pt_pill, tap)
    return views
  }

  private fun fillPrayFaces(context: Context, views: RemoteViews, faces: JSONArray, nextPersonId: String?, hasNext: Boolean, pal: WidgetPalette) {
    val overflow = faces.length() > PT_SLOTS.size
    for (i in PT_SLOTS.indices) {
      if (i >= faces.length()) {
        views.setViewVisibility(PT_SLOTS[i], View.GONE)
        continue
      }
      views.setViewVisibility(PT_SLOTS[i], View.VISIBLE)
      if (overflow && i == PT_SLOTS.size - 1) {
        // Slot 6 becomes the +N counter for the faces beyond it,
        // wearing the container tone (the rectangles' fold dress).
        views.setInt(PT_RINGS[i], "setColorFilter", pal.container)
        views.setImageViewResource(PT_IMGS[i], R.drawable.widget_circle_white)
        views.setInt(PT_IMGS[i], "setColorFilter", pal.container)
        views.setTextViewText(PT_TEXTS[i], "+${faces.length() - (PT_SLOTS.size - 1)}")
        views.setTextColor(PT_TEXTS[i], pal.onContainer)
        views.setTextViewText(PT_NAMES[i], "")
        views.setTextViewText(PT_STATES[i], "")
        continue
      }
      val face = faces.optJSONObject(i) ?: continue
      val prayed = face.optBoolean("prayed")
      val isNext = hasNext && face.optString("personId") == nextPersonId
      views.setInt(PT_RINGS[i], "setColorFilter", if (prayed || isNext) pal.primary else pal.track)
      applyFace(context, views, PT_IMGS[i], PT_TEXTS[i], face, pal.primary, 40)
      views.setTextColor(PT_TEXTS[i], Color.WHITE)
      views.setTextViewText(PT_NAMES[i], face.optString("firstName"))
      views.setTextColor(PT_NAMES[i], if (prayed) pal.primary else pal.ink)
      when {
        prayed -> {
          views.setTextViewText(PT_STATES[i], "PRAYED")
          views.setTextColor(PT_STATES[i], pal.primary)
        }
        isNext -> {
          views.setTextViewText(PT_STATES[i], "NEXT")
          views.setTextColor(PT_STATES[i], pal.primary)
        }
        else -> {
          views.setTextViewText(PT_STATES[i], "WAITING")
          views.setTextColor(PT_STATES[i], pal.muted)
        }
      }
    }
  }

  // ─── 2. Emergency (v442: W-5 one-active + W-4 D-2 rows) ───────────────────

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

  // v445: the Emergency strip's own countdown helpers
  // (emergencyStripLeftText / emergencyShortLeftText, v443)
  // are deleted — Jonathan ruled the strip carries no hours
  // chip and no hours suffix at all ("Not in the widget
  // anyway."). The big Emergency widget above keeps its own
  // countdown (emergencyLeftText) untouched.

  private val EM_ROWS = intArrayOf(R.id.em_row_1, R.id.em_row_2)
  private val EM_AVATAR_IMGS = intArrayOf(R.id.em_avatar_img_1, R.id.em_avatar_img_2)
  private val EM_AVATAR_TEXTS = intArrayOf(R.id.em_avatar_text_1, R.id.em_avatar_text_2)
  private val EM_NAMES = intArrayOf(R.id.em_name_1, R.id.em_name_2)
  private val EM_TITLES = intArrayOf(R.id.em_title_1, R.id.em_title_2)
  private val EM_NOTES = intArrayOf(R.id.em_note_1, R.id.em_note_2)
  private val EM_LEFTS = intArrayOf(R.id.em_left_1, R.id.em_left_2)
  private val EM_PILLS = intArrayOf(R.id.em_pill_1, R.id.em_pill_2)

  private fun renderEmergency(context: Context, snap: JSONObject?, scheme: String?, pal: WidgetPalette, minHeightDp: Int): RemoteViews {
    // Tall placements get the W-5 composition (the single emergency
    // grows into the card); standard height keeps the W-4 frame.
    val tall = minHeightDp >= 190
    val views = RemoteViews(
      context.packageName,
      if (tall) R.layout.widget_emergency_tall else R.layout.widget_emergency,
    )
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
      // Quiet: the family card (palette surface), red only when
      // something is actually burning. The red layer is separate
      // and NEVER tinted — a colour filter left on a shared
      // background would corrupt the gradient.
      views.setViewVisibility(R.id.em_bg, View.VISIBLE)
      views.setInt(R.id.em_bg, "setColorFilter", pal.surface)
      views.setViewVisibility(R.id.em_bg_red, View.GONE)
      views.setInt(R.id.em_dot, "setColorFilter", pal.muted)
      views.setTextViewText(R.id.em_kicker, "EMERGENCY")
      views.setTextColor(R.id.em_kicker, pal.muted)
      views.setTextColor(R.id.em_msg_title, pal.ink)
      views.setTextColor(R.id.em_msg_sub, pal.body)
      views.setViewVisibility(R.id.em_msg_title, View.VISIBLE)
      views.setViewVisibility(R.id.em_msg_sub, View.VISIBLE)
      views.setViewVisibility(R.id.em_chip, View.GONE)
      views.setViewVisibility(R.id.em_single, View.GONE)
      views.setViewVisibility(R.id.em_multi, View.GONE)
      views.setOnClickPendingIntent(R.id.em_root, launchPendingIntent(context, base))
      return views
    }
    views.setViewVisibility(R.id.em_bg, View.GONE)
    views.setViewVisibility(R.id.em_bg_red, View.VISIBLE)
    views.setImageViewResource(R.id.em_bg_red, R.drawable.widget_bg_emergency)
    views.setInt(R.id.em_dot, "setColorFilter", Color.parseColor("#FFB4A2"))
    views.setTextViewText(R.id.em_kicker, "EMERGENCY")
    views.setTextColor(R.id.em_kicker, Color.parseColor("#FFD9D2"))
    views.setViewVisibility(R.id.em_msg_title, View.GONE)
    views.setViewVisibility(R.id.em_msg_sub, View.GONE)
    views.setViewVisibility(R.id.em_chip, View.VISIBLE)
    views.setTextViewText(R.id.em_chip, "${live.size} ACTIVE")
    val firstTap = if (scheme != null) {
      uriPendingIntent(context, prayUri(scheme, live[0].optString("personId"), "emergency"), base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.em_root, firstTap)
    if (live.size == 1) {
      views.setViewVisibility(R.id.em_multi, View.GONE)
      views.setViewVisibility(R.id.em_single, View.VISIBLE)
      val row = live[0]
      val expires = row.optLong("expiresAtMillis", 0L)
      val left = if (expires > 0L) emergencyLeftText(expires, now) else row.optString("leftText")
      if (tall) {
        applyFace(context, views, R.id.emt_img, R.id.emt_text, row, SEED, 72)
        views.setTextViewText(R.id.emt_name, row.optString("name").uppercase(Locale.US))
        views.setTextViewText(R.id.emt_title, row.optString("title"))
        val note = row.optString("note")
        views.setTextViewText(R.id.emt_note, note)
        views.setViewVisibility(R.id.emt_note, if (note.isBlank()) View.GONE else View.VISIBLE)
        views.setTextViewText(R.id.emt_left, left)
        views.setOnClickPendingIntent(R.id.emt_pill, firstTap)
      } else {
        applyFace(context, views, R.id.em_s_img, R.id.em_s_text, row, SEED, 58)
        views.setTextViewText(R.id.em_s_name, row.optString("name").uppercase(Locale.US))
        views.setTextViewText(R.id.em_s_title, row.optString("title"))
        val note = row.optString("note")
        views.setTextViewText(R.id.em_s_note, note)
        views.setViewVisibility(R.id.em_s_note, if (note.isBlank()) View.GONE else View.VISIBLE)
        views.setTextViewText(R.id.em_s_left, left)
        views.setOnClickPendingIntent(R.id.em_s_pill, firstTap)
      }
      return views
    }
    fillEmergencyMulti(context, views, live, scheme, base, now)
    return views
  }

  /** The 2+ composition (W-4 D-2): rows split the card, a
   *  countdown chip under each note, a hairline between the rows,
   *  "+N more" when the snapshot carries more than the two shown. */
  private fun fillEmergencyMulti(context: Context, views: RemoteViews, live: List<JSONObject>, scheme: String?, base: Int, now: Long) {
    views.setViewVisibility(R.id.em_single, View.GONE)
    views.setViewVisibility(R.id.em_multi, View.VISIBLE)
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
    views.setViewVisibility(R.id.em_hairline, View.VISIBLE)
    if (live.size > 2) {
      views.setViewVisibility(R.id.em_more, View.VISIBLE)
      views.setTextViewText(R.id.em_more, "+${live.size - 2} more")
    } else {
      views.setViewVisibility(R.id.em_more, View.GONE)
    }
  }

  // ─── 3. Your Fast (v442, W-4 D-3) ─────────────────────────────────────────

  private val FAST_HEARTS = intArrayOf(R.id.fast_heart_1, R.id.fast_heart_2, R.id.fast_heart_3, R.id.fast_heart_4, R.id.fast_heart_5, R.id.fast_heart_6)

  private fun renderYourFast(context: Context, snap: JSONObject?, scheme: String?, pal: WidgetPalette): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_your_fast)
    val base = 300
    views.setInt(R.id.fast_bg, "setColorFilter", pal.surface)
    views.setInt(R.id.fast_dot, "setColorFilter", pal.primary)
    views.setTextColor(R.id.fast_kicker, pal.muted)
    views.setTextColor(R.id.fast_msg, pal.ink)
    if (scheme != null) {
      views.setOnClickPendingIntent(R.id.fast_root, uriPendingIntent(context, "$scheme://fasting-tracker", base))
    } else {
      views.setOnClickPendingIntent(R.id.fast_root, launchPendingIntent(context, base))
    }
    if (snap == null || snap.optString("state") != "active") {
      views.setViewVisibility(R.id.fast_msg, View.VISIBLE)
      views.setViewVisibility(R.id.fast_day, View.GONE)
      views.setViewVisibility(R.id.fast_name, View.GONE)
      views.setViewVisibility(R.id.fast_of, View.GONE)
      views.setViewVisibility(R.id.fast_hearts, View.GONE)
      views.setViewVisibility(R.id.fast_daybar, View.GONE)
      return views
    }
    views.setViewVisibility(R.id.fast_msg, View.GONE)
    views.setViewVisibility(R.id.fast_day, View.VISIBLE)
    views.setViewVisibility(R.id.fast_name, View.VISIBLE)
    views.setViewVisibility(R.id.fast_of, View.VISIBLE)
    views.setTextViewText(R.id.fast_day, "Day ${snap.optInt("dayNumber")}")
    views.setTextColor(R.id.fast_day, pal.ink)
    views.setTextViewText(R.id.fast_name, snap.optString("name"))
    views.setTextColor(R.id.fast_name, pal.body)
    val goalDays = snap.optInt("goalDays")
    views.setTextViewText(R.id.fast_of, "of $goalDays · ${snap.optInt("daysLeft")} to go")
    views.setTextColor(R.id.fast_of, pal.muted)
    // The progress bar along the bottom: day of goalDays, drawn.
    views.setViewVisibility(R.id.fast_daybar, View.VISIBLE)
    views.setImageViewBitmap(
      R.id.fast_daybar,
      barBitmap(pal.primary, pal.track, if (goalDays > 0) snap.optInt("dayNumber").toFloat() / goalDays else 0f),
    )
    if (snap.isNull("hearts") || snap.isNull("maxHearts")) {
      views.setViewVisibility(R.id.fast_hearts, View.GONE)
      return views
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
        views.setImageViewBitmap(FAST_HEARTS[i], heartBitmap(if (slot <= hearts) pal.primary else pal.chip))
      }
    }
    return views
  }

  // ─── 4. Due to Reach Out (v442, W-4 D-4) ──────────────────────────────────

  private fun renderReachOut(context: Context, snap: JSONObject?, scheme: String?, pal: WidgetPalette): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_reach_out)
    val base = 400
    views.setInt(R.id.reach_bg, "setColorFilter", pal.surface)
    views.setInt(R.id.reach_dot, "setColorFilter", pal.green)
    views.setTextColor(R.id.reach_kicker, pal.muted)
    views.setTextColor(R.id.reach_msg_title, pal.ink)
    views.setTextColor(R.id.reach_msg_sub, pal.body)
    val tap = if (scheme != null) {
      uriPendingIntent(context, "$scheme://due-to-reach", base)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.reach_root, tap)
    if (snap == null || snap.optString("state") != "due") {
      views.setViewVisibility(R.id.reach_msg_title, View.VISIBLE)
      views.setViewVisibility(R.id.reach_msg_sub, View.VISIBLE)
      views.setViewVisibility(R.id.reach_due_wrap, View.GONE)
      views.setViewVisibility(R.id.reach_lead, View.GONE)
      views.setViewVisibility(R.id.reach_hairline, View.GONE)
      views.setViewVisibility(R.id.reach_second, View.GONE)
      return views
    }
    val lead = snap.optJSONObject("lead") ?: return views
    views.setViewVisibility(R.id.reach_msg_title, View.GONE)
    views.setViewVisibility(R.id.reach_msg_sub, View.GONE)
    views.setViewVisibility(R.id.reach_due_wrap, View.VISIBLE)
    views.setInt(R.id.reach_due_img, "setColorFilter", pal.greenContainer)
    val totalDue = snap.optInt("totalDue")
    views.setTextViewText(R.id.reach_due, "$totalDue due")
    views.setTextColor(R.id.reach_due, pal.green)
    views.setViewVisibility(R.id.reach_lead, View.VISIBLE)
    applyFace(context, views, R.id.reach_avatar_img, R.id.reach_avatar_text, lead, pal.green, 56)
    views.setTextColor(R.id.reach_avatar_text, Color.WHITE)
    views.setTextViewText(R.id.reach_name, lead.optString("name"))
    views.setTextColor(R.id.reach_name, pal.ink)
    // The lead's line arrives composed in the snapshot (v442) —
    // printed verbatim, never re-worded here.
    views.setTextViewText(R.id.reach_since, lead.optString("sinceLine"))
    views.setTextColor(R.id.reach_since, pal.body)
    views.setInt(R.id.reach_btn_img, "setColorFilter", pal.greenContainer)
    views.setTextColor(R.id.reach_btn_text, pal.green)
    views.setOnClickPendingIntent(R.id.reach_btn, tap)
    views.setViewVisibility(R.id.reach_hairline, View.VISIBLE)
    views.setInt(R.id.reach_hairline, "setBackgroundColor", pal.track)
    val second = snap.optJSONObject("second")
    if (second == null) {
      views.setViewVisibility(R.id.reach_second, View.GONE)
      views.setViewVisibility(R.id.reach_more, View.GONE)
      return views
    }
    views.setViewVisibility(R.id.reach_second, View.VISIBLE)
    applyFace(context, views, R.id.reach_second_img, R.id.reach_second_text_init, second, pal.green, 34)
    views.setTextColor(R.id.reach_second_text_init, Color.WHITE)
    views.setTextViewText(R.id.reach_second_name, second.optString("name"))
    views.setTextColor(R.id.reach_second_name, pal.ink)
    views.setTextViewText(R.id.reach_second_rest, "· ${second.optInt("days")} days")
    views.setTextColor(R.id.reach_second_rest, pal.body)
    if (totalDue > 2) {
      views.setViewVisibility(R.id.reach_more, View.VISIBLE)
      views.setTextViewText(R.id.reach_more, "+${totalDue - 2} more due")
      views.setTextColor(R.id.reach_more, pal.muted)
    } else {
      views.setViewVisibility(R.id.reach_more, View.GONE)
    }
    return views
  }

  // ─── 5. Your Study (v442, W-4 D-6) ────────────────────────────────────────

  /** "2026-10-24" → "Oct 24" — the app's own short-date voice
   * (the Personal Study card's "Last read … · Oct 24"). Null
   * for anything that is not an ISO calendar date. */
  private fun shortDateLabel(iso: String?): String? {
    if (iso.isNullOrBlank()) return null
    val parts = iso.trim().split("-")
    if (parts.size != 3) return null
    val month = parts[1].toIntOrNull() ?: return null
    val day = parts[2].toIntOrNull() ?: return null
    val months = arrayOf("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
    if (month !in 1..12 || day !in 1..31) return null
    return "${months[month - 1]} $day"
  }

  private fun renderYourStudy(context: Context, snap: JSONObject?, scheme: String?, pal: WidgetPalette): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_your_study)
    val base = 600
    views.setInt(R.id.study_bg_img, "setColorFilter", pal.surface)
    views.setTextColor(R.id.study_kicker, pal.muted)
    views.setTextColor(R.id.study_msg, pal.ink)
    if (snap == null || snap.optString("state") != "active") {
      views.setViewVisibility(R.id.study_msg, View.VISIBLE)
      views.setViewVisibility(R.id.study_main, View.GONE)
      views.setViewVisibility(R.id.study_last, View.GONE)
      views.setViewVisibility(R.id.study_footer, View.GONE)
      views.setOnClickPendingIntent(R.id.study_root, launchPendingIntent(context, base))
      return views
    }
    // The book's own ROYGBIV colour — a meaning hue, never the
    // palette's. bookColor is the v442 field; colorPrimary is its
    // pre-v442 name and still answers for older snapshots.
    val bookColor = colorOr(
      snap.optString("bookColor").takeIf { it.isNotBlank() } ?: snap.optString("colorPrimary"),
      pal.primary,
    )
    views.setInt(R.id.study_dot, "setColorFilter", bookColor)
    views.setInt(R.id.study_tile, "setColorFilter", bookColor)
    views.setViewVisibility(R.id.study_msg, View.GONE)
    views.setViewVisibility(R.id.study_main, View.VISIBLE)
    views.setImageViewBitmap(R.id.study_book_glyph, bookBitmap())
    views.setViewVisibility(R.id.study_footer, View.VISIBLE)
    // v446: the READING dress, when the snapshot carries the
    // reading position — the same D-6 composition, every value
    // from the reading track (v445 gave the Reading strip the
    // position; this big widget still rendered the WRITING
    // track: a pale tile with a glyph, "Fully written", "50 of
    // 50 chapters written"). The tile stands SOLID in the
    // reading book's primary with the reading chapter in white
    // bold — the strip's tile language — and the progress line
    // is the flat bar in the reading fraction (v449: the v446
    // wavy line reverted at his word, in both dresses).
    val readingBook = snap.optString("readingBook").takeIf { it.isNotBlank() }
    val readingChapter = if (snap.isNull("readingChapter")) null else snap.optInt("readingChapter")
    if (readingBook != null && readingChapter != null) {
      val readingColor = colorOr(
        snap.optString("readingBookPrimary").takeIf { it.isNotBlank() } ?: snap.optString("bookPrimary"),
        pal.primary,
      )
      val readingTotal = if (snap.isNull("readingTotalChapters")) null else snap.optInt("readingTotalChapters")
      val chaptersRead = if (snap.isNull("readingChaptersRead")) null else snap.optInt("readingChaptersRead")
      views.setInt(R.id.study_dot, "setColorFilter", readingColor)
      views.setInt(R.id.study_tile, "setColorFilter", readingColor)
      views.setViewVisibility(R.id.study_book_glyph, View.GONE)
      views.setViewVisibility(R.id.study_tile_num, View.VISIBLE)
      views.setTextViewText(R.id.study_tile_num, readingChapter.toString())
      views.setTextViewText(R.id.study_book, readingBook)
      views.setTextColor(R.id.study_book, pal.ink)
      views.setTextViewText(
        R.id.study_next,
        if (readingTotal != null) "Chapter $readingChapter of $readingTotal" else "Chapter $readingChapter",
      )
      views.setTextColor(R.id.study_next, pal.body)
      views.setTextViewText(
        R.id.study_prog,
        if (chaptersRead != null && readingTotal != null) "$chaptersRead of $readingTotal" else "",
      )
      views.setTextColor(R.id.study_prog, pal.ink)
      views.setTextViewText(R.id.study_prog_sub, "chapters read")
      views.setTextColor(R.id.study_prog_sub, pal.muted)
      val lastRead = snap.optJSONObject("readingLastRead")
      if (lastRead == null) {
        views.setViewVisibility(R.id.study_last, View.GONE)
      } else {
        views.setViewVisibility(R.id.study_last, View.VISIBLE)
        val date = shortDateLabel(lastRead.optString("date"))
        views.setTextViewText(
          R.id.study_last,
          "Last read · ${lastRead.optString("book")} ${lastRead.optInt("chapter")}" +
            if (date != null) " · $date" else "",
        )
        views.setTextColor(R.id.study_last, pal.body)
      }
      views.setInt(R.id.study_pill_img, "setColorFilter", pal.container)
      views.setTextColor(R.id.study_pill_text, pal.onContainer)
      views.setImageViewBitmap(
        R.id.study_bar,
        barBitmap(
          readingColor,
          colorOr(snap.optString("readingBookTint"), pal.track),
          if (readingTotal != null && readingTotal > 0 && chaptersRead != null) {
            chaptersRead.toFloat() / readingTotal
          } else {
            0f
          },
        ),
      )
      val tap = if (scheme != null) {
        uriPendingIntent(context, "$scheme://bible-chapter?book=${Uri.encode(readingBook)}&chapter=$readingChapter", base + 1)
      } else {
        launchPendingIntent(context, base)
      }
      views.setOnClickPendingIntent(R.id.study_root, tap)
      views.setOnClickPendingIntent(R.id.study_pill, tap)
      return views
    }
    // Fallback (snapshots pushed before the reading fields
    // rode): the writing dress, exactly as it was — its flat
    // bar in its own written fraction and colours. (The v446
    // wave briefly stood on this bar too; v449 reverted it in
    // both dresses.) The tile resets come first:
    // a placed view keeps a prior render's faces, so the number
    // a reading render stood in the tile must be stood down.
    views.setViewVisibility(R.id.study_tile_num, View.GONE)
    views.setViewVisibility(R.id.study_book_glyph, View.VISIBLE)
    val nextChapter = if (snap.isNull("nextChapter")) null else snap.optInt("nextChapter")
    val book = snap.optString("book")
    views.setTextViewText(R.id.study_book, book)
    views.setTextColor(R.id.study_book, pal.ink)
    views.setTextViewText(
      R.id.study_next,
      if (nextChapter != null) "Next to write · Chapter $nextChapter" else "Fully written",
    )
    views.setTextColor(R.id.study_next, pal.body)
    val written = snap.optInt("chaptersWritten")
    val totalChapters = snap.optInt("totalChapters")
    views.setTextViewText(R.id.study_prog, "$written of $totalChapters")
    views.setTextColor(R.id.study_prog, pal.ink)
    views.setTextViewText(R.id.study_prog_sub, "chapters written")
    views.setTextColor(R.id.study_prog_sub, pal.muted)
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
      views.setTextColor(R.id.study_last, pal.body)
    }
    views.setInt(R.id.study_pill_img, "setColorFilter", pal.container)
    views.setTextColor(R.id.study_pill_text, pal.onContainer)
    views.setImageViewBitmap(
      R.id.study_bar,
      barBitmap(
        bookColor,
        pal.track,
        if (totalChapters > 0) written.toFloat() / totalChapters else 0f,
      ),
    )
    val openChapter = nextChapter ?: lastChapter ?: 1
    val tap = if (scheme != null) {
      uriPendingIntent(context, "$scheme://bible-chapter?book=${Uri.encode(book)}&chapter=$openChapter", base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.study_root, tap)
    views.setOnClickPendingIntent(R.id.study_pill, tap)
    return views
  }

  // ─── 6. Up Next (v442, W-6 Option A — the day rail) ───────────────────────

  /** One row on the rail as the renderer walks it: the snapshot's
   * entries mapped onto the rail's dresses (last → done / past by
   * its completed flag, current, next → hero / item, gap), plus
   * the bare NOW row the renderer seats itself from the device
   * clock when nothing is current.
   * v451: heroLeft marks a hero band worn by a RUNNING event —
   * the band's startMinutes slot then carries the event's END
   * and its pill counts the time LEFT in the event instead of
   * the time until it starts.
   * v454: two more box dresses ride their own kinds —
   * "heroDone", the band worn by a COMPLETED item holding the
   * box struck through (its startMinutes slot is unused; the
   * pill reads DONE), and "whitebox", the band as the white
   * space itself (its gapText slot carries the open stretch's
   * wording, its startMinutes slot the next item's start, for
   * the pill's countdown to it). */
  private class RailRow(
    val kind: String,
    val timeLabel: String,
    val title: String,
    val sub: String,
    val startMinutes: Int,
    val gapText: String,
    val heroLeft: Boolean = false,
  )

  /** v445: one dayItems entry as parsed from the snapshot —
   * the render-time Up Next recompute reads these. */
  private class DayItem(
    val title: String,
    val sub: String,
    val startMinutes: Int,
    val endMinutes: Int,
    val hasEnd: Boolean,
    val completed: Boolean,
  )

  private val railIdCache = HashMap<String, Int>()

  /** The rail's nine slots resolve their ids by name — the slots
   * are one stamped shape, so the renderer walks them uniformly
   * instead of carrying nine copies of every slot array. */
  private fun railId(context: Context, name: String): Int =
    railIdCache.getOrPut(name) {
      context.resources.getIdentifier(name, "id", context.packageName)
    }

  private fun nowMinutes(): Int {
    val cal = Calendar.getInstance()
    return cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE)
  }

  private fun nowTimeLabel(): String {
    val cal = Calendar.getInstance()
    val h24 = cal.get(Calendar.HOUR_OF_DAY)
    val minute = cal.get(Calendar.MINUTE)
    val suffix = if (h24 >= 12) "PM" else "AM"
    val h12 = if (h24 % 12 == 0) 12 else h24 % 12
    return "$h12:${minute.toString().padStart(2, '0')} $suffix"
  }

  /** The hero band's countdown, in the W-6 drawing's voice. */
  private fun countdownText(startMinutes: Int, fromMinutes: Int): String {
    val diff = startMinutes - fromMinutes
    if (diff <= 0) return "NOW"
    if (diff < 60) return "IN $diff MIN"
    val h = diff / 60
    val m = diff % 60
    return if (m == 0) "IN $h H" else "IN $h H $m MIN"
  }

  /** v451: the running box's pill — countdownText's voice with
   * the direction flipped: the time LEFT in the event that
   * holds the box ("59 MIN LEFT", "1 H LEFT", "1 H 5 MIN
   * LEFT"). */
  private fun remainingText(endMinutes: Int, fromMinutes: Int): String {
    val diff = endMinutes - fromMinutes
    if (diff <= 0) return "NOW"
    if (diff < 60) return "$diff MIN LEFT"
    val h = diff / 60
    val m = diff % 60
    return if (m == 0) "$h H LEFT" else "$h H $m MIN LEFT"
  }

  private fun renderUpNext(context: Context, snap: JSONObject?, scheme: String?, pal: WidgetPalette, minHeightDp: Int): RemoteViews {
    // v445: the rows are computed AT RENDER TIME. When the
    // snapshot carries dayItems for the device's current date,
    // last / current / next are recomputed here from the device
    // clock — the v444 entries froze the moment the app last
    // opened, so the widget went stale between opens. The
    // snapshot's entries remain as the fallback (below) for a
    // snapshot whose day has rolled over or that predates
    // dayItems. Both paths build one common row set (last,
    // current, hero, after, plus the under-box gap row)
    // and run it through the same height-budgeted selection
    // (selectRailRows) before a slot is filled.
    // v450: the composition is FIXED — one past, one current
    // (or NOW), the next up in its box, one after, and the
    // white spaces only where they fit (Jonathan, on the
    // v449 render: a fourth item row stood half-clipped at
    // the card's bottom edge). Nothing past the after item
    // is ever a candidate, and the selection seats the item
    // rows first and gives gaps only what is left over.
    // v447: there is no footer any more (Jonathan: the Open
    // schedule / end-note bar was dead weight — "Why do we
    // need that?"), so nothing here reads or writes an end
    // note; the snapshot still carries one, unread.
    // v451: the box belongs to the CURRENT event. Jonathan,
    // on the v450 render (Nov 5, 20:01 — Dinner, an 8:00–9:00
    // PM event, standing as a plain row at 8:01 PM with a
    // stray NOW row trailing under it and no box anywhere):
    // "I want 'Now' to be the current event until that event
    // is over. It should have the box around it with what's
    // coming up right under it." So a running timed event
    // (a stored end, start ≤ now < end) IS Now: it takes the
    // box, its pill counts the time LEFT in it, no NOW marker
    // row is drawn while it holds the box, and what's coming
    // up sits directly under the box. A point item (no stored
    // end — a todo without one) never takes the box; it keeps
    // the plain current row, the arrangement he approved on
    // the 18:01 render (Feed plain, Dinner boxed as next).
    // v453: the TALL size shows more of the day again
    // (Jonathan, Nov 6, asking after "the XL version of the
    // schedule widget", picked it in one tap over keeping
    // four rows at every size). The fixed composition is
    // the core and seats first, exactly as v451 has it; the
    // render-time path also hands the selection the rest of
    // the day past the after item as extension candidates
    // (below), and at a tall placement they seat under the
    // core from the leftover height. A standard-height
    // render is v451's, row for row.
    // v454: two rulings from the same morning (Nov 6, on the
    // 8:57 AM render — NOW row, Self-Care boxed IN 3 MIN,
    // and the tall card under it mostly empty).
    // Ruling 1 (08:58), the crossed-out box: "can we make
    // the box in the widget show the crossed out event or
    // todo IN the box rather than just disappearing?" When
    // the item that would hold the box is checked off, the
    // box no longer jumps on and loses it: the finished item
    // HOLDS the box, struck through, pill reading DONE,
    // until the next item's start arrives and the box passes
    // on. The holder is the completed item nearest before
    // the would-be box item whose own window has not fully
    // passed and whose successor has not started (the
    // running event checked off mid-run; the next up checked
    // off early; of two checked early in a row, the later
    // holds and the earlier is the struck last row). An item
    // checked after its window passed was never in the box
    // when checked — it is the last row's business, struck
    // there instead. With no successor at all, the holder
    // keeps the box as the day's last word.
    // Ruling 2 (08:59), white-space placement: "The white
    // space should only show up after the boxed event, or IN
    // the boxed event when it's a white space time." So no
    // gap box ever stands BEFORE the box — the v447 nowGap
    // (the white box between the NOW row and the hero) is
    // gone — and when he is standing inside an open stretch
    // (nothing running, nothing holding the box struck, the
    // next item ≥ 15 minutes out), the BOX ITSELF is the
    // white space: white-block dress at box scale, the open
    // stretch's wording inside it, the pill counting down to
    // the next item, no separate NOW row (the box IS now),
    // and the next item as the plain row directly under it.
    // Box priority, unified: running event → struck-held
    // completed item → the white space → the next up.
    val heightSignal = minHeightDp
    val views = RemoteViews(context.packageName, R.layout.widget_up_next)
    val base = 500
    views.setInt(R.id.next_bg, "setColorFilter", pal.surface)
    views.setInt(R.id.next_dot, "setColorFilter", pal.primary)
    views.setTextColor(R.id.next_kicker, pal.muted)
    views.setTextColor(R.id.next_msg, pal.ink)
    if (scheme != null) {
      views.setOnClickPendingIntent(R.id.next_root, uriPendingIntent(context, "$scheme:///?navTab=schedule", base))
    } else {
      views.setOnClickPendingIntent(R.id.next_root, launchPendingIntent(context, base))
    }
    if (snap == null || snap.optString("state") != "next") {
      views.setViewVisibility(R.id.next_msg, View.VISIBLE)
      views.setViewVisibility(R.id.next_chip, View.GONE)
      views.setViewVisibility(R.id.next_rail, View.GONE)
      return views
    }

    var leftCount = snap.optInt("leftCount")
    val rows: List<RailRow>
    val dayArr = snap.optJSONArray("dayItems")
    if (dayArr != null && dayArr.length() > 0 && snap.optString("dateIso") == deviceDateIso()) {
      // ── The render-time path: recompute from dayItems + the
      // device clock. ──
      val dayItems = mutableListOf<DayItem>()
      for (i in 0 until dayArr.length()) {
        val d = dayArr.optJSONObject(i) ?: continue
        dayItems.add(
          DayItem(
            d.optString("title"),
            d.optString("sub"),
            d.optInt("startMinutes"),
            d.optInt("endMinutes"),
            d.optBoolean("hasEnd"),
            d.optBoolean("completed"),
          ),
        )
      }
      val nowMin = nowMinutes()
      // Ahead: uncompleted, strictly future, chronological —
      // the sort is stable, so ties keep the day's own order.
      val aheadIdx = dayItems.indices
        .filter { !dayItems[it].completed && dayItems[it].startMinutes > nowMin }
        .sortedBy { dayItems[it].startMinutes }
      // Current: uncompleted, running now; latest start wins.
      val currentIdx = dayItems.indices
        .filter { !dayItems[it].completed && dayItems[it].startMinutes <= nowMin && nowMin < dayItems[it].endMinutes }
        .sortedByDescending { dayItems[it].startMinutes }
        .firstOrNull()
      // v451: the RUNNING event — uncompleted, carrying a
      // stored end (hasEnd), start ≤ now < end; latest start
      // wins, the current pick's own tie-break. This is the
      // event that IS Now and takes the box. The hasEnd gate
      // is the whole distinction: a point item's endMinutes
      // is a rule-made default (+30/+60), not an end the day
      // actually holds, so it can be current but never boxed.
      val runningIdx = dayItems.indices
        .filter { !dayItems[it].completed && dayItems[it].hasEnd && dayItems[it].startMinutes <= nowMin && nowMin < dayItems[it].endMinutes }
        .sortedByDescending { dayItems[it].startMinutes }
        .firstOrNull()
      val next1Idx = aheadIdx.getOrNull(0)
      val afterIdx = aheadIdx.getOrNull(1)
      // "Over" reads on the item's own clock: the stored end
      // when it has one, its start when it doesn't.
      val overAt = { item: DayItem -> if (item.hasEnd) item.endMinutes else item.startMinutes }
      // v454 (Ruling 1): the struck holder — the completed
      // item that would be holding the box if it weren't
      // finished. The candidacy runs in the day's
      // chronological order (the sort is stable, so ties
      // keep the day's own order): the holder is the
      // completed item NEAREST BEFORE the would-be box item
      // (the next up, or — with nothing ahead — any item at
      // all) whose own window has not fully passed
      // (overAt > now: it was in, or waiting for, the box
      // when it was checked — an item checked after its
      // window passed is simply past, the last row's
      // business) and whose successor in the day has not
      // started (once the successor's moment arrives the
      // box has passed on; a holder with no successor keeps
      // the box as the day's last word). If that nearest
      // item's successor HAS started, no earlier item can
      // hold either: its own successor stands between it and
      // the box in the same order and has started too, by
      // the same reading. A running event outranks the
      // holder outright (box priority), so the candidacy
      // only runs when nothing is running.
      val chronoIdx = dayItems.indices.sortedBy { dayItems[it].startMinutes }
      var struckIdx: Int? = null
      if (runningIdx == null) {
        val anchorPos = next1Idx?.let { chronoIdx.indexOf(it) } ?: chronoIdx.size
        var candPos = -1
        for (p in 0 until anchorPos) {
          val idx = chronoIdx[p]
          if (dayItems[idx].completed && overAt(dayItems[idx]) > nowMin) candPos = p
        }
        if (candPos >= 0) {
          val succIdx = chronoIdx.getOrNull(candPos + 1)
          if (succIdx == null || dayItems[succIdx].startMinutes > nowMin) {
            struckIdx = chronoIdx[candPos]
          }
        }
      }
      val struckItem = struckIdx?.let { dayItems[it] }
      if (currentIdx == null && next1Idx == null && struckIdx == null) {
        // Nothing running, nothing ahead, nothing holding
        // the box struck: the quiet face.
        views.setViewVisibility(R.id.next_msg, View.VISIBLE)
        views.setViewVisibility(R.id.next_chip, View.GONE)
        views.setViewVisibility(R.id.next_rail, View.GONE)
        return views
      }
      val chosenIdx = setOfNotNull(currentIdx, runningIdx, next1Idx, afterIdx)
      val lastIdx = dayItems.indices
        .filter { it !in chosenIdx && overAt(dayItems[it]) <= nowMin }
        .sortedWith(compareByDescending<Int> { overAt(dayItems[it]) }.thenByDescending { dayItems[it].startMinutes })
        .firstOrNull()
      val lastRow = lastIdx?.let {
        val item = dayItems[it]
        RailRow(if (item.completed) "done" else "past", minutesToTimeLabel(item.startMinutes), item.title, item.sub, 0, "")
      }
      // v454 (Ruling 2): the open stretch he is standing in.
      // When nothing is current, the time between NOW and
      // the next thing is open — v447 showed it as a gap box
      // standing before the hero (the nowGap), and his
      // ruling takes that box away: white space shows only
      // after the boxed event, or IN the box when it is a
      // white-space time. So the stretch is measured exactly
      // as v447 measured it — from the previous item's end,
      // or from now when there is no previous item (the
      // later of the two, so the wording names the open time
      // still ahead of him), the same ≥15-minute rule — and
      // when it stands and neither a running event nor a
      // struck holder owns the box, the stretch becomes the
      // box itself (heroWhite, below). Under 15 minutes the
      // next item is imminent and the box is the next up's,
      // exactly as v451 had it.
      var openMinutes = 0
      if (currentIdx == null && next1Idx != null) {
        val prevEnd = lastIdx?.let { overAt(dayItems[it]) } ?: nowMin
        openMinutes = dayItems[next1Idx].startMinutes - maxOf(nowMin, prevEnd)
      }
      var heroWhite = false
      if (openMinutes >= 15) {
        heroWhite = runningIdx == null && struckIdx == null
      }
      val whiteRow = if (heroWhite && next1Idx != null) {
        RailRow("whitebox", nowTimeLabel(), "", "", dayItems[next1Idx].startMinutes, openDurationText(openMinutes))
      } else {
        null
      }
      // v451: when the running event IS the current, the box
      // replaces the plain current row — the event gets one
      // row, the boxed one. A DIFFERENT point item caught
      // mid-window alongside it (started later, no stored
      // end) keeps its plain current row above the box.
      val currentRow = if (currentIdx != null && currentIdx != runningIdx) {
        val item = dayItems[currentIdx]
        RailRow("current", minutesToTimeLabel(item.startMinutes), item.title, item.sub, 0, "")
      } else {
        null
      }
      // The box, by the v454 priority: the running event's
      // while one runs (v451 — heroLeft: its startMinutes
      // slot carries the event's END, and the band's pill
      // counts the time LEFT in it); then the struck
      // holder's (Ruling 1 — the finished item in the box,
      // struck through); then the white space's when he is
      // standing in open time (Ruling 2 — the box IS the
      // open stretch); otherwise the next up's, exactly as
      // v450 had it. boxIsNow names the two holders that ARE
      // now — the selection draws no separate NOW marker row
      // while either holds the box (v451's rule for the
      // running event; Ruling 2's for the white space: "the
      // box IS now").
      val heroRunning = runningIdx != null
      val boxIsNow = heroRunning || heroWhite
      val heroRow = if (runningIdx != null) {
        val item = dayItems[runningIdx]
        RailRow("hero", minutesToTimeLabel(item.startMinutes), item.title, item.sub, item.endMinutes, "", heroLeft = true)
      } else if (struckItem != null) {
        RailRow("heroDone", minutesToTimeLabel(struckItem.startMinutes), struckItem.title, struckItem.sub, 0, "")
      } else if (whiteRow != null) {
        whiteRow
      } else {
        next1Idx?.let {
          val item = dayItems[it]
          RailRow("hero", minutesToTimeLabel(item.startMinutes), item.title, item.sub, item.startMinutes, "")
        }
      }
      var gapRow: RailRow? = null
      var nextRow: RailRow? = null
      var afterRow: RailRow? = null
      if (runningIdx != null) {
        // v451: what's coming up sits directly under the box
        // — the next item as a plain row — and the gap
        // candidate is the open stretch between the running
        // event's END and that item's start (≥ 15 minutes),
        // seated under the box in rail order, where that open
        // time actually sits in the day.
        val running = dayItems[runningIdx]
        if (next1Idx != null) {
          val next1 = dayItems[next1Idx]
          nextRow = RailRow("item", minutesToTimeLabel(next1.startMinutes), next1.title, next1.sub, next1.startMinutes, "")
          val boxGapMinutes = next1.startMinutes - running.endMinutes
          if (boxGapMinutes >= 15) {
            gapRow = RailRow("gap", "", "", "", 0, openDurationText(boxGapMinutes))
          }
        }
        if (afterIdx != null) {
          val after = dayItems[afterIdx]
          afterRow = RailRow("item", minutesToTimeLabel(after.startMinutes), after.title, after.sub, after.startMinutes, "")
        }
      } else if (struckItem != null) {
        // v454 (Ruling 1): what's coming up waits directly
        // under the struck box — the next item as a plain
        // row, then the after row — and the gap candidate is
        // the open stretch between the holder's end and that
        // item's start (≥ 15 minutes), seated under the box
        // in rail order, downstream of the box as Ruling 2
        // requires. (His composition check: Dinner, 8–9 PM,
        // checked off at 8:30 with the next item at 10 —
        // struck Dinner in the box, the 9-to-10 white box
        // under it, then the 10 PM row.)
        if (next1Idx != null) {
          val next1 = dayItems[next1Idx]
          nextRow = RailRow("item", minutesToTimeLabel(next1.startMinutes), next1.title, next1.sub, next1.startMinutes, "")
          val struckGapMinutes = next1.startMinutes - overAt(struckItem)
          if (struckGapMinutes >= 15) {
            gapRow = RailRow("gap", "", "", "", 0, openDurationText(struckGapMinutes))
          }
        }
        if (afterIdx != null) {
          val after = dayItems[afterIdx]
          afterRow = RailRow("item", minutesToTimeLabel(after.startMinutes), after.title, after.sub, after.startMinutes, "")
        }
      } else if (heroWhite) {
        // v454 (Ruling 2): the next item sits directly under
        // the white box and the after row under it — and
        // there is no gap row: the open stretch is the box
        // itself, and the next stretch downstream belongs to
        // the extension walk, past the after row, as before.
        if (next1Idx != null) {
          val next1 = dayItems[next1Idx]
          nextRow = RailRow("item", minutesToTimeLabel(next1.startMinutes), next1.title, next1.sub, next1.startMinutes, "")
        }
        if (afterIdx != null) {
          val after = dayItems[afterIdx]
          afterRow = RailRow("item", minutesToTimeLabel(after.startMinutes), after.title, after.sub, after.startMinutes, "")
        }
      } else if (next1Idx != null && afterIdx != null) {
        val next1 = dayItems[next1Idx]
        val after = dayItems[afterIdx]
        val gapMinutes = after.startMinutes - next1.endMinutes
        if (gapMinutes >= 15) {
          gapRow = RailRow("gap", "", "", "", 0, openDurationText(gapMinutes))
        }
        afterRow = RailRow("item", minutesToTimeLabel(after.startMinutes), after.title, after.sub, after.startMinutes, "")
      }
      // v453: the extension candidates — the rest of the
      // day past the core's after item, walked in the day's
      // own order: each item a plain row, with the open
      // stretch before it (≥ 15 minutes, measured from the
      // previous item's end, the core's own between-items
      // rule) as a white-box gap row ahead of it. These are
      // candidates only: selectRailRows seats them solely
      // from the budget the seated core leaves over, and
      // only when the core itself fully seated. The walk
      // reads the ahead list only — the past side never
      // extends, and the last row stays one.
      val extensionRows = mutableListOf<RailRow>()
      if (afterIdx != null) {
        var prevEnd = dayItems[afterIdx].endMinutes
        for (k in 2 until aheadIdx.size) {
          val item = dayItems[aheadIdx[k]]
          val extGapMinutes = item.startMinutes - prevEnd
          if (extGapMinutes >= 15) {
            extensionRows.add(RailRow("gap", "", "", "", 0, openDurationText(extGapMinutes)))
          }
          extensionRows.add(RailRow("item", minutesToTimeLabel(item.startMinutes), item.title, item.sub, item.startMinutes, ""))
          prevEnd = item.endMinutes
        }
      }
      leftCount = aheadIdx.size
      rows = selectRailRows(lastRow, currentRow, heroRow, gapRow, afterRow, nextRow, boxIsNow, extensionRows, heightSignal)
    } else {
      // ── The fallback: the snapshot's entries walk (v444),
      // extended with the legacy pre-v444 kinds so a stale
      // stored snapshot still renders its items instead of
      // silently dropping them (his first v444 screenshot:
      // only gap rows survived, because "done" / "past" /
      // "item" mapped to nothing). ──
      val entries = mutableListOf<RailRow>()
      val arr = snap.optJSONArray("entries")
      if (arr != null) {
        for (i in 0 until arr.length()) {
          val e = arr.optJSONObject(i) ?: continue
          when (e.optString("kind")) {
            // The snapshot's "last" maps onto the two muted dresses
            // the rail already knows: struck + checked when it was
            // completed, plain muted when it was not.
            "last" -> entries.add(
              RailRow(
                if (e.optBoolean("completed")) "done" else "past",
                e.optString("timeLabel"),
                e.optString("title"),
                e.optString("sub"),
                0,
                "",
              ),
            )
            "current" -> entries.add(RailRow("current", e.optString("timeLabel"), e.optString("title"), e.optString("sub"), 0, ""))
            "gap" -> entries.add(RailRow("gap", "", "", "", 0, e.optString("text")))
            "next" -> entries.add(
              RailRow(
                if (e.optBoolean("isHero")) "hero" else "item",
                e.optString("timeLabel"),
                e.optString("title"),
                e.optString("sub"),
                e.optInt("startMinutes"),
                "",
              ),
            )
            // Legacy kinds (pre-v444 snapshots still in storage):
            "done" -> entries.add(RailRow("done", e.optString("timeLabel"), e.optString("title"), e.optString("sub"), 0, ""))
            "past" -> entries.add(RailRow("past", e.optString("timeLabel"), e.optString("title"), e.optString("sub"), 0, ""))
            "item" -> entries.add(
              RailRow(
                if (e.optBoolean("isHero")) "hero" else "item",
                e.optString("timeLabel"),
                e.optString("title"),
                e.optString("sub"),
                e.optInt("startMinutes"),
                "",
              ),
            )
          }
        }
      }
      // Gap-only guard: a list with no item-bearing row is not
      // a rail — render the quiet face instead of gap rows
      // standing alone.
      if (entries.none { it.kind != "gap" }) {
        views.setViewVisibility(R.id.next_msg, View.VISIBLE)
        views.setViewVisibility(R.id.next_chip, View.GONE)
        views.setViewVisibility(R.id.next_rail, View.GONE)
        return views
      }
      val lastRow = entries.firstOrNull { it.kind == "done" || it.kind == "past" }
      val currentRow = entries.firstOrNull { it.kind == "current" }
      val heroRow = entries.firstOrNull { it.kind == "hero" }
      val gapRow = entries.firstOrNull { it.kind == "gap" }
      val afterRow = entries.firstOrNull { it.kind == "item" }
      // The fallback's gaps come from the snapshot as
      // stored: it seats no NOW→next gap of its own (v447's
      // nowGap was a render-time computation; v454 retires
      // the candidate entirely). It also seats no running
      // box (v451), no struck box and no white box (v454):
      // the box-ownership checks live in the render-time
      // recomputation above, so this frozen walk keeps its
      // v450 behaviour exactly. It likewise seats no tall
      // extension (v453): the extension candidates are a
      // render-time computation too, and the fallback hands
      // over an empty list.
      rows = selectRailRows(lastRow, currentRow, heroRow, gapRow, afterRow, null, false, emptyList(), heightSignal)
    }

    views.setViewVisibility(R.id.next_msg, View.GONE)
    views.setViewVisibility(R.id.next_chip, View.VISIBLE)
    views.setInt(R.id.next_chip_img, "setColorFilter", pal.chip)
    views.setTextViewText(R.id.next_left, "${leftCount} LEFT")
    views.setTextColor(R.id.next_left, pal.onContainer)
    fillRailFull(context, views, rows, pal)
    return views
  }

  /** The device's current local date, "yyyy-MM-dd" — the shape
   * the snapshot's dateIso carries (formatDateLocal on the JS
   * side). */
  private fun deviceDateIso(): String {
    val cal = Calendar.getInstance()
    return String.format(
      Locale.US,
      "%04d-%02d-%02d",
      cal.get(Calendar.YEAR),
      cal.get(Calendar.MONTH) + 1,
      cal.get(Calendar.DAY_OF_MONTH),
    )
  }

  /** Minutes since midnight → "2:00 PM" (nowTimeLabel's voice,
   * for an arbitrary minute). */
  private fun minutesToTimeLabel(totalMinutes: Int): String {
    val h24 = (totalMinutes / 60) % 24
    val minute = totalMinutes % 60
    val suffix = if (h24 >= 12) "PM" else "AM"
    val h12 = if (h24 % 12 == 0) 12 else h24 % 12
    return "$h12:${minute.toString().padStart(2, '0')} $suffix"
  }

  /** 90 → "1 hour 30 minutes open" — the JS formatOpenDuration's
   * wording, plus the gap row's trailing "open". */
  private fun openDurationText(totalMinutes: Int): String {
    val minutes = maxOf(0, totalMinutes)
    val hours = minutes / 60
    val rest = minutes % 60
    val body = when {
      hours == 0 -> "$rest minute${if (rest == 1) "" else "s"}"
      rest == 0 -> "$hours hour${if (hours == 1) "" else "s"}"
      else -> "$hours hour${if (hours == 1) "" else "s"} $rest minute${if (rest == 1) "" else "s"}"
    }
    return "$body open"
  }

  /** v445: the height-budgeted row selection — the ONE selection
   * both the render-time path and the entries fallback run.
   * v450: the composition is FIXED (Jonathan, on the v449
   * render: "Shouldn't there just be one past event, and one
   * after event, then the next up in the box (centered), and
   * the white spaces wherever they fit?"). At most FOUR item
   * rows are ever seated — one last, one current (or the NOW
   * row when nothing is running), the hero in its band at the
   * stack's centre, and one after — plus the trailing NOW row
   * when a current exists. There is no fifth item row: the
   * item after the after is never even a candidate.
   *
   * Rows are chosen in two passes. The ITEM rows go first, in
   * priority order, against conservative costs — hero 64,
   * plain row (last / current / next / after) 34, NOW row 30:
   *   (1) the hero, (2) the current row — or the NOW row when
   *   nothing is current, (3) the last row, (4) the next row,
   *   (5) the after row, (6) the NOW row when a current exists
   *   (it was not already chosen at (2)).
   * The GAP row (32, the v447 white box) goes LAST — the
   * under-box / between-items gap, between the hero and what
   * follows it — seated only with budget the item rows left
   * over. A gap never displaces an item row; a row is seated
   * whole or not at all.
   * A row is chosen only when its cost fits what remains of
   * the budget, EXCEPT (1) and (2), which are always chosen —
   * the hero and the now-anchor can never be starved out of
   * the rail again (the v443/v444 measurement starvation).
   * The chosen rows display in chronological order: last,
   * current, NOW, hero, gap, next, after. The NOW row
   * is always the proper rail row (its own time, ringed dot,
   * NOW title) — seated after last and current, before the
   * hero.
   * v451: the `next` row and the box-ownership flag carry
   * the ruling. When a running event holds the box, the
   * item directly under it rides `next` (in the v450
   * arrangement next is null and the hero itself is the next
   * up), and the NOW marker row is NEVER chosen — neither at
   * (2) nor at (6) — because the boxed event IS Now; a second
   * NOW row trailing the box is the exact stray his 8:01 PM
   * screenshot showed under Dinner. The four-item-row cap
   * stands: last, the box, next, after.
   * v454: the flag is renamed `boxIsNow` and widened — it
   * also stands while the BOX IS THE WHITE SPACE (Ruling 2:
   * the box is now, so no NOW row stands beside it). The
   * struck holder (Ruling 1) does NOT set it: the box then
   * is a finished item, not now, and the NOW row keeps its
   * anchor place before the box when nothing is current.
   * And the selection no longer takes a nowGap candidate at
   * all (Ruling 2: no white space before the box — the one
   * gap candidate is the under-box gap, downstream of the
   * box by construction).
   * v453: past the core, the TALL extension (Jonathan's
   * Nov 6 pick — "Tall size shows more of the day again").
   * The four above are the CORE and always seat first,
   * exactly as v450/v451 seat them; the "no fifth row"
   * sentence above now holds for the core only. When the
   * whole core stands (the after row seated — which, given
   * the priority order, means every core item row that
   * exists is in), the render-time path's `extension` list
   * (the rest of the day past the after item, plain rows
   * and their gap boxes in rail order) walks from whatever
   * budget the core left over: strict rail order, each
   * element whole or not at all at the core's own costs
   * (item 34, gap box 32), STOPPING at the first element
   * that does not fit — a later, smaller element is never
   * seated past the hole. The rail's nine slots cap the
   * walk too. The extension never displaces a core row or
   * a core gap, and if the core could not fully seat there
   * is no extension. At a standard height the core takes
   * the whole budget and the walk seats nothing.
   *
   * The budget: v447 set the chrome allowance at 56 (the
   * footer's ~40 went to the rail when the footer was
   * removed). v450 subtracts a further 16 of SAFETY MARGIN:
   * the height signal has overestimated the placed height
   * three rounds running (v443, v444, and v449's half-clipped
   * fourth row), so the selection now plans against
   * heightSignal − 56 − 16 and the seated total fits with
   * room to spare. If the margin costs the after row at a
   * small placement, so be it — a dropped row is acceptable;
   * a clipped row is the failure this fixes.
   * The gap cost is 32 since v447 (the white box's in-box
   * padding plus margins stand ≈ 33 tall). */
  private fun selectRailRows(
    last: RailRow?,
    current: RailRow?,
    hero: RailRow?,
    gap: RailRow?,
    after: RailRow?,
    next: RailRow?,
    boxIsNow: Boolean,
    extension: List<RailRow>,
    heightSignal: Int,
  ): List<RailRow> {
    val railBudget = heightSignal - 56 - 16
    var remaining = railBudget
    val nowRow = RailRow("now", nowTimeLabel(), "NOW", "", 0, "")
    var lastChosen = false
    var currentChosen = false
    var nowChosen = false
    var heroChosen = false
    var afterChosen = false
    var nextChosen = false
    var gapChosen = false
    // ── Item rows first, in priority order. ──
    // (1) hero — always chosen.
    if (hero != null) {
      heroChosen = true
      remaining -= 64
    }
    // (2) current if present, else the NOW row — always
    // chosen. v451/v454: while the box IS now (a running
    // event holds it, or it is the white space) there
    // is no NOW row to anchor — the box itself is the anchor,
    // already chosen at (1).
    if (current != null) {
      currentChosen = true
      remaining -= 34
    } else if (!boxIsNow) {
      nowChosen = true
      remaining -= 30
    }
    // (3) last — when it fits.
    if (last != null && 34 <= remaining) {
      lastChosen = true
      remaining -= 34
    }
    // (4) next — v451: the item directly under the box
    // (a running event's box in v451; the struck holder's
    // and the white box's in v454), when it fits. (Null in
    // the v450 arrangement, where the hero itself is the
    // next up.)
    if (next != null && 34 <= remaining) {
      nextChosen = true
      remaining -= 34
    }
    // (5) after — when it fits.
    if (after != null && 34 <= remaining) {
      afterChosen = true
      remaining -= 34
    }
    // (6) the NOW row when a current exists — when it fits,
    // and never while the box IS now (v451/v454: the box
    // is the anchor then).
    if (current != null && !nowChosen && !boxIsNow && 30 <= remaining) {
      nowChosen = true
      remaining -= 30
    }
    // ── The gap row last: only what the item rows left
    // over, whole or not at all. v454: the under-box gap
    // is the ONLY gap candidate — no gap stands before
    // the box any more (Ruling 2). ──
    if (gap != null && 32 <= remaining) {
      gapChosen = true
      remaining -= 32
    }
    val display = mutableListOf<RailRow>()
    if (lastChosen && last != null) display.add(last)
    if (currentChosen && current != null) display.add(current)
    if (nowChosen) display.add(nowRow)
    if (heroChosen && hero != null) display.add(hero)
    if (gapChosen && gap != null) display.add(gap)
    if (nextChosen && next != null) display.add(next)
    if (afterChosen && after != null) display.add(after)
    // ── v453: the tall extension — the rest of the day,
    // walked from the core's leftover, only once the whole
    // core stands. Strict rail order, whole or not at all,
    // stop at the first element that does not fit; the
    // rail's nine slots cap the walk as well. ──
    if (afterChosen) {
      for (row in extension) {
        if (display.size >= 9) break
        val cost = if (row.kind == "gap") 32 else 34
        if (cost > remaining) break
        display.add(row)
        remaining -= cost
      }
    }
    return display
  }

  private fun fillRailFull(context: Context, views: RemoteViews, rows: List<RailRow>, pal: WidgetPalette) {
    // v445: rows arrive already selected by the height budget
    // (selectRailRows) — this walk only fills the slots in
    // display order. v447: nothing stands below the rail any
    // more; the footer is gone from the layout entirely.
    views.setViewVisibility(R.id.next_rail, View.VISIBLE)
    for (slot in 0 until 9) {
      val rowId = railId(context, "nx_row_${slot + 1}")
      if (slot >= rows.size) {
        views.setViewVisibility(rowId, View.GONE)
        continue
      }
      fillRailSlot(context, views, slot + 1, rows[slot], slot == 0, slot == rows.size - 1, pal)
    }
  }

  private fun fillRailSlot(context: Context, views: RemoteViews, n: Int, row: RailRow, isFirst: Boolean, isLast: Boolean, pal: WidgetPalette) {
    fun id(name: String) = railId(context, "nx_${name}_$n")
    views.setViewVisibility(id("row"), View.VISIBLE)
    // The rail line runs through the slot: segments in the track
    // colour, the outer half dropped at the ends of the walk.
    views.setInt(id("seg_top"), "setColorFilter", pal.track)
    views.setViewVisibility(id("seg_top"), if (isFirst) View.GONE else View.VISIBLE)
    views.setInt(id("seg_bot"), "setColorFilter", pal.track)
    views.setViewVisibility(id("seg_bot"), if (isLast) View.GONE else View.VISIBLE)
    // Reset the slot's faces first — kinds move between slots
    // across renders and RemoteViews reuses the placed views.
    // (The gap TEXT is not reset: it lives inside the gap box,
    // and the box's visibility is the gap face's switch.)
    views.setViewVisibility(id("line"), View.GONE)
    views.setViewVisibility(id("gapbox"), View.GONE)
    views.setViewVisibility(id("band"), View.GONE)
    views.setViewVisibility(id("check"), View.GONE)
    views.setViewVisibility(id("now"), View.GONE)
    views.setViewVisibility(id("ring"), View.GONE)
    views.setViewVisibility(id("dot_small"), View.GONE)
    views.setViewVisibility(id("dot"), View.VISIBLE)
    views.setInt(id("title"), "setPaintFlags", Paint.ANTI_ALIAS_FLAG)
    views.setTextViewTextSize(id("title"), TypedValue.COMPLEX_UNIT_SP, 14.5f)
    views.setTextViewText(id("time"), row.timeLabel)
    when (row.kind) {
      "done" -> {
        // Muted, struck through, checked in the reached green.
        views.setTextColor(id("time"), pal.muted)
        views.setInt(id("dot"), "setColorFilter", pal.greenContainer)
        views.setViewVisibility(id("line"), View.VISIBLE)
        views.setTextViewText(id("title"), row.title)
        views.setTextColor(id("title"), pal.muted)
        views.setInt(id("title"), "setPaintFlags", Paint.ANTI_ALIAS_FLAG or Paint.STRIKE_THRU_TEXT_FLAG)
        views.setTextViewText(id("sub"), "")
        views.setViewVisibility(id("sub"), View.GONE)
        views.setViewVisibility(id("check"), View.VISIBLE)
        views.setImageViewBitmap(id("check"), checkBitmap(pal.green))
      }
      "now" -> {
        views.setTextColor(id("time"), pal.primary)
        views.setViewVisibility(id("ring"), View.VISIBLE)
        views.setInt(id("ring"), "setColorFilter", pal.container)
        views.setInt(id("dot"), "setColorFilter", pal.primary)
        views.setViewVisibility(id("line"), View.VISIBLE)
        views.setTextViewText(id("title"), "NOW")
        views.setTextColor(id("title"), pal.primary)
        views.setTextViewTextSize(id("title"), TypedValue.COMPLEX_UNIT_SP, 11f)
        views.setTextViewText(id("sub"), "")
        views.setViewVisibility(id("sub"), View.GONE)
      }
      "current" -> {
        // The thing running right now (v445): a plain item's
        // dress, except its rail dot wears the NOW ring. The
        // NOW marker is its OWN rail row now (the "now" dress,
        // seated after this row by the selection) — this branch
        // never stands the trailing nx_now label up: in v444
        // that label lived outside the row frame and rendered
        // as a stray NOW line under the row on his phone.
        views.setTextColor(id("time"), pal.muted)
        views.setViewVisibility(id("ring"), View.VISIBLE)
        views.setInt(id("ring"), "setColorFilter", pal.container)
        views.setInt(id("dot"), "setColorFilter", pal.primary)
        views.setViewVisibility(id("line"), View.VISIBLE)
        views.setTextViewText(id("title"), row.title)
        views.setTextColor(id("title"), pal.ink)
        if (row.sub.isBlank()) {
          views.setViewVisibility(id("sub"), View.GONE)
        } else {
          views.setViewVisibility(id("sub"), View.VISIBLE)
          views.setTextViewText(id("sub"), row.sub)
          views.setTextColor(id("sub"), pal.muted)
        }
      }
      "past" -> {
        // The last thing that started before now and was never
        // checked off: present, but muted — chip dot, body title,
        // no strike, no check. It is not done; it just isn't next.
        // (The slot reset above has already cleared any strike or
        // check a previous row left on this slot.)
        views.setTextColor(id("time"), pal.muted)
        views.setInt(id("dot"), "setColorFilter", pal.chip)
        views.setViewVisibility(id("line"), View.VISIBLE)
        views.setTextViewText(id("title"), row.title)
        views.setTextColor(id("title"), pal.body)
        if (row.sub.isBlank()) {
          views.setViewVisibility(id("sub"), View.GONE)
        } else {
          views.setViewVisibility(id("sub"), View.VISIBLE)
          views.setTextViewText(id("sub"), row.sub)
          views.setTextColor(id("sub"), pal.muted)
        }
      }
      "hero" -> {
        views.setTextColor(id("time"), pal.onContainer)
        views.setInt(id("dot"), "setColorFilter", pal.primary)
        views.setViewVisibility(id("band"), View.VISIBLE)
        views.setInt(id("band_img"), "setColorFilter", pal.container)
        views.setTextViewText(id("htitle"), row.title)
        views.setTextViewTextSize(id("htitle"), TypedValue.COMPLEX_UNIT_SP, 20f)
        views.setInt(id("htitle"), "setPaintFlags", Paint.ANTI_ALIAS_FLAG)
        views.setTextColor(id("htitle"), pal.ink)
        if (row.sub.isBlank()) {
          views.setViewVisibility(id("hsub"), View.GONE)
        } else {
          views.setViewVisibility(id("hsub"), View.VISIBLE)
          views.setTextViewText(id("hsub"), row.sub)
          views.setTextColor(id("hsub"), pal.body)
        }
        views.setInt(id("hchip_img"), "setColorFilter", pal.surface)
        // v451: a running box counts the time LEFT in the
        // event (its startMinutes slot carries the event's
        // end); a next-up box counts down to its start,
        // exactly as before.
        views.setTextViewText(
          id("hcount"),
          if (row.heroLeft) remainingText(row.startMinutes, nowMinutes()) else countdownText(row.startMinutes, nowMinutes()),
        )
        views.setTextColor(id("hcount"), pal.primary)
      }
      "heroDone" -> {
        // v454 (Ruling 1): the box, held by a finished item.
        // The band stands as the hero's band stands; inside
        // it, the item wears the done dress — title muted and
        // struck through (the plain done row's own treatment),
        // its sub as usual, the pill reading DONE in the
        // reached green, and the green check at the row's
        // right edge, the same check the done row carries.
        views.setTextColor(id("time"), pal.muted)
        views.setInt(id("dot"), "setColorFilter", pal.greenContainer)
        views.setViewVisibility(id("band"), View.VISIBLE)
        views.setInt(id("band_img"), "setColorFilter", pal.container)
        views.setTextViewText(id("htitle"), row.title)
        views.setTextViewTextSize(id("htitle"), TypedValue.COMPLEX_UNIT_SP, 20f)
        views.setInt(id("htitle"), "setPaintFlags", Paint.ANTI_ALIAS_FLAG or Paint.STRIKE_THRU_TEXT_FLAG)
        views.setTextColor(id("htitle"), pal.muted)
        if (row.sub.isBlank()) {
          views.setViewVisibility(id("hsub"), View.GONE)
        } else {
          views.setViewVisibility(id("hsub"), View.VISIBLE)
          views.setTextViewText(id("hsub"), row.sub)
          views.setTextColor(id("hsub"), pal.body)
        }
        views.setInt(id("hchip_img"), "setColorFilter", pal.surface)
        views.setTextViewText(id("hcount"), "DONE")
        views.setTextColor(id("hcount"), pal.green)
        views.setViewVisibility(id("check"), View.VISIBLE)
        views.setImageViewBitmap(id("check"), checkBitmap(pal.green))
      }
      "whitebox" -> {
        // v454 (Ruling 2): the box AS the white space. The
        // band wears the white block's own fill (surfaceAlt,
        // the gap box's dress at box scale) and carries the
        // open stretch's wording in the gap text's quiet
        // voice — set smaller than the hero title, since the
        // wording is a sentence, not a name. The rail keeps
        // the gap family's small softened dot. The pill
        // counts down to the next item (its start rides the
        // row's startMinutes slot) in the hero pill's IN
        // voice, and there is no sub: the stretch is the
        // whole content.
        views.setTextColor(id("time"), pal.muted)
        views.setViewVisibility(id("dot"), View.GONE)
        views.setViewVisibility(id("dot_small"), View.VISIBLE)
        views.setInt(id("dot_small"), "setColorFilter", pal.chip)
        views.setViewVisibility(id("band"), View.VISIBLE)
        views.setInt(id("band_img"), "setColorFilter", pal.surfaceAlt)
        views.setTextViewText(id("htitle"), row.gapText)
        views.setTextViewTextSize(id("htitle"), TypedValue.COMPLEX_UNIT_SP, 14.5f)
        views.setInt(id("htitle"), "setPaintFlags", Paint.ANTI_ALIAS_FLAG)
        views.setTextColor(id("htitle"), pal.muted)
        views.setViewVisibility(id("hsub"), View.GONE)
        views.setInt(id("hchip_img"), "setColorFilter", pal.surface)
        views.setTextViewText(id("hcount"), countdownText(row.startMinutes, nowMinutes()))
        views.setTextColor(id("hcount"), pal.primary)
      }
      "gap" -> {
        // v447: the gap wears the WHITE BOX, like his white
        // blocks in the app — the text sits inside the box
        // (nx_gapbox), whose image the renderer fills with the
        // palette's lightest standing surface (surfaceAlt: the
        // surface mixed a step toward the seed — pal.surface
        // itself is the card's own colour and a box in it
        // would vanish), through the hero band's own mechanism
        // (widget_rounded16 + setColorFilter). The rail keeps
        // its small softened dot, as before; the wording is
        // unchanged, quiet grey on the box.
        views.setTextColor(id("time"), pal.muted)
        views.setViewVisibility(id("dot"), View.GONE)
        views.setViewVisibility(id("dot_small"), View.VISIBLE)
        views.setInt(id("dot_small"), "setColorFilter", pal.chip)
        views.setViewVisibility(id("gapbox"), View.VISIBLE)
        views.setInt(id("gap_img"), "setColorFilter", pal.surfaceAlt)
        views.setTextViewText(id("gap"), row.gapText)
        views.setTextColor(id("gap"), pal.muted)
      }
      else -> {
        // A following item, plain: time, softened dot, title, sub.
        views.setTextColor(id("time"), pal.muted)
        views.setInt(id("dot"), "setColorFilter", blend(pal.primary, pal.surface, 0.6f))
        views.setViewVisibility(id("line"), View.VISIBLE)
        views.setTextViewText(id("title"), row.title)
        views.setTextColor(id("title"), pal.ink)
        if (row.sub.isBlank()) {
          views.setViewVisibility(id("sub"), View.GONE)
        } else {
          views.setViewVisibility(id("sub"), View.VISIBLE)
          views.setTextViewText(id("sub"), row.sub)
          views.setTextColor(id("sub"), pal.muted)
        }
      }
    }
  }

  // ─── 7. Pray Strip (v443 R-1 at 2×1; v441 W-3 before) ─────────────────────
  //
  // v442: the rectangles' paint source moved to the render's
  // effective palette (device colours first, steer 2). v443
  // recomposes the strip itself for the 2×1 cell: header counts
  // and an overlapping faces row — no names under faces.

  private val PS_SLOTS = intArrayOf(R.id.ps_face_1, R.id.ps_face_2, R.id.ps_face_3, R.id.ps_face_4, R.id.ps_face_5, R.id.ps_face_6)
  private val PS_RINGS = intArrayOf(R.id.ps_face_ring_1, R.id.ps_face_ring_2, R.id.ps_face_ring_3, R.id.ps_face_ring_4, R.id.ps_face_ring_5, R.id.ps_face_ring_6)
  private val PS_IMGS = intArrayOf(R.id.ps_face_img_1, R.id.ps_face_img_2, R.id.ps_face_img_3, R.id.ps_face_img_4, R.id.ps_face_img_5, R.id.ps_face_img_6)
  private val PS_TEXTS = intArrayOf(R.id.ps_face_text_1, R.id.ps_face_text_2, R.id.ps_face_text_3, R.id.ps_face_text_4, R.id.ps_face_text_5, R.id.ps_face_text_6)

  /** The strip form of Pray Today: same snapshot, same queue
   * order. The header carries the day's count and the next name
   * (the snapshot already rides prayed/total and, in the next
   * state, the hero's firstName — nothing new had to be added);
   * the faces overlap below it, five standing and the rest
   * folded into the +N chip. Root tap = the next person's pray
   * link, exactly as the big widget's. */
  private fun renderPrayStrip(context: Context, root: JSONObject?, scheme: String?, pal: WidgetPalette): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_pray_strip)
    val base = 700
    val snap = root?.optJSONObject("prayToday")
    // The palette paints the whole card, quiet face included.
    views.setInt(R.id.ps_bg, "setColorFilter", pal.surface)
    views.setInt(R.id.ps_dot, "setColorFilter", pal.primary)
    views.setTextColor(R.id.ps_kicker, pal.muted)
    views.setTextColor(R.id.ps_count, pal.muted)
    views.setTextColor(R.id.ps_next_name, pal.primary)
    views.setTextColor(R.id.ps_msg_title, pal.ink)
    views.setTextColor(R.id.ps_msg_sub, pal.body)
    val state = snap?.optString("state") ?: "no-queue"
    if (snap == null || state == "no-queue") {
      views.setTextViewText(R.id.ps_count, "")
      views.setTextViewText(R.id.ps_next_name, "")
      views.setViewVisibility(R.id.ps_faces, View.GONE)
      views.setViewVisibility(R.id.ps_msg_title, View.VISIBLE)
      views.setViewVisibility(R.id.ps_msg_sub, View.VISIBLE)
      views.setOnClickPendingIntent(R.id.ps_root, launchPendingIntent(context, base))
      return views
    }
    val faces = snap.optJSONArray("faces") ?: JSONArray()
    fillStripFaces(context, views, faces, snap.optString("personId"), state == "next", pal)
    views.setViewVisibility(R.id.ps_faces, View.VISIBLE)
    views.setViewVisibility(R.id.ps_msg_title, View.GONE)
    views.setViewVisibility(R.id.ps_msg_sub, View.GONE)
    if (state == "complete") {
      // The day is done: the header carries the full count and
      // no Next name stands.
      views.setTextViewText(R.id.ps_count, "${snap.optInt("prayed")} of ${snap.optInt("total")} prayed")
      views.setTextViewText(R.id.ps_next_name, "")
      views.setOnClickPendingIntent(R.id.ps_root, launchPendingIntent(context, base))
      return views
    }
    views.setTextViewText(
      R.id.ps_count,
      "${snap.optInt("prayed")} of ${snap.optInt("total")} prayed · Next:",
    )
    views.setTextViewText(R.id.ps_next_name, snap.optString("firstName"))
    val tap = if (scheme != null) {
      uriPendingIntent(context, prayUri(scheme, snap.optString("personId"), "today"), base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.ps_root, tap)
    return views
  }

  /** The overlapping faces row: five faces at 40dp with
   * surface-coloured rings (the ring is what separates one face
   * from the next in the overlap), the next person's ring in the
   * primary, and — when the queue runs past five — the +N chip
   * in the tonal container as the sixth slot. */
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
        views.setInt(PS_RINGS[i], "setColorFilter", pal.surface)
        views.setImageViewResource(PS_IMGS[i], R.drawable.widget_circle_white)
        views.setInt(PS_IMGS[i], "setColorFilter", pal.container)
        views.setTextViewText(PS_TEXTS[i], "+${faces.length() - visible}")
        views.setTextColor(PS_TEXTS[i], pal.onContainer)
        continue
      }
      val face = faces.optJSONObject(i) ?: continue
      val isNext = hasNext && face.optString("personId") == nextPersonId
      views.setInt(PS_RINGS[i], "setColorFilter", if (isNext) pal.primary else pal.surface)
      applyFace(context, views, PS_IMGS[i], PS_TEXTS[i], face, pal.primary, 40)
      views.setTextColor(PS_TEXTS[i], Color.WHITE)
    }
  }

  // ─── 8. Pray Next (v443 R-2 at 2×1; v441 W-3 before) ──────────────────────

  /** The strip given to one person: the prayToday snapshot's next
   * person — face, first name, and their standing in the day's
   * queue ("Waiting": on the list, not yet prayed — the same
   * state word the strip faces used). The pill is wrap_content
   * behind the weight-constrained name column, so it always
   * fits; the same pray deep link rides the pill and the card. */
  private fun renderPrayNext(context: Context, root: JSONObject?, scheme: String?, pal: WidgetPalette): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_pray_next)
    val base = 800
    val snap = root?.optJSONObject("prayToday")
    views.setInt(R.id.pn_bg, "setColorFilter", pal.surface)
    views.setTextColor(R.id.pn_msg_title, pal.ink)
    views.setTextColor(R.id.pn_msg_sub, pal.body)
    val state = snap?.optString("state") ?: "no-queue"
    if (snap == null || state != "next") {
      // No next person (empty queue, or the day complete): the
      // quiet face stands.
      views.setViewVisibility(R.id.pn_hero, View.GONE)
      views.setViewVisibility(R.id.pn_msg, View.VISIBLE)
      views.setOnClickPendingIntent(R.id.pn_root, launchPendingIntent(context, base))
      return views
    }
    views.setViewVisibility(R.id.pn_msg, View.GONE)
    views.setViewVisibility(R.id.pn_hero, View.VISIBLE)
    views.setInt(R.id.pn_ring, "setColorFilter", pal.primary)
    // The hero IS the next person: the snapshot's top-level face
    // fields ride the same face shape applyFace reads.
    applyFace(context, views, R.id.pn_img, R.id.pn_text, snap, pal.primary, 44)
    views.setTextColor(R.id.pn_text, Color.WHITE)
    views.setTextViewText(R.id.pn_name, snap.optString("firstName"))
    views.setTextColor(R.id.pn_name, pal.ink)
    views.setTextViewText(R.id.pn_status, "Waiting")
    views.setTextColor(R.id.pn_status, pal.muted)
    views.setInt(R.id.pn_pill_img, "setColorFilter", pal.primary)
    views.setTextColor(R.id.pn_pill, pal.onPrimary)
    val tap = if (scheme != null) {
      uriPendingIntent(context, prayUri(scheme, snap.optString("personId"), "today"), base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.pn_root, tap)
    views.setOnClickPendingIntent(R.id.pn_pill, tap)
    return views
  }

  // ─── 9. Reach Pair (v443 R-3 at 2×1; v441 W-3 before) ─────────────────────

  private val RP_IMGS = intArrayOf(R.id.rp_img_1, R.id.rp_img_2)
  private val RP_TEXTS = intArrayOf(R.id.rp_text_1, R.id.rp_text_2)
  private val RP_NAMES = intArrayOf(R.id.rp_name_1, R.id.rp_name_2)
  private val RP_CHIP_IMGS = intArrayOf(R.id.rp_chip_img_1, R.id.rp_chip_img_2)
  private val RP_CHIPS = intArrayOf(R.id.rp_chip_1, R.id.rp_chip_2)
  private val RP_COLS = intArrayOf(R.id.rp_col_1, R.id.rp_col_2)

  /** The two most overdue people side by side (the reachOut
   * snapshot's lead + second), split by a hairline, each with its
   * "{days} days" chip in the palette's tonal container (the R-3
   * drawing's chip dress). One due: the second half and the
   * divider hide and the lead's half takes the width. The header
   * row the rectangle carried at 2×2 (kicker + due count) does
   * not survive the strip — the halves are the card. */
  private fun renderReachPair(context: Context, root: JSONObject?, scheme: String?, pal: WidgetPalette): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_reach_pair)
    val base = 900
    val snap = root?.optJSONObject("reachOut")
    views.setInt(R.id.rp_bg, "setColorFilter", pal.surface)
    views.setTextColor(R.id.rp_msg_title, pal.ink)
    views.setTextColor(R.id.rp_msg_sub, pal.body)
    val tap = if (scheme != null) {
      uriPendingIntent(context, "$scheme://due-to-reach", base)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.rp_root, tap)
    if (snap == null || snap.optString("state") != "due") {
      views.setViewVisibility(R.id.rp_pair, View.GONE)
      views.setViewVisibility(R.id.rp_msg_title, View.VISIBLE)
      views.setViewVisibility(R.id.rp_msg_sub, View.VISIBLE)
      return views
    }
    val lead = snap.optJSONObject("lead") ?: return views
    views.setViewVisibility(R.id.rp_msg_title, View.GONE)
    views.setViewVisibility(R.id.rp_msg_sub, View.GONE)
    views.setViewVisibility(R.id.rp_pair, View.VISIBLE)
    views.setInt(R.id.rp_divider, "setBackgroundColor", pal.track)
    val people = listOf(lead, snap.optJSONObject("second"))
    for (i in people.indices) {
      val person = people[i]
      if (person == null) continue
      views.setViewVisibility(RP_COLS[i], View.VISIBLE)
      applyFace(context, views, RP_IMGS[i], RP_TEXTS[i], person, pal.green, 36)
      views.setTextColor(RP_TEXTS[i], Color.WHITE)
      views.setTextViewText(RP_NAMES[i], person.optString("firstName"))
      views.setTextColor(RP_NAMES[i], pal.ink)
      views.setInt(RP_CHIP_IMGS[i], "setColorFilter", pal.container)
      views.setTextViewText(RP_CHIPS[i], "${person.optInt("days")} days")
      views.setTextColor(RP_CHIPS[i], pal.onContainer)
    }
    if (people[1] == null) {
      views.setViewVisibility(R.id.rp_col_2, View.GONE)
      views.setViewVisibility(R.id.rp_divider, View.GONE)
    } else {
      views.setViewVisibility(R.id.rp_divider, View.VISIBLE)
    }
    return views
  }

  // ─── 10. Emergency Strip (v443, ES-1) ─────────────────────────────────────

  private val ES_M_IMGS = intArrayOf(R.id.es_m_img_1, R.id.es_m_img_2)
  private val ES_M_TEXTS = intArrayOf(R.id.es_m_text_1, R.id.es_m_text_2)
  private val ES_M_NAMES = intArrayOf(R.id.es_m_name_1, R.id.es_m_name_2)

  /** ES-1 · Face first, at 2×1: the emergency snapshot in a wide,
   * short card. The red is the main widget's own gradient at the
   * strip radius (widget_bg_emergency_24) — a meaning hue, set
   * as a resource and NEVER tinted; the quiet face wears the
   * palette surface like its big sibling. Rows re-filter by
   * expiresAtMillis exactly as renderEmergency's do. One active
   * fills the strip; two or more split it into two slim rows,
   * soonest first.
   *
   * v447 (Jonathan, on the v446 render): "Just get rid of the
   * 'pray now' button altogether. Just show the name. And the
   * avatar." The strip is avatar + name only in both
   * compositions — no pill, no need line, no per-row tap; the
   * whole card's tap into the lead emergency is the only tap.
   * The big Emergency widget keeps its Pray now pills; nothing
   * here touches renderEmergency.
   *
   * v446: the single face is recomposed — the avatar stands
   * 54dp at the left (decoded at 50, the image view's size)
   * and the name gets its own full-width line in the column
   * beside it (Jonathan: "make the avatar a bit bigger. I
   * also want the name to fit."). */
  private fun renderEmergencyStrip(context: Context, snap: JSONObject?, scheme: String?, pal: WidgetPalette): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_emergency_strip)
    val base = 1000
    val now = System.currentTimeMillis()
    val all = mutableListOf<JSONObject>()
    if (snap != null && snap.optString("state") == "active") {
      for (key in listOf("rows", "extraRows")) {
        val arr = snap.optJSONArray(key) ?: continue
        for (i in 0 until arr.length()) arr.optJSONObject(i)?.let { all.add(it) }
      }
    }
    val live = all.filter { row ->
      val expires = row.optLong("expiresAtMillis", 0L)
      expires <= 0L || expires > now
    }
    if (live.isEmpty()) {
      views.setViewVisibility(R.id.es_bg, View.VISIBLE)
      views.setInt(R.id.es_bg, "setColorFilter", pal.surface)
      views.setViewVisibility(R.id.es_bg_red, View.GONE)
      views.setViewVisibility(R.id.es_quiet, View.VISIBLE)
      views.setViewVisibility(R.id.es_single, View.GONE)
      views.setViewVisibility(R.id.es_multi, View.GONE)
      views.setInt(R.id.es_q_dot, "setColorFilter", pal.muted)
      views.setTextColor(R.id.es_q_kicker, pal.muted)
      views.setTextColor(R.id.es_q_title, pal.ink)
      views.setTextColor(R.id.es_q_sub, pal.body)
      views.setOnClickPendingIntent(R.id.es_root, launchPendingIntent(context, base))
      return views
    }
    views.setViewVisibility(R.id.es_bg, View.GONE)
    views.setViewVisibility(R.id.es_bg_red, View.VISIBLE)
    views.setViewVisibility(R.id.es_quiet, View.GONE)
    val leadTap = if (scheme != null) {
      uriPendingIntent(context, prayUri(scheme, live[0].optString("personId"), "emergency"), base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.es_root, leadTap)
    if (live.size == 1) {
      views.setViewVisibility(R.id.es_multi, View.GONE)
      views.setViewVisibility(R.id.es_single, View.VISIBLE)
      val row = live[0]
      views.setInt(R.id.es_s_ring, "setColorFilter", Color.WHITE)
      applyFace(context, views, R.id.es_s_img, R.id.es_s_text, row, SEED, 50)
      views.setTextColor(R.id.es_s_text, Color.WHITE)
      views.setTextViewText(R.id.es_s_name, row.optString("name"))
      // v447: the name is ALL the single face writes — the need
      // line and the Pray now pill are gone at Jonathan's word
      // ("Just show the name. And the avatar."). The root tap
      // set above carries the whole card.
      return views
    }
    views.setViewVisibility(R.id.es_single, View.GONE)
    views.setViewVisibility(R.id.es_multi, View.VISIBLE)
    for (slot in 0 until 2) {
      val row = live[slot]
      applyFace(context, views, ES_M_IMGS[slot], ES_M_TEXTS[slot], row, SEED, 28)
      views.setTextColor(ES_M_TEXTS[slot], Color.WHITE)
      views.setTextViewText(ES_M_NAMES[slot], row.optString("name"))
      // v447: the row writes the name and nothing else — the
      // need line (and the +N fold that rode it) and each row's
      // own Pray now pill are gone at Jonathan's word. Further
      // emergencies beyond the two rows ride the card tap into
      // the app, like the quiet face.
    }
    return views
  }

  // ─── 11. Reading Strip (v443, ST-2) ───────────────────────────────────────

  /** ST-2 · Chapter in the tile, at 2×1: the study snapshot as a
   * wide, short card. v445: the strip reads the READING track —
   * the snapshot's readingBook / readingChapter (from the app's
   * reading position: the next chapter he reads, or the last
   * chapter read) in readingBookPrimary, kicker "CURRENTLY
   * READING", the line "Chapter {n} of {total}" (or "Last read
   * · Chapter {n} of {total}"). His words: "I don't need to
   * know how many I've written. I need to know where I'm at
   * reading." The v444 writing-track behaviour below (next
   * chapter to write / last written, "Fully written") is now
   * only the fallback for snapshots pushed before the reading
   * fields rode — the big Your Study widget keeps the writing
   * dress. (v443 part 3: the restudy segment was removed at
   * Jonathan's word; restudy is its own concern, not this
   * strip's.) The root tap is Your Study's own deep link, to
   * the chapter the tile stands. */
  private fun renderReadingStrip(context: Context, snap: JSONObject?, scheme: String?, pal: WidgetPalette): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_reading_strip)
    val base = 1100
    views.setInt(R.id.rs_bg, "setColorFilter", pal.surface)
    views.setTextColor(R.id.rs_msg, pal.ink)
    if (snap == null || snap.optString("state") != "active") {
      views.setViewVisibility(R.id.rs_msg, View.VISIBLE)
      views.setViewVisibility(R.id.rs_main, View.GONE)
      views.setOnClickPendingIntent(R.id.rs_root, launchPendingIntent(context, base))
      return views
    }
    // v445: the READING track, when the snapshot carries it —
    // the tile stands the chapter he reads next (or last read)
    // in that book's own primary, and the line names the
    // chapter plainly. The writing fields are not consulted.
    val readingBook = snap.optString("readingBook").takeIf { it.isNotBlank() }
    val readingChapter = if (snap.isNull("readingChapter")) null else snap.optInt("readingChapter")
    if (readingBook != null && readingChapter != null) {
      val readingTotalChapters = if (snap.isNull("readingTotalChapters")) null else snap.optInt("readingTotalChapters")
      val readingFromTarget = snap.optBoolean("readingFromTarget")
      val readingColor = colorOr(
        snap.optString("readingBookPrimary").takeIf { it.isNotBlank() }
          ?: snap.optString("bookPrimary").takeIf { it.isNotBlank() }
          ?: snap.optString("bookColor"),
        pal.primary,
      )
      views.setViewVisibility(R.id.rs_msg, View.GONE)
      views.setViewVisibility(R.id.rs_main, View.VISIBLE)
      views.setInt(R.id.rs_tile, "setColorFilter", readingColor)
      views.setViewVisibility(R.id.rs_tile_num, View.VISIBLE)
      views.setTextViewText(R.id.rs_tile_num, readingChapter.toString())
      views.setViewVisibility(R.id.rs_tile_glyph, View.GONE)
      views.setTextColor(R.id.rs_kicker, pal.muted)
      views.setTextViewText(R.id.rs_kicker, "CURRENTLY READING")
      views.setTextViewText(R.id.rs_book, readingBook)
      views.setTextColor(R.id.rs_book, pal.ink)
      val line = if (readingFromTarget) {
        "Chapter $readingChapter of $readingTotalChapters"
      } else {
        "Last read · Chapter $readingChapter of $readingTotalChapters"
      }
      views.setTextViewText(R.id.rs_line, line)
      views.setTextColor(R.id.rs_line, pal.muted)
      val tap = if (scheme != null) {
        uriPendingIntent(context, "$scheme://bible-chapter?book=${Uri.encode(readingBook)}&chapter=$readingChapter", base + 1)
      } else {
        launchPendingIntent(context, base)
      }
      views.setOnClickPendingIntent(R.id.rs_root, tap)
      return views
    }
    // Fallback (snapshots pushed before v445): the v444
    // writing-track behaviour, exactly as it was.
    // The book's PRIMARY colour (v444): the snapshot's
    // bookPrimary — the true ROYGBIV primary. bookColor stays
    // the fallback for snapshots pushed before it rode (it is
    // the dark-appearance set — the primary mixed toward white
    // — which is why v443's tile read as a pale tint on his
    // phone instead of the book's solid red).
    val bookColor = colorOr(
      snap.optString("bookPrimary").takeIf { it.isNotBlank() }
        ?: snap.optString("bookColor").takeIf { it.isNotBlank() }
        ?: snap.optString("colorPrimary"),
      pal.primary,
    )
    val book = snap.optString("book")
    val nextChapter = if (snap.isNull("nextChapter")) null else snap.optInt("nextChapter")
    val lastChapter = if (snap.isNull("lastWrittenChapter")) null else snap.optInt("lastWrittenChapter")
    val totalChapters = snap.optInt("totalChapters")
    views.setViewVisibility(R.id.rs_msg, View.GONE)
    views.setViewVisibility(R.id.rs_main, View.VISIBLE)
    views.setInt(R.id.rs_tile, "setColorFilter", bookColor)
    // The chapter number stands in the tile in EVERY state
    // (v444): the next chapter while the book is underway, the
    // LAST WRITTEN chapter once it is fully written — the
    // number was always supposed to be in the box. The glyph
    // remains only for a book with no written chapter at all.
    val tileChapter = nextChapter ?: lastChapter
    if (tileChapter != null) {
      views.setViewVisibility(R.id.rs_tile_num, View.VISIBLE)
      views.setTextViewText(R.id.rs_tile_num, tileChapter.toString())
      views.setViewVisibility(R.id.rs_tile_glyph, View.GONE)
    } else {
      views.setViewVisibility(R.id.rs_tile_num, View.GONE)
      views.setViewVisibility(R.id.rs_tile_glyph, View.VISIBLE)
      views.setImageViewBitmap(R.id.rs_tile_glyph, bookBitmap())
    }
    views.setTextColor(R.id.rs_kicker, pal.muted)
    views.setTextViewText(R.id.rs_book, book)
    views.setTextColor(R.id.rs_book, pal.ink)
    val line = if (nextChapter != null) {
      "$nextChapter of $totalChapters"
    } else {
      // Fully written — just those words (v444: the "· Last
      // written · Chapter N" tail is gone; it overflowed the
      // strip's one line, and the number lives in the tile now).
      "Fully written"
    }
    views.setTextViewText(R.id.rs_line, line)
    views.setTextColor(R.id.rs_line, pal.muted)
    val openChapter = nextChapter ?: lastChapter ?: 1
    val tap = if (scheme != null) {
      uriPendingIntent(context, "$scheme://bible-chapter?book=${Uri.encode(book)}&chapter=$openChapter", base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.rs_root, tap)
    return views
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
