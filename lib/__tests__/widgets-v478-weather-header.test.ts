/**
 * v478 — the Daily Breakdown's weather header (his Nov 8 ask:
 * he likes the Google weather line at the top of his home
 * screen — At a Glance — and if the big breakdown widget can
 * work like that, he can do away with the Google one). The
 * feed is v472's store (prayercircle.weather.v1, the morning
 * pack's weather section — the same snapshot the Daily
 * Summary's temperature clause reads), carried through the
 * widget snapshot verbatim; the renderer decides the face
 * from the device clock, the Up Next pattern:
 *  - before 21:00, the snapshot's "now" for today:
 *    "{temp}° · {condition}";
 *  - before 21:00 with a stale/missing "now" but a forecast
 *    covering today: "Today · {high}° / {low}° · {condition}";
 *  - from 21:00: "Tomorrow · {high}° / {low}° · {condition}";
 *    (v484 re-pin: the evening turn stood at 18:00 through
 *    v483 — Jonathan moved it to 21:00 on Nov 9, after the
 *    header read Tomorrow at 18:44 with his evening still
 *    ahead of him. Faces between 18:00 and 20:59 are now
 *    the today faces; tomorrow's face begins at 21:00.)
 *  - a snapshot over 48h old, or covering neither needed
 *    date, never faces — no header, never a fabricated number.
 * The glyph is drawn in-process (weatherGlyphBitmap), mapped
 * from the condition's own words; colours are the palette's.
 * The header's cost is reserved off the seating budget FIRST;
 * the rows then seat whole or not at all, in their order.
 *
 * The Kotlin renderer cannot execute in this harness, so —
 * as in every widget round — behaviour is pinned on the pure
 * builder, and the renderer is pinned by source: the face
 * rules and their order, the staleness constant, the glyph
 * keyword map, the budget reservation and its arithmetic.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import type { StudyState } from "../bible-v205/study";
import { formatDateLocal } from "../date-utils";
import { addPerson, type Person } from "../prayercircle-data";
import type { PersonalFast } from "../prayercircle-fasting";
import type { ScheduleEvent, ScheduleMinistry, ScheduleTodo } from "../schedule-data";
import type { WeatherSnapshot } from "../weather-snapshot";
import {
  buildAllWidgetSnapshots,
  buildDailyBreakdownSnapshot,
  type DailyBreakdownWidgetSnapshot,
} from "../widget-snapshots";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const MODULE = "modules/expo-prayercircle-widgets";
const MODULE_ANDROID = `${MODULE}/android/src/main`;
const MODULE_KOTLIN = `${MODULE_ANDROID}/java/expo/modules/prayercirclewidgets`;

const renderer = read(`${MODULE_KOTLIN}/WidgetRenderer.kt`);
const layout = read(`${MODULE_ANDROID}/res/layout/widget_daily_breakdown.xml`);
const snapshotsSource = read("lib/widget-snapshots.ts");
const pushSource = read("lib/widget-push.tsx");
const indexSource = read("app/(tabs)/index.tsx");

/** The body of one renderer function, from its declaration to
 * the next top-level declaration (the house idiom). */
function rendererFn(name: string): string {
  const at = renderer.indexOf(`private fun ${name}`);
  expect(at, `${name} present`).toBeGreaterThan(-1);
  const rest = renderer.slice(at + 10);
  const next = rest.indexOf("\n  private fun ");
  return next < 0 ? rest : rest.slice(0, next);
}

/** A shipped Int constant, parsed from the renderer source
 * (the v470 pattern — traces re-derive if a constant moves). */
function shippedConstant(name: string): number {
  const match = renderer.match(new RegExp(`private val ${name} = (\\d+)`));
  expect(match, `${name} declared`).not.toBeNull();
  return Number(match?.[1]);
}

// The real clock, like every widget round: the breakdown's
// selectors read it themselves, so the fixtures live on it.
const NOW = new Date();
const DAY = formatDateLocal(NOW);
const TOMORROW = formatDateLocal(new Date(NOW.getTime() + 86400000));
const daysAgoIso = (days: number) => formatDateLocal(new Date(NOW.getTime() - days * 86400000));

function person(name: string, overrides: Partial<Person> = {}): Person {
  const base = addPerson([], name, "Family")[0];
  return { ...base, reminderFrequency: "daily", ...overrides };
}

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

/** The store's shape, as the morning pack delivers it:
 * prepared an hour ago, a "now" for today, forecasts
 * covering today and tomorrow. */
