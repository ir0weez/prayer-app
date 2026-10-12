import { Platform } from "react-native";
import { EventEmitter, requireNativeModule } from "expo-modules-core";

type PrayerTimerNativeModule = {
  start(): void;
  stop(): void;
  consumePendingEndRequest(): boolean;
  startEmergency(personName: string, remainingMillis: number, totalMillis: number): void;
  updateEmergency(personName: string, remainingMillis: number, totalMillis: number): void;
  stopEmergency(): void;
  consumePendingEmergencyDismiss(): boolean;
};

let cached: PrayerTimerNativeModule | null | undefined;

function getNative(): PrayerTimerNativeModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== "android") return cached;
  try {
    cached = requireNativeModule<PrayerTimerNativeModule>("ExpoPrayerTimer");
  } catch {
    cached = null;
  }
  return cached;
}

let emitter: { addListener(eventName: string, listener: () => void): { remove(): void } } | null = null;

function getEmitter(): typeof emitter {
  const native = getNative();
  if (!native) return null;
  if (!emitter) emitter = new (EventEmitter as any)(native);
  return emitter;
}

/** True when the native live timer is available (Android, module linked). */
export function isNativePrayerTimerAvailable(): boolean {
  return getNative() !== null;
}

/** Posts the ongoing notification with a live count-up chronometer. */
export function startPrayerTimerNotification(): void {
  getNative()?.start();
}

/** Dismisses the prayer timer notification. */
export function stopPrayerTimerNotification(): void {
  try {
    getNative()?.stop();
  } catch {
    // Best-effort
  }
}

/**
 * True if the app was (re)launched from the notification's End button while
 * JS wasn't alive. Clears the flag. Call on startup to clean up orphans.
 */
export function consumePendingPrayerEndRequest(): boolean {
  try {
    return getNative()?.consumePendingEndRequest() ?? false;
  } catch {
    return false;
  }
}

/** Fires when the user taps "End prayer" on the notification. */
export function addPrayerTimerEndListener(listener: () => void): { remove(): void } | null {
  const e = getEmitter();
  if (!e) return null;
  const subscription = e.addListener("onEndPrayer", listener);
  return { remove: () => subscription.remove() };
}

// ─── Emergency prayer live pill ─────────────────────────────────────────────

/** Posts the ongoing emergency notification with progress bar and actions. */
export function startEmergencyNotification(personName: string, remainingMillis: number, totalMillis: number): void {
  try {
    getNative()?.startEmergency(personName, remainingMillis, totalMillis);
  } catch {
    // Best-effort
  }
}

/** Updates the emergency notification's progress bar and countdown text. */
export function updateEmergencyNotification(personName: string, remainingMillis: number, totalMillis: number): void {
  try {
    getNative()?.updateEmergency(personName, remainingMillis, totalMillis);
  } catch {
    // Best-effort
  }
}

/** Dismisses the emergency notification. */
export function stopEmergencyNotification(): void {
  try {
    getNative()?.stopEmergency();
  } catch {
    // Best-effort
  }
}

/**
 * True if the app was launched from the emergency "Dismiss" button while
 * JS wasn't alive. Clears the flag.
 */
export function consumePendingEmergencyDismiss(): boolean {
  try {
    return getNative()?.consumePendingEmergencyDismiss() ?? false;
  } catch {
    return false;
  }
}

/** Fires when the user taps "Dismiss" on the emergency notification. */
export function addEmergencyDismissListener(listener: () => void): { remove(): void } | null {
  const e = getEmitter();
  if (!e) return null;
  const subscription = e.addListener("onEmergencyDismiss", listener);
  return { remove: () => subscription.remove() };
}
