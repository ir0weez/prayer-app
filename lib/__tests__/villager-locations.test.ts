// Villager single-location (Jonathan's ruling, 2026-10-21): one villager
// exists on exactly ONE map at a time. Workers are pinned to their
// shift's map, field missions are a location (the Mission Field), a live
// schedule scene summons its cast to town for its span, and idle
// villagers drift casually between maps on a timestamp settle — never
// while working, never at night, never before their drift time. Every
// consumer (per-map render lists, presence counts, the Main Office
// roster) reads the same truth from lib/villager-locations.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  data: new Map<string, string>(),
  setCalls: [] as Array<[string, string]>,
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.data.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.setCalls.push([k, v]);
      store.data.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.data.delete(k);
    }),
  },
}));

import type { FieldMission, PrayedPerson, TownMapId } from "../hometown";
import {
  DRIFT_MIN_MS,
  VILLAGER_LOCATIONS_KEY,
  lightsForMap,
  locatedCountOnMap,
  locationPhrase,
  parseVillagerLocations,
  settleAndSaveVillagerLocations,
  settleVillagerLocations,
  villagerMapOf,
  type VillagerLocationInputs,
  type VillagerLocations,
} from "../villager-locations";
import { buildRosterRows } from "../villager-roster";
import {
  createWorkAssignment,
  type VillagerWorkAssignment,
} from "../villager-work";
import type { VillagerMission } from "../villager-missions";

const NOW = new Date("2026-10-20T10:00:00").getTime(); // a Tuesday morning
const HOUR = 3600_000;

const person = (id: string) => ({ personId: id });

function inputs(over: Partial<VillagerLocationInputs> = {}): VillagerLocationInputs {
  return {
    people: [person("p1"), person("p2"), person("p3"), person("p4")],
    assignments: [],
    fieldMissions: [],
    unlockedMaps: ["town", "city", "school"],
    nowMs: NOW,
    isNight: false,
    ...over,
  };
}

function workAssignment(
  personId: string,
  status: VillagerWorkAssignment["status"],
  endsAt = NOW + HOUR
): VillagerWorkAssignment {
  return {
    ...createWorkAssignment({ personId, personName: personId, kind: "work-farm", nowMs: NOW - 1000 }),
    status,
    endsAt,
  };
}

function fieldMission(personId: string, collected = false): FieldMission {
  return {
    id: `fm-${personId}`,
    personId,
    name: personId,
    duration: "day",
    sentAt: new Date(NOW - HOUR).toISOString(),
    returnAt: new Date(NOW + HOUR).toISOString(),
    coins: 200,
    xp: 10,
    collected,
  };
}

const rec = (map: TownMapId, setAt: number, nextDriftAt: number) => ({ map, setAt, nextDriftAt });

describe("parse / legacy migration", () => {
  it("treats garbage and missing saves as an empty book", () => {
    expect(parseVillagerLocations(null)).toEqual({});
    expect(parseVillagerLocations("town")).toEqual({});
    expect(parseVillagerLocations([1, 2])).toEqual({});
    expect(parseVillagerLocations({ p1: { map: "mars", setAt: 1, nextDriftAt: 2 } })).toEqual({});
    expect(parseVillagerLocations({ p1: { map: "city", setAt: "x", nextDriftAt: 2 } })).toEqual({});
  });

  it("keeps valid records", () => {
    expect(parseVillagerLocations({ p1: rec("city", 5, 9) })).toEqual({ p1: rec("city", 5, 9) });
  });

  it("migrates a legacy save: no records → everyone home in town, nobody lost", () => {
    const { locations, changed } = settleVillagerLocations({}, inputs());
    expect(changed).toBe(true);
    for (const pid of ["p1", "p2", "p3", "p4"]) {
      expect(locations[pid].map).toBe("town");
      expect(locations[pid].nextDriftAt).toBeGreaterThan(NOW + DRIFT_MIN_MS - 1);
    }
    // Settling again from the migrated book moves nothing.
    const again = settleVillagerLocations(locations, inputs());
    expect(again.changed).toBe(false);
    expect(again.locations).toEqual(locations);
  });

  it("migrates a legacy worker straight onto their shift's map", () => {
    const { locations } = settleVillagerLocations(
      {},
      inputs({ assignments: [workAssignment("p2", "working")] })
    );
    expect(locations.p2.map).toBe("town");
    expect(locations.p2.nextDriftAt).toBeGreaterThanOrEqual(NOW + HOUR);
  });

  it("carries records for people not prayed today through untouched", () => {
    const ghost = rec("school", NOW - 5 * HOUR, NOW + HOUR);
    const { locations } = settleVillagerLocations({ ghost }, inputs());
    expect(locations.ghost).toEqual(ghost);
  });
});

