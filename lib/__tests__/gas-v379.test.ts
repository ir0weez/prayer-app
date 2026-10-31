/**
 * v379 — the Gas door pins (Jonathan's door idea Oct 29, Concept
 * 1 "Cheapest First" loved; build ordered Oct 30, with his
 * refresh question answered by the snapshot pattern):
 *  - door routing mirrors the Food door: a stored "Get Gas"
 *    (or bare "Gas") keyword claims the card, an unstored event
 *    whose detected label resolves to "Get Gas" is claimed, a
 *    title leading with "Gas" is claimed, and a stored non-gas
 *    keyword still wins outright;
 *  - the snapshot seam: the page's store parses tolerantly and
 *    never fabricates — malformed reads as no snapshot, an
 *    unpriced station stays unpriced;
 *  - snapshots are FORWARD-ONLY by preparedAt through the one
 *    write door both import paths use;
 *  - display order: cheapest first, unpriced last; the hero is
 *    the cheapest station WITH a price;
 *  - staleness: a price's age is computed from reportedAt and
 *    rendered in words; yesterday reads older than this morning;
 *  - the import doors: the Studio pack (and the Drive folder,
 *    which parses through the same function) accept a
 *    `gasPrices` section, strictly validated, applied
 *    forward-only to ONLY its own key;
 *  - honesty: the page source carries the empty state, "No
 *    price listed" and the prepared-by-Eva line, and NO station
 *    names or prices are baked into the page or the store code
 *    (this file's fixtures are test data, marked as such).
 */
import { readFileSync } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const root = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

// ─── The forward-only write tests run against an in-memory store ───
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

import { keywordPageKindForEvent, keywordPagePath } from "../keyword-pages";
import { detectEventKeyword } from "../schedule-data";
import {
  GAS_PRICES_KEY,
  cheapestPricedStation,
  formatDistance,
  formatGasPreparedLine,
  formatGasPrice,
  formatReportedAge,
  isNewerGasSnapshot,
  loadGasSnapshot,
  parseGasSnapshot,
  sortStationsForDisplay,
  stationStaleness,
  storeGasSnapshotForwardOnly,
  type GasPriceSnapshot,
  type GasStation,
} from "../gas-prices";
import {
  emptyStudioApplyCounts,
  formatStudioImportSummary,
  parseStudioFileFull,
  studioFileHasSections,
} from "../bible-v205/studio-import";

/* ------------------------------ the door ------------------------------ */

describe("v379 Gas door routing", () => {
  it("a stored Get Gas keyword is a Gas door whatever the title says", () => {
    expect(keywordPageKindForEvent({ keyword: "Get Gas", title: "Thursday" })).toBe("gas");
    expect(keywordPageKindForEvent({ keyword: "Get Gas" })).toBe("gas");
    expect(keywordPageKindForEvent({ keyword: "Gas", title: "Thursday" })).toBe("gas");
  });

  it("an unstored event whose keyword resolves to Get Gas is a Gas door", () => {
    // The card passes its resolved label (stored label, else
    // detectEventKeyword over title/location/notes).
    expect(detectEventKeyword("Fill up")?.label).toBe("Get Gas");
    expect(keywordPageKindForEvent({ title: "Fill up" }, "Get Gas")).toBe("gas");
    expect(detectEventKeyword("Fuel up")?.label).toBe("Get Gas");
    expect(
      keywordPageKindForEvent({ title: "Fuel up" }, detectEventKeyword("Fuel up")?.label),
    ).toBe("gas");
  });

  it("a title leading with Gas is a Gas door (the drawing's own event)", () => {
    expect(keywordPageKindForEvent({ title: "Gas" })).toBe("gas");
    expect(keywordPageKindForEvent({ title: "Gas for the trip" })).toBe("gas");
    // …but a title that merely starts with the letters is not.
    expect(keywordPageKindForEvent({ title: "Gaslight tour" })).toBeNull();
  });

  it("a stored non-gas keyword still wins outright", () => {
    expect(keywordPageKindForEvent({ keyword: "Church", title: "Gas" })).toBeNull();
    expect(keywordPageKindForEvent({ keyword: "Meal", title: "Gas" })).toBe("food");
  });

  it("the News/Email/Food claims are untouched", () => {
    expect(keywordPageKindForEvent({ keyword: "News", title: "Gas" })).toBe("news");
    expect(keywordPageKindForEvent({ title: "News" }, "Get Gas")).toBe("news");
    expect(keywordPageKindForEvent({ title: "Mail" })).toBe("email");
    expect(keywordPageKindForEvent({ title: "Dinner" }, "Meal")).toBe("food");
    expect(keywordPageKindForEvent({ title: "Church" }, "Church")).toBeNull();
  });

  it("the path is /gas, and the card wears the Get Gas keyword dress", () => {
    expect(keywordPagePath("gas")).toBe("/gas");
    const scheduleTab = read("components/schedule-tab.tsx");
    expect(scheduleTab).toContain('pageKind === "food" ? "Meal" : "Get Gas"');
  });
});

