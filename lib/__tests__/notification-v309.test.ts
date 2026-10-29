/**
 * v309 — "One Notification, and a Switch" (Jonathan, Oct 28).
 *
 * THE DUPLICATE. An emergency prayer posted TWO shade notifications:
 *  1. THE PLAIN ONE — the expo sticky tray card from
 *     lib/notification-scheduler.ts: "🚨 Emergency prayer — Urgent
 *     prayer for X — tap to pray" (praise twin: "🙌 Praise report —
 *     Praise God for X — tap to view"), reconciled into the shade by
 *     syncPrayerTrayNotifications on every people change.
 *  2. THE TIMER ONE — the native pill from modules/expo-prayer-timer,
 *     driven by the People tab's 1Hz interval: "Urgent prayer for X —
 *     23h 52m left", a depleting progress bar, and 🙏 Pray now /
 *     Dismiss actions.
 * His words: "I'm still kind of tired of getting two notifications
 * for emergency and praise prayers. Just give me the timer one."
 *
 * THE FIX.
 *  - The plain tray posting path is DELETED for both kinds. The
 *    timer pill is the only emergency notification (its content,
 *    timing, and actions are untouched — pinned below against the
 *    Kotlin source); praise posts no shade card at all.
 *  - What remains in the scheduler is dismissPrayerTrayNotifications:
 *    tray cards an older build left presented/pending are cleaned up
 *    so the shade heals on the new build's first run.
 *  - A new Settings switch, "Emergency & praise notifications"
 *    (preference emergencyPraiseNotificationsEnabled, default ON):
 *    OFF schedules no emergency/praise notifications at all — the
 *    People tab stops the native pill immediately, the 1Hz interval
 *    honors the toggle, and pending tray leftovers are cancelled.
 *    ON restores the timer-only behavior. In-app emergency/praise
 *    cards are unaffected; prayer reminders and every other
 *    notification kind are untouched.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const scheduler = read("lib/notification-scheduler.ts");
const index = read("app/(tabs)/index.tsx");
const timerModule = read("modules/expo-prayer-timer/android/src/main/java/expo/modules/prayertimer/ExpoPrayerTimerModule.kt");

// ─── Behavioral harness: the scheduler with its native deps mocked ──

const store = vi.hoisted(() => new Map<string, string>());
const shade = vi.hoisted(() => ({
  presented: [] as unknown[],
  scheduled: [] as unknown[],
  dismissed: [] as string[],
  cancelled: [] as string[],
  scheduleCalls: [] as unknown[],
}));

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
  getPresentedNotificationsAsync: vi.fn(async () => shade.presented),
  getAllScheduledNotificationsAsync: vi.fn(async () => shade.scheduled),
  dismissNotificationAsync: vi.fn(async (id: string) => {
    shade.dismissed.push(id);
  }),
  cancelScheduledNotificationAsync: vi.fn(async (id: string) => {
    shade.cancelled.push(id);
  }),
  scheduleNotificationAsync: vi.fn(async (request: unknown) => {
    shade.scheduleCalls.push(request);
    return "scheduled-id";
  }),
  cancelAllScheduledNotificationsAsync: vi.fn(async () => undefined),
  setNotificationCategoryAsync: vi.fn(async () => undefined),
  setNotificationChannelAsync: vi.fn(async () => undefined),
  getPermissionsAsync: vi.fn(async () => ({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: vi.fn(async () => ({ granted: true })),
  setNotificationHandler: vi.fn(),
}));

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  dismissPrayerTrayNotifications,
  getNotificationPreferences,
  normalizeNotificationPreferences,
} from "../notification-scheduler";
import { APP_SETTINGS_STORAGE_KEY } from "../prayercircle-storage";

beforeEach(() => {
  store.clear();
  shade.presented = [];
  shade.scheduled = [];
  shade.dismissed = [];
  shade.cancelled = [];
  shade.scheduleCalls = [];
});

describe("v309: the plain tray notification is never scheduled", () => {
  it("the scheduler has no tray posting path left", () => {
    expect(scheduler).not.toContain("showPrayerTrayNotification");
    expect(scheduler).not.toContain("syncPrayerTrayNotifications");
    expect(scheduler).not.toContain("Emergency prayer\" : \"🙌 Praise report\"");
  });

  it("the plain one's copy and stable identifier are gone", () => {
    // The exact scheduled template literals (the v309 header comment
    // quotes the copy in prose; what must never return is the shape
    // that was actually handed to scheduleNotificationAsync).
    expect(scheduler).not.toContain("`Urgent prayer for ${personName} — tap to pray`");
    expect(scheduler).not.toContain("`Praise God for ${personName} — tap to view`");
    expect(scheduler).not.toContain("prayer-tray:");
    expect(scheduler).not.toContain("identifier: prayerTrayKey(kind, personId),");
  });

  it("the People page no longer calls the tray sync", () => {
    expect(index).not.toContain("syncPrayerTrayNotifications");
  });
});

describe("v309: the timer notification is the one that remains, untouched", () => {
  it("the native pill still carries the countdown, progress bar, and actions", () => {
    expect(timerModule).toContain("Urgent prayer for $personName");
    expect(timerModule).toContain("formatRemaining(remainingMillis)");
    expect(timerModule).toContain(".setProgress(");
    expect(timerModule).toContain("Pray now");
    expect(timerModule).toContain('"Dismiss"');
  });

  it("the People tab still starts and updates the pill on the same cadence", () => {
    expect(index).toContain("startEmergencyNotification(person.name, remaining, total);");
    expect(index).toContain("updateEmergencyNotification(person.name, remaining, total);");
    expect(index).toContain("now - pill.lastUpdate > 30000");
  });
});

describe("v309: legacy tray cleanup dismisses/cancels only tray cards", () => {
  it("dismisses presented tray cards and cancels pending ones, scheduling nothing", async () => {
    shade.presented = [
      { request: { identifier: "tray-emergency", content: { data: { kind: "prayer-tray", trayKind: "emergency", personId: "p1" } } } },
      { request: { identifier: "tray-praise", content: { data: { kind: "prayer-tray", trayKind: "praise", personId: "p2" } } } },
      { request: { identifier: "reminder-1", content: { data: { kind: "prayer-reminder", personId: "p3" } } } },
    ];
    shade.scheduled = [
      { identifier: "tray-pending", content: { data: { kind: "prayer-tray", trayKind: "emergency", personId: "p1" } } },
      { identifier: "event-1", content: { data: { kind: "scheduled-event", eventId: "e1" } } },
    ];

    await dismissPrayerTrayNotifications();

    expect(shade.dismissed).toEqual(["tray-emergency", "tray-praise"]);
    expect(shade.cancelled).toEqual(["tray-pending"]);
    expect(shade.scheduleCalls).toEqual([]);
  });
});

describe("v309: the Emergency & praise notifications preference", () => {
  it("defaults ON in the defaults and in normalization", () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES.emergencyPraiseNotificationsEnabled).toBe(true);
    expect(normalizeNotificationPreferences(undefined).emergencyPraiseNotificationsEnabled).toBe(true);
    expect(normalizeNotificationPreferences({}).emergencyPraiseNotificationsEnabled).toBe(true);
  });

  it("a stored OFF survives normalization and the storage read", async () => {
    expect(normalizeNotificationPreferences({ emergencyPraiseNotificationsEnabled: false }).emergencyPraiseNotificationsEnabled).toBe(false);
    store.set(APP_SETTINGS_STORAGE_KEY, JSON.stringify({ emergencyPraiseNotificationsEnabled: false }));
    expect((await getNotificationPreferences()).emergencyPraiseNotificationsEnabled).toBe(false);
  });

  it("with nothing stored, the read defaults ON (timer-only behavior)", async () => {
    expect((await getNotificationPreferences()).emergencyPraiseNotificationsEnabled).toBe(true);
  });
});

describe("v309: the Settings switch and its wiring", () => {
  it("the switch row exists (v315: the row wears the approved Settings drawing's shorter label)", () => {
    // v315 re-pin: the Settings rebuild to the approved v7-final
    // drawing renamed the ROW to the drawing's "Emergency & praise".
    // The preference key, default, and every behaviour this file
    // guards are unchanged — only the visible label follows the
    // newer approved drawing.
    expect(index).toContain('"Emergency & praise"');
    expect(index).toContain("value: settings.emergencyPraiseNotificationsEnabled");
    expect(index).toContain("emergencyPraiseNotificationsEnabled: parsed.emergencyPraiseNotificationsEnabled !== false,");
  });

  it("OFF gates the pill in the interval and stops it immediately on flip", () => {
    expect(index).toContain("if (!emergencyPraiseEnabledRef.current) {");
    expect(index).toContain("emergencyPraiseEnabledRef.current = settings.emergencyPraiseNotificationsEnabled;");
    expect(index).toContain("if (!settings.emergencyPraiseNotificationsEnabled) {");
  });

  it("OFF also clears pending tray notifications from the People tab", () => {
    const offBlock = index.slice(index.indexOf("if (!settings.emergencyPraiseNotificationsEnabled) {"));
    expect(offBlock).toContain("stopEmergencyNotification();");
    expect(offBlock).toContain("dismissPrayerTrayNotifications().catch(() => undefined);");
  });

  it("the per-person prayer reminders keep their own separate gate", () => {
    expect(scheduler).toContain("if (!preferences.prayerRemindersEnabled) return;");
    expect(index).toContain("syncPrayerReminderNotifications(people)");
  });
});