describe("work pins", () => {
  it("pins a worker to town and off every other map's render list", () => {
    const stored: VillagerLocations = { p1: rec("city", NOW - HOUR, NOW + 5 * HOUR) };
    const { locations } = settleVillagerLocations(
      stored,
      inputs({ assignments: [workAssignment("p1", "working")] })
    );
    expect(villagerMapOf(locations, "p1")).toBe("town");
    const lights = ["p1", "p2", "p3", "p4"].map((personId) => ({ personId }));
    expect(lightsForMap(lights, locations, "city").map((l) => l.personId)).not.toContain("p1");
    expect(lightsForMap(lights, locations, "town").map((l) => l.personId)).toContain("p1");
  });

  it("pins en-route workers too (they dropped everything and left)", () => {
    const stored: VillagerLocations = { p1: rec("school", NOW - HOUR, NOW + 5 * HOUR) };
    const { locations } = settleVillagerLocations(
      stored,
      inputs({ assignments: [workAssignment("p1", "en-route")] })
    );
    expect(villagerMapOf(locations, "p1")).toBe("town");
  });

  it("holds the drift clock until the shift ends", () => {
    const endsAt = NOW + 2 * HOUR;
    const { locations } = settleVillagerLocations(
      {},
      inputs({ assignments: [workAssignment("p1", "working", endsAt)] })
    );
    expect(locations.p1.nextDriftAt).toBeGreaterThanOrEqual(endsAt + DRIFT_MIN_MS);
  });

  it("a finished shift does NOT re-pin: the villager stays where they are", () => {
    const stored: VillagerLocations = { p1: rec("city", NOW - HOUR, NOW + 5 * HOUR) };
    const { locations, changed } = settleVillagerLocations(
      stored,
      inputs({ people: [person("p1")], assignments: [workAssignment("p1", "done", NOW - 1000)] })
    );
    expect(villagerMapOf(locations, "p1")).toBe("city");
    expect(changed).toBe(false);
  });
});

describe("field missions are a location", () => {
  it("sends an uncollected mission villager to the Mission Field", () => {
    const stored: VillagerLocations = { p1: rec("town", NOW - HOUR, NOW + 5 * HOUR) };
    const { locations } = settleVillagerLocations(
      stored,
      inputs({ fieldMissions: [fieldMission("p1")] })
    );
    expect(villagerMapOf(locations, "p1")).toBe("reserve");
  });

  it("a collected mission no longer pins", () => {
    const stored: VillagerLocations = { p1: rec("town", NOW - HOUR, NOW + 5 * HOUR) };
    const { locations, changed } = settleVillagerLocations(
      stored,
      inputs({ people: [person("p1")], fieldMissions: [fieldMission("p1", true)] })
    );
    expect(villagerMapOf(locations, "p1")).toBe("town");
    expect(changed).toBe(false);
  });

  it("a mission beats a scene summons", () => {
    const { locations } = settleVillagerLocations(
      {},
      inputs({
        fieldMissions: [fieldMission("p1")],
        scenePersonIds: ["p1", "p2"],
        sceneEndsAtMs: NOW + HOUR,
      })
    );
    expect(villagerMapOf(locations, "p1")).toBe("reserve");
    expect(villagerMapOf(locations, "p2")).toBe("town");
  });
});

describe("scene summons", () => {
  it("gathers the cast to town for the event's span", () => {
    const stored: VillagerLocations = { p1: rec("school", NOW - HOUR, NOW + 5 * HOUR) };
    const { locations } = settleVillagerLocations(
      stored,
      inputs({ scenePersonIds: ["p1"], sceneEndsAtMs: NOW + HOUR / 2 })
    );
    expect(villagerMapOf(locations, "p1")).toBe("town");
    expect(locations.p1.nextDriftAt).toBeGreaterThanOrEqual(NOW + HOUR / 2);
  });

  it("a villager already in town stays put but doesn't drift mid-event", () => {
    const stored: VillagerLocations = { p1: rec("town", NOW - 3 * HOUR, NOW - 1) };
    const { locations } = settleVillagerLocations(
      stored,
      inputs({ scenePersonIds: ["p1"], sceneEndsAtMs: NOW + HOUR })
    );
    expect(locations.p1.map).toBe("town");
    expect(locations.p1.nextDriftAt).toBeGreaterThanOrEqual(NOW + HOUR);
  });
});

