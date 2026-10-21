// Job-collect XP rebalance (v160, Jonathan approved): collecting a
// finished villager work shift used to pay WORK_KINDS rewardXP straight
// through scaledXP — a flat faucet (~+14 a collect at typical scale) that
// dominated progression no matter how short the shift or how many shifts
// were collected that day. Now the base XP is set by the shift's DURATION
// band, and a daily taper keeps mass-collecting from farming levels:
//
//   short    (< 30 min)        -> 4 XP
//   standard (30–60 min incl.) -> 7 XP
//   long     (> 60 min)        -> 10 XP
//
// The first 10 collects of a local day pay their full band XP; from the
// 11th collect onward every collect pays a 2 XP floor — never 0, so a
// collect always feels like it counted. Coins are NOT touched by any of
// this (WORK_KINDS rewardCoins payouts are unchanged), and villager
// MISSION XP is a different system entirely (lib/villager-missions.ts).
//
// WORK_KINDS rewardXP mirrors the band value for each kind so assignment
// sheets (which render def.rewardXP) tell the truth; the award path
// itself must go through jobCollectXP so the taper applies.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { WORK_KINDS, type WorkKind } from "./villager-work";

export const JOB_COLLECT_XP_KEY = "prayercircle.hometown.job-collects.v1";

/** Band XP for a short shift (< 30 min). */
export const JOB_COLLECT_SHORT_XP = 4;
/** Band XP for a standard shift (30–60 min inclusive). */
export const JOB_COLLECT_STANDARD_XP = 7;
/** Band XP for a long shift (> 60 min). */
export const JOB_COLLECT_LONG_XP = 10;

/** Collects per day that pay full band XP before the taper kicks in. */
export const JOB_COLLECT_FULL_XP_PER_DAY = 10;
/** XP paid per collect once the daily taper kicks in (floor, never 0). */
export const JOB_COLLECT_TAPER_XP = 2;

const SHORT_BAND_MAX_MS = 30 * 60 * 1000; // exclusive: < 30 min is short
const STANDARD_BAND_MAX_MS = 60 * 60 * 1000; // inclusive: 30–60 min is standard

/**
 * Pure: base XP for a shift of `durationMs`, by duration band.
 * Boundaries: 29:59 -> 4, 30:00 -> 7, 60:00 -> 7, 60:01 -> 10.
 * Non-finite / negative durations read as a zero-length (short) shift.
 */
export function jobCollectBandXP(durationMs: number): number {
  const ms =
    typeof durationMs === "number" && Number.isFinite(durationMs)
      ? Math.max(0, durationMs)
      : 0;
  if (ms < SHORT_BAND_MAX_MS) return JOB_COLLECT_SHORT_XP;
  if (ms <= STANDARD_BAND_MAX_MS) return JOB_COLLECT_STANDARD_XP;
  return JOB_COLLECT_LONG_XP;
}

/**
 * Pure: XP for collecting one shift of `kind`, given how many collects
 * have already happened today (the ledger count BEFORE this collect).
 * Collects 1–10 (prior 0–9) pay the kind's full band XP; from the 11th
 * collect onward (prior >= 10) the 2 XP floor applies — for every band,
 * so the result is never 0. The caller still runs the result through
 * scaledXP, exactly like the old award path.
 */
export function jobCollectXP(kind: WorkKind, priorCollectsToday: number): number {
  const prior =
    typeof priorCollectsToday === "number" && Number.isFinite(priorCollectsToday)
      ? Math.max(0, Math.floor(priorCollectsToday))
      : 0;
  if (prior >= JOB_COLLECT_FULL_XP_PER_DAY) return JOB_COLLECT_TAPER_XP;
  const def = WORK_KINDS[kind];
  return def ? jobCollectBandXP(def.durationMs) : JOB_COLLECT_SHORT_XP;
}

// ---- Daily collect ledger ----

export type JobCollectLedger = {
  /** Local date ("YYYY-MM-DD") the count belongs to. */
  day: string;
  /** Collects already recorded on `day`. */
  count: number;
};

/** Local date as "YYYY-MM-DD" (same shape as hometown's localDateStr). */
export function jobCollectDateStr(d: Date = new Date()): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function dayKeyOf(now: Date | string): string {
  return typeof now === "string" ? now : jobCollectDateStr(now);
}

function sanitizeCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

/**
 * Pure: normalize unknown stored data into a ledger for `now`'s day.
 * The midnight reset is structural: a ledger whose day is not today
 * (stale, malformed, or missing) reads as a fresh { day: today, count: 0 }
 * — there is no reset job to run.
 */
export function normalizeJobCollectLedger(
  raw: unknown,
  now: Date | string = new Date()
): JobCollectLedger {
  const today = dayKeyOf(now);
  if (raw && typeof raw === "object") {
    const parsed = raw as Partial<JobCollectLedger>;
    if (parsed.day === today) {
      return { day: today, count: sanitizeCount(parsed.count) };
    }
  }
  return { day: today, count: 0 };
}

/**
 * Pure: how many collects count as "already done today" for `ledger`
 * as of `now` — 0 when the ledger belongs to any other day.
 */
export function nextCollectCount(
  ledger: JobCollectLedger | null | undefined,
  now: Date | string = new Date()
): number {
  if (!ledger || typeof ledger !== "object") return 0;
  if (ledger.day !== dayKeyOf(now)) return 0;
  return sanitizeCount(ledger.count);
}

/**
 * Pure: the ledger after recording one more collect at `now`. A stale
 * ledger rolls to today at count 1; a same-day ledger increments. The
 * input is never mutated. Collect All sweeps call this once per
 * collected assignment, so each swept shift counts individually.
 */
export function recordCollect(
  ledger: JobCollectLedger | null | undefined,
  now: Date | string = new Date()
): JobCollectLedger {
  const today = dayKeyOf(now);
  return { day: today, count: nextCollectCount(ledger, now) + 1 };
}

export async function loadJobCollectLedger(
  now: Date | string = new Date()
): Promise<JobCollectLedger> {
  try {
    const raw = await AsyncStorage.getItem(JOB_COLLECT_XP_KEY);
    if (raw) return normalizeJobCollectLedger(JSON.parse(raw), now);
  } catch {}
  return { day: dayKeyOf(now), count: 0 };
}

export async function saveJobCollectLedger(ledger: JobCollectLedger): Promise<void> {
  try {
    await AsyncStorage.setItem(
      JOB_COLLECT_XP_KEY,
      JSON.stringify({ day: ledger.day, count: sanitizeCount(ledger.count) })
    );
  } catch {}
}
