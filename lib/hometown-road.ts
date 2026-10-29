// ─────────────────────────────────────────────────────────────────────────────
// v331 — The Road: era badges, the first piece of Era Part 2.
//
// Jonathan decided this 2026-10-28 22:47 ("Sure do it") on Eva's
// recommendation: the eras get their OWN badge set — the Boss Badges
// in lib/badges.ts belong to the fasting tracker and are not touched.
// His settled design:
//
//   - TWELVE badges, one per era, in the era order of
//     lib/hometown-eras (Village → New Earth). Each is a cut-paper
//     medallion in that era's own paper stock (the ERA_BADGE_ART table
//     below draws its colours from the era palettes), with a simple
//     geometric paper-cut glyph. They live in Collections as their
//     own section, "The Road": twelve seats in era order — earned
//     seats in full paper, unearned as quiet outlines still naming
//     the era ahead.
//   - UNLOCK: a badge is earned the first time he FINISHES LIVING
//     that era — when the live era derivation (the v323 engine:
//     getCurrentFastDay over the fast's twelfths) shows he has
//     entered the NEXT era; the New Earth's badge earns when the fast
//     itself has ended (the app's own ended rule, getFastEndDate <
//     today — the same rule that seats a "previous fast"). Settled
//     from stored state on open/render, like everything in town: no
//     background timers. Eras apply on the same terms as the era
//     engine — Hometown-unlocked fasts (> 40 days) only.
//   - BACKFILL BY DERIVATION, NEVER BY A SEEN FLAG: the earned state
//     is reconciled from the standing derivation every open, so a
//     badge the road proves he lived can never be lost — if this
//     store were wiped, the next open re-earns everything the
//     current standing proves (completions restart at 1 for the
//     current cycle, the honest floor).
//   - PRESTIGE GILDING: Begin Again keeps collections — this set is
//     permanent. Each additional completed walk of an era adds one to
//     its completions, shown as quiet gild marks on the medallion.
//     Completions increment ONLY when a cycle's recorded progress
//     advances past an era for the first time; a cycle is one fast,
//     keyed by the fast's id + startDate, and every cycle's progress
//     mark is kept, so re-opening (or flipping between fasts) can
//     never count the same walk twice.
// ─────────────────────────────────────────────────────────────────────────────

import {
  ERA_COUNT,
  ERA_DEFS,
  eraIndexForDay,
  type EraDef,
  type EraId,
} from "./hometown-eras";
import { hometownUnlockedForFastLength } from "./hometown";
import { getTodayISOString } from "./prayercircle-data";
import {
  getCurrentFastDay,
  getFastEndDate,
  type PersonalFast,
} from "./prayercircle-fasting";

export const ROAD_STORAGE_KEY = "prayercircle.hometown.road.v1";

/** One era's badge record: when the road first paid it, and how many
 *  times the era has been fully lived (walks) across all fasts. */
export type RoadEraRecord = {
  firstEarnedAt: string;
  completions: number;
};

export type RoadState = {
  eras: Partial<Record<EraId, RoadEraRecord>>;
  /** Per-cycle progress: cycleKey → the highest era index that cycle
   *  has already counted as completed (-1 = none counted yet). Kept
   *  per cycle forever, so a cycle can never be counted twice. */
  cycles: Record<string, number>;
};

export function emptyRoadState(): RoadState {
  return { eras: {}, cycles: {} };
}

/** A fast cycle's identity: the fast itself, by id + start date. */
export function roadCycleKey(fast: PersonalFast): string {
  return `${fast.id}|${fast.startDate}`;
}

// ── The medallions' paper ───────────────────────────────────────────────────
// Colours drawn from each era's palette in lib/hometown-eras: the ring
// is the era's deep paper edge, the disc its light paper, the ink the
// tone the glyph is cut from, the accent a second cut colour for the
// few two-tone glyphs (David's gem, the New Earth's river).