describe("casual drift", () => {
  const dueBook = (ids: string[]): VillagerLocations =>
    Object.fromEntries(ids.map((id) => [id, rec("town", NOW - 10 * HOUR, NOW - 1)]));

  it("never fires before the drift timestamp", () => {
    const stored: VillagerLocations = { p1: rec("town", NOW - HOUR, NOW + HOUR) };
    const { locations, changed } = settleVillagerLocations(stored, inputs({ people: [person("p1")] }));
    expect(changed).toBe(false);
    expect(locations.p1).toEqual(stored.p1);
  });

  it("moves some due villagers to unlocked ambient maps — deterministically", () => {
    const ids = ["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8", "d9", "d10", "d11", "d12"];
    const stored = dueBook(ids);
    const run = () =>
      settleVillagerLocations(stored, inputs({ people: ids.map(person) })).locations;
    const a = run();
    const b = run();
    expect(a).toEqual(b); // same inputs, same truth on every screen

    let movers = 0;
    for (const id of ids) {
      const r = a[id];
      if (r.map !== "town") {
        movers++;
        expect(["city", "school"]).toContain(r.map);
        expect(r.setAt).toBe(NOW);
        expect(r.nextDriftAt).toBeGreaterThanOrEqual(NOW + 2 * HOUR);
        expect(r.nextDriftAt).toBeLessThanOrEqual(NOW + 6 * HOUR);
      } else {
        // Stayed: the next chance is 1–3h out, never immediate.
        expect(r.nextDriftAt).toBeGreaterThanOrEqual(NOW + HOUR);
        expect(r.nextDriftAt).toBeLessThanOrEqual(NOW + 3 * HOUR);
      }
    }
    expect(movers).toBeGreaterThan(0);
  });

  it("never drifts while working, even when long overdue", () => {
    const stored: VillagerLocations = { p1: rec("city", NOW - 10 * HOUR, NOW - 1) };
    const { locations } = settleVillagerLocations(
      stored,
      inputs({ assignments: [workAssignment("p1", "working")] })
    );
    expect(villagerMapOf(locations, "p1")).toBe("town"); // the pin, not a drift
    expect(locations.p1.nextDriftAt).toBeGreaterThan(NOW);
  });

  it("never drifts at night", () => {
    const stored: VillagerLocations = { p1: rec("town", NOW - 10 * HOUR, NOW - 1) };
    const { locations, changed } = settleVillagerLocations(
      stored,
      inputs({ people: [person("p1")], isNight: true })
    );
    expect(changed).toBe(false);
    expect(locations.p1).toEqual(stored.p1);
  });

  it("with only town unlocked there is nowhere to drift to", () => {
    const stored: VillagerLocations = { p1: rec("town", NOW - 10 * HOUR, NOW - 1) };
    const { locations } = settleVillagerLocations(stored, inputs({ unlockedMaps: ["town"] }));
    expect(locations.p1.map).toBe("town");
    expect(locations.p1.nextDriftAt).toBeGreaterThan(NOW);
  });

  it("an idle villager stranded off the ambient maps strolls home", () => {
    const stale: VillagerLocations = { p1: rec("reserve", NOW - 31 * 60_000, NOW + HOUR) };
    const { locations } = settleVillagerLocations(stale, inputs());
    expect(villagerMapOf(locations, "p1")).toBe("town");
    // …but a fresh arrival is left alone (grace period).
    const fresh: VillagerLocations = { p1: rec("reserve", NOW - 5 * 60_000, NOW + HOUR) };
    const again = settleVillagerLocations(fresh, inputs());
    expect(villagerMapOf(again.locations, "p1")).toBe("reserve");
  });
});

describe("one villager, one map — disjoint render lists", () => {
  it("no id appears on two maps in a mixed fixture", () => {
    const { locations } = settleVillagerLocations(
      {
        a: rec("town", NOW - HOUR, NOW + 5 * HOUR),
        b: rec("city", NOW - HOUR, NOW + 5 * HOUR),
        c: rec("school", NOW - HOUR, NOW + 5 * HOUR),
        d: rec("town", NOW - HOUR, NOW + 5 * HOUR),
      },
      inputs({
        people: [person("a"), person("b"), person("c"), person("d")],
        fieldMissions: [fieldMission("d")],
      })
    );
    const lights = ["a", "b", "c", "d"].map((personId) => ({ personId }));
    const lists = (["town", "city", "school"] as TownMapId[]).map((m) =>
      lightsForMap(lights, locations, m).map((l) => l.personId)
    );
    const flat = lists.flat();
    expect(new Set(flat).size).toBe(flat.length); // pairwise disjoint
    expect(flat.sort()).toEqual(["a", "b", "c"]); // d is at the Mission Field
    expect(locatedCountOnMap(locations, ["a", "b", "c", "d"], "town")).toBe(1);
    expect(locatedCountOnMap(locations, ["a", "b", "c", "d"], "city")).toBe(1);
    expect(locatedCountOnMap(locations, ["a", "b", "c", "d"], "school")).toBe(1);
    expect(locatedCountOnMap(locations, ["a", "b", "c", "d"], "reserve")).toBe(1);
  });

  it("names places in plain words", () => {
    expect(locationPhrase("town")).toBe("in Town");
    expect(locationPhrase("city")).toBe("in the City");
    expect(locationPhrase("school")).toBe("at School");
    expect(locationPhrase("reserve")).toBe("at the Mission Field");
    expect(locationPhrase("mall")).toBe("at the Garden");
  });
});

