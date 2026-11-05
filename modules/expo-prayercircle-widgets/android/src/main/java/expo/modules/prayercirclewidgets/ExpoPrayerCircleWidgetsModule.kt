package expo.modules.prayercirclewidgets

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * v438 — the JS bridge for the native home-screen widgets, and the
 * ONLY bridge: the app hands over one snapshot JSON; everything
 * else (providers, layouts, countdown formatting, deep links) is
 * native. v436/v437 tried to draw the widgets FROM JS through
 * react-native-android-widget and both shipped blank on device —
 * the render path is plain Android now, so a widget draws its
 * compiled layout even if JS never runs again.
 */
class ExpoPrayerCircleWidgetsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoPrayerCircleWidgets")

    // Writes the snapshot to the module's SharedPreferences and
    // immediately re-renders every placed instance of all six
    // providers, so a push lands on the home screen at once (the
    // OS's own 30-minute refresh covers the time-based drift —
    // emergency countdowns — between pushes).
    Function("updateWidgetSnapshot") { json: String ->
      val ctx = appContext.reactContext ?: return@Function null
      WidgetSnapshotStore.save(ctx, json)
      WidgetSnapshotStore.refreshAll(ctx)
    }
  }
}
