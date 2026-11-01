import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  PIPE_COLS,
  PIPE_E,
  PIPE_N,
  PIPE_ROWS,
  PIPE_S,
  PIPE_W,
  pipeEffective,
  pipeFlow,
  pipeRotate,
  pipeScore,
  pipeSkip,
  pipeStart,
  pipeStep,
  type PipeState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";

/**
 * v400 Pipe Dreams — garden water: tap a tile to rotate it a
 * quarter turn and run the spring (left, middle) to the garden
 * (right, middle). A connected board banks 300 − time − spare
 * rotations over par; boards deal endlessly, a board can be
 * skipped at 0, and nothing here can fail — it settles whenever
 * you deal away, like the original session games.
 */
const TICK = 250;

export function PipeDreamsGame({ m, onScore }: { m: KeepMeOccupiedMaterialFamily; onScore?: (points: number) => void }) {
  const stateRef = useRef<PipeState>(pipeStart(Math.random));
  const [snap, setSnap] = useState<PipeState>(stateRef.current);
  const reportedRef = useRef(0);

  const report = (next: PipeState) => {
    const score = pipeScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
  };

  useEffect(() => {
    const id = setInterval(() => {
      const next = pipeStep(stateRef.current, TICK / 1000);
      stateRef.current = next;
      setSnap(next);
    }, TICK);
    return () => clearInterval(id);
  }, []);

  const rotate = (index: number) => {
    const next = pipeRotate(stateRef.current, index, Math.random);
    stateRef.current = next;
    setSnap(next);
    report(next);
  };

  const skip = () => {
    const next = pipeSkip(stateRef.current, Math.random);
    stateRef.current = next;
    setSnap(next);
  };

  const flow = pipeFlow(snap.board);
  const score = pipeScore(snap);

  return (
    <View>
      <View style={[styles.field, { backgroundColor: "#E9F2E4", borderColor: m.line }]}>
        {snap.board.tiles.map((tile, i) => {
          const eff = pipeEffective(tile);
          const wet = flow.has(i);
          const arm = wet ? "#2F6FDE" : "#9AA78F";
          return (
            <Pressable
              key={i}
              onPress={() => rotate(i)}
              accessibilityRole="button"
              accessibilityLabel={`Pipe tile ${i + 1} — tap to rotate`}
              style={styles.cell}
            >
              <View style={[styles.tileFace, { backgroundColor: wet ? "#D8E9F8" : "#F4F1E6", borderColor: m.line }]}>
                {eff & PIPE_N ? <View style={[styles.armN, { backgroundColor: arm }]} /> : null}
                {eff & PIPE_S ? <View style={[styles.armS, { backgroundColor: arm }]} /> : null}
                {eff & PIPE_W ? <View style={[styles.armW, { backgroundColor: arm }]} /> : null}
                {eff & PIPE_E ? <View style={[styles.armE, { backgroundColor: arm }]} /> : null}
                <View style={[styles.hub, { backgroundColor: arm }]} />
              </View>
            </Pressable>
          );
        })}
        <View style={styles.springTag}>
          <Text style={styles.tagText}>💧 spring</Text>
        </View>
        <View style={styles.gardenTag}>
          <Text style={styles.tagText}>garden 🌱</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Text style={[styles.message, { color: m.inkSoft, flex: 1 }]}>
          {`score ${score} · board ${snap.boards + 1} · ${snap.rotations} turns (par ${snap.board.par}) · ${Math.floor(snap.elapsed)}s`}
        </Text>
        <Pressable
          onPress={skip}
          accessibilityRole="button"
          accessibilityLabel="Skip this board"
          style={[styles.skip, { backgroundColor: m.card, borderColor: m.line }]}
        >
          <Text style={[styles.skipText, { color: m.inkSoft }]}>Skip board</Text>
        </Pressable>
      </View>
      <Text style={[styles.hint, { color: m.inkSoft }]}>Boards bank when the water runs through. Skipping banks nothing.</Text>
    </View>
  );
}

const CELL = `${100 / PIPE_COLS}%`;
const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 8, flexDirection: "row", flexWrap: "wrap", position: "relative" },
  cell: { width: CELL, aspectRatio: 1, padding: 2.5 },
  tileFace: { flex: 1, borderRadius: 8, borderWidth: 1, position: "relative", overflow: "hidden" },
  hub: { position: "absolute", left: "38%", top: "38%", width: "24%", height: "24%", borderRadius: 4 },
  armN: { position: "absolute", left: "41%", top: 0, width: "18%", height: "42%" },
  armS: { position: "absolute", left: "41%", bottom: 0, width: "18%", height: "42%" },
  armW: { position: "absolute", top: "41%", left: 0, height: "18%", width: "42%" },
  armE: { position: "absolute", top: "41%", right: 0, height: "18%", width: "42%" },
  springTag: { position: "absolute", left: 10, top: "47%" },
  gardenTag: { position: "absolute", right: 10, top: "47%" },
  tagText: { fontSize: 10, fontWeight: "800", color: "#4E7A3A" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  message: { fontSize: 12.5, lineHeight: 18 },
  hint: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  skip: { borderRadius: 999, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 13 },
  skipText: { fontSize: 12.5, fontWeight: "800" },
});
