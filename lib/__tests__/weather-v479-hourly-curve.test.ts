/**
 * v479 — the hourly weather curve (Jonathan, Nov 9: "There's
 * no way to make the weather change throughout the day at
 * points? In the widget and app?"). The morning pack's
 * weather section gains an OPTIONAL "hourly" array — one
 * entry per hour for the pack's today and tomorrow
 * ({ at: "YYYY-MM-DDTHH:00", tempF, condition }, Lancaster
 * local time) — and both readers step through it by the
 * clock instead of holding the pack morning's frozen "now":
 *  - the Daily Summary's clause (lib/weather-snapshot.ts)
 *    speaks the curve's point for the device's current hour
 *    when the viewed day is the device's today;
 *  - the Daily Breakdown's header (the Kotlin renderer,
 *    v478) prefers the same point in its daytime face.
 * The lookup is ONE definition (weatherCurvePoint in
 * lib/weather-snapshot.ts; breakdownCurvePoint in the
 * renderer mirrors it): same date only, the greatest hour
 * at or before the asked hour, and only while that entry
 * is at most 3 hours old. A pack WITHOUT hourly — every
 * pack shipped before this — behaves exactly as v478 in
 * both readers; the field is additive, never required.
 *
 * The Kotlin renderer cannot execute in this harness, so —
 * as in every widget round — the TS side is pinned by
 * behaviour and the renderer by source: the mirrored
 * lookup, its seat in the face's order, and the v478 rules
 * standing untouched around it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// ─── The store tests run against an in-memory AsyncStorage ───
const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
    removeItem: vi.fn(async (k: string) => { store.delete(k); }),
    multiRemove: vi.fn(async (ks: string[]) => { ks.forEach((k) => store.delete(k)); }),
    clear: vi.fn(async () => { store.clear(); }),
  },
}));

import type { StudyState } from "../bible-v205/study";
import { parseStudioFileFull } from "../bible-v205/studio-import";
import { formatDateLocal } from "../date-utils";
import type { PersonalFast } from "../prayercircle-fasting";
import {
  loadWeatherSnapshot,
  parseWeatherSnapshot,
  storeWeatherSnapshotForwardOnly,
  weatherCurvePoint,
  weatherSummaryClause,
  type WeatherSnapshot,
} from "../weather-snapshot";
import {
  buildDailyBreakdownSnapshot,
  type DailyBreakdownWidgetSnapshot,
} from "../widget-snapshots";

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_KOTLIN = `${MODULE}/android/src/main/java/expo/modules/prayercirclewidgets`;
const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);

/** The body of one renderer function, from its declaration to
 * the next top-level declaration (the house idiom). */
function rendererFn(name: string): string {
  const at = renderer.indexOf(`private fun ${name}`);
  expect(at, `${name} present`).toBeGreaterThan(-1);
  const rest = renderer.slice(at + 10);
  const next = rest.indexOf("\n  private fun ");
  return next < 0 ? rest : rest.slice(0, next);
}

beforeEach(() => {
  store.clear();
});

/* ------------------------------ fixtures ------------------------------ */

// The pack morning: Monday Nov 9, 2026. The "now" is 51° at
// pack time; the curve climbs 51 → 56 → 61 → 67 … — every
// figure distinct, so a test can tell WHICH source spoke.
const weatherSection = {
  preparedAt: "2026-11-09T08:05:00-08:00",
  location: "Lancaster",
  now: { date: "2026-11-09", tempF: 51, condition: "Partly cloudy" },
  days: [
    { date: "2026-11-09", highF: 76, lowF: 43, condition: "Partly cloudy" },
    { date: "2026-11-10", highF: 77, lowF: 45, condition: "Sunny" },
  ],
  hourly: [
    { at: "2026-11-09T06:00", tempF: 48, condition: "Partly cloudy" },
    { at: "2026-11-09T08:00", tempF: 51, condition: "Partly cloudy" },
    { at: "2026-11-09T09:00", tempF: 56, condition: "Partly cloudy" },
    { at: "2026-11-09T10:00", tempF: 61, condition: "" },
    { at: "2026-11-09T14:00", tempF: 74, condition: "Sunny" },
    { at: "2026-11-10T08:00", tempF: 52, condition: "Sunny" },
  ],
};

