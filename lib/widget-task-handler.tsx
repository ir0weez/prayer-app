// ─── v436 — the widget task handler ─────────────────────────────────────────
// Registered at module scope so the OS-woken headless JS context
// finds it (the same reason the v408 auto-export task definition
// evaluates in the global scope — see app/_layout.tsx). Android
// calls this handler when a widget is added, resized, or refreshed
// on its update period; each call reloads the real stores and
// renders that widget from the same pure builders the app's pushes
// use (lib/widget-snapshots.ts via lib/widget-push.tsx), so a
// widget refreshed while the app sleeps still reads stored truth —
// and shows the quiet states when the stores are empty, never
// stale or invented data.
//
// Clicks never reach here: widget taps are OPEN_URI deep links the
// OS delivers to the app directly (open-to-act only).

import { Platform } from "react-native";
import { registerWidgetTaskHandler } from "react-native-android-widget";

import { renderWidgetByName } from "@/components/widgets/prayercircle-widgets";
import { loadWidgetStores, snapshotsFromStores, widgetScheme } from "@/lib/widget-push";

if (Platform.OS === "android") {
  registerWidgetTaskHandler(async ({ widgetInfo, widgetAction, renderWidget }) => {
    if (widgetAction === "WIDGET_DELETED") return;
    try {
      const stores = await loadWidgetStores();
      const snapshots = snapshotsFromStores(stores);
      renderWidget(
        renderWidgetByName(widgetInfo.widgetName, snapshots, widgetScheme(), widgetInfo.height < 200),
      );
    } catch {
      // A failed headless load leaves the previous render in
      // place; the next app open pushes fresh snapshots.
    }
  });
}
