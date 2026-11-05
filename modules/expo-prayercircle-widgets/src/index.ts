import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

/**
 * v438 — the bridge to the native home-screen widgets
 * (modules/expo-prayercircle-widgets). One function only: hand the
 * Kotlin side the snapshot JSON. The widgets themselves — six
 * AppWidgetProviders drawing compiled layouts over a
 * SharedPreferences copy of that JSON — are entirely native, so
 * they render whether or not JS ever wakes. Absent module (iOS,
 * tests, an old build) = silent no-op.
 */

type PrayerCircleWidgetsNativeModule = {
  updateWidgetSnapshot(json: string): void;
};

let cached: PrayerCircleWidgetsNativeModule | null | undefined;

function getNative(): PrayerCircleWidgetsNativeModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== "android") return cached;
  try {
    cached = requireNativeModule<PrayerCircleWidgetsNativeModule>("ExpoPrayerCircleWidgets");
  } catch {
    cached = null;
  }
  return cached;
}

/** True when the native widgets are linked (Android with the module). */
export function isNativeWidgetsAvailable(): boolean {
  return getNative() !== null;
}

/**
 * Store the snapshot JSON natively and refresh every placed widget
 * immediately. Best-effort: a widget failure must never surface in
 * the app, so this swallows everything.
 */
export function updateNativeWidgetSnapshot(json: string): void {
  try {
    getNative()?.updateWidgetSnapshot(json);
  } catch {
    // Best-effort
  }
}