const WEATHER: WeatherSnapshot = {
  preparedAt: new Date(NOW.getTime() - 3600000).toISOString(),
  location: "Lancaster",
  now: { date: DAY, tempF: 64, condition: "Sunny" },
  days: [
    { date: DAY, highF: 76, lowF: 52, condition: "Sunny" },
    { date: TOMORROW, highF: 75, lowF: 51, condition: "Partly cloudy" },
  ],
};

function build(
  overrides: {
    people?: Person[];
    events?: ScheduleEvent[];
    todos?: ScheduleTodo[];
    ministries?: ScheduleMinistry[];
    fasts?: PersonalFast[];
    studyState?: StudyState;
    weather?: WeatherSnapshot | null;
  } = {},
): DailyBreakdownWidgetSnapshot {
  return buildDailyBreakdownSnapshot(
    overrides.people ?? [],
    overrides.events ?? [],
    overrides.todos ?? [],
    overrides.ministries ?? [],
    overrides.fasts ?? [FAST],
    overrides.studyState ?? EMPTY_STUDY,
    NOW,
    overrides.weather === undefined ? WEATHER : overrides.weather,
  );
}

// ─── 1. The snapshot — the weather section, verbatim ────────────────────────

describe("v478 Daily Breakdown weather — snapshot", () => {
  it("carries the store's snapshot through verbatim — preparedAt, now, days", () => {
    const snapshot = build({});
    if (snapshot.state !== "day") throw new Error("expected a day");
    expect(snapshot.weather).toEqual({
      preparedAt: WEATHER.preparedAt,
      now: { date: DAY, tempF: 64, condition: "Sunny" },
      days: [
        { date: DAY, highF: 76, lowF: 52, condition: "Sunny" },
        { date: TOMORROW, highF: 75, lowF: 51, condition: "Partly cloudy" },
      ],
    });
  });

  it("carries a forecast-only snapshot with now null, untouched", () => {
    const forecastOnly: WeatherSnapshot = { ...WEATHER, now: null };
    const snapshot = build({ weather: forecastOnly });
    if (snapshot.state !== "day") throw new Error("expected a day");
    expect(snapshot.weather?.now).toBeNull();
    expect(snapshot.weather?.days).toHaveLength(2);
  });

  it("the section is null when the store is empty — absent, never a placeholder", () => {
    const snapshot = build({ weather: null });
    if (snapshot.state !== "day") throw new Error("expected a day");
    expect(snapshot.weather).toBeNull();
    // And when no weather argument is handed in at all (every
    // pre-v478 caller), the section is null the same way.
    const legacy = buildDailyBreakdownSnapshot([], [], [], [], [FAST], EMPTY_STUDY, NOW);
    if (legacy.state !== "day") throw new Error("expected a day");
    expect(legacy.weather).toBeNull();
  });

  it("weather alone never stands the day — an empty day keeps the quiet face whole", () => {
    expect(buildDailyBreakdownSnapshot([], [], [], [], [], EMPTY_STUDY, NOW, WEATHER)).toEqual({
      state: "none",
    });
  });

  it("buildAllWidgetSnapshots hands the inputs' weather to the breakdown builder", () => {
    const snapshots = buildAllWidgetSnapshots({
      people: [person("Cody Friend")],
      fasts: [FAST],
      xpRaw: null,
      events: [],
      todos: [],
      ministries: [],
      studyState: EMPTY_STUDY,
      imports: {},
      resolveChapter: () => null,
      now: NOW,
      weather: WEATHER,
    });
    if (snapshots.dailyBreakdown.state !== "day") throw new Error("expected a day");
    expect(snapshots.dailyBreakdown.weather?.preparedAt).toBe(WEATHER.preparedAt);
    expect(snapshotsSource).toContain("input.weather ?? null");
  });

  it("the push layer loads the weather store and hands it to the builders", () => {
    expect(pushSource).toContain("loadWeatherSnapshot");
    expect(pushSource).toContain("weather: stores.weather");
    // The empty floor carries no weather either.
    expect(pushSource).toContain("weather: null,");
  });
});

// ─── 2. The refresh path — an applied pack updates the widget ───────────────

describe("v478 Daily Breakdown weather — refresh path", () => {
  it("a landed weather section in the manual import refreshes the widgets at once", () => {
    expect(indexSource).toContain("if (counts.weather > 0) void refreshAndPushWidgets();");
  });

  it("a Drive check that applied anything refreshes the widgets at once", () => {
    expect(indexSource).toContain("if (summary.applied > 0) void refreshAndPushWidgets();");
  });
});