const snapshot: WeatherSnapshot = {
  preparedAt: weatherSection.preparedAt,
  location: "Lancaster",
  now: { ...weatherSection.now },
  days: weatherSection.days.map((d) => ({ ...d })),
  hourly: weatherSection.hourly.map((e) => ({ ...e })),
};

/* ------------------------------ the door ------------------------------ */

describe("v479 the door accepts the hourly curve, entry by entry", () => {
  it("a pack carrying hourly validates whole — the curve rides the plan verbatim", () => {
    const plan = parseStudioFileFull({ weather: weatherSection });
    expect(plan.weather).toEqual(snapshot);
  });

  it("a pack WITHOUT hourly validates exactly as v478 — no curve key is invented", () => {
    const { hourly: _dropped, ...withoutCurve } = weatherSection;
    const plan = parseStudioFileFull({ weather: withoutCurve });
    expect(plan.weather).toEqual({
      preparedAt: weatherSection.preparedAt,
      location: "Lancaster",
      now: weatherSection.now,
      days: weatherSection.days,
    });
    expect(plan.weather && "hourly" in plan.weather).toBe(false);
  });

  it("malformed entries drop singly — bad stamps, off-clock hours, fractional temps, junk rows — while their neighbours survive", () => {
    const plan = parseStudioFileFull({
      weather: {
        ...weatherSection,
        hourly: [
          { at: "2026-11-09T08:00", tempF: 51, condition: "Partly cloudy" },
          { at: "2026-11-09 09:00", tempF: 56, condition: "Sunny" }, // no T
          { at: "2026-11-09T09:30", tempF: 57, condition: "Sunny" }, // off the hour
          { at: "2026-11-09T24:00", tempF: 58, condition: "Sunny" }, // off the clock
          { at: "2026-11-09T10:00", tempF: 61.5, condition: "Sunny" }, // not an integer
          { at: "2026-11-09T11:00", tempF: "62", condition: "Sunny" }, // not a number
          "not an entry",
          { at: "2026-11-09T12:00", tempF: 67, condition: "Sunny" },
        ],
      },
    });
    expect(plan.weather?.hourly).toEqual([
      { at: "2026-11-09T08:00", tempF: 51, condition: "Partly cloudy" },
      { at: "2026-11-09T12:00", tempF: 67, condition: "Sunny" },
    ]);
    // The section around the dropped entries stands whole.
    expect(plan.weather?.now).toEqual(weatherSection.now);
    expect(plan.weather?.days).toHaveLength(2);
  });

  it("an entry whose condition is not a string drops alone; a missing condition reads blank", () => {
    const plan = parseStudioFileFull({
      weather: {
        ...weatherSection,
        hourly: [
          { at: "2026-11-09T08:00", tempF: 51, condition: 42 },
          { at: "2026-11-09T09:00", tempF: 56 },
        ],
      },
    });
    expect(plan.weather?.hourly).toEqual([
      { at: "2026-11-09T09:00", tempF: 56, condition: "" },
    ]);
  });

  it("an entirely malformed curve is no curve at all — the section still validates and applies", () => {
    const plan = parseStudioFileFull({
      weather: {
        ...weatherSection,
        hourly: [{ at: "soon", tempF: 51 }, { at: "2026-11-09T08:00", tempF: 51.25 }],
      },
    });
    expect(plan.weather).not.toBeNull();
    expect(plan.weather && "hourly" in plan.weather).toBe(false);
    expect(plan.weather?.now).toEqual(weatherSection.now);
  });

  it("an hourly that is not a list at all is structural garbage — the file fails, like the days list", () => {
    expect(() =>
      parseStudioFileFull({ weather: { ...weatherSection, hourly: "all day" } }),
    ).toThrow();
  });

  it("the stored snapshot round-trips the curve through the forward-only write", async () => {
    expect(await storeWeatherSnapshotForwardOnly(snapshot)).toBe(true);
    expect(await loadWeatherSnapshot()).toEqual(snapshot);
    // And a curve-less snapshot stored the old way reads back
    // with no curve — old stores are untouched by the field.
    store.clear();
    const { hourly: _dropped, ...withoutCurve } = snapshot;
    expect(await storeWeatherSnapshotForwardOnly(withoutCurve)).toBe(true);
    const readBack = await loadWeatherSnapshot();
    expect(readBack).toEqual(withoutCurve);
    expect(readBack && "hourly" in readBack).toBe(false);
  });

  it("the tolerant store parser drops malformed entries singly too — garbage in the store never kills the curve's good hours", () => {
    const parsed = parseWeatherSnapshot(JSON.stringify({
      ...weatherSection,
      hourly: [
        { at: "2026-11-09T08:00", tempF: 51, condition: "Partly cloudy" },
        { at: "garbage", tempF: 99, condition: "Sunny" },
        { at: "2026-11-09T09:00", tempF: 56.5, condition: "Sunny" },
        { at: "2026-11-09T10:00", tempF: 61, condition: "Sunny" },
      ],
    }));
    expect(parsed?.hourly).toEqual([
      { at: "2026-11-09T08:00", tempF: 51, condition: "Partly cloudy" },
      { at: "2026-11-09T10:00", tempF: 61, condition: "Sunny" },
    ]);
  });
});

