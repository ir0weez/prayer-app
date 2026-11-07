package expo.modules.prayercirclewidgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.util.SizeF

/**
 * The providers — one thin AppWidgetProvider per widget, all
 * delegating to WidgetRenderer. Declared in this module's
 * AndroidManifest.xml (library manifests merge into the app's), so
 * the receivers exist in the shipped APK with no prebuild codegen.
 * v441 adds the three rectangles (W-3) to the original six.
 * v443 adds the two 2×1 strips (Emergency ES-1, Reading ST-2).
 * v462 adds the twelfth: the Daily Breakdown (DB-9).
 */
abstract class PrayerCircleWidgetProvider(private val kind: WidgetKind) : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (id in appWidgetIds) updateOne(context, appWidgetManager, id)
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle,
  ) {
    updateOne(context, appWidgetManager, appWidgetId)
    super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
  }

  private fun updateOne(context: Context, manager: AppWidgetManager, id: Int) {
    val options = manager.getAppWidgetOptions(id)
    // v443: the placement's height signal is the MAX of every
    // figure the launcher offers. MIN_HEIGHT alone under-reported
    // on his Pixel — a tall Up Next placement came back under the
    // full-rail threshold and rendered the compact face in a tall
    // card — so MAX_HEIGHT and, on API 31+, the largest height in
    // the SIZES list (the sizes the launcher itself offers for
    // this instance) all get a vote.
    var heightSignal = maxOf(
      options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0),
      options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0),
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      @Suppress("DEPRECATION")
      val sizes = options.getParcelableArrayList<SizeF>(AppWidgetManager.OPTION_APPWIDGET_SIZES)
      val largest = sizes?.maxByOrNull { it.height }?.height?.toInt() ?: 0
      if (largest > heightSignal) heightSignal = largest
    }
    manager.updateAppWidget(id, WidgetRenderer.render(context, kind, heightSignal))
  }
}

class PrayTodayWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.PRAY_TODAY)

class EmergencyWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.EMERGENCY)

class YourFastWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.YOUR_FAST)

class ReachOutWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.REACH_OUT)

class UpNextWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.UP_NEXT)

class YourStudyWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.YOUR_STUDY)

class PrayStripWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.PRAY_STRIP)

class PrayNextWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.PRAY_NEXT)

class ReachPairWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.REACH_PAIR)

class EmergencyStripWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.EMERGENCY_STRIP)

class ReadingStripWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.READING_STRIP)

class DailyBreakdownWidgetProvider : PrayerCircleWidgetProvider(WidgetKind.DAILY_BREAKDOWN)
