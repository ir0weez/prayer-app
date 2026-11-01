import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  MINES_COUNT,
  MINES_SIZE,
  minesAdjacent,
  minesFlag,
  minesReveal,
  minesScore,
  minesStart,
  minesStep,
  type MinesState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v400 Mines Mini — the open field, swept carefully: 8×8, ten
 * mines. Tap to reveal (the first tap is always safe — the field
 * isn't laid until you touch it), long-press to flag. Clearing
 * every safe cell banks 200 + a speed bonus and lays a fresh
 * field; one mine ends the run.
 */
const TICK = 500;

const NUMBER_COLORS = ["", "#2F6FDE", "#3E8E4F", "#C0392B", "#7C4DBD", "#A65A00", "#1F7A8C", "#333333", "#666666"];

export function MinesMiniGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<MinesState>(minesStart());
  const [snap, setSnap] = useState<MinesState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const overRef = useRef(false);

  const report = (next: MinesState) => {
    const score = minesScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
    return score;
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (ending || overRef.current) return;
      const next = minesStep(stateRef.current, TICK / 1000);
      if (next !== stateRef.current) {
        stateRef.current = next;
        setSnap(next);
      }
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const reveal = (index: number) => {
    if (ending || overRef.current) return;
    const next = minesReveal(stateRef.current, index, Math.random);
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

  const flag = (index: number) => {
    if (ending || overRef.current) return;
    const next = minesFlag(stateRef.current, index);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
  };

  const again = () => {
    stateRef.current = minesStart();
    reportedRef.current = 0;
    overRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const flags = snap.flagged.filter(Boolean).length;
  const score = minesScore(snap);

  return (
    <View>
      <View style={[styles.field, { backgroundColor: "#7A8B5A", borderColor: m.line }]}>
        {Array.from({ length: MINES_SIZE }, (_, y) => (
          <View key={y} style={styles.rowLine}>
            {Array.from({ length: MINES_SIZE }, (_, x) => {
              const idx = y * MINES_SIZE + x;
              const revealed = snap.revealed[idx];
              const isHit = snap.hitMine === idx;
              const count = revealed && !isHit ? minesAdjacent(snap.mines, idx) : 0;
              return (
                <Pressable
                  key={x}
                  onPress={() => reveal(idx)}
                  onLongPress={() => flag(idx)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    revealed
                      ? isHit
                        ? "The mine"
                        : count > 0
                          ? `${count} mines nearby`
                          : "Clear ground"
                      : snap.flagged[idx]
                        ? "Flagged — long-press to unflag"
                        : "Covered ground — tap to reveal, long-press to flag"
                  }
                  style={[
                    styles.cell,
                    isHit
                      ? { backgroundColor: "#C0392B", borderColor: "#7E2418" }
                      : revealed
                        ? { backgroundColor: "#E8E3D2", borderColor: "#B9B2A4" }
                        : { backgroundColor: "#93A96F", borderColor: "#6E8452" },
                  ]}
                >
                  {snap.flagged[idx] && !revealed ? (
                    <Text style={styles.flagText}>⚑</Text>
                  ) : isHit ? (
                    <Text style={styles.mineText}>✸</Text>
                  ) : revealed && count > 0 ? (
                    <Text style={[styles.countText, { color: NUMBER_COLORS[count] }]}>{count}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Boom. The field keeps the score."
          : `score ${score} · field ${snap.boards + 1} · flags ${flags}/${MINES_COUNT} · ${Math.floor(snap.elapsed)}s in${snap.mines ? "" : " · first tap is always safe"}`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="That one was live. That's the run."
          extraLine={`${snap.boards} field${snap.boards === 1 ? "" : "s"} cleared clean`}
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, padding: 7, gap: 4 },
  rowLine: { flexDirection: "row", gap: 4 },
  cell: { flex: 1, aspectRatio: 1, borderRadius: 5, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  flagText: { fontSize: 13, color: "#C0392B", fontWeight: "900" },
  mineText: { fontSize: 15, color: "#FFFFFF", fontWeight: "900" },
  countText: { fontSize: 13.5, fontWeight: "900" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