/* ------------------------------ the lookup ------------------------------ */

describe("v479 the one curve lookup — weatherCurvePoint", () => {
  it("the greatest hour at or before the asked hour speaks", () => {
    expect(weatherCurvePoint(snapshot, "2026-11-09", 8)).toEqual({
      tempF: 51,
      condition: "Partly cloudy",
    });
    // 11 has no entry of its own — 10's point carries it.
    expect(weatherCurvePoint(snapshot, "2026-11-09", 11)).toEqual({
      tempF: 61,
      condition: "Partly cloudy",
    });
    expect(weatherCurvePoint(snapshot, "2026-11-09", 14)).toEqual({
      tempF: 74,
      condition: "Sunny",
    });
  });

  it("an entry for a later hour never speaks early", () => {
    // The day's first entry is 06:00 — at 05:00 the curve is silent.
    expect(weatherCurvePoint(snapshot, "2026-11-09", 5)).toBeNull();
  });

  it("same date only — tomorrow's hours never speak for today, nor today's for tomorrow", () => {
    expect(weatherCurvePoint(snapshot, "2026-11-10", 9)).toEqual({
      tempF: 52,
      condition: "Sunny",
    });
    expect(weatherCurvePoint(snapshot, "2026-11-11", 9)).toBeNull();
    // Today's last entry (14:00) is not consulted for the 10th.
    expect(weatherCurvePoint(snapshot, "2026-11-10", 7)).toBeNull();
  });

  it("the 3-hour freshness window: 3 hours old speaks, 4 is the morning talking about the afternoon", () => {
    // The 14:00 entry at 17:00 is exactly 3 hours old — speaks.
    expect(weatherCurvePoint(snapshot, "2026-11-09", 17)).toEqual({
      tempF: 74,
      condition: "Sunny",
    });
    // At 18:00 it is 4 hours old — silent.
    expect(weatherCurvePoint(snapshot, "2026-11-09", 18)).toBeNull();
  });

  it("a blank entry condition falls back to the day's own condition", () => {
    // The 10:00 entry carries "" — the day's "Partly cloudy" speaks.
    expect(weatherCurvePoint(snapshot, "2026-11-09", 10)?.condition).toBe("Partly cloudy");
    // An entry with its own condition keeps it.
    expect(weatherCurvePoint(snapshot, "2026-11-09", 14)?.condition).toBe("Sunny");
  });

  it("no curve, no point — a pre-v479 snapshot and an empty store both read null", () => {
    const { hourly: _dropped, ...withoutCurve } = snapshot;
    expect(weatherCurvePoint(withoutCurve, "2026-11-09", 10)).toBeNull();
    expect(weatherCurvePoint(null, "2026-11-09", 10)).toBeNull();
    expect(weatherCurvePoint({ ...snapshot, hourly: [] }, "2026-11-09", 10)).toBeNull();
  });
});

/* ------------------------------ the summary ------------------------------ */

