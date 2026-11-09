package expo.modules.prayercirclewidgets

import android.app.PendingIntent
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
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
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
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
  DAILY_BREAKDOWN(DailyBreakdownWidgetProvider::class.java, R.layout.widget_daily_breakdown),
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
      WidgetKind.DAILY_BREAKDOWN ->
        renderDailyBreakdown(context, root?.optJSONObject("dailyBreakdown"), scheme, pal, minHeightDp)
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

      /** v464: the snapshot's seed × DARK palette — the
       * "paletteDark" key the push layer rides beside "palette"
       * since v464 (lib/widget-palette's dark derivation of the
       * same Settings seed, built push-side where the theme
       * machinery lives). Null when the stored snapshot predates
       * it. Per-field fallbacks are the standing palette's own
       * values, never a second set of constants. */
      fun darkFromSnapshot(root: JSONObject?, snapshot: WidgetPalette): WidgetPalette? {
        val pal = root?.optJSONObject("paletteDark") ?: return null
        fun hex(key: String, fallbackColor: Int): Int {
          val raw = pal.optString(key)?.takeIf { it.isNotBlank() } ?: return fallbackColor
          return colorOr(raw, fallbackColor)
        }
        return WidgetPalette(
          surface = hex("surface", snapshot.surface),
          surfaceAlt = hex("surfaceAlt", snapshot.surfaceAlt),
          ink = hex("ink", snapshot.ink),
          body = hex("body", snapshot.body),
          muted = hex("muted", snapshot.muted),
          primary = hex("primary", snapshot.primary),
          onPrimary = hex("onPrimary", snapshot.onPrimary),
          container = hex("container", snapshot.container),
          onContainer = hex("onContainer", snapshot.onContainer),
          chip = hex("chip", snapshot.chip),
          track = hex("track", snapshot.track),
          green = hex("green", snapshot.green),
          greenContainer = hex("greenContainer", snapshot.greenContainer),
        )
      }
    }
  }

  private fun paletteOf(root: JSONObject?): WidgetPalette = WidgetPalette.fromSnapshot(root)

  /** v464: is the DEVICE in night mode, per the provider
   * context's own configuration? The widgets follow the DEVICE
   * — never the app's appearance setting (his app can stand in
   * light while his phone stands in dark; the home screen is
   * the phone's furniture). */
  private fun deviceIsNight(context: Context): Boolean =
    (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
      Configuration.UI_MODE_NIGHT_YES

  /** The effective palette for one render — v464: the choice
   * is made by the DEVICE's mode first, then by source, and a
   * palette is always taken whole (never a mix of two, except
   * the greens, which are the snapshot's in both worlds).
   *
   * Light (exactly as v442 shipped): the device's Material You
   * colours when they can be read, the snapshot palette whole
   * when they cannot.
   *
   * Night (new): the snapshot's seed × dark palette first —
   * the app's own dark derivation of his Settings seed, the
   * same values his in-app dark surfaces wear — then the
   * device's dark tones (devicePalette's night assignment),
   * then the standing snapshot palette. The app's appearance
   * setting cannot pin the widgets light against the device:
   * "palette" may itself be a light derivation (appearance
   * set light), and at night it is only the last resort. */
  private fun effectivePalette(context: Context, root: JSONObject?): WidgetPalette {
    val snapshot = paletteOf(root)
    if (deviceIsNight(context)) {
      WidgetPalette.darkFromSnapshot(root, snapshot)?.let { return it }
      devicePalette(context, snapshot, night = true)?.let { return it }
      return snapshot
    }
    return devicePalette(context, snapshot, night = false) ?: snapshot
  }

  /** The device's Material You system colours mapped onto the
   *  palette roles — with the mode's own assignment (v464).
   *
   *  The v442 build claimed "the system resources are
   *  night-qualified" and read ONE assignment — the LIGHT
   *  assignment — in both modes. That claim was the bug: the
   *  system_* resources are raw tonal RAMPS (neutral1_50 is
   *  tone 95, a near-white, on every device in every mode);
   *  dark mode does not change the tones, it REASSIGNS them
   *  to roles — a dark surface is neutral1_900, not _50. The
   *  old mapping named light tones for every role (50 surface,
   *  900 ink, 100 container), and because the read SUCCEEDS
   *  on any API 31+ device, the snapshot fallback — the one
   *  path that could ever be dark — was never reached. His
   *  widgets were light in dark mode because the device path
   *  is a light-only path.
   *
   *  The night assignment below is Material You's own dark
   *  role map over the same ramps (primary = accent1 tone 80,
   *  surface = neutral1 tone 10, container = accent2 tone 30,
   *  ink on container = accent2 tone 90, text tones mirrored).
   *  Null on any failure (pre-31 device, a missing tone) — the
   *  caller falls back whole. */
  private fun devicePalette(context: Context, snapshot: WidgetPalette, night: Boolean): WidgetPalette? {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return null
    return try {
      val res = context.resources
      fun sys(id: Int): Int = res.getColor(id, context.theme)
      val primary = sys(if (night) android.R.color.system_accent1_200 else android.R.color.system_accent1_600)
      // White ink on the primary, unless the tone is light, where
      // the near-black neutral reads better.
      val onPrimary =
        if (luminance(primary) > 0.72) sys(android.R.color.system_neutral1_900) else Color.WHITE
      WidgetPalette.of(
        surface = sys(if (night) android.R.color.system_neutral1_900 else android.R.color.system_neutral1_50),
        surfaceAlt = sys(if (night) android.R.color.system_neutral2_700 else android.R.color.system_neutral2_100),
        ink = sys(if (night) android.R.color.system_neutral1_50 else android.R.color.system_neutral1_900),
        body = sys(if (night) android.R.color.system_neutral2_200 else android.R.color.system_neutral2_700),
        muted = sys(if (night) android.R.color.system_neutral2_400 else android.R.color.system_neutral2_600),
        primary = primary,
        onPrimary = onPrimary,
        container = sys(if (night) android.R.color.system_accent2_700 else android.R.color.system_accent2_100),
        onContainer = sys(if (night) android.R.color.system_accent2_100 else android.R.color.system_accent2_900),
        chip = sys(if (night) android.R.color.system_accent2_600 else android.R.color.system_accent2_200),
        track = sys(if (night) android.R.color.system_neutral2_700 else android.R.color.system_neutral2_200),
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
   * its completed flag, current, next → hero / item, gap).
   * v456: the bare NOW row the renderer used to seat itself
   * from the device clock is gone — the box is the now marker
   * in every state, and its rail dot carries the now dot.
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
    // v466 (Fix 2): a core gap naming the stretch between
    // the under-box row and the after row displays BELOW
    // the next row, where its stretch actually sits in the
    // day — the gap slot's standing place (directly under
    // the box) belongs to the box→next stretch alone.
    val gapBelowNext: Boolean = false,
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
    // v455: the correction Jonathan's Nov 6 verdict on v454
    // forced (10:01 AM render: News struck as the last row,
    // a NOW row, and Write — 11 AM, checked off EARLY — in
    // the box struck with DONE, while Feed Aaron, the 10 AM
    // todo he had just checked off AT ITS TIME, appeared
    // nowhere): "It should be on 'feed Aaron' or something
    // right now... I checked it off and now the widget
    // doesn't show it. Just like I literally said I didn't
    // want to happen." The v454 candidacy let the
    // early-checked next up claim the box, and the item
    // whose window contained now was eligible for no seat
    // at all — not the box (Write took it), not the last
    // row (its window had not passed). Three fixes:
    // (1) the box belongs to the item whose window is NOW:
    // a completed item standing inside its own window
    // (start ≤ now < its window end — the stored end, a
    // todo's rule-made +30 included) holds the box struck
    // ahead of any early-checked holder; latest start wins
    // among the in-window finished.
    // (2) When a struck item holds the box and the item
    // after it is itself finished, that item still seats
    // directly under the box, struck through — it waits
    // there like any next item, just struck (Write under
    // Feed Aaron), instead of vanishing.
    // (3) No vanishing, generally: a finished item that
    // lost the box to the struck holder — the earlier of
    // two overlapping in-window finishes, the earlier of
    // two checked early — seats as the last row, struck,
    // even though its window has not fully passed.
    // Box priority, restated: running event → in-window
    // struck → early-checked struck (v454) → the white
    // space → the next up.
    // v456: the NOW marker row is removed in every state
    // (Jonathan, on the v455 render — Nov 6, 11:13 AM:
    // Morning Meeting struck as the last row, a bare NOW
    // row floating at 11:12 AM between it and the box,
    // Write boxed under it with DONE): "That little 'now'
    // thing is stupid! Shouldn't the box be NOW? ... That
    // way it shows what is before, and what is coming
    // after what is currently in the box!" The box IS the
    // now marker now: the selection seats no NOW row
    // beside any box — running, struck, white, or next
    // up — and the box's rail dot carries the filled blue
    // now dot (fillRailSlot). Rows above the box are what
    // is before; rows below it are what is coming after.
    // A current todo's plain row is untouched — it never
    // took the box, and it still doesn't.
    // v471: the box-position ruling (Jonathan, Sun Nov 8,
    // on the 9:21 AM render — Duolingo 5:00–5:30 PM and
    // Gardening 6:00–7:00 PM both checked off early,
    // Check-In 10:00 PM the one thing left): the widget
    // seated Duolingo as the last row at the TOP, and the
    // box as a white box naming the 30 minutes before
    // Gardening, while his whole morning stood open.
    // His words: "Why cant the now box be at the top when
    // nothing's before it, and then it becomes second
    // after the first event or todo or ministry is done?"
    // Three changes, all in this render-time path: (1)
    // the last row seats only an item whose window has
    // STARTED (startMinutes ≤ now) — the v455 rescue is
    // gated by that one test, so an early-checked item
    // whose time has not come can never sit above the
    // box; with nothing eligible the box is simply the
    // first row. (2) The white box's boundary is the
    // first item whose window has not opened — the open
    // stretch he is standing in closes there (Duolingo's
    // start on his Sunday), not at the struck holder's.
    // (3) The white box stands over the whole early
    // CHAIN — every early-checked item before the next
    // standing one seats under it in the day's order
    // (chain head in the next row, the holder in the
    // after row when the chain has two), instead of the
    // earlier one escaping to the last row and the box
    // anchoring between the two.
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
    // v464: every render starts from the standing face (the
    // T5 reset) — the turn below re-seats what it shows.
    hideUpNextTomorrow(views)
    if (snap == null || snap.optString("state") != "next") {
      // v464: the quiet face is the day-done turn's first
      // door — a spent day turns to tomorrow (UN-T5) instead
      // of standing sad. The turn declines (stale, unspent,
      // nothing to show) → the standing face, exactly as
      // before.
      if (snap != null && renderUpNextTomorrow(context, views, snap, pal, heightSignal)) return views
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
      // v455: the item's WINDOW end, for the in-window test
      // and the under-box gap — the stored endMinutes as the
      // snapshot bakes it, a todo's rule-made +30 included
      // (that half hour is the window he checked the todo
      // inside), falling back to the start for a point item
      // whose stored end is its start. overAt above stays
      // the "over" clock for the last pick and the v454
      // candidacy, exactly as those rounds defined it.
      val winEnd = { item: DayItem -> if (item.endMinutes > item.startMinutes) item.endMinutes else item.startMinutes }
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
      // v455 (fix 1): the in-window holder outranks the
      // early-checked holder above — the box belongs to the
      // item whose window is NOW. A completed item standing
      // inside its own window (start ≤ now < its window
      // end) takes the box struck even when an early-checked
      // item also qualifies; among the in-window finished,
      // the latest start wins, the running pick's own
      // tie-break. No successor condition: a successor that
      // has started is either running (and outranks this
      // outright), current (it keeps its own row above the
      // box), or itself in-window finished with a later
      // start (and so holds instead). A running event still
      // outranks both candidacies.
      if (runningIdx == null) {
        val inWindowIdx = dayItems.indices
          .filter { dayItems[it].completed && dayItems[it].startMinutes <= nowMin && nowMin < winEnd(dayItems[it]) }
          .sortedByDescending { dayItems[it].startMinutes }
          .firstOrNull()
        if (inWindowIdx != null) struckIdx = inWindowIdx
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
      // v455 (fix 2): the item that waits directly under a
      // struck box — the first item after the holder in the
      // day's order that is not already seated and is not
      // itself over (an over item keeps its last-pick
      // eligibility instead). The current row keeps its own
      // seat above the box, so it is skipped here. The item
      // may itself be finished — Write, checked early,
      // waiting behind Feed Aaron in the box — and seats
      // under the box struck rather than vanishing.
      val underIdx = if (struckIdx != null) {
        val holderPos = chronoIdx.indexOf(struckIdx)
        var found: Int? = null
        for (p in holderPos + 1 until chronoIdx.size) {
          val idx = chronoIdx[p]
          if (idx != currentIdx && overAt(dayItems[idx]) > nowMin) {
            found = idx
            break
          }
        }
        found
      } else {
        null
      }
      val underItem = underIdx?.let { dayItems[it] }
      // v455: the holder and the under-box item join the
      // chosen set. An in-window TODO holder's overAt is its
      // start — already past — so without the holder here
      // the last pick below would seat it a second time; the
      // under-box item is excluded for the same reason.
      val chosenIdx = setOfNotNull(currentIdx, runningIdx, next1Idx, afterIdx, struckIdx, underIdx)
      var lastIdx = dayItems.indices
        .filter { it !in chosenIdx && overAt(dayItems[it]) <= nowMin }
        .sortedWith(compareByDescending<Int> { overAt(dayItems[it]) }.thenByDescending { dayItems[it].startMinutes })
        .firstOrNull()
      // v455 (fix 3): no vanishing. A finished item that
      // lost the box to the struck holder — the earlier of
      // two overlapping in-window finishes, the earlier of
      // two checked early in a row — still seats, as the
      // last row, struck, even though its window has not
      // fully passed. The rescue candidate is the nearest
      // finished item before the holder in the day's order
      // that appears nowhere else; it takes the seat when
      // the passed pick above found nothing, or when it
      // stands nearer the holder than that pick does.
      // Passed items keep the seat in every other case —
      // their eligibility above is v454's, unchanged.
      // v471: the rescue runs inside the last row's gate —
      // the seat above the box belongs to an item whose
      // time has actually come, so the walk steps past a
      // finished item whose window has not started (the
      // earlier of two checked early in a row, on his
      // Sunday) and rescues only a finished item behind
      // now. The gate is the one test, startMinutes > now.
      if (struckIdx != null) {
        val holderPos = chronoIdx.indexOf(struckIdx)
        var rescueIdx: Int? = null
        for (p in holderPos - 1 downTo 0) {
          val idx = chronoIdx[p]
          if (dayItems[idx].startMinutes > nowMin) continue
          if (dayItems[idx].completed && idx != lastIdx && idx != underIdx) {
            rescueIdx = idx
            break
          }
        }
        if (rescueIdx != null) {
          val rescuePos = chronoIdx.indexOf(rescueIdx)
          val ordinaryPos = lastIdx?.let { chronoIdx.indexOf(it) } ?: -1
          if (rescuePos > ordinaryPos) lastIdx = rescueIdx
        }
      }
      val lastRow = lastIdx?.let {
        val item = dayItems[it]
        RailRow(if (item.completed) "done" else "past", minutesToTimeLabel(item.startMinutes), item.title, item.sub, 0, "")
      }
      // v466 (Fix 1): the struck candidacy above blends two
      // species — the item checked off INSIDE its window
      // (the v455 holder: its window contains now) and the
      // item checked off EARLY, whose window has not started
      // (startMinutes > now). They are told apart here, by
      // that one test: an item whose window has opened is
      // never the early species (the in-window override has
      // already claimed any finished item standing inside
      // its window). The under pick, the chosen set, the
      // last pick and its rescue above all ran on the
      // blended candidacy exactly as v454/v455 built them —
      // the species split decides only who holds the BOX,
      // in the priority restated at the hero below: running
      // → in-window struck → the white space he is standing
      // in → early-checked struck → the next up. (His words,
      // Sat Nov 7, 8:35 AM, standing in open time before a
      // 9:00 AM Rest he had checked off early: "Well
      // wouldn't right now be open time?")
      val earlyIdx: Int? =
        if (struckIdx != null && dayItems[struckIdx].startMinutes > nowMin) struckIdx else null
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
      // v466 (Fix 1): the stretch is measured to the first
      // boundary that closes it — the early-checked item's
      // start when one stands (at its window the box hands
      // over to it, struck in-window, so the open time ends
      // there, not at the next standing item), otherwise
      // the next up's start, exactly as v454 measured it.
      // v471: "the early-checked item" is the FIRST one.
      // With two checked early in a row, v466's boundary
      // (the struck holder — the LATER of the two) left
      // the box measuring to Gardening's 6:00 PM start and
      // naming the 30 minutes before it, while the open
      // morning he stood in ran to Duolingo's 5:00 PM.
      // The boundary is read literally now: the first
      // item in the day's order whose window has not
      // opened. On every day v466 knew it is the same
      // item its expression named — the lone early item,
      // or the next up when nothing stands earlier (the
      // next up is then the first unopened window by
      // construction, so the fallback never fires).
      val openBoundaryIdx = chronoIdx.firstOrNull { dayItems[it].startMinutes > nowMin } ?: next1Idx
      // v471: the early chain — every finished item from
      // the boundary up to the next standing item, in the
      // day's order. (The candidacy's range exactly: any
      // uncompleted item in it would be the next up and
      // end the range, so the filter is a formality.) The
      // white box stands over the whole chain: its head
      // closes the stretch (the boundary above) and the
      // items seat under the box in their own places —
      // the branch below reads the head for the next row
      // and the second item for the after seat. In every
      // v466 fixture the chain is the holder alone.
      val chainIdx: List<Int> = if (earlyIdx != null && openBoundaryIdx != null) {
        val boundaryPos = chronoIdx.indexOf(openBoundaryIdx)
        val anchorPos = next1Idx?.let { chronoIdx.indexOf(it) } ?: chronoIdx.size
        (boundaryPos until anchorPos).map { chronoIdx[it] }.filter { dayItems[it].completed }
      } else {
        emptyList()
      }
      var openMinutes = 0
      if (currentIdx == null && openBoundaryIdx != null) {
        val prevEnd = lastIdx?.let { overAt(dayItems[it]) } ?: nowMin
        openMinutes = dayItems[openBoundaryIdx].startMinutes - maxOf(nowMin, prevEnd)
      }
      // v466 (Fix 1): when the stretch stands (≥ 15) the
      // white box outranks the early-checked species — the
      // candidacy yields here, before the v454 test below
      // reads it, so that test stands as written: with the
      // early item yielded, no struck holder owns the box
      // and the stretch becomes the box. Under 15 minutes
      // the yield never happens and the early-checked item
      // holds the box exactly as v454/v455 had it. (The
      // struckItem val above was materialised from the
      // blended candidacy; boxStruckItem, at the hero,
      // re-reads the box's holder after this yield.)
      if (openMinutes >= 15 && runningIdx == null && earlyIdx != null) {
        struckIdx = null
      }
      var heroWhite = false
      if (openMinutes >= 15) {
        heroWhite = runningIdx == null && struckIdx == null
      }
      val whiteRow = if (heroWhite && openBoundaryIdx != null) {
        RailRow("whitebox", nowTimeLabel(), "", "", dayItems[openBoundaryIdx].startMinutes, openDurationText(openMinutes))
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
      // v456: that stand-down is now every state's — the
      // selection draws no NOW row beside ANY box. boxIsNow
      // still names the two holders that ARE now and rides
      // to the selection as that record; it seats nothing
      // there any more.
      // v466 (Fix 1): the priority is restated — running
      // event → in-window struck → the white space → the
      // early-checked struck → the next up. The v454 order
      // (struck holder, then white space) survives only
      // inside the struck species: an in-window holder
      // still outranks the white space, an early-checked
      // one no longer does.
      val heroRunning = runningIdx != null
      val boxIsNow = heroRunning || heroWhite
      // v466 (Fix 1): the box's struck holder, read after
      // the yield above — while the white box stands over an
      // early-checked item, no struck item holds the box
      // (the early item seats under it instead, in the white
      // branch below); in every other state this is the
      // struckItem the candidacy produced. (When heroWhite
      // stands, struckItem can only be the early species or
      // nothing — an in-window holder vetoes the white box
      // in the yield's own terms.)
      val boxStruckItem = if (heroWhite) null else struckItem
      val heroRow = if (runningIdx != null) {
        val item = dayItems[runningIdx]
        RailRow("hero", minutesToTimeLabel(item.startMinutes), item.title, item.sub, item.endMinutes, "", heroLeft = true)
      } else if (boxStruckItem != null) {
        RailRow("heroDone", minutesToTimeLabel(boxStruckItem.startMinutes), boxStruckItem.title, boxStruckItem.sub, 0, "")
      } else if (whiteRow != null) {
        whiteRow
      } else {
        next1Idx?.let {
          val item = dayItems[it]
          RailRow("hero", minutesToTimeLabel(item.startMinutes), item.title, item.sub, item.startMinutes, "")
        }
      }
      // The after seat, read once — the branches below and
      // the extension walk both take it from here. For every
      // box but the struck one it is the after item itself;
      // under a struck box the under row can take a finished
      // successor instead of the first standing item, and
      // then that standing item is the after seat (v455).
      // v466 (Fix 1): while the white box stands over an
      // early-checked item, the seat is the next standing
      // item itself — it seats as the after row (the early
      // item rides the next row, struck), and the walk
      // starts past it like any other after seat.
      // v471: when the early chain has a second item, IT
      // takes the after seat (struck, in its own place)
      // and the next standing item falls to the extension
      // walk, which seeds from this seat — not an ahead
      // item, so the walk reads it at position −1 and
      // starts from the head of the ahead list, its
      // preceding stretch measured from this seat's end.
      val afterSeatIdx = if (boxStruckItem != null) {
        aheadIdx.firstOrNull { it != underIdx }
      } else if (heroWhite && earlyIdx != null) {
        chainIdx.getOrNull(1) ?: next1Idx
      } else {
        afterIdx
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
          // v466 (Fix 2): the core's gap candidates are the
          // open stretches between consecutive seated core
          // rows downstream of the box, in chronological
          // order — box→next above, then next→after here.
          // The first qualifying stretch takes the core's
          // single gap slot; this one displays below the
          // next row (gapBelowNext), where its stretch sits.
          if (gapRow == null && afterIdx != null) {
            val afterGapMinutes = dayItems[afterIdx].startMinutes - next1.endMinutes
            if (afterGapMinutes >= 15) {
              gapRow = RailRow("gap", "", "", "", 0, openDurationText(afterGapMinutes), gapBelowNext = true)
            }
          }
        }
        if (afterIdx != null) {
          val after = dayItems[afterIdx]
          afterRow = RailRow("item", minutesToTimeLabel(after.startMinutes), after.title, after.sub, after.startMinutes, "")
        }
      } else if (boxStruckItem != null) {
        // v454 (Ruling 1): what's coming up waits directly
        // under the struck box, then the after row — and the
        // gap candidate is the open stretch between the
        // holder's end and that item's start (≥ 15 minutes),
        // seated under the box in rail order, downstream of
        // the box as Ruling 2 requires. (His composition
        // check: Dinner, 8–9 PM, checked off at 8:30 with
        // the next item at 10 — struck Dinner in the box, the
        // 9-to-10 white box under it, then the 10 PM row.)
        // v455 (fix 2): the row under the box is the holder's
        // successor in the day (underItem), not necessarily
        // the next standing item — when the successor is
        // itself finished it seats in the done dress, struck
        // through (Write under Feed Aaron); the after row is
        // the after seat, the first standing item the under
        // row did not take. The gap runs from the holder's
        // WINDOW end: for a todo holder that is its +30 end,
        // not its start, so the stretch it names is the open
        // time after the holder's window actually closes.
        if (underItem != null) {
          nextRow = RailRow(
            if (underItem.completed) "done" else "item",
            minutesToTimeLabel(underItem.startMinutes), underItem.title, underItem.sub, underItem.startMinutes, "",
          )
          val struckGapMinutes = underItem.startMinutes - winEnd(boxStruckItem)
          if (struckGapMinutes >= 15) {
            gapRow = RailRow("gap", "", "", "", 0, openDurationText(struckGapMinutes))
          }
          // v466 (Fix 2): the second stretch — the under
          // row's end to the after seat's start. On the
          // ruling render (Sat Nov 7: Rest struck in the
          // box, Brush Teeth under it done at 10:00,
          // Gardening at 4:00 PM) this is the six open
          // hours that had no white block: the struck
          // branch's only candidate was holder→successor,
          // and that stretch is negative there.
          if (gapRow == null && afterSeatIdx != null) {
            val afterItem = dayItems[afterSeatIdx]
            val underGapMinutes = afterItem.startMinutes - underItem.endMinutes
            if (underGapMinutes >= 15) {
              gapRow = RailRow("gap", "", "", "", 0, openDurationText(underGapMinutes), gapBelowNext = true)
            }
          }
        }
        if (afterSeatIdx != null) {
          val after = dayItems[afterSeatIdx]
          afterRow = RailRow("item", minutesToTimeLabel(after.startMinutes), after.title, after.sub, after.startMinutes, "")
        }
      } else if (heroWhite) {
        if (earlyIdx != null) {
          // v466 (Fix 1): the white box stands over an
          // early-checked item — the item seats directly
          // under the box in the done dress, struck, ahead
          // of the standing rows (it is the would-be next
          // thing in the day's order; the candidacy anchored
          // it before the next standing item). The standing
          // next item takes the after row. At the item's
          // window the box hands over to it as the in-window
          // struck holder, exactly as v455 built.
          // v471: the item under the box is the chain's
          // HEAD — the first early-checked item, the one
          // whose start closes the box's stretch — and the
          // after seat is the chain's second item when the
          // chain has one (the holder itself, struck in its
          // own place), the standing next item otherwise,
          // read from the after seat so the extension walk
          // and this branch never disagree. The gap
          // candidate runs from the head's end to the after
          // seat's start: on his Sunday that is the 30
          // minutes between Duolingo and Gardening, a gap
          // box between their rows — never the hero box,
          // while he stands in open time earlier in the day.
          val early = dayItems[chainIdx.first()]
          nextRow = RailRow("done", minutesToTimeLabel(early.startMinutes), early.title, early.sub, early.startMinutes, "")
          if (afterSeatIdx != null) {
            val after = dayItems[afterSeatIdx]
            afterRow = RailRow(
              if (after.completed) "done" else "item",
              minutesToTimeLabel(after.startMinutes), after.title, after.sub, after.startMinutes, "",
            )
            // v466 (Fix 2): the stretch between the early
            // item's end and the after row's start is this
            // branch's next→after candidate — negative on
            // the ruling render (Rest ends 10:00, Brush
            // Teeth starts 9:30), real when the early item
            // closes before the next thing begins.
            val earlyGapMinutes = after.startMinutes - early.endMinutes
            if (earlyGapMinutes >= 15) {
              gapRow = RailRow("gap", "", "", "", 0, openDurationText(earlyGapMinutes), gapBelowNext = true)
            }
          }
        } else {
          // v454 (Ruling 2): the next item sits directly
          // under the white box and the after row under it —
          // and there is no gap row from the box itself: the
          // open stretch is the box, and its box→next
          // stretch is zero by construction (the box ends
          // where the next item starts). v466 (Fix 2): the
          // next→after stretch is a candidate here like
          // every other branch's.
          if (next1Idx != null) {
            val next1 = dayItems[next1Idx]
            nextRow = RailRow("item", minutesToTimeLabel(next1.startMinutes), next1.title, next1.sub, next1.startMinutes, "")
            if (afterIdx != null) {
              val whiteGapMinutes = dayItems[afterIdx].startMinutes - next1.endMinutes
              if (whiteGapMinutes >= 15) {
                gapRow = RailRow("gap", "", "", "", 0, openDurationText(whiteGapMinutes), gapBelowNext = true)
              }
            }
          }
          if (afterIdx != null) {
            val after = dayItems[afterIdx]
            afterRow = RailRow("item", minutesToTimeLabel(after.startMinutes), after.title, after.sub, after.startMinutes, "")
          }
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
      // v455: the walk seeds from the after SEAT (above),
      // not from a fixed position — under a struck box the
      // core can seat the first standing item as its after
      // row, and the walk must start past it, not past the
      // second standing item. For every other box the seat
      // is the after item and the walk is v453's exactly.
      val extensionRows = mutableListOf<RailRow>()
      if (afterSeatIdx != null) {
        var prevEnd = dayItems[afterSeatIdx].endMinutes
        for (k in aheadIdx.indexOf(afterSeatIdx) + 1 until aheadIdx.size) {
          val item = dayItems[aheadIdx[k]]
          val extGapMinutes = item.startMinutes - prevEnd
          if (extGapMinutes >= 15) {
            extensionRows.add(RailRow("gap", "", "", "", 0, openDurationText(extGapMinutes)))
          }
          extensionRows.add(RailRow("item", minutesToTimeLabel(item.startMinutes), item.title, item.sub, item.startMinutes, ""))
          prevEnd = item.endMinutes
        }
      }
      // v466 (Fix 3): the trailing white block — on a
      // sparse day at a tall placement the rail otherwise
      // ends early and the card stands half blank (his
      // standing complaint about empty space, Sat Nov 7:
      // three rows seated, the rest of the card empty).
      // When the candidate chain — core seats plus the
      // extension walk — reaches the day's LAST standing
      // item, the stretch from that item's end to midnight
      // (1440, the schedule's day-window edge) is a final
      // extension candidate, priced like every gap and
      // seated whole-or-nothing from whatever budget
      // remains after everything else. Because it rides
      // last in the extension list, the walk's
      // stop-at-the-first-hole discipline carries the
      // absences with it: if an item ahead of it does not
      // seat (budget or the nine-slot cap), the block
      // behind it never seats either — a to-midnight block
      // over unseated items would be a lie — and if the
      // day's last seated element is itself a gap whose
      // item didn't fit, the walk has already stopped
      // before reaching this far. The chain's end is read
      // per arrangement: past an after seat the walk covers
      // the ahead list to its end; with no standing items
      // at all the box's own holder is the day's last item
      // (its window end for a struck holder, its end for a
      // running event); otherwise the core's standing seats
      // must be the whole ahead list — the under row under
      // a struck box, or the next up everywhere else.
      val boxHolderIdx = runningIdx ?: struckIdx
      val chainLastIdx: Int? = when {
        afterSeatIdx != null -> aheadIdx.lastOrNull()
        aheadIdx.isEmpty() -> boxHolderIdx ?: earlyIdx
        boxStruckItem != null -> if (aheadIdx.all { it == underIdx }) underIdx else null
        else -> if (aheadIdx.all { it == next1Idx }) next1Idx else null
      }
      val chainEndMinutes = chainLastIdx?.let { idx ->
        val item = dayItems[idx]
        if (idx == boxHolderIdx && runningIdx == null) winEnd(item) else item.endMinutes
      }
      if (chainEndMinutes != null && 1440 - chainEndMinutes >= 15) {
        extensionRows.add(RailRow("gap", "", "", "", 0, openDurationText(1440 - chainEndMinutes)))
      }
      leftCount = aheadIdx.size
      rows = selectRailRows(lastRow, currentRow, heroRow, gapRow, afterRow, nextRow, boxIsNow, extensionRows, heightSignal)
      // v464: an empty selection on this fresh snapshot is
      // this path's quiet face — the day-done turn's second
      // door (the day spent under a "next" snapshot: every
      // item checked off or past, nothing seated).
      if (rows.isEmpty() && renderUpNextTomorrow(context, views, snap, pal, heightSignal)) return views
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
        // v464: the fallback's quiet face is the turn's third
        // door — it is also where a FRESH snapshot lands when
        // today holds no timed items at all (an empty dayItems
        // never enters the recompute), and an empty today is
        // spent by construction. A stale snapshot's turn
        // declines on its freshness gates, as always.
        if (renderUpNextTomorrow(context, views, snap, pal, heightSignal)) return views
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

  /** v464: the device's tomorrow, "yyyy-MM-dd" — deviceDateIso's
   * shape, one day on. */
  private fun deviceTomorrowIso(): String {
    val cal = Calendar.getInstance()
    cal.add(Calendar.DAY_OF_YEAR, 1)
    return String.format(
      Locale.US,
      "%04d-%02d-%02d",
      cal.get(Calendar.YEAR),
      cal.get(Calendar.MONTH) + 1,
      cal.get(Calendar.DAY_OF_MONTH),
    )
  }

  /** v464: tomorrow's short chip label — "SAT 7". */
  private fun tomorrowChipLabel(): String {
    val cal = Calendar.getInstance()
    cal.add(Calendar.DAY_OF_YEAR, 1)
    val dow = cal.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.SHORT, Locale.US) ?: ""
    return "${dow.uppercase(Locale.US)} ${cal.get(Calendar.DAY_OF_MONTH)}"
  }

  private val T5_FACE_SLOTS = intArrayOf(R.id.nx_t5_face_slot_1, R.id.nx_t5_face_slot_2, R.id.nx_t5_face_slot_3)
  private val T5_RINGS = intArrayOf(R.id.nx_t5_ring_1, R.id.nx_t5_ring_2, R.id.nx_t5_ring_3)
  private val T5_IMGS = intArrayOf(R.id.nx_t5_face_1, R.id.nx_t5_face_2, R.id.nx_t5_face_3)
  private val T5_TEXTS = intArrayOf(R.id.nx_t5_face_text_1, R.id.nx_t5_face_text_2, R.id.nx_t5_face_text_3)

  // v464: the day-done turn's honest row costs, priced from the
  // layouts the v457 way — a padded two-line item row stands
  // 36 (the rail's own plain-row cost), a gap box 33 (the
  // rail's gap cost), the study rows 34 (30dp tile + padding),
  // the prayers row 56 (the Daily Breakdown face slot's 44dp +
  // its padding), the closed line 44 (26dp disc + the header's
  // margins around it), the fast foot 31 (hairline + one line).
  private val T5_COST_CLOSED = 44
  private val T5_COST_ROW = 36
  private val T5_COST_GAP = 33
  private val T5_COST_STUDY = 34
  private val T5_COST_PRAY = 56
  private val T5_COST_FAST = 31

  /** v464: every Up Next render starts from the standing face —
   * the turn's views hidden, the kicker back to TODAY — because
   * RemoteViews reuses the placed hierarchy across renders: a
   * T5 render followed by a normal one would otherwise keep
   * the flipped header and the turn's rows standing. The turn
   * re-seats what it shows. */
  private fun hideUpNextTomorrow(views: RemoteViews) {
    views.setTextViewText(R.id.next_kicker, "UP NEXT · TODAY")
    views.setViewVisibility(R.id.nx_t5_closed, View.GONE)
    views.setViewVisibility(R.id.nx_t5_study1, View.GONE)
    views.setViewVisibility(R.id.nx_t5_study2, View.GONE)
    views.setViewVisibility(R.id.nx_t5_pray, View.GONE)
    views.setViewVisibility(R.id.nx_t5_fastwrap, View.GONE)
  }

  /** v464 (UN-T5, "Tomorrow, Whole" — Jonathan's pick, Nov 6):
   * the Up Next day-done turn. His words on the standing face
   * at 10:20 PM — a huge white card saying only "Nothing left
   * today": "This looks sad when it's empty... Can it change
   * into something else?" When today is spent and the core
   * selection would otherwise show that quiet face, the card
   * turns to tomorrow instead: the header flips, one closed
   * line receipts today, tomorrow's rail seats in day order
   * with its own white gap boxes, then the Study rows,
   * tomorrow's prayers, and the fast foot.
   *
   * Called ONLY from the standing quiet face's exits; returns
   * false — having painted nothing — when any gate declines,
   * and the caller paints the standing face exactly as before.
   * The gates are the Daily Breakdown evening pattern: the
   * snapshot must describe the device's today, its tomorrow
   * must be the device's tomorrow (a day-old snapshot never
   * turns on stale tomorrow data), and today must be spent —
   * every item completed or its window end passed (the baked
   * endMinutes convention: end > start ? end : start; a today
   * with no items is spent by construction). Seating runs
   * under the v457 budget (heightSignal − 64 − 20) at the
   * honest costs above, in composition order, whole or not at
   * all, stopping at the first element that doesn't fit; the
   * fast foot is attempted last against what remains (the
   * breakdown's anchor exception). The fixed core rules do
   * NOT apply here — this face seats in order. */
  private fun renderUpNextTomorrow(
    context: Context,
    views: RemoteViews,
    snap: JSONObject,
    pal: WidgetPalette,
    heightSignal: Int,
  ): Boolean {
    if (snap.optString("dateIso") != deviceDateIso()) return false
    if (snap.optString("tomorrowDateIso") != deviceTomorrowIso()) return false
    val nowMin = nowMinutes()
    val todayArr = snap.optJSONArray("dayItems") ?: return false
    for (i in 0 until todayArr.length()) {
      val item = todayArr.optJSONObject(i) ?: continue
      val start = item.optInt("startMinutes")
      val end = item.optInt("endMinutes")
      val winEnd = if (end > start) end else start
      if (!item.optBoolean("completed") && winEnd > nowMin) return false
    }
    val tomorrowArr = snap.optJSONArray("tomorrowItems") ?: return false
    val tomorrow = mutableListOf<DayItem>()
    for (i in 0 until tomorrowArr.length()) {
      val d = tomorrowArr.optJSONObject(i) ?: continue
      tomorrow.add(
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
    // Day order — the sort is stable, so ties keep the
    // snapshot's own order.
    tomorrow.sortBy { it.startMinutes }
    // The element walk: items in day order, each ≥15-minute
    // open stretch before an item (measured from the previous
    // item's end, the rail's own between-items rule) a white
    // gap box in order ahead of it.
    val elems = mutableListOf<RailRow>()
    var prevEnd: Int? = null
    for (item in tomorrow) {
      val pe = prevEnd
      if (pe != null && item.startMinutes - pe >= 15) {
        elems.add(RailRow("gap", "", "", "", 0, openDurationText(item.startMinutes - pe)))
      }
      elems.add(RailRow("item", minutesToTimeLabel(item.startMinutes), item.title, item.sub, item.startMinutes, ""))
      prevEnd = maxOf(pe ?: item.endMinutes, item.endMinutes)
    }
    // ── Seating, priced before anything is painted: if the
    // whole face would stand empty, decline and let the
    // standing quiet face render. ──
    var remaining = heightSignal - 64 - 20
    val closed = if (snap.isNull("closedToday")) null else snap.optJSONObject("closedToday")
    val closedSeated = closed != null && T5_COST_CLOSED <= remaining
    if (closedSeated) remaining -= T5_COST_CLOSED
    var elemSeated = 0
    while (elemSeated < elems.size && elemSeated < 9) {
      val cost = if (elems[elemSeated].kind == "gap") T5_COST_GAP else T5_COST_ROW
      if (cost > remaining) break
      remaining -= cost
      elemSeated++
    }
    val study = if (snap.isNull("tomorrowStudy")) null else snap.optJSONObject("tomorrowStudy")
    val readingText = study?.optString("reading")?.takeIf { it.isNotBlank() }
    val writeText = study?.optString("writeNext")?.takeIf { it.isNotBlank() }
    val readingSeated = readingText != null && T5_COST_STUDY <= remaining
    if (readingSeated) remaining -= T5_COST_STUDY
    val writeSeated = writeText != null && T5_COST_STUDY <= remaining
    if (writeSeated) remaining -= T5_COST_STUDY
    val pray = if (snap.isNull("tomorrowPray")) null else snap.optJSONObject("tomorrowPray")
    val praySeated = pray != null && T5_COST_PRAY <= remaining
    if (praySeated) remaining -= T5_COST_PRAY
    val fast = if (snap.isNull("tomorrowFast")) null else snap.optJSONObject("tomorrowFast")
    val fastSeated = fast != null && T5_COST_FAST <= remaining
    if (!closedSeated && elemSeated == 0 && !readingSeated && !writeSeated && !praySeated && !fastSeated) {
      return false
    }
    // ── Paint: the header flips to tomorrow. ──
    views.setTextViewText(R.id.next_kicker, "UP NEXT · TOMORROW")
    views.setViewVisibility(R.id.next_chip, View.VISIBLE)
    views.setInt(R.id.next_chip_img, "setColorFilter", pal.chip)
    views.setTextViewText(R.id.next_left, tomorrowChipLabel())
    views.setTextColor(R.id.next_left, pal.onContainer)
    views.setViewVisibility(R.id.next_msg, View.GONE)
    // The closed line: the reached-green disc and check (the
    // green family is the palette's meaning hue; the disc is
    // the container, the check the green itself — drawn by
    // the checkBitmap factory like every rail check).
    if (closedSeated && closed != null) {
      views.setViewVisibility(R.id.nx_t5_closed, View.VISIBLE)
      views.setInt(R.id.nx_t5_closed_disc, "setColorFilter", pal.greenContainer)
      views.setImageViewBitmap(R.id.nx_t5_closed_check, checkBitmap(pal.green))
      val fastDay = if (closed.isNull("fastDay")) null else closed.optInt("fastDay")
      views.setTextViewText(
        R.id.nx_t5_closed_text,
        "Today closed — ${closed.optInt("done")} of ${closed.optInt("total")}" +
          (if (fastDay != null) " · fast day $fastDay kept" else ""),
      )
      views.setTextColor(R.id.nx_t5_closed_text, pal.ink)
    }
    // Tomorrow's rail, in the rail's own slots and dress.
    views.setViewVisibility(R.id.next_rail, View.VISIBLE)
    for (slot in 0 until 9) {
      val rowId = railId(context, "nx_row_${slot + 1}")
      if (slot >= elemSeated) {
        views.setViewVisibility(rowId, View.GONE)
        continue
      }
      fillRailSlot(context, views, slot + 1, elems[slot], slot == 0, slot == elemSeated - 1, pal)
    }
    // The Study rows.
    if (readingSeated && readingText != null) {
      fillT5StudyRow(
        views,
        R.id.nx_t5_study1, R.id.nx_t5_study1_tile, R.id.nx_t5_study1_glyph,
        R.id.nx_t5_study1_title, R.id.nx_t5_study1_sub,
        readingText, "to read", pal,
      )
    }
    if (writeSeated && writeText != null) {
      fillT5StudyRow(
        views,
        R.id.nx_t5_study2, R.id.nx_t5_study2_tile, R.id.nx_t5_study2_glyph,
        R.id.nx_t5_study2_title, R.id.nx_t5_study2_sub,
        writeText, "next to write", pal,
      )
    }
    // Tomorrow's prayers: the breakdown's face stack (the
    // emergency's person first, in the Emergency red the
    // snapshot's face colour already carries).
    if (praySeated && pray != null) {
      views.setViewVisibility(R.id.nx_t5_pray, View.VISIBLE)
      val faces = pray.optJSONArray("faces")
      val faceCount = faces?.length() ?: 0
      for (i in T5_FACE_SLOTS.indices) {
        val face = if (i < faceCount) faces?.optJSONObject(i) else null
        if (face != null) {
          views.setViewVisibility(T5_FACE_SLOTS[i], View.VISIBLE)
          // The ring is the card's own surface — it separates
          // the overlapping faces (the breakdown's idiom).
          views.setInt(T5_RINGS[i], "setColorFilter", pal.surface)
          applyFace(context, views, T5_IMGS[i], T5_TEXTS[i], face, pal.primary, 40)
        } else {
          views.setViewVisibility(T5_FACE_SLOTS[i], View.GONE)
        }
      }
      val count = pray.optInt("count")
      if (count > 3) {
        views.setViewVisibility(R.id.nx_t5_face_more, View.VISIBLE)
        views.setInt(R.id.nx_t5_face_more_img, "setColorFilter", pal.chip)
        views.setTextViewText(R.id.nx_t5_face_more_text, "+${count - 3}")
        views.setTextColor(R.id.nx_t5_face_more_text, pal.onContainer)
      } else {
        views.setViewVisibility(R.id.nx_t5_face_more, View.GONE)
      }
      views.setTextViewText(R.id.nx_t5_pray_title, "Tomorrow's prayers")
      views.setTextColor(R.id.nx_t5_pray_title, pal.ink)
      val lead = pray.optString("leadFirstName")
      views.setTextViewText(
        R.id.nx_t5_pray_sub,
        "$count · $lead leads" + (if (pray.optBoolean("leadEmergency")) " — emergency" else ""),
      )
      views.setTextColor(R.id.nx_t5_pray_sub, pal.body)
    }
    // The fast foot.
    if (fastSeated && fast != null) {
      views.setViewVisibility(R.id.nx_t5_fastwrap, View.VISIBLE)
      views.setInt(R.id.nx_t5_fastline, "setBackgroundColor", pal.track)
      views.setTextViewText(R.id.nx_t5_fast, "Your fast — day ${fast.optInt("dayNumber")} begins at sunrise")
      views.setTextColor(R.id.nx_t5_fast, pal.body)
    }
    return true
  }

  /** One T5 Study row: the seed tile with the white book glyph
   * (the Study widget's own glyph — white on a saturated tile
   * in every appearance), the line, and its quiet sub. */
  private fun fillT5StudyRow(
    views: RemoteViews,
    rowId: Int,
    tileId: Int,
    glyphId: Int,
    titleId: Int,
    subId: Int,
    text: String,
    sub: String,
    pal: WidgetPalette,
  ) {
    views.setViewVisibility(rowId, View.VISIBLE)
    views.setInt(tileId, "setColorFilter", pal.primary)
    views.setImageViewBitmap(glyphId, bookBitmap())
    views.setTextViewText(titleId, text)
    views.setTextColor(titleId, pal.ink)
    views.setTextViewText(subId, sub)
    views.setTextColor(subId, pal.muted)
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
   * v456: the NOW marker row is REMOVED — in every state
   * (Jonathan, on the v455 render: "That little 'now'
   * thing is stupid! Shouldn't the box be NOW? ... That
   * way it shows what is before, and what is coming after
   * what is currently in the box!"). The box IS now: no
   * separate NOW row stands beside a running box, a struck
   * box, the white box, or a next-up box, so the step list
   * loses both NOW steps — (2) is the current row alone,
   * always chosen when present, and there is no trailing
   * step (6) — and the display order loses the NOW add:
   * last, current, hero, gap, next, after. The 30 the NOW
   * row cost returns to the budget pool; every other cost
   * and rule (whole or not at all, the gap last, the
   * extension behind the after gate, the nine-slot cap)
   * is unchanged. boxIsNow stays in the signature — both
   * paths still hand it over, and it still names which
   * holders ARE now — but it seats nothing: there is no
   * NOW row left for it to stand down. The box's rail dot
   * carries the filled blue now dot instead (fillRailSlot).
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
   * padding plus margins stand ≈ 33 tall).
   * v457: the costs themselves were the lie (Jonathan,
   * Nov 6, on the v455 TALL render: the last extension
   * row — 1:30 PM, a ministry titled "Edit" — painted its
   * time label and its rail dot but NO title; he confirmed
   * the title is missing on his screen, not just in the
   * screenshot: "There's not a lot of space down there").
   * The fill sets every seated row's title and the nine
   * slots are perfect stamps of one another (both
   * verified), and the snapshot parses every title the
   * same way — the row was seated by a budget that swore
   * it fit, and the card's real bottom took the title.
   * v456's render confirmed the mechanism from the other
   * side (Nov 6, 12:01 PM): with the NOW row gone and
   * its 30 freed, the rail seated one row MORE — Edit
   * painted WITH its title — and a third 2:00 PM row at
   * the very bottom lost its title instead. The error
   * is cumulative; it always lands on the last seated
   * row, whatever composition sits above it.
   * The old figures priced a line of text at ≈1.2× its
   * size; a line on Android measures its font's padded
   * line box, ≈1.36× for Roboto, and the device had
   * already testified to the difference — v449's seated
   * row sliced at 232 with the ledger showing room to
   * spare, and the signal has overestimated the placed
   * height three rounds running. So the costs are now
   * the layout's own, measured honestly from
   * widget_up_next.xml: a plain row is its line padding
   * (8 + 8) plus the 14.5sp title's line box (20) = 36;
   * the hero band is its padding (10 + 10) plus the
   * 20sp title's line box (28) plus the 13sp sub's (18)
   * = 66 (the white box's band is shorter in truth — no
   * sub, a 14.5sp title — but the box keeps the one
   * cost, which only ever over-charges it); a gap row
   * is its text's line box (12.5sp → 17) plus the
   * in-box padding (6 + 6) plus its margins (2 + 2)
   * = 33. The chrome allowance is honest too: 64 = the
   * card's padding (16 + 16) + the header at its
   * tallest (the LEFT chip stands: its 12sp line box
   * 17 + its 4 + 4 padding = 25, in place of the
   * kicker's 15) + the rail's top margin (6) + 1 of
   * rounding. And the safety margin grows 16 → 20 —
   * the bottom buffer, absorbing what the ledger still
   * cannot see (per-view dp→px rounding across up to
   * nine rows, density and font growth, the signal's
   * remaining optimism), so a row is seated only when
   * it fits WHOLE inside the card with room to paint,
   * and otherwise drops whole — his standing law since
   * v450. The composition, the priorities, the gates
   * and the nine-slot cap are untouched; at his
   * standard 232 the seatings are v456's exactly. */
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
    val railBudget = heightSignal - 64 - 20
    var remaining = railBudget
    var lastChosen = false
    var currentChosen = false
    var heroChosen = false
    var afterChosen = false
    var nextChosen = false
    var gapChosen = false
    // ── Item rows first, in priority order. ──
    // (1) hero — always chosen.
    if (hero != null) {
      heroChosen = true
      remaining -= 66
    }
    // (2) current — always chosen when present. v456:
    // no NOW row seats in its place any more (the box is
    // the now marker), and nothing stands at this step
    // when nothing is current.
    if (current != null) {
      currentChosen = true
      remaining -= 36
    }
    // (3) last — when it fits.
    if (last != null && 36 <= remaining) {
      lastChosen = true
      remaining -= 36
    }
    // (4) next — v451: the item directly under the box
    // (a running event's box in v451; the struck holder's
    // and the white box's in v454), when it fits. (Null in
    // the v450 arrangement, where the hero itself is the
    // next up.)
    if (next != null && 36 <= remaining) {
      nextChosen = true
      remaining -= 36
    }
    // (5) after — when it fits.
    if (after != null && 36 <= remaining) {
      afterChosen = true
      remaining -= 36
    }
    // (No step (6): the trailing NOW row that used to seat
    // here when a current exists is gone — v456, the box
    // is now.)
    // ── The gap row last: only what the item rows left
    // over, whole or not at all. v454: the under-box gap
    // is the ONLY gap candidate — no gap stands before
    // the box any more (Ruling 2). ──
    if (gap != null && 33 <= remaining) {
      gapChosen = true
      remaining -= 33
    }
    val display = mutableListOf<RailRow>()
    if (lastChosen && last != null) display.add(last)
    if (currentChosen && current != null) display.add(current)
    if (heroChosen && hero != null) display.add(hero)
    // v466 (Fix 2): the gap displays where its stretch
    // sits — a box→next gap directly under the box (the
    // standing place), a next→after gap below the next
    // row. When the next row itself did not seat, a
    // below-next gap falls back to the standing place
    // rather than floating past the after row.
    if (gapChosen && gap != null && (!gap.gapBelowNext || !nextChosen)) display.add(gap)
    if (nextChosen && next != null) display.add(next)
    if (gapChosen && gap != null && gap.gapBelowNext && nextChosen) display.add(gap)
    if (afterChosen && after != null) display.add(after)
    // ── v453: the tall extension — the rest of the day,
    // walked from the core's leftover, only once the whole
    // core stands. Strict rail order, whole or not at all,
    // stop at the first element that does not fit; the
    // rail's nine slots cap the walk as well. ──
    // v466 (Fix 3): the gate is the core standing whole —
    // an after row that was seated, or no after row in the
    // composition at all (the core is then trivially
    // whole, and the only extension candidate that can
    // exist is the trailing block, which must still be
    // allowed to seat). An after row that exists but did
    // not fit keeps the gate shut, exactly as v453 left it.
    if (afterChosen || after == null) {
      for (row in extension) {
        if (display.size >= 9) break
        val cost = if (row.kind == "gap") 33 else 36
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
    // v458: the dropped half is INVISIBLE, never GONE — the two
    // segments are the weighted (0dp, weight 1) pair around the
    // fixed 20dp dot cell in the slot's rail column, and their
    // even split of the leftover height is what centres the dot
    // on the row's text line. A GONE segment is excluded from
    // the column's measure entirely, so the surviving segment
    // took the whole leftover and pushed the end rows' dots to
    // the row's edge (the last row's dot sat ~8dp low on his
    // phone, Nov 6). INVISIBLE keeps the share; the line just
    // doesn't draw.
    views.setInt(id("seg_top"), "setColorFilter", pal.track)
    views.setViewVisibility(id("seg_top"), if (isFirst) View.INVISIBLE else View.VISIBLE)
    views.setInt(id("seg_bot"), "setColorFilter", pal.track)
    views.setViewVisibility(id("seg_bot"), if (isLast) View.INVISIBLE else View.VISIBLE)
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
      "current" -> {
        // The thing running right now (v445): a plain item's
        // dress, except its rail dot wears the NOW ring. The
        // separate NOW marker row that used to seat after
        // this row is gone (v456 — the box is now); this
        // branch still never stands the trailing nx_now
        // label up (v444's stray-line lesson).
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
        // v456: the box IS now — the filled blue now dot
        // (the ring + primary dot the removed NOW row used
        // to wear; the dot above already stands primary)
        // rides the box's rail position.
        views.setViewVisibility(id("ring"), View.VISIBLE)
        views.setInt(id("ring"), "setColorFilter", pal.container)
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
        // v456: the box IS now even while a finished item
        // holds it — the rail dot is the filled blue now
        // dot (ring + primary), not the done family's
        // green; the done dress lives inside the band.
        views.setViewVisibility(id("ring"), View.VISIBLE)
        views.setInt(id("ring"), "setColorFilter", pal.container)
        views.setInt(id("dot"), "setColorFilter", pal.primary)
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
        // wording is a sentence, not a name. The pill
        // counts down to the next item (its start rides the
        // row's startMinutes slot) in the hero pill's IN
        // voice, and there is no sub: the stretch is the
        // whole content.
        // v456: the box IS now, so its rail dot is the
        // filled blue now dot (ring + primary) — the small
        // softened dot it wore as a gap-family member is
        // gone. (The slot reset has already stood the dot
        // up and the small dot down.)
        views.setTextColor(id("time"), pal.muted)
        views.setViewVisibility(id("ring"), View.VISIBLE)
        views.setInt(id("ring"), "setColorFilter", pal.container)
        views.setInt(id("dot"), "setColorFilter", pal.primary)
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

  // ─── 12. Daily Breakdown (v462, DB-9 — the Brief List) ────────────────────
  //
  // One card, an open list of rows — PRAY (a face stack), REACH
  // (present only when someone is due), SCHEDULE (a clock glyph
  // in a tonal square), FAST (a flame glyph in a tonal square) —
  // hairlines between seated rows, no inner boxes, every row its
  // own door (request codes 1200–1204). The garden row's seat
  // stays empty between SCHEDULE and FAST until a weather feed
  // lands; there is no garden row in this build.
  //
  // The EVENING turn (the companion drawing, "After the Day
  // Ends") is computed HERE, at render time, from the snapshot's
  // dayItems and the device clock — the Up Next pattern: when
  // every item's effective window has passed, PRAY and REACH
  // drop and the SCHEDULE row names tomorrow's first thing. The
  // turn is trusted only when the snapshot's schedule dateIso is
  // the device's today; a stale snapshot renders its standing
  // rows instead of turning (the Up Next fallback grain).
  //
  // v470 (DB-T3, "Mini Rail" — the tall-fill round's third
  // card, his pick): at a TALL placement the four rows leave
  // the card's bottom half standing empty, so the schedule
  // section grows a mini rail under its row — the rest of
  // today as stops on a line, a pale gap box for an open
  // stretch of 15 minutes or more — and a TOMORROW row seats
  // below FAST. Both are extras: they seat whole or not at
  // all from the budget the core rows leave, the rail's walk
  // reserving the fast anchor's own cost so an extra never
  // eats a core row, and at the 4x3 budget neither seats at
  // all — the widget is v462's exactly. While at least one
  // rail stop stands, the schedule header wears the drawing's
  // second dress ("Today, from here", the reading line
  // alone); with no stop seated it keeps the v462 dress
  // byte-for-byte. The rail and the Tomorrow row stand only
  // on today's own snapshot and never under the evening turn
  // (the schedule row already IS tomorrow then).
  //
  // v478 (the weather header): the card gains a header at its
  // very top, above PRAY — the morning pack's weather, At a
  // Glance style, the way his home screen's Google line reads:
  // the current temp by day, tomorrow's high/low from 18:00.
  // The feed is v472's store (prayercircle.weather.v1), carried
  // through the snapshot verbatim; the face is decided HERE
  // from the device clock (breakdownWeatherFace), with the
  // weather's own staleness rule — over 48 hours old, or
  // covering neither needed date, the header is absent whole.
  // The header stands outside the row walk: its cost
  // (DB_WEATHER_COST) is reserved off the budget before the
  // first row is tried, and the rows seat whole or not at all
  // in their standing order against what remains. It is not
  // the garden row — that seat, between SCHEDULE and FAST,
  // stays empty; a weather snapshot is not a garden feed.

  private val DB_SLOTS = intArrayOf(R.id.db_face_slot_1, R.id.db_face_slot_2, R.id.db_face_slot_3)
  private val DB_RINGS = intArrayOf(R.id.db_ring_1, R.id.db_ring_2, R.id.db_ring_3)
  private val DB_IMGS = intArrayOf(R.id.db_img_1, R.id.db_img_2, R.id.db_img_3)
  private val DB_TEXTS = intArrayOf(R.id.db_initials_1, R.id.db_initials_2, R.id.db_initials_3)

  /** One mini-rail element (v470): a STOP — an item of the
   * day, its title and its time line in `sub`, `isNow` set on
   * the first stop when its window holds the current minute —
   * or a GAP block, the open stretch between two stops, its
   * wording riding `sub`. */
  private data class DbRailElement(val isGap: Boolean, val title: String, val sub: String, val isNow: Boolean)

  /** v478: one weather face — the composed line and the
   * glyph kind that stands beside it (weatherGlyphKind's
   * vocabulary: sun / partly / cloud / rain / storm / snow /
   * fog). */
  private data class DbWeatherFace(val text: String, val glyph: String)

  /** v470: the rail's slot cap and its honest costs, measured
   * from widget_daily_breakdown.xml the v457 way — a stop is
   * its content padding (3 + 3) + the 13.5sp title's line
   * box (19) + the sub's margin (1) + the 12sp sub's line
   * box (16) = 42; a gap block is its margins (2 + 2) + the
   * box's padding (5 + 5) + the 12sp line box (16) = 30. */
  private val DB_RAIL_SLOTS = 7
  private val DB_RAIL_STOP_COST = 42
  private val DB_RAIL_GAP_COST = 30

  /** v478: the weather header's honest cost, measured from
   * widget_daily_breakdown.xml the v457 way — its top
   * padding (2) + the 22dp glyph's line (22) + its bottom
   * padding (8) = 32. Reserved off the budget before the
   * row walk whenever a weather face stands. */
  private val DB_WEATHER_COST = 32

  /** v478: a weather snapshot older than this never faces —
   * 48 hours, in milliseconds. */
  private val DB_WEATHER_MAX_AGE_MS = 48L * 3600L * 1000L

  /** A breakdown day item's effective window end — the v455
   *  convention: the baked endMinutes when it runs past the
   *  start (a stored end, or the per-kind +30/+60 default the
   *  builder already folded in), else the start itself. Mirrors
   *  renderUpNext's winEnd. */
  private fun breakdownWinEnd(item: JSONObject): Int {
    val start = item.optInt("startMinutes")
    val end = item.optInt("endMinutes")
    return if (end > start) end else start
  }

  /** The evening turn's test: the day held at least one timed
   *  item and every item's window has passed. */
  private fun breakdownEvening(schedule: JSONObject?, nowMin: Int): Boolean {
    val items = schedule?.optJSONArray("dayItems") ?: return false
    if (items.length() == 0) return false
    for (i in 0 until items.length()) {
      val item = items.optJSONObject(i) ?: continue
      if (breakdownWinEnd(item) > nowMin) return false
    }
    return true
  }

  /** v478: a pack preparedAt (ISO-8601) as epoch milliseconds,
   * or null when no known shape reads it. The producer writes
   * UTC stamps, with or without millis; offset stamps read
   * too. A stamp no shape parses is not a stamp the header
   * may trust — the face falls to absent, never to a guess. */
  private fun weatherPreparedMs(preparedAt: String): Long? {
    val shapes = arrayOf(
      "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
      "yyyy-MM-dd'T'HH:mm:ssXXX",
      "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
      "yyyy-MM-dd'T'HH:mm:ss'Z'",
    )
    for (shape in shapes) {
      try {
        val format = SimpleDateFormat(shape, Locale.US)
        format.isLenient = false
        if (shape.endsWith("'Z'")) format.timeZone = TimeZone.getTimeZone("UTC")
        val parsed = format.parse(preparedAt)
        if (parsed != null) return parsed.time
      } catch (e: Exception) {
        // Not this shape — try the next.
      }
    }
    return null
  }

  /** v478: the glyph a condition wears, read off its own
   * words (case-insensitive keyword map — the producer's
   * conditions are plain weather words: "Sunny", "Partly
   * cloudy", "Light rain"). The order is the meaning:
   * thunder outranks the rain it rides, partly outranks the
   * plain cloud it names, and anything unmapped falls back
   * to the cloud. A drawn glyph (weatherGlyphBitmap), never
   * a pictograph character. */
  private fun weatherGlyphKind(condition: String): String {
    val text = condition.lowercase(Locale.US)
    return when {
      text.contains("thunder") || text.contains("storm") -> "storm"
      text.contains("snow") -> "snow"
      text.contains("rain") || text.contains("drizzle") || text.contains("shower") -> "rain"
      text.contains("partly") -> "partly"
      text.contains("fog") || text.contains("haze") || text.contains("mist") -> "fog"
      text.contains("clear") || text.contains("sun") -> "sun"
      text.contains("cloud") || text.contains("overcast") -> "cloud"
      else -> "cloud"
    }
  }

  /** v479: the hourly curve's point for one local date and
   * hour — the mirror of lib/weather-snapshot.ts's
   * weatherCurvePoint, line for line: among the curve's
   * entries whose date part equals `dateIso` and whose hour
   * is at or before `hour`, the one with the greatest hour
   * speaks, and only while it is at most 3 hours old — past
   * that the morning is talking about the afternoon and the
   * curve has nothing to say. The point's condition falls
   * back to the day's own (handed in as `dayCondition`) when
   * the entry's is blank. Returns the point's temp and its
   * resolved condition, or null. The date and hour are read
   * off the "at" string ("YYYY-MM-DDTHH:00"), never parsed
   * as a Date — the producer's format is the contract. */
  private fun breakdownCurvePoint(
    weather: JSONObject,
    dateIso: String,
    hour: Int,
    dayCondition: String,
  ): Pair<Double, String>? {
    val hourly = weather.optJSONArray("hourly") ?: return null
    var bestHour = -1
    var bestTemp = 0.0
    var bestCondition = ""
    for (i in 0 until hourly.length()) {
      val entry = hourly.optJSONObject(i) ?: continue
      val at = entry.optString("at")
      if (at.length < 13) continue
      if (at.substring(0, 10) != dateIso) continue
      val entryHour = at.substring(11, 13).toIntOrNull() ?: continue
      if (entryHour > hour) continue
      if (entryHour > bestHour) {
        bestHour = entryHour
        bestTemp = entry.optDouble("tempF")
        bestCondition = entry.optString("condition").trim()
      }
    }
    if (bestHour < 0 || hour - bestHour > 3) return null
    return bestTemp to if (bestCondition.isNotBlank()) bestCondition else dayCondition
  }

  /** v478: the weather header's face, decided HERE from the
   * device clock — the snapshot carries the weather whole
   * (preparedAt / now / days, verbatim from the store) and
   * the renderer reads it against now, the Up Next pattern:
   *  - a snapshot more than 48 hours old never faces, and
   *    neither does one whose dates cover neither the date
   *    the face needs;
   *  - before 18:00, the snapshot's own "now" for today
   *    faces: "{temp}° · {condition}";
   *  - before 18:00 with a stale or missing "now" but a
   *    forecast covering today, today's high/low faces
   *    instead, named for what it is — "Today · {high}° /
   *    {low}° · {condition}". A "now" temp is never shown
   *    for the wrong day;
   *  - from 18:00 the card turns to tomorrow, the way At a
   *    Glance does on his home screen: "Tomorrow · {high}°
   *    / {low}° · {condition}", from the days entry for the
   *    device's tomorrow.
   * A blank condition drops its segment rather than leaving
   * a dangling separator.
   *
   * v479 — the daytime order gains a first speaker: when
   * the snapshot carries the hourly curve, its point for
   * the device's current hour (breakdownCurvePoint) faces
   * before the "now" is even consulted — the curve stepping
   * through the day is the whole point, and the pack
   * morning's single reading is what it replaces. A fresh
   * point likewise outranks a stale "now": the high/low
   * fallback below is reached only when there is no curve
   * point AND the "now" is not today's. The evening face,
   * the staleness gate and every other v478 rule stand
   * exactly as they were; a snapshot without a curve walks
   * the v478 order whole. */
  private fun breakdownWeatherFace(weather: JSONObject?, nowMin: Int): DbWeatherFace? {
    if (weather == null) return null
    val preparedMs = weatherPreparedMs(weather.optString("preparedAt")) ?: return null
    if (System.currentTimeMillis() - preparedMs > DB_WEATHER_MAX_AGE_MS) return null
    val days = weather.optJSONArray("days")
    fun dayFor(dateIso: String): JSONObject? {
      if (days == null) return null
      for (i in 0 until days.length()) {
        val day = days.optJSONObject(i) ?: continue
        if (day.optString("date") == dateIso) return day
      }
      return null
    }
    fun dayFace(label: String, day: JSONObject): DbWeatherFace {
      val condition = day.optString("condition").trim()
      val parts = mutableListOf(
        label,
        "${Math.round(day.optDouble("highF"))}° / ${Math.round(day.optDouble("lowF"))}°",
      )
      if (condition.isNotBlank()) parts.add(condition)
      return DbWeatherFace(parts.joinToString(" · "), weatherGlyphKind(condition))
    }
    if (nowMin >= 18 * 60) {
      val tomorrow = dayFor(deviceTomorrowIso()) ?: return null
      return dayFace("Tomorrow", tomorrow)
    }
    // v479: the curve's point for the current hour speaks
    // first in the daytime (see the header note) — the same
    // "{temp}° · {condition}" dress as the "now" face below.
    val curve = breakdownCurvePoint(
      weather,
      deviceDateIso(),
      nowMin / 60,
      dayFor(deviceDateIso())?.optString("condition")?.trim() ?: "",
    )
    if (curve != null) {
      val parts = mutableListOf("${Math.round(curve.first)}°")
      if (curve.second.isNotBlank()) parts.add(curve.second)
      return DbWeatherFace(parts.joinToString(" · "), weatherGlyphKind(curve.second))
    }
    val now = weather.optJSONObject("now")
    if (now != null && now.optString("date") == deviceDateIso()) {
      val condition = now.optString("condition").trim()
      val parts = mutableListOf("${Math.round(now.optDouble("tempF"))}°")
      if (condition.isNotBlank()) parts.add(condition)
      return DbWeatherFace(parts.joinToString(" · "), weatherGlyphKind(condition))
    }
    val today = dayFor(deviceDateIso()) ?: return null
    return dayFace("Today", today)
  }

  private fun renderDailyBreakdown(context: Context, snap: JSONObject?, scheme: String?, pal: WidgetPalette, minHeightDp: Int): RemoteViews {
    val views = RemoteViews(context.packageName, R.layout.widget_daily_breakdown)
    val base = 1200
    // The palette paints the chrome in every state, quiet included.
    views.setInt(R.id.db_bg, "setColorFilter", pal.surface)
    views.setTextColor(R.id.db_msg_title, pal.ink)
    views.setTextColor(R.id.db_msg_sub, pal.body)
    views.setOnClickPendingIntent(R.id.db_root, launchPendingIntent(context, base))
    if (snap == null || snap.optString("state") != "day") return views

    val nowMin = nowMinutes()
    val schedule = snap.optJSONObject("schedule")
    // The evening turn is trusted only for today's own snapshot.
    val fresh = schedule != null && schedule.optString("dateIso") == deviceDateIso()
    val evening = fresh && breakdownEvening(schedule, nowMin)
    val pray = if (evening) null else snap.optJSONObject("pray")
    val reach = if (evening) null else snap.optJSONObject("reach")
    val fast = snap.optJSONObject("fast")
    // v470: the Tomorrow row stands only on today's own
    // snapshot, before the evening turn — after the turn the
    // schedule row already IS tomorrow, and a stale snapshot
    // never grows the row (or the rail).
    val tomorrowStands = schedule != null && fresh && !evening
    // v478: the weather header's face — decided from the
    // device clock against the weather section alone
    // (breakdownWeatherFace). It is independent of the
    // evening turn and of the schedule's freshness: the
    // weather's own dates and stamp are its whole authority.
    // Its colours are the palette's (the glyph in primary,
    // the line in ink), like every glyph and line on the card.
    val weatherFace = breakdownWeatherFace(snap.optJSONObject("weather"), nowMin)
    views.setViewVisibility(R.id.db_weather, if (weatherFace != null) View.VISIBLE else View.GONE)
    if (weatherFace != null) {
      views.setImageViewBitmap(R.id.db_weather_glyph, weatherGlyphBitmap(weatherFace.glyph, pal.primary))
      views.setTextViewText(R.id.db_weather_text, weatherFace.text)
      views.setTextColor(R.id.db_weather_text, pal.ink)
    }
    // v470: the schedule row's composed lines are HELD, not
    // written, until the seating walk has run — while a rail
    // stop stands, the header's dress switch (below) replaces
    // them with the drawing's "Today, from here" dress.
    var schedTitle = ""
    var schedSub = ""
    var schedReading = ""
    var pickStands = false
    var railSeated: List<DbRailElement> = emptyList()

    // ── Fill each row that stands. ──
    if (pray != null) {
      views.setTextViewText(R.id.db_pray_title, pray.optString("title"))
      views.setTextColor(R.id.db_pray_title, pal.ink)
      val sub = pray.optString("sub")
      views.setViewVisibility(R.id.db_pray_sub, if (sub.isBlank()) View.GONE else View.VISIBLE)
      if (sub.isNotBlank()) {
        views.setTextViewText(R.id.db_pray_sub, sub)
        views.setTextColor(R.id.db_pray_sub, pal.body)
      }
      views.setTextColor(R.id.db_pray_chev, pal.muted)
      val faces = pray.optJSONArray("faces")
      for (i in DB_SLOTS.indices) {
        val face = faces?.optJSONObject(i)
        if (face == null) {
          views.setViewVisibility(DB_SLOTS[i], View.GONE)
        } else {
          views.setViewVisibility(DB_SLOTS[i], View.VISIBLE)
          // The ring is the card's own surface — it separates the
          // overlapping faces (the strips' idiom).
          views.setInt(DB_RINGS[i], "setColorFilter", pal.surface)
          applyFace(context, views, DB_IMGS[i], DB_TEXTS[i], face, pal.primary, 40)
        }
      }
      val personId = pray.optString("personId")
      val kind = pray.optString("kind")
      if (scheme != null && personId.isNotBlank() && kind.isNotBlank()) {
        views.setOnClickPendingIntent(
          R.id.db_row_pray,
          uriPendingIntent(context, prayUri(scheme, personId, kind), base + 1),
        )
      }
    }
    if (reach != null) {
      applyFace(context, views, R.id.db_reach_img, R.id.db_reach_initials, reach, pal.green, 44)
      views.setTextViewText(R.id.db_reach_title, reach.optString("title"))
      views.setTextColor(R.id.db_reach_title, pal.ink)
      views.setTextViewText(R.id.db_reach_sub, reach.optString("sub"))
      views.setTextColor(R.id.db_reach_sub, pal.body)
      views.setTextColor(R.id.db_reach_chev, pal.muted)
      if (scheme != null) {
        views.setOnClickPendingIntent(
          R.id.db_row_reach,
          uriPendingIntent(context, "$scheme://due-to-reach", base + 2),
        )
      }
    }
    // The garden row seats here one day — between SCHEDULE and
    // FAST — when a weather feed lands. Not in this build.
    if (schedule != null) {
      views.setInt(R.id.db_sched_tile, "setColorFilter", pal.container)
      views.setImageViewBitmap(R.id.db_sched_glyph, clockBitmap(pal.primary))
      views.setTextColor(R.id.db_sched_title, pal.ink)
      views.setTextColor(R.id.db_sched_sub, pal.body)
      views.setTextColor(R.id.db_sched_chev, pal.muted)
      // The pick: the earliest uncompleted item whose window has
      // not passed — a running item qualifies (its window
      // contains now), the same reading Up Next gives the day.
      val items = schedule.optJSONArray("dayItems")
      var pick: JSONObject? = null
      var pickStart = Int.MAX_VALUE
      if (items != null) {
        for (i in 0 until items.length()) {
          val item = items.optJSONObject(i) ?: continue
          if (item.optBoolean("completed")) continue
          if (breakdownWinEnd(item) <= nowMin) continue
          val start = item.optInt("startMinutes")
          if (start < pickStart) {
            pickStart = start
            pick = item
          }
        }
      }
      val title: String
      val sub: String
      if (pick != null && !evening) {
        title = "${pick.optString("title")} at ${minutesToTimeLabel(pickStart)}"
        val parts = mutableListOf<String>()
        if (items != null) {
          val following = mutableListOf<JSONObject>()
          for (i in 0 until items.length()) {
            val item = items.optJSONObject(i) ?: continue
            if (item.optBoolean("completed")) continue
            if (item.optInt("startMinutes") > pickStart) following.add(item)
          }
          following.sortBy { it.optInt("startMinutes") }
          for (item in following.take(2)) {
            parts.add("${item.optString("title")} ${minutesToTimeLabel(item.optInt("startMinutes"))}")
          }
        }
        val reading = schedule.optString("reading")
        if (reading.isNotBlank()) parts.add("$reading to read")
        sub = parts.joinToString(" · ")
      } else {
        // The day is spent (or holds nothing left): the row
        // turns to tomorrow — the companion drawing.
        val tomorrowFirst = schedule.optJSONObject("tomorrowFirst")
        if (tomorrowFirst != null) {
          title = "Tomorrow · ${tomorrowFirst.optString("title")}"
          sub = "First thing — ${tomorrowFirst.optString("timeLabel")}"
        } else {
          title = "Tomorrow is clear"
          sub = ""
        }
      }
      // Held for the dress switch after the seating walk —
      // the views are written below, once it is known whether
      // a rail stop stands under this row.
      schedTitle = title
      schedSub = sub
      schedReading = schedule.optString("reading")
      pickStands = pick != null
      if (scheme != null) {
        views.setOnClickPendingIntent(
          R.id.db_row_schedule,
          uriPendingIntent(context, "$scheme:///?navTab=schedule", base + 3),
        )
      }
    }
    // v470: the mini rail's candidates — the rest of today,
    // computed at render time from the day whole. They stand
    // only on today's own snapshot, before the evening turn,
    // and only while the schedule row keeps its standing-day
    // dress (a pick stands): once nothing uncompleted is
    // left ahead, the row has turned to tomorrow and a rail
    // of today's finished items would fight it.
    val railCandidates =
      if (schedule != null && fresh && !evening && pickStands) {
        breakdownRailElements(schedule, nowMin)
      } else {
        emptyList()
      }
    if (fast != null) {
      views.setInt(R.id.db_fast_tile, "setColorFilter", pal.container)
      views.setImageViewBitmap(R.id.db_fast_glyph, flameBitmap(pal.primary))
      views.setTextViewText(R.id.db_fast_title, "Day ${fast.optInt("dayNumber")} of ${fast.optInt("totalDays")}")
      views.setTextColor(R.id.db_fast_title, pal.ink)
      views.setTextViewText(R.id.db_fast_sub, "${fast.optString("name")} · ${fast.optInt("daysLeft")} to go")
      views.setTextColor(R.id.db_fast_sub, pal.body)
      views.setTextColor(R.id.db_fast_chev, pal.muted)
      if (scheme != null) {
        views.setOnClickPendingIntent(
          R.id.db_row_fast,
          uriPendingIntent(context, "$scheme://fasting-tracker", base + 4),
        )
      }
    }
    // v470: the TOMORROW row's fill (its seating is decided
    // below, after the fast anchor — the visibility is the
    // gate, as with every row). The sub counts tomorrow from
    // the snapshot: its first timed thing and the day's whole
    // count, both from the one collection the builder read.
    if (schedule != null) {
      views.setInt(R.id.db_tomorrow_tile, "setColorFilter", pal.container)
      views.setImageViewBitmap(R.id.db_tomorrow_glyph, moonBitmap(pal.primary))
      views.setTextViewText(R.id.db_tomorrow_title, "Tomorrow")
      views.setTextColor(R.id.db_tomorrow_title, pal.ink)
      val tomorrowFirst = schedule.optJSONObject("tomorrowFirst")
      val tomorrowCount = schedule.optInt("tomorrowCount")
      val tomorrowSub = when {
        tomorrowFirst != null ->
          "First thing — ${tomorrowFirst.optString("title")} · ${tomorrowCountText(tomorrowCount)} all day"
        tomorrowCount > 0 -> "${tomorrowCountText(tomorrowCount)} · nothing timed first"
        else -> "Tomorrow is clear"
      }
      views.setTextViewText(R.id.db_tomorrow_sub, tomorrowSub)
      views.setTextColor(R.id.db_tomorrow_sub, pal.body)
      views.setTextColor(R.id.db_tomorrow_chev, pal.muted)
      if (scheme != null) {
        views.setOnClickPendingIntent(
          R.id.db_row_tomorrow,
          uriPendingIntent(context, "$scheme:///?navTab=schedule", base + 5),
        )
      }
    }

    // ── Seat the rows whole or not at all. ──
    // Budget (the Up Next idiom): ROW_COST 64 = a row's 44dp
    // lead plus its 10+10 padding; CHROME 20 = the list's 10+10
    // card padding; SAFETY 16 covers the hairlines and rounding.
    // budget = height − 36. Rows seat in the drawing's order;
    // when one cannot seat, the rows below it do not either —
    // EXCEPT fast, the anchor row, which is always attempted
    // against whatever budget remains after schedule. At the
    // 4x3 placement (~300dp) all four seat (4 × 64 = 256 ≤ 264).
    // v470: the extras seat inside this same walk — the mini
    // rail's elements walk the moment the schedule row seats
    // (walkDbRail: day order, whole or not at all, the fast
    // anchor's 64 reserved while a fast stands), and the
    // Tomorrow row is attempted after the anchor against
    // whatever remains, the anchor's own grain. At the 4x3
    // budget the walk's reserve leaves the extras nothing
    // (264 − 256 = 8), so neither the rail nor Tomorrow seats
    // and the card is v462's exactly.
    val present = mutableListOf<String>()
    if (pray != null) present.add("pray")
    if (reach != null) present.add("reach")
    if (schedule != null) present.add("schedule")
    if (fast != null) present.add("fast")
    if (tomorrowStands) present.add("tomorrow")
    var remaining = minHeightDp - 36
    // v478: the weather header's cost is reserved FIRST,
    // before any row is tried — the rows then seat whole or
    // not at all, in their standing order, against what
    // remains (at the provider's 210dp floor the reservation
    // still leaves 210 − 36 − 32 = 142, and PRAY seats).
    if (weatherFace != null) remaining -= DB_WEATHER_COST
    val seated = mutableSetOf<String>()
    var stopped = false
    for (key in present) {
      if (key == "fast") {
        if (remaining >= 64) {
          seated.add("fast")
          remaining -= 64
        }
      } else if (key == "tomorrow") {
        if (remaining >= 64) {
          seated.add("tomorrow")
          remaining -= 64
        }
      } else if (!stopped) {
        if (remaining >= 64) {
          seated.add(key)
          remaining -= 64
          if (key == "schedule") {
            val walked = walkDbRail(railCandidates, remaining, if (fast != null) 64 else 0)
            railSeated = walked.first
            remaining -= walked.second
          }
        } else {
          stopped = true
        }
      }
    }
    if (seated.isEmpty()) return views
    views.setViewVisibility(R.id.db_msg, View.GONE)
    views.setViewVisibility(R.id.db_list, View.VISIBLE)
    // v470: the header dress switch — while at least one rail
    // stop stands under the schedule row, the header wears
    // the drawing's second dress: "Today, from here", and the
    // reading line alone for its sub (the following-items
    // line is the rail's job now). With no reading text the
    // v462 sub stands as composed. Zero stops seated — the
    // v462 dress, byte-for-byte.
    if (schedule != null) {
      if (railSeated.any { !it.isGap }) {
        schedTitle = "Today, from here"
        if (schedReading.isNotBlank()) schedSub = "$schedReading to read"
      }
      views.setTextViewText(R.id.db_sched_title, schedTitle)
      views.setViewVisibility(R.id.db_sched_sub, if (schedSub.isBlank()) View.GONE else View.VISIBLE)
      if (schedSub.isNotBlank()) views.setTextViewText(R.id.db_sched_sub, schedSub)
    }
    views.setViewVisibility(R.id.db_row_pray, if ("pray" in seated) View.VISIBLE else View.GONE)
    views.setViewVisibility(R.id.db_row_reach, if ("reach" in seated) View.VISIBLE else View.GONE)
    views.setViewVisibility(R.id.db_row_schedule, if ("schedule" in seated) View.VISIBLE else View.GONE)
    views.setViewVisibility(R.id.db_row_fast, if ("fast" in seated) View.VISIBLE else View.GONE)
    views.setViewVisibility(R.id.db_row_tomorrow, if ("tomorrow" in seated) View.VISIBLE else View.GONE)
    fillDbRail(context, views, railSeated, pal)
    // A hairline stands between each pair of seated neighbours:
    // the hairline slot directly above every seated row after
    // the first (hair_1 above reach, hair_2 above schedule,
    // hair_3 above fast, hair_4 above tomorrow). The rail
    // carries no hairline of its own — it hangs inside the
    // schedule section, above hair_3.
    val orderedSeated = present.filter { it in seated }
    for ((index, key) in orderedSeated.withIndex()) {
      if (index == 0) continue
      val hairId = when (key) {
        "reach" -> R.id.db_hair_1
        "schedule" -> R.id.db_hair_2
        "fast" -> R.id.db_hair_3
        else -> R.id.db_hair_4
      }
      views.setViewVisibility(hairId, View.VISIBLE)
      views.setInt(hairId, "setBackgroundColor", pal.track)
    }
    return views
  }

  /** v470: the mini rail's candidates — today's items from
   * the current/next one onward, in start order, a gap block
   * between consecutive stops whose open stretch runs 15
   * minutes or more (the Up Next white-block threshold).
   * Computed at render time from the snapshot's dayItems and
   * the device clock, the Up Next pattern: the snapshot
   * carries the day whole and the renderer reads it against
   * now.
   *
   * The first stop is where he is in the day. An item whose
   * window has fully ended never stands. Among the items
   * whose windows contain now, an uncompleted one leads (the
   * running thing), the latest start among equals (the
   * innermost current thing); a completed item whose window
   * contains now still counts as the current stop when
   * nothing uncompleted contains it — it is where he is in
   * the day. With nothing containing now, the first stop is
   * the earliest standing item. Standing items that contain
   * now but lose that preference sit behind the current stop
   * and are not stops at all. */
  private fun breakdownRailElements(schedule: JSONObject, nowMin: Int): List<DbRailElement> {
    val items = schedule.optJSONArray("dayItems") ?: return emptyList()
    val standing = mutableListOf<JSONObject>()
    for (i in 0 until items.length()) {
      val item = items.optJSONObject(i) ?: continue
      if (breakdownWinEnd(item) > nowMin) standing.add(item)
    }
    if (standing.isEmpty()) return emptyList()
    standing.sortBy { it.optInt("startMinutes") }
    var firstIdx = 0
    var containIdx = -1
    for ((idx, item) in standing.withIndex()) {
      val start = item.optInt("startMinutes")
      if (start <= nowMin && nowMin < breakdownWinEnd(item)) {
        if (!item.optBoolean("completed")) {
          containIdx = idx
        } else if (containIdx < 0 || standing[containIdx].optBoolean("completed")) {
          containIdx = idx
        }
      }
    }
    if (containIdx >= 0) firstIdx = containIdx
    val elements = mutableListOf<DbRailElement>()
    var prev: JSONObject? = null
    for (idx in firstIdx until standing.size) {
      val item = standing[idx]
      val start = item.optInt("startMinutes")
      val end = breakdownWinEnd(item)
      if (prev != null) {
        val gapMinutes = start - breakdownWinEnd(prev)
        if (gapMinutes >= 15) {
          elements.add(
            DbRailElement(
              true,
              "",
              "${minutesToTimeLabel(breakdownWinEnd(prev))} – ${minutesToTimeLabel(start)} · ${breakdownOpenText(gapMinutes)} open",
              false,
            ),
          )
        }
      }
      val isNow = idx == firstIdx && start <= nowMin && nowMin < end
      val sub = when {
        isNow -> "${minutesToTimeLabel(start)} — now"
        end > start -> breakdownRangeLabel(start, end)
        else -> minutesToTimeLabel(start)
      }
      elements.add(DbRailElement(false, item.optString("title"), sub, isNow))
      prev = item
    }
    return elements
  }

  /** v470: seat the rail's extras from the budget the core
   * rows left, in day order, whole or not at all. `reserve`
   * is the fast anchor's own cost while a fast stands — an
   * extra seats only when the anchor still fits after it,
   * so the rail fills a tall card's surplus and never eats
   * a core row. A stop that does not fit ends the walk; a
   * gap seats only together with the stop behind it, and
   * when the pair does not fit the stop is tried alone —
   * an item always beats a gap for the same budget (the
   * standing Up Next rule). The seven slots cap the walk.
   * Returns the seated elements and the budget they took. */
  private fun walkDbRail(candidates: List<DbRailElement>, budget: Int, reserve: Int): Pair<List<DbRailElement>, Int> {
    val seated = mutableListOf<DbRailElement>()
    var remaining = budget
    var i = 0
    while (i < candidates.size && seated.size < DB_RAIL_SLOTS) {
      val element = candidates[i]
      if (element.isGap) {
        val next = candidates.getOrNull(i + 1) ?: break
        if (seated.size + 2 <= DB_RAIL_SLOTS && remaining - DB_RAIL_GAP_COST - DB_RAIL_STOP_COST >= reserve) {
          seated.add(element)
          seated.add(next)
          remaining -= DB_RAIL_GAP_COST + DB_RAIL_STOP_COST
          i += 2
        } else if (remaining - DB_RAIL_STOP_COST >= reserve) {
          seated.add(next)
          remaining -= DB_RAIL_STOP_COST
          i += 2
        } else {
          break
        }
      } else {
        if (remaining - DB_RAIL_STOP_COST >= reserve) {
          seated.add(element)
          remaining -= DB_RAIL_STOP_COST
          i += 1
        } else {
          break
        }
      }
    }
    return seated to (budget - remaining)
  }

  /** A stop's time range in the drawing's voice — the start
   * drops its meridiem when both ends share it ("4:00 –
   * 4:30 PM"); across noon or midnight both ends keep
   * theirs ("11:30 AM – 12:15 PM"). */
  private fun breakdownRangeLabel(start: Int, end: Int): String {
    val endLabel = minutesToTimeLabel(end)
    val startLabel = minutesToTimeLabel(start)
    val sharedMeridiem = ((start / 60) % 24 >= 12) == ((end / 60) % 24 >= 12)
    val shortStart =
      if (sharedMeridiem) startLabel.removeSuffix(" AM").removeSuffix(" PM") else startLabel
    return "$shortStart – $endLabel"
  }

  /** The gap block's compact duration — "6 hrs", "1 hr 30
   * min", "45 min" — the DB-T3 drawing's abbreviation (the
   * Up Next openDurationText spells the words out; the
   * drawing for this card shortens them). */
  private fun breakdownOpenText(totalMinutes: Int): String {
    val minutes = maxOf(0, totalMinutes)
    val hours = minutes / 60
    val rest = minutes % 60
    return when {
      hours == 0 -> "$rest min"
      rest == 0 -> "$hours hr${if (hours == 1) "" else "s"}"
      else -> "$hours hr${if (hours == 1) "" else "s"} $rest min"
    }
  }

  /** "1 thing" / "N things" — the Tomorrow row's count voice. */
  private fun tomorrowCountText(count: Int): String =
    "$count thing${if (count == 1) "" else "s"}"

  /** v470: fill the rail's seven slots in display order —
   * the fillRailFull pattern: slots past the seated walk
   * go GONE, and the container stands only while at least
   * one element seated. */
  private fun fillDbRail(context: Context, views: RemoteViews, elements: List<DbRailElement>, pal: WidgetPalette) {
    views.setViewVisibility(R.id.db_rail, if (elements.isEmpty()) View.GONE else View.VISIBLE)
    for (slot in 1..DB_RAIL_SLOTS) {
      val rowId = railId(context, "db_rail_row_$slot")
      if (slot > elements.size) {
        views.setViewVisibility(rowId, View.GONE)
        continue
      }
      fillDbRailSlot(context, views, slot, elements[slot - 1], slot == 1, slot == elements.size, pal)
    }
  }

  /** One rail slot (v470): the Up Next rail's own structure —
   * segments in the track colour running through the slot,
   * the outer half INVISIBLE at the walk's ends (never GONE:
   * the weighted segments' even split is what centres the
   * dot on the stop's text — the v458 rule). A stop wears a
   * ring dot (the now stop's dot filled with the palette
   * primary, the current row's dress); a gap wears the pale
   * box in surfaceAlt, the Up Next white-block dress, with
   * the line passing behind it. */
  private fun fillDbRailSlot(context: Context, views: RemoteViews, n: Int, element: DbRailElement, isFirst: Boolean, isLast: Boolean, pal: WidgetPalette) {
    fun id(name: String) = railId(context, "db_${name}_$n")
    views.setViewVisibility(id("rail_row"), View.VISIBLE)
    views.setInt(id("seg_top"), "setColorFilter", pal.track)
    views.setViewVisibility(id("seg_top"), if (isFirst) View.INVISIBLE else View.VISIBLE)
    views.setInt(id("seg_bot"), "setColorFilter", pal.track)
    views.setViewVisibility(id("seg_bot"), if (isLast) View.INVISIBLE else View.VISIBLE)
    if (element.isGap) {
      views.setViewVisibility(id("line"), View.GONE)
      views.setViewVisibility(id("ring"), View.GONE)
      views.setViewVisibility(id("dot"), View.GONE)
      views.setViewVisibility(id("gapbox"), View.VISIBLE)
      views.setInt(id("gap_img"), "setColorFilter", pal.surfaceAlt)
      views.setTextViewText(id("gap"), element.sub)
      views.setTextColor(id("gap"), pal.muted)
    } else {
      views.setViewVisibility(id("gapbox"), View.GONE)
      views.setViewVisibility(id("line"), View.VISIBLE)
      views.setTextViewText(id("title"), element.title)
      views.setTextColor(id("title"), pal.ink)
      views.setTextViewText(id("sub"), element.sub)
      views.setTextColor(id("sub"), pal.body)
      views.setViewVisibility(id("ring"), View.VISIBLE)
      views.setViewVisibility(id("dot"), View.VISIBLE)
      if (element.isNow) {
        views.setInt(id("ring"), "setColorFilter", pal.container)
        views.setInt(id("dot"), "setColorFilter", pal.primary)
      } else {
        views.setInt(id("ring"), "setColorFilter", pal.track)
        views.setInt(id("dot"), "setColorFilter", pal.surface)
      }
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

  private var clockCache: Pair<Int, Bitmap>? = null

  /** The breakdown schedule row's clock (v462) — a ring with two
   *  hands, stroked round in the given colour (the checkBitmap
   *  idiom, cached per colour). */
  private fun clockBitmap(color: Int): Bitmap {
    clockCache?.let { if (it.first == color) return it.second }
    val size = 96
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      this.color = color
      strokeCap = Paint.Cap.ROUND
    }
    paint.strokeWidth = 7f
    canvas.drawCircle(48f, 48f, 33f, paint)
    paint.strokeWidth = 8f
    // The hands: to twelve, and to four.
    canvas.drawLine(48f, 48f, 48f, 27f, paint)
    canvas.drawLine(48f, 48f, 63f, 59f, paint)
    clockCache = color to bitmap
    return bitmap
  }

  private var weatherGlyphCache: Pair<String, Bitmap>? = null

  /** v478: the weather header's condition glyphs — canvas
   * shapes on the factories' 96 grid, drawn in-process like
   * every shipped glyph (the v439 rule: bitmaps only across
   * to the launcher), cached per kind + colour. One shared
   * sun and one shared cloud do all the work: `partly`
   * stands the sun behind the cloud's shoulder, and rain,
   * storm, snow and fog hang their weather under the cloud.
   * The colour is the caller's — the palette's primary. */
  private fun weatherGlyphBitmap(kind: String, color: Int): Bitmap {
    val key = "$kind:$color"
    weatherGlyphCache?.let { if (it.first == key) return it.second }
    val size = 96
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.FILL
      this.color = color
    }
    val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.STROKE
      this.color = color
      strokeCap = Paint.Cap.ROUND
      strokeWidth = 6f
    }
    fun sun(cx: Float, cy: Float, r: Float) {
      canvas.drawCircle(cx, cy, r, fill)
      for (i in 0 until 8) {
        val angle = Math.toRadians(i * 45.0)
        val inner = r + 5
        val outer = r + 13
        canvas.drawLine(
          cx + (Math.cos(angle) * inner).toFloat(),
          cy + (Math.sin(angle) * inner).toFloat(),
          cx + (Math.cos(angle) * outer).toFloat(),
          cy + (Math.sin(angle) * outer).toFloat(),
          stroke,
        )
      }
    }
    fun cloud(cx: Float, cy: Float, scale: Float) {
      // One silhouette from overlapping fills of one colour:
      // two humps standing on a rounded base.
      canvas.drawCircle(cx - 17 * scale, cy + 4 * scale, 13 * scale, fill)
      canvas.drawCircle(cx + 2 * scale, cy - 5 * scale, 17 * scale, fill)
      canvas.drawCircle(cx + 19 * scale, cy + 4 * scale, 12 * scale, fill)
      val base = RectF(cx - 30 * scale, cy - 2 * scale, cx + 31 * scale, cy + 17 * scale)
      canvas.drawRoundRect(base, 9 * scale, 9 * scale, fill)
    }
    when (kind) {
      "sun" -> sun(48f, 48f, 17f)
      "partly" -> {
        sun(35f, 33f, 12f)
        cloud(56f, 58f, 0.82f)
      }
      "rain" -> {
        cloud(48f, 36f, 0.95f)
        for (x in floatArrayOf(32f, 48f, 64f)) {
          canvas.drawLine(x, 64f, x - 5f, 78f, stroke)
        }
      }
      "storm" -> {
        cloud(48f, 34f, 0.95f)
        val bolt = Path().apply {
          moveTo(52f, 58f)
          lineTo(38f, 80f)
          lineTo(47f, 80f)
          lineTo(42f, 94f)
          lineTo(62f, 70f)
          lineTo(52f, 70f)
          close()
        }
        canvas.drawPath(bolt, fill)
      }
      "snow" -> {
        cloud(48f, 36f, 0.95f)
        for (x in floatArrayOf(32f, 48f, 64f)) {
          canvas.drawCircle(x, 70f, 4.5f, fill)
        }
      }
      "fog" -> {
        cloud(48f, 32f, 0.9f)
        for (y in floatArrayOf(62f, 74f, 86f)) {
          canvas.drawLine(28f, y, 68f, y, stroke)
        }
      }
      else -> cloud(48f, 48f, 1.1f)
    }
    weatherGlyphCache = key to bitmap
    return bitmap
  }

  private var flameCache: Pair<Int, Bitmap>? = null

  /** The breakdown fast row's flame (v462) — a solid silhouette
   *  on the heart factory's 24-unit grid: a teardrop body with
   *  the inner curl rising at its left shoulder. */
  private fun flameBitmap(color: Int): Bitmap {
    flameCache?.let { if (it.first == color) return it.second }
    val size = 64
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val path = Path().apply {
      moveTo(12f, 1.5f)
      cubicTo(15.5f, 6f, 20f, 9.5f, 20f, 14.5f)
      cubicTo(20f, 19.5f, 16.5f, 23f, 12f, 23f)
      cubicTo(7.5f, 23f, 4f, 19.5f, 4f, 14.5f)
      cubicTo(4f, 10.5f, 6.5f, 7.5f, 8.5f, 4.5f)
      cubicTo(9.2f, 7f, 10f, 8.5f, 11.2f, 9.7f)
      cubicTo(10.5f, 6.5f, 10.7f, 3.8f, 12f, 1.5f)
      close()
    }
    val matrix = Matrix().apply { setScale(size / 24f, size / 24f) }
    path.transform(matrix)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.FILL
      this.color = color
    }
    canvas.drawPath(path, paint)
    flameCache = color to bitmap
    return bitmap
  }

  private var moonCache: Pair<Int, Bitmap>? = null

  /** The breakdown Tomorrow row's moon (v470) — a crescent
   *  on the factories' grid, drawn the glyph way (a Path and
   *  a fill, no vector in res): two circles under EVEN_ODD,
   *  the second — offset up and right — cutting the bite out
   *  of the first, so the crescent's horns point up-right,
   *  the drawing's moon. */
  private fun moonBitmap(color: Int): Bitmap {
    moonCache?.let { if (it.first == color) return it.second }
    val size = 64
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val path = Path().apply {
      fillType = Path.FillType.EVEN_ODD
      addCircle(30f, 32f, 24f, Path.Direction.CW)
      addCircle(43f, 23f, 19f, Path.Direction.CW)
    }
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      style = Paint.Style.FILL
      this.color = color
    }
    canvas.drawPath(path, paint)
    moonCache = color to bitmap
    return bitmap
  }

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