// ─── 3. The renderer — the face rules ───────────────────────────────────────

describe("v478 Daily Breakdown weather — renderer faces", () => {
  const body = rendererFn("renderDailyBreakdown");
  const face = rendererFn("breakdownWeatherFace");

  it("the header face is computed from the snapshot's weather and the device clock", () => {
    expect(body).toContain('breakdownWeatherFace(snap.optJSONObject("weather"), nowMin)');
    expect(body).toContain(
      "views.setViewVisibility(R.id.db_weather, if (weatherFace != null) View.VISIBLE else View.GONE)",
    );
  });

  it("the face's colours are the palette's — glyph in primary, line in ink", () => {
    expect(body).toContain("weatherGlyphBitmap(weatherFace.glyph, pal.primary)");
    expect(body).toContain("views.setTextColor(R.id.db_weather_text, pal.ink)");
  });

  it("staleness: no stamp, no face — and nothing over 48 hours old faces", () => {
    expect(face).toContain('weatherPreparedMs(weather.optString("preparedAt")) ?: return null');
    expect(face).toContain("System.currentTimeMillis() - preparedMs > DB_WEATHER_MAX_AGE_MS");
    expect(renderer).toContain("private val DB_WEATHER_MAX_AGE_MS = 48L * 3600L * 1000L");
  });

  it("the day face: the snapshot's own now for today — \"{temp}° · {condition}\"", () => {
    expect(face).toContain('now.optString("date") == deviceDateIso()');
    expect(face).toContain('"${Math.round(now.optDouble("tempF"))}°"');
    // The temp composition stands BEHIND the date guard — a
    // "now" from the wrong day can never reach it.
    const guard = face.indexOf('now.optString("date") == deviceDateIso()');
    const temp = face.indexOf('"${Math.round(now.optDouble("tempF"))}°"');
    expect(guard).toBeGreaterThan(-1);
    expect(temp).toBeGreaterThan(guard);
  });

  it("the stale-now fallback: today's forecast, named Today, in high/low form", () => {
    expect(face).toContain('dayFace("Today", today)');
    expect(face).toContain("val today = dayFor(deviceDateIso()) ?: return null");
    // The fallback is reached only after the now face declined.
    expect(face.indexOf('dayFace("Today", today)')).toBeGreaterThan(
      face.indexOf('now.optString("date") == deviceDateIso()'),
    );
  });

  it("the evening face: from 21:00, tomorrow's high/low — and it outranks the day faces", () => {
    // v484 re-pin: the threshold was 18 * 60 through v483;
    // the turn now stands at 21:00, so the whole 18:00–20:59
    // stretch belongs to the daytime order above (curve,
    // then now, then the Today fallback).
    expect(face).toContain("if (nowMin >= 21 * 60)");
    expect(face).not.toContain("if (nowMin >= 18 * 60)");
    expect(face).toContain("val tomorrow = dayFor(deviceTomorrowIso()) ?: return null");
    expect(face).toContain('dayFace("Tomorrow", tomorrow)');
    expect(face.indexOf("if (nowMin >= 21 * 60)")).toBeLessThan(
      face.indexOf('now.optString("date") == deviceDateIso()'),
    );
    // The high/low composition both forecast faces share.
    expect(face).toContain(
      '"${Math.round(day.optDouble("highF"))}° / ${Math.round(day.optDouble("lowF"))}°"',
    );
  });

  it("a date the snapshot does not cover means no face — every branch can decline", () => {
    // dayFor finds nothing → the forecast faces return null;
    // there is no fallback text, no invented number anywhere.
    expect(face).toContain("if (day.optString(\"date\") == dateIso) return day");
    expect(face).not.toContain("Lancaster");
  });
});

// ─── 4. The glyph — keyword map and the drawn factory ───────────────────────