export type RoadGlyphId =
  | "house"
  | "ark"
  | "tower"
  | "star"
  | "crown"
  | "crown-gem"
  | "fish"
  | "lamp"
  | "scroll"
  | "torn-flame"
  | "sun"
  | "river-gem";

export type EraBadgeArt = {
  glyph: RoadGlyphId;
  ring: string;
  disc: string;
  ink: string;
  accent: string;
};

export const ERA_BADGE_ART: Record<EraId, EraBadgeArt> = {
  village: { glyph: "house", ring: "#A08C5F", disc: "#E3D5B4", ink: "#8C4A2F", accent: "#C2B088" },
  flood: { glyph: "ark", ring: "#5E7488", disc: "#9DB2C2", ink: "#3D5A6E", accent: "#DCE9F2" },
  babel: { glyph: "tower", ring: "#96683F", disc: "#D9AC77", ink: "#8A3B2A", accent: "#F2DFC2" },
  israel: { glyph: "star", ring: "#B3A075", disc: "#EEE0BC", ink: "#8A6D3B", accent: "#C9963C" },
  saul: { glyph: "crown", ring: "#626A7C", disc: "#A8ADB9", ink: "#39404E", accent: "#D8DCE6" },
  david: { glyph: "crown-gem", ring: "#6D3FA0", disc: "#C09A68", ink: "#4A2A73", accent: "#C9963C" },
  ministry: { glyph: "fish", ring: "#9A8547", disc: "#DEC998", ink: "#7A5A24", accent: "#F5ECD4" },
  nero: { glyph: "lamp", ring: "#3E3B36", disc: "#7A766C", ink: "#F2B544", accent: "#A39E92" },
  "church-ages": { glyph: "scroll", ring: "#8F815C", disc: "#D6C8A2", ink: "#6E5A33", accent: "#EFE6C8" },
  tribulation: { glyph: "torn-flame", ring: "#4E4A45", disc: "#948F88", ink: "#2E2B28", accent: "#BDB8B0" },
  millennium: { glyph: "sun", ring: "#C3A94F", disc: "#F7EDCB", ink: "#A67C1B", accent: "#FFF6D8" },
  "new-earth": { glyph: "river-gem", ring: "#C9963C", disc: "#F9EFC4", ink: "#7C5CBF", accent: "#2E7D9A" },
};

// ── Derivation ──────────────────────────────────────────────────────────────

/** The highest era index the fast has FULLY lived by `today` — the
 *  eras strictly behind the standing one, or the whole road once the
 *  fast has ended. -1 when the fast carries no era (too short, not
 *  started) or nothing is fully lived yet. Pure day-count math, the
 *  same terms as the era engine itself. */
export function erasFullyLivedThrough(
  fast: PersonalFast | null | undefined,
  today: string = getTodayISOString(),
): number {
  if (!fast) return -1;
  if (!hometownUnlockedForFastLength(fast.durationDays)) return -1;
  if (today < fast.startDate) return -1;
  if (getFastEndDate(fast) < today) return ERA_COUNT - 1; // the fast has ended: the whole road was lived
  return eraIndexForDay(getCurrentFastDay(fast, today), fast.durationDays) - 1;
}

/** Reconcile a stored Road state against the standing derivation.
 *  Pure: returns the next state, whether it changed, and the eras
 *  whose FIRST earning this reconciliation recorded. Idempotent —
 *  reconciling an already-reconciled state changes nothing, so
 *  repeated opens never re-increment a completion. */
