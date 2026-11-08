/**
 * v472 — the Daily Summary's temperature clause pins (Jonathan,
 * Nov 8: "The 'Your Fast' line with the data can go away from
 * the summary. Can you put the local temperature there
 * instead?"):
 *  - the prose: the fast clause ("Your fast — day N of M ·
 *    streak S", flame glyph and all) is GONE from the summary
 *    card, and the temperature clause sits in the same seat —
 *    the closing sentence after the available-time sentence —
 *    rendered in the same bold-with-glyph idiom;
 *  - the clause itself (lib/weather-snapshot.ts): the today
 *    form when the viewed date is the snapshot's "now" date,
 *    the forecast form for any other covered date, and NO
 *    clause at all when the store is empty or covers nothing
 *    for the viewed day — the prose just ends, no placeholder;
 *  - the door (parseStudioFileFull — the one parser both the
 *    manual import and the Drive folder check run) accepts a
 *    `weather` section in exactly the shape Eva's morning prep
 *    emits, strictly validated; a pack without one leaves the
 *    store untouched (plan.weather stays null);
 *  - the write is FORWARD-ONLY by preparedAt, like every
 *    morning sibling, through both doors.
 */
import { readFileSync } from "fs";
import { join } from "path";
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

import {
  WEATHER_KEY,
  isNewerWeatherSnapshot,
  loadWeatherSnapshot,
  parseWeatherSnapshot,
  storeWeatherSnapshotForwardOnly,
  weatherSummaryClause,
  type WeatherSnapshot,
} from "../weather-snapshot";
import {
  emptyStudioApplyCounts,
  formatStudioImportSummary,
  parseStudioFileFull,
  studioFileHasSections,
} from "../bible-v205/studio-import";

beforeEach(() => {
  store.clear();
});

/* ------------------------- TEST DATA fixtures ------------------------- */
/* Fixtures only — shipped code carries no temperature. */

// The morning weather section, in exactly the shape Eva's prep
// emits (and lib/weather-snapshot.ts documents for the pack
// producer): the pack morning's current temperature plus the
// coming days' high/low forecasts.
const weatherSection = {
  preparedAt: "2026-11-09T06:32:00-08:00",
  location: "Lancaster",
  now: { date: "2026-11-09", tempF: 64, condition: "Sunny" },
  days: [
    { date: "2026-11-09", highF: 76, lowF: 52, condition: "Sunny" },
    { date: "2026-11-10", highF: 74, lowF: 50, condition: "Sunny" },
    { date: "2026-11-13", highF: 69, lowF: 47, condition: "Windy" },
  ],
};

const snapshot: WeatherSnapshot = {
  preparedAt: weatherSection.preparedAt,
  location: "Lancaster",
  now: { ...weatherSection.now },
  days: weatherSection.days.map((d) => ({ ...d })),
};

const gasSection = {
  preparedAt: "2026-11-09T07:04:00-08:00",
  areaLabel: "Lancaster",
  stations: [
    { name: "Test Club · Second St", priceRegular: 4.19, reportedAt: "2026-11-09T06:05:00-08:00", distanceMiles: 2.8, membersOnly: true },
  ],
};

/* ------------------------------ the prose ------------------------------ */

describe("v472 the summary prose: the fast clause is out, the temperature is in", () => {
  const summaryCard = read("components/daily-summary-card.tsx");
  const scheduleTab = read("components/schedule-tab.tsx");

  it("the card carries no fast clause — no words, no flame, no fastLine prop", () => {
    expect(summaryCard).not.toContain("Your fast —");
    expect(summaryCard).not.toContain("local-fire-department");
    expect(summaryCard).not.toContain("fastLine");
  });

  it("the temperature clause seats where the fast clause sat: the closing sentence, bold with its glyph", () => {
    expect(summaryCard).toContain("weatherLine");
    expect(summaryCard).toContain('name="thermostat"');
    // The seat: after the available-time sentence, as the prose's
    // last clause — the available sentence itself is unchanged.
    const availableAt = summaryCard.indexOf("available.");
    const clauseAt = summaryCard.indexOf("{weatherLine ? (");
    expect(availableAt).toBeGreaterThanOrEqual(0);
    expect(clauseAt).toBeGreaterThan(availableAt);
  });

  it("the rest of the prose stands unchanged around the swapped clause", () => {
    expect(summaryCard).toContain("to budget,");
    expect(summaryCard).toContain("to reach,");
    expect(summaryCard).toContain("to lead. You have");
    expect(summaryCard).toContain("export function SummaryReachRow");
    expect(summaryCard).toContain("ScheduleProgressBar");
  });

  it("schedule-tab composes the clause from the weather snapshot for the viewed day — and wires no fast line", () => {
    expect(scheduleTab).toContain("weatherLine={weatherSummaryClause(weatherSnapshot, selectedDate)}");
    expect(scheduleTab).not.toContain("fastLine={");
    expect(scheduleTab).not.toContain("getFastCalendarDays");
    expect(scheduleTab).not.toContain("calculateFastStreak");
    // The snapshot re-reads on focus, like the stores the import
    // doors write directly.
    expect(scheduleTab).toContain("loadWeatherSnapshot()");
  });
});

