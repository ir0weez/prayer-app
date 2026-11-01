import { Platform } from "react-native";
import { EventEmitter, requireNativeModule } from "expo-modules-core";

/**
 * v401 — the Stay Busy Shield bridge (Jonathan: "Build it. Make
 * it work."). Settings-shaped, deliberately: list apps, read the
 * grants, open the Settings screens, sync the shielded set, ask
 * whether the watcher runs. There is no function here that could
 * return a history — the feature keeps none, on either side of
 * the bridge.
 */

export type ShieldInstalledApp = {
  packageName: string;
  label: string;
};

type StayBusyShieldNativeModule = {
  getInstalledApps(): Promise<ShieldInstalledApp[]>;
  getAppIcon(packageName: string): Promise<string | null>;
  hasUsageAccess(): boolean;
  hasOverlayPermission(): boolean;
  hasBatteryExemption(): boolean;
  openUsageAccessSettings(): void;
  openOverlaySettings(): void;
  openBatterySettings(): void;
  syncShield(shielded: string[], enabled: boolean): void;
  isWatcherRunning(): boolean;
  consumePendingOccupyRequest(): boolean;
};

let cached: StayBusyShieldNativeModule | null | undefined;

function getNative(): StayBusyShieldNativeModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== "android") return cached;
  try {
    cached = requireNativeModule<StayBusyShieldNativeModule>("ExpoStayBusyShield");
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

/** True when the native shield is available (Android, module linked). */
export function isShieldAvailable(): boolean {
  return getNative() !== null;
}

/** The phone's user apps: label + package, sorted by label. */
export async function getShieldInstalledApps(): Promise<ShieldInstalledApp[]> {
  try {
    return (await getNative()?.getInstalledApps()) ?? [];
  } catch {
    return [];
  }
}

/** One app's icon as a base64 PNG (no data: prefix), or null. */
export async function getShieldAppIcon(packageName: string): Promise<string | null> {
  try {
    return (await getNative()?.getAppIcon(packageName)) ?? null;
  } catch {
    return null;
  }
}

export function hasShieldUsageAccess(): boolean {
  try {
    return getNative()?.hasUsageAccess() ?? false;
  } catch {
    return false;
  }
}

export function hasShieldOverlayPermission(): boolean {
  try {
    return getNative()?.hasOverlayPermission() ?? false;
  } catch {
    return false;
  }
}

export function hasShieldBatteryExemption(): boolean {
  try {
    return getNative()?.hasBatteryExemption() ?? false;
  } catch {
    return false;
  }
}

export function openShieldUsageAccessSettings(): void {
  try {
    getNative()?.openUsageAccessSettings();
  } catch {
    // Best-effort
  }
}

export function openShieldOverlaySettings(): void {
  try {
    getNative()?.openOverlaySettings();
  } catch {
    // Best-effort
  }
}

export function openShieldBatterySettings(): void {
  try {
    getNative()?.openBatterySettings();
  } catch {
    // Best-effort
  }
}

/**
 * Mirror the settings where the watcher can read them and start
 * or stop it to match. Settings only — never a trigger, never a
 * choice.
 */
export function syncShield(shielded: string[], enabled: boolean): void {
  try {
    getNative()?.syncShield(shielded, enabled);
  } catch {
    // Best-effort
  }
}

/** Whether the watcher service is alive right now. */
export function isShieldWatcherRunning(): boolean {
  try {
    return getNative()?.isWatcherRunning() ?? false;
  } catch {
    return false;
  }
}

/**
 * True if the app was cold-launched from the prompt's "Occupy me"
 * while JS wasn't alive for the event. Clears the flag.
 */
export function consumeShieldOccupyRequest(): boolean {
  try {
    return getNative()?.consumePendingOccupyRequest() ?? false;
  } catch {
    return false;
  }
}

/** Fires when "Occupy me" relaunches the app while JS is alive. */
export function addShieldOccupyListener(listener: () => void): { remove(): void } | null {
  const e = getEmitter();
  if (!e) return null;
  const subscription = e.addListener("onShieldOccupy", listener);
  return { remove: () => subscription.remove() };
}
