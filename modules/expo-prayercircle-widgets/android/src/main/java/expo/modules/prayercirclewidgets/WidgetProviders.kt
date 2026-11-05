package expo.modules.prayercirclewidgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle

/**
 * The providers — one thin AppWidgetProvider per widget, all
 * delegating to WidgetRenderer. Declared in this module's
 * AndroidManifest.xml (library manifests merge into the app's), so
 * the receivers exist in the shipped APK with no prebuild codegen.
 * v441 adds the three rectangles (W-3) to the original six.
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
    val minHeight = manager.getAppWidgetOptions(id)
      .getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
    manager.updateAppWidget(id, WidgetRenderer.render(context, kind, minHeight))
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
