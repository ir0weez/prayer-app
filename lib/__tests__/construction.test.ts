// Construction timers (Jonathan's design, 2026-10-21): nothing in
// Hometown appears instantly anymore. A NEW building takes 1 minute, an
// upgrade to Level 2 takes 30 minutes, an upgrade to Level 3 takes 1
// hour (levels beyond 3: 1 hour flat — his ladder names only 1–3). The
// end timestamp lives on the PlacedBuilding record; completion is
// computed lazily (parseTown settles on load, the map settles on its
// tick) — no background timers. While building, the building is CLOSED:
// no income, no scenes, no work sites, no restock, no campus perks.
// Buildings saved before this shipped carry no construction fields and
// are grandfathered as complete. Furniture/interior tiers never touch
// PlacedBuilding records, so they are never stamped (pinned below by the
// purchase-flow source guards: beginConstruction appears ONLY at
// building buy/upgrade sites).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
  },
}));

import {
  CONSTRUCTION_NEW_MS,
  CONSTRUCTION_UPGRADE_BEYOND_MS,
  CONSTRUCTION_UPGRADE_L2_MS,
  CONSTRUCTION_UPGRADE_L3_MS,
  beginConstruction,
  constructionComplete,
  constructionDurationMs,
  constructionRemainingMs,
  constructionTimeLabel,
  dailyIncomeForMap,
  dailyXPForMap,
  effectiveLevel,
  emptyTownState,
  formatConstructionRemaining,
  isUnderConstruction,
  neediestStockedBuilding,
  parseTown,
  settleBuilding,
  settleTownState,
  totalGatherCapacity,
  fellowshipRate,
  type MapState,
  type PlacedBuilding,
} from "../hometown";
import { resolveScheduleTarget } from "../schedule-sync";
import { perksForSchoolBuildings } from "../school-perks";
import { workSiteFor } from "../villager-roster";
import { findVillagerTargetBuilding } from "../villager-missions";

const NOW = 1_800_000_000_000; // fixed clock for boundary tests

function building(partial: Partial<PlacedBuilding> = {}): PlacedBuilding {
  return {
    id: "b1",
    type: "taco-stand",
    x: 1,
    y: 1,
    level: 1,
    ...partial,
  };
}

function mapOf(buildings: PlacedBuilding[]): MapState {
  return { buildings, decorations: [], roads: [] };
}

describe("construction durations — his numbers, exactly", () => {
  it("pins the named constants", () => {
    expect(CONSTRUCTION_NEW_MS).toBe(60_000); // 1 minute
    expect(CONSTRUCTION_UPGRADE_L2_MS).toBe(30 * 60_000); // 30 minutes
    expect(CONSTRUCTION_UPGRADE_L3_MS).toBe(60 * 60_000); // 1 hour
    expect(CONSTRUCTION_UPGRADE_BEYOND_MS).toBe(60 * 60_000); // beyond 3: 1 hr flat
  });

  it("duration by target: new = 1 min, L2 = 30 min, L3 = 1 hr, L4/L5 = 1 hr", () => {
    expect(constructionDurationMs(1, true)).toBe(60_000);
    expect(constructionDurationMs(2, false)).toBe(30 * 60_000);
    expect(constructionDurationMs(3, false)).toBe(60 * 60_000);
    expect(constructionDurationMs(4, false)).toBe(60 * 60_000);
    expect(constructionDurationMs(5, false)).toBe(60 * 60_000);
  });

  it("player-facing labels name the time before he commits", () => {
    expect(constructionTimeLabel(1, true)).toBe("Builds in 1 min");
    expect(constructionTimeLabel(2, false)).toBe("Takes 30 min");
    expect(constructionTimeLabel(3, false)).toBe("Takes 1 hr");
  });

  it("countdown format: mm:ss under an hour, h:mm above", () => {
    expect(formatConstructionRemaining(60_000)).toBe("1:00");
    expect(formatConstructionRemaining(12 * 60_000 + 34_000)).toBe("12:34");
    expect(formatConstructionRemaining(59_000)).toBe("0:59");
    expect(formatConstructionRemaining(60 * 60_000)).toBe("1:00");
    expect(formatConstructionRemaining(65 * 60_000)).toBe("1:05");
    expect(formatConstructionRemaining(0)).toBe("0:00");
  });
});

