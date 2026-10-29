/**
 * v315 — "Settings, To the Drawing" + the week strip's completed exit.
 *
 * WORKSTREAM 1 — SETTINGS. The page is rebuilt to the approved
 * blend drawing (settings-expressive-blend-v7-final.html): v5 app
 * bar, ONE wide low tonal hero band with the LIVE roster count and
 * the identity line, Look (palette wall in its row + a real
 * Light/System/Dark appearance), the slim Schedule & Alerts group
 * (quiet hours included), Data & Backup (real last-export date,
 * Drive as one collapsed expander), App (a real update check), and
 * the destructive actions behind a single Warning door with a
 * two-step confirm. The old profile/stats card and FASTING card are
 * gone by his ruling. Behaviour is pinned here three ways: the
 * derived material's contrast floors (real derivation), the quiet
 * hours machinery (real scheduler functions), and source pins for
 * the screen's structure and wiring.
 *
 * WORKSTREAM 2 — WEEK STRIP. His verdict on v313/v314 (Oct 28,
 * 16:28/16:30): the strip sat at the top "like a creep" while the
 * list scrolled, and he liked that it faded as it slid out. The
 * strip now slides on its OWN measure (stripSlideY, keyed to its
 * seat) and fades (stripFade); the reach twin keeps headerSlideY
 * and fades too (headerFade). No scale anywhere.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deriveSettingsMaterial } from "../settings-material";
import { hexContrast, hexLuminance } from "../skin-themes";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const scheduleTab = read("components/schedule-tab.tsx");
const provider = read("lib/theme-provider.tsx");
const storage = read("lib/prayercircle-storage.ts");
const settingsSlice = index.slice(index.indexOf("const renderSettingsScreen"), index.indexOf("const [bibleChapters"));

// ─── Behavioural harness for the scheduler (mirrors v309's) ─────

const store = vi.hoisted(() => new Map<string, string>());

vi.mock("react-native", () => ({ Platform: { OS: "android" } }));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  },
}));

vi.mock("expo-notifications", () => ({
  SchedulableTriggerInputTypes: { DAILY: "daily", WEEKLY: "weekly", MONTHLY: "monthly", DATE: "date", TIME_INTERVAL: "timeInterval" },
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2 },
  AndroidNotificationPriority: { HIGH: "high", DEFAULT: "default", LOW: "low" },
  AndroidNotificationVisibility: { PUBLIC: 1 },
  getPresentedNotificationsAsync: vi.fn(async () => []),
  getAllScheduledNotificationsAsync: vi.fn(async () => []),
  dismissNotificationAsync: vi.fn(async () => undefined),
  cancelScheduledNotificationAsync: vi.fn(async () => undefined),
  scheduleNotificationAsync: vi.fn(async () => "id"),
  setNotificationCategoryAsync: vi.fn(async () => undefined),
  getPermissionsAsync: vi.fn(async () => ({ status: "granted", canAskAgain: true })),
  requestPermissionsAsync: vi.fn(async () => ({ status: "granted", canAskAgain: true })),
}));

import {
  applyQuietHoursToPlans,
  deferDatePastQuietHours,
  getNotificationPreferences,
  isInQuietHours,
  normalizeNotificationPreferences,
  normalizeQuietHoursRange,
  QUIET_HOURS_RANGES,
  type NotificationPlan,
} from "../notification-scheduler";

const APP_SETTINGS_KEY = "prayercircle.app-settings.v1";

beforeEach(() => {
  store.clear();
});

// ─── The derived Settings material ──────────────────────────────

const LIGHT_TOKENS = { background: "#F7F3FC", surface: "#FFFFFF", foreground: "#221433", muted: "#6E6390", border: "#E3DAF2" };
const DARK_TOKENS = { background: "#171021", surface: "#221733", foreground: "#F1EAFB", muted: "#A99BC4", border: "#3A2A55" };

describe("v315 settings material — a derived tonal ladder, never pinned", () => {
  it("the four container steps are distinct and deepen monotonically toward the seed", () => {
    const sm = deriveSettingsMaterial("#7C3AED", LIGHT_TOKENS);
    const steps = [sm.containerLow, sm.container, sm.primaryContainer, sm.containerHigh];
    expect(new Set(steps).size).toBe(4);
    // Each deeper step sits measurably closer to the seed than the last.
    const distance = (hex: string) => Math.abs(hexLuminance(hex) - hexLuminance("#7C3AED"));
    for (let i = 1; i < steps.length; i += 1) {
      expect(distance(steps[i])).toBeLessThan(distance(steps[i - 1]));
    }
    expect(sm.card).toBe(LIGHT_TOKENS.surface);
    expect(sm.ground).not.toBe(LIGHT_TOKENS.background);
  });

  it("every ink clears a 4.5:1 floor on the ground it sits on, in both appearances", () => {
    for (const tokens of [LIGHT_TOKENS, DARK_TOKENS]) {
      const sm = deriveSettingsMaterial("#7C3AED", tokens);
      expect(hexContrast(sm.ink, sm.card)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(sm.inkSoft, sm.card)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(sm.heroInk, sm.primaryContainer)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(sm.onPrimaryContainer, sm.primaryContainer)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(sm.onContainerLow, sm.containerLow)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(sm.deep, sm.card)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(sm.dangerInk, sm.dangerWash)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(sm.goodChipInk, sm.goodChipBg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("the ladder follows ANY seed — a warm palette derives warm steps with the same floors", () => {
    const violet = deriveSettingsMaterial("#7C3AED", LIGHT_TOKENS);
    const sunset = deriveSettingsMaterial("#D97706", LIGHT_TOKENS);
    expect(sunset.primaryContainer).not.toBe(violet.primaryContainer);
    expect(hexContrast(sunset.heroInk, sunset.primaryContainer)).toBeGreaterThanOrEqual(4.5);
    expect(hexContrast(sunset.deep, sunset.card)).toBeGreaterThanOrEqual(4.5);
  });

  it("the danger family stays desaturated-quiet at rest (a wash, not a slab)", () => {
    const sm = deriveSettingsMaterial("#7C3AED", LIGHT_TOKENS);
    // The wash is far closer to the card than to the raw red.
    expect(Math.abs(hexLuminance(sm.dangerWash) - hexLuminance(sm.card)))
      .toBeLessThan(Math.abs(hexLuminance(sm.dangerWash) - hexLuminance("#BA1A1A")));
    expect(sm.dangerFill).toBe("#BA1A1A");
  });
});

// ─── Quiet hours: the ranges and the window ─────────────────────

describe("v315 quiet hours — ranges, window, deferral", () => {
  it("the three chip ranges map to their overnight windows", () => {
    expect(QUIET_HOURS_RANGES.map((r) => [r.id, r.startHour, r.endHour, r.display])).toEqual([
      ["9-6", 21, 6, "9 PM – 6 AM"],
      ["10-7", 22, 7, "10 PM – 7 AM"],
      ["11-7", 23, 7, "11 PM – 7 AM"],
    ]);
    expect(normalizeQuietHoursRange("9-6")).toBe("9-6");
    expect(normalizeQuietHoursRange("11-7")).toBe("11-7");
    expect(normalizeQuietHoursRange("whenever")).toBe("10-7");
    expect(normalizeQuietHoursRange(undefined)).toBe("10-7");
  });

  it("the window wraps midnight", () => {
    const at = (h: number, m = 0) => new Date(2026, 9, 28, h, m);
    expect(isInQuietHours(at(22), "10-7")).toBe(true);
    expect(isInQuietHours(at(23, 59), "10-7")).toBe(true);
    expect(isInQuietHours(at(0), "10-7")).toBe(true);
    expect(isInQuietHours(at(6, 59), "10-7")).toBe(true);
    expect(isInQuietHours(at(7), "10-7")).toBe(false);
    expect(isInQuietHours(at(12), "10-7")).toBe(false);
    expect(isInQuietHours(at(21, 59), "10-7")).toBe(false);
    expect(isInQuietHours(at(21), "9-6")).toBe(true);
    expect(isInQuietHours(at(6), "9-6")).toBe(false);
    expect(isInQuietHours(at(22, 30), "11-7")).toBe(false);
    expect(isInQuietHours(at(23), "11-7")).toBe(true);
  });

  it("deferral lands on the window's end — next morning from the evening half, same morning from the early half", () => {
    const evening = deferDatePastQuietHours(new Date(2026, 9, 28, 23, 30), "10-7");
    expect([evening.getDate(), evening.getHours(), evening.getMinutes()]).toEqual([29, 7, 0]);
    const early = deferDatePastQuietHours(new Date(2026, 9, 28, 3, 15), "10-7");
    expect([early.getDate(), early.getHours(), early.getMinutes()]).toEqual([28, 7, 0]);
    const noon = new Date(2026, 9, 28, 12, 0);
    expect(deferDatePastQuietHours(noon, "10-7").getTime()).toBe(noon.getTime());
  });

  it("preferences default OFF at 10–7, and a stored choice survives normalization and the storage read", async () => {
    expect(normalizeNotificationPreferences(undefined).quietHoursEnabled).toBe(false);
    expect(normalizeNotificationPreferences(undefined).quietHoursRange).toBe("10-7");
    const stored = normalizeNotificationPreferences({ quietHoursEnabled: true, quietHoursRange: "9-6" });
    expect(stored.quietHoursEnabled).toBe(true);
    expect(stored.quietHoursRange).toBe("9-6");
    store.set(APP_SETTINGS_KEY, JSON.stringify({ quietHoursEnabled: true, quietHoursRange: "11-7" }));
    const readBack = await getNotificationPreferences();
    expect(readBack.quietHoursEnabled).toBe(true);
    expect(readBack.quietHoursRange).toBe("11-7");
  });
});

// ─── Quiet hours: enforcement per trigger kind ──────────────────

describe("v315 quiet hours — plan enforcement is exact where the trigger allows it", () => {
  const plan = (trigger: unknown): NotificationPlan => ({ content: { title: "t" }, trigger } as unknown as NotificationPlan);
  const enabled = { quietHoursEnabled: true, quietHoursRange: "10-7" as const };

  it("disabled: plans pass through untouched (same array)", () => {
    const plans = [plan({ type: "date", date: new Date(2026, 9, 28, 23, 30) })];
    expect(applyQuietHoursToPlans(plans, { quietHoursEnabled: false, quietHoursRange: "10-7" })).toBe(plans);
  });

  it("DATE triggers defer to the window's end; a daytime date is untouched", () => {
    const late = plan({ type: "date", date: new Date(2026, 9, 28, 23, 30), channelId: "c" });
    const noon = plan({ type: "date", date: new Date(2026, 9, 28, 12, 0), channelId: "c" });
    const [lateOut, noonOut] = applyQuietHoursToPlans([late, noon], enabled);
    const lateTrigger = lateOut.trigger as unknown as { date: Date };
    expect([lateTrigger.date.getDate(), lateTrigger.date.getHours()]).toEqual([29, 7]);
    expect(noonOut).toBe(noon);
  });

  it("DAILY triggers shift an in-window time to the end hour, in both halves of the window", () => {
    const [morning] = applyQuietHoursToPlans([plan({ type: "daily", hour: 6, minute: 30, channelId: "c" })], enabled);
    expect(morning.trigger).toMatchObject({ hour: 7, minute: 0 });
    const [eveningPlan] = applyQuietHoursToPlans([plan({ type: "daily", hour: 23, minute: 0, channelId: "c" })], enabled);
    expect(eveningPlan.trigger).toMatchObject({ hour: 7, minute: 0 });
    const [daytime] = applyQuietHoursToPlans([plan({ type: "daily", hour: 12, minute: 0, channelId: "c" })], enabled);
    expect(daytime.trigger).toMatchObject({ hour: 12, minute: 0 });
  });

  it("WEEKLY/MONTHLY: a morning time defers to the end hour; an evening time is left as scheduled (the pinned partial)", () => {
    const [morning] = applyQuietHoursToPlans([plan({ type: "weekly", weekday: 3, hour: 6, minute: 30, channelId: "c" })], enabled);
    expect(morning.trigger).toMatchObject({ hour: 7, minute: 0, weekday: 3 });
    // A weekly 11 PM reminder cannot be deferred by a time-of-day
    // shift without changing its day — it stays. This is the honest
    // partial the build report carries; pinning it keeps it visible.
    const eveningPlan = plan({ type: "weekly", weekday: 3, hour: 23, minute: 0, channelId: "c" });
    const [eveningOut] = applyQuietHoursToPlans([eveningPlan], enabled);
    expect(eveningOut).toBe(eveningPlan);
  });

  it("the three syncs route their plans through the quiet-hours pass", () => {
    const scheduler = read("lib/notification-scheduler.ts");
    expect(scheduler).toContain("applyQuietHoursToPlans(buildPrayerReminderPlans(people), preferences)");
    expect(scheduler).toContain("applyQuietHoursToPlans([...plans, ...todoPlans, ...ministryPlans], preferences)");
    expect(scheduler).toContain("applyQuietHoursToPlans(buildBudgetReminderPlans(expenses, new Date(), preferences.budgetReminderDaysBefore), preferences)");
  });
});

// ─── Appearance: a real, persisted preference ───────────────────

describe("v315 appearance — Light / System / Dark is a stored preference now", () => {
  it("the provider derives the base scheme from the preference and reads it from the settings blob", () => {
    expect(provider).toContain('export type AppearancePreference = "light" | "system" | "dark"');
    expect(provider).toContain("const baseScheme: ColorScheme = appearance === \"system\" ? systemScheme : appearance");
    expect(provider).toContain("setAppearanceState(normalizeAppearancePreference(parsed.appearance))");
    expect(provider).toContain('skinTheme === "terminal" ? "dark" : baseScheme');
  });

  it("the settings store carries it both ways (parse + defaults) and the screen mirrors it in", () => {
    expect(index).toContain("appearance: normalizeAppearancePreference(parsed.appearance)");
    expect(index).toContain('appearance: "system",');
    expect(index).toContain("if (hasHydratedPeople) setAppearance(settings.appearance);");
    expect(settingsSlice).toContain('label: "Light"');
    expect(settingsSlice).toContain('label: "System"');
    expect(settingsSlice).toContain('label: "Dark"');
  });

  it("quiet hours persist through the same blob (parse defaults: off, 10–7)", () => {
    expect(index).toContain("quietHoursEnabled: parsed.quietHoursEnabled === true,");
    expect(index).toContain("quietHoursRange: normalizeQuietHoursRange(parsed.quietHoursRange),");
    expect(index).toContain("quietHoursEnabled: false,");
  });
});

// ─── The screen itself: structure, order, wiring ────────────────

describe("v315 settings screen — the drawing's structure, every control wired", () => {
  it("app bar: back tile to More + title, and NO version pill in the bar", () => {
    expect(settingsSlice).toContain('onPress={() => setActiveTab("more")}');
    expect(settingsSlice).toContain(">Settings</Text>");
    expect(settingsSlice).not.toContain("v313");
    expect(settingsSlice).not.toContain("settingsTitle");
  });

  it("hero: one low tonal band, the LIVE roster count, the identity line inside it", () => {
    expect(settingsSlice).toContain("YOUR ROSTER");
    expect(settingsSlice).toContain("people you pray for");
    expect(settingsSlice).toContain("const rosterCount = people.filter((person) => !person.isPersonal).length;");
    expect(settingsSlice).toContain("{rosterCount}");
    expect(settingsSlice).toContain("Day ${getCurrentFastDay(activeFast)} of ${activeFast.durationDays} · tap to open Profile");
    expect(settingsSlice).toContain('onPress={() => router.push("/profile")}');
  });

  it("the old profile/stats card and the FASTING card are gone — no section-label stack survives", () => {
    expect(settingsSlice).not.toContain("profileSettingsCard");
    expect(settingsSlice).not.toContain("settingsSectionLabel");
    expect(settingsSlice).not.toContain("settingsStatNumber");
    expect(settingsSlice).not.toContain("settingsStatLabel");
    expect(settingsSlice).not.toContain("fastProgressInCard");
  });

  it("the groups land in the drawing's order", () => {
    const order = ['groupLabel("LOOK")', 'groupLabel("SCHEDULE & ALERTS")', 'groupLabel("DATA & BACKUP")', 'groupLabel("APP")', ">Warning</Text>"].map((marker) => settingsSlice.indexOf(marker));
    expect(order.every((pos) => pos >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("Look: the palette wall expands inside its row and re-tints live, exactly as the sheet does", () => {
    expect(settingsSlice).toContain("{themeDef.name} · {skinDef.name} skin");
    expect(settingsSlice).toContain("setSettingsColorExpanded((prev) => !prev)");
    expect(settingsSlice).toContain("ACCENT_THEMES.map((theme)");
    expect(settingsSlice).toContain("const unlocked = xpProgress.level >= theme.unlockLevel;");
    expect(settingsSlice).toContain("setAccentTheme(nextTheme);");
    expect(settingsSlice).toContain('navRow({ icon: "layers", title: "App skin"');
    expect(settingsSlice).toContain('title: "App icon"');
    expect(settingsSlice).toContain("setShowAppIconSheet(true)");
    expect(settingsSlice).toContain("Demo mode");
    expect(settingsSlice).toContain("Blur names & photos for screenshots");
  });

  it("alerts, slim: every switch from the old cards, the alert segmented, quiet hours with its chips", () => {
    for (const label of ["White space", "Holidays", "Prayer reminders", "Emergency & praise", "Scheduled event reminders", "Budget due reminders", "Default event alert", "Quiet hours"]) {
      expect(settingsSlice).toContain(label);
    }
    expect(settingsSlice).toContain("value: settings.emergencyPraiseNotificationsEnabled");
    expect(settingsSlice).toContain("selected: settings.defaultEventReminderMinutes");
    expect(settingsSlice).toContain("Silence alerts between");
    expect(settingsSlice).toContain("QUIET_HOURS_RANGES.map((entry)");
    expect(settingsSlice).toContain("{quietDef.display}");
  });

  it("Data & Backup: the real last-export date, the Export pill, Drive as ONE collapsed expander", () => {
    expect(settingsSlice).toContain("Last export: ${new Date(lastExportAt).toLocaleDateString(");
    expect(settingsSlice).toContain('"Not exported yet"');
    expect(settingsSlice).toContain("onPress={handleExportData}");
    expect(settingsSlice).toContain('title: "Import data"');
    expect(settingsSlice).toContain('title: "Import Studio Pack"');
    expect(settingsSlice).toContain('title: "Stamp Collection"');
    expect(settingsSlice).toContain("setDriveExpanded((prev) => !prev)");
    expect(settingsSlice).toContain(">Linked</Text>");
    // All five Drive actions still live inside the expander.
    for (const label of ["Drive Folder", "Enable export writing", "Check Drive now", "Drive updates waiting", "Drive journal"]) {
      expect(settingsSlice).toContain(label);
    }
    expect(settingsSlice).toContain("handleDriveRowPress");
    expect(settingsSlice).toContain("handleEnableExportWriting");
    expect(settingsSlice).toContain("runDriveCheck(false)");
    expect(settingsSlice).toContain("handleApplyHeld(item)");
    expect(settingsSlice).toContain("handleDismissHeld(item.id)");
  });

  it("exports stamp the record the Backup row reads — on the written and shared paths only", () => {
    expect(storage).toContain('LAST_EXPORT_STORAGE_KEY = "prayercircle.last-export.v1"');
    expect(index).toContain("const recordLastExport = () => {");
    expect(index.match(/recordLastExport\(\);/g) ?? []).toHaveLength(2);
    expect(index).toContain("AsyncStorage.getItem(LAST_EXPORT_STORAGE_KEY)");
  });

  it("App group: the update row shows the TRUE build and only claims what a real check proved", () => {
    expect(settingsSlice).toContain("Check for updates");
    expect(settingsSlice).toContain("Constants.nativeBuildVersion");
    expect(settingsSlice).toContain("Constants.expoConfig?.version");
    expect(settingsSlice).toContain("https://api.github.com/repos/ir0weez/prayer-app/releases/latest");
    expect(settingsSlice).toContain("Couldn't check — tap to try again");
    expect(settingsSlice).toContain('"Up to date"');
    expect(settingsSlice).toContain("Version ${appVersion} · Pray for the people you love");
    // The hardcoded "Version 1.0.0" About line is gone.
    expect(settingsSlice).not.toContain("Version 1.0.0 · Pray for the people you love");
  });

  it("the Warning door: collapsed at rest, the three actions behind it, two-step confirm, old handlers intact", () => {
    expect(settingsSlice).toContain("setWarningExpanded((prev) => !prev); setDangerArmed(null);");
    expect(settingsSlice).toContain(">Warning</Text>");
    for (const label of ["Reset today's prayers", "Clear all notifications", "Clear all data", "People, families & prayer items", "Tap again to confirm"]) {
      expect(settingsSlice).toContain(label);
    }
    expect(settingsSlice).toContain("doResetTodaysPrayers");
    expect(settingsSlice).toContain("doClearAllNotifications");
    expect(settingsSlice).toContain("doClearAllData");
    // The confirm handlers are the old dialogs' bodies, verbatim in effect.
    expect(settingsSlice).toContain("lastPrayerCompletedDate: p.lastPrayerCompletedDate === todayIso ? null : p.lastPrayerCompletedDate");
    expect(settingsSlice).toContain("clearAllScheduledNotifications().catch(() => undefined);");
    expect(settingsSlice).toContain('AsyncStorage.removeItem("prayercircle.xp.v1")');
    // No dialog remains for them.
    expect(settingsSlice).not.toContain("M3Dialog");
  });
});

// ─── Workstream 2: the strip completes its exit ─────────────────

describe("v315 week strip — slide on its own measure, fade on the same scroll, no scale", () => {
  it("the strip's slide is keyed to its own seat (84 + its height + 12)", () => {
    expect(scheduleTab).toContain("const stripSlideFull = 84 + classicStripHeight + 12;");
    expect(scheduleTab).toContain("const stripSlideY = scrollY.interpolate({");
    expect(scheduleTab).toContain("inputRange: [0, stripSlideFull]");
    expect(scheduleTab).toContain("outputRange: [0, -stripSlideFull]");
  });

  it("both fades run solid through the first 45% and reach 0 exactly at slide completion", () => {
    expect(scheduleTab).toContain("inputRange: [stripSlideFull * 0.45, stripSlideFull]");
    expect(scheduleTab).toContain("inputRange: [headerSlideFull * 0.45, headerSlideFull]");
    expect(scheduleTab).toContain("outputRange: [1, 0]");
  });

  it("the twins wear the new drivers; the app bar keeps the shared slide, untouched", () => {
    const overlaySlice = scheduleTab.slice(scheduleTab.indexOf("the fixed-zone OVERLAY"), scheduleTab.indexOf("viewMode === 'week'"));
    expect(overlaySlice).toContain("opacity: stripFade");
    expect(overlaySlice).toContain("transform: [{ translateY: stripSlideY }]");
    expect(overlaySlice).toContain("opacity: headerFade");
    expect(overlaySlice).toContain("transform: [{ translateY: headerSlideY }]");
    expect(scheduleTab).toContain(": { transform: [{ translateY: headerSlideY }] }");
  });

  it("no scale creeps back, and day-switching still lives on the drawn strip", () => {
    expect(scheduleTab).not.toContain("scale: scrollY.interpolate");
    const overlaySlice = scheduleTab.slice(scheduleTab.indexOf("the fixed-zone OVERLAY"), scheduleTab.indexOf("viewMode === 'week'"));
    expect(overlaySlice).toContain("onPress={() => setSelectedDate(date)}");
    expect(overlaySlice).toContain("{...weekStripPanResponder.panHandlers}");
    expect(overlaySlice).toContain('label="Jump to date"');
  });
});