/* --------------------------- the snapshot ----------------------------- */

// TEST DATA — a fixture snapshot for the parser/engine tests.
// The app ships with no stations and no prices anywhere.
const FIXTURE: GasPriceSnapshot = {
  preparedAt: "2026-10-30T14:05:00.000Z",
  areaLabel: "Testville",
  stations: [
    { name: "Test Mart · First St", priceRegular: 4.32, reportedAt: "2026-10-30T11:05:00.000Z", distanceMiles: 1.2, membersOnly: false },
    { name: "Test Club · Second St", priceRegular: 4.19, reportedAt: "2026-10-30T13:05:00.000Z", distanceMiles: 2.8, membersOnly: true },
    { name: "Test Shell · Third St", priceRegular: null, reportedAt: null, distanceMiles: 1.6, membersOnly: false },
  ],
};

describe("v379 snapshot parsing — tolerant, never fabricating", () => {
  it("a stored snapshot round-trips", () => {
    const parsed = parseGasSnapshot(JSON.stringify(FIXTURE));
    expect(parsed).toEqual(FIXTURE);
  });

  it("malformed stores read as no snapshot", () => {
    expect(parseGasSnapshot(null)).toBeNull();
    expect(parseGasSnapshot("not json")).toBeNull();
    expect(parseGasSnapshot(JSON.stringify({ stations: FIXTURE.stations }))).toBeNull(); // no preparedAt
    expect(
      parseGasSnapshot(JSON.stringify({ preparedAt: "not a time", stations: FIXTURE.stations })),
    ).toBeNull();
    expect(parseGasSnapshot(JSON.stringify({ preparedAt: FIXTURE.preparedAt, stations: [] }))).toBeNull();
  });

  it("nameless stations are dropped; an all-nameless snapshot is nothing", () => {
    const parsed = parseGasSnapshot(
      JSON.stringify({
        preparedAt: FIXTURE.preparedAt,
        stations: [{ name: "  " }, { name: "Named", priceRegular: null }],
      }),
    );
    expect(parsed?.stations).toHaveLength(1);
    expect(parsed?.stations[0].name).toBe("Named");
    expect(
      parseGasSnapshot(JSON.stringify({ preparedAt: FIXTURE.preparedAt, stations: [{ name: "" }] })),
    ).toBeNull();
  });

  it("no price stays no price — never a zero, never a guess", () => {
    const parsed = parseGasSnapshot(JSON.stringify(FIXTURE));
    const unpriced = parsed?.stations.find((s) => s.name.startsWith("Test Shell"));
    expect(unpriced?.priceRegular).toBeNull();
    const zeroed = parseGasSnapshot(
      JSON.stringify({
        preparedAt: FIXTURE.preparedAt,
        stations: [{ name: "Zeroed", priceRegular: 0 }],
      }),
    );
    expect(zeroed?.stations[0].priceRegular).toBeNull();
  });
});

describe("v379 snapshots are forward-only by preparedAt", () => {
  beforeEach(() => {
    store.clear();
  });

  it("the first delivery lands; an older one never overwrites it", async () => {
    await expect(storeGasSnapshotForwardOnly(FIXTURE)).resolves.toBe(true);
    expect((await loadGasSnapshot())?.preparedAt).toBe(FIXTURE.preparedAt);

    const older: GasPriceSnapshot = { ...FIXTURE, preparedAt: "2026-10-30T06:00:00.000Z", areaLabel: "Oldtown" };
    await expect(storeGasSnapshotForwardOnly(older)).resolves.toBe(false);
    expect((await loadGasSnapshot())?.areaLabel).toBe("Testville");
  });

  it("an equal stamp is a re-delivery, not an update; a newer one lands", async () => {
    await storeGasSnapshotForwardOnly(FIXTURE);
    await expect(storeGasSnapshotForwardOnly({ ...FIXTURE })).resolves.toBe(false);

    const newer: GasPriceSnapshot = { ...FIXTURE, preparedAt: "2026-10-30T18:30:00.000Z", areaLabel: "Newtown" };
    await expect(storeGasSnapshotForwardOnly(newer)).resolves.toBe(true);
    expect((await loadGasSnapshot())?.areaLabel).toBe("Newtown");
    expect(store.get(GAS_PRICES_KEY)).toContain("Newtown");
  });

  it("isNewerGasSnapshot compares stamps, not arrival order", () => {
    expect(isNewerGasSnapshot(null, FIXTURE)).toBe(true);
    expect(isNewerGasSnapshot(FIXTURE, FIXTURE)).toBe(false);
    expect(
      isNewerGasSnapshot(FIXTURE, { ...FIXTURE, preparedAt: "2026-10-29T14:05:00.000Z" }),
    ).toBe(false);
    expect(
      isNewerGasSnapshot(FIXTURE, { ...FIXTURE, preparedAt: "2026-10-31T14:05:00.000Z" }),
    ).toBe(true);
  });
});

