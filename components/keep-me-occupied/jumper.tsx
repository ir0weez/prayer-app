import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  JUMP_PLAT_W,
  JUMP_VIEW,
  JUMP_W,
  jumpScore,
  jumpStart,
  jumpStep,
  type JumpState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v398 Jumper — the vertical climber, pixel squares. He bounces
 * on his own; you steer by holding the left or right half of the
 * sky (the edges wrap). Steady, moving, and crumble platforms —
 * crumbles give one bounce only. +1 an altitude unit, +20 a coin.
 * Falling past the bottom ends the run.
 */
const TICK = 33;
const PLAT_FILL = { steady: "#7FB069", moving: "#4A7FC9", crumble: "#B0793C" } as const;

export function JumperGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const [fieldW, setFieldW] = useState(320);
  const stateRef = useRef<JumpState>(jumpStart(Math.random));
  const steerRef = useRef<-1 | 0 | 1>(0);
  const [snap, setSnap] = useState<JumpState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (ending) return;
      const next = jumpStep(stateRef.current, TICK / 1000, steerRef.current, Math.random);
      stateRef.current = next;
      setSnap(next);
      const score = jumpScore(next);
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
    stateRef.current = jumpStart(Math.random);
    steerRef.current = 0;
    reportedRef.current = 0;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const sx = fieldW / JUMP_W;
  const toTop = (worldY: number) => JUMP_VIEW - (worldY - snap.camY);
  const score = jumpScore(snap);

  return (
    <View>
      <View
        onLayout={(e) => setFieldW(e.nativeEvent.layout.width)}
        style={[styles.field, { backgroundColor: m.tonal, borderColor: m.line }]}
      >
        {snap.coins.map((c) => (
          <View key={c.id} style={[styles.coin, { left: c.x * sx, top: toTop(c.y + 14) }]} />
        ))}
        {snap.platforms.map((p) => (
          <View
            key={p.id}
            style={{
              position: "absolute", left: p.x * sx, top: toTop(p.y + 10),
              width: JUMP_PLAT_W * sx, height: 10,
              backgroundColor: PLAT_FILL[p.type], opacity: p.type === "crumble" && p.used ? 0.35 : 1,
            }}
          />
        ))}
        {/* the jumper — square head, square body */}
        <View style={{ position: "absolute", left: snap.x * sx - 11, top: toTop(snap.y + 30), width: 22, height: 30 }}>
          <View style={styles.head} />
          <View style={styles.body} />
        </View>
        <Pressable
          onPressIn={() => { steerRef.current = -1; }}
          onPressOut={() => { if (steerRef.current === -1) steerRef.current = 0; }}
          accessibilityRole="button"
          accessibilityLabel="Steer left"
          style={[styles.hold, { left: 0 }]}
        />
        <Pressable
          onPressIn={() => { steerRef.current = 1; }}
          onPressOut={() => { if (steerRef.current === 1) steerRef.current = 0; }}
          accessibilityRole="button"
          accessibilityLabel="Steer right"
          style={[styles.hold, { right: 0 }]}
        />
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "The sky let go of you."
          : `score ${score} · altitude ${Math.floor(snap.altMax)} · hold a side to steer — edges wrap`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Fell. That's the run."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, height: JUMP_VIEW, borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  coin: { position: "absolute", width: 13, height: 13, backgroundColor: "#F5C04A", borderWidth: 2, borderColor: "#C89B3C" },
  head: { position: "absolute", top: 0, left: 5, width: 12, height: 12, backgroundColor: "#E8B98A" },
  body: { position: "absolute", top: 13, left: 2, width: 18, height: 17, backgroundColor: "#4A7FC9" },
  hold: { position: "absolute", top: 0, bottom: 0, width: "50%" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
