// v173 — Quality-of-life bundle: three small things Jonathan asked for
// on 2026-10-22.
//
// 1. SETTINGS XP LINE. His screenshot: "Level 25 · Faithful" trapped in
//    a small outlined box, shoving "30961 XP · 1539 to Level 26" out of
//    line. Cause (app/(tabs)/index.tsx): the profile card's progress
//    header was one row — a flex:1 slot holding the level's bordered
//    badge frame beside an unshrunk XP totals Text. Their combined
//    intrinsic widths exceed the card's inner width at phone size, so
//    the slot squeezed and the label wrapped mid-phrase inside its
//    frame. Fix is layout only: the header stacks (badge line, then the
//    totals on their own full-width line), the label can shrink, and
//    the totals are pinned to one line. The readout exists ONLY in that
//    card (getXPLevelTitle is used nowhere else), so one fix covers
//    every instance.
//
// 2. MISSION CANCEL. A light out on a field mission couldn't be
//    recalled. cancelMission drops the record — and grants nothing:
//    the blessing is locked at dispatch but pays only on completion.
//    Returned or collected missions refuse cancellation.
//
// 3. "SAME AS LAST TIME". The work ledger now remembers each
//    villager's last job (kind + meal recipient) through sends and
//    collects, and the Main Office resends through the very same
//    dispatch path as a manual assignment.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

import {
  BUILDINGS,
  COINS_STORAGE_KEY,
  MISSION_STORAGE_KEY,
  canCancelMission,
  cancelMission,
  loadCoinsRecord,
  loadMissions,
  parseMissions,
  saveMissions,
  type BuildingType,
  type FieldMission,
  type PlacedBuilding,
  type PrayedPerson,
} from "../hometown";
import { buildRosterRows, canResendRow } from "../villager-roster";
import {
  WORK_KINDS,
  collectWorkAssignment,
  createWorkAssignment,
  lastJobFor,
  loadVillagerWorkState,
  parseLastJobs,
  saveVillagerWorkState,
  sendWorkAssignment,
  tickWorkAssignments,
  type VillagerWorkState,
} from "../villager-work";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

beforeEach(() => {
  store.clear();
});

// ---- fixtures -------------------------------------------------------

const SENT = new Date("2026-10-22T08:00:00.000Z");
const OUT_NOW = new Date(SENT.getTime() + 1 * 3600000); // 1h into an 8h trip
const BACK_NOW = new Date(SENT.getTime() + 9 * 3600000); // home again

function fieldMission(over: Partial<FieldMission> = {}): FieldMission {
  return {
    id: "m-1",
    personId: "p-1",
    name: "Ana",
    duration: "long",
    sentAt: SENT.toISOString(),
    returnAt: new Date(SENT.getTime() + 8 * 3600000).toISOString(),
    coins: 3000,
    blessingV: 2,
    xp: 25,
    verse: { text: "Let your light shine before others.", ref: "Matthew 5:16" },
    collected: false,
    ...over,
  };
}

const b = (type: BuildingType, extra: Partial<PlacedBuilding> = {}): PlacedBuilding => ({
  id: `b-${type}`,
  type,
  x: 0,
  y: 0,
  level: 1,
  ...extra,
});

const person = (id: string, name: string): PrayedPerson => ({ id, name });

function rosterFor(args: {
  fieldMissions?: FieldMission[];
  townBuildings?: PlacedBuilding[];
  lastJobs?: Record<string, { kind: keyof typeof WORK_KINDS; recipientName?: string }>;
  nowMs?: number;
}) {
  return buildRosterRows({
    people: [person("p-1", "Ana")],
    assignments: [],
    fieldMissions: args.fieldMissions ?? [],
    villagerMissions: [],
    townBuildings: args.townBuildings ?? [],
    isNight: false,
    nowMs: args.nowMs ?? OUT_NOW.getTime(),
    ...(args.lastJobs ? { lastJobs: args.lastJobs } : {}),
  });
}

// ---- 1. Settings XP line (source pins) ------------------------------
// v315 RETIRED: this block pinned the XP readout that lived in the
// Settings profile card (the badge squeeze fix, the totals on their
// own line, the readout's exact words). The Settings rebuild
// removed the whole profile/stats card by Jonathan's ruling — XP
// and fasting readouts live on the Profile and fasting pages, not
// in Settings — so the pins' subject no longer exists. What remains
// worth pinning is the absence itself.

