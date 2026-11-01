import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  BREAKOUT_H,
  BREAKOUT_PADDLE_W,
  BREAKOUT_PADDLE_Y,
  BREAKOUT_W,
  breakoutScore,
  breakoutStart,
  breakoutStep,
  type BreakoutState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v398 Breakout — drag to move the paddle; the ball does the rest.
 * Brick rows keep landing every six seconds, forever. +10 a brick,
 * +100 a cleared row. Losing the ball ends the run.
 */
const TICK = 30;
const BRICK_FILL = ["#C9452F", "#E8873A", "#F5C04A", "#7FB069", "#4A7FC9", "#8B6FD8"];

export function BreakoutGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const [fieldW, setFieldW] = useState(320);
  const stateRef = useRef<BreakoutState>(breakoutStart());
  const [snap, setSnap] = useState<BreakoutState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (ending) return;
      const next = breakoutStep(stateRef.current, TICK / 1000);
      stateRef.current = next;
      setSnap(next);
      const score = breakoutScore(next);
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
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const again = () => {
    stateRef.current = breakoutStart();
    reportedRef.current = 0;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const sx = fieldW / BREAKOUT_W;
  const score = breakoutScore(snap);

  return (
    <View>
      <View
        onTouchStart={(e) => {
          stateRef.current = { ...stateRef.current, paddleX: Math.max(0, Math.min(BREAKOUT_W - BREAKOUT_PADDLE_W, e.nativeEvent.locationX / sx - BREAKOUT_PADDLE_W / 2)) };
        }}
        onTouchMove={(e) => {
          stateRef.current = { ...stateRef.current, paddleX: Math.max(0, Math.min(BREAKOUT_W - BREAKOUT_PADDLE_W, e.nativeEvent.locationX / sx - BREAKOUT_PADDLE_W / 2)) };
        }}
        onLayout={(e) => setFieldW(e.nativeEvent.layout.width)}
        style={[styles.field, { backgroundColor: m.tonal, borderColor: m.line }]}
      >
        {snap.bricks.filter((b) => b.alive).map((b) => (
          <View key={b.id} style={{ position: "absolute", left: b.x * sx, top: b.y, width: 48 * sx - 3, height: 15, backgroundColor: BRICK_FILL[b.row % BRICK_FILL.length] }} />
        ))}
        <View style={[styles.ball, { left: snap.ball.x * sx - 7, top: snap.ball.y - 7 }]} />
        <View style={[styles.paddle, { left: snap.paddleX * sx, top: BREAKOUT_PADDLE_Y, width: BREAKOUT_PADDLE_W * sx }]} />
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending ? "The ball got past you." : `score ${score} · ${snap.bricksBroken} bricks · drag to move the paddle`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Ball lost. That's the run."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, height: BREAKOUT_H, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  ball: { position: "absolute", width: 14, height: 14, borderRadius: 7, backgroundColor: "#FFF6DE", borderWidth: 2, borderColor: "#C89B3C" },
  paddle: { position: "absolute", height: 11, borderRadius: 6, backgroundColor: "#2E3A52" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
