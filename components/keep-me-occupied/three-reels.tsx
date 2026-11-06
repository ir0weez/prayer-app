import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  REEL_MARKS,
  REELS_PULLS_PER_RUN,
  reelsDraw,
  reelsScore,
  reelsSettlePull,
  reelsStart,
  type ReelMark,
  type ReelsState,
} from "@/lib/keep-me-occupied";
import type { KeepMeOccupiedMaterialFamily } from "@/lib/keep-me-occupied-material";
import { RunEndCard, type RunEndResult, type RunGameHandlers } from "./run-end-card";

/**
 * v448 Three Reels — pure chance, a three-pull run: pull, the
 * reels cycle and stop left to right, stepped and honest. Any
 * pair pays 30; triples pay by the mark — hearts 150, stars 250,
 * bells 400, and three coins the 1,000 jackpot. The marks a pull
 * stops on are drawn before it spins (reelsDraw); the spin is
 * just the telling. After the third pull the run settles through
 * the shared run-end path like every other run game.
 */
const TICK_MS = 90;
/** Ticks at which each reel stops — staggered, left to right (~0.8s all told). */
const STOP_TICKS = [4, 6, 8];
const REST_FACE: ReelMark[] = ["coin", "heart", "star"];

export function ThreeReelsGame({ m, onScore, onRunEnd, onRunExit }: { m: KeepMeOccupiedMaterialFamily } & RunGameHandlers) {
  const stateRef = useRef<ReelsState>(reelsStart());
  const [snap, setSnap] = useState<ReelsState>(stateRef.current);
  const [display, setDisplay] = useState<ReelMark[]>(REST_FACE);
  const [spinning, setSpinning] = useState(false);
  const [ending, setEnding] = useState<RunEndResult | null>(null);
  const reportedRef = useRef(0);
  const spinRef = useRef<{ final: ReelMark[]; tick: number; timer: ReturnType<typeof setInterval> | null }>({
    final: REST_FACE,
    tick: 0,
    timer: null,
  });

  useEffect(() => {
    return () => {
      if (spinRef.current.timer) clearInterval(spinRef.current.timer);
    };
  }, []);

  const report = (next: ReelsState) => {
    const score = reelsScore(next);
    if (score > reportedRef.current) {
      onScore?.(score - reportedRef.current);
      reportedRef.current = score;
    }
  };

  const settle = (marks: ReelMark[]) => {
    const next = reelsSettlePull(stateRef.current, marks);
    stateRef.current = next;
    setSnap(next);
    report(next);
    if (next.over) {
      void (async () => {
        const receipt = onRunEnd ? await onRunEnd() : null;
        setEnding(receipt ?? { coins: 0, xp: 0, score: reelsScore(next), best: reelsScore(next) });
      })();
    }
  };

  const pull = () => {
    if (spinning || ending || stateRef.current.over) return;
    const final = reelsDraw(Math.random);
    spinRef.current.final = final;
    spinRef.current.tick = 0;
    setSpinning(true);
    spinRef.current.timer = setInterval(() => {
      const spin = spinRef.current;
      spin.tick += 1;
      const tick = spin.tick;
      setDisplay((current) =>
        current.map((mark, i) =>
          tick >= STOP_TICKS[i]
            ? spin.final[i]
            : REEL_MARKS[Math.min(REEL_MARKS.length - 1, Math.floor(Math.random() * REEL_MARKS.length))],
        ),
      );
      if (tick >= STOP_TICKS[STOP_TICKS.length - 1]) {
        if (spin.timer) clearInterval(spin.timer);
        spin.timer = null;
        setSpinning(false);
        setDisplay(spin.final);
        settle(spin.final);
      }
    }, TICK_MS);
  };

  const again = () => {
    stateRef.current = reelsStart();
    reportedRef.current = 0;
    setSnap(stateRef.current);
    setDisplay(REST_FACE);
    setEnding(null);
  };

  const pullsLeft = REELS_PULLS_PER_RUN - snap.pulls;
  const score = reelsScore(snap);

  return (
    <View>
      <View style={[styles.card, { backgroundColor: m.card, borderColor: m.line }]}>
        <View style={styles.windows}>
          {display.map((mark, i) => (
            <View key={i} style={[styles.window, { backgroundColor: m.tonal, borderColor: m.line }]}>
              <ReelMarkView mark={mark} />
            </View>
          ))}
        </View>
        <Text style={[styles.payline, { color: m.inkSoft }]}>
          Pair 30 · Hearts 150 · Stars 250 · Bells 400 · Coins 1,000
        </Text>
      </View>

      {!ending ? (
        <Pressable
          onPress={pull}
          disabled={spinning || snap.over}
          accessibilityRole="button"
          accessibilityLabel="Pull the reels"
          style={({ pressed }) => [
            styles.pull,
            { backgroundColor: m.seed },
            (pressed || spinning) && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.pullText}>
            {spinning ? "Spinning…" : `Pull the reels · ${pullsLeft} left`}
          </Text>
        </Pressable>
      ) : null}

      <Text style={[styles.message, { color: m.inkSoft }]}>
        {ending
          ? "Three pulls spent. The machine keeps the score."
          : snap.lastMarks
            ? `score ${score} · pull ${snap.pulls} of ${REELS_PULLS_PER_RUN} · ${
                snap.lastPayout > 0 ? `last pull paid ${snap.lastPayout}` : "last pull paid nothing"
              }`
            : `score ${score} · three pulls a run — three of a kind pays, three coins pays most`}
      </Text>
      {ending ? (
        <RunEndCard
          m={m}
          score={ending.score}
          best={ending.best}
          coins={ending.coins}
          xp={ending.xp}
          overLine={snap.lastPayout === 1000 ? "Three coins — the jackpot. That's the run." : "Three pulls. That's the run."}
          extraLine={snap.jackpot && snap.lastPayout !== 1000 ? "Three coins landed in there this run — jackpot, 1,000." : undefined}
          onAgain={again}
          onGood={() => onRunExit?.()}
        />
      ) : null}
    </View>
  );
}

function ReelMarkView({ mark }: { mark: ReelMark }) {
  if (mark === "coin") {
    return (
      <View style={styles.coinDisc}>
        <View style={styles.coinInner} />
      </View>
    );
  }
  if (mark === "heart") return <MaterialIcons name="favorite" size={42} color="#C0392B" />;
  if (mark === "star") return <MaterialIcons name="star" size={46} color="#D9930D" />;
  return <MaterialIcons name="notifications" size={42} color="#7C4DBD" />;
}

const styles = StyleSheet.create({
  card: { marginTop: 16, borderWidth: 1, borderRadius: 22, padding: 16 },
  windows: { flexDirection: "row", gap: 10 },
  window: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  coinDisc: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F5B921",
    borderWidth: 2.5,
    borderColor: "#D9930D",
    alignItems: "center",
    justifyContent: "center",
  },
  coinInner: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: "#B97E0A" },
  payline: { fontSize: 12.5, fontWeight: "700", marginTop: 12, textAlign: "center" },
  pull: { marginTop: 12, borderRadius: 999, paddingVertical: 13, alignItems: "center" },
  pullText: { color: "#FFFFFF", fontSize: 15.5, fontWeight: "800" },
  message: { fontSize: 12.5, marginTop: 12, lineHeight: 18 },
});
