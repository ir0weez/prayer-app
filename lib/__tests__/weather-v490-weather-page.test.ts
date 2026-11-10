import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

import { parseStudioFileFull } from "../bible-v205/studio-import";
import { keywordPageKindForEvent, keywordPagePath } from "../keyword-pages";
import { allPaperSceneIds, paperSceneIdFor } from "../paper-keywords";
import { detectEventKeyword } from "../schedule-data";
import {
  parseWeatherSnapshotValue,
  type WeatherSnapshot,
} from "../weather-snapshot";
import {
  formatHourLabel,
  resolveWeatherHero,
  weatherDayLabels,
  weatherDaysExtent,
  weatherDaysInOrder,
  weatherDetailRows,
  weatherGlyphKind,
  weatherHourRail,
  weatherPreparedStamp,
  weatherRangeSpan,
} from "../weather-page";

// v490 — the Weather keyword event + weather page (Jonathan,
// Nov 10: a "Weather" / "Temperature" event wearing the first
// Weather artwork — sun, clouds, hills, no thermometer — and
// opening a page with "a detailed look at all days weather").
// Concept 1 as first drawn, with the extra information folded
// into its language: the details the pack carries, tomorrow's
// hours, and the days running to the pack's full ten.

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

const PACK_NOW = "2026-11-10T08:04:00-08:00";

function weatherSection(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    preparedAt: PACK_NOW,
    location: "Lancaster",
    now: { date: "2026-11-10", tempF: 50, condition: "Sunny" },
    days: [
      { date: "2026-11-10", highF: 76, lowF: 41, condition: "Sunny" },
      { date: "2026-11-11", highF: 77, lowF: 47, condition: "Sunny" },
    ],
    ...extra,
  };
}

describe("v490 — the keyword registration", () => {
  it("both titles detect to their own labels over the shared scene", () => {
    expect(detectEventKeyword("Weather")?.label).toBe("Weather");
    expect(detectEventKeyword("Temperature")?.label).toBe("Temperature");
    expect(paperSceneIdFor("Weather")).toBe("weather");
    expect(paperSceneIdFor("Temperature")).toBe("weather");
    expect(allPaperSceneIds()).toContain("weather");
  });

  it("every dialect registry carries the weather scene", () => {
    expect(read("components/paper-keyword-scenes.tsx")).toContain('"weather": PaperWeatherScene');
    expect(read("components/paper-keyword-scenes.tsx")).toContain("export function PaperWeatherScene()");
    expect(read("components/pixel-keyword-scenes.tsx")).toContain('"weather": PixelWeatherScene');
    expect(read("components/pixel-scenes-labels.tsx")).toContain("export function PixelWeatherScene()");
    expect(read("components/terminal-keyword-scenes.tsx")).toContain('"weather": TermWeatherScene');
    expect(read("components/terminal-scenes-labels.tsx")).toContain("export function TermWeatherScene()");
  });

  it("the classic dispatch and the door claim both know the titles", () => {
    const tab = read("components/schedule-tab.tsx");
    expect(tab).toContain('case "Weather": return <WeatherScene />;');
    expect(tab).toContain('case "Temperature": return <WeatherScene />;');
    expect(keywordPageKindForEvent({ keyword: "Weather", title: "Anything" })).toBe("weather");
    expect(keywordPageKindForEvent({ keyword: "Temperature", title: "Anything" })).toBe("weather");
    expect(keywordPageKindForEvent({ title: "Weather" })).toBe("weather");
    expect(keywordPageKindForEvent({ title: "Temperature at 8" })).toBe("weather");
    expect(keywordPageKindForEvent({ title: "Evening" }, "Temperature")).toBe("weather");
    // A stored non-weather keyword still wins outright, and a
    // mid-title mention is not a door (the other doors' rules).
    expect(keywordPageKindForEvent({ keyword: "Church", title: "Weather" })).toBeNull();
    expect(keywordPageKindForEvent({ title: "My weather notes" })).toBeNull();
    expect(keywordPagePath("weather")).toBe("/weather");
  });

  it("no thermometer in any rendition — the ruling, pinned", () => {
    for (const rel of [
      "components/paper-keyword-scenes.tsx",
      "components/pixel-scenes-labels.tsx",
      "components/terminal-scenes-labels.tsx",
    ]) {
      const src = read(rel);
      const sceneStart = src.indexOf("WeatherScene()");
      expect(sceneStart).toBeGreaterThan(-1);
      const scene = src.slice(sceneStart, sceneStart + 2200);
      expect(scene.toLowerCase()).not.toContain("thermometer");
    }
  });
});

