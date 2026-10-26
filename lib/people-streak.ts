// ─── v257 "The Streak Card" ────────────────────────────────────────────────
// The streak card's model, kept pure so the pins can hold it: the
// headline is profile.fastingStreak as stored (index.tsx keeps it in
// sync with calculateFastStreak(activeFast, today) — the FASTING
// streak, never personalPrayerStreak), and the day line + progress
// come from the active fast through getCurrentFastDay, the same
// helper the profile/fasting screens read. No new date math lives
// here: a second implementation could disagree with the fast's own
// screens, and the card's whole job is to agree with them.

import { getCurrentFastDay, type PersonalFast } from "./prayercircle-fasting";

export interface StreakCardModel {
  /** profile.fastingStreak, as-is. */
  streak: number;
  headline: string;
  subline: string;
  /** Current day / duration, 0..1 — null in the no-fast state (no line is drawn). */
  progressFraction: number | null;
  /** The current day of the active fast (1-based); null when there is no active fast. */
  currentDay: number | null;
}

export function getStreakCardModel(input: {
  fastingStreak: number;
  activeFast: PersonalFast | null;
  today: string;
}): StreakCardModel {
  const streak = input.fastingStreak;
  const headline = `${streak}-day fasting streak`;
  if (!input.activeFast) {
    return { streak, headline, subline: "Start a fast", progressFraction: null, currentDay: null };
  }
  const fast = input.activeFast;
  const currentDay = getCurrentFastDay(fast, input.today);
  const progressFraction =
    fast.durationDays > 0 ? Math.min(1, Math.max(0, currentDay / fast.durationDays)) : null;
  return {
    streak,
    headline,
    subline: `${fast.name} · Day ${currentDay} of ${fast.durationDays}`,
    progressFraction,
    currentDay,
  };
}
