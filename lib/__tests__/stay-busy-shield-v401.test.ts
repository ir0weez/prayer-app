// v401 — the Stay Busy Shield (Jonathan's idea, Oct 31: pick the
// apps that pull at him; when one opens, PrayerCircle lays the
// "Like to stay busy?" prompt over it — Occupy deals into the
// games, Continue drops the cover). Approved concept:
// stay-busy-shield-concept-v1.html. His order: "Build it. Make
// it work." These pins hold:
//   1. The settings shape: exactly { masterEnabled, shielded },
//      persisted under prayercircle.shield.v1 and nowhere else —
//      parsing drops any other shape on sight.
//   2. The bridge contract: the module's JS API the page and the
//      root layout call, and the native functions behind it.
//   3. THE NO-HISTORY LAW: no native or shield-JS source writes
//      anything but settings — no putLong/putInt (no timestamps),
//      no logging calls, grace lives in the service's memory
//      (a HashMap, never a store).
//   4. The prompt's doors: Occupy carries the open-KMO flag and
//      the root layout lands it on /keep-me-occupied, exactly
//      once (event + consume clear the same extra).
//   5. The watcher's honest states: off / missing grant / no
//      apps / running only when the service says so / stalled.
//   6. The number-line fix (his screenshot feedback): the dealt
//      screen carries no strength row; the wave check asks the
//      one question exactly once; no entryRating survives in the
//      flow's sources.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => new Map<string, string>());
const writtenKeys = vi.hoisted(() => [] as string[]);
const syncCalls = vi.hoisted(() => [] as Array<{ shielded: string[]; enabled: boolean }>);

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      writtenKeys.push(key);
      store.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => { store.delete(key); }),
    getAllKeys: vi.fn(async () => [...store.keys()]),
    multiGet: vi.fn(async (ks: string[]) => ks.map((k) => [k, store.get(k) ?? null])),
  },
}));

vi.mock("@/modules/expo-stay-busy-shield/src/index", () => ({
  syncShield: (shielded: string[], enabled: boolean) => {
    syncCalls.push({ shielded: [...shielded], enabled });
  },
}));

import {
  DEFAULT_SHIELD_SETTINGS,
  SHIELD_SETTINGS_KEY,
  loadShieldSettings,
  parseShieldSettings,
  saveShieldSettings,
  shieldWatcherState,
} from "@/lib/stay-busy-shield";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const nativeSources = (): Array<{ path: string; src: string }> => {
  const root = join(process.cwd(), "modules/expo-stay-busy-shield/android/src/main/java/expo/modules/staybusyshield");
  return readdirSync(root)
    .filter((f) => f.endsWith(".kt"))
    .map((f) => ({ path: f, src: readFileSync(join(root, f), "utf8") }));
};

beforeEach(() => {
  store.clear();
  writtenKeys.length = 0;
  syncCalls.length = 0;
});

// ─── 1. The settings shape ───────────────────────────────────────────────────

describe("v401 shield settings", () => {
  it("the key is prayercircle.shield.v1 and the default is off with an empty list", () => {
    expect(SHIELD_SETTINGS_KEY).toBe("prayercircle.shield.v1");
    expect(DEFAULT_SHIELD_SETTINGS).toEqual({ masterEnabled: false, shielded: [] });
  });

  it("parse keeps exactly { masterEnabled, shielded } — sorted, deduped, nothing else survives", () => {
    const parsed = parseShieldSettings({
      masterEnabled: true,
      shielded: ["com.z", "com.a", "com.z", "", 42, null],
      lastTriggered: 123,
      history: ["com.a"],
    });
    expect(parsed).toEqual({ masterEnabled: true, shielded: ["com.a", "com.z"] });
    expect(Object.keys(parsed).sort()).toEqual(["masterEnabled", "shielded"]);
  });

  it("parse of garbage is the default", () => {
    expect(parseShieldSettings(null)).toEqual(DEFAULT_SHIELD_SETTINGS);
    expect(parseShieldSettings("nope")).toEqual(DEFAULT_SHIELD_SETTINGS);
    expect(parseShieldSettings({ masterEnabled: "yes", shielded: "com.a" })).toEqual(DEFAULT_SHIELD_SETTINGS);
  });

  it("save writes ONLY the settings key, and mirrors to the watcher", async () => {
    const saved = await saveShieldSettings({ masterEnabled: true, shielded: ["com.instagram.android"] });
    expect(saved).toEqual({ masterEnabled: true, shielded: ["com.instagram.android"] });
    expect(writtenKeys).toEqual([SHIELD_SETTINGS_KEY]);
    const raw = JSON.parse(store.get(SHIELD_SETTINGS_KEY)!);
    expect(Object.keys(raw).sort()).toEqual(["masterEnabled", "shielded"]);
    expect(syncCalls).toEqual([{ shielded: ["com.instagram.android"], enabled: true }]);
  });

  it("load reads back what save wrote", async () => {
    await saveShieldSettings({ masterEnabled: true, shielded: ["com.a"] });
    await expect(loadShieldSettings()).resolves.toEqual({ masterEnabled: true, shielded: ["com.a"] });
  });
});

