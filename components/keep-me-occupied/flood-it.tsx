import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  FLOOD_COLORS,
  FLOOD_MAX_STEPS,
  FLOOD_SIZE,
  floodApply,
  floodRegion,
  floodScore,
  floodStart,
  type FloodState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v400 Flood It — wet paint: tap a swatch and the colour floods
 * out of the top-left corner, swallowing its neighbours. One
 * colour everywhere inside 20 steps banks (21 − steps) × 15 and
 * deals a fresh board; running out of steps ends the run.
 */
export function FloodItGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<FloodState>(floodStart(Math.random));
  const [snap, setSnap] = useState<FloodState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const overRef = useRef(false);

  const report = (next: FloodState) => {
    const score = floodScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
    return score;
  };

  const apply = (color: number) => {
    if (ending || overRef.current) return;
    const next = floodApply(stateRef.current, color, Math.random);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
    const score = report(next);
    if (next.over) {
      overRef.current = true;
      void (async () => {
        const receipt = onRunEnd ? await onRunEnd() : null;
        setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
      })();
    }
  };

  const again = () => {
    stateRef.current = floodStart(Math.random);
    reportedRef.current = 0;
    overRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const region = floodRegion(snap.board);
  const score = floodScore(snap);

  return (
    <View>
      <View style={[styles.field, { borderColor: m.line, backgroundColor: m.card }]}>
        {Array.from({ length: FLOOD_SIZE }, (_, y) => (
          <View key={y} style={styles.rowLine}>
            {Array.from({ length: FLOOD_SIZE }, (_, x) => {
              const idx = y * FLOOD_SIZE + x;
              return (
                <View
                  key={x}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: FLOOD_COLORS[snap.board[idx]],
                      opacity: region.has(idx) ? 1 : 0.62,
                    },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.swatches}>
        {FLOOD_COLORS.map((hex, i) => (
          <Pressable
            key={hex}
            onPress={() => apply(i)}
            accessibilityRole="button"
            accessibilityLabel={`Flood with colour ${i + 1}`}
            style={[
              styles.swatch,
              { backgroundColor: hex, borderColor: snap.board[0] === i ? m.ink : "transparent" },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Out of steps. The paint keeps the score."
          : `score ${score} · board ${snap.boards + 1} · steps ${snap.steps}/${FLOOD_MAX_STEPS} · the bright corner is yours — spread it`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Twenty steps, still patchy. That's the run."
          extraLine={`${snap.boards} board${snap.boards === 1 ? "" : "s"} flooded clean`}
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 8, gap: 3 },
  rowLine: { flexDirection: "row", gap: 3 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 4 },
  swatches: { marginTop: 12, flexDirection: "row", gap: 9, justifyContent: "center" },
  swatch: { width: 42, height: 42, borderRadius: 12, borderWidth: 3 },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
