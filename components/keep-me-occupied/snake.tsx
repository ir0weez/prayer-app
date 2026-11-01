import { useEffect, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import {
  SNAKE_COLS,
  SNAKE_ROWS,
  SNAKE_TICK_MS,
  snakeScore,
  snakeStart,
  snakeStep,
  snakeTurn,
  type SnakeDir,
  type SnakeState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v398 Snake — the classic, pixel squares on a grid. Swipe the
 * field (or use the pad) to steer. +15 a food, +1 a second.
 * Walls kill; so does your own tail.
 */
const DIRS: Record<string, SnakeDir> = {
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
};

export function SnakeGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const [fieldW, setFieldW] = useState(300);
  const stateRef = useRef<SnakeState>(snakeStart(Math.random));
  const [snap, setSnap] = useState<SnakeState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (ending) return;
      const next = snakeStep(stateRef.current, Math.random);
      stateRef.current = next;
      setSnap(next);
      const score = snakeScore(next);
      if (score > reportedRef.current) {
        onScore?.(score - reportedRef.current);
        reportedRef.current = score;
      }
      if (!next.alive) {
        void (async () => {
          const receipt = onRunEnd ? await onRunEnd() : null;
          setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
        })();
      }
    }, SNAKE_TICK_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, g) => {
        const { dx, dy } = g;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return;
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? DIRS.right : DIRS.left) : (dy > 0 ? DIRS.down : DIRS.up);
        stateRef.current = snakeTurn(stateRef.current, dir);
      },
    }),
  ).current;

  const again = () => {
    stateRef.current = snakeStart(Math.random);
    reportedRef.current = 0;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const cell = Math.floor(fieldW / SNAKE_COLS);
  const score = snakeScore(snap);
  const key = (x: number, y: number) => `${x},${y}`;
  const body = new Set(snap.cells.map((c) => key(c.x, c.y)));

  return (
    <View>
      <View
        {...pan.panHandlers}
        onLayout={(e) => setFieldW(e.nativeEvent.layout.width)}
        style={[styles.field, { backgroundColor: m.tonal, borderColor: m.line, width: cell * SNAKE_COLS, height: cell * SNAKE_ROWS }]}
      >
        {Array.from({ length: SNAKE_ROWS }, (_, y) =>
          Array.from({ length: SNAKE_COLS }, (_, x) => {
            const isHead = snap.cells[0]?.x === x && snap.cells[0]?.y === y;
            const isBody = body.has(key(x, y));
            const isFood = snap.food.x === x && snap.food.y === y;
            if (!isBody && !isFood) return null;
            return (
              <View
                key={key(x, y)}
                style={{
                  position: "absolute", left: x * cell + 1, top: y * cell + 1,
                  width: cell - 2, height: cell - 2,
                  backgroundColor: isFood ? "#C9452F" : isHead ? "#4E7A3A" : "#7FB069",
                }}
              />
            );
          }),
        )}
      </View>
      <View style={styles.pad}>
        {(["up", "left", "down", "right"] as const).map((d) => (
          <Pressable
            key={d}
            onPress={() => { stateRef.current = snakeTurn(stateRef.current, DIRS[d]); }}
            accessibilityRole="button"
            accessibilityLabel={`Steer ${d}`}
            style={[styles.padBtn, { backgroundColor: m.card, borderColor: m.line }]}
          >
            <Text style={{ color: m.ink, fontWeight: "900" }}>{d === "up" ? "↑" : d === "down" ? "↓" : d === "left" ? "←" : "→"}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending ? "Wall or tail — the classic endings." : `score ${score} · length ${snap.cells.length} · swipe or use the pad`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Caught. That's the run."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 8, borderWidth: 1, overflow: "hidden", alignSelf: "center" },
  pad: { flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 12 },
  padBtn: { width: 52, height: 40, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