/* ------------------------- order, hero, age --------------------------- */

describe("v379 display — cheapest first, unpriced last, honest ages", () => {
  const station = (patch: Partial<GasStation>): GasStation => ({
    name: "S",
    priceRegular: null,
    reportedAt: null,
    distanceMiles: null,
    membersOnly: false,
    ...patch,
  });

  it("sorts priced ascending, unpriced last in prepared order, without mutating the input", () => {
    const input = [
      station({ name: "mid", priceRegular: 4.5 }),
      station({ name: "none-a" }),
      station({ name: "cheap", priceRegular: 4.1 }),
      station({ name: "none-b" }),
      station({ name: "high", priceRegular: 4.9 }),
    ];
    const sorted = sortStationsForDisplay(input);
    expect(sorted.map((s) => s.name)).toEqual(["cheap", "mid", "high", "none-a", "none-b"]);
    expect(input.map((s) => s.name)).toEqual(["mid", "none-a", "cheap", "none-b", "high"]);
  });

  it("the hero is the cheapest station WITH a price", () => {
    expect(cheapestPricedStation(FIXTURE.stations)?.name).toBe("Test Club · Second St");
    expect(
      cheapestPricedStation([station({ name: "a" }), station({ name: "b" })]),
    ).toBeNull();
  });

  it("staleness is computed from reportedAt", () => {
    const now = new Date("2026-10-30T15:00:00.000Z");
    expect(stationStaleness("2026-10-30T13:30:00.000Z", now)).toBe("fresh");
    expect(stationStaleness("2026-10-30T00:30:00.000Z", now)).toBe("aging");
    expect(stationStaleness("2026-10-29T14:00:00.000Z", now)).toBe("stale");
    expect(stationStaleness(null, now)).toBe("unknown");
    expect(stationStaleness("garbage", now)).toBe("unknown");
  });

  it("reported ages read in the drawing's words", () => {
    const now = new Date("2026-10-30T15:00:00.000Z");
    expect(formatReportedAge("2026-10-30T14:58:00.000Z", now)).toBe("reported just now");
    expect(formatReportedAge("2026-10-30T14:15:00.000Z", now)).toBe("reported 45m ago");
    expect(formatReportedAge("2026-10-30T12:00:00.000Z", now)).toBe("reported 3h ago");
    expect(formatReportedAge("2026-10-29T20:00:00.000Z", now)).toBe("reported yesterday");
    expect(formatReportedAge("2026-10-27T15:00:00.000Z", now)).toBe("reported 3d ago");
    expect(formatReportedAge(null, now)).toBe("");
    expect(formatReportedAge("garbage", now)).toBe("");
  });

  it("prices and distances format plainly; absence formats as empty", () => {
    expect(formatGasPrice(4.19)).toBe("$4.19");
    expect(formatGasPrice(4.5)).toBe("$4.50");
    expect(formatGasPrice(null)).toBe("");
    expect(formatDistance(2.8)).toBe("2.8 mi");
    expect(formatDistance(null)).toBe("");
  });

  it("the prepared line names Eva and never claims to be live", () => {
    const now = new Date("2026-10-30T15:00:00.000Z");
    const line = formatGasPreparedLine("2026-10-30T14:04:00.000Z", now);
    expect(line).toContain("Prices prepared");
    expect(line).toContain("by Eva");
    expect(line.toLowerCase()).not.toContain("live");
    const older = formatGasPreparedLine("2026-10-28T14:04:00.000Z", now);
    expect(older).toContain("Wed");
  });
});

/* --------------------------- the import doors -------------------------- */

