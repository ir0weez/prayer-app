// Keep the Candle Lit — Fasting House mini-game.
// In the quiet room, a candle burns. Dusty distraction motes drift
// toward the flame; tap one to brush it away before it dims the light.
// Sixty seconds of stillness. The flame's brightness is the score —
// if it ever goes out, it simply relights, smaller, and the time of
// quiet ends gently. There is no losing here. Mostly XP.
//
// TIMING (rebuilt to the timing standard — event-driven, no tick
// loop): brightness is never sampled per frame. It is a pure function
// of time between EVENTS (spawn, arrival, dismiss, burnout, finish):
// it decays 0.45/sec continuously, and an analytic settle() integrates
// brightness·seconds exactly (∫(b0 − 0.45t)dt = b0·dt − 0.225·dt²,
// with the zero-crossing solved as t* = b0/0.45 when it goes out
// mid-interval). A burnout timeout is (re)scheduled after every event
// for the exact moment brightness would reach zero. Each mote owns a
// native-driver Animated.Value that carries it to the flame; arrivals
// and dismissals are animation events, not clock checks. The visible
// brightness (meter, glow, flame) is one native-driven Animated.Value
// re-aimed after each event — React renders on events only.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const DURATION_S = 60;
const MAX_MOTES = 6;
const DECAY_PER_S = 0.45;

type Mote = {
  id: number;
  sx: number;
  sy: number;
  /** ms for the full drift to the flame */
  travelMs: number;
  seed: number;
  /** Owns this mote's motion: 0 at spawn, 1 at the flame (native). */
  anim: Animated.Value;
  /** translateX keyframe outputs at p = 0/.25/.5/.75/1 (wobble baked in). */
  xOut: number[];
  /** translateY endpoints (spawn y → flame y), minus the 16px centering. */
  yFrom: number;
  yTo: number;
};

let moteId = 0;

