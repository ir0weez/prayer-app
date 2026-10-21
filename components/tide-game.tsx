// Tide Pools — Mercy's Shore mini-game.
// Three pools in the wet sand. Shells, starfish, and the occasional
// crab surface for a breath, then slip away. Tap shells and starfish
// to gather them; leave the crabs alone — a pinch costs points and
// stings (a plain red flash; nothing bounces here). Every shell is a
// real species from the collections book: the host records finds via
// onShellUpdate, exactly the way the River records fish.
//
// Event-driven rebuild: no tick loop. Finds spawn on a timeout chain,
// each find fades in and out on its own Animated value (native
// driver) and is removed by its own timeout at the end of its life.
// The game ends on a single 45-second timeout; the "seconds of low
// tide" text and bar step down on a one-second timeout chain.

import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import Svg, { Ellipse, G, Path, Rect } from "react-native-svg";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";
import { ShellArt } from "@/components/shell-art";
import { randomShellSpecies, recordShellFind, type CollectionUpdate, type ShellSpecies } from "@/lib/collections";

const DURATION_S = 45;
const MAX_ALIVE = 4;
const FADE_MS = 180;
const PINCH_MS = 300;

type FindKind = "shell" | "starfish" | "crab";
type Find = {
  id: number;
  kind: FindKind;
  shell?: ShellSpecies;
  /** pool index 0..2 */
  pool: number;
  /** position within the pool, -0.55..0.55 of pool radius */
  ox: number;
  oy: number;
  /** ms on screen */
  lifeMs: number;
  /** 0 hidden, 1 fully surfaced — native-driven fade/scale */
  anim: Animated.Value;
};

let findId = 0;

/** Pool centers/sizes as fractions of the scene (w × h). */
const POOLS = [
  { cx: 0.27, cy: 0.34, rx: 0.235, ry: 0.155 },
  { cx: 0.72, cy: 0.3, rx: 0.21, ry: 0.14 },
  { cx: 0.5, cy: 0.68, rx: 0.3, ry: 0.185 },
];

export type TideGameProps = MiniGameProps & {
  /** Called with the collections update for every shell gathered. */
  onShellUpdate?: (update: CollectionUpdate) => void;
};

