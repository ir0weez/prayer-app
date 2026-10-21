// Popcorn Catch — Theater mini-game.
// Kernels rain down the screen for 45 seconds. Slide the bucket along
// the bottom (drag anywhere, or tap a side to glide there) and catch
// the golden kernels. The black burnt ones cost points — let them
// fall.
//
// TIMING STANDARD (the Token Toss / Steady Trim rule): no tick loop
// of any kind. The bucket lives in an Animated.Value moved by the
// drag handlers; each kernel falls in two native-driver phases —
// to the bucket rim, then (if it wasn't caught) to the floor — and
// React only hears about events: a spawn (a setTimeout chain), a
// rim crossing (phase-1 completion, where the catch is judged
// against the bucket's mirrored fraction), a landing, the flash
// clearing, and the deadline.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, GestureResponderEvent, Pressable, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const DURATION_S = 45;
const MAX_ALIVE = 12;
const CATCH_HALF = 0.085; // bucket catch width, as a fraction of scene width

type Kernel = {
  id: number;
  /** 0..1 across the scene */
  x: number;
  /** ms for the full fall */
  fallMs: number;
  burnt: boolean;
  wobbleSeed: number;
  /** 0..1.04 down the scene, run on the native driver */
  value: Animated.Value;
};

let kernelId = 0;

function PopcornPuff({ burnt, size = 26 }: { burnt: boolean; size?: number }) {
  const fill = burnt ? "#292524" : "#FEF3C7";
  const shade = burnt ? "#44403C" : "#FDE68A";
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Circle cx={11} cy={12} r={6.4} fill={fill} />
      <Circle cx={19} cy={11} r={5.6} fill={fill} />
      <Circle cx={15} cy={17.5} r={6.8} fill={fill} />
      <Circle cx={10} cy={19} r={4.6} fill={shade} />
      <Circle cx={20.5} cy={18.6} r={4.2} fill={shade} />
      <Circle cx={15} cy={9.4} r={2} fill={burnt ? "#57534E" : "#FFFFFF"} opacity={0.8} />
    </Svg>
  );
}

