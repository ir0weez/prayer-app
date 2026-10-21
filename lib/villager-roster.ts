// Villager roster: the Main Office's view of the prayer lights.
//
// The roster is a read model over the SAME state the town map uses —
// today's prayer lights (lib/hometown prayedTodayPeople), the villager-work
// assignments (lib/villager-work), field missions (lib/hometown) and the
// villagers' own requests (lib/villager-missions). Assigning and collecting
// from the roster go through the exact same lib/villager-work functions the
// on-map flow uses, so a shift started at the office desk behaves identically
// to one started by tapping the light in town: they drop what they're doing,
// walk to the site, and stay working until the timer runs out.
//
// Everything here is pure — the office screen loads fresh state and rebuilds
// rows on a tick, which is what keeps the roster live while it's open.

import {
  BUILDINGS,
  isRestaurantType,
  isUnderConstruction,
  missionCountdown,
  missionStatus,
  scaledCoins,
  type FieldMission,
  type PlacedBuilding,
  type PrayedPerson,
  type TownMapId,
} from "./hometown";
import {
  locationPhrase,
  villagerMapOf,
  type VillagerLocations,
} from "./villager-locations";
import { BLOODMOON_COIN_MULT } from "./badges";
import {
  WORK_KINDS,
  workCountdownText,
  type VillagerWorkAssignment,
  type WorkKind,
} from "./villager-work";
import type { VillagerMission } from "./villager-missions";

// ---- Work sites: where a shift happens (mirrors findWorkTarget in
// app/hometown.tsx — the town map is the only map with work sites) ----

export type WorkSite = {
  buildingId: string;
  buildingType: string;
  /** Display name, e.g. "Chapel" for the church building. */
  buildingName: string;
};

export function workSiteFor(kind: WorkKind, townBuildings: PlacedBuilding[], nowMs: number = Date.now()): WorkSite | null {
  // A building under construction is closed — no shifts are hosted there.
  const first = (pred: (b: PlacedBuilding) => boolean) =>
    townBuildings.find((b) => pred(b) && !isUnderConstruction(b, nowMs));
  let site: PlacedBuilding | undefined;
  switch (kind) {
    case "clean-garden":
    case "tend-garden":
      site = first((b) => b.type === "community-garden");
      break;
    case "prune-flowers":
    case "work-farm":
      site = first((b) => b.type === "farm");
      break;
    case "bank-shift":
      site = first((b) => b.type === "bank") ?? first((b) => b.type === "bank-tower");
      break;
    case "restaurant-shift":
      site = first((b) => isRestaurantType(b.type));
      break;
    case "deliver-meal":
      site = first((b) => b.type === "banquet-table") ?? first((b) => isRestaurantType(b.type));
      break;
    case "restock":
      // The restock route starts at the church — boxes come from there.
      site = first((b) => b.type === "church");
      break;
  }
  if (!site) return null;
  return {
    buildingId: site.id,
    buildingType: site.type,
    buildingName: BUILDINGS[site.type]?.name ?? "Town",
  };
}

/** Why a job can't be picked right now (shown small under the job). */
export const JOB_UNAVAILABLE_REASONS: Record<WorkKind, string> = {
  "clean-garden": "Needs a Community Garden in town",
  "prune-flowers": "Needs a Farm in town",
  "bank-shift": "Needs a Bank in town",
  "restaurant-shift": "Needs a restaurant in town",
  "deliver-meal": "Needs the Banquet Table or a restaurant",
  "work-farm": "Needs a Farm in town",
  "tend-garden": "Needs a Community Garden in town",
  restock: "Needs a church in town",
};

export type JobOption = {
  kind: WorkKind;
  label: string;
  blurb: string;
  durationLabel: string;
  rewardCoins: number;
  rewardXP: number;
  badgeIcon: string;
  available: boolean;
  /** Small-print reason when unavailable. */
  reason?: string;
  /** Where the shift happens, when available. */
  siteName?: string;
};

