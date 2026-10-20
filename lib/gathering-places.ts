// Interactive gathering places — Community Garden, Amphitheater, Library, Fountain Plaza.
// Everything is tappable, upgradeable, and usable. Nothing is just decoration.
//
// Each place has:
// - A cooldown between uses (harvest/show/study/rest)
// - Rewards that scale with building level (1-3)
// - Persistent state in AsyncStorage

// ---- Community Garden ----
// Villagers grow crops together. Crops take time to ripen; Jonathan harvests.
// L1: 4 plots, L2: 8 plots, L3: 12 plots + greenhouse (faster growth, better yield).

export const GARDEN_KEY = "prayercircle.hometown.community-garden.v1";

export type GardenState = {
  /** ISO timestamp when crops were last planted (or last harvest). */
  plantedAt: string | null;
  /** Garden building level when planted (locks in the yield). */
  plantedLevel: number;
};

export const GARDEN_PLOTS: Record<number, number> = { 1: 4, 2: 8, 3: 12 };
/** Minutes for crops to ripen, by level (greenhouse speeds it up). */
export const GARDEN_RIPEN_MINUTES: Record<number, number> = { 1: 120, 2: 90, 3: 60 };
/** Coins per plot at harvest, by level. */
export const GARDEN_COINS_PER_PLOT: Record<number, number> = { 1: 30, 2: 50, 3: 80 };
/** XP per plot at harvest, by level. */
export const GARDEN_XP_PER_PLOT: Record<number, number> = { 1: 2, 2: 4, 3: 7 };

export async function loadGarden(): Promise<GardenState> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(GARDEN_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      return { plantedAt: s.plantedAt ?? null, plantedLevel: s.plantedLevel ?? 1 };
    }
  } catch {}
  return { plantedAt: null, plantedLevel: 1 };
}

export async function saveGarden(s: GardenState): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(GARDEN_KEY, JSON.stringify(s));
  } catch {}
}

/** True if crops are ripe and ready to harvest. */
export function gardenIsRipe(s: GardenState, level: number, now: number = Date.now()): boolean {
  if (!s.plantedAt) return false;
  const plantedLevel = Math.min(Math.max(s.plantedLevel, 1), 3);
  const ripenMs = (GARDEN_RIPEN_MINUTES[plantedLevel] ?? 120) * 60 * 1000;
  return now - new Date(s.plantedAt).getTime() >= ripenMs;
}

/** Milliseconds until crops ripen (0 if ripe or not planted). */
export function gardenMsUntilRipe(s: GardenState, now: number = Date.now()): number {
  if (!s.plantedAt) return 0;
  const plantedLevel = Math.min(Math.max(s.plantedLevel, 1), 3);
  const ripenMs = (GARDEN_RIPEN_MINUTES[plantedLevel] ?? 120) * 60 * 1000;
  return Math.max(0, new Date(s.plantedAt).getTime() + ripenMs - now);
}

export function gardenHarvestReward(level: number): { coins: number; xp: number } {
  const l = Math.min(Math.max(level, 1), 3);
  const plots = GARDEN_PLOTS[l] ?? 4;
  return {
    coins: plots * (GARDEN_COINS_PER_PLOT[l] ?? 3),
    xp: plots * (GARDEN_XP_PER_PLOT[l] ?? 2),
  };
}

// ---- Amphitheater ----
// Villagers perform music and stories. Jonathan attends a show (30 min cooldown).
// L1: small stage, L2: bigger stage + more performers, L3: grand + special effects.

export const AMPHITHEATER_KEY = "prayercircle.hometown.amphitheater.v1";
export const SHOW_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

/** Coins for attending a show, by amphitheater level. */
export const SHOW_COINS: Record<number, number> = { 1: 100, 2: 200, 3: 350 };
/** XP for attending a show, by amphitheater level. */
export const SHOW_XP: Record<number, number> = { 1: 15, 2: 30, 3: 50 };

export async function loadLastShow(): Promise<number> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(AMPHITHEATER_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
}

export async function saveLastShow(ts: number): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(AMPHITHEATER_KEY, String(ts));
  } catch {}
}

export function showMsRemaining(lastShow: number, now: number = Date.now()): number {
  return Math.max(0, lastShow + SHOW_COOLDOWN_MS - now);
}

// ---- Library ----
// Villagers read and study. Jonathan studies too (1 hour cooldown).
// L1: a shelf, L2: a reading room, L3: a grand library. Bigger XP at higher levels.

export const LIBRARY_KEY = "prayercircle.hometown.library.v1";
export const STUDY_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

/** XP for a study session, by library level. */
export const STUDY_XP: Record<number, number> = { 1: 25, 2: 50, 3: 100 };

export async function loadLastStudy(): Promise<number> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(LIBRARY_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
}

export async function saveLastStudy(ts: number): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(LIBRARY_KEY, String(ts));
  } catch {}
}

export function studyMsRemaining(lastStudy: number, now: number = Date.now()): number {
  return Math.max(0, lastStudy + STUDY_COOLDOWN_MS - now);
}

// ---- Fountain Plaza ----
// Villagers gather, chat, and rest. Jonathan rests too (2 hour cooldown).
// L1: simple fountain, L2: bigger + benches, L3: grand plaza. Better refresh higher.

export const PLAZA_KEY = "prayercircle.hometown.fountain-plaza.v1";
export const REST_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 hours

/** Coins for resting at the plaza, by level. */
export const REST_COINS: Record<number, number> = { 1: 50, 2: 120, 3: 250 };
/** XP for resting at the plaza, by level. */
export const REST_XP: Record<number, number> = { 1: 8, 2: 18, 3: 35 };

export async function loadLastRest(): Promise<number> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(PLAZA_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
}

export async function saveLastRest(ts: number): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(PLAZA_KEY, String(ts));
  } catch {}
}

export function restMsRemaining(lastRest: number, now: number = Date.now()): number {
  return Math.max(0, lastRest + REST_COOLDOWN_MS - now);
}

// ---- Hospital ----
// Care for the town. A checkup (20h cooldown) grants the Doctor's Blessing:
// bonus max HP (and at L3, bonus attack) for the next Dark Forest battle.
// The pawn also comes here for doctor appointments on his schedule.

export const HOSPITAL_CHECKUP_KEY = "prayercircle.hometown.hospital-checkup.v1";
export const HOSPITAL_CHECKUP_COOLDOWN_MS = 20 * 60 * 60 * 1000; // ~daily

export async function loadLastCheckup(): Promise<number> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(HOSPITAL_CHECKUP_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
}

export async function saveLastCheckup(ts: number): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(HOSPITAL_CHECKUP_KEY, String(ts));
  } catch {}
}

export function checkupMsRemaining(lastCheckup: number, now: number = Date.now()): number {
  return Math.max(0, lastCheckup + HOSPITAL_CHECKUP_COOLDOWN_MS - now);
}

/** Format ms as "Xm" or "Xh Ym" for cooldown displays. */
export function formatCooldown(ms: number): string {
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
