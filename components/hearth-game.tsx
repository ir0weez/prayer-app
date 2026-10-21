// Hearth Keeper — Hero's House mini-game.
// Sixty cozy seconds of keeping the fire: warmth drains away
// linearly and every log stoked puts some back. Now and then the
// kettle sings or the bread is ready — catch those small house
// moments in time and they warm the room too.
//
// PERFORMANCE (the timing standard, same as the Steady Trim):
// the warmth drain runs as ONE native-driver Animated.timing of
// a single value that only ever drives scale and opacity (flame
// scale, glow opacity, the warmth bar's scaleX) — all native-
// eligible, so useNativeDriver stays true. Nothing ticks React
// state per frame: the accounting lives in refs, settled on
// EVENTS (a stoke, a moment caught, the finish) by trapezoid —
// the exact integral of a linear drain. At each event the drain
// is stopped and its value read back through stopAnimation's
// callback, the clock settles the integral, the gain is added,
// and a fresh drain starts from the settled warmth. The one
// per-second timeout chain below is display-only (the clock
// readout), chained with setTimeout — this file has no interval
// timers at all. Input lands on onPressIn, finger DOWN.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import { hearthReward } from "@/lib/mini-games";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const DURATION_S = 60;
const START_WARMTH = 80;
const DRAIN_PER_SEC = 1.5;
const STOKE_GAIN = 14;
const MOMENT_GAIN = 6;
const STOKE_COOLDOWN_MS = 500;
const MOMENT_WINDOW_MS = 5000;

type MomentKind = "kettle" | "bread";
type Moment = { kind: MomentKind } | null;

