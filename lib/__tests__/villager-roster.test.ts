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
  scaledCoins,
  type BuildingType,
  type FieldMission,
  type PlacedBuilding,
  type PrayedPerson,
} from "../hometown";
import { BLOODMOON_COIN_MULT } from "../badges";
import {
  buildRosterRows,
  canAssignRow,
  collectAllTotalCoins,
  collectPayoutCoins,
  collectableRows,
  jobOptionsFor,
  rosterSummary,
  rosterSummaryText,
  showCollectAll,
  workSiteFor,
  type RosterRow,
} from "../villager-roster";
import {
  WORK_KINDS,
  collectWorkAssignment,
  collectWorkAssignments,
  createWorkAssignment,
  type VillagerWorkAssignment,
  type VillagerWorkState,
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

describe("collectWorkAssignments — the Collect All sweep", () => {
  const doneRestock = assignment("1", "Cody", "restock", "done", { bonusCoins: 45 });
  const doneFarm = assignment("2", "Joy", "work-farm", "done");
  const doneBank = assignment("3", "Melody", "bank-shift", "done");
  const stillWorking = assignment("4", "Eva", "restock", "working");
  const freshState = (): VillagerWorkState => ({
    assignments: [doneRestock, doneFarm, doneBank, stillWorking].map((a) => ({ ...a })),
  });
  const ids = [doneRestock.id, doneFarm.id, doneBank.id];

  /** The single-collect payout for one shift, spelled out from the raw
   *  numbers: scaled reward (bonus included), Bloodmoon on top. */
  const singlePayout = (a: VillagerWorkAssignment, bloodmoon: boolean) => {
    const base = scaledCoins(WORK_KINDS[a.kind].rewardCoins + (a.bonusCoins ?? 0));
    return bloodmoon ? base * BLOODMOON_COIN_MULT : base;
  };

  it("collects every done shift in the set, once each", () => {
    const { state, collected, skippedIds } = collectWorkAssignments(freshState(), ids);
    expect(collected.map((a) => a.id).sort()).toEqual([...ids].sort());
    expect(skippedIds).toEqual([]);
    expect(state.assignments.map((a) => a.id)).toEqual([stillWorking.id]);
  });

  it("skips ids that fail the guard and still collects the rest", () => {
    const { state, collected, skippedIds } = collectWorkAssignments(freshState(), [
      doneFarm.id,
      stillWorking.id, // not done yet
      "no-such-shift",
    ]);
    expect(collected.map((a) => a.id)).toEqual([doneFarm.id]);
    expect(skippedIds).toEqual([stillWorking.id, "no-such-shift"]);
    expect(state.assignments.map((a) => a.id).sort()).toEqual(
      [doneRestock.id, doneBank.id, stillWorking.id].sort()
    );
  });

  it("a repeat sweep over the same ids collects nothing twice", () => {
    const first = collectWorkAssignments(freshState(), ids);
    const second = collectWorkAssignments(first.state, ids);
    expect(second.collected).toEqual([]);
    expect(second.skippedIds).toEqual(ids);
    expect(second.state.assignments.map((a) => a.id)).toEqual([stillWorking.id]);
  });

  it("pays exactly the sum of collecting each shift individually", () => {
    for (const bloodmoon of [false, true]) {
      // Individual path: one guarded collect at a time, fresh state.
      let individual = freshState();
      let individualTotal = 0;
      for (const id of ids) {
        const { state, assignment: done } = collectWorkAssignment(individual, id);
        expect(done).not.toBeNull();
        individual = state;
        individualTotal += singlePayout(done!, bloodmoon);
      }
      // Sweep path: same set, same state — the grant must match to the cent.
      const { collected } = collectWorkAssignments(freshState(), ids);
      const sweepTotal = collected.reduce((s, a) => s + singlePayout(a, bloodmoon), 0);
      expect(sweepTotal).toBeCloseTo(individualTotal, 10);
      // And the shared payout helper the office pays through agrees.
      const helperTotal = collected.reduce(
        (s, a) =>
          s + collectPayoutCoins(WORK_KINDS[a.kind].rewardCoins + (a.bonusCoins ?? 0), bloodmoon),
        0
      );
      expect(helperTotal).toBeCloseTo(individualTotal, 10);
    }
  });
});

describe("Collect All roster helpers", () => {
  const base = {
    fieldMissions: [] as FieldMission[],
    villagerMissions: [] as VillagerMission[],
    townBuildings: TOWN,
    isNight: false,
    nowMs: NOW,
  };
  const rowsFor = (doneCount: number) =>
    buildRosterRows({
      ...base,
      people: [
        person("1", "Cody"),
        person("2", "Joy"),
        person("3", "Melody"),
        person("4", "Eva"),
      ],
      assignments: [
        ...(doneCount >= 1
          ? [assignment("1", "Cody", "restock", "done", { bonusCoins: 45 })]
          : []),
        ...(doneCount >= 2 ? [assignment("2", "Joy", "work-farm", "done")] : []),
        ...(doneCount >= 3 ? [assignment("3", "Melody", "bank-shift", "done")] : []),
        assignment("4", "Eva", "restock", "working"),
      ] as VillagerWorkAssignment[],
    });

  it("the button stays hidden below two ready shifts", () => {
    expect(showCollectAll(rowsFor(0))).toBe(false);
    expect(showCollectAll(rowsFor(1))).toBe(false);
    expect(showCollectAll(rowsFor(2))).toBe(true);
    expect(showCollectAll(rowsFor(3))).toBe(true);
    expect(collectableRows(rowsFor(3))).toHaveLength(3);
  });

  it("the label total equals the sum of the individual ready payouts", () => {
    const rows = rowsFor(3);
    for (const bloodmoon of [false, true]) {
      const expected = collectableRows(rows).reduce((sum, r) => {
        const a = r.assignment!;
        const baseCoins = scaledCoins(WORK_KINDS[a.kind].rewardCoins + (a.bonusCoins ?? 0));
        return sum + (bloodmoon ? baseCoins * BLOODMOON_COIN_MULT : baseCoins);
      }, 0);
      expect(collectAllTotalCoins(rows, bloodmoon)).toBeCloseTo(expected, 10);
      // Per-row display amounts (what each row button pays) sum to it too.
      const rowSum = collectableRows(rows).reduce(
        (sum, r) => sum + collectPayoutCoins(r.collectCoins ?? 0, bloodmoon),
        0
      );
      expect(collectAllTotalCoins(rows, bloodmoon)).toBeCloseTo(rowSum, 10);
    }
  });

  it("working and idle rows never count toward the total", () => {
    const rows = rowsFor(1);
    expect(collectAllTotalCoins(rows, false)).toBeCloseTo(
      collectPayoutCoins(WORK_KINDS.restock.rewardCoins + 45, false),
      10
    );
  });
});

describe("Main Office wiring (source guards)", () => {
  const office = readFileSync(join(process.cwd(), "app/main-office-interior.tsx"), "utf8");
  const hometown = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");

  it("assigns and collects through the same villager-work APIs as the map", () => {
    expect(office).toContain("createWorkAssignment");
    expect(office).toContain("collectWorkAssignment");
    expect(office).toContain("collectWorkAssignments");
    expect(office).toContain("loadVillagerWorkState");
    expect(office).toContain("saveVillagerWorkState");
    expect(office).toContain("tickWorkAssignments");
  });

  it("Collect All: one button, live total, gated at two ready shifts", () => {
    expect(office).toContain("Collect All");
    expect(office).toContain("showCollectAll(rows)");
    expect(office).toContain("collectAllTotalCoins(rows, bloodmoon)");
    expect(office).toContain("collectableRows(rowsRef.current)");
  });

  it("keeps the roster live: focus + interval refresh of the shared keys", () => {
    expect(office).toContain("useFocusEffect");
    expect(office).toContain("setInterval(refreshRoster, 4000)");
  });

  it("pays the Bloodmoon blessing on collect, like the map's ledger", () => {
    // The office pays through the one shared payout helper, and the
    // helper is where the Bloodmoon multiplier lives.
    expect(office).toContain("collectPayoutCoins");
    const roster = readFileSync(join(process.cwd(), "lib/villager-roster.ts"), "utf8");
    expect(roster).toContain("BLOODMOON_COIN_MULT");
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
