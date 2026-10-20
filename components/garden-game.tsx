// Garden Tending — Community Garden mini-game.
// A 3×3 bed of plots. Every plant grows from sprout toward bloom, but
// the garden keeps needing hands: plants get thirsty (they droop and
// pale) and weeds keep sprouting. Tap a thirsty plant to water it,
// tap a weedy plot to pull the weeds — tend a plant long enough and
// it blooms. A plant ignored too long wilts back to a sprout. When a
// bloom opens, the host records a flower kind in the collections book
// (the same Garden Flowers set the Remembrance garden feeds).

import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { GameCard, GameResults, type MiniGameProps, type MiniGameReward } from "@/components/mini-game-scene";
import { FLOWER_KINDS } from "@/lib/collections";

const DURATION_S = 60;
const TICK_MS = 200;
const PLOTS = 9;
const NEGLECT_LIMIT = 30; // ticks (6s) an untended need lasts before wilting

/** Petal colors per FLOWER_KINDS entry. */
const FLOWER_COLORS = ["#E11D48", "#F59E0B", "#EAB308", "#8B5CF6", "#EC4899", "#60A5FA"];

type Plot = {
  id: number;
  /** 0 sprout → 100 ready to bloom */
  growth: number;
  thirsty: boolean;
  weedy: boolean;
  /** ticks the current need has gone untended */
  neglect: number;
  /** flower kind shown at bloom */
  kind: number;
  /** ticks left of bloom display */
  blooming: number;
};

function makePlot(id: number): Plot {
  return {
    id,
    growth: 8 + Math.random() * 22,
    thirsty: false,
    weedy: false,
    neglect: 0,
    kind: Math.floor(Math.random() * FLOWER_KINDS.length),
    blooming: 0,
  };
}

function PlantArt({ plot, size = 64 }: { plot: Plot; size?: number }) {
  const g = plot.growth / 100;
  const stemH = 12 + g * 22;
  const pale = plot.thirsty;
  const leaf = pale ? "#A3B18A" : "#4D7C0F";
  const stem = pale ? "#84A98C" : "#3F6212";
  const droop = pale ? 3.5 : 0;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* soil */}
      <Ellipse cx={32} cy={56} rx={24} ry={6} fill="#7C5A3A" />
      <Ellipse cx={32} cy={54.6} rx={24} ry={5.4} fill="#96754E" />
      {/* stem + leaves */}
      <Path d={`M32 55 C ${30 - droop} ${44 - stemH * 0.5}, ${34 + droop} ${40 - stemH * 0.4}, 32 ${55 - stemH}`} stroke={stem} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d={`M32 ${50 - stemH * 0.45} C 24 ${46 - stemH * 0.4}, 20 ${48 - stemH * 0.3}, 18 ${42 - stemH * 0.3} C 26 ${40 - stemH * 0.32}, 30 ${42 - stemH * 0.36}, 32 ${50 - stemH * 0.45} Z`} fill={leaf} />
      <Path d={`M32 ${47 - stemH * 0.55} C 40 ${43 - stemH * 0.5}, 44 ${45 - stemH * 0.4}, 46 ${39 - stemH * 0.4} C 38 ${37 - stemH * 0.42}, 34 ${39 - stemH * 0.46}, 32 ${47 - stemH * 0.55} Z`} fill={leaf} opacity={0.85} />
      {/* head: bud or bloom */}
      {plot.blooming > 0 ? (
        <>
          {[0, 72, 144, 216, 288].map((deg) => (
            <Ellipse
              key={deg}
              cx={32 + 6.4 * Math.sin((deg * Math.PI) / 180)}
              cy={50 - stemH - 6.4 * Math.cos((deg * Math.PI) / 180) - 2}
              rx={3.6}
              ry={5.6}
              fill={FLOWER_COLORS[plot.kind]}
              transform={`rotate(${deg} ${32 + 6.4 * Math.sin((deg * Math.PI) / 180)} ${50 - stemH - 6.4 * Math.cos((deg * Math.PI) / 180) - 2})`}
            />
          ))}
          <Circle cx={32} cy={48 - stemH} r={3.6} fill="#FDE68A" />
        </>
      ) : (
        <Circle cx={32} cy={52 - stemH} r={3 + g * 2.4} fill={pale ? "#B7C9A8" : "#65A30D"} />
      )}
      {/* weeds */}
      {plot.weedy && (
        <>
          <Path d="M14 56 C13 50, 11 48, 9 45 M15.5 56 C16 51, 18 49, 20 47" stroke="#588157" strokeWidth={2.2} fill="none" strokeLinecap="round" />
          <Path d="M50 56 C51 50, 53 48, 55 45 M48.5 56 C48 51, 46 49, 44 47" stroke="#588157" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        </>
      )}
      {/* thirsty droplet marker */}
      {plot.thirsty && (
        <Path d="M52 8 C52 8, 57.4 13.8, 57.4 17.4 a5.4 5.4 0 1 1 -10.8 0 C46.6 13.8, 52 8, 52 8 Z" fill="#38BDF8" />
      )}
    </Svg>
  );
}

