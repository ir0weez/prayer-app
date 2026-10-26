import React from "react";
import { View, Text, StyleSheet } from "react-native";

/** The emergency window: every emergency prayer runs 24 hours. */
export const EMERGENCY_COUNTDOWN_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * v272 — the little red countdown: the fraction of the pill's red
 * fill still standing, 1 (full) → 0 (drained). The same arithmetic
 * getEmergencyPrayerProgress runs over an expiry stamp (created =
 * expires − 24h, fraction = remaining / 24h), expressed over raw
 * millis remaining so every roster site can feed it the countdown
 * it already tracks.
 */
export function emergencyCountdownFraction(millisRemaining: number): number {
  if (!Number.isFinite(millisRemaining) || millisRemaining <= 0) return 0;
  return Math.min(1, millisRemaining / EMERGENCY_COUNTDOWN_WINDOW_MS);
}

/**
 * v272 — the compact label: whole hours while an hour or more
 * stands ("24h", "9h"), minutes below that ("45m"). No words, no
 * seconds, no "Emergency ·" prefix — the pill is a gauge, not a
 * sentence.
 */
export function formatEmergencyCountdownCompact(millisRemaining: number): string {
  if (!Number.isFinite(millisRemaining) || millisRemaining <= 0) return "0m";
  const totalMinutes = Math.floor(millisRemaining / 60000);
  if (totalMinutes >= 60) return `${Math.floor(totalMinutes / 60)}h`;
  return `${Math.max(1, totalMinutes)}m`;
}

interface EmergencyPrayerPillProps {
  millisRemaining: number;
}

/**
 * v272 — "The Little Red Countdown" (his Oct 26 12:04 ask): the
 * roster's emergency countdown used to be a wide verbose pill —
 * on the closed household card it squeezed the family name to
 * "Gutierr…" and crushed the meta line. Now it is one small fixed
 * pill: dark-red ground (#991B1B), and the bright red (#EF4444)
 * drains off it as the 24 hours run down, wearing only the time
 * left. Same component on the single-person row and both
 * household unfurls.
 */
export function EmergencyPrayerPill({ millisRemaining }: EmergencyPrayerPillProps) {
  const fraction = emergencyCountdownFraction(millisRemaining);

  return (
    <View style={styles.container}>
      {/* The red still standing — drains as the hours run down. */}
      <View style={[styles.fill, { width: `${Math.round(fraction * 100)}%` }]} />
      <Text style={styles.label}>{formatEmergencyCountdownCompact(millisRemaining)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 20,
    minWidth: 40,
    paddingHorizontal: 7,
    borderRadius: 999,
    backgroundColor: "#991B1B",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#EF4444",
    borderRadius: 999,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 13,
    zIndex: 1,
  },
});