export function PopcornGame({ accent, onComplete, onExit }: MiniGameProps) {
  const { sceneW, sceneH, ready, onLayout } = useSceneBox(0.94);
  const [kernels, setKernels] = useState<Kernel[]>([]);
  const [caught, setCaught] = useState(0);
  const [burntHits, setBurntHits] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(DURATION_S);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const kernelsRef = useRef<Kernel[]>([]);
  const bucketRef = useRef(0.5);
  const caughtRef = useRef(0);
  const burntRef = useRef(0);
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const startAtRef = useRef(0);
  const spawnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secondsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Bucket position (fraction 0..1) and the countdown bar both live
  // on the native driver — drags and time never touch React state.
  const bucketAnim = useRef(new Animated.Value(0.5)).current;
  const timeAnim = useRef(new Animated.Value(0)).current;

  const bucketTopY = sceneH * 0.845;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const c = caughtRef.current;
    setGranted(
      onCompleteRef.current({
        coins: Math.min(90, c * 3),
        xp: Math.min(36, Math.round(c * 1.2)),
      })
    );
  }, []);

  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;
    startAtRef.current = Date.now();

    const pRim = bucketTopY / sceneH;

    const removeKernel = (id: number) => {
      kernelsRef.current = kernelsRef.current.filter((k) => k.id !== id);
      setKernels(kernelsRef.current);
    };

    const showFlash = (kind: "good" | "bad") => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }
      setFlash(kind);
      flashTimeoutRef.current = setTimeout(() => {
        flashTimeoutRef.current = null;
        setFlash(null);
      }, 260);
    };

    const spawnKernel = () => {
      const kernel: Kernel = {
        id: ++kernelId,
        x: 0.06 + Math.random() * 0.88,
        fallMs: 2600 + Math.random() * 1100,
        burnt: Math.random() < 0.17,
        wobbleSeed: Math.random() * 6.28,
        value: new Animated.Value(0),
      };
      kernelsRef.current = [...kernelsRef.current, kernel];
      setKernels(kernelsRef.current);
      // Phase 1: fall to the bucket rim. Its completion IS the
      // catch judgement — same rim, same width, read against the
      // bucket fraction mirrored in bucketRef.
      Animated.timing(kernel.value, {
        toValue: pRim,
        duration: kernel.fallMs * pRim,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || completedRef.current) return;
        if (Math.abs(kernel.x - bucketRef.current) <= CATCH_HALF) {
          if (kernel.burnt) {
            burntRef.current += 1;
            setBurntHits(burntRef.current);
            showFlash("bad");
          } else {
            caughtRef.current += 1;
            setCaught(caughtRef.current);
            showFlash("good");
          }
          removeKernel(kernel.id);
          return;
        }
        // Phase 2: past the rim, down to the floor, then gone.
        Animated.timing(kernel.value, {
          toValue: 1.04,
          duration: kernel.fallMs * (1.04 - pRim),
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished: landed }) => {
          if (!landed) return;
          removeKernel(kernel.id);
        });
      });
    };

    // Spawn chain — a little denser as the show goes on. Each fire
    // is an event: spawn if there's room, then schedule the next.
    const spawnFire = () => {
      if (completedRef.current) return;
      const elapsedMs = Date.now() - startAtRef.current;
      if (elapsedMs >= DURATION_S * 1000) return;
      if (kernelsRef.current.length < MAX_ALIVE) spawnKernel();
      const spawnEvery = Math.max(340, 620 - elapsedMs / 160);
      spawnTimeoutRef.current = setTimeout(spawnFire, spawnEvery);
    };
    spawnTimeoutRef.current = setTimeout(spawnFire, 0);

    // Countdown bar: one native linear run, 0 → 1 over the whole
    // show; the bar drains via scaleX from its left edge.
    timeAnim.setValue(0);
    Animated.timing(timeAnim, {
      toValue: 1,
      duration: DURATION_S * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();

    // "Ns left" text — display cadence only, a 1-second chain.
    const secondsFire = () => {
      if (completedRef.current) return;
      const elapsedMs = Date.now() - startAtRef.current;
      setSecondsLeft(Math.max(0, Math.ceil((DURATION_S * 1000 - elapsedMs) / 1000)));
      if (elapsedMs < DURATION_S * 1000) {
        secondsTimeoutRef.current = setTimeout(secondsFire, 1000);
      }
    };
    secondsTimeoutRef.current = setTimeout(secondsFire, 1000);

    // The deadline.
    finishTimeoutRef.current = setTimeout(finish, DURATION_S * 1000);

    return () => {
      if (spawnTimeoutRef.current) {
        clearTimeout(spawnTimeoutRef.current);
        spawnTimeoutRef.current = null;
      }
      if (secondsTimeoutRef.current) {
        clearTimeout(secondsTimeoutRef.current);
        secondsTimeoutRef.current = null;
      }
      if (finishTimeoutRef.current) {
        clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }
      timeAnim.stopAnimation();
      for (const k of kernelsRef.current) k.value.stopAnimation();
    };
    // sceneW/sceneH/bucketTopY are captured at start; startedRef keeps one session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, finish]);

  const moveBucket = (e: GestureResponderEvent) => {
    const lx = e.nativeEvent.locationX;
    if (!Number.isFinite(lx) || sceneW <= 0) return;
    // The scene svg is inset by the card's 14px horizontal padding.
    const frac = Math.max(0.04, Math.min(0.96, lx / (sceneW - 28)));
    bucketRef.current = frac;
    bucketAnim.setValue(frac);
  };

  if (granted) {
    return (
      <GameCard title="Popcorn Catch" accent={accent} onLayout={onLayout}>
        <GameResults
          title="The credits roll"
          flavor={`You caught ${caught} kernel${caught === 1 ? "" : "s"}${burntHits > 0 ? ` — and ${burntHits} burnt one${burntHits === 1 ? "" : "s"} you'll taste for a week` : ", not a single burnt one"}. Best seat in the house.`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  return (
    <GameCard title="Popcorn Catch" accent={accent} onLayout={onLayout}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>{secondsLeft}s left</Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Caught: {caught}
            {burntHits > 0 ? ` · Burnt: ${burntHits}` : ""}
          </Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: "#F5E9DC", marginTop: 7, overflow: "hidden" }}>
          <Animated.View
            style={{
              height: 6,
              borderRadius: 3,
              backgroundColor: accent,
              width: "100%",
              transformOrigin: "left",
              transform: [{ scaleX: timeAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }],
            }}
          />
        </View>

        {/* the screen */}
        <View
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={moveBucket}
          onResponderMove={moveBucket}
          style={{
            marginTop: 12,
            height: ready ? sceneH : 240,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#17122B",
            position: "relative",
          }}
        >
          {ready && (
            <Svg width={sceneW - 28} height={sceneH} viewBox={`0 0 ${sceneW - 28} ${sceneH}`}>
              {/* glowing screen at the top */}
              <Rect x={sceneW * 0.14} y={10} width={sceneW * 0.66} height={sceneH * 0.3} rx={8} fill="#2E2560" />
              <Rect x={sceneW * 0.14} y={10} width={sceneW * 0.66} height={sceneH * 0.3} rx={8} fill="none" stroke="#4C3BCF" strokeWidth={2} />
              <Circle cx={sceneW * 0.47} cy={sceneH * 0.15} r={sceneH * 0.045} fill="#8B7CF0" opacity={0.8} />
              {/* floor */}
              <Rect x={0} y={sceneH * 0.93} width={sceneW - 28} height={sceneH * 0.07} fill="#0D0A1A" />
            </Svg>
          )}
          {/* falling kernels — y from each kernel's own native value
              (translateY of progress × sceneH, base top 0); the
              sideways wobble is a second interpolation on the same
              value, its outputs the wobble formula evaluated at the
              keyframe progresses */}
          {ready &&
            kernels.map((k) => {
              const wobbleOutputs = [0, 0.25, 0.5, 0.75, 1].map(
                (p) => Math.sin(p * 9 + k.wobbleSeed) * 5 * (1 - p * 0.4)
              );
              return (
                <Animated.View
                  key={k.id}
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    left: k.x * (sceneW - 28) - 13,
                    top: 0,
                    transform: [
                      {
                        translateX: k.value.interpolate({
                          inputRange: [0, 0.25, 0.5, 0.75, 1],
                          outputRange: wobbleOutputs,
                        }),
                      },
                      {
                        translateY: k.value.interpolate({
                          inputRange: [0, 1.04],
                          outputRange: [-13, 1.04 * sceneH - 13],
                        }),
                      },
                    ],
                  }}
                >
                  <PopcornPuff burnt={k.burnt} size={26} />
                </Animated.View>
              );
            })}
          {/* the bucket — base left -26 (half its 52px width) so the
              native translateX of fraction × scene width centers it
              on the drag point, as the old left math did */}
          {ready && (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: -26,
                top: bucketTopY,
                alignItems: "center",
                transform: [
                  {
                    translateX: bucketAnim.interpolate({ inputRange: [0, 1], outputRange: [0, sceneW - 28] }),
                  },
                ],
              }}
            >
              {flash && (
                <Text style={{ position: "absolute", top: -22, fontWeight: "900", fontSize: 14, color: flash === "good" ? "#4ADE80" : "#F87171" }}>
                  {flash === "good" ? "+1" : "burnt!"}
                </Text>
              )}
              <Svg width={52} height={40} viewBox="0 0 52 40">
                <Path d="M6 8 L12 38 h28 L46 8 Z" fill="#DC2626" />
                <Path d="M6 8 L12 38 h6.5 L13.5 8 Z" fill="#FFFFFF" opacity={0.85} />
                <Path d="M23 8 L26.5 38 h6.5 L29.5 8 Z" fill="#FFFFFF" opacity={0.85} />
                <Path d="M38.5 8 L40 38 h6 L46 8 Z" fill="#FFFFFF" opacity={0.0} />
                <Rect x={4} y={3} width={44} height={7} rx={3.5} fill="#B91C1C" />
              </Svg>
            </Animated.View>
          )}
          {!ready && (
            <Text style={{ color: "#8B87A8", textAlign: "center", marginTop: 100, fontSize: 13 }}>Dimming the lights…</Text>
          )}
        </View>
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Drag to slide the bucket. Golden kernels are points — the black ones are burnt, let them drop.
        </Text>
        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