describe("v490 — the validator takes the extended section", () => {
  it("details and a ten-day list land whole, rain chances riding", () => {
    const days = Array.from({ length: 10 }, (_, i) => ({
      date: `2026-11-${String(10 + i).padStart(2, "0")}`,
      highF: 70 + i,
      lowF: 40 + i,
      condition: "Sunny",
      ...(i === 0 ? { precipChancePct: 0 } : {}),
      ...(i === 3 ? { precipChancePct: 20 } : {}),
    }));
    const plan = parseStudioFileFull({
      weather: weatherSection({
        days,
        details: {
          date: "2026-11-10",
          feelsLikeF: 65,
          precipChancePct: 0,
          windMph: 6,
          windDir: "W",
          humidityPct: 28,
          uvIndex: 4,
          uvLabel: "Moderate",
          sunrise: "6:24 AM",
          sunset: "4:49 PM",
        },
      }),
    });
    expect(plan.weather?.days).toHaveLength(10);
    expect(plan.weather?.days[0].precipChancePct).toBe(0);
    expect(plan.weather?.days[3].precipChancePct).toBe(20);
    expect(plan.weather?.days[1].precipChancePct).toBeUndefined();
    expect(plan.weather?.details).toEqual({
      date: "2026-11-10",
      feelsLikeF: 65,
      precipChancePct: 0,
      windMph: 6,
      windDir: "W",
      humidityPct: 28,
      uvIndex: 4,
      uvLabel: "Moderate",
      sunrise: "6:24 AM",
      sunset: "4:49 PM",
    });
  });

  it("a malformed details field drops alone; the block and section stand", () => {
    const plan = parseStudioFileFull({
      weather: weatherSection({
        details: {
          date: "2026-11-10",
          feelsLikeF: "hot",
          windMph: 6,
          sunrise: "6:24 AM",
        },
      }),
    });
    expect(plan.weather?.details).toEqual({
      date: "2026-11-10",
      windMph: 6,
      sunrise: "6:24 AM",
    });
    expect(plan.weather?.now?.tempF).toBe(50);
  });

  it("a details block with no readable date is simply absent — never a refusal", () => {
    const plan = parseStudioFileFull({
      weather: weatherSection({ details: { feelsLikeF: 65 } }),
    });
    expect(plan.weather?.details).toBeUndefined();
    expect(plan.weather?.days).toHaveLength(2);
    const junk = parseStudioFileFull({
      weather: weatherSection({ details: "a string, not a block" }),
    });
    expect(junk.weather?.details).toBeUndefined();
  });

  it("a malformed day rain chance drops alone; the day stands", () => {
    const plan = parseStudioFileFull({
      weather: weatherSection({
        days: [
          { date: "2026-11-10", highF: 76, lowF: 41, condition: "Sunny", precipChancePct: "0%" },
        ],
      }),
    });
    expect(plan.weather?.days).toHaveLength(1);
    expect(plan.weather?.days[0].precipChancePct).toBeUndefined();
  });

  it("a pack without details validates exactly as before — no details key", () => {
    const plan = parseStudioFileFull({ weather: weatherSection() });
    expect(plan.weather).toBeDefined();
    expect(plan.weather?.details).toBeUndefined();
    expect("details" in (plan.weather as object)).toBe(false);
    // And the store parser round-trips the extension.
    const stored = parseWeatherSnapshotValue({
      preparedAt: PACK_NOW,
      location: "Lancaster",
      now: { date: "2026-11-10", tempF: 50, condition: "Sunny" },
      days: [{ date: "2026-11-10", highF: 76, lowF: 41, condition: "Sunny", precipChancePct: 10 }],
      details: { date: "2026-11-10", humidityPct: 28 },
    });
    expect(stored?.days[0].precipChancePct).toBe(10);
    expect(stored?.details).toEqual({ date: "2026-11-10", humidityPct: 28 });
  });
});