/* ------------------------------ the clause ------------------------------ */

describe("v472 the weather clause speaks only from the store", () => {
  it("today form: the viewed date is the snapshot's now date (now wins over that date's forecast)", () => {
    expect(weatherSummaryClause(snapshot, "2026-11-09")).toBe(
      "It's\u00A064°\u00A0in\u00A0Lancaster",
    );
  });

  it("forecast form: any other covered date reads high / low in the same tail", () => {
    expect(weatherSummaryClause(snapshot, "2026-11-10")).toBe(
      "74°\u00A0/\u00A050°\u00A0in\u00A0Lancaster",
    );
    expect(weatherSummaryClause(snapshot, "2026-11-13")).toBe(
      "69°\u00A0/\u00A047°\u00A0in\u00A0Lancaster",
    );
  });

  it("whole degrees, rounded — no decimals ever", () => {
    const warm: WeatherSnapshot = {
      ...snapshot,
      now: { date: "2026-11-09", tempF: 64.6, condition: "Sunny" },
      days: [{ date: "2026-11-10", highF: 74.4, lowF: 49.5, condition: "Sunny" }],
    };
    expect(weatherSummaryClause(warm, "2026-11-09")).toBe(
      "It's\u00A065°\u00A0in\u00A0Lancaster",
    );
    expect(weatherSummaryClause(warm, "2026-11-10")).toBe(
      "74°\u00A0/\u00A050°\u00A0in\u00A0Lancaster",
    );
  });

  it("no clause when the store is empty, unreadable, or covers nothing for the viewed day", async () => {
    expect(weatherSummaryClause(null, "2026-11-09")).toBeNull();
    expect(weatherSummaryClause(snapshot, "2026-11-20")).toBeNull();
    // A stale store: last week's snapshot covers none of this
    // week's days — the clause stays silent rather than guessing.
    store.set(WEATHER_KEY, JSON.stringify({
      preparedAt: "2026-11-02T06:30:00-08:00",
      location: "Lancaster",
      now: { date: "2026-11-02", tempF: 61, condition: "Sunny" },
      days: [{ date: "2026-11-03", highF: 72, lowF: 49, condition: "Sunny" }],
    }));
    const stale = await loadWeatherSnapshot();
    expect(stale).not.toBeNull();
    expect(weatherSummaryClause(stale, "2026-11-09")).toBeNull();
    // Garbage in the store reads as no snapshot at all.
    store.set(WEATHER_KEY, "{not json");
    expect(await loadWeatherSnapshot()).toBeNull();
    expect(parseWeatherSnapshot(null)).toBeNull();
    expect(parseWeatherSnapshot("{}")).toBeNull();
  });
});

/* ------------------------------ the door ------------------------------ */