export function reconcileRoadBadges(
  state: RoadState,
  fast: PersonalFast | null | undefined,
  today: string = getTodayISOString(),
): { state: RoadState; changed: boolean; newlyEarned: EraId[] } {
  const through = erasFullyLivedThrough(fast, today);
  if (!fast || through < 0) return { state, changed: false, newlyEarned: [] };
  const key = roadCycleKey(fast);
  const counted = state.cycles[key] ?? -1;
  if (through <= counted) return { state, changed: false, newlyEarned: [] };

  const eras: Partial<Record<EraId, RoadEraRecord>> = { ...state.eras };
  const newlyEarned: EraId[] = [];
  for (let i = counted + 1; i <= through; i += 1) {
    const id = ERA_DEFS[i].id;
    const existing = eras[id];
    if (existing) {
      eras[id] = { firstEarnedAt: existing.firstEarnedAt, completions: existing.completions + 1 };
    } else {
      eras[id] = { firstEarnedAt: today, completions: 1 };
      newlyEarned.push(id);
    }
  }
  return {
    state: { eras, cycles: { ...state.cycles, [key]: through } },
    changed: true,
    newlyEarned,
  };
}

/** How many of the twelve seats stand earned. */
export function roadEarnedCount(state: RoadState): number {
  return ERA_DEFS.reduce((n, def) => n + (state.eras[def.id] ? 1 : 0), 0);
}

/** The gild marks a medallion wears: one per RE-walk of its era
 *  (completions beyond the first), displayed capped at three — the
 *  count itself is never capped, only the marks are. */
export function gildMarksFor(completions: number): number {
  return Math.min(3, Math.max(0, Math.floor(completions) - 1));
}

/** One seat of the Road as Collections draws it: the era, its record
 *  (null while the era still lies ahead), and its gild marks. The
 *  twelve seats always stand in era order, earned or not. */
export type RoadSeat = {
  era: EraDef;
  record: RoadEraRecord | null;
  earned: boolean;
  gildMarks: number;
};

export function roadSeats(state: RoadState): RoadSeat[] {
  return ERA_DEFS.map((era) => {
    const record = state.eras[era.id] ?? null;
    return {
      era,
      record,
      earned: record !== null,
      gildMarks: record ? gildMarksFor(record.completions) : 0,
    };
  });
}

// ── Storage ─────────────────────────────────────────────────────────────────

export function parseRoadState(value: unknown): RoadState {
  const out = emptyRoadState();
  if (!value || typeof value !== "object") return out;
  const raw = value as { eras?: unknown; cycles?: unknown };
  if (raw.eras && typeof raw.eras === "object") {
    for (const def of ERA_DEFS) {
      const rec = (raw.eras as Record<string, unknown>)[def.id] as
        | { firstEarnedAt?: unknown; completions?: unknown }
        | undefined;
      if (
        rec &&
        typeof rec.firstEarnedAt === "string" &&
        typeof rec.completions === "number" &&
        Number.isFinite(rec.completions) &&
        rec.completions >= 1
      ) {
        out.eras[def.id] = {
          firstEarnedAt: rec.firstEarnedAt,
          completions: Math.floor(rec.completions),
        };
      }
    }
  }
  if (raw.cycles && typeof raw.cycles === "object") {
    for (const [k, v] of Object.entries(raw.cycles as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isInteger(v) && v >= -1 && v < ERA_COUNT) {
        out.cycles[k] = v;
      }
    }
  }
  return out;
}

export async function loadRoadState(): Promise<RoadState> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem(ROAD_STORAGE_KEY);
    return parseRoadState(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyRoadState();
  }
}

export async function saveRoadState(state: RoadState): Promise<void> {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(ROAD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A failed write loses nothing permanent: the earned state is
    // re-derived from the fast's standing on the next open.
  }
}

/** Settle the Road against the standing fast: load, reconcile, and
 *  persist only when the reconciliation recorded something new. The
 *  one call every surface (Hometown's load, the Collections book)
 *  makes on open. */
export async function settleRoadBadges(
  fast: PersonalFast | null | undefined,
  today: string = getTodayISOString(),
): Promise<{ state: RoadState; newlyEarned: EraId[] }> {
  const current = await loadRoadState();
  const result = reconcileRoadBadges(current, fast, today);
  if (result.changed) await saveRoadState(result.state);
  return { state: result.state, newlyEarned: result.newlyEarned };
}