export function CandleGame({ accent, onComplete, onExit }: MiniGameProps) {
  const { sceneW, sceneH, ready, onLayout } = useSceneBox(0.88);
  const [motes, setMotes] = useState<Mote[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(DURATION_S);
  const [dismissed, setDismissed] = useState(0);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);
  const [relit, setRelit] = useState(false);

  // The brightness model, kept entirely in refs — events mutate it,
  // settle() advances it analytically to "now".
  const brightnessRef = useRef(100); // brightness at lastEventRef
  const lastEventRef = useRef(0);
  const integralRef = useRef(0); // Σ brightness·sec since the start
  const startAtRef = useRef(0);
  const motesRef = useRef<Mote[]>([]);
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const burnoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secondsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flickerLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  // Scene dims in a ref so timeout/animation callbacks never read stale layout.
  const dimsRef = useRef({ w: 0, h: 0 });
  dimsRef.current = { w: sceneW, h: sceneH };

  // Display drivers: brightnessAnim drains linearly on the native side
  // between events; flickerAnim is a separate little native loop.
  const brightnessAnim = useRef(new Animated.Value(100)).current;
  const flickerAnim = useRef(new Animated.Value(0)).current;

  // Ref-held so a parent re-render can never restart the session.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const flameX = sceneW / 2;
  const flameY = sceneH * 0.46;

  const clearTimers = useCallback(() => {
    if (burnoutRef.current) clearTimeout(burnoutRef.current);
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    if (secondsTimerRef.current) clearTimeout(secondsTimerRef.current);
    burnoutRef.current = null;
    finishTimerRef.current = null;
    spawnTimerRef.current = null;
    secondsTimerRef.current = null;
  }, []);

  const finish = useCallback(
    (wentOut: boolean) => {
      if (completedRef.current) return;
      completedRef.current = true;
      clearTimers();
      flickerLoopRef.current?.stop();
      flickerLoopRef.current = null;
      for (const m of motesRef.current) m.anim.stopAnimation();
      if (wentOut) brightnessAnim.setValue(35); // it relights, smaller
      const elapsedSec = wentOut
        ? Math.max(0, (Date.now() - startAtRef.current) / 1000)
        : DURATION_S;
      const avg = elapsedSec > 0 ? integralRef.current / elapsedSec : brightnessRef.current;
      let xp = Math.round(Math.min(100, Math.max(0, avg)));
      if (wentOut) xp = Math.round(xp * 0.8);
      setRelit(wentOut);
      setGranted(onCompleteRef.current({ xp, coins: Math.min(15, Math.round(xp * 0.15)) }));
    },
    [brightnessAnim, clearTimers]
  );

  /** Advance the brightness model analytically to `now`, folding the
   *  exact ∫brightness·dt of the elapsed interval into integralRef.
   *  Returns true when the flame reaches zero inside the interval. */
  const settle = (now: number): boolean => {
    const dt = (now - lastEventRef.current) / 1000;
    lastEventRef.current = now;
    if (dt <= 0) return brightnessRef.current <= 0;
    const b0 = brightnessRef.current;
    if (b0 - DECAY_PER_S * dt <= 0) {
      const tStar = b0 > 0 ? b0 / DECAY_PER_S : 0; // zero-crossing, seconds in
      integralRef.current += b0 * tStar - 0.225 * tStar * tStar;
      brightnessRef.current = 0;
      return true;
    }
    integralRef.current += b0 * dt - 0.225 * dt * dt;
    brightnessRef.current = b0 - DECAY_PER_S * dt;
    return false;
  };

  /** Re-aim the display value after an event: a linear native drain
   *  from the settled brightness toward where pure decay will have
   *  taken it by the end of the round. */
  const updateBrightnessDisplay = () => {
    brightnessAnim.stopAnimation();
    brightnessAnim.setValue(brightnessRef.current);
    if (completedRef.current) return;
    const remainingMs = Math.max(0, startAtRef.current + DURATION_S * 1000 - Date.now());
    if (remainingMs <= 0) return;
    Animated.timing(brightnessAnim, {
      toValue: Math.max(0, brightnessRef.current - DECAY_PER_S * (remainingMs / 1000)),
      duration: remainingMs,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  /** (Re)schedule the exact moment brightness would decay to zero. */
  const scheduleBurnout = () => {
    if (burnoutRef.current) clearTimeout(burnoutRef.current);
    burnoutRef.current = null;
    if (completedRef.current) return;
    const ms = (brightnessRef.current / DECAY_PER_S) * 1000;
    burnoutRef.current = setTimeout(() => {
      burnoutRef.current = null;
      if (completedRef.current) return;
      if (settle(Date.now())) {
        brightnessAnim.setValue(35); // relight visual; finish() keeps it
        finish(true);
      } else {
        // Shouldn't happen (the timeout IS the crossing), but never
        // leave the flame unscheduled.
        scheduleBurnout();
        updateBrightnessDisplay();
      }
    }, ms);
  };

  const removeMote = (id: number) => {
    motesRef.current = motesRef.current.filter((m) => m.id !== id);
    setMotes(motesRef.current);
  };

  /** A mote reached the flame: settle, dim by 14, maybe go out. */
  const handleArrival = (id: number) => {
    if (completedRef.current) return;
    if (!motesRef.current.some((m) => m.id === id)) return; // dismissed first
    const out = settle(Date.now());
    removeMote(id);
    if (out) {
      finish(true);
      return;
    }
    brightnessRef.current = Math.max(0, brightnessRef.current - 14);
    if (brightnessRef.current <= 0) {
      finish(true);
      return;
    }
    scheduleBurnout();
    updateBrightnessDisplay();
  };

  const spawnMote = () => {
    if (completedRef.current) return;
    const { w, h } = dimsRef.current;
    if (w <= 0 || h <= 0) return;
    if (motesRef.current.length >= MAX_MOTES) return;
    const edge = Math.floor(Math.random() * 3);
    const sx = edge === 0 ? Math.random() * w : edge === 1 ? -14 : w + 14;
    const sy = edge === 0 ? -14 : h * (0.12 + Math.random() * 0.4);
    const travelMs = 4000 + Math.random() * 900;
    const seed = Math.random() * 6.28;
    const targetX = w / 2 - 14; // flameX − 14
    const targetY = h * 0.46; // flameY
    // Wobble baked into static keyframes: x(p) at the five stops, each
    // already offset by −16 so the 34px hit area centers on the mote.
    const xOut = [0, 0.25, 0.5, 0.75, 1].map((p) => {
      const wobble = Math.sin(p * 6 + seed) * 9 * (1 - p);
      return sx + (targetX - sx) * p + wobble - 16;
    });
    const mote: Mote = {
      id: ++moteId,
      sx,
      sy,
      travelMs,
      seed,
      anim: new Animated.Value(0),
      xOut,
      yFrom: sy - 16,
      yTo: targetY - 16,
    };
    motesRef.current = [...motesRef.current, mote];
    setMotes(motesRef.current);
    Animated.timing(mote.anim, {
      toValue: 1,
      duration: travelMs,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) handleArrival(mote.id);
    });
  };

  const scheduleNextSpawn = () => {
    if (completedRef.current) return;
    spawnTimerRef.current = setTimeout(() => {
      spawnTimerRef.current = null;
      spawnMote();
      scheduleNextSpawn();
    }, 1300 + Math.random() * 900);
  };

  // Session start: arm the finish deadline, the burnout schedule, the
  // spawn chain, the 1s display clock, and the flicker loop — all
  // event/timeout driven, nothing ticks per frame.
  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    const now = Date.now();
    startAtRef.current = now;
    lastEventRef.current = now;
    brightnessRef.current = 100;
    integralRef.current = 0;
    brightnessAnim.setValue(100);
    updateBrightnessDisplay();
    scheduleBurnout();

    finishTimerRef.current = setTimeout(() => {
      finishTimerRef.current = null;
      if (completedRef.current) return;
      settle(Date.now());
      finish(false);
    }, DURATION_S * 1000);

    scheduleNextSpawn();

    // "Ns of quiet" — display only, a 1s timeout chain.
    const tickSeconds = () => {
      const remainingMs = Math.max(0, startAtRef.current + DURATION_S * 1000 - Date.now());
      setSecondsLeft(Math.ceil(remainingMs / 1000));
      if (remainingMs > 0 && !completedRef.current) {
        secondsTimerRef.current = setTimeout(tickSeconds, 1000);
      }
    };
    secondsTimerRef.current = setTimeout(tickSeconds, 1000);

    // Flame flicker: a separate native sine loop, ~120/170ms legs.
    flickerAnim.setValue(0);
    const flicker = Animated.loop(
      Animated.sequence([
        Animated.timing(flickerAnim, { toValue: 1, duration: 120, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flickerAnim, { toValue: 0, duration: 170, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    flickerLoopRef.current = flicker;
    flicker.start();

    return () => {
      clearTimers();
      flicker.stop();
      flickerLoopRef.current = null;
      for (const m of motesRef.current) m.anim.stopAnimation();
      brightnessAnim.stopAnimation();
    };
    // Session state lives in refs; startedRef keeps exactly one session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, finish]);

  const dismiss = (id: number) => {
    if (completedRef.current) return;
    const mote = motesRef.current.find((m) => m.id === id);
    if (!mote) return;
    mote.anim.stopAnimation(); // its arrival callback now reports finished=false
    const out = settle(Date.now());
    removeMote(id);
    if (out) {
      finish(true);
      return;
    }
    setDismissed((d) => d + 1);
    brightnessRef.current = Math.min(100, brightnessRef.current + 2);
    scheduleBurnout();
    updateBrightnessDisplay();
  };

  if (granted) {
    return (
      <GameCard title="Keep the Candle Lit" accent={accent} onLayout={onLayout}>
        <GameResults
          title={relit ? "The flame relit, smaller" : "The candle still burns"}
          flavor={
            relit
              ? "Even a small light is still light. The quiet did its work."
              : `You guarded the stillness — ${dismissed} distraction${dismissed === 1 ? "" : "s"} brushed away. The room is lighter for it.`
          }
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  // Everything visible derives from brightnessAnim — no state ticks.
  // Meter fill: full-width bar scaled from the left edge.
  const meterScaleX = brightnessAnim.interpolate({ inputRange: [0, 100], outputRange: [0, 1] });
  // Glow: the old SVG ellipse (rx ≈ 110·(0.35 + b/130), ry ≈ 86·(0.35 + b/130),
  // opacity 0.1 + b/100·0.16) as a plain circular view — SVG props can't
  // bind Animated values, transforms and opacity can.
  const glowScale = brightnessAnim.interpolate({ inputRange: [0, 100], outputRange: [0.313, 1] });
  const glowOpacity = brightnessAnim.interpolate({ inputRange: [0, 100], outputRange: [0.1, 0.26] });
  // Flame outer scale: the old 0.45 + brightness/100 · 0.75.
  const flameScale = brightnessAnim.interpolate({ inputRange: [0, 100], outputRange: [0.45, 1.2] });
  const flickerScale = flickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.07] });

  return (
    <GameCard title="Keep the Candle Lit" accent={accent} onLayout={onLayout}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            {secondsLeft}s of quiet
          </Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Brushed away: {dismissed}
          </Text>
        </View>
        {/* brightness meter */}
        <View style={{ height: 6, borderRadius: 3, backgroundColor: "#EFE9DC", marginTop: 7, overflow: "hidden" }}>
          <Animated.View
            style={{
              height: 6,
              width: "100%",
              backgroundColor: "#E8A33D",
              borderRadius: 3,
              transform: [{ scaleX: meterScaleX }],
              transformOrigin: "left center",
            }}
          />
        </View>

        {/* the quiet room */}
        <View
          style={{
            marginTop: 12,
            height: ready ? sceneH : 220,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#211E19",
            position: "relative",
          }}
        >
          {ready && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: flameX - 14 - 123,
                top: flameY - 96,
                width: 246,
                height: 192,
                borderRadius: 123,
                backgroundColor: "#E8A33D",
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              }}
            />
          )}
          {ready && (
            <Svg width={sceneW - 28} height={sceneH} viewBox={`0 0 ${sceneW - 28} ${sceneH}`}>
              {/* the bare table line */}
              <Rect x={0} y={sceneH * 0.78} width={sceneW - 28} height={4} fill="#3A352C" />
              {/* candle body */}
              <Rect x={flameX - 14 - 11} y={flameY + 26} width={22} height={sceneH * 0.78 - flameY - 24} rx={4} fill="#EFE6D2" />
              <Rect x={flameX - 14 - 11} y={flameY + 26} width={22} height={8} rx={4} fill="#E0D2B2" />
              <Line x1={flameX - 14} y1={flameY + 14} x2={flameX - 14} y2={flameY + 27} stroke="#4A4238" strokeWidth={2.4} />
            </Svg>
          )}
          {/* flame (views, so brightness scale + flicker run natively) */}
          {ready && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: flameX - 14 - 11,
                top: flameY - 18,
                width: 22,
                height: 36,
                alignItems: "center",
                justifyContent: "flex-end",
                transform: [{ scale: flameScale }],
                transformOrigin: "bottom center",
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 32,
                  borderRadius: 999,
                  backgroundColor: "#E8813A",
                  opacity: 0.9,
                  alignItems: "center",
                  justifyContent: "flex-end",
                  paddingBottom: 4,
                }}
              >
                <Animated.View
                  style={{
                    width: 11,
                    height: 16,
                    borderRadius: 999,
                    backgroundColor: "#F7CE5B",
                    transform: [{ scale: flickerScale }],
                  }}
                />
              </View>
            </Animated.View>
          )}
          {/* drifting motes — each carried by its own native animation */}
          {ready &&
            motes.map((m) => {
              const translateX = m.anim.interpolate({
                inputRange: [0, 0.25, 0.5, 0.75, 1],
                outputRange: m.xOut,
              });
              const translateY = m.anim.interpolate({ inputRange: [0, 1], outputRange: [m.yFrom, m.yTo] });
              const dotOpacity = m.anim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
              return (
                <Animated.View
                  key={m.id}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: 34,
                    height: 34,
                    transform: [{ translateX }, { translateY }],
                  }}
                >
                  <Pressable
                    onPressIn={() => dismiss(m.id)}
                    style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}
                  >
                    <Animated.View
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: 6,
                        backgroundColor: "#9A94B8",
                        opacity: dotOpacity,
                        borderWidth: 1,
                        borderColor: "#C9C4DE",
                      }}
                    />
                  </Pressable>
                </Animated.View>
              );
            })}
          {!ready && (
            <Text style={{ color: "#8A8378", textAlign: "center", marginTop: 90, fontSize: 13 }}>
              Lighting the candle…
            </Text>
          )}
        </View>
        <Text style={{ color: "#A08B62", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Tap the drifting motes before they reach the flame. Just a minute of quiet.
        </Text>
      </View>
    </GameCard>
  );
}
