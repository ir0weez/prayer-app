import AsyncStorage from "@react-native-async-storage/async-storage";

export const APP_ICON_STORAGE_KEY = "prayercircle.appIcon.v1";

export type AppIconDef = {
  id: string;
  name: string;
  level: number;
  file: any;
};

export const APP_ICONS: AppIconDef[] = [
  { id: "original", name: "Original", level: 1, file: require("@/assets/images/app-icons/icon-original.png") },
  { id: "ember", name: "Ember", level: 5, file: require("@/assets/images/app-icons/icon-ember.png") },
  { id: "ocean", name: "Ocean", level: 10, file: require("@/assets/images/app-icons/icon-ocean.png") },
  { id: "retro", name: "Retro", level: 15, file: require("@/assets/images/app-icons/icon-retro.png") },
  { id: "sketch", name: "Sketch", level: 25, file: require("@/assets/images/app-icons/icon-sketch.png") },
  { id: "watercolor", name: "Watercolor", level: 40, file: require("@/assets/images/app-icons/icon-watercolor.png") },
  { id: "aurora", name: "Aurora", level: 60, file: require("@/assets/images/app-icons/icon-aurora.png") },
  { id: "neon", name: "Neon", level: 75, file: require("@/assets/images/app-icons/icon-neon.png") },
  { id: "liquid", name: "Liquid", level: 90, file: require("@/assets/images/app-icons/icon-liquid.png") },
  { id: "gold", name: "Gold", level: 100, file: require("@/assets/images/app-icons/icon-gold.png") },
];

export function getAppIconDef(id: string | undefined | null): AppIconDef {
  return APP_ICONS.find((i) => i.id === id) ?? APP_ICONS[0];
}

export function isIconUnlocked(icon: AppIconDef, level: number): boolean {
  return level >= icon.level;
}

export function getUnlockedIcons(level: number): AppIconDef[] {
  return APP_ICONS.filter((i) => isIconUnlocked(i, level));
}

export async function loadSelectedAppIconId(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem(APP_ICON_STORAGE_KEY);
    if (raw && APP_ICONS.some((i) => i.id === raw)) return raw;
  } catch {
    // Fall through to default
  }
  return "original";
}

export async function saveSelectedAppIconId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(APP_ICON_STORAGE_KEY, id);
  } catch {
    // Best-effort
  }
}
