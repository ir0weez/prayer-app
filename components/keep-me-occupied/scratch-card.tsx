import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  SCRATCH_PANELS,
  scratchNext,
  scratchReveal,
  scratchScore,
  scratchStart,
  type ScratchState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";

/**
 * v448 Scratch Card — pure chance, session-scored: nine silver
 * panels, one hidden layout. About seven cards in ten hide a
 * trio; only the trio pays (25 / 50 / 100 / 250 / 1,000). Reveal
 * in any order — the card resolves the moment the third match
 * shows, or when the ninth panel opens on a dud. "New card"
 * deals the next one into the same session; the score carries
 * over and settles on the deal-away like the other score games.
 */
export function ScratchCardGame({ m, onScore }: { m: KeepMeOccupiedMaterialFamily; onScore?: (points: number) => void }) {
  const stateRef = useRef<ScratchState>(scratchStart(Math.random));
  const [snap, setSnap] = useState<ScratchState>(stateRef.current);
  const reportedRef = useRef(0);

  const report = (next: ScratchState) => {
    const score = scratchScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
  };

  const reveal = (index: number) => {
    const next = scratchReveal(stateRef.current, index);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
    report(next);
  };

  const nextCard = () => {
    const next = scratchNext(stateRef.current, Math.random);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
  };

  const opened = snap.revealed.filter(Boolean).length;
  const score = scratchScore(snap);

  return (
    <View>
      <View style={[styles.field, { backgroundColor: m.tonal, borderColor: m.line }]}>
        {[0, 1, 2].map((row) => (
          <View key={row} style={styles.rowLine}>
            {[0, 1, 2].map((col) => {
              const idx = row * 3 + col;
              const isOpen = snap.revealed[idx];
              const value = snap.layout[idx];
              const isTrio = snap.resolved && snap.won != null && value === snap.won;
              return (
                <Pressable
                  key={col}
                  onPress={() => reveal(idx)}
                  disabled={isOpen || snap.resolved}
                  accessibilityRole="button"
                  accessibilityLabel={isOpen ? `Panel shows ${value}` : "Covered panel — tap to scratch it off"}
                  style={[
                    styles.panel,
                    isOpen
                      ? isTrio
                        ? { backgroundColor: "#F5C04A", borderColor: "#D9930D" }
                        : { backgroundColor: m.card, borderColor: m.line }
                      : { backgroundColor: "#C9CEDA", borderColor: "#9AA1B1" },
                  ]}
                >
                  {isOpen ? (
                    <Text style={[styles.value, { color: isTrio ? "#7A5200" : m.ink }]}>{value}</Text>
                  ) : (
                    <View style={styles.coinDot} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Text style={[styles.paytable, { color: m.inkSoft }]}>Match 3 — 25 · 50 · 100 · 250 · 1,000</Text>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {snap.resolved
          ? snap.won != null
            ? `score ${score} · three ${snap.won}s — the card paid ${snap.won}`
            : `score ${score} · a dud — nothing three times on that one`
          : `score ${score} · card ${snap.cards} · ${opened} of ${SCRATCH_PANELS} scratched — match three of a kind`}
      </Text>
      {snap.resolved ? (
        <Pressable
          onPress={nextCard}
          accessibilityRole="button"
          accessibilityLabel="New card"
          style={({ pressed }) => [styles.next, { backgroundColor: m.seed }, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.nextText}>New card</Text>
          <Text style={styles.nextSmall}>the score carries over</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 9, gap: 7 },
  rowLine: { flexDirection: "row", gap: 7 },
  panel: {
    flex: 1,
    aspectRatio: 1.35,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  coinDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#AEB4C2",
    borderWidth: 2,
    borderColor: "#878E9D",
  },
  value: { fontSize: 19, fontWeight: "900" },
  paytable: { fontSize: 12.5, fontWeight: "700", marginTop: 10, textAlign: "center" },
  message: { fontSize: 12.5, marginTop: 8, lineHeight: 18 },
  next: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nextText: { color: "#FFFFFF", fontSize: 15.5, fontWeight: "800" },
  nextSmall: { color: "#FFFFFF", fontSize: 12, fontWeight: "600", opacity: 0.85 },
});