export function HearthGame({ accent, onComplete, onExit }: MiniGameProps) {
  const { sceneW, sceneH, ready, onLayout } = useSceneBox(0.86);
  const [secondsLeft, setSecondsLeft] = useState(DURATION_S);
  const [moments, setMoments] = useState(0);
  const [moment, setMoment] = useState<Moment>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [warmthDisplay, setWarmthDisplay] = useState(START_WARMTH);
  const [fireOut, setFireOut] = useState(false);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const warmthAnim = useRef(new Animated.Value(START_WARMTH)).current;
  const flicker = useRef(new Animated.Value(0)).current;
  const warmthRef = useRef(START_WARMTH);
  const lastEventRef = useRef(0);
  const integralRef = useRef(0);
  const momentsRef = useRef(0);
  const lastStokeRef = useRef(0);
  const momentRef = useRef<Moment>(null);
  const drainRef = useRef<Animated.CompositeAnimation | null>(null);
  const flickerLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const endTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const momentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const momentExpiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stokeFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const momentFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const innerW = sceneW - 28;

  /** Settle the accounting at `now`: advance the linear drain from
   *  the last settled warmth and add the trapezoid (the exact
   *  integral of a linear segment) to the warmth-seconds total. */
  const settle = useCallback((now: number) => {
    const last = lastEventRef.current;
    if (!last) {
      lastEventRef.current = now;
      return;
    }
    const dt = Math.max(0, (now - last) / 1000);
    lastEventRef.current = now;
    if (dt <= 0) return;
    const w0 = warmthRef.current;
    const w1 = Math.max(0, w0 - DRAIN_PER_SEC * dt);
    integralRef.current += ((w0 + w1) / 2) * dt;
    warmthRef.current = w1;
  }, []);

  const clearTimers = useCallback(() => {
    if (endTimerRef.current) clearTimeout(endTimerRef.current);
    if (displayTimerRef.current) clearTimeout(displayTimerRef.current);
    if (momentTimerRef.current) clearTimeout(momentTimerRef.current);
    if (momentExpiryRef.current) clearTimeout(momentExpiryRef.current);
    if (stokeFallbackRef.current) clearTimeout(stokeFallbackRef.current);
    if (momentFallbackRef.current) clearTimeout(momentFallbackRef.current);
    endTimerRef.current = null;
    displayTimerRef.current = null;
    momentTimerRef.current = null;
    momentExpiryRef.current = null;
    stokeFallbackRef.current = null;
    momentFallbackRef.current = null;
  }, []);

  const finish = useCallback(
    (wentOut: boolean) => {
      if (completedRef.current) return;
      completedRef.current = true;
      settle(Date.now());
      clearTimers();
      drainRef.current?.stop();
      drainRef.current = null;
      setFireOut(wentOut);
      const warmthFrac = integralRef.current / (DURATION_S * 100);
      setGranted(onCompleteRef.current(hearthReward(warmthFrac, momentsRef.current)));
    },
    [clearTimers, settle]
  );

  /** (Re)start the linear drain from the settled warmth. If the
   *  animation runs to completion the fire has faded to embers —
   *  the round ends early and gently. */
  const startDrain = useCallback(() => {
    drainRef.current?.stop();
    drainRef.current = null;
    warmthAnim.setValue(warmthRef.current);
    if (warmthRef.current <= 0) return;
    const anim = Animated.timing(warmthAnim, {
      toValue: 0,
      duration: (warmthRef.current / DRAIN_PER_SEC) * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    drainRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !completedRef.current) finish(true);
    });
  }, [finish, warmthAnim]);

  // --- the kettle / bread moments -------------------------------------
  // A chain of timeouts: the first kettle moment lands 10–18s in,
  // then the moments alternate bread / kettle every 12–20s. Each
  // moment stays live for 5s, then clears quietly — no penalty.
  const startMomentRef = useRef<(kind: MomentKind) => void>(() => {});
  const scheduleNextMoment = useCallback((kind: MomentKind, delayMs: number) => {
    if (momentTimerRef.current) clearTimeout(momentTimerRef.current);
    momentTimerRef.current = setTimeout(() => {
      momentTimerRef.current = null;
      startMomentRef.current(kind);
    }, delayMs);
  }, []);
  startMomentRef.current = (kind: MomentKind) => {
    if (completedRef.current) return;
    momentRef.current = { kind };
    setMoment({ kind });
    if (momentExpiryRef.current) clearTimeout(momentExpiryRef.current);
    momentExpiryRef.current = setTimeout(() => {
      momentExpiryRef.current = null;
      momentRef.current = null;
      setMoment(null);
    }, MOMENT_WINDOW_MS);
    scheduleNextMoment(kind === "kettle" ? "bread" : "kettle", 12000 + Math.random() * 8000);
  };

  // --- session start ----------------------------------------------------
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const now = Date.now();
    lastEventRef.current = now;
    warmthRef.current = START_WARMTH;
    warmthAnim.setValue(START_WARMTH);
    setWarmthDisplay(START_WARMTH);
    startDrain();
    // The flame's inner flicker: a native sine loop, two uneven legs.
    flicker.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1, duration: 160, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0, duration: 210, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    flickerLoopRef.current = loop;
    loop.start();
    endTimerRef.current = setTimeout(() => finish(false), DURATION_S * 1000);
    // Display-only clock: a chained one-second timeout.
    const tick = () => {
      const remain = Math.max(0, Math.ceil((now + DURATION_S * 1000 - Date.now()) / 1000));
      setSecondsLeft(remain);
      if (remain > 0 && !completedRef.current) {
        displayTimerRef.current = setTimeout(tick, 1000);
      }
    };
    displayTimerRef.current = setTimeout(tick, 1000);
    scheduleNextMoment("kettle", 10000 + Math.random() * 8000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      clearTimers();
      drainRef.current?.stop();
      flickerLoopRef.current?.stop();
      warmthAnim.stopAnimation();
    },
    [clearTimers, warmthAnim]
  );

  // --- events -------------------------------------------------------------
  const handleStoke = () => {
    if (completedRef.current || granted) return;
    const now = Date.now();
    if (now - lastStokeRef.current < STOKE_COOLDOWN_MS) return;
    lastStokeRef.current = now;
    // Stop the drain first so it cannot roll on, then read the
    // warmth back from the native side: the stopAnimation callback
    // is the trigger to settle by the clock, add the log, and
    // restart the drain from the new warmth.
    drainRef.current?.stop();
    drainRef.current = null;
    let applied = false;
    const applyOnce = () => {
      if (applied || completedRef.current) return;
      applied = true;
      if (stokeFallbackRef.current) {
        clearTimeout(stokeFallbackRef.current);
        stokeFallbackRef.current = null;
      }
      settle(Date.now());
      warmthRef.current = Math.min(100, warmthRef.current + STOKE_GAIN);
      setWarmthDisplay(warmthRef.current);
      setFeedback("Another log settles into the flames.");
      startDrain();
    };
    // Insurance only, like the Steady Trim: if the native callback
    // never answers, settle from the clock so a stoke can't stall.
    stokeFallbackRef.current = setTimeout(applyOnce, 300);
    warmthAnim.stopAnimation(() => applyOnce());
  };

  const tapMoment = (kind: MomentKind) => {
    if (completedRef.current || granted) return;
    if (momentRef.current?.kind !== kind) return;
    momentRef.current = null;
    setMoment(null);
    if (momentExpiryRef.current) {
      clearTimeout(momentExpiryRef.current);
      momentExpiryRef.current = null;
    }
    momentsRef.current += 1;
    setMoments(momentsRef.current);
    setFeedback(kind === "kettle" ? "The kettle sings — tea for the house." : "Warm bread, right on time.");
    drainRef.current?.stop();
    drainRef.current = null;
    let applied = false;
    const applyOnce = () => {
      if (applied || completedRef.current) return;
      applied = true;
      if (momentFallbackRef.current) {
        clearTimeout(momentFallbackRef.current);
        momentFallbackRef.current = null;
      }
      settle(Date.now());
      warmthRef.current = Math.min(100, warmthRef.current + MOMENT_GAIN);
      setWarmthDisplay(warmthRef.current);
      startDrain();
    };
    momentFallbackRef.current = setTimeout(applyOnce, 300);
    warmthAnim.stopAnimation(() => applyOnce());
  };

  if (granted) {
    return (
      <GameCard title="Hearth Keeper" accent={accent} onLayout={onLayout}>
        <GameResults
          title="The hearth is warm"
          flavor={
            fireOut
              ? `The fire faded to embers before the hour was out — but the keeping counted, and ${moments} small house moment${moments === 1 ? " was" : "s were"} caught along the way. The house remembers a tended hearth.`
              : `A full hour of tended warmth, with ${moments} small house moment${moments === 1 ? "" : "s"} caught along the way. This is a house that is lived in and loved.`
          }
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  // Warmth bindings — scale and opacity only, so the native driver
  // carries every one of them.
  const flameScale = warmthAnim.interpolate({ inputRange: [0, 100], outputRange: [0.35, 1.15] });
  const glowOpacity = warmthAnim.interpolate({ inputRange: [0, 100], outputRange: [0.05, 0.3] });
  const barScaleX = warmthAnim.interpolate({ inputRange: [0, 100], outputRange: [0, 1] });
  const flickerScale = flicker.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });
  const ringOpacity = flicker.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  const centerX = innerW / 2;
  const kettleCx = innerW * 0.17;
  const kettleCy = sceneH * 0.58;
  const breadCx = innerW * 0.82;
  const breadCy = sceneH * 0.68;
  const breadActive = moment?.kind === "bread";
  const kettleActive = moment?.kind === "kettle";

  return (
    <GameCard title="Hearth Keeper" accent={accent} onLayout={onLayout}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>{secondsLeft}s by the fire</Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>Moments caught: {moments}</Text>
        </View>

        {/* warmth bar */}
        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "800", marginRight: 8 }}>Warmth</Text>
          <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: "#EFE6D8", overflow: "hidden" }}>
            <Animated.View
              style={{
                height: 10,
                width: "100%",
                borderRadius: 5,
                backgroundColor: "#F97316",
                transform: [{ scaleX: barScaleX }],
                transformOrigin: "left center",
              }}
            />
          </View>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700", marginLeft: 8 }}>{Math.round(warmthDisplay)}</Text>
        </View>

        {/* moment banner */}
        <View style={{ height: 30, marginTop: 10, justifyContent: "center" }}>
          {moment && (
            <View style={{ backgroundColor: "#78350F", borderRadius: 9, paddingVertical: 6, paddingHorizontal: 10, alignItems: "center" }}>
              <Text style={{ color: "#FDE68A", fontWeight: "800", fontSize: 12.5 }}>
                {kettleActive ? "The kettle is singing — tap the kettle." : "The bread is ready — tap the bread board."}
              </Text>
            </View>
          )}
        </View>

        {/* the hearth scene */}
        <View
          style={{
            marginTop: 4,
            height: ready ? sceneH : 260,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#2A1E17",
            position: "relative",
          }}
        >
          {ready && (
            <>
              <Svg width={innerW} height={sceneH} viewBox={`0 0 ${innerW} ${sceneH}`} style={{ position: "absolute", left: 0, top: 0 }}>
                {/* stone arch */}
                <Rect x={centerX - 84} y={sceneH * 0.14} width={168} height={sceneH * 0.68} rx={20} fill="#57534E" />
                <Rect x={centerX - 84} y={sceneH * 0.14} width={168} height={sceneH * 0.68} rx={20} fill="none" stroke="#44403C" strokeWidth={3} />
                <Rect x={centerX - 58} y={sceneH * 0.26} width={116} height={sceneH * 0.56} rx={14} fill="#1A0E08" />
                {/* mantel + hearth floor */}
                <Rect x={centerX - 96} y={sceneH * 0.1} width={192} height={12} rx={6} fill="#44403C" />
                <Rect x={centerX - 96} y={sceneH * 0.82} width={192} height={10} rx={5} fill="#44403C" />
                {/* logs */}
                <Rect x={centerX - 40} y={sceneH * 0.72} width={80} height={13} rx={6} fill="#78350F" transform={`rotate(-7 ${centerX} ${sceneH * 0.75})`} />
                <Rect x={centerX - 36} y={sceneH * 0.7} width={74} height={12} rx={6} fill="#92400E" transform={`rotate(9 ${centerX} ${sceneH * 0.73})`} />
                {/* the kettle, hanging at the side of the hearth */}
                <Path d={`M ${kettleCx - 14} ${kettleCy - 22} Q ${kettleCx} ${kettleCy - 34} ${kettleCx + 14} ${kettleCy - 22}`} fill="none" stroke="#44403C" strokeWidth={3} />
                <Circle cx={kettleCx} cy={kettleCy} r={17} fill="#292524" stroke="#44403C" strokeWidth={2} />
                <Path d={`M ${kettleCx - 16} ${kettleCy - 4} L ${kettleCx - 26} ${kettleCy - 12} L ${kettleCx - 15} ${kettleCy + 3} Z`} fill="#292524" stroke="#44403C" strokeWidth={1.6} />
                <Rect x={kettleCx - 4} y={kettleCy - 23} width={8} height={7} rx={2} fill="#44403C" />
                {/* the bread board, out when its moment comes */}
                {breadActive && (
                  <>
                    <Rect x={breadCx - 34} y={breadCy + 8} width={68} height={10} rx={5} fill="#92400E" />
                    <Ellipse cx={breadCx} cy={breadCy + 4} rx={24} ry={13} fill="#D6A860" stroke="#B45309" strokeWidth={1.6} />
                    <Path d={`M ${breadCx - 12} ${breadCy - 2} L ${breadCx - 7} ${breadCy + 3}`} stroke="#B45309" strokeWidth={1.8} strokeLinecap="round" />
                    <Path d={`M ${breadCx - 1} ${breadCy - 4} L ${breadCx + 4} ${breadCy + 1}`} stroke="#B45309" strokeWidth={1.8} strokeLinecap="round" />
                    <Path d={`M ${breadCx + 10} ${breadCy - 2} L ${breadCx + 15} ${breadCy + 3}`} stroke="#B45309" strokeWidth={1.8} strokeLinecap="round" />
                  </>
                )}
              </Svg>

              {/* fire glow, breathing with the warmth */}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: centerX - 90,
                  top: sceneH * 0.82 - 168,
                  width: 180,
                  height: 180,
                  borderRadius: 90,
                  backgroundColor: "#F59E0B",
                  opacity: glowOpacity,
                }}
              />
              {/* the fire: warmth scale outside, flicker scale inside */}
              <Animated.View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: centerX - 27,
                  bottom: sceneH * 0.18,
                  width: 54,
                  height: 76,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  transform: [{ scale: flameScale }],
                }}
              >
                <Animated.View style={{ transform: [{ scale: flickerScale }] }}>
                  <Svg width={54} height={76} viewBox="0 0 54 76">
                    <Path d="M27 1 C27 1 47 27 47 45 A20 21 0 1 1 7 45 C7 27 27 1 27 1 Z" fill="#EA580C" />
                    <Path d="M27 20 C27 20 39 38 39 49 A12 13 0 1 1 15 49 C15 38 27 20 27 20 Z" fill="#F59E0B" />
                    <Path d="M27 38 C27 38 33 48 33 55 A6 7 0 1 1 21 55 C21 48 27 38 27 38 Z" fill="#FDE68A" />
                  </Svg>
                </Animated.View>
              </Animated.View>

              {/* tap the hearth itself to stoke */}
              <Pressable
                onPressIn={handleStoke}
                style={{ position: "absolute", left: centerX - 84, top: sceneH * 0.14, width: 168, height: sceneH * 0.68 }}
              />
              {/* the kettle's moment ring + its tap spot */}
              {kettleActive && (
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: kettleCx - 30,
                    top: kettleCy - 30,
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    borderWidth: 2.5,
                    borderColor: "#FDE68A",
                    opacity: ringOpacity,
                  }}
                />
              )}
              <Pressable
                onPressIn={() => tapMoment("kettle")}
                style={{ position: "absolute", left: kettleCx - 32, top: kettleCy - 32, width: 64, height: 64 }}
              />
              {breadActive && (
                <Pressable
                  onPressIn={() => tapMoment("bread")}
                  style={{ position: "absolute", left: breadCx - 38, top: breadCy - 24, width: 76, height: 52 }}
                />
              )}
            </>
          )}
          {!ready && (
            <Text style={{ color: "#D6C7B8", textAlign: "center", marginTop: 110, fontSize: 13 }}>
              Laying the fire…
            </Text>
          )}
        </View>

        <View style={{ height: 24, marginTop: 10, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: feedback ? "#B45309" : "#A08B7A", fontWeight: feedback ? "700" : "400", fontSize: 13, textAlign: "center" }}>
            {feedback ?? "Tap the hearth or add a log before the warmth fades."}
          </Text>
        </View>

        <Pressable
          onPressIn={handleStoke}
          style={{ backgroundColor: accent, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 16, letterSpacing: 0.5 }}>ADD A LOG</Text>
        </Pressable>
        <Pressable onPressIn={onExit} style={{ alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
