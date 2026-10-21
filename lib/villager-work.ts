// Villager work assignments: JONATHAN sends prayer lights to do timed work.
// This is the mirror of lib/villager-missions.ts (where the lights ask Jonathan
// for help). Here Jonathan assigns the job — the light walks to the work site,
// stays there with a work badge until the timer runs out, then the reward is
// collectible by hand (manual tapping is the core loop — no auto-collect).

import AsyncStorage from "@react-native-async-storage/async-storage";

export const VILLAGER_WORK_KEY = "prayercircle.hometown.villager-work.v1";

export type WorkKind =
  | "clean-garden"
  | "prune-flowers"
  | "bank-shift"
  | "restaurant-shift"
  | "deliver-meal"
  | "work-farm"
  | "tend-garden"
  | "restock";

export type WorkStatus = "en-route" | "working" | "done";

export type VillagerWorkAssignment = {
  id: string;
  personId: string;
  personName: string;
  kind: WorkKind;
  /** For deliver-meal: who the meal is for (flavor only). */
  recipientName?: string;
  /** Restock route state: which leg of the church <-> shop run is active. */
  restockLeg?: "to-church" | "to-deliver";
  /** Restock: building id the carried box is headed to (leg "to-deliver"). */
  restockTargetId?: string;
  /** Restock: boxes delivered so far this shift. */
  boxesDelivered?: number;
  /** Restock: per-box bonus coins banked into the pending pay. */
  bonusCoins?: number;
  assignedAt: string; // ISO
  endsAt: number; // epoch ms
  status: WorkStatus;
};

export const WORK_KINDS: Record<
  WorkKind,
  {
    label: string;
    blurb: string;
    durationMs: number;
    durationLabel: string;
    rewardCoins: number;
    rewardXP: number;
    /** MaterialIcons name shown above the light while they work. */
    badgeIcon: string;
    /**
     * Where the shift happens. When a villager is actively working ("working"
     * status) at a farm or community garden, nearby food buildings get the
     * supply-chain bonus (+35% income).
     */
    siteType?: "farm" | "community-garden";
  }
> = {
  "clean-garden": {
    label: "Tidy the Garden",
    blurb: "Sweep the paths and tend the beds in the Community Garden.",
    durationMs: 30 * 60 * 1000,
    durationLabel: "30 min",
    rewardCoins: 150,
    rewardXP: 7,
    badgeIcon: "cleaning-services",
    siteType: "community-garden",
  },
  "prune-flowers": {
    label: "Prune Flowers",
    blurb: "Trim and water the blooms at the farm.",
    durationMs: 15 * 60 * 1000,
    durationLabel: "15 min",
    rewardCoins: 80,
    rewardXP: 4,
    badgeIcon: "content-cut",
    siteType: "farm",
  },
  "bank-shift": {
    label: "Work at the Bank",
    blurb: "Help count coins and greet folks at the bank.",
    durationMs: 60 * 60 * 1000,
    durationLabel: "1 hour",
    rewardCoins: 250,
    rewardXP: 7,
    badgeIcon: "account-balance",
  },
  "restaurant-shift": {
    label: "Work at a Restaurant",
    blurb: "Serve a shift — set tables, carry plates, wash up.",
    durationMs: 60 * 60 * 1000,
    durationLabel: "1 hour",
    rewardCoins: 250,
    rewardXP: 7,
    badgeIcon: "restaurant",
  },
  "deliver-meal": {
    label: "Deliver a Meal",
    blurb: "Pick up a warm meal and carry it to someone in town.",
    durationMs: 20 * 60 * 1000,
    durationLabel: "20 min",
    rewardCoins: 120,
    rewardXP: 4,
    badgeIcon: "delivery-dining",
  },
  "work-farm": {
    label: "Work the Farm",
    blurb: "Tend the fields and harvest at the farm — nearby food shops and restaurants earn +35%.",
    durationMs: 60 * 60 * 1000,
    durationLabel: "1 hour",
    rewardCoins: 250,
    rewardXP: 7,
    badgeIcon: "agriculture",
    siteType: "farm",
  },
  "tend-garden": {
    label: "Tend the Community Garden",
    blurb: "Work the beds at the Community Garden — fresh produce boosts nearby food buildings +35%.",
    durationMs: 60 * 60 * 1000,
    durationLabel: "1 hour",
    rewardCoins: 250,
    rewardXP: 7,
    badgeIcon: "grass",
    siteType: "community-garden",
  },
  restock: {
    label: "Restock",
    blurb: "Carry boxes from the church to the town's shops — every box delivered fills the shelves a little more.",
    durationMs: 60 * 60 * 1000,
    durationLabel: "1 hour",
    rewardCoins: 250,
    rewardXP: 7,
    badgeIcon: "inventory-2",
  },
};

export type VillagerWorkState = {
  assignments: VillagerWorkAssignment[];
};

