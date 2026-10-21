// Villager roster (Main Office): work-site resolution mirrors the town
// map's findWorkTarget, the row model derives plain-words statuses with
// the right precedence, rows sort attention-first, and the office screen
// drives the same villager-work APIs as the on-map picker.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
  },
}));

import {
  BUILDINGS,
  type BuildingType,
  type FieldMission,
  type PlacedBuilding,
  type PrayedPerson,
} from "../hometown";
import {
  buildRosterRows,
  canAssignRow,
  jobOptionsFor,
  rosterSummary,
  rosterSummaryText,
  workSiteFor,
  type RosterRow,
} from "../villager-roster";
import {
  WORK_KINDS,
  createWorkAssignment,
  type VillagerWorkAssignment,
} from "../villager-work";
import type { VillagerMission } from "../villager-missions";

const b = (type: BuildingType, id = `b-${type}`): PlacedBuilding => ({
  id,
  type,
  x: 0,
  y: 0,
  level: 1,
});

const person = (id: string, name: string): PrayedPerson => ({ id, name });

const NOW = new Date("2026-10-20T10:00:00").getTime(); // a Tuesday morning

function assignment(
  personId: string,
  personName: string,
  kind: VillagerWorkAssignment["kind"],
  status: VillagerWorkAssignment["status"],
  extra: Partial<VillagerWorkAssignment> = {}
): VillagerWorkAssignment {
  return {
    ...createWorkAssignment({ personId, personName, kind, nowMs: NOW }),
    status,
    ...extra,
  };
}

const TOWN: PlacedBuilding[] = [
  b("church"),
  b("farm"),
  b("community-garden"),
  b("bank"),
  b("upper-room"),
  b("banquet-table"),
];

describe("workSiteFor — mirrors the town map's targeting", () => {
  it("resolves every job to its site building", () => {
    expect(workSiteFor("restock", TOWN)?.buildingType).toBe("church");
    expect(workSiteFor("work-farm", TOWN)?.buildingType).toBe("farm");
    expect(workSiteFor("prune-flowers", TOWN)?.buildingType).toBe("farm");
    expect(workSiteFor("tend-garden", TOWN)?.buildingType).toBe("community-garden");
    expect(workSiteFor("clean-garden", TOWN)?.buildingType).toBe("community-garden");
    expect(workSiteFor("bank-shift", TOWN)?.buildingType).toBe("bank");
    expect(workSiteFor("restaurant-shift", TOWN)?.buildingType).toBe("upper-room");
    expect(workSiteFor("deliver-meal", TOWN)?.buildingType).toBe("banquet-table");
  });

  it("names the site with the building's display name", () => {
    // The church building type is displayed as "Chapel" in this town.
    expect(workSiteFor("restock", TOWN)?.buildingName).toBe(BUILDINGS.church.name);
    expect(workSiteFor("restock", TOWN)?.buildingName).toBe("Chapel");
  });

  it("falls back like the map does", () => {
    // bank-shift: a city bank tower serves when no town bank stands
    expect(workSiteFor("bank-shift", [b("bank-tower")])?.buildingType).toBe("bank-tower");
    // deliver-meal: any restaurant serves when no Banquet Table stands
    expect(workSiteFor("deliver-meal", [b("feast-hall")])?.buildingType).toBe("feast-hall");
    // restaurant-shift only takes real Restaurant Row types
    expect(workSiteFor("restaurant-shift", [b("diner")])).toBeNull();
  });

  it("returns null when the site is unbuilt", () => {
    expect(workSiteFor("restock", [])).toBeNull();
    expect(workSiteFor("restock", [b("farm")])).toBeNull();
    expect(workSiteFor("work-farm", [b("church")])).toBeNull();
  });
});

