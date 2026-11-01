import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BUBBLE_CELLS,
  BUBBLE_RUN_SECONDS,
  bubbleMultiplier,
  bubblePop,
  bubbleScore,
  bubbleStart,
  bubbleStep,
  type BubbleState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v400 Bubble Pop Wrap — the deliberate timed one: a sheet of
 * bubble wrap and sixty seconds. Every pop pays 2 × the chain's
 * rate (quick pops build to ×2, then ×3; a pause cools it). The
 * sheet refills in waves so the time, never the bubbles, runs out.
 */
const TICK = 100;

export function BubblePopGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<BubbleState>(bubbleStart());
  const [snap, setSnap] = useState<BubbleState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const overRef = useRef(false);

  const report = (next: BubbleState) => {
    const score = bubbleScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
    return score;
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (ending || overRef.current) return;
      const next = bubbleStep(stateRef.current, TICK / 1000);
      stateRef.current = next;
      setSnap(next);
      if (next.over) {
        overRef.current = true;
        const score = report(next);
        void (async () => {
          const receipt = onRunEnd ? await onRunEnd() : null;
          setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
        })();
      }
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const pop = (index: number) => {
    if (ending || overRef.current) return;
    const next = bubblePop(stateRef.current, index);
    if (next === stateRef.current) return;
    stateRef.current = next;
    setSnap(next);
    report(next);
  };

  const again = () => {
    stateRef.current = bubbleStart();
    reportedRef.current = 0;
    overRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const score = bubbleScore(snap);
  const secondsLeft = Math.ceil(snap.timeLeft);
  const rate = bubbleMultiplier(snap.chain);

  return (
    <View>
      <View style={[styles.clockTrack, { backgroundColor: m.tonal }]}>
        <View
          style={[
            styles.clockFill,
            {
              width: `${Math.round((snap.timeLeft / BUBBLE_RUN_SECONDS) * 100)}%`,
              backgroundColor: snap.timeLeft < 10 ? "#C0392B" : m.seed,
            },
          ]}
        />
      </View>
      <View style={[styles.sheet, { backgroundColor: "#DCE9F5", borderColor: m.line }]}>
        {Array.from({ length: BUBBLE_CELLS }, (_, i) => (
          <Pressable
            key={`${snap.waves}-${i}`}
            onPress={() => pop(i)}
            accessibilityRole="button"
            accessibilityLabel={snap.popped[i] ? "Popped bubble" : "Pop this bubble"}
            style={styles.cell}
          >
            <View
              style={[
                styles.bubble,
                snap.popped[i]
                  ? { backgroundColor: "rgba(90,120,150,0.25)", transform: [{ scale: 0.72 }] }
                  : { backgroundColor: "rgba(255,255,255,0.75)", borderColor: "rgba(90,120,150,0.45)" },
              ]}
            />
          </Pressable>
        ))}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Time. The wrap keeps the score."
          : `score ${score} · ${secondsLeft}s left · ${snap.pops} popped${rate > 1 ? ` · popping at ×${rate}` : ""}`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Sixty seconds up. That's the run."
          extraLine={`${snap.pops} bubbles popped across ${snap.waves} sheet${snap.waves === 1 ? "" : "s"}`}
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clockTrack: { marginTop: 16, height: 8, borderRadius: 4, overflow: "hidden" },
  clockFill: { height: 8, borderRadius: 4 },
  sheet: { marginTop: 10, borderRadius: 14, borderWidth: 1, padding: 8, flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "12.5%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  bubble: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5 },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