function isAssignmentShape(a: unknown): a is VillagerWorkAssignment {
  return (
    !!a &&
    typeof (a as VillagerWorkAssignment).id === "string" &&
    typeof (a as VillagerWorkAssignment).personId === "string" &&
    typeof (a as VillagerWorkAssignment).kind === "string" &&
    typeof (a as VillagerWorkAssignment).endsAt === "number" &&
    typeof (a as VillagerWorkAssignment).status === "string"
  );
}

export async function loadVillagerWorkState(): Promise<VillagerWorkState> {
  try {
    const raw = await AsyncStorage.getItem(VILLAGER_WORK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.assignments)) {
        return { assignments: parsed.assignments.filter(isAssignmentShape) };
      }
    }
  } catch {}
  return { assignments: [] };
}

export async function saveVillagerWorkState(state: VillagerWorkState): Promise<void> {
  try {
    await AsyncStorage.setItem(VILLAGER_WORK_KEY, JSON.stringify(state));
  } catch {}
}

/** All assignments worth showing — active ones plus done-but-uncollected. */
export function activeWorkAssignments(
  assignments: VillagerWorkAssignment[]
): VillagerWorkAssignment[] {
  return assignments;
}

export function personHasActiveWork(
  assignments: VillagerWorkAssignment[],
  personId: string
): boolean {
  return assignments.some((a) => a.personId === personId && a.status !== "done");
}

/** Create a new assignment. Pure — the caller saves. */
export function createWorkAssignment(args: {
  personId: string;
  personName: string;
  kind: WorkKind;
  recipientName?: string;
  nowMs?: number;
}): VillagerWorkAssignment {
  const nowMs = args.nowMs ?? Date.now();
  const def = WORK_KINDS[args.kind];
  return {
    id: `vw-${nowMs}-${args.personId}-${args.kind}`,
    personId: args.personId,
    personName: args.personName,
    kind: args.kind,
    recipientName: args.recipientName,
    // A restock shift starts by heading to the church to pick up a box.
    ...(args.kind === "restock"
      ? { restockLeg: "to-church" as const, boxesDelivered: 0, bonusCoins: 0 }
      : {}),
    assignedAt: new Date(nowMs).toISOString(),
    endsAt: nowMs + def.durationMs,
    status: "en-route",
  };
}

/**
 * Advance timers: en-route/working assignments whose end time has passed
 * become "done" (collectible). Returns the next state and the ids that
 * newly completed, so the caller can celebrate them.
 */
export function tickWorkAssignments(
  state: VillagerWorkState,
  nowMs: number
): { state: VillagerWorkState; newlyDone: VillagerWorkAssignment[] } {
  const newlyDone: VillagerWorkAssignment[] = [];
  const assignments = state.assignments.map((a) => {
    if (a.status !== "done" && nowMs >= a.endsAt) {
      const done = { ...a, status: "done" as const };
      newlyDone.push(done);
      return done;
    }
    return a;
  });
  if (newlyDone.length === 0) return { state, newlyDone };
  return { state: { assignments }, newlyDone };
}

/** Mark an assignment's worker as arrived — it is now "working". Pure. */
export function markWorkArrived(
  state: VillagerWorkState,
  personId: string
): VillagerWorkState {
  return {
    assignments: state.assignments.map((a) =>
      a.personId === personId && a.status === "en-route"
        ? { ...a, status: "working" as const }
        : a
    ),
  };
}

// ---- Restock route: boxes from the church to the town's shelves ----

/** Bonus coins banked per box delivered, paid out with the shift reward. */
export const RESTOCK_BOX_BONUS_COINS = 15;

export type RestockArrivalEvent = "picked-up" | "delivered" | "waiting" | null;

/**
 * Advance a restock worker's route when they arrive at a building. Pure —
 * the caller applies side effects (stock goes up on "delivered") and saves.
 *
 * - Leg "to-church" + arrival at the church: the shift is underway
 *   (en-route -> working). The caller names the next delivery target (the
 *   neediest stocked building, see neediestStockedBuilding in
 *   lib/hometown.ts) — with a target the worker picks up a box and heads
 *   out ("picked-up"); without one every shelf is full, so they wait at
 *   the church ("waiting").
 * - Leg "to-deliver" + arrival at the target building: the box lands
 *   ("delivered"), the box bonus is banked, and the route loops back to
 *   the church for the next box.
 *
 * Arrivals anywhere else (or repeat fires with nothing to do) return the
 * SAME state reference with a null/"waiting" event so callers can skip
 * saving.
 */