describe("settleAndSaveVillagerLocations", () => {
  beforeEach(() => {
    store.data.clear();
    store.setCalls.length = 0;
  });

  it("saves only when something moved", async () => {
    const first = await settleAndSaveVillagerLocations(inputs());
    expect(first.changed).toBe(true);
    expect(store.setCalls.length).toBe(1);
    expect(store.setCalls[0][0]).toBe(VILLAGER_LOCATIONS_KEY);

    const second = await settleAndSaveVillagerLocations(inputs());
    expect(second.changed).toBe(false);
    expect(store.setCalls.length).toBe(1); // no rewrite
    expect(second.locations).toEqual(first.locations);
  });
});

describe("roster reads the same truth", () => {
  const prayed = (id: string, name: string): PrayedPerson => ({ id, name });
  const rosterBase = {
    assignments: [] as VillagerWorkAssignment[],
    fieldMissions: [] as FieldMission[],
    villagerMissions: [] as VillagerMission[],
    townBuildings: [],
    isNight: false,
    nowMs: NOW,
  };

  it("idle and sleeping rows say which map the villager is on", () => {
    const locations: VillagerLocations = {
      "1": rec("town", NOW - HOUR, NOW + 5 * HOUR),
      "2": rec("school", NOW - HOUR, NOW + 5 * HOUR),
    };
    const rows = buildRosterRows({
      ...rosterBase,
      people: [prayed("1", "Cody"), prayed("2", "Ana")],
      locations,
    });
    const cody = rows.find((r) => r.personId === "1")!;
    const ana = rows.find((r) => r.personId === "2")!;
    expect(cody.detail).toBe("In Town");
    expect(cody.mapId).toBe("town");
    expect(ana.detail).toBe("At School");
    expect(ana.mapLabel).toBe("at School");

    const night = buildRosterRows({
      ...rosterBase,
      people: [prayed("2", "Ana")],
      isNight: true,
      locations,
    });
    expect(night[0].status).toBe("sleeping");
    expect(night[0].detail).toBe("At School");
  });

  it("a request row appends where the villager is waiting", () => {
    const locations: VillagerLocations = { "1": rec("city", NOW - HOUR, NOW + 5 * HOUR) };
    const rows = buildRosterRows({
      ...rosterBase,
      people: [prayed("1", "Cody")],
      villagerMissions: [
        {
          id: "vm-1", personId: "1", personName: "Cody", kind: "garden",
          targetLabel: "Garden of Remembrance", message: "", rewardCoins: 140, rewardXP: 12,
          createdAt: new Date(NOW).toISOString(), spawnedSlot: NOW, status: "waiting",
        },
      ],
      locations,
    });
    expect(rows[0].status).toBe("request");
    expect(rows[0].detail).toBe("Wants to visit: Garden of Remembrance · in the City");
  });

  it("without locations, rows are exactly what they were before", () => {
    const rows = buildRosterRows({ ...rosterBase, people: [prayed("1", "Cody")] });
    expect(rows[0].status).toBe("idle");
    expect(rows[0].detail).toBeUndefined();
    expect(rows[0].mapId).toBeUndefined();
  });
});

describe("consumers are wired to the one truth (source guards)", () => {
  const hometownSrc = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");
  const officeSrc = readFileSync(join(process.cwd(), "app/main-office-interior.tsx"), "utf8");

  it("the map renders TownNPCs from the per-map list, never the raw roster", () => {
    expect(hometownSrc).toContain("lights={lightsForActiveMap}");
    expect(hometownSrc).toContain("lightsForMap(visibleLights, villagerLocations, activeMap)");
    expect(hometownSrc).not.toContain("lights={visibleLights}");
  });

  it("presence counts only same-map villagers off the viewed map", () => {
    // away accrual + live tick both route through locatedCountOnMap
    expect(hometownSrc.match(/locatedCountOnMap\(/g)?.length).toBeGreaterThanOrEqual(2);
    expect(hometownSrc).toContain("mapId === activeMapRef.current");
  });

  it("the screen settles locations from work, missions and scenes", () => {
    expect(hometownSrc).toContain("settleAndSaveVillagerLocations({");
    expect(hometownSrc).toContain("scenePersonIds: scheduleActivity?.withVillagers");
  });

  it("villager requests only spawn for villagers actually in town", () => {
    expect(hometownSrc).toContain('villagerMapOf(villagerLocationsRef.current, l.personId) === "town"');
  });

  it("the Main Office settles locations and feeds them to the roster", () => {
    expect(officeSrc).toContain("settleAndSaveVillagerLocations({");
    expect(officeSrc).toContain("locations: roster.locations");
  });
});
