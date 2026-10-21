// Token Toss — the Pizza Place arcade game (12th mini-game).
// A power marker sweeps a sine arc; tap TOSS to throw a token at the
// ring board. Dead-center power lands in the bullseye; weak tosses fall
// short, strong ones sail long. Five tokens a play, XP-weighted payout —
// the arcade pays in experience, with a few coins for the cup.
// The flight is one sine-eased Animated value, positions derived,
// never stacked.
//
// TIMING STANDARD (Jonathan's standing rule — every timing game in
// this app must meet it; the Steady Trim is the reference build):
//   1. Capture input on onPressIn (finger DOWN), never onPress.
//      onPress fires on finger RELEASE — the press-down → release gap
//      runs 60–120 ms, which at sweep speed is several times the
//      scoring window: what gets scored is not what the player saw.
//   2. Run every sweep/gauge on the NATIVE driver (Animated with
//      useNativeDriver) and read the value back via stopAnimation's
//      callback — the exact frozen value the marker stopped at.
//   3. No per-frame React state in the game loop: no setInterval, no
//      setState per tick. The marker moves on the native side; React
//      renders on events (a toss, a landing), not on frames.
// This game originally broke all three (a 40 ms JS interval drove a
// React state update — a full scene re-render 25×/second — and the
// toss was taken on release), which is why it felt laggy and slow
// next to the Steady Trim. Rebuilt to the standard; the sweep curve,
// ring values, and payout math are byte-for-byte the old ones.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Svg, { Circle, Polygon, Rect } from "react-native-svg";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";
import { tokenScoreForPower, tokenTossReward } from "@/lib/mini-games";

const TOKENS_PER_PLAY = 5;
const SWEEP_MS = 1500; // one full back-and-forth of the power marker
const SWEEP_LEG_MS = SWEEP_MS / 2; // each direction of the sweep

type LandedToken = { id: number; dx: number; dy: number; score: number };
type FlyingToken = { dx: number; dy: number; score: number; travelY: number; shiftX: number };

/** Easing.inOut(Easing.sin), duplicated so a position can be computed
 *  analytically from the clock — only used as a fallback if the native
 *  stopAnimation callback somehow never answers (see handleToss).
 *  Same helper the Steady Trim ships. */
function inOutSin(t: number): number {
  return t < 0.5 ? (1 - Math.cos(Math.PI * t)) / 2 : 1 - (1 - Math.cos(Math.PI * (1 - t))) / 2;
}

/** The sweep's logical position (0..1) at an instant, given when the
 *  current sweep started: a sine-eased ping-pong, SWEEP_MS per full
 *  back-and-forth. Identical curve to the original tick-driven sweep,
 *  (1 − cos(2π·e/SWEEP_MS)) / 2 — verified numerically to ~1e-16. */
export function tokenTossSweepPositionAt(startMs: number, nowMs: number): number {
  const t = (((nowMs - startMs) % SWEEP_MS) + SWEEP_MS) % SWEEP_MS;
  if (t <= SWEEP_LEG_MS) return inOutSin(t / SWEEP_LEG_MS);
  return 1 - inOutSin((t - SWEEP_LEG_MS) / SWEEP_LEG_MS);
}

function TokenDisc({ size = 26, dim = false }: { size?: number; dim?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Circle cx={15} cy={15} r={13} fill={dim ? "#8A6D2F" : "#F5C542"} stroke="#B8860B" strokeWidth={2} />
      <Polygon
        points="15,8.5 17.2,13.2 22.4,13.6 18.4,17.2 19.6,22.3 15,19.6 10.4,22.3 11.6,17.2 7.6,13.6 12.8,13.2"
        fill={dim ? "#6E5626" : "#B8860B"}
        opacity={0.85}
      />
    </Svg>
  );
}