describe("jobOptionsFor", () => {
  it("lists every work kind with the real reward numbers", () => {
    const options = jobOptionsFor(TOWN);
    expect(options.map((o) => o.kind)).toEqual(Object.keys(WORK_KINDS));
    for (const o of options) {
      expect(o.rewardCoins).toBe(WORK_KINDS[o.kind].rewardCoins);
      expect(o.rewardXP).toBe(WORK_KINDS[o.kind].rewardXP);
      expect(o.available).toBe(true);
      expect(o.reason).toBeUndefined();
    }
  });

  it("disables jobs whose site is unbuilt, with the reason in plain words", () => {
    const options = jobOptionsFor([b("farm")]);
    const byKind = Object.fromEntries(options.map((o) => [o.kind, o]));
    expect(byKind["work-farm"].available).toBe(true);
    expect(byKind["restock"].available).toBe(false);
    expect(byKind["restock"].reason).toBe("Needs a church in town");
    expect(byKind["bank-shift"].available).toBe(false);
    expect(byKind["bank-shift"].reason).toBe("Needs a Bank in town");
    expect(byKind["tend-garden"].reason).toBe("Needs a Community Garden in town");
  });
});

describe("buildRosterRows — status derivation", () => {
  const base = {
    fieldMissions: [] as FieldMission[],
    villagerMissions: [] as VillagerMission[],
    townBuildings: TOWN,
    isNight: false,
    nowMs: NOW,
  };

  it("marks a free villager idle, prayed today, and assignable", () => {
    const rows = buildRosterRows({ ...base, people: [person("1", "Joy")], assignments: [] });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("idle");
    expect(rows[0].statusLabel).toBe("Idle");
    expect(rows[0].prayedToday).toBe(true);
    expect(canAssignRow(rows[0])).toBe(true);
  });

  it("shows a working villager's job and site in plain words", () => {
    const rows = buildRosterRows({
      ...base,
      people: [person("1", "Cody")],
      assignments: [assignment("1", "Cody", "restock", "working")],
    });
    expect(rows[0].status).toBe("working");
    expect(rows[0].statusLabel).toBe("Working: Restock at Chapel");
    expect(rows[0].detail).toContain("Done in");
    expect(canAssignRow(rows[0])).toBe(false);
  });

  it("shows an en-route villager as on the way", () => {
    const rows = buildRosterRows({
      ...base,
      people: [person("1", "Cody")],
      assignments: [assignment("1", "Cody", "bank-shift", "en-route")],
    });
    expect(rows[0].statusLabel).toBe("Working: Work at the Bank at Bank");
    expect(rows[0].detail).toContain("On the way");
  });

  it("a finished shift becomes collectable, box bonus included", () => {
    const rows = buildRosterRows({
      ...base,
      people: [person("1", "Cody")],
      assignments: [assignment("1", "Cody", "restock", "done", { bonusCoins: 45 })],
    });
    expect(rows[0].status).toBe("collect");
    expect(rows[0].statusLabel).toBe("Finished: Restock");
    expect(rows[0].collectCoins).toBe(WORK_KINDS.restock.rewardCoins + 45);
    expect(rows[0].collectXP).toBe(WORK_KINDS.restock.rewardXP);
  });

  it("a finished shift outranks a pending request", () => {
    const rows = buildRosterRows({
      ...base,
      people: [person("1", "Cody")],
      assignments: [assignment("1", "Cody", "work-farm", "done")],
      villagerMissions: [
        {
          id: "vm-1", personId: "1", personName: "Cody", kind: "bank",
          targetLabel: "Bank", message: "", rewardCoins: 100, rewardXP: 8,
          createdAt: new Date(NOW).toISOString(), spawnedSlot: NOW, status: "waiting",
        },
      ],
    });
    expect(rows[0].status).toBe("collect");
  });

  it("marks a villager away on a field mission, and back when returned", () => {
    const mission: FieldMission = {
      id: "fm-1", personId: "1", name: "Cody", duration: "day",
      sentAt: new Date(NOW - 3600_000).toISOString(),
      returnAt: new Date(NOW + 3600_000).toISOString(),
      coins: 200, xp: 10, collected: false,
    };
    const out = buildRosterRows({ ...base, people: [person("1", "Cody")], assignments: [], fieldMissions: [mission] });
    expect(out[0].status).toBe("mission");
    expect(out[0].statusLabel).toBe("On a mission");

    const back = buildRosterRows({
      ...base,
      people: [person("1", "Cody")],
      assignments: [],
      fieldMissions: [{ ...mission, returnAt: new Date(NOW - 1000).toISOString() }],
    });
    expect(back[0].status).toBe("mission");
    expect(back[0].statusLabel).toBe("Back from a mission");
  });

  it("surfaces a villager's own request and blocks assigning them", () => {
    const rows = buildRosterRows({
      ...base,
      people: [person("1", "Cody")],
      assignments: [],
      villagerMissions: [
        {
          id: "vm-1", personId: "1", personName: "Cody", kind: "garden",
          targetLabel: "Garden of Remembrance", message: "", rewardCoins: 140, rewardXP: 12,
          createdAt: new Date(NOW).toISOString(), spawnedSlot: NOW, status: "waiting",
        },
      ],
    });
    expect(rows[0].status).toBe("request");
    expect(rows[0].statusLabel).toBe("Has a request for you");
    expect(rows[0].detail).toContain("Garden of Remembrance");
    expect(canAssignRow(rows[0])).toBe(false);
  });

  it("at night the free villagers are sleeping, not idle", () => {
    const rows = buildRosterRows({
      ...base,
      isNight: true,
      people: [person("1", "Joy")],
      assignments: [],
    });
    expect(rows[0].status).toBe("sleeping");
    expect(rows[0].statusLabel).toBe("Sleeping");
    expect(canAssignRow(rows[0])).toBe(false);
  });
});