describe("v490 — the page's pure halves", () => {
  it("the glyph order is the widget's: thunder > snow > rain > partly > fog > sun > cloud", () => {
    expect(weatherGlyphKind("Thunderstorm")).toBe("storm");
    expect(weatherGlyphKind("Snow showers")).toBe("snow");
    expect(weatherGlyphKind("Light rain")).toBe("rain");
    expect(weatherGlyphKind("Drizzle")).toBe("rain");
    expect(weatherGlyphKind("Partly cloudy")).toBe("partly");
    expect(weatherGlyphKind("Fog")).toBe("fog");
    expect(weatherGlyphKind("Haze")).toBe("fog");
    expect(weatherGlyphKind("Sunny")).toBe("sun");
    expect(weatherGlyphKind("Clear")).toBe("sun");
    expect(weatherGlyphKind("Mostly cloudy")).toBe("cloud");
    expect(weatherGlyphKind("Overcast")).toBe("cloud");
    expect(weatherGlyphKind("")).toBe("cloud");
  });

  it("the hero: the blended curve speaks first, then now, then the day's form", () => {
    const base: WeatherSnapshot = {
      preparedAt: PACK_NOW,
      location: "Lancaster",
      now: { date: "2026-11-10", tempF: 50, condition: "Sunny" },
      days: [{ date: "2026-11-10", highF: 76, lowF: 41, condition: "Sunny" }],
      hourly: [
        { at: "2026-11-10T08:00", tempF: 48, condition: "Sunny" },
        { at: "2026-11-10T11:00", tempF: 66, condition: "Clear" },
      ],
    };
    const blended = resolveWeatherHero(base, { date: "2026-11-10", hour: 10, minute: 30 });
    expect(blended?.form).toBe("current");
    if (blended?.form === "current") {
      expect(blended.tempF).toBe(63); // 48 + 18 × 150/180, the v488 blend
      expect(blended.condition).toBe("Clear"); // the nearer point
      expect(blended.day?.highF).toBe(76);
    }
    const noCurve: WeatherSnapshot = { ...base, hourly: undefined };
    const fromNow = resolveWeatherHero(noCurve, { date: "2026-11-10", hour: 10, minute: 30 });
    expect(fromNow?.form).toBe("current");
    if (fromNow?.form === "current") expect(fromNow.tempF).toBe(50);
    const dayOnly: WeatherSnapshot = { ...noCurve, now: null };
    expect(resolveWeatherHero(dayOnly, { date: "2026-11-10", hour: 10, minute: 30 })?.form).toBe("day");
    expect(resolveWeatherHero(dayOnly, { date: "2026-11-12", hour: 10, minute: 30 })).toBeNull();
    expect(resolveWeatherHero(null, { date: "2026-11-10", hour: 10, minute: 30 })).toBeNull();
  });

  it("the rails split by date, sort by hour, and label the clock", () => {
    const snapshot: WeatherSnapshot = {
      preparedAt: PACK_NOW,
      location: "Lancaster",
      now: null,
      days: [],
      hourly: [
        { at: "2026-11-10T11:00", tempF: 66, condition: "Clear" },
        { at: "2026-11-10T08:00", tempF: 48, condition: "Sunny" },
        { at: "2026-11-11T08:00", tempF: 54, condition: "Sunny" },
      ],
    };
    const today = weatherHourRail(snapshot, "2026-11-10");
    expect(today.map((c) => c.hour)).toEqual([8, 11]);
    expect(today[0].label).toBe("8 AM");
    expect(today[1].kind).toBe("sun");
    expect(weatherHourRail(snapshot, "2026-11-11")).toHaveLength(1);
    expect(weatherHourRail(snapshot, "2026-11-12")).toEqual([]);
    expect(formatHourLabel(0)).toBe("12 AM");
    expect(formatHourLabel(12)).toBe("12 PM");
    expect(formatHourLabel(13)).toBe("1 PM");
    expect(formatHourLabel(23)).toBe("11 PM");
  });

  it("the range bars scale across the days shown, flat extent full-width", () => {
    const days = [
      { date: "2026-11-10", highF: 76, lowF: 41, condition: "Sunny" },
      { date: "2026-11-11", highF: 77, lowF: 47, condition: "Sunny" },
      { date: "2026-11-12", highF: 73, lowF: 49, condition: "Sunny" },
    ];
    const extent = weatherDaysExtent(days);
    expect(extent).toEqual({ minLow: 41, maxHigh: 77 });
    const span = weatherRangeSpan(days[2], extent!);
    expect(span.leftPct).toBeCloseTo(((49 - 41) / 36) * 100, 5);
    expect(span.widthPct).toBeCloseTo(((73 - 49) / 36) * 100, 5);
    const flat = weatherRangeSpan(days[0], { minLow: 50, maxHigh: 50 });
    expect(flat).toEqual({ leftPct: 0, widthPct: 100 });
    expect(weatherDaysExtent([])).toBeNull();
    // The page promises date order even if a store kept another.
    const unordered: WeatherSnapshot = {
      preparedAt: PACK_NOW,
      location: "Lancaster",
      now: null,
      days: [days[2], days[0], days[1]],
    };
    expect(weatherDaysInOrder(unordered).map((d) => d.date)).toEqual([
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
    ]);
    expect(weatherDayLabels("2026-11-10", "2026-11-10").name).toBe("Today");
    expect(weatherDayLabels("2026-11-11", "2026-11-10")).toEqual({ name: "Wed", sub: "Nov 11" });
  });

  it("the details rows: only the fields carried, in the page's order", () => {
    const rows = weatherDetailRows({
      date: "2026-11-10",
      feelsLikeF: 65,
      precipChancePct: 0,
      windMph: 6,
      windDir: "W",
      humidityPct: 28,
      uvIndex: 4,
      uvLabel: "Moderate",
      sunrise: "6:24 AM",
      sunset: "4:49 PM",
    });
    expect(rows.map((r) => r.label)).toEqual([
      "Feels like",
      "Rain",
      "Wind",
      "Humidity",
      "UV",
      "Sunrise",
      "Sunset",
    ]);
    expect(rows[0].value).toBe("65°");
    expect(rows[1].value).toBe("0%");
    expect(rows[2].value).toBe("6 mph W");
    expect(rows[4].value).toBe("4 · Moderate");
    expect(weatherDetailRows({ date: "2026-11-10", windMph: 3 })).toEqual([
      { key: "wind", label: "Wind", value: "3 mph" },
    ]);
    expect(weatherDetailRows({ date: "2026-11-10" })).toEqual([]);
    expect(weatherDetailRows(undefined)).toEqual([]);
  });

  it("the stamp: today's pack says so; an older one names its date", () => {
    const now = new Date(2026, 10, 10, 11, 5);
    expect(weatherPreparedStamp("2026-11-10T08:04:00-08:00", now)).toMatch(
      /^From today's pack · prepared /,
    );
    const older = weatherPreparedStamp("2026-11-09T08:04:00-08:00", now);
    expect(older).toContain("Mon, Nov 9");
    expect(older).not.toContain("today");
  });
});
