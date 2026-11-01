import { Pressable, StyleSheet, Text, View } from "react-native";

import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";

/**
 * v398 — what a finished RUN shows, shared by all seven endless
 * games. The run's score has already settled through the v397
 * conversion by the time this card paints (the screen's segment
 * settle is the only place coins/XP move), so this is a receipt
 * plus two doors: Again (a fresh run, a fresh segment) and I'm
 * good (the wave check, receipt in hand).
 */
export interface RunEndResult {
  coins: number;
  xp: number;
  score: number;
  best: number;
}

export interface RunGameHandlers {
  onScore?: (points: number) => void;
  /** Settles the run that just ended; resolves with its receipt. */
  onRunEnd?: () => Promise<RunEndResult | null>;
  /** Straight to the wave check — no further settle (already done). */
  onRunExit?: () => void;
}

export function RunEndCard({
  m,
  score,
  best,
  coins,
  xp,
  overLine,
  onAgain,
  onGood,
}: {
  m: KeepMeOccupiedMaterialFamily;
  score: number;
  best: number;
  coins: number;
  xp: number;
  overLine: string;
  onAgain: () => void;
  onGood: () => void;
}) {
  return (
    <View style={[styles.card, { backgroundColor: m.card, borderColor: m.line }]}>
      <Text style={[styles.over, { color: m.ink }]}>{overLine}</Text>
      <View style={styles.scoreRow}>
        <Text style={[styles.score, { color: m.ink }]}>{score}</Text>
        <Text style={[styles.best, { color: m.inkSoft }]}>best {best}</Text>
      </View>
      {coins > 0 || xp > 0 ? (
        <Text style={[styles.earnings, { color: m.deep }]}>+{coins} coins · +{xp} XP</Text>
      ) : null}
      <View style={styles.actions}>
        <Pressable
          onPress={onAgain}
          accessibilityRole="button"
          accessibilityLabel="Again — start a new run"
          style={({ pressed }) => [styles.again, { backgroundColor: m.seed }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.againText}>Again</Text>
        </Pressable>
        <Pressable
          onPress={onGood}
          accessibilityRole="button"
          accessibilityLabel="I'm good — check the wave"
          style={({ pressed }) => [
            styles.good,
            { backgroundColor: m.tonal },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[styles.goodText, { color: m.tonalInk }]}>I&apos;m good</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14, borderWidth: 1, borderRadius: 20, padding: 15 },
  over: { fontSize: 15.5, fontWeight: "900" },
  scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 6 },
  score: { fontSize: 30, fontWeight: "900" },
  best: { fontSize: 12.5, fontWeight: "800" },
  earnings: { fontSize: 13.5, fontWeight: "900", marginTop: 4 },
  actions: { flexDirection: "row", gap: 9, marginTop: 12 },
  again: { flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: "center" },
  againText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  good: { flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: "center" },
  goodText: { fontSize: 14, fontWeight: "800" },
});