describe("Settings XP line — retired with the profile card (v315)", () => {
  const src = read("app/(tabs)/index.tsx");
  const settingsSlice = src.slice(src.indexOf("const renderSettingsScreen"), src.indexOf("const [bibleChapters"));

  it("no XP readout renders anywhere in the rebuilt Settings screen", () => {
    expect(settingsSlice).not.toContain("fastProgressType");
    expect(settingsSlice).not.toContain("xpState.totalXP");
    expect(settingsSlice).not.toContain("XP to next level");
  });
});

// ---- 2. Mission cancel ----------------------------------------------

describe("canCancelMission — only a light still out can be recalled", () => {
  it("out → cancellable; returned → not; collected → not", () => {
    const m = fieldMission();
    expect(canCancelMission(m, OUT_NOW)).toBe(true);
    expect(canCancelMission(m, BACK_NOW)).toBe(false);
    expect(canCancelMission(fieldMission({ collected: true, collectedAt: BACK_NOW.toISOString() }), OUT_NOW)).toBe(false);
  });
});

describe("cancelMission — the record drops, nothing is paid", () => {
  it("removes the mission and returns it as the cancelled one", () => {
    const m1 = fieldMission();
    const m2 = fieldMission({ id: "m-2", personId: "p-2", name: "Bo" });
    const { missions, cancelled } = cancelMission([m1, m2], "m-1", OUT_NOW);
    expect(cancelled).toEqual(m1);
    expect(missions).toEqual([m2]);
  });

  it("the villager is free immediately — the roster reads idle again", () => {
    const m1 = fieldMission();
    const before = rosterFor({ fieldMissions: [m1] });
    expect(before[0].status).toBe("mission");
    expect(before[0].missionCancellable).toBe(true);
    expect(before[0].fieldMission?.id).toBe("m-1");

    const { missions } = cancelMission([m1], "m-1", OUT_NOW);
    const after = rosterFor({ fieldMissions: missions });
    expect(after[0].status).toBe("idle");
    expect(after[0].fieldMission).toBeUndefined();
  });

  it("a returned mission's row offers no cancel — it is welcomed home instead", () => {
    const rows = rosterFor({ fieldMissions: [fieldMission()], nowMs: BACK_NOW.getTime() });
    expect(rows[0].status).toBe("mission");
    expect(rows[0].statusLabel).toBe("Back from a mission");
    expect(rows[0].missionCancellable).toBe(false);
  });

  it("a returned or collected mission cannot be cancelled", () => {
    const out = [fieldMission()];
    const returnedTry = cancelMission(out, "m-1", BACK_NOW);
    expect(returnedTry.cancelled).toBeNull();
    expect(returnedTry.missions).toBe(out); // same list, untouched

    const collected = [fieldMission({ collected: true })];
    const collectedTry = cancelMission(collected, "m-1", OUT_NOW);
    expect(collectedTry.cancelled).toBeNull();
    expect(collectedTry.missions).toBe(collected);

    const unknownTry = cancelMission(out, "nope", OUT_NOW);
    expect(unknownTry.cancelled).toBeNull();
    expect(unknownTry.missions).toBe(out);
  });

  it("grants nothing: the coins ledger is byte-identical after a cancel", async () => {
    store.set(COINS_STORAGE_KEY, JSON.stringify({ balance: 1000, lifetimeEarned: 5000 }));
    await saveMissions([fieldMission()]);
    const loaded = await loadMissions();
    const { missions: next, cancelled } = cancelMission(loaded, "m-1", OUT_NOW);
    expect(cancelled).not.toBeNull();
    await saveMissions(next);
    // The balance never moved — no coins, and (by construction of the
    // flow) no XP or verse either: cancel only rewrites the list.
    expect(await loadCoinsRecord()).toEqual({ balance: 1000, lifetimeEarned: 5000 });
    expect(await loadMissions()).toEqual([]);
    expect(JSON.parse(store.get(MISSION_STORAGE_KEY)!)).toEqual([]);
  });

  it("legacy (pre-v171) mission records still parse and load", async () => {
    const legacyRaw = {
      id: "m-old",
      personId: "p-9",
      name: "Old Light",
      duration: "day",
      sentAt: SENT.toISOString(),
      returnAt: new Date(SENT.getTime() + 4 * 3600000).toISOString(),
      coins: 200,
      xp: 10,
      collected: false,
      // no blessingV — pre-v171 shape
    };
    const parsed = parseMissions([legacyRaw]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].blessingV).toBeUndefined();
    // ...and a legacy record can still be recalled while out.
    expect(cancelMission(parsed, "m-old", OUT_NOW).cancelled?.id).toBe("m-old");

    // The one-time salvage from the pre-split storage key still works.
    store.set("prayercircle.hometown.missions.v1", JSON.stringify([legacyRaw]));
    const salvaged = await loadMissions();
    expect(salvaged.map((m) => m.id)).toEqual(["m-old"]);
  });

  it("source pins: both surfaces confirm once and route through cancelMission", () => {
    const office = read("app/main-office-interior.tsx");
    expect(office).toContain("cancelMission(fresh, mission.id)");
    expect(office).toContain('"Bring them home early?"');
    expect(office).toContain("No blessing will be paid.");
    const field = read("components/mission-field.tsx");
    expect(field).toContain("onCancel");
    expect(field).toContain('"Bring them home early?"');
    expect(field).toContain("No blessing will be paid.");
    const town = read("app/hometown.tsx");
    expect(town).toContain("onCancel={handleCancelMission}");
    expect(town).toContain("cancelMission(prev, mission.id)");
    const card = read("components/roster-board.tsx");
    expect(card).toContain("Cancel trip");
  });
});