describe("v379 the Studio pack door accepts a gasPrices section, safely", () => {
  // TEST DATA — a delivered section as Eva's prep would emit it.
  const delivered = {
    preparedAt: "2026-10-30T14:05:00.000Z",
    areaLabel: "Testville",
    stations: [
      { name: "Test Club · Second St", brand: "TestClub", priceRegular: 4.19, reportedAt: "2026-10-30T13:05:00.000Z", distanceMiles: 2.8, membersOnly: true, note: "Second St" },
      { name: "Test Shell · Third St", priceRegular: null, reportedAt: null, distanceMiles: 1.6, membersOnly: false },
    ],
  };

  it("a gas-only pack parses to exactly one section and nothing else", () => {
    const plan = parseStudioFileFull({ gasPrices: delivered });
    expect(studioFileHasSections(plan)).toBe(true);
    expect(plan.notes).toBeNull();
    expect(plan.schedule).toBeNull();
    expect(plan.people).toBeNull();
    expect(plan.ministries).toBeNull();
    expect(plan.emailDigest).toBeNull();
    expect(plan.gasPrices?.areaLabel).toBe("Testville");
    expect(plan.gasPrices?.stations).toHaveLength(2);
    expect(plan.gasPrices?.stations[0]).toEqual({
      name: "Test Club · Second St",
      brand: "TestClub",
      priceRegular: 4.19,
      reportedAt: "2026-10-30T13:05:00.000Z",
      distanceMiles: 2.8,
      membersOnly: true,
      note: "Second St",
    });
    // An unpriced station stays explicitly unpriced through the door.
    expect(plan.gasPrices?.stations[1].priceRegular).toBeNull();
    // And the validated section round-trips through the page's parser.
    expect(parseGasSnapshot(JSON.stringify(plan.gasPrices))?.stations).toHaveLength(2);
  });

  it("a malformed gas section fails the whole file — nothing is applied", () => {
    const malformed: unknown[] = [
      { gasPrices: "not an object" },
      { gasPrices: { stations: delivered.stations } }, // no preparedAt
      { gasPrices: { ...delivered, preparedAt: "not a time" } },
      { gasPrices: { ...delivered, stations: "nope" } },
      { gasPrices: { ...delivered, stations: [42] } },
      { gasPrices: { ...delivered, stations: [{ name: "X", priceRegular: "4.19" }] } },
      { gasPrices: { ...delivered, stations: [{ name: "X", priceRegular: -1 }] } },
      { gasPrices: { ...delivered, stations: [{ name: "X", reportedAt: "garbage" }] } },
      { gasPrices: { ...delivered, stations: [{ name: "X", membersOnly: "yes" }] } },
      { gasPrices: { ...delivered, stations: [] } }, // no stations
      { gasPrices: { ...delivered, stations: [{ name: " " }] } }, // no named stations
    ];
    for (const file of malformed) {
      expect(() => parseStudioFileFull(file)).toThrow();
    }
  });

  it("the summary names the update only when the forward-only write landed", () => {
    const plan = parseStudioFileFull({ gasPrices: delivered });
    expect(
      formatStudioImportSummary(plan, { ...emptyStudioApplyCounts(), gasPrices: 1 }),
    ).toContain("Gas prices: updated");
    // An older snapshot that changed nothing must not read as one.
    expect(
      formatStudioImportSummary(plan, { ...emptyStudioApplyCounts(), gasPrices: 0 }),
    ).not.toContain("Gas prices");
  });

  it("both doors apply through the one forward-only write, to its own key only", () => {
    const index = read("app/(tabs)/index.tsx");
    expect(index).toContain("storeGasSnapshotForwardOnly(plan.gasPrices)");
    expect(index).toContain('from "@/lib/gas-prices"');
    const drive = read("lib/bible-v205/drive-folder.ts");
    expect(drive).toContain("storeGasSnapshotForwardOnly(filePlan.gasPrices)");
    expect(GAS_PRICES_KEY).toBe("prayercircle.gas-prices.v1");
  });
});

/* ------------------------------ the page ------------------------------ */

describe("v379 the Gas page is honest by construction", () => {
  const page = read("app/gas.tsx");
  const lib = read("lib/gas-prices.ts");

  it("carries the empty state, the unpriced words and the prepared line", () => {
    expect(page).toContain("No gas prices yet");
    expect(page).toContain("Eva prepares these with the morning digest");
    expect(page).toContain("No price listed");
    expect(page).toContain("formatGasPreparedLine");
    expect(page).toContain("Cheapest nearby");
    expect(page).toContain("Members");
  });

  it("refresh re-reads the store — on tap and on focus — and nothing else", () => {
    expect(page).toContain('accessibilityLabel="Refresh prices"');
    expect(page).toContain("useFocusEffect(refresh)");
    expect(page).toContain("loadGasSnapshot()");
    // No network anything: the page cannot fetch a price.
    expect(page).not.toContain("fetch(");
    expect(lib).not.toContain("fetch(");
  });

  it("no station names or prices are baked into the page or the store", () => {
    // Test fixtures live in this test file only; shipped code
    // carries no station and no price of its own.
    for (const source of [page, lib]) {
      expect(source).not.toMatch(/\b(Costco|ARCO|Chevron|Shell|76|Mobil|Texaco)\b/);
      expect(source).not.toMatch(/\$\d+\.\d{2}/);
    }
  });

  it("finishing runs through the same completion write as the other doors", () => {
    expect(page).toContain("finishScheduleEvent(eventId)");
    expect(page).toContain("<FinishedBar");
  });
});