export function TokenTossGame({ accent, onComplete, onExit }: MiniGameProps) {
  const { sceneW, sceneH, ready, onLayout } = useSceneBox(0.92);
  const [landed, setLanded] = useState<LandedToken[]>([]);
  const [flying, setFlying] = useState<FlyingToken | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);
  const [gaugeW, setGaugeW] = useState(0);

  const landedRef = useRef<LandedToken[]>([]);
  const flyingRef = useRef(false);
  const samplingRef = useRef(false);
  const completedRef = useRef(false);
  // When the current sweep (re)started — for the analytic fallback.
  const sweepStartRef = useRef(0);
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);
  const fallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sweep = useRef(new Animated.Value(0)).current;
  const flight = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const innerW = sceneW - 28;
  const boardCx = innerW / 2;
  const boardCy = sceneH * 0.34;
  const boardR = Math.min(innerW * 0.3, sceneH * 0.26);
  const launchY = sceneH - 56;

  const totalScore = landed.reduce((s, t) => s + t.score, 0);
  const tokensLeft = TOKENS_PER_PLAY - landed.length - (flying ? 1 : 0);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const score = landedRef.current.reduce((s, t) => s + t.score, 0);
    setGranted(onCompleteRef.current(tokenTossReward(score)));
  }, []);

  const stopSweepLoop = useCallback(() => {
    loopRef.current?.stop();
    loopRef.current = null;
  }, []);

  // The sweeping power marker — a native-driver sine ping-pong loop.
  // No state, no interval: the marker's transform is the animation.
  const startSweep = useCallback(() => {
    stopSweepLoop();
    sweepStartRef.current = Date.now();
    sweep.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: SWEEP_LEG_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: SWEEP_LEG_MS, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loopRef.current = loop;
    loop.start();
  }, [stopSweepLoop, sweep]);

  useEffect(() => {
    if (!ready || granted) return;
    startSweep();
    return () => {
      stopSweepLoop();
      if (fallbackRef.current) {
        clearTimeout(fallbackRef.current);
        fallbackRef.current = null;
      }
    };
  }, [ready, granted, startSweep, stopSweepLoop]);

  /** Throw one token at power `p` (0..1, sampled at finger-down). */
  const launch = useCallback(
    (pRaw: number) => {
      const p = Math.min(1, Math.max(0, pRaw));
      const score = tokenScoreForPower(p);
      const d = Math.abs(p - 0.5);
      // Landing spot: distance from center grows with the miss; weak
      // tosses (p < 0.5) fall below center, strong ones sail above it.
      const rFrac = d <= 0.3 ? (d / 0.3) * 0.92 : 1.12;
      const dy = (p < 0.5 ? 1 : -1) * rFrac * boardR;
      const dx = (Math.random() - 0.5) * boardR * 0.36;
      const landingTop = boardCy + dy;
      flyingRef.current = true;
      setFlying({ dx, dy, score, travelY: landingTop - launchY, shiftX: dx });
      flight.setValue(0);
      Animated.timing(flight, {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }).start(() => {
        const token: LandedToken = { id: landedRef.current.length + 1, dx, dy, score };
        landedRef.current = [...landedRef.current, token];
        setLanded(landedRef.current);
        setLastScore(score);
        setFlying(null);
        flyingRef.current = false;
        if (landedRef.current.length >= TOKENS_PER_PLAY) {
          setTimeout(finish, 650);
        } else {
          startSweep();
        }
      });
    },
    [boardCy, boardR, launchY, flight, finish, startSweep]
  );

  const handleToss = useCallback(() => {
    if (!ready || flyingRef.current || samplingRef.current || completedRef.current || granted) return;
    if (landedRef.current.length >= TOKENS_PER_PLAY) return;
    samplingRef.current = true;
    // Stop the loop FIRST so the sequence can't roll into its next
    // leg, then read the frozen power back from the native side: the
    // callback receives the exact value the marker stopped at, so
    // what the player saw at finger-down is what gets tossed.
    stopSweepLoop();
    let launched = false;
    const launchOnce = (pos: number) => {
      if (launched) return;
      launched = true;
      samplingRef.current = false;
      if (fallbackRef.current) {
        clearTimeout(fallbackRef.current);
        fallbackRef.current = null;
      }
      launch(pos);
    };
    // Insurance only: if the native callback never answers, fall back
    // to the analytic position from the sweep's start clock so a toss
    // can never soft-lock waiting on a callback.
    fallbackRef.current = setTimeout(() => {
      launchOnce(tokenTossSweepPositionAt(sweepStartRef.current, Date.now()));
    }, 300);
    sweep.stopAnimation((value) => launchOnce(value));
  }, [ready, granted, launch, stopSweepLoop, sweep]);

  if (granted) {
    return (
      <GameCard title="Token Toss" accent={accent} onLayout={onLayout}>
        <GameResults
          title="The machine goes quiet"
          flavor={
            totalScore >= 200
              ? `${totalScore} points — the prize counter is nervous. Dead-eye tossing.`
              : totalScore >= 100
                ? `${totalScore} points. The bullseye knows your name now.`
                : totalScore > 0
                  ? `${totalScore} points. The rings reward a gentle hand — dead center is a whisper, not a shove.`
                  : "Not a ring this time. Dead center lives right in the middle of the sweep — softer than you'd think."
          }
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  // Marker CENTER tracks the logical sweep position across the gauge:
  // base left -2 (half the 4px marker) + translateX of sweep × width.
  const markerX = sweep.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, gaugeW)] });

  return (
    <GameCard title="Token Toss" accent={accent} onLayout={onLayout}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Score: {totalScore}
            {lastScore !== null && landed.length > 0 ? `  ·  last +${lastScore}` : ""}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700", marginRight: 6 }}>Tokens:</Text>
            {Array.from({ length: TOKENS_PER_PLAY }).map((_, i) => (
              <View key={i} style={{ marginHorizontal: 1.5, opacity: i < tokensLeft ? 1 : 0.18 }}>
                <TokenDisc size={16} />
              </View>
            ))}
          </View>
        </View>

        {/* the arcade scene */}
        <View
          style={{
            marginTop: 12,
            height: ready ? sceneH : 240,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#22103A",
            position: "relative",
          }}
        >
          {ready && (
            <Svg width={innerW} height={sceneH} viewBox={`0 0 ${innerW} ${sceneH}`}>
              {/* wild party carpet */}
              {[
                [0.08, 0.1, "#2EC4B6"], [0.85, 0.08, "#FF5A7A"], [0.16, 0.86, "#FFD23F"],
                [0.9, 0.8, "#2EC4B6"], [0.5, 0.06, "#FFD23F"], [0.68, 0.9, "#FF5A7A"],
                [0.3, 0.93, "#2EC4B6"], [0.95, 0.45, "#FFD23F"], [0.04, 0.5, "#FF5A7A"],
              ].map(([fx, fy, c], i) => (
                <Circle key={i} cx={(fx as number) * innerW} cy={(fy as number) * sceneH} r={5} fill={c as string} opacity={0.35} />
              ))}
              {/* the ring board */}
              <Circle cx={boardCx} cy={boardCy} r={boardR + 10} fill="#17102B" stroke="#5E4390" strokeWidth={3} />
              <Circle cx={boardCx} cy={boardCy} r={boardR} fill="#F5F0E8" />
              <Circle cx={boardCx} cy={boardCy} r={boardR * 0.92} fill="#2EC4B6" />
              <Circle cx={boardCx} cy={boardCy} r={boardR * 0.62} fill="#F5F0E8" />
              <Circle cx={boardCx} cy={boardCy} r={boardR * 0.52} fill="#FF5A7A" />
              <Circle cx={boardCx} cy={boardCy} r={boardR * 0.24} fill="#F5F0E8" />
              <Circle cx={boardCx} cy={boardCy} r={boardR * 0.17} fill="#FFD23F" />
              {/* ring point labels */}
              {/* the launch ramp */}
              <Rect x={boardCx - 34} y={launchY + 18} width={68} height={10} rx={5} fill="#5E4390" />
              <Rect x={boardCx - 3} y={launchY - 6} width={6} height={26} fill="#3B2560" />
            </Svg>
          )}
          {/* ring labels */}
          {ready && (
            <>
              <Text style={{ position: "absolute", left: boardCx + boardR * 0.68, top: boardCy - boardR - 4, color: "#B9A3D9", fontSize: 10, fontWeight: "800" }}>10</Text>
              <Text style={{ position: "absolute", left: boardCx + boardR * 0.4, top: boardCy - boardR * 0.62, color: "#FFE3EC", fontSize: 10, fontWeight: "800" }}>25</Text>
              <Text style={{ position: "absolute", left: boardCx - 8, top: boardCy - 8, color: "#7A5410", fontSize: 11, fontWeight: "900" }}>50</Text>
            </>
          )}
          {/* landed tokens */}
          {ready &&
            landed.map((t) => (
              <View key={t.id} pointerEvents="none" style={{ position: "absolute", left: boardCx + t.dx - 11, top: boardCy + t.dy - 11 }}>
                <TokenDisc size={22} />
              </View>
            ))}
          {/* the flying token */}
          {ready && flying && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: boardCx - 13,
                top: launchY - 13,
                transform: [
                  { translateX: flight.interpolate({ inputRange: [0, 1], outputRange: [0, flying.shiftX] }) },
                  { translateY: flight.interpolate({ inputRange: [0, 1], outputRange: [0, flying.travelY] }) },
                  { scale: flight.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] }) },
                ],
              }}
            >
              <TokenDisc size={26} />
            </Animated.View>
          )}
          {!ready && (
            <Text style={{ color: "#B9A3D9", textAlign: "center", marginTop: 100, fontSize: 13 }}>Feeding the machine its tokens…</Text>
          )}
        </View>

        {/* the power gauge */}
        <View
          style={{ marginTop: 14 }}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            setGaugeW((prev) => (prev === w ? prev : w));
          }}
        >
          <View style={{ height: 16, borderRadius: 8, backgroundColor: "#E7E0F2", overflow: "hidden", flexDirection: "row" }}>
            <View style={{ flex: 20, backgroundColor: "#C9BEE0" }} />
            <View style={{ flex: 14, backgroundColor: "#2EC4B6" }} />
            <View style={{ flex: 10, backgroundColor: "#FF5A7A" }} />
            <View style={{ flex: 12, backgroundColor: "#FFD23F" }} />
            <View style={{ flex: 10, backgroundColor: "#FF5A7A" }} />
            <View style={{ flex: 14, backgroundColor: "#2EC4B6" }} />
            <View style={{ flex: 20, backgroundColor: "#C9BEE0" }} />
          </View>
          {ready && gaugeW > 0 && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: -2,
                top: -4,
                width: 4,
                height: 24,
                borderRadius: 2,
                backgroundColor: "#1C1917",
                transform: [{ translateX: markerX }],
              }}
            />
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ color: "#A08B7A", fontSize: 10, fontWeight: "700" }}>TOO SOFT</Text>
            <Text style={{ color: "#A08B7A", fontSize: 10, fontWeight: "700" }}>DEAD CENTER</Text>
            <Text style={{ color: "#A08B7A", fontSize: 10, fontWeight: "700" }}>TOO STRONG</Text>
          </View>
        </View>

        <Pressable
          onPressIn={handleToss}
          disabled={!!flying || tokensLeft <= 0}
          style={{
            marginTop: 12,
            alignSelf: "center",
            backgroundColor: accent,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 44,
            opacity: flying || tokensLeft <= 0 ? 0.5 : 1,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 16 }}>TOSS</Text>
        </Pressable>
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Watch the marker sweep. Toss as it crosses the gold — soft falls short, strong sails long.
        </Text>
        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 4, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