// ─── 5. The watcher's honest states ──────────────────────────────────────────

describe("v401 watcher state", () => {
  const grants = { usageAccess: true, overlay: true, batteryExemption: true };
  const on = { masterEnabled: true, shielded: ["com.a"] };

  it("off is off, and a missing grant names itself before anything else", () => {
    expect(shieldWatcherState({ masterEnabled: false, shielded: [] }, grants, false).state).toBe("off");
    expect(shieldWatcherState(on, { ...grants, usageAccess: false }, true).state).toBe("needs-usage");
    expect(shieldWatcherState(on, { ...grants, overlay: false }, true).state).toBe("needs-overlay");
  });

  it("no apps picked is its own state; running is claimed only on the service's word", () => {
    expect(shieldWatcherState({ masterEnabled: true, shielded: [] }, grants, false).state).toBe("needs-apps");
    expect(shieldWatcherState(on, grants, true).state).toBe("running");
    expect(shieldWatcherState(on, grants, false).state).toBe("stalled");
  });

  it("a stalled watcher without the battery exemption says why", () => {
    const stalled = shieldWatcherState(on, { ...grants, batteryExemption: false }, false);
    expect(stalled.line).toContain("battery");
  });
});

// ─── 2 + 4. The bridge contract and the prompt's doors ──────────────────────

describe("v401 bridge contract", () => {
  it("the JS bridge exports the surface the page and layout call", () => {
    const src = read("modules/expo-stay-busy-shield/src/index.ts");
    for (const name of [
      "getShieldInstalledApps",
      "getShieldAppIcon",
      "hasShieldUsageAccess",
      "hasShieldOverlayPermission",
      "hasShieldBatteryExemption",
      "openShieldUsageAccessSettings",
      "openShieldOverlaySettings",
      "openShieldBatterySettings",
      "syncShield",
      "isShieldWatcherRunning",
      "consumeShieldOccupyRequest",
      "addShieldOccupyListener",
    ]) {
      expect(
        src.includes(`export function ${name}`) || src.includes(`export async function ${name}`),
        name,
      ).toBe(true);
    }
    expect(src).toContain('requireNativeModule<StayBusyShieldNativeModule>("ExpoStayBusyShield")');
  });

  it("the native module defines the matching functions", () => {
    const kt = nativeSources().map((f) => f.src).join("\n");
    for (const name of [
      'AsyncFunction("getInstalledApps")',
      'AsyncFunction("getAppIcon")',
      'Function("hasUsageAccess")',
      'Function("hasOverlayPermission")',
      'Function("hasBatteryExemption")',
      'Function("openUsageAccessSettings")',
      'Function("openOverlaySettings")',
      'Function("openBatterySettings")',
      'Function("syncShield")',
      'Function("isWatcherRunning")',
      'Function("consumePendingOccupyRequest")',
    ]) {
      expect(kt, name).toContain(name);
    }
  });

  it("Occupy carries the open-KMO flag; the root layout lands it on /keep-me-occupied", () => {
    const kt = nativeSources().map((f) => f.src).join("\n");
    expect(kt).toContain("EXTRA_OPEN_KMO");
    expect(kt).toContain("expo.modules.staybusyshield.EXTRA_OPEN_KMO");
    const layout = read("app/_layout.tsx");
    expect(layout).toContain("consumeShieldOccupyRequest");
    expect(layout).toContain("addShieldOccupyListener");
    expect(layout).toContain('"/keep-me-occupied"');
  });

  it("the module is registered where autolinking finds it, like the prayer timer's", () => {
    const config = JSON.parse(read("modules/expo-stay-busy-shield/expo-module.config.json"));
    expect(config.android.modules).toEqual(["expo.modules.staybusyshield.ExpoStayBusyShieldModule"]);
    expect(existsSync(join(process.cwd(), "app/stay-busy-shield.tsx"))).toBe(true);
    const hub = read("app/(tabs)/index.tsx");
    expect(hub).toContain('"stay-busy-shield"');
    expect(hub).toContain('router.push("/stay-busy-shield")');
  });
});

