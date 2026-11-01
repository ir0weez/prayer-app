// ─── v401 The Stay Busy Shield — settings ───────────────────────────────────
// Jonathan's idea (Oct 31): pick the apps that pull at him, and
// when one of them opens, PrayerCircle lays a prompt over it —
// "Like to stay busy?" — Occupy deals him straight into the
// games, Continue drops the cover and leaves him in the app.
//
// This file owns the SETTINGS, and settings are all it can ever
// own: the master toggle and the shielded-apps list, persisted
// under prayercircle.shield.v1 and mirrored natively (through
// the module's syncShield) where the watcher service can read
// them. The no-history law covers the rest: no trigger, choice,
// timestamp, or count is ever written here or anywhere else —
// there is no shape in this file that could hold one.
import AsyncStorage from "@react-native-async-storage/async-storage";

import { syncShield } from "@/modules/expo-stay-busy-shield/src/index";

export const SHIELD_SETTINGS_KEY = "prayercircle.shield.v1";

export interface ShieldSettings {
  /** The master toggle: the watcher runs only while this is on. */
  masterEnabled: boolean;
  /** Package names the shield watches. Sorted, deduplicated. */
  shielded: string[];
}

export const DEFAULT_SHIELD_SETTINGS: ShieldSettings = {
  masterEnabled: false,
  shielded: [],
};

/**
 * The stored record is exactly { masterEnabled, shielded } —
 * anything else in the raw value is dropped, because anything
 * else would be a shape the shield has no business keeping.
 */
export function parseShieldSettings(raw: unknown): ShieldSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SHIELD_SETTINGS };
  const record = raw as Record<string, unknown>;
  const shielded = new Set<string>();
  if (Array.isArray(record.shielded)) {
    for (const value of record.shielded) {
      if (typeof value === "string" && value.trim()) shielded.add(value);
    }
  }
  return {
    masterEnabled: record.masterEnabled === true,
    shielded: [...shielded].sort(),
  };
}

export async function loadShieldSettings(): Promise<ShieldSettings> {
  try {
    const raw = await AsyncStorage.getItem(SHIELD_SETTINGS_KEY);
    return parseShieldSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_SHIELD_SETTINGS };
  }
}

export async function saveShieldSettings(next: ShieldSettings): Promise<ShieldSettings> {
  const clean = parseShieldSettings(next);
  try {
    await AsyncStorage.setItem(SHIELD_SETTINGS_KEY, JSON.stringify(clean));
  } catch {}
  // Mirror to the watcher and start/stop it to match.
  syncShield(clean.shielded, clean.masterEnabled);
  return clean;
}

// ─── The watcher's honest state ──────────────────────────────────────────────

export interface ShieldGrants {
  usageAccess: boolean;
  overlay: boolean;
  batteryExemption: boolean;
}

export type ShieldWatcherState =
  | "off"
  | "needs-usage"
  | "needs-overlay"
  | "needs-apps"
  | "running"
  | "stalled";

/**
 * What the settings page says about the watcher, and it never
 * flatters: Off means off; a missing grant names itself; Running
 * is claimed only when the service itself reports alive; anything
 * else is Stalled, with the battery note attached where it fits.
 */
export function shieldWatcherState(
  settings: ShieldSettings,
  grants: ShieldGrants,
  nativeRunning: boolean,
): { state: ShieldWatcherState; line: string } {
  if (!settings.masterEnabled) {
    return { state: "off", line: "The shield is off." };
  }
  if (!grants.usageAccess) {
    return {
      state: "needs-usage",
      line: "Needs usage access — without it the shield can't see a listed app open.",
    };
  }
  if (!grants.overlay) {
    return {
      state: "needs-overlay",
      line: "Needs permission to draw over other apps — that's what lays the prompt over the app you opened.",
    };
  }
  if (settings.shielded.length === 0) {
    return { state: "needs-apps", line: "Pick at least one app below to shield." };
  }
  if (nativeRunning) {
    return { state: "running", line: "Running — watching the apps you picked." };
  }
  return {
    state: "stalled",
    line: grants.batteryExemption
      ? "Not running right now. Reopen PrayerCircle and it will start again."
      : "Not running right now. Android may be putting it to sleep — the battery exemption below keeps it awake.",
  };
}