export type GardenGameProps = MiniGameProps & {
  /** Called when a plant blooms, with its flower kind (0..5). */
  onBloom?: (kind: number) => void;
};

export function GardenGame({ accent, onComplete, onExit, onBloom }: GardenGameProps) {
  const [plots, setPlots] = useState<Plot[]>(() => Array.from({ length: PLOTS }, (_, i) => makePlot(i)));
  const [elapsed, setElapsed] = useState(0);
  const [stats, setStats] = useState({ blooms: 0, cares: 0, wilts: 0 });
  const [granted, setGranted] = useState<MiniGameReward | null>(null);

  const plotsRef = useRef(plots);
  const statsRef = useRef({ blooms: 0, cares: 0, wilts: 0 });
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onBloomRef = useRef(onBloom);
  onBloomRef.current = onBloom;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    const { blooms, cares } = statsRef.current;
    setGranted(
      onCompleteRef.current({
        coins: Math.min(84, blooms * 9 + cares * 2),
        xp: Math.min(78, blooms * 7 + cares * 2),
      })
    );
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const startAt = Date.now();
    const timer = setInterval(() => {
      if (completedRef.current) return;
      const now = Date.now();
      const elapsedMs = now - startAt;
      setElapsed(elapsedMs / 1000);

      const next = plotsRef.current.map((p) => ({ ...p }));
      for (const p of next) {
        if (p.blooming > 0) {
          p.blooming -= 1;
          if (p.blooming <= 0) {
            // bloom gathered; a fresh sprout takes its place
            p.growth = 6 + Math.random() * 10;
            p.kind = Math.floor(Math.random() * FLOWER_KINDS.length);
            p.thirsty = false;
            p.weedy = false;
            p.neglect = 0;
          }
          continue;
        }
        // needs arise
        if (!p.thirsty && Math.random() < 0.016) p.thirsty = true;
        if (!p.weedy && Math.random() < 0.013) p.weedy = true;
        if (p.thirsty || p.weedy) {
          p.neglect += 1;
          if (p.neglect >= NEGLECT_LIMIT) {
            // wilted back to a sprout — the garden forgives, try again
            p.growth = 6;
            p.thirsty = false;
            p.weedy = false;
            p.neglect = 0;
            statsRef.current = { ...statsRef.current, wilts: statsRef.current.wilts + 1 };
          }
        } else {
          p.growth = Math.min(100, p.growth + 1.15);
          if (p.growth >= 100) {
            p.blooming = 14; // ~2.8s of bloom
            p.growth = 0;
            statsRef.current = { ...statsRef.current, blooms: statsRef.current.blooms + 1 };
            onBloomRef.current?.(p.kind);
          }
        }
      }
      plotsRef.current = next;
      setPlots(next);
      setStats({ ...statsRef.current });

      if (elapsedMs >= DURATION_S * 1000) finish();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [finish]);

  const tend = (id: number) => {
    if (completedRef.current) return;
    const next = plotsRef.current.map((p) => ({ ...p }));
    const p = next.find((x) => x.id === id);
    if (!p || p.blooming > 0) return;
    if (p.thirsty) {
      p.thirsty = false;
      p.neglect = 0;
      p.growth = Math.min(99, p.growth + 7);
      statsRef.current = { ...statsRef.current, cares: statsRef.current.cares + 1 };
    } else if (p.weedy) {
      p.weedy = false;
      p.neglect = 0;
      p.growth = Math.min(99, p.growth + 5);
      statsRef.current = { ...statsRef.current, cares: statsRef.current.cares + 1 };
    } else {
      return; // nothing to tend here right now
    }
    plotsRef.current = next;
    setPlots(next);
    setStats({ ...statsRef.current });
  };

  if (granted) {
    return (
      <GameCard title="Garden Tending" accent={accent}>
        <GameResults
          title="The garden rests"
          flavor={`${stats.blooms} bloom${stats.blooms === 1 ? "" : "s"} opened under your hands, ${stats.cares} kindnesses along the way${stats.wilts > 0 ? `, and ${stats.wilts} plant${stats.wilts === 1 ? "" : "s"} wilted — they'll try again tomorrow` : ""}. What you tend, grows.`}
          granted={granted}
          accent={accent}
          onDone={onExit}
        />
      </GameCard>
    );
  }

  const timeLeft = Math.max(0, DURATION_S - elapsed);

  return (
    <GameCard title="Garden Tending" accent={accent}>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>{Math.ceil(timeLeft)}s left</Text>
          <Text style={{ color: "#78716C", fontSize: 12, fontWeight: "700" }}>
            Blooms: {stats.blooms} · Tended: {stats.cares}
          </Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: "#E7E5D9", marginTop: 7, overflow: "hidden" }}>
          <View style={{ height: 6, width: `${(timeLeft / DURATION_S) * 100}%`, backgroundColor: accent, borderRadius: 3 }} />
        </View>

        {/* the beds */}
        <View style={{ marginTop: 12, borderRadius: 14, backgroundColor: "#F3ECD9", padding: 10, borderWidth: 1, borderColor: "#E3D5B8" }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {plots.map((p) => {
              const needy = p.thirsty || p.weedy;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => tend(p.id)}
                  style={{
                    width: "31.5%",
                    aspectRatio: 1,
                    marginBottom: 8,
                    borderRadius: 12,
                    backgroundColor: p.blooming > 0 ? "#FDF6D8" : "#EFE6CC",
                    borderWidth: 2,
                    borderColor: p.blooming > 0 ? "#EAB308" : needy ? "#38BDF8" : "#DCCFA9",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <PlantArt plot={p} size={58} />
                  {/* growth sliver */}
                  <View style={{ position: "absolute", bottom: 5, left: 10, right: 10, height: 4, borderRadius: 2, backgroundColor: "#D8CCA6", overflow: "hidden" }}>
                    <View style={{ height: 4, width: `${p.blooming > 0 ? 100 : p.growth}%`, backgroundColor: "#65A30D" }} />
                  </View>
                  {needy && (
                    <View style={{ position: "absolute", top: 4, left: 6, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, fontWeight: "800", color: p.thirsty ? "#0284C7" : "#4D7C0F" }}>
                        {p.thirsty ? "WATER" : "WEEDS"}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={{ color: "#A08B7A", fontSize: 12, textAlign: "center", marginTop: 10 }}>
          Tap a drooping plant to water it, a weedy plot to clear it. Untended plants wilt — tended ones bloom, and every bloom is gathered into the collections book.
        </Text>
        <Pressable onPress={onExit} style={{ alignSelf: "center", marginTop: 6, paddingVertical: 6, paddingHorizontal: 14 }}>
          <Text style={{ color: "#A08B7A", fontWeight: "700", fontSize: 13 }}>Leave early</Text>
        </Pressable>
      </View>
    </GameCard>
  );
}