describe("v472 the door accepts a weather section, safely", () => {
  it("a weather-only file parses to exactly the weather section", () => {
    const plan = parseStudioFileFull({ weather: weatherSection });
    expect(plan.weather).toEqual(snapshot);
    expect(plan.emailDigest).toBeNull();
    expect(plan.gasPrices).toBeNull();
    expect(plan.newsBriefing).toBeNull();
    expect(studioFileHasSections(plan)).toBe(true);
  });

  it("a pack WITHOUT a weather section leaves the store untouched — plan.weather stays null", () => {
    const plan = parseStudioFileFull({ gasPrices: gasSection });
    expect(plan.weather).toBeNull();
    expect(plan.gasPrices).not.toBeNull();
  });

  it("weather rides the combined pack beside its morning siblings", () => {
    const plan = parseStudioFileFull({ weather: weatherSection, gasPrices: gasSection });
    expect(plan.weather).toEqual(snapshot);
    expect(plan.gasPrices?.stations).toHaveLength(1);
  });

  it("a section with no stamp of its own borrows the pack's; its own stamp wins", () => {
    const { preparedAt: _own, ...stampless } = weatherSection;
    const borrowed = parseStudioFileFull({
      preparedAt: "2026-11-09T06:00:00-08:00",
      weather: stampless,
    });
    expect(borrowed.weather?.preparedAt).toBe("2026-11-09T06:00:00-08:00");
    const own = parseStudioFileFull({
      preparedAt: "2026-11-09T06:00:00-08:00",
      weather: weatherSection,
    });
    expect(own.weather?.preparedAt).toBe("2026-11-09T06:32:00-08:00");
  });

  it("a day entry carrying nothing is dropped; the rest survive", () => {
    const plan = parseStudioFileFull({
      weather: {
        ...weatherSection,
        days: [
          { date: "2026-11-10", highF: 74, lowF: 50, condition: "Sunny" },
          { date: "2026-11-11", condition: "Sunny" },
          { highF: 70, lowF: 48, condition: "Sunny" },
        ],
      },
    });
    expect(plan.weather?.days).toEqual([
      { date: "2026-11-10", highF: 74, lowF: 50, condition: "Sunny" },
    ]);
  });

  it("a malformed weather section fails the whole file — nothing is applied", () => {
    expect(() => parseStudioFileFull({ weather: 42 })).toThrow();
    expect(() =>
      parseStudioFileFull({ weather: { ...weatherSection, preparedAt: "not a time" } }),
    ).toThrow();
    // No now and no days: writing it would clear the weather
    // already waiting — refused like an empty gas section.
    expect(() =>
      parseStudioFileFull({
        weather: { preparedAt: weatherSection.preparedAt, location: "Lancaster", now: null, days: [] },
      }),
    ).toThrow();
    expect(() =>
      parseStudioFileFull({
        weather: { ...weatherSection, now: { date: "Nov 9", tempF: 64, condition: "Sunny" } },
      }),
    ).toThrow();
  });
});

/* --------------------------- forward-only write --------------------------- */

describe("v472 every weather write is forward-only, through both doors", () => {
  it("first write lands, older and equal are refused, newer lands", async () => {
    expect(await storeWeatherSnapshotForwardOnly(snapshot)).toBe(true);
    expect(await loadWeatherSnapshot()).toEqual(snapshot);

    const older: WeatherSnapshot = { ...snapshot, preparedAt: "2026-11-09T05:00:00-08:00" };
    expect(isNewerWeatherSnapshot(snapshot, older)).toBe(false);
    expect(await storeWeatherSnapshotForwardOnly(older)).toBe(false);
    expect(await storeWeatherSnapshotForwardOnly(snapshot)).toBe(false);
    expect(await loadWeatherSnapshot()).toEqual(snapshot);

    const newer: WeatherSnapshot = {
      ...snapshot,
      preparedAt: "2026-11-10T06:31:00-08:00",
      now: { date: "2026-11-10", tempF: 66, condition: "Sunny" },
    };
    expect(await storeWeatherSnapshotForwardOnly(newer)).toBe(true);
    expect(await loadWeatherSnapshot()).toEqual(newer);
  });

  it("the import summary names the weather update only when its write landed", () => {
    const plan = parseStudioFileFull({ weather: weatherSection });
    const landed = { ...emptyStudioApplyCounts(), weather: 1 };
    expect(formatStudioImportSummary(plan, landed)).toContain("Weather: updated");
    expect(formatStudioImportSummary(plan, emptyStudioApplyCounts())).not.toContain("Weather");
  });

  it("both doors apply the section through the forward-only write", () => {
    const peopleTab = read("app/(tabs)/index.tsx");
    const driveFolder = read("lib/bible-v205/drive-folder.ts");
    expect(peopleTab).toContain("storeWeatherSnapshotForwardOnly(plan.weather)");
    expect(driveFolder).toContain("storeWeatherSnapshotForwardOnly(filePlan.weather)");
  });
});
