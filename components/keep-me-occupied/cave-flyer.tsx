import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  CAVE_COL_W,
  CAVE_H,
  CAVE_SIZE,
  CAVE_W,
  CAVE_X,
  caveScore,
  caveStart,
  caveStep,
  type CaveState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v399 Cave Flyer — the old helicopter game, pixel blocks. Hold
 * anywhere on the cave to rise, let go to fall. The cave narrows
 * and roughens as you go; a coin ring threaded pays 30. One touch
 * of rock ends the run.
 */
const TICK = 50;

export function CaveFlyerGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const [fieldW, setFieldW] = useState(320);
  const stateRef = useRef<CaveState>(caveStart());
  const thrustRef = useRef(false);
  const [snap, setSnap] = useState<CaveState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (ending) return;
      const next = caveStep(stateRef.current, TICK / 1000, thrustRef.current, Math.random);
      stateRef.current = next;
      setSnap(next);
      const score = caveScore(next);
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
    stateRef.current = caveStart();
    thrustRef.current = false;
    reportedRef.current = 0;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const sx = fieldW / CAVE_W;
  const sy = sx; // the field is square-ish: height tracks the width scale
  const fieldH = CAVE_H * sy;
  const score = caveScore(snap);

  return (
    <View>
      <Pressable
        onPressIn={() => { thrustRef.current = true; }}
        onPressOut={() => { thrustRef.current = false; }}
        accessibilityRole="button"
        accessibilityLabel="Hold to rise, release to fall"
        onLayout={(e) => setFieldW(e.nativeEvent.layout.width)}
        style={[styles.field, { backgroundColor: "#232A33", borderColor: m.line, height: fieldH }]}
      >
        {/* the cave: one ceiling block and one floor block per column */}
        {snap.ceil.map((ceilY, i) => (
          <View
            key={`c${i}`}
            style={{
              position: "absolute",
              left: i * CAVE_COL_W * sx - snap.scroll * sx,
              top: 0,
              width: CAVE_COL_W * sx + 1,
              height: Math.max(0, ceilY * sy),
              backgroundColor: "#57606C",
            }}
          />
        ))}
        {snap.floor.map((floorY, i) => (
          <View
            key={`f${i}`}
            style={{
              position: "absolute",
              left: i * CAVE_COL_W * sx - snap.scroll * sx,
              top: floorY * sy,
              width: CAVE_COL_W * sx + 1,
              height: Math.max(0, fieldH - floorY * sy),
              backgroundColor: "#57606C",
            }}
          />
        ))}
        {/* coin rings */}
        {snap.rings.map((ring) => (
          <View
            key={ring.id}
            style={[styles.ring, { left: ring.x * sx - 11, top: ring.y * sy - 11 }]}
          />
        ))}
        {/* the flyer — rotor, body, tail, all squares */}
        <View style={{ position: "absolute", left: CAVE_X * sx - CAVE_SIZE / 2, top: snap.y * sy - CAVE_SIZE / 2, width: 30, height: CAVE_SIZE }}>
          <View style={styles.rotor} />
          <View style={styles.body} />
          <View style={styles.tail} />
        </View>
      </Pressable>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Rock wins this time."
          : `score ${score} · ${Math.floor(snap.distance)}m · ${snap.ringsCollected} rings · hold to rise, let go to fall`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Into the rock. That's the run."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 10, borderWidth: 1, overflow: "hidden", position: "relative" },
  ring: { position: "absolute", width: 22, height: 22, borderRadius: 11, borderWidth: 4, borderColor: "#F5C04A" },
  rotor: { position: "absolute", top: 0, left: 2, width: 24, height: 3, backgroundColor: "#D8DEE6" },
  body: { position: "absolute", top: 5, left: 8, width: 16, height: 11, backgroundColor: "#E8873A" },
  tail: { position: "absolute", top: 8, left: 0, width: 9, height: 4, backgroundColor: "#B85F1F" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