export function advanceRestockArrival(
  state: VillagerWorkState,
  args: {
    personId: string;
    arrivedBuildingId: string | undefined;
    churchBuildingId: string;
    nextTargetId: string | null;
  }
): { state: VillagerWorkState; event: RestockArrivalEvent } {
  const idx = state.assignments.findIndex(
    (a) => a.personId === args.personId && a.kind === "restock" && a.status !== "done"
  );
  if (idx < 0) return { state, event: null };
  const a = state.assignments[idx];
  const leg = a.restockLeg ?? "to-church";

  if (leg === "to-deliver") {
    if (!a.restockTargetId || args.arrivedBuildingId !== a.restockTargetId) {
      return { state, event: null };
    }
    const delivered: VillagerWorkAssignment = {
      ...a,
      status: "working",
      restockLeg: "to-church",
      restockTargetId: undefined,
      boxesDelivered: (a.boxesDelivered ?? 0) + 1,
      bonusCoins: (a.bonusCoins ?? 0) + RESTOCK_BOX_BONUS_COINS,
    };
    const assignments = state.assignments.slice();
    assignments[idx] = delivered;
    return { state: { assignments }, event: "delivered" };
  }

  // Leg "to-church": only a church arrival advances the route.
  if (args.arrivedBuildingId !== args.churchBuildingId) return { state, event: null };
  if (args.nextTargetId) {
    const pickedUp: VillagerWorkAssignment = {
      ...a,
      status: "working",
      restockLeg: "to-deliver",
      restockTargetId: args.nextTargetId,
    };
    const assignments = state.assignments.slice();
    assignments[idx] = pickedUp;
    return { state: { assignments }, event: "picked-up" };
  }
  if (a.status === "working" && !a.restockTargetId) {
    // Already waiting at the church with full shelves — nothing changed.
    return { state, event: "waiting" };
  }
  const waiting: VillagerWorkAssignment = {
    ...a,
    status: "working",
    restockLeg: "to-church",
    restockTargetId: undefined,
  };
  const assignments = state.assignments.slice();
  assignments[idx] = waiting;
  return { state: { assignments }, event: "waiting" };
}

/** Remove an assignment after Jonathan collects its reward. Pure. */
export function collectWorkAssignment(
  state: VillagerWorkState,
  id: string
): { state: VillagerWorkState; assignment: VillagerWorkAssignment | null } {
  const assignment = state.assignments.find((a) => a.id === id) ?? null;
  if (!assignment || assignment.status !== "done") return { state, assignment: null };
  return {
    state: { assignments: state.assignments.filter((a) => a.id !== id) },
    assignment,
  };
}

/** Collect several finished shifts in one sweep (the office's Collect
 *  All). Every id goes through the exact same guard as
 *  collectWorkAssignment — only a "done" shift pays out, and it leaves
 *  the ledger as it's collected, so a repeat sweep over the same ids
 *  collects nothing twice. Ids whose shift is missing or not done yet
 *  are skipped, never fatal: the rest still collect. */
export function collectWorkAssignments(
  state: VillagerWorkState,
  ids: string[]
): { state: VillagerWorkState; collected: VillagerWorkAssignment[]; skippedIds: string[] } {
  let current = state;
  const collected: VillagerWorkAssignment[] = [];
  const skippedIds: string[] = [];
  for (const id of ids) {
    const { state: next, assignment } = collectWorkAssignment(current, id);
    if (assignment) {
      current = next;
      collected.push(assignment);
    } else {
      skippedIds.push(id);
    }
  }
  return { state: current, collected, skippedIds };
}

/** mm:ss (or h:mm:ss) countdown text for an assignment. */
export function workCountdownText(endsAt: number, nowMs: number): string {
  const ms = Math.max(0, endsAt - nowMs);
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ---- Supply chain: staffed farms & gardens boost nearby food buildings ----
// NOTE: staffed farm/garden sites no longer feed building STOCK — shelves
// are filled by Restock villagers carrying boxes from the church (see the
// restock route above). These helpers remain for the farm/garden crews'
// presence/supply role.

/** Income multiplier for food buildings within range of a staffed farm/garden. */
export const SUPPLY_BONUS_MULT = 1.35;

/** Chebyshev tile radius: staffed farm/garden supplies food buildings this close. */
export const SUPPLY_RADIUS_TILES = 4;

/**
 * Positions of farms/community gardens that currently have a villager
 * actively working ("working" status — arrived and on the clock). Mirrors
 * the first-matching-building targeting used by findWorkTarget in
 * app/hometown.tsx.
 */
export function staffedSupplySites(
  assignments: VillagerWorkAssignment[],
  buildings: Array<{ x: number; y: number; type: string; constructionEndsAt?: number }>,
  nowMs: number = Date.now()
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (const a of assignments) {
    if (a.status !== "working") continue;
    const siteType = WORK_KINDS[a.kind]?.siteType;
    if (!siteType) continue;
    // A site under construction is closed — it supplies nothing until open.
    const b = buildings.find(
      (x) => x.type === siteType && !(typeof x.constructionEndsAt === "number" && nowMs < x.constructionEndsAt)
    );
    if (b) out.push({ x: b.x, y: b.y });
  }
  return out;
}

/** True when any farm/garden has a worker on the clock right now. */
export function anySupplySiteStaffed(assignments: VillagerWorkAssignment[]): boolean {
  return assignments.some(
    (a) => a.status === "working" && !!WORK_KINDS[a.kind]?.siteType
  );
}