describe("beginConstruction — the stamp every buy/upgrade flow applies", () => {
  it("new buy: ends 1 minute out, target level 1, level untouched", () => {
    const b = beginConstruction(building(), 1, NOW, true);
    expect(b.constructionEndsAt).toBe(NOW + 60_000);
    expect(b.constructionToLevel).toBe(1);
    expect(b.level).toBe(1);
  });

  it("upgrade to L2: 30 minutes, current level stays until completion", () => {
    const b = beginConstruction(building({ level: 1 }), 2, NOW);
    expect(b.constructionEndsAt).toBe(NOW + 30 * 60_000);
    expect(b.constructionToLevel).toBe(2);
    expect(b.level).toBe(1);
  });

  it("upgrade to L3: 1 hour, current level stays", () => {
    const b = beginConstruction(building({ level: 2 }), 3, NOW);
    expect(b.constructionEndsAt).toBe(NOW + 60 * 60_000);
    expect(b.constructionToLevel).toBe(3);
    expect(b.level).toBe(2);
  });
});

describe("completion boundary", () => {
  const upgrading = beginConstruction(building({ level: 1 }), 2, NOW); // ends NOW+30m
  const ends = NOW + 30 * 60_000;

  it("before the end: under construction, level still current, remaining > 0", () => {
    expect(isUnderConstruction(upgrading, ends - 1)).toBe(true);
    expect(constructionComplete(upgrading, ends - 1)).toBe(false);
    expect(effectiveLevel(upgrading, ends - 1)).toBe(1);
    expect(constructionRemainingMs(upgrading, NOW)).toBe(30 * 60_000);
  });

  it("at the end: no longer under construction, effective level flips", () => {
    expect(isUnderConstruction(upgrading, ends)).toBe(false);
    expect(constructionComplete(upgrading, ends)).toBe(true);
    expect(effectiveLevel(upgrading, ends)).toBe(2);
    expect(constructionRemainingMs(upgrading, ends)).toBe(0);
  });

  it("settle before the end is a no-op (same object); at the end it flips + clears", () => {
    expect(settleBuilding(upgrading, ends - 1)).toBe(upgrading);
    const done = settleBuilding(upgrading, ends);
    expect(done).not.toBe(upgrading);
    expect(done.level).toBe(2);
    expect(done.constructionEndsAt).toBeUndefined();
    expect(done.constructionToLevel).toBeUndefined();
    // Settling is idempotent.
    expect(settleBuilding(done, ends)).toBe(done);
  });

  it("a new build settles to level 1 with stamps cleared", () => {
    const fresh = beginConstruction(building(), 1, NOW, true);
    const done = settleBuilding(fresh, NOW + 60_000);
    expect(done.level).toBe(1);
    expect(done.constructionEndsAt).toBeUndefined();
  });
});

describe("grandfathering — records without the fields are complete", () => {
  it("a legacy building is never under construction and never settles", () => {
    const legacy = building({ level: 3 });
    expect(isUnderConstruction(legacy, NOW)).toBe(false);
    expect(constructionComplete(legacy, NOW)).toBe(false);
    expect(constructionRemainingMs(legacy, NOW)).toBe(0);
    expect(effectiveLevel(legacy, NOW)).toBe(3);
    expect(settleBuilding(legacy, NOW)).toBe(legacy);
  });

  it("parseTown leaves a legacy town untouched by construction", () => {
    const town = emptyTownState();
    town.maps.town.buildings.push(building({ id: "old", level: 2 }));
    const parsed = parseTown(JSON.parse(JSON.stringify(town)));
    const b = parsed.maps.town.buildings.find((x) => x.id === "old");
    expect(b?.level).toBe(2);
    expect(b?.constructionEndsAt).toBeUndefined();
  });

  it("parseTown settles a finished construction on load; an in-progress one survives", () => {
    const town = emptyTownState();
    const doneB = building({ id: "done", level: 1 });
    doneB.constructionEndsAt = Date.now() - 1000;
    doneB.constructionToLevel = 2;
    const busyB = building({ id: "busy", level: 1 });
    busyB.constructionEndsAt = Date.now() + 10 * 60_000;
    busyB.constructionToLevel = 3;
    town.maps.town.buildings.push(doneB, busyB);
    const parsed = parseTown(JSON.parse(JSON.stringify(town)));
    const done = parsed.maps.town.buildings.find((x) => x.id === "done");
    expect(done?.level).toBe(2);
    expect(done?.constructionEndsAt).toBeUndefined();
    const busy = parsed.maps.town.buildings.find((x) => x.id === "busy");
    expect(busy?.level).toBe(1);
    expect(busy?.constructionToLevel).toBe(3);
    expect(busy?.constructionEndsAt).toBe(busyB.constructionEndsAt);
  });

  it("settleTownState flips only finished work across all maps", () => {
    const town = emptyTownState();
    const b = building({ id: "x", level: 2 });
    b.constructionEndsAt = NOW - 1;
    b.constructionToLevel = 3;
    town.maps.city.buildings.push(b);
    const settled = settleTownState(town, NOW);
    expect(settled.maps.city.buildings[0].level).toBe(3);
    expect(settled.maps.city.buildings[0].constructionEndsAt).toBeUndefined();
    // Nothing to settle → same object back.
    expect(settleTownState(settled, NOW)).toBe(settled);
  });
});

