import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  RUNNER_GROUND_H,
  RUNNER_SIZE,
  RUNNER_W,
  RUNNER_X,
  runnerJump,
  runnerScore,
  runnerStart,
  runnerStep,
  type RunnerState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v398 Runner — the flagship endless. Pixel flavour: chunky
 * squares, hard edges, motion in 50ms steps. Tap = hop, long-press
 * = the big jump. Distance scores by the metre, coins strung along
 * the path pay 25, skimming an obstacle pays 5. A crash ends the
 * run and settles it; Again starts a fresh one instantly.
 */
const TICK = 50;

export function RunnerGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const [fieldW, setFieldW] = useState(320);
  const stateRef = useRef<RunnerState>(runnerStart());
  const [snap, setSnap] = useState<RunnerState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const pressAtRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (ending) return;
      const next = runnerStep(stateRef.current, TICK / 1000, Math.random);
      stateRef.current = next;
      setSnap(next);
      const score = runnerScore(next);
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
    stateRef.current = runnerStart();
    reportedRef.current = 0;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const sx = fieldW / RUNNER_W;
  const score = runnerScore(snap);

  return (
    <View>
      <Pressable
        onPressIn={() => { pressAtRef.current = Date.now(); }}
        onPressOut={() => {
          const held = Date.now() - pressAtRef.current;
          stateRef.current = runnerJump(stateRef.current, held > 220);
        }}
        accessibilityRole="button"
        accessibilityLabel="Jump — tap for a hop, hold for a big jump"
        onLayout={(e) => setFieldW(e.nativeEvent.layout.width)}
        style={[styles.field, { backgroundColor: m.tonal, borderColor: m.line }]}
      >
        {/* coins */}
        {snap.coins.map((c) => (
          <View key={c.id} style={[styles.coin, { left: c.x * sx - 6, bottom: 14 + c.y }]} />
        ))}
        {/* obstacles */}
        {snap.obstacles.map((o) => (
          <View key={o.id} style={[styles.obstacle, { left: o.x * sx, width: Math.max(10, o.w * sx), height: o.h }]} />
        ))}
        {/* the runner — head, body, legs, all squares */}
        <View style={{ position: "absolute", left: RUNNER_X * sx, bottom: 12 + snap.y, width: RUNNER_SIZE, height: RUNNER_SIZE + 14 }}>
          <View style={styles.head} />
          <View style={styles.body} />
          <View style={styles.legs} />
        </View>
        <View style={[styles.ground, { backgroundColor: m.line }]} />
      </Pressable>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Down he goes. The road keeps the score."
          : `score ${score} · ${Math.floor(snap.distance)}m · speed climbs as you run`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Crashed. That's the run."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, height: RUNNER_GROUND_H + 44, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  ground: { position: "absolute", left: 0, right: 0, bottom: 0, height: 12 },
  coin: { position: "absolute", width: 12, height: 12, backgroundColor: "#F5C04A", borderWidth: 2, borderColor: "#C89B3C" },
  obstacle: { position: "absolute", bottom: 12, backgroundColor: "#5B4632", borderTopWidth: 4, borderTopColor: "#3E2E20" },
  head: { position: "absolute", top: 0, left: 5, width: 12, height: 12, backgroundColor: "#E8B98A" },
  body: { position: "absolute", top: 13, left: 3, width: 16, height: 15, backgroundColor: "#C23A28" },
  legs: { position: "absolute", bottom: 0, left: 4, width: 14, height: 7, backgroundColor: "#2E3A52" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