/** The full job list for one villager, with per-job availability. */
export function jobOptionsFor(townBuildings: PlacedBuilding[]): JobOption[] {
  return (Object.keys(WORK_KINDS) as WorkKind[]).map((kind) => {
    const def = WORK_KINDS[kind];
    const site = workSiteFor(kind, townBuildings);
    return {
      kind,
      label: def.label,
      blurb: def.blurb,
      durationLabel: def.durationLabel,
      rewardCoins: def.rewardCoins,
      rewardXP: def.rewardXP,
      badgeIcon: def.badgeIcon,
      available: !!site,
      reason: site ? undefined : JOB_UNAVAILABLE_REASONS[kind],
      siteName: site?.buildingName,
    };
  });
}

// ---- Roster rows ----

export type RosterStatusKind =
  | "idle"      // free and ready — needs Jonathan's attention first
  | "collect"   // a finished shift is waiting to be paid out
  | "request"   // the villager has a request waiting ("?" on the map)
  | "working"   // on a shift
  | "mission"   // away on a field mission
  | "sleeping"; // night — the town is asleep

export type RosterRow = {
  personId: string;
  name: string;
  accentColor?: string;
  /** Everyone on the roster is a prayer light — prayed for today. */
  prayedToday: boolean;
  status: RosterStatusKind;
  /** Plain-words status, e.g. "Working: Restock at Chapel". */
  statusLabel: string;
  /** Secondary line: countdowns, mission details, request target. */
  detail?: string;
  /** The one map this villager is on right now (single-location truth,
   *  lib/villager-locations) — present when the caller passes locations. */
  mapId?: TownMapId;
  /** Plain-words place phrase for that map: "in Town", "at School", … */
  mapLabel?: string;
  /** The villager's work assignment (active or finished), if any. */
  assignment?: VillagerWorkAssignment;
  /** Raw payout for a finished shift (job reward + banked box bonus). */
  collectCoins?: number;
  collectXP?: number;
};

/** Sort rank: attention first (idle, collectable, requests), then working,
 *  then the away/asleep crowd. */
const STATUS_RANK: Record<RosterStatusKind, number> = {
  idle: 0,
  collect: 1,
  request: 2,
  working: 3,
  mission: 4,
  sleeping: 4,
};

export function buildRosterRows(args: {
  people: PrayedPerson[];
  assignments: VillagerWorkAssignment[];
  fieldMissions: FieldMission[];
  villagerMissions: VillagerMission[];
  townBuildings: PlacedBuilding[];
  isNight: boolean;
  nowMs: number;
  /** Single-location truth (lib/villager-locations). When passed, rows
   *  carry the map each villager is actually on; when omitted, rows are
   *  exactly what they were before locations existed. */
  locations?: VillagerLocations;
}): RosterRow[] {
  const { people, assignments, fieldMissions, villagerMissions, townBuildings, isNight, nowMs } = args;
  const now = new Date(nowMs);

  const rows: RosterRow[] = people.map((person) => {
    const personId = String(person.id);
    const mapId = args.locations ? villagerMapOf(args.locations, personId) : undefined;
    const phrase = mapId ? locationPhrase(mapId) : undefined;
    const base = {
      personId,
      name: person.name,
      accentColor: person.accentColor,
      prayedToday: true,
      ...(mapId ? { mapId, mapLabel: phrase } : {}),
    };

    // 1. A finished shift outranks everything — it is money waiting.
    const assignment = assignments.find((a) => a.personId === personId);
    if (assignment?.status === "done") {
      const def = WORK_KINDS[assignment.kind];
      return {
        ...base,
        status: "collect" as const,
        statusLabel: `Finished: ${def.label}`,
        detail: "Tap Collect to pay out the shift",
        assignment,
        collectCoins: def.rewardCoins + (assignment.bonusCoins ?? 0),
        collectXP: def.rewardXP,
      };
    }

    // 2. On a shift (walking there or on the clock).
    if (assignment) {
      const def = WORK_KINDS[assignment.kind];
      const site = workSiteFor(assignment.kind, townBuildings);
      const where = site ? ` at ${site.buildingName}` : "";
      return {
        ...base,
        status: "working" as const,
        statusLabel: `Working: ${def.label}${where}`,
        detail:
          assignment.status === "en-route"
            ? `On the way · done in ${workCountdownText(assignment.endsAt, nowMs)}`
            : `Done in ${workCountdownText(assignment.endsAt, nowMs)}`,
        assignment,
      };
    }

    // 3. Away on a field mission (sent from the Mission Field).
    const field = fieldMissions.find((m) => m.personId === personId && !m.collected);
    if (field) {
      const back = missionStatus(field, now) === "returned";
      return {
        ...base,
        status: "mission" as const,
        statusLabel: back ? "Back from a mission" : "On a mission",
        detail: back
          ? "Their blessing waits at the Mission Field"
          : `Back in ${missionCountdown(field, now)}`,
      };
    }

    // 4. The villager has a request of their own waiting.
    const request = villagerMissions.find((m) => m.personId === personId && m.status !== "done");
    if (request) {
      return {
        ...base,
        status: "request" as const,
        statusLabel: "Has a request for you",
        detail: `Wants to visit: ${request.targetLabel}${phrase ? ` · ${phrase}` : ""}`,
      };
    }

    // The place phrase as a standalone line: "In Town", "At School".
    const placeDetail = phrase
      ? phrase.charAt(0).toUpperCase() + phrase.slice(1)
      : undefined;

    // 5. Night: everyone still awake in the roster is asleep at home —
    // on whichever map is their home-for-now.
    if (isNight) {
      return {
        ...base,
        status: "sleeping" as const,
        statusLabel: "Sleeping",
        ...(placeDetail ? { detail: placeDetail } : {}),
      };
    }

    // 6. Free and ready.
    return {
      ...base,
      status: "idle" as const,
      statusLabel: "Idle",
      ...(placeDetail ? { detail: placeDetail } : {}),
    };
  });

  rows.sort((a, b) => {
    const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    return a.name.localeCompare(b.name);
  });
  return rows;
}

