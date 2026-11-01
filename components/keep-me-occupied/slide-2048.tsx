import { useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import {
  SLIDE_SIZE,
  slideScore,
  slideStart,
  slideSwipe,
  type SlideDirection,
  type SlideState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v399 Slide 2048 — the ladder's prestige top, flat calm tiles.
 * Swipe to slide; equal tiles merge and sum, and the score is the
 * sum of everything you've merged. No moves left ends the run.
 * No undo — the slide is the commitment.
 */
const TILE_FILLS: Record<number, string> = {
  2: "#EFE7D8", 4: "#EADFC6", 8: "#F2B26B", 16: "#EE9648",
  32: "#EE7A4A", 64: "#E85D35", 128: "#EDCF72", 256: "#ECC64E",
  512: "#E8BE33", 1024: "#E3A81F", 2048: "#D9940A",
};
const TILE_INK: Record<number, string> = {
  2: "#6B5D43", 4: "#6B5D43", 8: "#FFFFFF", 16: "#FFFFFF",
  32: "#FFFFFF", 64: "#FFFFFF", 128: "#6B5D43", 256: "#6B5D43",
  512: "#FFFFFF", 1024: "#FFFFFF", 2048: "#FFFFFF",
};

export function Slide2048Game({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<SlideState>(slideStart(Math.random));
  const [snap, setSnap] = useState<SlideState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const overRef = useRef(false);

  const swipe = (dir: SlideDirection) => {
    if (ending || overRef.current) return;
    const next = slideSwipe(stateRef.current, dir, Math.random);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
    const score = slideScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
    if (next.over) {
      overRef.current = true;
      void (async () => {
        const receipt = onRunEnd ? await onRunEnd() : null;
        setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
      })();
    }
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, g) => {
        const { dx, dy } = g;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
        swipe(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
      },
    }),
  ).current;

  const again = () => {
    stateRef.current = slideStart(Math.random);
    reportedRef.current = 0;
    overRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const score = slideScore(snap);

  return (
    <View>
      <View {...pan.panHandlers} style={[styles.field, { backgroundColor: "#B8A98F", borderColor: m.line }]}>
        {Array.from({ length: SLIDE_SIZE }, (_, row) => (
          <View key={row} style={styles.rowLine}>
            {Array.from({ length: SLIDE_SIZE }, (_, col) => {
              const value = snap.grid[row * SLIDE_SIZE + col];
              return (
                <View
                  key={col}
                  style={[
                    styles.tile,
                    value > 0
                      ? { backgroundColor: TILE_FILLS[value] ?? "#C9452F" }
                      : styles.tileEmpty,
                  ]}
                >
                  {value > 0 ? (
                    <Text style={[styles.tileText, { color: TILE_INK[value] ?? "#FFFFFF", fontSize: value >= 1024 ? 17 : value >= 128 ? 20 : 24 }]}>
                      {value}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.pad}>
        {(["up", "left", "down", "right"] as const).map((d) => (
          <Pressable
            key={d}
            onPress={() => swipe(d)}
            accessibilityRole="button"
            accessibilityLabel={`Slide ${d}`}
            style={[styles.padBtn, { backgroundColor: m.card, borderColor: m.line }]}
          >
            <Text style={{ color: m.ink, fontWeight: "900" }}>{d === "up" ? "↑" : d === "down" ? "↓" : d === "left" ? "←" : "→"}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "No moves left on the board."
          : `score ${score} · best tile ${snap.bestTile} · swipe or use the pad`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Board's full. That's the run."
          extraLine={`Best tile this run: ${snap.bestTile}`}
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 8, gap: 8 },
  rowLine: { flexDirection: "row", gap: 8 },
  tile: { flex: 1, aspectRatio: 1, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  tileEmpty: { backgroundColor: "rgba(255,255,255,0.28)" },
  tileText: { fontWeight: "900" },
  pad: { flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 12 },
  padBtn: { width: 52, height: 40, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