describe("buildRosterRows — sort + summary", () => {
  it("sorts idle, collectable, request, working, then away/asleep; names break ties", () => {
    const people = [
      person("w", "Worker Wendy"),
      person("i2", "Idle Ivan"),
      person("c", "Collect Carl"),
      person("i1", "Idle Anna"),
      person("s", "Sleepy Sue"),
      person("r", "Request Rita"),
    ];
    const rows = buildRosterRows({
      people,
      assignments: [
        assignment("w", "Worker Wendy", "work-farm", "working"),
        assignment("c", "Collect Carl", "work-farm", "done"),
      ],
      fieldMissions: [],
      villagerMissions: [
        {
          id: "vm-r", personId: "r", personName: "Request Rita", kind: "bank",
          targetLabel: "Bank", message: "", rewardCoins: 100, rewardXP: 8,
          createdAt: new Date(NOW).toISOString(), spawnedSlot: NOW, status: "waiting",
        },
      ],
      townBuildings: TOWN,
      isNight: false,
      nowMs: NOW,
    });
    // Sue is idle by day (sleeping only applies at night) — she joins idles.
    expect(rows.map((r: RosterRow) => r.personId)).toEqual(["i1", "i2", "s", "c", "r", "w"]);
    expect(rows.map((r: RosterRow) => r.status)).toEqual([
      "idle", "idle", "idle", "collect", "request", "working",
    ]);

    const summary = rosterSummary(rows);
    expect(summary).toEqual({ total: 6, working: 1, idle: 3, collectable: 1 });
    expect(rosterSummaryText(summary)).toBe("6 villagers · 1 working · 3 idle");
  });

  it("summary text singularizes one villager", () => {
    expect(rosterSummaryText({ total: 1, working: 0, idle: 1, collectable: 0 })).toBe(
      "1 villager · 0 working · 1 idle"
    );
  });
});

describe("Main Office wiring (source guards)", () => {
  const office = readFileSync(join(process.cwd(), "app/main-office-interior.tsx"), "utf8");
  const hometown = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");

  it("assigns and collects through the same villager-work APIs as the map", () => {
    expect(office).toContain("createWorkAssignment");
    expect(office).toContain("collectWorkAssignment");
    expect(office).toContain("loadVillagerWorkState");
    expect(office).toContain("saveVillagerWorkState");
    expect(office).toContain("tickWorkAssignments");
  });

  it("keeps the roster live: focus + interval refresh of the shared keys", () => {
    expect(office).toContain("useFocusEffect");
    expect(office).toContain("setInterval(refreshRoster, 4000)");
  });

  it("pays the Bloodmoon blessing on collect, like the map's ledger", () => {
    expect(office).toContain("BLOODMOON_COIN_MULT");
  });

  it("is reachable: campus tap routes to the office interior, with map art", () => {
    expect(hometown).toContain('"main-office": "/main-office-interior"');
    expect(hometown).toContain('case "main-office"');
  });

  it("the map re-reads the shared work ledger before its own mutations", () => {
    // assign + collect + tick all fold office writes in instead of
    // clobbering them from a stale in-memory copy.
    const reads = hometown.match(/await loadVillagerWorkState\(\)/g) ?? [];
    expect(reads.length).toBeGreaterThanOrEqual(4);
  });
});
