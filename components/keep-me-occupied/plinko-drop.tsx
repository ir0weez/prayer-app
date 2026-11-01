import { useEffect, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";

import {
  PLINKO_BALLS_PER_RUN,
  PLINKO_ROWS,
  PLINKO_SLOTS,
  PLINKO_W,
  plinkoAim,
  plinkoDrop,
  plinkoScore,
  plinkoStart,
  plinkoStep,
  type PlinkoState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v399 Plinko Drop — flat play, not pixels: a bright board, chunky
 * pegs, a ball that rattles down. Slide along the top rail to aim,
 * tap Drop to release. A run is ten balls; the edges pay 250, the
 * dead centre just 10. The tenth ball settling ends the run.
 */
const TICK = 130;
const SLOT_W = PLINKO_W / PLINKO_SLOTS.length;
const BOARD_H = 296;
const ROW_Y = (row: number) => 44 + row * 25;

export function PlinkoDropGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const [fieldW, setFieldW] = useState(320);
  const fieldWRef = useRef(320);
  const stateRef = useRef<PlinkoState>(plinkoStart());
  const [snap, setSnap] = useState<PlinkoState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const endingRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (ending || endingRef.current) return;
      if (!stateRef.current.ball) return;
      const next = plinkoStep(stateRef.current, Math.random);
      stateRef.current = next;
      setSnap(next);
      const score = plinkoScore(next);
      if (score > reportedRef.current) {
        onScore?.(score - reportedRef.current);
        reportedRef.current = score;
      }
      if (next.over) {
        endingRef.current = true;
        void (async () => {
          const receipt = onRunEnd ? await onRunEnd() : null;
          setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
        })();
      }
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const aimFromX = (x: number) => {
    const scale = PLINKO_W / Math.max(1, fieldWRef.current);
    const aim = (x * scale) / SLOT_W - 0.5;
    stateRef.current = plinkoAim(stateRef.current, aim);
    setSnap(stateRef.current);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => aimFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => aimFromX(e.nativeEvent.locationX),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ).current;

  const drop = () => {
    if (ending) return;
    stateRef.current = plinkoDrop(stateRef.current);
    setSnap(stateRef.current);
  };

  const again = () => {
    stateRef.current = plinkoStart();
    reportedRef.current = 0;
    endingRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const sx = fieldW / PLINKO_W;
  const score = plinkoScore(snap);
  const ballsLeft = PLINKO_BALLS_PER_RUN - snap.dropped;

  return (
    <View>
      <View
        onLayout={(e) => {
          fieldWRef.current = e.nativeEvent.layout.width;
          setFieldW(e.nativeEvent.layout.width);
        }}
        style={[styles.field, { backgroundColor: m.tonal, borderColor: m.line, height: BOARD_H }]}
      >
        {/* the aim rail */}
        <View {...pan.panHandlers} style={styles.rail}>
          <View
            style={[
              styles.chute,
              {
                left: (snap.aim + 0.5) * SLOT_W * sx - 11,
                backgroundColor: m.seed,
              },
            ]}
          />
        </View>
        {/* pegs — eight rows, staggered */}
        {Array.from({ length: PLINKO_ROWS }, (_, r) =>
          Array.from({ length: PLINKO_SLOTS.length - 1 }, (_, k) => (
            <View
              key={`${r}-${k}`}
              style={[
                styles.peg,
                {
                  left: (k + 1 + (r % 2 === 0 ? -0.5 : 0)) * SLOT_W * sx - 3,
                  top: ROW_Y(r) + 12,
                  backgroundColor: m.line,
                },
              ]}
            />
          )),
        )}
        {/* the ball, mid-rattle */}
        {snap.ball ? (
          <View
            style={[
              styles.ball,
              {
                left: (snap.ball.bin + 0.5) * SLOT_W * sx - 8,
                top: ROW_Y(snap.ball.row) - 4,
              },
            ]}
          />
        ) : null}
        {/* the slots */}
        <View style={styles.slots}>
          {PLINKO_SLOTS.map((value, i) => (
            <View
              key={i}
              style={[
                styles.slot,
                {
                  backgroundColor: snap.lastSlot === i ? "#F5C04A" : "rgba(0,0,0,0.06)",
                  borderColor: m.line,
                },
              ]}
            >
              <Text style={[styles.slotText, { color: value >= 100 ? "#8A5A12" : m.inkSoft }]}>{value}</Text>
            </View>
          ))}
        </View>
      </View>
      <Pressable
        onPress={drop}
        disabled={!!snap.ball || !!ending}
        accessibilityRole="button"
        accessibilityLabel="Drop a ball"
        style={({ pressed }) => [
          styles.drop,
          { backgroundColor: m.seed },
          (pressed || snap.ball) && { opacity: 0.75 },
        ]}
      >
        <Text style={styles.dropText}>{snap.ball ? "Rolling…" : `Drop · ${ballsLeft} ball${ballsLeft === 1 ? "" : "s"} left`}</Text>
      </Pressable>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Ten balls down. The board keeps the score."
          : snap.lastSlot != null
            ? `score ${score} · last ball banked ${snap.lastPoints}`
            : `score ${score} · slide the chute, then drop — edges pay, centre doesn't`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="That's the ten. Run's done."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden", position: "relative" },
  rail: { position: "absolute", top: 0, left: 0, right: 0, height: 34, zIndex: 3 },
  chute: { position: "absolute", top: 6, width: 22, height: 16, borderRadius: 4 },
  peg: { position: "absolute", width: 6, height: 6, borderRadius: 3 },
  ball: { position: "absolute", width: 16, height: 16, borderRadius: 8, backgroundColor: "#C23A28", borderWidth: 2, borderColor: "#8E2718", zIndex: 2 },
  slots: { position: "absolute", left: 4, right: 4, bottom: 6, flexDirection: "row", gap: 3 },
  slot: { flex: 1, borderWidth: 1, borderRadius: 6, paddingVertical: 6, alignItems: "center" },
  slotText: { fontSize: 10.5, fontWeight: "900" },
  drop: { marginTop: 12, borderRadius: 999, paddingVertical: 12, alignItems: "center" },
  dropText: { color: "#FFFFFF", fontSize: 14.5, fontWeight: "800" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
