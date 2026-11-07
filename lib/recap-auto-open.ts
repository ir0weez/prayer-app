import AsyncStorage from "@react-native-async-storage/async-storage";

import { APP_SETTINGS_STORAGE_KEY } from "./prayercircle-storage";

/**
 * v465 — the Weekly Recap's Saturday auto-open (his ask, Nov 7):
 * the recap opens by itself ONCE a week, on Saturday, at a time
 * HE picks in Settings. His failure mode, in his words: "I don't
 * want it to appear at that time, and then I close the app out
 * and it just keeps appearing... That would be annoying..."
 *
 * So the rule is consumed-means-consumed: a per-Saturday marker
 * (lastAutoRecapSaturday) is written the moment a weekly recap
 * document opens on a Saturday — by the auto-open or by his own
 * tap — and the trigger below can never fire again that week.
 * If Saturday passes with the app never opened at/after the
 * chosen time, nothing fires later (no Sunday ambush); the next
 * chance is next Saturday.
 *
 * The preference (enabled + time) lives in the app-settings blob
 * (prayercircle.app-settings.v1) beside every other Settings
 * field the (tabs) screen owns; the marker lives in its own key
 * here, written from the fasting screen's document-open path and
 * read by the trigger in app/_layout.tsx.
 */

export type RecapAutoOpenTimeId = "9:00 AM" | "12:00 PM" | "6:30 PM" | "8:00 PM";

export const RECAP_AUTO_OPEN_TIMES: { id: RecapAutoOpenTimeId; label: string; minutes: number }[] = [
  { id: "9:00 AM", label: "9:00 AM", minutes: 9 * 60 },
  { id: "12:00 PM", label: "12:00 PM", minutes: 12 * 60 },
  { id: "6:30 PM", label: "6:30 PM", minutes: 18 * 60 + 30 },
  { id: "8:00 PM", label: "8:00 PM", minutes: 20 * 60 },
];

export const DEFAULT_RECAP_AUTO_OPEN_TIME: RecapAutoOpenTimeId = "9:00 AM";

export function normalizeRecapAutoOpenTime(value: unknown): RecapAutoOpenTimeId {
  return RECAP_AUTO_OPEN_TIMES.some((t) => t.id === value)
    ? (value as RecapAutoOpenTimeId)
    : DEFAULT_RECAP_AUTO_OPEN_TIME;
}

export function recapAutoOpenMinutes(id: RecapAutoOpenTimeId): number {
  return RECAP_AUTO_OPEN_TIMES.find((t) => t.id === id)?.minutes ?? 9 * 60;
}

/** The consumed marker's own store: { lastAutoRecapSaturday }. */
export const RECAP_AUTO_OPEN_MARKER_KEY = "prayercircle.weekly-recap-auto-open.v1";

/** Local yyyy-mm-dd — the same shape getTodayISOString returns. */
export function localIsoDate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${date}`;
}

export type RecapAutoOpenInput = {
  enabled: boolean;
  time: RecapAutoOpenTimeId;
  /** The consumed marker: the ISO date of the Saturday already spent. */
  lastAutoRecapSaturday: string | null;
  now: Date;
};

/**
 * The whole trigger decision, pure: fire only when the setting is
 * on, today is Saturday (local), the chosen time has arrived, and
 * this Saturday has not already been spent — by any path.
 */
export function shouldAutoOpenRecap(input: RecapAutoOpenInput): boolean {
  if (!input.enabled) return false;
  const now = input.now;
  if (now.getDay() !== 6) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < recapAutoOpenMinutes(input.time)) return false;
  if (input.lastAutoRecapSaturday === localIsoDate(now)) return false;
  return true;
}

/** The preference half, read from the app-settings blob the
 *  Settings screen owns (defaults: on, 9:00 AM). */
export async function loadRecapAutoOpenPreference(): Promise<{ enabled: boolean; time: RecapAutoOpenTimeId }> {
  try {
    const raw = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return { enabled: true, time: DEFAULT_RECAP_AUTO_OPEN_TIME };
    const parsed = JSON.parse(raw) as { weeklyRecapAutoOpen?: unknown; weeklyRecapAutoOpenTime?: unknown };
    return {
      enabled: parsed.weeklyRecapAutoOpen !== false,
      time: normalizeRecapAutoOpenTime(parsed.weeklyRecapAutoOpenTime),
    };
  } catch {
    return { enabled: true, time: DEFAULT_RECAP_AUTO_OPEN_TIME };
  }
}

export async function loadLastAutoRecapSaturday(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(RECAP_AUTO_OPEN_MARKER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { lastAutoRecapSaturday?: unknown };
    return typeof parsed.lastAutoRecapSaturday === "string" ? parsed.lastAutoRecapSaturday : null;
  } catch {
    return null;
  }
}

export async function markRecapSaturdayConsumed(dateIso: string): Promise<void> {
  try {
    await AsyncStorage.setItem(RECAP_AUTO_OPEN_MARKER_KEY, JSON.stringify({ lastAutoRecapSaturday: dateIso }));
  } catch {
    // A failed marker write must never interrupt the recap itself.
  }
}

/**
 * The document-open half of the contract: when a weekly recap
 * opens on a Saturday — by the auto-open or by his own tap —
 * that Saturday is spent. Returns true when a marker was written.
 */
export async function consumeRecapSaturdayIfSaturday(now: Date): Promise<boolean> {
  if (now.getDay() !== 6) return false;
  await markRecapSaturdayConsumed(localIsoDate(now));
  return true;
}
