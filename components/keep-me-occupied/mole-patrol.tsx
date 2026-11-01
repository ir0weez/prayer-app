import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  MOLE_RUN_SECONDS,
  moleScore,
  moleStart,
  moleStep,
  moleTap,
  type MoleState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v399 Mole Patrol — pixel garden beds, sixty seconds on the
 * clock. Moles pop and duck; tap one for 10 plus the chain, the
 * rare golden for 100. The flower is a decoy — tapping it (or an
 * empty bed) only breaks your chain. Nothing here costs a life;
 * only the clock ends the run.
 */
const TICK = 100;

export function MolePatrolGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<MoleState>(moleStart());
  const [snap, setSnap] = useState<MoleState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const overRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (ending || overRef.current) return;
      const next = moleStep(stateRef.current, TICK / 1000, Math.random);
      stateRef.current = next;
      setSnap(next);
      if (next.over) {
        overRef.current = true;
        const score = moleScore(next);
        void (async () => {
          const receipt = onRunEnd ? await onRunEnd() : null;
          setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
        })();
      }
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const tapBed = (index: number) => {
    if (ending || overRef.current) return;
    const next = moleTap(stateRef.current, index);
    stateRef.current = next;
    setSnap(next);
    const score = moleScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
  };

  const again = () => {
    stateRef.current = moleStart();
    reportedRef.current = 0;
    overRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const score = moleScore(snap);
  const secondsLeft = Math.ceil(snap.timeLeft);

  return (
    <View>
      <View style={[styles.clockTrack, { backgroundColor: m.tonal }]}>
        <View
          style={[
            styles.clockFill,
            {
              width: `${Math.round((snap.timeLeft / MOLE_RUN_SECONDS) * 100)}%`,
              backgroundColor: snap.timeLeft < 10 ? "#C0392B" : m.seed,
            },
          ]}
        />
      </View>
      <View style={[styles.field, { backgroundColor: m.tonal, borderColor: m.line }]}>
        {snap.holes.map((hole, i) => (
          <Pressable
            key={i}
            onPress={() => tapBed(i)}
            accessibilityRole="button"
            accessibilityLabel={
              hole?.kind === "mole" ? "Mole — tap it"
                : hole?.kind === "golden" ? "Golden mole — tap it fast"
                : hole?.kind === "flower" ? "A flower — leave it"
                : "Empty bed"
            }
            style={[styles.bed, { backgroundColor: "#6B4A2E", borderColor: m.line }]}
          >
            {hole?.kind === "mole" ? (
              <View style={styles.mole}>
                <View style={styles.moleNose} />
              </View>
            ) : hole?.kind === "golden" ? (
              <View style={[styles.mole, { backgroundColor: "#E9B93B" }]}>
                <View style={[styles.moleNose, { backgroundColor: "#FFF3C4" }]} />
              </View>
            ) : hole?.kind === "flower" ? (
              <View style={styles.flower}>
                <View style={styles.petal} />
                <View style={styles.stem} />
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Time. The beds keep the score."
          : `score ${score} · ${secondsLeft}s left${snap.chain > 1 ? ` · chain ×${snap.chain}` : ""} · moles pay, gold pays big, flowers break the chain`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Sixty seconds up. That's the run."
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
  field: { marginTop: 10, borderRadius: 14, borderWidth: 1, padding: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bed: { width: "31.5%", aspectRatio: 1.15, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  mole: { width: 40, height: 34, borderRadius: 18, backgroundColor: "#8A6242", alignItems: "center", justifyContent: "center" },
  moleNose: { width: 12, height: 9, borderRadius: 5, backgroundColor: "#E8A0A8", marginTop: 8 },
  flower: { alignItems: "center" },
  petal: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#E87FA1" },
  stem: { width: 4, height: 14, backgroundColor: "#4E7A3A", marginTop: -2 },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
