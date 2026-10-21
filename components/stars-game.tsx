// Chart the Stars — Observatory mini-game.
// Untimed: each constellation first reveals itself, its stars
// lighting one by one in their true order, and then the player
// charts it back by tapping the stars in that same order. A wrong
// star only earns a gentle hint — nothing resets, nothing is lost.
// Three constellations make a round. Lines join the stars as they
// are charted, drawn on an SVG overlay over the night scene. Taps
// land on onPressIn (finger DOWN) per the timing standard, and
// state changes only on events — a reveal step, a tap, a
// constellation completing — never on frame ticks.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { CONSTELLATIONS, chartSegments, starsReward } from "@/lib/mini-games";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const REVEAL_STEP_MS = 750;
const CELEBRATE_MS = 1400;
const STAR_HIT = 34;

/** Faint background stars, fixed so the sky never reshuffles between
 *  renders: [x fraction, y fraction, radius] over the scene. */
const BACKGROUND_DOTS: Array<[number, number, number]> = [
  [0.06, 0.12, 1.4], [0.14, 0.82, 1.1], [0.24, 0.08, 1.0], [0.33, 0.9, 1.3],
  [0.42, 0.14, 1.0], [0.52, 0.84, 1.2], [0.6, 0.06, 1.1], [0.68, 0.88, 1.0],
  [0.76, 0.12, 1.3], [0.84, 0.78, 1.1], [0.92, 0.2, 1.4], [0.1, 0.44, 1.0],
  [0.9, 0.52, 1.0], [0.48, 0.46, 0.9],
];

/** A small four-point sparkle, the lit star's art. */
function Sparkle({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 0 L14.6 9.4 L24 12 L14.6 14.6 L12 24 L9.4 14.6 L0 12 L9.4 9.4 Z" fill="#FDE68A" />
    </Svg>
  );
}

type Phase = "reveal" | "chart" | "celebrate";