/** True when this villager can be sent to work from the roster right now. */
export function canAssignRow(row: RosterRow): boolean {
  return row.status === "idle";
}

export type RosterSummary = {
  total: number;
  working: number;
  idle: number;
  collectable: number;
};

export function rosterSummary(rows: RosterRow[]): RosterSummary {
  return {
    total: rows.length,
    working: rows.filter((r) => r.status === "working").length,
    idle: rows.filter((r) => r.status === "idle").length,
    collectable: rows.filter((r) => r.status === "collect").length,
  };
}

/** The one-line office header: "12 villagers · 3 working · 5 idle". */
export function rosterSummaryText(summary: RosterSummary): string {
  const villagerWord = summary.total === 1 ? "villager" : "villagers";
  return `${summary.total} ${villagerWord} · ${summary.working} working · ${summary.idle} idle`;
}

// ---- Collect All (the office pays every finished shift at once) ----

/** Rows with a finished shift waiting to be paid out. */
export function collectableRows(rows: RosterRow[]): RosterRow[] {
  return rows.filter((r) => r.status === "collect" && !!r.assignment);
}

/** Collect All shows only when two or more finished shifts are waiting —
 *  with a single one, the row's own Collect button is enough and the
 *  header stays clean. */
export function showCollectAll(rows: RosterRow[]): boolean {
  return collectableRows(rows).length >= 2;
}

/** The coin grant for one finished shift — the exact payout the row
 *  Collect button (and collecting on the town map) grants: the scaled
 *  job reward with any banked box bonus included, and the Bloodmoon
 *  Badge's blessing on top when Jonathan holds it. */
export function collectPayoutCoins(rawCoins: number, bloodmoon: boolean): number {
  const base = scaledCoins(rawCoins);
  return bloodmoon ? base * BLOODMOON_COIN_MULT : base;
}

/** The Collect All total: the sum of the individual ready shifts'
 *  payouts, computed per shift with the same formula the single collect
 *  pays — so the button's label and the sweep's grant always agree. */
export function collectAllTotalCoins(rows: RosterRow[], bloodmoon: boolean): number {
  return collectableRows(rows).reduce(
    (sum, r) => sum + collectPayoutCoins(r.collectCoins ?? 0, bloodmoon),
    0
  );
}
