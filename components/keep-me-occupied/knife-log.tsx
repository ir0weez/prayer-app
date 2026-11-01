import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  knifeScore,
  knifeStageConfig,
  knifeStart,
  knifeStep,
  knifeThrow,
  type KnifeState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v400 Knife Log — pixel-wood workshop: a spinning log, knives
 * thrown from below on a tap. Stick the stage quota to advance;
 * steel on steel (within a whisker of a stuck knife) ends the
 * run. Stages spin faster, flip direction, and open with more
 * knives already in the wood.
 */
const TICK = 33;
const FIELD = 300;
const LOG_R = 92;
const CENTER = FIELD / 2;

export function KnifeLogGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<KnifeState>(knifeStart(Math.random));
  const [snap, setSnap] = useState<KnifeState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const overRef = useRef(false);

  const report = (next: KnifeState) => {
    const score = knifeScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
    return score;
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (ending || overRef.current) return;
      const next = knifeStep(stateRef.current, TICK / 1000);
      stateRef.current = next;
      setSnap(next);
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const throwKnife = () => {
    if (ending || overRef.current) return;
    const next = knifeThrow(stateRef.current, Math.random);
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

  const again = () => {
    stateRef.current = knifeStart(Math.random);
    reportedRef.current = 0;
    overRef.current = false;
    setSnap(stateRef.current);
    setEnding(null);
  };

  const config = knifeStageConfig(snap.stage);
  const score = knifeScore(snap);
  // A stuck knife's screen spot: its log-local angle turned by the
  // log's live rotation (y-up convention, matching the lib).
  const knifeAt = (local: number) => {
    const rad = ((local + snap.angle) * Math.PI) / 180;
    return {
      x: CENTER + LOG_R * Math.cos(rad),
      y: CENTER - LOG_R * Math.sin(rad),
      deg: -(local + snap.angle) + 90,
    };
  };

  return (
    <View>
      <Pressable
        onPress={throwKnife}
        accessibilityRole="button"
        accessibilityLabel="Throw a knife"
        style={[styles.field, { backgroundColor: "#3A2A1C", borderColor: m.line, width: FIELD, height: FIELD }]}
      >
        <View style={styles.log}>
          {snap.stuck.map((local, i) => {
            const spot = knifeAt(local);
            return (
              <View
                key={i}
                style={[
                  styles.knife,
                  {
                    left: spot.x - 3,
                    top: spot.y - 13,
                    transform: [{ rotate: `${spot.deg}deg` }],
                  },
                ]}
              />
            );
          })}
          <View style={styles.logCore} />
        </View>
        <View style={styles.throwPoint} />
      </Pressable>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Steel met steel. The log keeps the score."
          : `score ${score} · stage ${snap.stage} · stuck ${snap.thrownThisStage}/${config.quota} · tap the log to throw`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Clang — that's a stuck knife's spot. Run's done."
          extraLine={`Stages cleared: ${snap.stagesCleared} · knives stuck: ${snap.stuckTotal}`}
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 14, borderWidth: 1, alignSelf: "center", position: "relative", overflow: "hidden" },
  log: {
    position: "absolute",
    left: CENTER - LOG_R,
    top: CENTER - LOG_R,
    width: LOG_R * 2,
    height: LOG_R * 2,
    borderRadius: LOG_R,
    backgroundColor: "#8A6242",
    borderWidth: 6,
    borderColor: "#6B4A2E",
  },
  logCore: {
    position: "absolute",
    left: LOG_R - 16,
    top: LOG_R - 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#A97C50",
    borderWidth: 3,
    borderColor: "#6B4A2E",
  },
  knife: { position: "absolute", width: 6, height: 26, borderRadius: 3, backgroundColor: "#D8DEE6", borderWidth: 1, borderColor: "#8A94A6" },
  throwPoint: {
    position: "absolute",
    left: CENTER - 5,
    top: CENTER + LOG_R + 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#F5C04A",
  },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
