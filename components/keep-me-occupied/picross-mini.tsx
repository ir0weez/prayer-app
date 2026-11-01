import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  PICROSS_MAX_MISTAKES,
  PICROSS_SIZE,
  picrossClues,
  picrossFill,
  picrossMark,
  picrossScore,
  picrossStart,
  picrossStep,
  type PicrossState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v400 Picross Mini — paper and pencil deduction: row and column
 * clues describe a hidden 5×5 picture. Fill the true cells (tap
 * in Fill mode, or long-press to mark an X in either mode).
 * A finished picture pays 300 − time − 25 a mistake; the third
 * mistake ends the run.
 */
const TICK = 500;

export function PicrossMiniGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<PicrossState>(picrossStart(Math.random));
  const [snap, setSnap] = useState<PicrossState>(stateRef.current);
  const [mode, setMode] = useState<"fill" | "mark">("fill");
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const overRef = useRef(false);

  const report = (next: PicrossState) => {
    const score = picrossScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
    return score;
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (ending || overRef.current) return;
      const next = picrossStep(stateRef.current, TICK / 1000);
      stateRef.current = next;
      setSnap(next);
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const finishIfOver = (next: PicrossState) => {
    const score = report(next);
    if (!next.over) return;
    overRef.current = true;
    void (async () => {
      const receipt = onRunEnd ? await onRunEnd() : null;
      setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
    })();
  };

  const tapCell = (index: number) => {
    if (ending || overRef.current) return;
    const next = mode === "fill"
      ? picrossFill(stateRef.current, index, Math.random)
      : picrossMark(stateRef.current, index);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
    finishIfOver(next);
  };

  const markCell = (index: number) => {
    if (ending || overRef.current) return;
    const next = picrossMark(stateRef.current, index);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
  };

  const again = () => {
    stateRef.current = picrossStart(Math.random);
    reportedRef.current = 0;
    overRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const clues = picrossClues(snap.pattern);
  const score = picrossScore(snap);

  return (
    <View>
      <View style={[styles.field, { backgroundColor: "#FBF6E9", borderColor: m.line }]}>
        {/* column clues */}
        <View style={styles.clueRow}>
          <View style={styles.corner} />
          {clues.cols.map((col, x) => (
            <View key={x} style={styles.colClue}>
              {col.map((n, i) => (
                <Text key={i} style={styles.clueText}>{n}</Text>
              ))}
            </View>
          ))}
        </View>
        {Array.from({ length: PICROSS_SIZE }, (_, y) => (
          <View key={y} style={styles.rowLine}>
            <View style={styles.rowClue}>
              <Text style={styles.clueText}>{clues.rows[y].join(" ")}</Text>
            </View>
            {Array.from({ length: PICROSS_SIZE }, (_, x) => {
              const idx = y * PICROSS_SIZE + x;
              const filled = snap.filled[idx];
              const marked = snap.marked[idx];
              return (
                <Pressable
                  key={x}
                  onPress={() => tapCell(idx)}
                  onLongPress={() => markCell(idx)}
                  accessibilityRole="button"
                  accessibilityLabel={`Cell ${x + 1}, ${y + 1}${filled ? " — filled" : marked ? " — marked" : ""}`}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: filled ? m.seed : "#FFFFFF",
                      borderColor: m.line,
                    },
                  ]}
                >
                  {marked && !filled ? <Text style={styles.markText}>×</Text> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.modeRow}>
        {(["fill", "mark"] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setMode(value)}
            accessibilityRole="button"
            accessibilityLabel={value === "fill" ? "Fill mode" : "Mark mode"}
            style={[
              styles.modeBtn,
              { backgroundColor: mode === value ? m.seed : m.card, borderColor: m.line },
            ]}
          >
            <Text style={[styles.modeText, { color: mode === value ? "#FFFFFF" : m.inkSoft }]}>
              {value === "fill" ? "■ Fill" : "× Mark"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Third mistake. The paper keeps the score."
          : `score ${score} · picture ${snap.boards + 1} · mistakes ${snap.mistakes}/${PICROSS_MAX_MISTAKES} · ${Math.floor(snap.elapsed)}s in`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Three mistakes. That's the run."
          extraLine={`${snap.boards} picture${snap.boards === 1 ? "" : "s"} finished`}
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 10 },
  clueRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 4 },
  corner: { width: 44 },
  colClue: { flex: 1, alignItems: "center", justifyContent: "flex-end", minHeight: 34 },
  clueText: { fontSize: 11, fontWeight: "800", color: "#6B5D43" },
  rowLine: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  rowClue: { width: 44, alignItems: "flex-end", paddingRight: 8 },
  cell: { flex: 1, aspectRatio: 1, marginLeft: 4, borderRadius: 6, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  markText: { fontSize: 16, fontWeight: "900", color: "#C0392B" },
  modeRow: { marginTop: 12, flexDirection: "row", gap: 9 },
  modeBtn: { flex: 1, borderRadius: 999, borderWidth: 1, paddingVertical: 9, alignItems: "center" },
  modeText: { fontSize: 13, fontWeight: "800" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
