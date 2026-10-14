import { Platform } from "react-native";
import { requireNativeModule } from "expo-modules-core";

type AppIconNativeModule = {
  setAppIcon(iconId: string): Promise<void>;
  getAppIcon(): Promise<string>;
};

let cached: AppIconNativeModule | null | undefined;

function getNative(): AppIconNativeModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (Platform.OS !== "android") return cached;
  try {
    cached = requireNativeModule<AppIconNativeModule>("ExpoAppIcon");
  } catch {
    cached = null;
  }
  return cached;
}

/** True when dynamic app-icon switching is available (Android, module linked). */
export function isAppIconSwitchingAvailable(): boolean {
  return getNative() !== null;
}

/**
 * Switches the launcher icon. iconId is "original" or one of the 9
 * unlockable names ("ember", "ocean", ...). Resolves when done; never throws.
 */
export async function setAppIcon(iconId: string): Promise<boolean> {
  try {
    const native = getNative();
    if (!native) return false;
    await native.setAppIcon(iconId);
    return true;
  } catch {
    return false;
  }
}

/** Returns the currently enabled icon id ("original" if unknown). Never throws. */
export async function getAppIcon(): Promise<string> {
  try {
    const native = getNative();
    if (!native) return "original";
    const id = await native.getAppIcon();
    return typeof id === "string" && id.length > 0 ? id : "original";
  } catch {
    return "original";
  }
}
