// Popcorn Catch — Theater mini-game.
// Kernels rain down the screen for 45 seconds. Slide the bucket along
// the bottom (drag anywhere, or tap a side to glide there) and catch
// the golden kernels. The black burnt ones cost points — let them
// fall. Tick-driven like the candle game, so positions come from
// progress values, never from stacked animations.

import { useCallback, useEffect, useRef, useState } from "react";
import { GestureResponderEvent, Pressable, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";

const DURATION_S = 45;
const TICK_MS = 100;
const MAX_ALIVE = 12;
const CATCH_HALF = 0.085; // bucket catch width, as a fraction of scene width

type Kernel = {
  id: number;
  /** 0..1 across the scene */
  x: number;
  /** 0..1 down the scene */
  progress: number;
  /** ms for the full fall */
  fallMs: number;
  burnt: boolean;
  wobbleSeed: number;
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
  const [bucketX, setBucketX] = useState(0.5);
  const [caught, setCaught] = useState(0);
  const [burntHits, setBurntHits] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const kernelsRef = useRef<Kernel[]>([]);
  const bucketRef = useRef(0.5);
  const caughtRef = useRef(0);
  const burntRef = useRef(0);
  const lastSpawnRef = useRef(0);
  const flashUntilRef = useRef(0);
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

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
    const startAt = Date.now();
    let lastTick = startAt;
    const timer = setInterval(() => {
      if (completedRef.current) return;
      const now = Date.now();
      const dt = now - lastTick;
      lastTick = now;
      const elapsedMs = now - startAt;
      setElapsed(elapsedMs / 1000);

      // Spawn kernels — a little denser as the show goes on.
      const spawnEvery = Math.max(340, 620 - elapsedMs / 160);
      if (now - lastSpawnRef.current > spawnEvery && kernelsRef.current.length < MAX_ALIVE) {
        lastSpawnRef.current = now;
        kernelsRef.current = [
          ...kernelsRef.current,
          {
            id: ++kernelId,
            x: 0.06 + Math.random() * 0.88,
            progress: 0,
            fallMs: 2600 + Math.random() * 1100,
            burnt: Math.random() < 0.17,
            wobbleSeed: Math.random() * 6.28,
          },
        ];
      }

      // Advance; resolve catches at the bucket rim.
      const next: Kernel[] = [];
      for (const k of kernelsRef.current) {
        const p = k.progress + dt / k.fallMs;
        const y = p * sceneH;
        if (y >= bucketTopY && k.progress * sceneH < bucketTopY + 26) {
          if (Math.abs(k.x - bucketRef.current) <= CATCH_HALF) {
            if (k.burnt) {
              burntRef.current += 1;
              setBurntHits(burntRef.current);
              setFlash("bad");
            } else {
              caughtRef.current += 1;
              setCaught(caughtRef.current);
              setFlash("good");
            }
            flashUntilRef.current = now + 260;
            continue; // caught — gone either way
          }
        }
        if (p < 1.04) next.push({ ...k, progress: p });
      }
      kernelsRef.current = next;
      setKernels(next);
      if (flashUntilRef.current && now > flashUntilRef.current) {
        flashUntilRef.current = 0;
        setFlash(null);
      }

      if (elapsedMs >= DURATION_S * 1000) finish();
    }, TICK_MS);
    return () => clearInterval(timer);
    // sceneW/sceneH/bucketTopY are captured at start; startedRef keeps one session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, finish]);

  const moveBucket = (e: GestureResponderEvent) => {
    const lx = e.nativeEvent.locationX;
    if (!Number.isFinite(lx) || sceneW <= 0) return;
    // The scene svg is inset by the card's 14px horizontal padding.
    const frac = Math.max(0.04, Math.min(0.96, lx / (sceneW - 28)));
    bucketRef.current = frac;
    setBucketX(frac);
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

  const timeLeft = Math.max(0, DURATION_S - elapsed);
  const bucketLeft = bucketX * (sceneW - 28);

  return (
    <GameCard title="Popcorn Catch" accent={accent} onLayout={onLayout}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>{Math.ceil(timeLeft)}s left</Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Caught: {caught}
            {burntHits > 0 ? ` · Burnt: ${burntHits}` : ""}
          </Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: "#F5E9DC", marginTop: 7, overflow: "hidden" }}>
          <View style={{ height: 6, width: `${(timeLeft / DURATION_S) * 100}%`, backgroundColor: accent, borderRadius: 3 }} />
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
          {/* falling kernels */}
          {ready &&
            kernels.map((k) => {
              const wobble = Math.sin(k.progress * 9 + k.wobbleSeed) * 5 * (1 - k.progress * 0.4);
              return (
                <View
                  key={k.id}
                  pointerEvents="none"
                  style={{ position: "absolute", left: k.x * (sceneW - 28) + wobble - 13, top: k.progress * sceneH - 13 }}
                >
                  <PopcornPuff burnt={k.burnt} size={26} />
                </View>
              );
            })}
          {/* the bucket */}
          {ready && (
            <View pointerEvents="none" style={{ position: "absolute", left: bucketLeft - 26, top: bucketTopY, alignItems: "center" }}>
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
            </View>
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
