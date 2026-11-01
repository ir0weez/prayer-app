import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BLOCK_SIZE,
  blockPlace,
  blockScore,
  blockStart,
  type BlockPiece,
  type BlockState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v400 Block Fit — the workbench: three chunky pieces on the
 * tray; pick one, tap the board cell its top-left corner should
 * sit on. Full rows and columns clear (10 a cell, combo per
 * extra line). When nothing on the tray fits anywhere, the bench
 * is full and the run ends.
 */
export function BlockFitGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<BlockState>(blockStart(Math.random));
  const [snap, setSnap] = useState<BlockState>(stateRef.current);
  const [selected, setSelected] = useState<number>(0);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const overRef = useRef(false);

  const report = (next: BlockState) => {
    const score = blockScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
    return score;
  };

  const place = (x: number, y: number) => {
    if (ending || overRef.current) return;
    const next = blockPlace(stateRef.current, selected, x, y, Math.random);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
    const score = report(next);
    const firstLive = next.tray.findIndex((p) => p !== null);
    if (firstLive >= 0) setSelected(firstLive);
    if (next.over) {
      overRef.current = true;
      void (async () => {
        const receipt = onRunEnd ? await onRunEnd() : null;
        setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
      })();
    }
  };

  const again = () => {
    stateRef.current = blockStart(Math.random);
    reportedRef.current = 0;
    overRef.current = false;
    setSelected(0);
    setSnap(stateRef.current);
    setEnding(null);
  };

  const score = blockScore(snap);

  return (
    <View>
      <View style={[styles.field, { backgroundColor: "#4A3826", borderColor: m.line }]}>
        {Array.from({ length: BLOCK_SIZE }, (_, y) => (
          <View key={y} style={styles.rowLine}>
            {Array.from({ length: BLOCK_SIZE }, (_, x) => {
              const value = snap.board[y * BLOCK_SIZE + x];
              return (
                <Pressable
                  key={x}
                  onPress={() => place(x, y)}
                  accessibilityRole="button"
                  accessibilityLabel={`Board cell ${x + 1}, ${y + 1}${value ? " — filled" : ""}`}
                  style={[
                    styles.cell,
                    value
                      ? { backgroundColor: value, borderColor: "rgba(0,0,0,0.25)" }
                      : { backgroundColor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.14)" },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.tray}>
        {snap.tray.map((piece, i) => (
          <Pressable
            key={i}
            onPress={() => piece && setSelected(i)}
            accessibilityRole="button"
            accessibilityLabel={piece ? `Tray piece ${i + 1} — tap to select` : "Empty tray slot"}
            style={[
              styles.traySlot,
              { backgroundColor: m.card, borderColor: selected === i && piece ? m.seed : m.line },
            ]}
          >
            {piece ? <PiecePreview piece={piece} /> : null}
          </Pressable>
        ))}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Nothing left fits. The bench keeps the score."
          : `score ${score} · ${snap.placed} placed · select a piece, then tap where its corner lands`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="No room for anything left. That's the run."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

function PiecePreview({ piece }: { piece: BlockPiece }) {
  const maxX = Math.max(...piece.cells.map(([x]) => x)) + 1;
  const maxY = Math.max(...piece.cells.map(([, y]) => y)) + 1;
  return (
    <View style={{ width: maxX * 13, height: maxY * 13, position: "relative" }}>
      {piece.cells.map(([x, y], i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: x * 13,
            top: y * 13,
            width: 12,
            height: 12,
            borderRadius: 3,
            backgroundColor: piece.color,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 8, gap: 4 },
  rowLine: { flexDirection: "row", gap: 4 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 5, borderWidth: 1 },
  tray: { marginTop: 12, flexDirection: "row", gap: 9 },
  traySlot: { flex: 1, height: 64, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