// ─── 3. The no-history law ───────────────────────────────────────────────────

describe("v401 no-history law", () => {
  it("native sources write no timestamps and keep no logs", () => {
    for (const { path, src } of nativeSources()) {
      expect(src, path).not.toContain("putLong");
      expect(src, path).not.toContain("putInt");
      expect(src, path).not.toContain("putFloat");
      expect(src, path).not.toContain("Log.d");
      expect(src, path).not.toContain("Log.i");
      expect(src, path).not.toContain("Log.w");
      expect(src, path).not.toContain("println");
    }
  });

  it("the only native store is the settings mirror, and grace is a memory map", () => {
    const files = nativeSources();
    const withPrefs = files.filter((f) => f.src.includes("getSharedPreferences"));
    expect(withPrefs.map((f) => f.path)).toEqual(["ShieldStore.kt"]);
    const storeSrc = withPrefs[0].src;
    expect(storeSrc).toContain('KEY_MASTER_ENABLED = "master_enabled"');
    expect(storeSrc).toContain('KEY_SHIELDED_PACKAGES = "shielded_packages"');
    const service = files.find((f) => f.path === "ShieldWatcherService.kt")!;
    expect(service.src).toContain("HashMap<String, Long>");
    expect(service.src).toContain("GRACE_MS");
    expect(service.src).not.toContain("getSharedPreferences");
  });

  it("the shield's JS writes only the settings key, and the page prints the promise", () => {
    const lib = read("lib/stay-busy-shield.ts");
    expect(lib).toContain("AsyncStorage.setItem(SHIELD_SETTINGS_KEY");
    expect(lib.match(/AsyncStorage\.setItem/g)).toHaveLength(1);
    const page = read("app/stay-busy-shield.tsx");
    expect(page).toContain("The shield keeps no history.");
    expect(page).not.toContain("AsyncStorage");
  });

  it("the manifest declares the watcher's grants and the special-use service", () => {
    const manifest = read("modules/expo-stay-busy-shield/android/src/main/AndroidManifest.xml");
    expect(manifest).toContain("android.permission.PACKAGE_USAGE_STATS");
    expect(manifest).toContain("android.permission.SYSTEM_ALERT_WINDOW");
    expect(manifest).toContain("android.permission.FOREGROUND_SERVICE_SPECIAL_USE");
    expect(manifest).toContain('android:foregroundServiceType="specialUse"');
    expect(manifest).toContain("ShieldWatcherService");
  });
});

// ─── 6. The number-line fix ──────────────────────────────────────────────────

describe("v401 the number line lives once", () => {
  it("the dealt screen carries no strength row and no entry rating", () => {
    const screen = read("app/keep-me-occupied.tsx");
    expect(screen).not.toContain("RatingRow");
    expect(screen).not.toContain("entryRating");
    expect(screen).not.toContain("How strong is it right now?");
    expect(screen).not.toContain("rateEntry");
  });

  it("the wave check asks the one question exactly once, with no before to read back", () => {
    const wave = read("components/keep-me-occupied/wave-check.tsx");
    expect(wave.match(/How strong is it now\?/g)).toHaveLength(1);
    expect(wave).not.toContain("entryRating");
    expect(wave).not.toContain("when you came in");
  });

  it("a session carries no entry rating anymore", () => {
    const session = read("lib/keep-me-occupied.ts");
    const typeBlock = session.slice(session.indexOf("export interface KmoSession"), session.indexOf("export function startSession"));
    expect(typeBlock).not.toContain("entryRating");
  });
});