// ---- 3. Same as last time --------------------------------------------

describe("last job memory (lib/villager-work)", () => {
  const T0 = new Date("2026-10-22T09:00:00").getTime();

  it("a send records the villager's last job", () => {
    const a = createWorkAssignment({ personId: "p-1", personName: "Ana", kind: "bank-shift", nowMs: T0 });
    const s1 = sendWorkAssignment({ assignments: [] }, a);
    expect(s1.assignments).toEqual([a]);
    expect(lastJobFor(s1, "p-1")).toEqual({ kind: "bank-shift" });
    // A newer send overwrites the memory.
    const a2 = createWorkAssignment({ personId: "p-1", personName: "Ana", kind: "work-farm", nowMs: T0 + 1000 });
    const s2 = sendWorkAssignment({ assignments: [], lastJobs: s1.lastJobs }, a2);
    expect(lastJobFor(s2, "p-1")).toEqual({ kind: "work-farm" });
  });

  it("deliver-meal remembers who the meal was for", () => {
    const a = createWorkAssignment({ personId: "p-1", personName: "Ana", kind: "deliver-meal", recipientName: "Bo", nowMs: T0 });
    const s1 = sendWorkAssignment({ assignments: [] }, a);
    expect(lastJobFor(s1, "p-1")).toEqual({ kind: "deliver-meal", recipientName: "Bo" });
  });

  it("the memory survives the send → done → collect cycle", () => {
    const a = createWorkAssignment({ personId: "p-1", personName: "Ana", kind: "bank-shift", nowMs: T0 });
    const sent = sendWorkAssignment({ assignments: [] }, a);
    const doneState: VillagerWorkState = {
      ...sent,
      assignments: sent.assignments.map((x) => ({ ...x, status: "done" as const })),
    };
    const { state: afterCollect, assignment } = collectWorkAssignment(doneState, a.id);
    expect(assignment?.id).toBe(a.id);
    expect(afterCollect.assignments).toEqual([]);
    expect(lastJobFor(afterCollect, "p-1")).toEqual({ kind: "bank-shift" });
  });

  it("the memory survives ticks and a storage round-trip", async () => {
    const a = createWorkAssignment({ personId: "p-1", personName: "Ana", kind: "restock", nowMs: T0 });
    const sent = sendWorkAssignment({ assignments: [] }, a);
    const { state: ticked } = tickWorkAssignments(sent, T0 + WORK_KINDS.restock.durationMs + 1);
    expect(lastJobFor(ticked, "p-1")).toEqual({ kind: "restock" });

    await saveVillagerWorkState(sent);
    const loaded = await loadVillagerWorkState();
    expect(lastJobFor(loaded, "p-1")).toEqual({ kind: "restock" });
    expect(loaded.assignments).toHaveLength(1);
  });

  it("a pre-v173 save (no lastJobs) loads to the shape it always had", async () => {
    const a = createWorkAssignment({ personId: "p-1", personName: "Ana", kind: "work-farm", nowMs: T0 });
    store.set("prayercircle.hometown.villager-work.v1", JSON.stringify({ assignments: [a] }));
    const loaded = await loadVillagerWorkState();
    expect(loaded.assignments).toHaveLength(1);
    expect(loaded.lastJobs).toBeUndefined();
    expect(lastJobFor(loaded, "p-1")).toBeNull();
  });

  it("parseLastJobs drops malformed entries and unknown kinds", () => {
    expect(
      parseLastJobs({
        "p-1": { kind: "bank-shift" },
        "p-2": { kind: "not-a-job" },
        "p-3": "bank-shift",
        "p-4": { kind: "deliver-meal", recipientName: "Cy" },
        "p-5": { kind: "deliver-meal", recipientName: 42 },
      })
    ).toEqual({
      "p-1": { kind: "bank-shift" },
      "p-4": { kind: "deliver-meal", recipientName: "Cy" },
      "p-5": { kind: "deliver-meal" },
    });
    expect(parseLastJobs(null)).toEqual({});
    expect(parseLastJobs([1, 2])).toEqual({});
  });

  it("a resend builds the identical assignment a manual send of that job builds", () => {
    const T1 = T0 + 5000;
    const remembered = { kind: "deliver-meal" as const, recipientName: "Bo" };
    const manual = createWorkAssignment({ personId: "p-1", personName: "Ana", kind: "deliver-meal", recipientName: "Bo", nowMs: T1 });
    const resend = createWorkAssignment({
      personId: "p-1",
      personName: "Ana",
      kind: remembered.kind,
      recipientName: remembered.recipientName,
      nowMs: T1,
    });
    expect(resend).toEqual(manual);
    // And the resend's own send keeps the memory pointing at the same job.
    const s = sendWorkAssignment({ assignments: [], lastJobs: { "p-1": remembered } }, resend);
    expect(lastJobFor(s, "p-1")).toEqual(remembered);
  });
});

