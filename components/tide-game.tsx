// Tide Pools — Mercy's Shore mini-game.
// Three pools in the wet sand. Shells, starfish, and the occasional
// crab surface for a breath, then slip away. Tap shells and starfish
// to gather them; leave the crabs alone — a pinch costs points and
// stings (a plain red flash; nothing bounces here). Every shell is a
// real species from the collections book: the host records finds via
// onShellUpdate, exactly the way the River records fish.

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Ellipse, G, Path, Rect } from "react-native-svg";
import { GameCard, GameResults, useSceneBox, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";
import { ShellArt } from "@/components/shell-art";
import { randomShellSpecies, recordShellFind, type CollectionUpdate, type ShellSpecies } from "@/lib/collections";

const DURATION_S = 45;
const TICK_MS = 100;
const MAX_ALIVE = 4;

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
  age: number;
  lifeMs: number;
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
  const [elapsed, setElapsed] = useState(0);
  const [pinched, setPinched] = useState(false);
  const [newShells, setNewShells] = useState<string[]>([]);
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const findsRef = useRef<Find[]>([]);
  const tallyRef = useRef({ shells: 0, stars: 0, crabs: 0 });
  const lastSpawnRef = useRef(0);
  const pinchUntilRef = useRef(0);
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onShellRef = useRef(onShellUpdate);
  onShellRef.current = onShellUpdate;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const { shells, stars } = tallyRef.current;
    setGranted(
      onCompleteRef.current({
        coins: Math.min(50, shells * 2 + stars),
        xp: Math.min(48, shells * 2 + stars * 2),
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

      if (now - lastSpawnRef.current > 620 + Math.random() * 420 && findsRef.current.length < MAX_ALIVE) {
        lastSpawnRef.current = now;
        const roll = Math.random();
        const kind: FindKind = roll < 0.58 ? "shell" : roll < 0.84 ? "starfish" : "crab";
        findsRef.current = [
          ...findsRef.current,
          {
            id: ++findId,
            kind,
            shell: kind === "shell" ? randomShellSpecies() : undefined,
            pool: Math.floor(Math.random() * POOLS.length),
            ox: (Math.random() - 0.5) * 1.1,
            oy: (Math.random() - 0.5) * 1.1,
            age: 0,
            lifeMs: 1500 + Math.random() * 900,
          },
        ];
      }

      const next = findsRef.current
        .map((f) => ({ ...f, age: f.age + dt }))
        .filter((f) => f.age < f.lifeMs);
      findsRef.current = next;
      setFinds(next);

      if (pinchUntilRef.current && now > pinchUntilRef.current) {
        pinchUntilRef.current = 0;
        setPinched(false);
      }

      if (elapsedMs >= DURATION_S * 1000) finish();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [ready, finish]);

  const tapFind = (f: Find) => {
    if (completedRef.current) return;
    findsRef.current = findsRef.current.filter((x) => x.id !== f.id);
    setFinds(findsRef.current);
    if (f.kind === "crab") {
      tallyRef.current = { ...tallyRef.current, crabs: tallyRef.current.crabs + 1 };
      setScore((s) => Math.max(0, s - 4));
      setPinched(true);
      pinchUntilRef.current = Date.now() + 300;
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

  const timeLeft = Math.max(0, DURATION_S - elapsed);
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
              const fadeIn = Math.min(1, f.age / 220);
              const fadeOut = Math.min(1, Math.max(0, (f.lifeMs - f.age) / 260));
              const opacity = Math.min(fadeIn, fadeOut);
              const icon = f.kind === "shell" ? f.shell!.icon : f.kind;
              const color = f.kind === "shell" ? f.shell!.color : f.kind === "starfish" ? "#FB923C" : "#DC2626";
              return (
                <Pressable
                  key={f.id}
                  onPress={() => tapFind(f)}
                  style={{
                    position: "absolute",
                    left: x - 21,
                    top: y - 21,
                    width: 42,
                    height: 42,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity,
                  }}
                >
                  <ShellArt icon={icon} color={color} size={34} />
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
