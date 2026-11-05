package expo.modules.prayercirclewidgets

import android.app.PendingIntent
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import kotlin.math.roundToLong

/** The six widgets and the provider class + compiled layout each renders. */
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
    fillPrayFaces(views, faces, snap.optString("personId"), state == "next")
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
    views.setViewVisibility(R.id.pt_bar, View.VISIBLE)
    views.setViewVisibility(R.id.pt_faces, View.VISIBLE)
    views.setInt(R.id.pt_avatar_img, "setColorFilter", colorOr(snap.optString("color"), SEED))
    views.setTextViewText(R.id.pt_avatar_text, snap.optString("initials"))
    views.setTextViewText(R.id.pt_who, "NEXT UP · ${snap.optString("name").uppercase(Locale.US)}")
    val needTitle = snap.optString("needTitle")
    views.setTextViewText(R.id.pt_need, needTitle)
    views.setViewVisibility(R.id.pt_need, if (needTitle.isBlank()) View.GONE else View.VISIBLE)
    val needLine = snap.optString("needLine")
    views.setTextViewText(R.id.pt_line, needLine)
    views.setViewVisibility(R.id.pt_line, if (needLine.isBlank()) View.GONE else View.VISIBLE)
    val total = snap.optInt("total")
    val progress = if (total > 0) (snap.optInt("prayed") * 100) / total else 0
    views.setProgressBar(R.id.pt_bar, 100, progress, false)
    val tap = if (scheme != null) {
      uriPendingIntent(context, prayUri(scheme, snap.optString("personId"), "today"), base + 1)
    } else {
      launchPendingIntent(context, base)
    }
    views.setOnClickPendingIntent(R.id.pt_root, tap)
    views.setOnClickPendingIntent(R.id.pt_pill, tap)
  }

  private fun fillPrayFaces(views: RemoteViews, faces: JSONArray, nextPersonId: String?, hasNext: Boolean) {
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
      views.setInt(PT_IMGS[i], "setColorFilter", colorOr(face.optString("color"), SEED))
      views.setTextViewText(PT_TEXTS[i], face.optString("initials"))
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
      views.setInt(EM_AVATAR_IMGS[slot], "setColorFilter", colorOr(row.optString("color"), SEED))
      views.setTextViewText(EM_AVATAR_TEXTS[slot], row.optString("initials"))
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
        views.setInt(FAST_HEARTS[i], "setColorFilter", if (slot <= hearts) SEED else RING_OFF)
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
    views.setInt(R.id.reach_avatar_img, "setColorFilter", colorOr(lead.optString("color"), SEED))
    views.setTextViewText(R.id.reach_avatar_text, lead.optString("initials"))
    views.setTextViewText(R.id.reach_days, "${lead.optInt("days")} days")
    views.setTextViewText(R.id.reach_since, "since you reached ${lead.optString("firstName")}")
    val second = snap.optJSONObject("second")
    if (second == null) {
      views.setViewVisibility(R.id.reach_second, View.GONE)
      return
    }
    views.setViewVisibility(R.id.reach_second, View.VISIBLE)
    views.setInt(R.id.reach_second_img, "setColorFilter", colorOr(second.optString("color"), SEED))
    views.setTextViewText(R.id.reach_second_text_init, second.optString("initials"))
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
}