export function TideGame({ accent, onComplete, onExit, onShellUpdate }: TideGameProps) {
  const { sceneW, sceneH, ready, onLayout } = useSceneBox(0.86);
  const [finds, setFinds] = useState<Find[]>([]);
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(DURATION_S);
  const [pinched, setPinched] = useState(false);
  const [newShells, setNewShells] = useState<string[]>([]);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const findsRef = useRef<Find[]>([]);
  const tallyRef = useRef({ shells: 0, stars: 0, crabs: 0 });
  const secondsLeftRef = useRef(DURATION_S);
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const findTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>[]>>(new Map());
  const pinchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onShellRef = useRef(onShellUpdate);
  onShellRef.current = onShellUpdate;

  /** Schedule a one-shot timeout tracked for cleanup. */
  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timeoutsRef.current.delete(t);
      fn();
    }, ms);
    timeoutsRef.current.add(t);
    return t;
  }, []);

  const cancelLater = useCallback((t: ReturnType<typeof setTimeout>) => {
    clearTimeout(t);
    timeoutsRef.current.delete(t);
  }, []);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current.clear();
    findTimersRef.current.clear();
    pinchTimerRef.current = null;
  }, []);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearAllTimeouts();
    const { shells, stars } = tallyRef.current;
    setGranted(
      onCompleteRef.current({
        coins: Math.min(50, shells * 2 + stars),
        xp: Math.min(48, shells * 2 + stars * 2),
      })
    );
  }, [clearAllTimeouts]);

  useEffect(() => {
    if (!ready || startedRef.current) return;
    startedRef.current = true;

    const spawnOne = () => {
      const roll = Math.random();
      const kind: FindKind = roll < 0.58 ? "shell" : roll < 0.84 ? "starfish" : "crab";
      const anim = new Animated.Value(0);
      const find: Find = {
        id: ++findId,
        kind,
        shell: kind === "shell" ? randomShellSpecies() : undefined,
        pool: Math.floor(Math.random() * POOLS.length),
        ox: (Math.random() - 0.5) * 1.1,
        oy: (Math.random() - 0.5) * 1.1,
        lifeMs: 1500 + Math.random() * 900,
        anim,
      };
      findsRef.current = [...findsRef.current, find];
      setFinds(findsRef.current);
      // Fade/scale in on the native driver.
      Animated.timing(anim, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
      // Start the fade-out near the end of the find's life, then let
      // its own removal timeout take it off the sand.
      const fadeTimer = later(() => {
        Animated.timing(anim, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start();
      }, Math.max(0, find.lifeMs - FADE_MS));
      const removeTimer = later(() => {
        findTimersRef.current.delete(find.id);
        findsRef.current = findsRef.current.filter((x) => x.id !== find.id);
        setFinds(findsRef.current);
      }, find.lifeMs);
      findTimersRef.current.set(find.id, [fadeTimer, removeTimer]);
    };

    const scheduleSpawn = () => {
      later(() => {
        if (completedRef.current) return;
        if (findsRef.current.length < MAX_ALIVE) spawnOne();
        scheduleSpawn();
      }, 620 + Math.random() * 420);
    };
    scheduleSpawn();

    // One-second chain for the countdown text and bar.
    const scheduleSecond = () => {
      later(() => {
        if (completedRef.current) return;
        secondsLeftRef.current = Math.max(0, secondsLeftRef.current - 1);
        setSecondsLeft(secondsLeftRef.current);
        if (secondsLeftRef.current > 0) scheduleSecond();
      }, 1000);
    };
    scheduleSecond();

    // The game ends on one timeout at the full duration.
    later(finish, DURATION_S * 1000);

    return () => {
      clearAllTimeouts();
    };
  }, [ready, finish, later, clearAllTimeouts]);

  const tapFind = (f: Find) => {
    if (completedRef.current) return;
    // This find is gathered (or pinches) — its own timers die with it.
    const timers = findTimersRef.current.get(f.id);
    if (timers) {
      timers.forEach((t) => cancelLater(t));
      findTimersRef.current.delete(f.id);
    }
    f.anim.stopAnimation();
    findsRef.current = findsRef.current.filter((x) => x.id !== f.id);
    setFinds(findsRef.current);
    if (f.kind === "crab") {
      tallyRef.current = { ...tallyRef.current, crabs: tallyRef.current.crabs + 1 };
      setScore((s) => Math.max(0, s - 4));
      setPinched(true);
      if (pinchTimerRef.current) cancelLater(pinchTimerRef.current);
      pinchTimerRef.current = later(() => {
        pinchTimerRef.current = null;
        setPinched(false);
      }, PINCH_MS);
      return;
    }
    if (f.kind === "starfish") {
      tallyRef.current = { ...tallyRef.current, stars: tallyRef.current.stars + 1 };
      setScore((s) => s + 3);
      return;
    }
    // a shell — a real species for the book
    tallyRef.current = { ...tallyRef.current, shells: tallyRef.current.shells + 1 };
    setScore((s) => s + 4);
    if (f.shell) {
      const shell = f.shell;
      recordShellFind(shell.id)
        .then((update) => {
          if (update.isNew) {
            setNewShells((prev) => (prev.includes(shell.name) ? prev : [...prev, shell.name]));
          }
          onShellRef.current?.(update);
        })
        .catch(() => undefined);
    }
  };

  if (granted) {
    const { shells, stars, crabs } = tallyRef.current;
    return (
      <GameCard title="Tide Pools" accent={accent} onLayout={onLayout}>
        <GameResults
          title="The tide rolls back in"
          flavor={
            `${shells} shell${shells === 1 ? "" : "s"} and ${stars} starfish gathered${crabs > 0 ? `, ${crabs} pinch${crabs === 1 ? "" : "es"} to remember them by` : ""}.` +
            (newShells.length > 0 ? ` New for the collections book: ${newShells.join(", ")}!` : "")
          }
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const timeLeft = secondsLeft;
  const chartW = sceneW - 28;

  return (
    <GameCard title="Tide Pools" accent={accent} onLayout={onLayout}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>{Math.ceil(timeLeft)}s of low tide</Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>Score: {score}</Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: "#E0F2FE", marginTop: 7, overflow: "hidden" }}>
          <View style={{ height: 6, width: `${(timeLeft / DURATION_S) * 100}%`, backgroundColor: accent, borderRadius: 3 }} />
        </View>

        {/* the shore */}
        <View
          style={{
            marginTop: 12,
            height: ready ? sceneH : 200,
            borderRadius: 14,
            overflow: "hidden",
            backgroundColor: "#FDE9C8",
            position: "relative",
          }}
        >
          {ready && (
            <Svg width={chartW} height={sceneH} viewBox={`0 0 ${chartW} ${sceneH}`}>
              {/* wet sand sheen */}
              <Rect x={0} y={0} width={chartW} height={sceneH} fill="#FDE9C8" />
              <Path d={`M0 ${sceneH * 0.06} Q ${chartW * 0.3} ${sceneH * 0.0} ${chartW * 0.62} ${sceneH * 0.07} T ${chartW} ${sceneH * 0.05} V0 H0 Z`} fill="#BAE6FD" opacity={0.8} />
              {/* the pools */}
              {POOLS.map((p, i) => (
                <G key={i}>
                  <Ellipse cx={p.cx * chartW} cy={p.cy * sceneH} rx={p.rx * chartW} ry={p.ry * sceneH} fill="#A8D8EA" />
                  <Ellipse cx={p.cx * chartW} cy={p.cy * sceneH} rx={p.rx * chartW * 0.8} ry={p.ry * sceneH * 0.74} fill="#C4E7F5" />
                  <Ellipse cx={p.cx * chartW * 0.94} cy={p.cy * sceneH * 0.9} rx={p.rx * chartW * 0.4} ry={p.ry * sceneH * 0.36} fill="#E0F4FB" opacity={0.8} />
                </G>
              ))}
              {/* scattered pebbles */}
              {[
                [0.1, 0.62], [0.86, 0.55], [0.16, 0.86], [0.9, 0.88], [0.62, 0.5],
              ].map(([fx, fy], i) => (
                <Ellipse key={i} cx={fx * chartW} cy={fy * sceneH} rx={5} ry={3.4} fill="#D6C39A" />
              ))}
            </Svg>
          )}
          {/* surfaced finds */}
          {ready &&
            finds.map((f) => {
              const pool = POOLS[f.pool];
              const x = (pool.cx + f.ox * pool.rx) * chartW;
              const y = (pool.cy + f.oy * pool.ry) * sceneH;
              const icon = f.kind === "shell" ? f.shell!.icon : f.kind;
              const color = f.kind === "shell" ? f.shell!.color : f.kind === "starfish" ? "#FB923C" : "#DC2626";
              const scale = f.anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
              return (
                <Pressable
                  key={f.id}
                  onPressIn={() => tapFind(f)}
                  style={{
                    position: "absolute",
                    left: x - 21,
                    top: y - 21,
                    width: 42,
                    height: 42,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Animated.View style={{ opacity: f.anim, transform: [{ scale }], alignItems: "center", justifyContent: "center" }}>
                    <ShellArt icon={icon} color={color} size={34} />
                  </Animated.View>
                </Pressable>
              );
            })}
          {/* pinch flash — flat red, no bounce */}
          {pinched && (
            <View
              pointerEvents="none"
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(220,38,38,0.22)", alignItems: "center", justifyContent: "flex-start", paddingTop: 10 }}
            >
              <Text style={{ color: "#991B1B", fontWeight: "900", fontSize: 15 }}>Pinched! −4</Text>
            </View>
          )}
          {!ready && (
            <Text style={{ color: "#A08B62", textAlign: "center", marginTop: 84, fontSize: 13 }}>Watching the tide go out…</Text>
          )}
        </View>
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Tap shells and starfish while they surface. Every shell is a real find for the collections book — the crabs are not. Leave them be.
        </Text>
        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
