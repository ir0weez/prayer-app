// ─── The widget task handler (v436; never-blank rule v437) ──────────────────
// Registered at module scope, and — since v437 — imported FIRST
// by the app's JS entry (index.ts, package.json "main"), ahead of
// expo-router/entry. That ordering is the whole registration
// guarantee: the OS wakes a headless JS context for widget draws
// (RNWidgetBackgroundTaskWorker → headless task
// "RNWidgetBackgroundTask") and evaluates only the bundle's entry
// chain; the router's layout (which also imports this module)
// evaluates only when the UI renders, which a headless wake never
// does. Entry scope is what puts registerHeadlessTask in reach of
// every wake. app/_layout.tsx keeps its import too — harmless,
// and it keeps the registration obvious to anyone reading the
// layout (the v408 auto-export definition reasons the same way).
//
// Each call reloads the real stores and renders that widget from
// the same pure builders the app's pushes use
// (lib/widget-snapshots.ts via lib/widget-push.tsx), so a widget
// refreshed while the app sleeps still reads stored truth — and
// shows the quiet states when the stores are empty.
//
// v437 NEVER-BLANK RULE: a widget's initialLayout is a transparent
// empty frame, so rendering nothing = a permanent hole on the home
// screen. v436's catch block rendered nothing on a failed load —
// on a fresh placement there is no previous render to fall back
// to, so one throw blanked the widget for good. Now ANY failure
// falls back to the quiet states built from EMPTY_WIDGET_STORES
// (pure, cannot fail on IO), and if even that throws, to the
// data-free WidgetFallbackCard. A widget must never be blank.
//
// Clicks never reach here: widget taps are OPEN_URI deep links the
// OS delivers to the app directly (open-to-act only).

import { Platform } from "react-native";
import { registerWidgetTaskHandler } from "react-native-android-widget";

import {
  WidgetFallbackCard,
  renderWidgetByName,
} from "@/components/widgets/prayercircle-widgets";
import {
  EMPTY_WIDGET_STORES,
  loadWidgetStores,
  snapshotsFromStores,
  widgetScheme,
} from "@/lib/widget-push";

if (Platform.OS === "android") {
  registerWidgetTaskHandler(async ({ widgetInfo, widgetAction, renderWidget }) => {
    if (widgetAction === "WIDGET_DELETED") return;
    const compact = widgetInfo.height < 200;
    try {
      const stores = await loadWidgetStores();
      const snapshots = snapshotsFromStores(stores);
      renderWidget(
        renderWidgetByName(widgetInfo.widgetName, snapshots, widgetScheme(), compact),
      );
    } catch {
      // The load or the build failed — draw the quiet states from
      // the empty stores instead of leaving the previous (or, on a
      // fresh placement, NO) render in place.
      try {
        renderWidget(
          renderWidgetByName(
            widgetInfo.widgetName,
            snapshotsFromStores(EMPTY_WIDGET_STORES),
            widgetScheme(),
            compact,
          ),
        );
      } catch {
        renderWidget(<WidgetFallbackCard />);
      }
    }
  });
}
