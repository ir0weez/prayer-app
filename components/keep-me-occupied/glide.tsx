import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  GLIDE_H,
  GLIDE_SIZE,
  GLIDE_W,
  GLIDE_X,
  glideScore,
  glideStart,
  glideStep,
  type GlideState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v398 Glide — one tap, float and fall through the gates. +20 a
 * gate. Floor, ceiling, or a gate's edge ends the run.
 */
const TICK = 40;

export function GlideGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const [fieldW, setFieldW] = useState(320);
  const stateRef = useRef<GlideState>(glideStart());
  const flapRef = useRef(false);
  const [snap, setSnap] = useState<GlideState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (ending) return;
      const flap = flapRef.current;
      flapRef.current = false;
      const next = glideStep(stateRef.current, TICK / 1000, flap, Math.random);
      stateRef.current = next;
      setSnap(next);
      const score = glideScore(next);
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
    stateRef.current = glideStart();
    reportedRef.current = 0;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const sx = fieldW / GLIDE_W;
  const score = glideScore(snap);

  return (
    <View>
      <Pressable
        onPress={() => { flapRef.current = true; }}
        accessibilityRole="button"
        accessibilityLabel="Flap"
        onLayout={(e) => setFieldW(e.nativeEvent.layout.width)}
        style={[styles.field, { backgroundColor: m.tonal, borderColor: m.line }]}
      >
        {snap.gates.map((g) => (
          <View key={g.id}>
            <View style={[styles.pipe, { left: g.x * sx, width: 46 * sx, top: 0, height: g.gapY }]} />
            <View style={[styles.pipe, { left: g.x * sx, width: 46 * sx, top: g.gapY + 112, height: GLIDE_H - (g.gapY + 112) }]} />
          </View>
        ))}
        <View style={[styles.bird, { left: GLIDE_X * sx, top: snap.y }]} />
      </Pressable>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending ? "Gate, floor, or ceiling — one of them got you." : `score ${score} · ${snap.gatesCleared} gates · tap to flap`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Down. That's the run."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, height: GLIDE_H, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  pipe: { position: "absolute", backgroundColor: "#5E8C4A", borderWidth: 2, borderColor: "#3E5E30" },
  bird: { position: "absolute", width: GLIDE_SIZE, height: GLIDE_SIZE, backgroundColor: "#F5C04A", borderWidth: 2, borderColor: "#C89B3C" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
