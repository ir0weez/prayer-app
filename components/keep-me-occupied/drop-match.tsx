import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  DROP_COLS,
  DROP_ROWS,
  dropAddRow,
  dropClearGroup,
  dropFindGroup,
  dropStart,
  type DropGrid,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { dropMatchClearPoints } from "@/lib/kmo-progression";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v398 Drop Match — the calm hands one. Rows of coloured blocks
 * rise from the floor every five seconds; tap any connected group
 * of 3+ to clear it (+8 a block, and consecutive clears without a
 * new row landing chain ×2, ×3…). The pile reaching the top ends
 * the run.
 */
const ROW_MS = 5000;

export function DropMatchGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const [grid, setGrid] = useState<DropGrid>(() => {
    let g = dropStart();
    for (let i = 0; i < 3; i++) g = dropAddRow(g, Math.random).grid;
    return g;
  });
  const [score, setScore] = useState(0);
  const [chain, setChain] = useState(1);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const gridRef = useRef(grid);
  gridRef.current = grid;
  const chainRef = useRef(chain);
  chainRef.current = chain;
  const overRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (overRef.current) return;
      const { grid: next, toppedOut } = dropAddRow(gridRef.current, Math.random);
      setGrid(next);
      gridRef.current = next;
      setChain(1);
      chainRef.current = 1;
      if (toppedOut) {
        overRef.current = true;
        void (async () => {
          const receipt = onRunEnd ? await onRunEnd() : null;
          setEnding(receipt ?? { coins: 0, xp: 0, score: 0, best: 0 });
        })();
      }
    }, ROW_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const tapCell = (col: number, row: number) => {
    if (overRef.current) return;
    const group = dropFindGroup(gridRef.current, col, row);
    if (group.length < 3) return;
    const points = dropMatchClearPoints(group.length, chainRef.current);
    setScore((s) => s + points);
    onScore?.(points);
    const next = dropClearGroup(gridRef.current, group);
    setGrid(next);
    gridRef.current = next;
    const nextChain = chainRef.current + 1;
    setChain(nextChain);
    chainRef.current = nextChain;
  };

  const again = () => {
    let g = dropStart();
    for (let i = 0; i < 3; i++) g = dropAddRow(g, Math.random).grid;
    overRef.current = false;
    setGrid(g);
    gridRef.current = g;
    setScore(0);
    setChain(1);
    chainRef.current = 1;
    setEnding(null);
  };

  return (
    <View>
      <View style={[styles.field, { backgroundColor: m.tonal, borderColor: m.line }]}>
        {Array.from({ length: DROP_ROWS }, (_, displayRow) => {
          const rowFromFloor = DROP_ROWS - 1 - displayRow;
          return (
            <View key={displayRow} style={styles.rowLine}>
              {Array.from({ length: DROP_COLS }, (_, col) => {
                const color = grid[col]?.[rowFromFloor];
                return (
                  <Pressable
                    key={col}
                    onPress={() => tapCell(col, rowFromFloor)}
                    accessibilityRole="button"
                    accessibilityLabel={color ? `Block column ${col + 1}` : "Empty"}
                    style={[styles.cell, color ? { backgroundColor: color } : styles.cellEmpty]}
                  />
                );
              })}
            </View>
          );
        })}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "The pile reached the top."
          : `score ${score}${chain > 1 ? ` · chain ×${chain}` : ""} · tap a group of 3 or more`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score || score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Topped out. That's the run."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden", padding: 6, gap: 4 },
  rowLine: { flexDirection: "row", gap: 4 },
  cell: { flex: 1, height: 27, borderRadius: 5 },
  cellEmpty: { backgroundColor: "rgba(0,0,0,0.045)" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