describe("v479 the summary clause steps through the day", () => {
  const deviceAt = (hour: number) => ({ date: "2026-11-09", hour });

  it("today, at an hour the curve covers, the clause speaks the curve's temp — not the frozen now", () => {
    // The now says 51; by 10 the curve says 61, and 61 is
    // what the summary must read.
    expect(weatherSummaryClause(snapshot, "2026-11-09", deviceAt(10))).toBe(
      "It's\u00A061°\u00A0in\u00A0Lancaster",
    );
    expect(weatherSummaryClause(snapshot, "2026-11-09", deviceAt(8))).toBe(
      "It's\u00A051°\u00A0in\u00A0Lancaster",
    );
    expect(weatherSummaryClause(snapshot, "2026-11-09", deviceAt(14))).toBe(
      "It's\u00A074°\u00A0in\u00A0Lancaster",
    );
  });

  it("when the curve's last point goes stale, the clause falls back to the v472 now form", () => {
    // 20:00 — the freshest entry (14:00) is 6 hours old, so
    // the snapshot's now speaks, exactly as v472 composed it.
    expect(weatherSummaryClause(snapshot, "2026-11-09", deviceAt(20))).toBe(
      "It's\u00A051°\u00A0in\u00A0Lancaster",
    );
    // Before the curve's first hour, the same fallback holds.
    expect(weatherSummaryClause(snapshot, "2026-11-09", deviceAt(5))).toBe(
      "It's\u00A051°\u00A0in\u00A0Lancaster",
    );
  });

  it("the curve only speaks for the device's own today — a viewed tomorrow keeps its forecast form", () => {
    expect(weatherSummaryClause(snapshot, "2026-11-10", deviceAt(10))).toBe(
      "77°\u00A0/\u00A045°\u00A0in\u00A0Lancaster",
    );
  });

  it("without a device moment the clause is v472 whole — the curve never speaks uninvited", () => {
    expect(weatherSummaryClause(snapshot, "2026-11-09")).toBe(
      "It's\u00A051°\u00A0in\u00A0Lancaster",
    );
  });

  it("a curve-less snapshot under a device moment behaves exactly as v478", () => {
    const { hourly: _dropped, ...withoutCurve } = snapshot;
    expect(weatherSummaryClause(withoutCurve, "2026-11-09", deviceAt(10))).toBe(
      "It's\u00A051°\u00A0in\u00A0Lancaster",
    );
    expect(weatherSummaryClause(withoutCurve, "2026-11-10", deviceAt(10))).toBe(
      "77°\u00A0/\u00A045°\u00A0in\u00A0Lancaster",
    );
  });

  it("schedule-tab hands the Schedule clock to the clause", () => {
    const scheduleTab = read("components/schedule-tab.tsx");
    expect(scheduleTab).toContain("date: formatDateLocal(clockNow),");
    expect(scheduleTab).toContain("hour: clockNow.getHours(),");
  });
});

/* --------------------------- the widget snapshot --------------------------- */

// The real clock, like every widget round: the breakdown's
// selectors read it themselves, so the fixtures live on it.
const NOW = new Date();
const DAY = formatDateLocal(NOW);
const TOMORROW = formatDateLocal(new Date(NOW.getTime() + 86400000));
const daysAgoIso = (days: number) => formatDateLocal(new Date(NOW.getTime() - days * 86400000));

const EMPTY_STUDY: StudyState = {
  overrides: {},
  reads: {},
  writeQueue: [],
  restudyQueue: [],
  currentBook: null,
  lastRead: null,
};

const FAST: PersonalFast = {
  id: "fast-1",
  name: "365-Day Growth Fast",
  startDate: daysAgoIso(309),
  durationDays: 365,
  type: "growth" as PersonalFast["type"],
  focusItems: [],
  dayStatuses: {},
  createdAt: daysAgoIso(309),
};

const WIDGET_WEATHER: WeatherSnapshot = {
  preparedAt: new Date(NOW.getTime() - 3600000).toISOString(),
  location: "Lancaster",
  now: { date: DAY, tempF: 51, condition: "Partly cloudy" },
  days: [
    { date: DAY, highF: 76, lowF: 43, condition: "Partly cloudy" },
    { date: TOMORROW, highF: 77, lowF: 45, condition: "Sunny" },
  ],
  hourly: [
    { at: `${DAY}T08:00`, tempF: 51, condition: "Partly cloudy" },
    { at: `${DAY}T14:00`, tempF: 74, condition: "Sunny" },
    { at: `${TOMORROW}T08:00`, tempF: 52, condition: "Sunny" },
  ],
};

function buildWidget(weather: WeatherSnapshot | null): DailyBreakdownWidgetSnapshot {
  return buildDailyBreakdownSnapshot([], [], [], [], [FAST], EMPTY_STUDY, NOW, weather);
}