describe("v478 Daily Breakdown weather — glyph", () => {
  const kind = rendererFn("weatherGlyphKind");
  const glyph = rendererFn("weatherGlyphBitmap");

  it("the keyword map: every family, read off the condition's own words", () => {
    expect(kind).toContain('text.contains("thunder") || text.contains("storm") -> "storm"');
    expect(kind).toContain('text.contains("snow") -> "snow"');
    expect(kind).toContain(
      'text.contains("rain") || text.contains("drizzle") || text.contains("shower") -> "rain"',
    );
    expect(kind).toContain('text.contains("partly") -> "partly"');
    expect(kind).toContain(
      'text.contains("fog") || text.contains("haze") || text.contains("mist") -> "fog"',
    );
    expect(kind).toContain('text.contains("clear") || text.contains("sun") -> "sun"');
    expect(kind).toContain('text.contains("cloud") || text.contains("overcast") -> "cloud"');
    expect(kind).toContain('else -> "cloud"');
  });

  it("the order is the meaning: partly is read before the cloud it names", () => {
    expect(kind.indexOf('contains("partly")')).toBeLessThan(kind.indexOf('contains("cloud")'));
    expect(kind.indexOf('contains("thunder")')).toBeLessThan(kind.indexOf('contains("rain")'));
  });

  it("the glyphs are drawn in-process, one sun and one cloud doing the work", () => {
    expect(glyph).toContain("canvas.drawCircle");
    expect(glyph).toContain("canvas.drawLine");
    expect(glyph).toContain('"sun" -> sun(48f, 48f, 17f)');
    expect(glyph).toContain('"partly" -> {');
    expect(glyph).toContain('"rain" -> {');
    expect(glyph).toContain('"storm" -> {');
    expect(glyph).toContain('"snow" -> {');
    expect(glyph).toContain('"fog" -> {');
    expect(glyph).toContain("canvas.drawPath(bolt, fill)");
    expect(glyph).toContain("else -> cloud(48f, 48f, 1.1f)");
  });

  it("no pictographs anywhere in the weather path — drawn bitmaps only", () => {
    const pictographs = ["☀", "⛅", "🌦", "🌧", "🌩", "🌨", "🌫", "🌡", "❄", "⚡"];
    for (const mark of pictographs) {
      expect(renderer).not.toContain(mark);
      expect(snapshotsSource).not.toContain(mark);
      expect(layout).not.toContain(mark);
    }
  });
});

// ─── 5. The budget — the header's cost reserved first ───────────────────────

describe("v478 Daily Breakdown weather — budget", () => {
  const body = rendererFn("renderDailyBreakdown");

  it("the reservation stands before the walk, off the standing budget line", () => {
    expect(body).toContain("var remaining = minHeightDp - 36");
    expect(body).toContain("if (weatherFace != null) remaining -= DB_WEATHER_COST");
    // Reserved after the budget line opens and before the
    // seating walk runs over the present rows.
    expect(body.indexOf("remaining -= DB_WEATHER_COST")).toBeGreaterThan(
      body.indexOf("var remaining = minHeightDp - 36"),
    );
    expect(body.indexOf("remaining -= DB_WEATHER_COST")).toBeLessThan(
      body.indexOf("for (key in present)"),
    );
  });

  it("the cost is the layout's own measure: 2 + 22 + 8 = 32", () => {
    expect(shippedConstant("DB_WEATHER_COST")).toBe(32);
    const headerAt = layout.indexOf('@+id/db_weather"');
    const header = layout.slice(headerAt, layout.indexOf("<!-- PRAY", headerAt));
    expect(header).toContain('android:paddingTop="2dp"');
    expect(header).toContain('android:paddingBottom="8dp"');
    expect(header).toContain('android:id="@+id/db_weather_glyph"');
    expect(header).toContain('android:layout_height="22dp"');
    // 2 (top padding) + 22 (the glyph's line) + 8 (bottom
    // padding) — the constant is the layout, measured.
    expect(2 + 22 + 8).toBe(shippedConstant("DB_WEATHER_COST"));
  });

  it("at the provider's 210dp floor the reservation still seats PRAY", () => {
    const cost = shippedConstant("DB_WEATHER_COST");
    // 210 (floor) − 36 (chrome + safety) − 32 (header) = 142,
    // and a row seats at 64 — PRAY stands, whole.
    const remaining = 210 - 36 - cost;
    expect(remaining).toBe(142);
    expect(remaining).toBeGreaterThanOrEqual(64);
    // The rows below seat in order against what remains —
    // exactly two rows fit the floor with the header standing.
    expect(Math.floor(remaining / 64)).toBe(2);
  });

  it("the header is the list's first element, above PRAY", () => {
    const listAt = layout.indexOf('@+id/db_list"');
    const weatherAt = layout.indexOf('@+id/db_weather"');
    const prayAt = layout.indexOf('@+id/db_row_pray"');
    expect(weatherAt).toBeGreaterThan(listAt);
    expect(weatherAt).toBeLessThan(prayAt);
    // Standing default is GONE — the quiet face never shows
    // a header the renderer did not seat.
    const header = layout.slice(weatherAt, layout.indexOf("<!-- PRAY", weatherAt));
    expect(header).toContain('android:visibility="gone"');
  });
});