describe("closed while building — income, stock, gathering", () => {
  const open = building({ id: "open", type: "taco-stand", level: 1 });
  const shut = beginConstruction(building({ id: "shut", type: "taco-stand", level: 1 }), 2, NOW);

  it("daily coin income: a constructing building earns nothing", () => {
    const openIncome = dailyIncomeForMap(mapOf([open]), undefined, 1, 1, 0, 1, 1, 1, NOW);
    expect(openIncome).toBeGreaterThan(0);
    expect(dailyIncomeForMap(mapOf([shut]), undefined, 1, 1, 0, 1, 1, 1, NOW)).toBe(0);
    // Once the timer completes and the record settles (parseTown / the
    // map tick do this in the app), it earns at the NEW level.
    const settled = settleBuilding(shut, NOW + 30 * 60_000);
    const doneIncome = dailyIncomeForMap(mapOf([settled]), undefined, 1, 1, 0, 1, 1, 1, NOW + 30 * 60_000);
    expect(doneIncome).toBeGreaterThan(openIncome);
  });

  it("daily XP income: a constructing XP building earns nothing", () => {
    const hall = building({ id: "xp", type: "music-hall", level: 1 });
    const hallShut = beginConstruction({ ...hall }, 2, NOW);
    expect(dailyXPForMap(mapOf([hall]), NOW)).toBeGreaterThan(0);
    expect(dailyXPForMap(mapOf([hallShut]), NOW)).toBe(0);
  });

  it("restock targeting skips a constructing stocked building", () => {
    const shopOpen = building({ id: "s1", type: "shop", level: 1 });
    const shopShut = beginConstruction(building({ id: "s2", type: "shop", level: 1 }), 2, NOW);
    expect(neediestStockedBuilding([shopShut], {}, undefined, NOW)).toBeNull();
    expect(neediestStockedBuilding([shopShut, shopOpen], {}, undefined, NOW)?.id).toBe("s1");
  });

  it("gathering capacity + fellowship rate ignore a constructing restaurant", () => {
    const feast = building({ id: "f1", type: "feast-hall", level: 2, plotId: "p1" });
    const feastShut = beginConstruction({ ...feast }, 3, NOW);
    expect(totalGatherCapacity([feast], NOW)).toBeGreaterThan(0);
    expect(totalGatherCapacity([feastShut], NOW)).toBe(0);
    expect(fellowshipRate([feastShut], NOW)).toBe(0);
  });
});