describe("v479 the breakdown snapshot carries the curve verbatim", () => {
  it("the hourly array rides through untouched — at, tempF, condition", () => {
    const snap = buildWidget(WIDGET_WEATHER);
    if (snap.state !== "day") throw new Error("expected a day");
    expect(snap.weather?.hourly).toEqual(WIDGET_WEATHER.hourly);
  });

  it("a curve-less store snapshot produces the v478 section byte-for-byte — no hourly key", () => {
    const { hourly: _dropped, ...withoutCurve } = WIDGET_WEATHER;
    const snap = buildWidget(withoutCurve);
    if (snap.state !== "day") throw new Error("expected a day");
    expect(snap.weather).toEqual({
      preparedAt: withoutCurve.preparedAt,
      now: { date: DAY, tempF: 51, condition: "Partly cloudy" },
      days: [
        { date: DAY, highF: 76, lowF: 43, condition: "Partly cloudy" },
        { date: TOMORROW, highF: 77, lowF: 45, condition: "Sunny" },
      ],
    });
    expect(snap.weather && "hourly" in snap.weather).toBe(false);
  });
});

/* --------------------------- the widget renderer --------------------------- */

describe("v479 the breakdown renderer mirrors the lookup", () => {
  const face = rendererFn("breakdownWeatherFace");
  const curve = rendererFn("breakdownCurvePoint");

  it("the mirror reads the curve off the snapshot, by date part and hour, string-wise", () => {
    expect(curve).toContain('weather.optJSONArray("hourly") ?: return null');
    expect(curve).toContain("at.substring(0, 10) != dateIso");
    expect(curve).toContain("at.substring(11, 13).toIntOrNull()");
    expect(curve).toContain("if (entryHour > hour) continue");
    expect(curve).toContain("if (entryHour > bestHour)");
  });

  it("the mirror keeps the same 3-hour freshness window and the day-condition fallback", () => {
    expect(curve).toContain("if (bestHour < 0 || hour - bestHour > 3) return null");
    expect(curve).toContain("if (bestCondition.isNotBlank()) bestCondition else dayCondition");
  });

  it("the curve speaks in the daytime face — after the evening turn, before the now", () => {
    const eveningAt = face.indexOf("if (nowMin >= 18 * 60)");
    const curveAt = face.indexOf("breakdownCurvePoint(");
    const nowAt = face.indexOf('now.optString("date") == deviceDateIso()');
    expect(eveningAt).toBeGreaterThan(-1);
    expect(curveAt).toBeGreaterThan(eveningAt);
    expect(nowAt).toBeGreaterThan(curveAt);
    // And the staleness gate still stands ahead of them all.
    expect(face.indexOf("System.currentTimeMillis() - preparedMs > DB_WEATHER_MAX_AGE_MS"))
      .toBeLessThan(curveAt);
  });

  it("the curve is asked for the device's date and the device hour, with the day's condition as its fallback", () => {
    expect(face).toContain("nowMin / 60");
    expect(face).toContain('dayFor(deviceDateIso())?.optString("condition")?.trim() ?: ""');
  });

  it("the curve face wears the daytime dress — \"{temp}° · {condition}\" through the glyph map", () => {
    expect(face).toContain('"${Math.round(curve.first)}°"');
    expect(face).toContain("weatherGlyphKind(curve.second)");
  });

  it("with no curve point the v478 order stands whole — now face, then the Today fallback", () => {
    const guard = face.indexOf('now.optString("date") == deviceDateIso()');
    const fallback = face.indexOf('dayFace("Today", today)');
    expect(guard).toBeGreaterThan(-1);
    expect(fallback).toBeGreaterThan(guard);
    // The curve can only decline (return null and fall
    // through) — it never fabricates a face of its own.
    expect(curve).toContain("?: return null");
    expect(face).not.toContain("Lancaster");
  });

  it("the live Open-Meteo fetch stays out of both readers — the pack is the only source", () => {
    const snapshotSource = read("lib/weather-snapshot.ts");
    expect(snapshotSource).not.toContain('from "./weather"');
    expect(snapshotSource).not.toContain("fetch(");
    const snapshots = read("lib/widget-snapshots.ts");
    expect(snapshots).not.toContain("open-meteo");
    expect(snapshots).not.toContain('from "./weather"');
    expect(renderer).not.toContain("open-meteo");
  });
});
