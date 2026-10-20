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
  | "tend-garden";

export type WorkStatus = "en-route" | "working" | "done";

export type VillagerWorkAssignment = {
  id: string;
  personId: string;
  personName: string;
  kind: WorkKind;
  /** For deliver-meal: who the meal is for (flavor only). */
  recipientName?: string;
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
    rewardCoins: 15,
    rewardXP: 6,
    badgeIcon: "cleaning-services",
    siteType: "community-garden",
  },
  "prune-flowers": {
    label: "Prune Flowers",
    blurb: "Trim and water the blooms at the farm.",
    durationMs: 15 * 60 * 1000,
    durationLabel: "15 min",
    rewardCoins: 8,
    rewardXP: 4,
    badgeIcon: "content-cut",
    siteType: "farm",
  },
  "bank-shift": {
    label: "Work at the Bank",
    blurb: "Help count coins and greet folks at the bank.",
    durationMs: 60 * 60 * 1000,
    durationLabel: "1 hour",
    rewardCoins: 25,
    rewardXP: 10,
    badgeIcon: "account-balance",
  },
  "restaurant-shift": {
    label: "Work at a Restaurant",
    blurb: "Serve a shift — set tables, carry plates, wash up.",
    durationMs: 60 * 60 * 1000,
    durationLabel: "1 hour",
    rewardCoins: 25,
    rewardXP: 10,
    badgeIcon: "restaurant",
  },
  "deliver-meal": {
    label: "Deliver a Meal",
    blurb: "Pick up a warm meal and carry it to someone in town.",
    durationMs: 20 * 60 * 1000,
    durationLabel: "20 min",
    rewardCoins: 12,
    rewardXP: 6,
    badgeIcon: "delivery-dining",
  },
  "work-farm": {
    label: "Work the Farm",
    blurb: "Tend the fields and harvest at the farm — nearby food shops and restaurants earn +35%.",
    durationMs: 60 * 60 * 1000,
    durationLabel: "1 hour",
    rewardCoins: 25,
    rewardXP: 10,
    badgeIcon: "agriculture",
    siteType: "farm",
  },
  "tend-garden": {
    label: "Tend the Community Garden",
    blurb: "Work the beds at the Community Garden — fresh produce boosts nearby food buildings +35%.",
    durationMs: 60 * 60 * 1000,
    durationLabel: "1 hour",
    rewardCoins: 25,
    rewardXP: 10,
    badgeIcon: "grass",
    siteType: "community-garden",
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
  buildings: Array<{ x: number; y: number; type: string }>
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (const a of assignments) {
    if (a.status !== "working") continue;
    const siteType = WORK_KINDS[a.kind]?.siteType;
    if (!siteType) continue;
    const b = buildings.find((x) => x.type === siteType);
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
