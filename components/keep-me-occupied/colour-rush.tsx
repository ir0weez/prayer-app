import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  RUSH_COLORS,
  rushAnswer,
  rushScore,
  rushStart,
  rushTimeLimitMs,
  rushTimeout,
  type RushState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v399 Colour Rush — the Stroop trap, flat and fast. The word
 * names one colour and is printed in another; tap the INK. Right
 * pays 15, inside a second pays 5 more. A wrong tap or an empty
 * clock costs one of three lives, and the clock shrinks as you
 * climb.
 */
const TICK = 50;

export function ColourRushGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<RushState>(rushStart(Math.random));
  const [snap, setSnap] = useState<RushState>(stateRef.current);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [flash, setFlash] = useState<"correct" | "wrong" | null>(null);
  const roundStartRef = useRef(Date.now());
  const reportedRef = useRef(0);
  const overRef = useRef(false);

  const settle = (score: number) => {
    if (overRef.current) return;
    overRef.current = true;
    void (async () => {
      const receipt = onRunEnd ? await onRunEnd() : null;
      setEnding(receipt ?? { coins: 0, xp: 0, score, best: score });
    })();
  };

  // The round clock: drives the shrinking bar and the timeout.
  useEffect(() => {
    const id = setInterval(() => {
      if (ending || overRef.current) return;
      const now = Date.now();
      const ms = now - roundStartRef.current;
      setElapsed(ms);
      if (ms > rushTimeLimitMs(stateRef.current.correct)) {
        const next = rushTimeout(stateRef.current, Math.random);
        stateRef.current = next;
        setSnap(next);
        setFlash("wrong");
        roundStartRef.current = Date.now();
        if (!next.alive) settle(rushScore(next));
      }
    }, TICK);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ending]);

  const answer = (choice: number) => {
    if (ending || overRef.current) return;
    const ms = Date.now() - roundStartRef.current;
    const { state: next, result } = rushAnswer(stateRef.current, choice, ms, Math.random);
    stateRef.current = next;
    setSnap(next);
    setFlash(result === "correct" ? "correct" : "wrong");
    roundStartRef.current = Date.now();
    setElapsed(0);
    const score = rushScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
    if (!next.alive) settle(score);
  };

  const again = () => {
    stateRef.current = rushStart(Math.random);
    reportedRef.current = 0;
    overRef.current = false;
    roundStartRef.current = Date.now();
    setElapsed(0);
    setFlash(null);
    setSnap(stateRef.current);
    setEnding(null);
  };

  const score = rushScore(snap);
  const limit = rushTimeLimitMs(snap.correct);
  const timeLeft = Math.max(0, 1 - elapsed / limit);
  const ink = RUSH_COLORS[snap.round.ink];
  const word = RUSH_COLORS[snap.round.word];

  return (
    <View>
      <View style={[styles.field, { backgroundColor: m.card, borderColor: flash === "wrong" ? "#C0392B" : m.line }]}>
        <View style={styles.topRow}>
          <Text style={[styles.lives, { color: "#C0392B" }]}>
            {"♥".repeat(Math.max(0, snap.lives))}<Text style={{ color: m.line }}>{"♥".repeat(Math.max(0, 3 - snap.lives))}</Text>
          </Text>
          <Text style={[styles.count, { color: m.inkSoft }]}>{snap.correct} right</Text>
        </View>
        <Text style={[styles.word, { color: ink.hex }]}>{word.name}</Text>
        <Text style={[styles.hint, { color: m.inkSoft }]}>tap the ink, not the word</Text>
        <View style={[styles.clockTrack, { backgroundColor: m.tonal }]}>
          <View
            style={[
              styles.clockFill,
              {
                width: `${Math.round(timeLeft * 100)}%`,
                backgroundColor: timeLeft < 0.3 ? "#C0392B" : m.seed,
              },
            ]}
          />
        </View>
        <View style={styles.swatches}>
          {snap.round.choices.map((choice) => (
            <Pressable
              key={choice}
              onPress={() => answer(choice)}
              accessibilityRole="button"
              accessibilityLabel={`${RUSH_COLORS[choice].name} ink`}
              style={({ pressed }) => [
                styles.swatch,
                { backgroundColor: RUSH_COLORS[choice].hex },
                pressed && { opacity: 0.8 },
              ]}
            />
          ))}
        </View>
      </View>
      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Three lives gone. The colours keep the score."
          : `score ${score}${flash === "correct" ? " · ink!" : flash === "wrong" ? " · not that one" : ""} · the clock shrinks as you climb`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine="Out of lives. That's the run."
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 16, borderRadius: 18, borderWidth: 1.5, padding: 18, alignItems: "center" },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch", alignItems: "center" },
  lives: { fontSize: 17, letterSpacing: 2 },
  count: { fontSize: 12.5, fontWeight: "800" },
  word: { fontSize: 52, fontWeight: "900", letterSpacing: 2, marginTop: 14 },
  hint: { fontSize: 12, marginTop: 2 },
  clockTrack: { alignSelf: "stretch", height: 8, borderRadius: 4, marginTop: 16, overflow: "hidden" },
  clockFill: { height: 8, borderRadius: 4 },
  swatches: { flexDirection: "row", gap: 10, marginTop: 16 },
  swatch: { width: 60, height: 52, borderRadius: 12 },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