describe("closed while building — scenes, work sites, missions, perks", () => {
  it("schedule scenes never land on a constructing building (fallbacks still work)", () => {
    const church = building({ id: "c1", type: "church", level: 1 });
    const churchShut = beginConstruction({ ...church }, 2, NOW);
    expect(resolveScheduleTarget([church], "church", undefined, NOW)?.buildingId).toBe("c1");
    expect(resolveScheduleTarget([churchShut], "church", undefined, NOW)).toBeNull();
    // Bible study falls back hall -> church; a closed hall routes to the open church.
    const hallShut = beginConstruction(building({ id: "h1", type: "bible-study-hall", level: 1 }), 2, NOW);
    expect(resolveScheduleTarget([hallShut, church], "bible-study", undefined, NOW)?.buildingId).toBe("c1");
  });

  it("work sites: a constructing farm hosts no shifts", () => {
    const farm = building({ id: "fm", type: "farm", level: 1 });
    const farmShut = beginConstruction({ ...farm }, 2, NOW);
    expect(workSiteFor("work-farm", [farm], NOW)?.buildingId).toBe("fm");
    expect(workSiteFor("work-farm", [farmShut], NOW)).toBeNull();
  });

  it("villager missions never point at a constructing building", () => {
    const bank = building({ id: "bk", type: "bank", level: 1 });
    const bankShut = beginConstruction({ ...bank }, 2, NOW);
    expect(findVillagerTargetBuilding("bank", [bank], NOW)?.id).toBe("bk");
    expect(findVillagerTargetBuilding("bank", [bankShut], NOW)).toBeNull();
  });

  it("campus perks: a constructing classroom grants nothing until it opens", () => {
    const room = building({ id: "rm", type: "classroom", level: 2 });
    const roomShut = beginConstruction(building({ id: "rm", type: "classroom", level: 1 }), 2, NOW);
    expect(perksForSchoolBuildings([room], NOW).classroomLevel).toBe(2);
    const shut = perksForSchoolBuildings([roomShut], NOW);
    expect(shut.classroomLevel).toBe(0);
    expect(shut.verseMult).toBe(1);
  });
});

describe("purchase/upgrade flow source guards", () => {
  const hometownSrc = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");
  const shellSrc = readFileSync(join(process.cwd(), "components/interior-shell.tsx"), "utf8");
  const hospitalSrc = readFileSync(join(process.cwd(), "app/hospital-interior.tsx"), "utf8");
  const theaterSrc = readFileSync(join(process.cwd(), "app/theater-interior.tsx"), "utf8");
  const bankSrc = readFileSync(join(process.cwd(), "app/bank-interior.tsx"), "utf8");

  it("every building buy on the map stamps construction (town lot, city plot, campus plot, free build)", () => {
    // 4 new-build stamps with isNew=true
    const newStamps = hometownSrc.match(/\}, 1, Date\.now\(\), true\)/g) ?? [];
    expect(newStamps.length).toBe(4);
    expect(hometownSrc.match(/beginConstruction\(/g)?.length).toBeGreaterThanOrEqual(9);
  });

  it("every map upgrade path starts construction instead of setting the level", () => {
    const upgrades = hometownSrc.match(/beginConstruction\(x, /g) ?? [];
    // plot upgrade, building sheet, garden, library, fountain plaza
    expect(upgrades.length).toBeGreaterThanOrEqual(5);
    // No map flow may still write a level directly onto a placed building.
    expect(hometownSrc).not.toMatch(/\? \{ \.\.\.x, level: nextLevel \}/);
    expect(hometownSrc).not.toMatch(/\? \{ \.\.\.x, level: \(level \+ 1\) as 2 \| 3 \}/);
  });

  it("interior upgrades (shared shell + hospital + theater) start construction", () => {
    expect(shellSrc).toContain("beginConstruction(");
    expect(hospitalSrc).toContain("beginConstruction(");
    expect(theaterSrc).toContain("beginConstruction(");
    for (const src of [shellSrc, hospitalSrc, theaterSrc]) {
      expect(src).not.toMatch(/b\.level = \(level \+ 1\)/);
    }
  });

  it("bank tower floor additions are stamped as construction too", () => {
    expect(bankSrc).toContain("stampConstruction(");
    expect(bankSrc).toContain("CONSTRUCTION_UPGRADE_BEYOND_MS");
  });

  it("the map renders the construction cover + countdown chip and guards taps", () => {
    expect(hometownSrc).toContain("ConstructionSiteArt");
    expect(hometownSrc).toContain("Ready in {formatConstructionRemaining(");
    expect(hometownSrc).toContain("showConstructionStatus");
  });

  it("purchase sheets name the build time before he commits", () => {
    expect(hometownSrc).toContain("Builds in 1 min — the site opens when construction finishes.");
    expect(hometownSrc).toContain("Builds in 1 min once purchased.");
    expect(hometownSrc).toContain("New buildings take 1 min to build.");
    expect(shellSrc).toContain("constructionTimeLabel(nextLevel, false)");
  });
});
