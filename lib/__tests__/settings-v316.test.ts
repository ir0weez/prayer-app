/**
 * v316 — "Add everything that's missing. I want it all."
 * (Jonathan, Oct 28, on the two things v315 shipped short.)
 *
 * ITEM 1 — REAL TEXT SIZE. v315 omitted the drawing's Text size
 * control because no mechanism existed. lib/text-scale.tsx is
 * the mechanism: the persisted preference (this file pins the
 * parse + the factor mapping + the provider exposure), a pure
 * style transform (real behaviour), the substitution operation
 * pinned pure against a module object, and a server render
 * through the substitute — which is what every screen's <Text>
 * now flows through. The device-side binding (Metro resolving
 * the deep Text module whose .default the public getter
 * re-reads) is read from react-native's own package source,
 * not reproducible under vitest, and the test says so.
 *
 * ITEM 2 — QUIET HOURS, FULL ENFORCEMENT. v315 pinned the
 * weekly/monthly EVENING half as "left as scheduled" and
 * reported it as the honest partial. v316 gates every plan kind
 * by fire datetime: evening weekly moves to the next weekday's
 * end hour; evening monthly moves a day (or converts to a
 * one-shot date trigger at the month's edge). The v315 pin that
 * recorded the partial was rewritten in place so it cannot
 * survive as a false statement.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const index = read("app/(tabs)/index.tsx");
const provider = read("lib/theme-provider.tsx");
const personScreen = read("app/(tabs)/person.tsx");
const settingsSlice = index.slice(index.indexOf("const renderSettingsScreen"), index.indexOf("const [bibleChapters"));

// ─── Harness: a fake RN Text + a mocked deep Text module ───────
// The deep-module mock IS the seam the patch installs on: the
// real react-native package resolves 'react-native/Libraries/
// Text/Text' through its "./*" export, and the public Text
// getter re-reads that module's .default on every access.

const rig = vi.hoisted(() => {
  const ReactHoisted = require("react") as typeof React;
  function FakeText(props: Record<string, unknown> & { children?: React.ReactNode }) {
    return ReactHoisted.createElement(
      "span",
      { "data-kind": "fake-text", "data-style": JSON.stringify(props.style ?? null) },
      props.children as React.ReactNode,
    );
  }
  const flatten = (style: unknown): unknown => {
    if (style == null) return style;
    if (Array.isArray(style)) {
      const out: Record<string, unknown> = {};
      for (const entry of style) Object.assign(out, flatten(entry) as object);
      return out;
    }
    // A registered-style id is opaque to the mock's flatten.
    if (typeof style === "object") return style;
    return undefined;
  };
  return { FakeText, flatten };
});

vi.mock("react-native", () => ({
  Platform: { OS: "android" },
  StyleSheet: { flatten: rig.flatten, create: (styles: unknown) => styles },
  Text: rig.FakeText,
}));

vi.mock("react-native/Libraries/Text/Text", () => ({ default: rig.FakeText }));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: { getItem: vi.fn(async () => null), setItem: vi.fn(async () => undefined) },
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
  applyQuietHoursToTrigger,
  nextMonthlyFireDate,
  type NotificationPlan,
} from "../notification-scheduler";
import {
  getTextScaleFactor,
  installTextScalePatch,
  normalizeTextSizePreference,
  patchTextModuleDefault,
  scaleTextStyle,
  ScaledText,
  setTextScaleFactor,
  subscribeToTextScale,
  TEXT_SIZE_FACTORS,
  textScaleFactor,
} from "../text-scale";

afterEach(() => {
  setTextScaleFactor(1);
});

// ─── Item 1a: the preference and its factors ────────────────────

describe("v316 text size — the preference parses and maps to fenced factors", () => {
  it("normalizes the four stored values and falls back to default for anything else", () => {
    expect(normalizeTextSizePreference("small")).toBe("small");
    expect(normalizeTextSizePreference("default")).toBe("default");
    expect(normalizeTextSizePreference("large")).toBe("large");
    expect(normalizeTextSizePreference("xl")).toBe("xl");
    expect(normalizeTextSizePreference(undefined)).toBe("default");
    expect(normalizeTextSizePreference(null)).toBe("default");
    expect(normalizeTextSizePreference("huge")).toBe("default");
    expect(normalizeTextSizePreference(2)).toBe("default");
  });

  it("the factors: default is exactly 1 (a true no-op); the steps stay fence-safe", () => {
    expect(TEXT_SIZE_FACTORS).toEqual({ small: 0.9, default: 1, large: 1.12, xl: 1.22 });
    expect(textScaleFactor("default")).toBe(1);
    // Steps ascend strictly and XL stays under 1.25 — the app's
    // base type is already large by design, and rows/rails are
    // fenced for it; a bigger XL would spill fixed rails.
    const steps = [TEXT_SIZE_FACTORS.small, TEXT_SIZE_FACTORS.default, TEXT_SIZE_FACTORS.large, TEXT_SIZE_FACTORS.xl];
    for (let i = 1; i < steps.length; i += 1) expect(steps[i]).toBeGreaterThan(steps[i - 1]);
    expect(TEXT_SIZE_FACTORS.xl).toBeLessThan(1.25);
  });

  it("the settings store carries textSize both ways (default + parse), like appearance", () => {
    expect(index).toContain('textSize: "default",');
    expect(index).toContain("textSize: normalizeTextSizePreference(parsed.textSize),");
    expect(index).toContain("textSize: TextSizePreference;");
  });

  it("the screen mirrors the preference into the provider on hydrate and on flip", () => {
    expect(index).toContain("if (hasHydratedPeople) setTextSize(settings.textSize);");
  });

  it("the provider exposes the scale: state from the blob, context fields, and the live factor push", () => {
    expect(provider).toContain("setTextSizeState(normalizeTextSizePreference(parsed.textSize))");
    expect(provider).toContain("textSize: TextSizePreference;");
    expect(provider).toContain("textScale: number;");
    expect(provider).toContain("textScale: textScaleFactor(textSize),");
    // The one effect that resizes the whole app: preference →
    // factor store → every ScaledText re-renders.
    expect(provider).toContain("setTextScaleFactor(textScaleFactor(textSize));");
  });

  it("the control sits in LOOK where the drawing puts it — after App icon, before Demo mode", () => {
    const appIconAt = settingsSlice.indexOf('title: "App icon"');
    const textSizeAt = settingsSlice.indexOf(">Text size<");
    const demoAt = settingsSlice.indexOf(">Demo mode<");
    expect(appIconAt).toBeGreaterThanOrEqual(0);
    expect(textSizeAt).toBeGreaterThan(appIconAt);
    expect(demoAt).toBeGreaterThan(textSizeAt);
    for (const label of ['label: "Small"', 'label: "Default"', 'label: "Large"', 'label: "XL"']) {
      expect(settingsSlice).toContain(label);
    }
    expect(settingsSlice).toContain("selected: settings.textSize,");
    expect(settingsSlice).toContain("textSize })),");
  });
});

// ─── Item 1b: the transform and the substitution ────────────────

describe("v316 text size — scaleTextStyle rescales type and nothing else", () => {
  it("factor 1 returns the style untouched (same reference)", () => {
    const style = { fontSize: 16, lineHeight: 22, color: "#111" };
    expect(scaleTextStyle(style, 1)).toBe(style);
    expect(scaleTextStyle(undefined, 1.22)).toBeUndefined();
  });

  it("fontSize and lineHeight scale together, so rows grow instead of clipping", () => {
    expect(scaleTextStyle({ fontSize: 16, lineHeight: 22, color: "#111" }, 1.22)).toEqual({
      fontSize: 19.52,
      lineHeight: 26.84,
      color: "#111",
    });
    expect(scaleTextStyle({ fontSize: 20 }, 0.9)).toEqual({ fontSize: 18 });
  });

  it("arrays flatten through the cascade before scaling", () => {
    expect(scaleTextStyle([{ fontSize: 10, color: "#000" }, { fontSize: 14 }], 1.12)).toEqual({
      fontSize: 15.68,
      color: "#000",
    });
  });

  it("a style with no size fields, or an opaque registered id, passes through as-is", () => {
    const colorOnly = { color: "#123" };
    expect(scaleTextStyle(colorOnly, 1.22)).toBe(colorOnly);
    expect(scaleTextStyle(7 as never, 1.22)).toBe(7);
  });
});

describe("v316 text size — the store drives live re-render", () => {
  it("subscribers are notified exactly when the factor changes", () => {
    let calls = 0;
    const unsubscribe = subscribeToTextScale(() => {
      calls += 1;
    });
    setTextScaleFactor(1.12);
    expect(getTextScaleFactor()).toBe(1.12);
    setTextScaleFactor(1.12);
    expect(calls).toBe(1);
    setTextScaleFactor(1);
    expect(calls).toBe(2);
    unsubscribe();
  });
});

describe("v316 text size — the Text substitution reaches every renderer", () => {
  it("the patch operation replaces a Text module's default export, idempotently", () => {
    // The operation is pinned pure: given the module object,
    // its default becomes the substitute. (Resolving WHICH
    // object is the app's Text module is the bundler's side —
    // on device, Metro's registry plus the getter in
    // react-native's index.js that re-reads this very default;
    // under vitest a bare require bypasses the mock registry
    // and hits the Flow-typed source, which is exactly the
    // failure the installer's try/catch exists to absorb.)
    const moduleObject: { default: unknown } = { default: rig.FakeText };
    expect(patchTextModuleDefault(moduleObject)).toBe(true);
    expect(moduleObject.default).toBe(ScaledText);
    expect(patchTextModuleDefault(moduleObject)).toBe(true);
    expect(patchTextModuleDefault(null)).toBe(false);
    expect(patchTextModuleDefault({})).toBe(false);
    expect(patchTextModuleDefault({ default: null })).toBe(false);
  });

  it("installing in this environment never throws and reports a boolean", () => {
    expect(typeof installTextScalePatch()).toBe("boolean");
  });

  it("at Default the substitute renders the original with props untouched", () => {
    const html = renderToString(
      React.createElement(ScaledText, { style: { fontSize: 16, lineHeight: 22 } }, "People"),
    );
    expect(html).toContain('data-kind="fake-text"');
    expect(html).toContain('data-style="{&quot;fontSize&quot;:16,&quot;lineHeight&quot;:22}"');
    expect(html).toContain("People");
  });

  it("at XL the same element renders with scaled type — the live rescale, end to end", () => {
    setTextScaleFactor(TEXT_SIZE_FACTORS.xl);
    const html = renderToString(
      React.createElement(ScaledText, { style: { fontSize: 16, lineHeight: 22 } }, "People"),
    );
    expect(html).toContain('data-style="{&quot;fontSize&quot;:19.52,&quot;lineHeight&quot;:26.84}"');
  });
});

// ─── Item 2: quiet hours, gated by fire datetime ────────────────

describe("v316 quiet hours — every plan kind is gated by fire datetime", () => {
  const plan = (trigger: unknown): NotificationPlan => ({ content: { title: "t" }, trigger } as unknown as NotificationPlan);
  const enabled = { quietHoursEnabled: true, quietHoursRange: "10-7" as const }; // 10 PM – 7 AM
  const triggerOf = (p: NotificationPlan) => p.trigger as unknown as Record<string, unknown>;

  it("WEEKLY evening moves to the NEXT weekday's end hour — its true deferred datetime", () => {
    // Wednesday (weekday 4) 11 PM inside 10 PM–7 AM → Thursday 7 AM.
    const [out] = applyQuietHoursToPlans([plan({ type: "weekly", weekday: 4, hour: 23, minute: 0, channelId: "c" })], enabled);
    expect(triggerOf(out)).toMatchObject({ type: "weekly", weekday: 5, hour: 7, minute: 0 });
  });

  it("WEEKLY evening wraps Saturday → Sunday (weekday 7 → 1)", () => {
    const [out] = applyQuietHoursToPlans([plan({ type: "weekly", weekday: 7, hour: 22, minute: 30, channelId: "c" })], enabled);
    expect(triggerOf(out)).toMatchObject({ weekday: 1, hour: 7, minute: 0 });
  });

  it("WEEKLY morning still lands on the end hour of the SAME weekday; an out-of-window weekly is untouched", () => {
    const morningPlan = plan({ type: "weekly", weekday: 2, hour: 5, minute: 45, channelId: "c" });
    const [morning] = applyQuietHoursToPlans([morningPlan], enabled);
    expect(triggerOf(morning)).toMatchObject({ weekday: 2, hour: 7, minute: 0 });
    const noonPlan = plan({ type: "weekly", weekday: 2, hour: 12, minute: 0, channelId: "c" });
    const [noon] = applyQuietHoursToPlans([noonPlan], enabled);
    expect(noon).toBe(noonPlan);
  });

  it("the window is the picked one: a 9 PM–6 AM window gates a 9:30 PM weekly the 10–7 window would not", () => {
    const nineToSix = { quietHoursEnabled: true, quietHoursRange: "9-6" as const };
    const weekly = plan({ type: "weekly", weekday: 3, hour: 21, minute: 30, channelId: "c" });
    const [gated] = applyQuietHoursToPlans([weekly], nineToSix);
    expect(triggerOf(gated)).toMatchObject({ weekday: 4, hour: 6, minute: 0 });
    const [ungated] = applyQuietHoursToPlans([weekly], enabled); // 21:30 is outside 22:00–07:00
    expect(ungated).toBe(weekly);
  });

  it("MONTHLY evening moves a day when day + 1 exists in every month (day ≤ 27)", () => {
    const [out] = applyQuietHoursToPlans([plan({ type: "monthly", day: 15, hour: 23, minute: 15, channelId: "c" })], enabled);
    expect(triggerOf(out)).toMatchObject({ type: "monthly", day: 16, hour: 7, minute: 0 });
    const [edge] = applyQuietHoursToPlans([plan({ type: "monthly", day: 27, hour: 22, minute: 0, channelId: "c" })], enabled);
    expect(triggerOf(edge)).toMatchObject({ type: "monthly", day: 28, hour: 7, minute: 0 });
  });

  it("MONTHLY morning still lands on the end hour of the same day", () => {
    const [out] = applyQuietHoursToPlans([plan({ type: "monthly", day: 15, hour: 6, minute: 0, channelId: "c" })], enabled);
    expect(triggerOf(out)).toMatchObject({ type: "monthly", day: 15, hour: 7, minute: 0 });
  });

  it("MONTHLY evening at the month's edge (day 31) converts to a one-shot DATE at the deferred datetime", () => {
    // now = Wed Oct 28 2026. Next 31st 11 PM = Oct 31 23:00,
    // inside the window's evening half → deferred to Nov 1 07:00.
    const now = new Date(2026, 9, 28, 12, 0);
    const [out] = applyQuietHoursToPlans([plan({ type: "monthly", day: 31, hour: 23, minute: 0, channelId: "c" })], enabled, now);
    const trigger = triggerOf(out) as unknown as { type: string; date: Date; channelId?: string };
    expect(trigger.type).toBe("date");
    expect(trigger.channelId).toBe("c");
    expect([trigger.date.getFullYear(), trigger.date.getMonth(), trigger.date.getDate(), trigger.date.getHours(), trigger.date.getMinutes()]).toEqual([2026, 10, 1, 7, 0]);
  });

  it("the day-29 conversion skips a February that has no 29th", () => {
    // now = Feb 10 2027 (28-day February). Next valid 29th is
    // Mar 29 2027, 11 PM → deferred Mar 30 07:00.
    const now = new Date(2027, 1, 10, 12, 0);
    const [out] = applyQuietHoursToPlans([plan({ type: "monthly", day: 29, hour: 23, minute: 0, channelId: "c" })], enabled, now);
    const trigger = triggerOf(out) as unknown as { type: string; date: Date };
    expect(trigger.type).toBe("date");
    expect([trigger.date.getFullYear(), trigger.date.getMonth(), trigger.date.getDate(), trigger.date.getHours()]).toEqual([2027, 2, 30, 7]);
  });

  it("nextMonthlyFireDate: strictly after now, same month when possible, month-skipping when needed", () => {
    expect(nextMonthlyFireDate(15, 9, 0, new Date(2026, 9, 10, 12, 0)).getTime()).toBe(new Date(2026, 9, 15, 9, 0).getTime());
    expect(nextMonthlyFireDate(15, 9, 0, new Date(2026, 9, 15, 9, 0)).getTime()).toBe(new Date(2026, 10, 15, 9, 0).getTime());
    expect(nextMonthlyFireDate(31, 9, 0, new Date(2027, 1, 1, 0, 0)).getTime()).toBe(new Date(2027, 2, 31, 9, 0).getTime());
  });

  it("applyQuietHoursToTrigger: interval triggers and disabled mode pass through untouched", () => {
    const interval = { type: "timeInterval", seconds: 10, repeats: false } as never;
    expect(applyQuietHoursToTrigger(interval, enabled)).toBe(interval);
    expect(applyQuietHoursToTrigger(null, enabled)).toBeNull();
    const weekly = { type: "weekly", weekday: 4, hour: 23, minute: 0 } as never;
    expect(applyQuietHoursToTrigger(weekly, { quietHoursEnabled: false, quietHoursRange: "10-7" })).toBe(weekly);
  });
});

// ─── Item 2 wiring: re-sync closure + the per-person path ───────

describe("v316 quiet hours — flipping the setting re-syncs every family", () => {
  it("Settings now re-plans the schedule families from storage (the v315 gap is closed)", () => {
    expect(index).toContain("void syncScheduledEventNotifications(");
    expect(index).toContain("AsyncStorage.getItem(SCHEDULE_EVENTS_KEY)");
    expect(index).toContain("AsyncStorage.getItem(SCHEDULE_MINISTRIES_KEY)");
    // The effect's dependency list carries the quiet-hours fields,
    // so a flip or a range change re-runs it — same as budget.
    expect(index).toContain("settings.eventRemindersEnabled, settings.defaultEventReminderMinutes, settings.quietHoursEnabled, settings.quietHoursRange]");
  });

  it("the per-person reminder path (the live monthly path) gates its triggers too", () => {
    expect(personScreen).toContain("applyQuietHoursToTrigger(trigger, quietPreferences)");
    expect(personScreen).toContain("trigger: gate({");
  });
});