describe("roster resend gating — the button exists only when the job can be worked", () => {
  const lastJobs = { "p-1": { kind: "bank-shift" as const } };

  it("idle + remembered job + site standing → resend offered, site named", () => {
    const rows = rosterFor({ townBuildings: [b("bank")], lastJobs });
    expect(rows[0].status).toBe("idle");
    expect(rows[0].lastJob).toEqual({ kind: "bank-shift" });
    expect(rows[0].lastJobSiteName).toBe(BUILDINGS.bank.name);
    expect(canResendRow(rows[0])).toBe(true);
  });

  it("the building is gone → the memory stays, the button doesn't", () => {
    const rows = rosterFor({ townBuildings: [], lastJobs });
    expect(rows[0].lastJob).toEqual({ kind: "bank-shift" });
    expect(rows[0].lastJobSiteName).toBeUndefined();
    expect(canResendRow(rows[0])).toBe(false);
  });

  it("the building is under construction → no resend until it opens", () => {
    const rows = rosterFor({
      townBuildings: [b("bank", { constructionEndsAt: OUT_NOW.getTime() + 3600000 })],
      lastJobs,
    });
    expect(rows[0].lastJobSiteName).toBeUndefined();
    expect(canResendRow(rows[0])).toBe(false);
  });

  it("no history → no last job, no button", () => {
    const rows = rosterFor({ townBuildings: [b("bank")] });
    expect(rows[0].lastJob).toBeUndefined();
    expect(canResendRow(rows[0])).toBe(false);
  });

  it("source pins: the office resend routes through the manual dispatch", () => {
    const office = read("app/main-office-interior.tsx");
    expect(office).toContain("sendWorkAssignment(fresh, assignment)");
    expect(office).toContain("dispatchWork(row, row.lastJob.kind, row.lastJob.recipientName)");
    const town = read("app/hometown.tsx");
    expect(town).toContain("sendWorkAssignment(st, assignment)");
    const card = read("components/roster-board.tsx");
    expect(card).toContain("Same as last time");
  });
});