export function StarsGame({ accent, onComplete, onExit }: MiniGameProps) {
  const { sceneW, sceneH, ready, onLayout } = useSceneBox(1.0);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("reveal");
  const [litUpTo, setLitUpTo] = useState(0);
  const [charted, setCharted] = useState<number[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState(0);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const starsInOrderRef = useRef(0);
  const constellationsDoneRef = useRef(0);
  const chartedRef = useRef<number[]>([]);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const innerW = sceneW - 28;
  const constellation = CONSTELLATIONS[idx];

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timersRef.current.push(t);
    return t;
  }, []);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearTimers();
    setGranted(onCompleteRef.current(starsReward(starsInOrderRef.current, constellationsDoneRef.current)));
  }, [clearTimers]);

  // Reveal: light the stars one by one, 750ms apart, then hand the
  // sky over to the player to chart.
  useEffect(() => {
    if (completedRef.current) return;
    setPhase("reveal");
    setLitUpTo(0);
    setCharted([]);
    chartedRef.current = [];
    setHint(null);
    const total = CONSTELLATIONS[idx].stars.length;
    let lit = 0;
    const step = () => {
      if (completedRef.current) return;
      lit += 1;
      setLitUpTo(lit);
      if (lit < total) {
        later(step, REVEAL_STEP_MS);
      } else {
        later(() => {
          if (!completedRef.current) setPhase("chart");
        }, REVEAL_STEP_MS);
      }
    };
    later(step, REVEAL_STEP_MS);
    return clearTimers;
    // The reveal restarts per constellation only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  useEffect(() => clearTimers, [clearTimers]);

  const tapStar = (starIndex: number) => {
    if (completedRef.current || granted) return;
    if (phase !== "chart") return;
    if (chartedRef.current.includes(starIndex)) return;
    const expected = chartedRef.current.length;
    if (starIndex !== expected) {
      setHint("That one lights later in the pattern.");
      return;
    }
    const next = [...chartedRef.current, starIndex];
    chartedRef.current = next;
    setCharted(next);
    setHint(null);
    starsInOrderRef.current += 1;
    if (next.length >= constellation.stars.length) {
      constellationsDoneRef.current += 1;
      setDoneCount(constellationsDoneRef.current);
      setPhase("celebrate");
      later(() => {
        if (completedRef.current) return;
        if (idx + 1 >= CONSTELLATIONS.length) {
          finish();
        } else {
          // Advance AND reset in the same update. The reset used to
          // live only in the [idx] effect below, which runs after the
          // first render at the new index — that render still held
          // THIS constellation's finished charted list, and when this
          // constellation had more stars than the next (the 7-star
          // Net before the 6-star Crown) the line drawing reached for
          // a star that doesn't exist and took the app down.
          chartedRef.current = [];
          setCharted([]);
          setLitUpTo(0);
          setPhase("reveal");
          setIdx(idx + 1);
        }
      }, CELEBRATE_MS);
    }
  };

  if (granted) {
    const last = CONSTELLATIONS[CONSTELLATIONS.length - 1];
    return (
      <GameCard title="Chart the Stars" accent={accent} onLayout={onLayout}>
        <GameResults
          title="The chart is drawn"
          flavor={`The night's three charts are inked and drying — the last of them ${last.name}, ${last.flavor.charAt(0).toLowerCase()}${last.flavor.slice(1)}`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const caption =
    phase === "reveal"
      ? "Watch the order…"
      : phase === "chart"
        ? "Now chart it: tap the stars in the order they lit."
        : `${constellation.name} — ${constellation.flavor}`;

  return (
    <GameCard title="Chart the Stars" accent={accent} onLayout={onLayout}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Constellation {Math.min(idx + 1, CONSTELLATIONS.length)} of {CONSTELLATIONS.length}
          </Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>Charted: {doneCount}</Text>
        </View>
        <Text
          style={{
            color: phase === "celebrate" ? accent : "#57534E",
            fontSize: 13,
            fontWeight: phase === "celebrate" ? "800" : "600",
            marginTop: 8,
            minHeight: 18,
          }}
        >
          {caption}
        </Text>

        {/* the night scene */}
        <View
          style={{
            marginTop: 10,
            height: ready ? sceneH : 260,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#0B1026",
            position: "relative",
          }}
        >
          {ready && (
            <>
              {/* faint background dots + the charted lines */}
              <Svg width={innerW} height={sceneH} viewBox={`0 0 ${innerW} ${sceneH}`} style={{ position: "absolute", left: 0, top: 0 }}>
                {BACKGROUND_DOTS.map(([fx, fy, r], i) => (
                  <Circle key={i} cx={fx * innerW} cy={fy * sceneH} r={r} fill="#94A3B8" opacity={0.35} />
                ))}
                {chartSegments(constellation.stars, charted).map((seg, i) => (
                  <Line
                    key={`line-${i}`}
                    x1={seg.x1 * innerW}
                    y1={seg.y1 * sceneH}
                    x2={seg.x2 * innerW}
                    y2={seg.y2 * sceneH}
                    stroke="#FDE68A"
                    strokeWidth={1.6}
                    opacity={0.85}
                  />
                ))}
              </Svg>
              {/* the constellation stars */}
              {constellation.stars.map((star, i) => {
                const lit = phase === "reveal" ? i < litUpTo : charted.includes(i);
                const showNumber = phase === "reveal" && i < litUpTo;
                return (
                  <Pressable
                    key={i}
                    onPressIn={() => tapStar(i)}
                    style={{
                      position: "absolute",
                      left: star.x * innerW - STAR_HIT / 2,
                      top: star.y * sceneH - STAR_HIT / 2,
                      width: STAR_HIT,
                      height: STAR_HIT,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {lit ? (
                      <Sparkle size={phase === "reveal" ? 20 : 22} />
                    ) : (
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: "#475569" }} />
                    )}
                    {showNumber && (
                      <Text
                        style={{
                          position: "absolute",
                          left: STAR_HIT / 2 + 9,
                          top: 4,
                          color: "#FDE68A",
                          fontSize: 9,
                          fontWeight: "800",
                        }}
                      >
                        {i + 1}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </>
          )}
          {!ready && (
            <Text style={{ color: "#94A3B8", textAlign: "center", marginTop: 110, fontSize: 13 }}>
              Opening the dome…
            </Text>
          )}
        </View>

        <View style={{ height: 22, marginTop: 9, alignItems: "center", justifyContent: "center" }}>
          {hint && phase === "chart" && (
            <Text style={{ color: "#B45309", fontWeight: "700", fontSize: 13 }}>{hint}</Text>
          )}
        </View>
        <Pressable onPressIn={onExit} style={{ alignSelf: "center", paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
