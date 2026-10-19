// River of Life: a riverside camp map. The pawn and villagers fish by hand
// (no auto-fishing), sell the daily catch for coins, and upgrade the camp.
// Each camp level looks visibly richer: tents -> outpost with dock ->
// full riverside retreat with cabins and lanterns.

import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import {
  RIVER_LEVELS,
  RIVER_LEVEL_NAMES,
  randomFishName,
  type RiverLevel,
  type RiverState,
} from "@/lib/river";
import { SKY_THEMES, type PageTheme, type TimeOfDay } from "@/lib/daynight";
import { InteriorAtmosphere } from "@/components/interior-atmosphere";
import { getHolidaySeason, getSeason } from "@/lib/seasons";

export type RiverCampProps = {
  river: RiverState;
  timeOfDay: TimeOfDay;
  pt: PageTheme;
  /** Tunic color from equipped clothes, so the pawn looks like yours. */
  tunicColor: string;
  /** First names of prayed people — a deterministic daily pick fish here. */
  villagerNames: string[];
  onCatch: (fishName: string) => void;
  onSell: () => void;
  onUpgrade: () => void;
};

const SCENE_W = 360;
const SCENE_H = 520;

/* Region boundaries (y): sky 0-200, river 200-330, bank 330-365, camp 365-520. */
const RIVER_TOP = 200;
const RIVER_BOTTOM = 330;
const BANK_BOTTOM = 365;

/* ------------------------------------------------------------------ */
/* Deterministic daily villager pick                                   */
/* ------------------------------------------------------------------ */

/** Rotate through the names deterministically by seed (the river's day). */
function pickVillagers(names: string[], count: number, seed: string): string[] {
  if (names.length === 0) return [];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const picked: string[] = [];
  const n = Math.min(count, names.length);
  for (let i = 0; i < n; i++) picked.push(names[(h + i * 3) % names.length]);
  return picked;
}

/* ------------------------------------------------------------------ */
/* Small SVG building blocks                                           */
/* ------------------------------------------------------------------ */

/** Golden prayer light (a villager) with a soft halo. */
function VillagerLight({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={r * 1.9} fill="#FFD66B" opacity={0.28} />
      <Circle cx={x} cy={y} r={r * 1.35} fill="#FFD66B" opacity={0.5} />
      <Circle cx={x} cy={y} r={r} fill="#FFE9A8" />
      <Circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.35} fill="#FFFFFF" opacity={0.9} />
    </G>
  );
}

/** A villager light fishing: halo plus a tiny rod reaching into the water. */
function FishingVillager({ x, groundY, bobber }: { x: number; groundY: number; bobber: { x: number; y: number } }) {
  return (
    <G>
      <VillagerLight x={x} y={groundY - 10} r={6} />
      <Line x1={x + 5} y1={groundY - 12} x2={bobber.x - 6} y2={bobber.y - 26} stroke="#8B5E34" strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={bobber.x - 6} y1={bobber.y - 26} x2={bobber.x} y2={bobber.y} stroke="#D6C9A8" strokeWidth={1.2} />
      <Circle cx={bobber.x} cy={bobber.y} r={3.5} fill="#EF4444" />
      <Circle cx={bobber.x} cy={bobber.y - 2} r={1.4} fill="#FFFFFF" />
    </G>
  );
}

/** Canvas tent: triangle with a center pole and a pegged flap line. */
function Tent({ x, baseY, w, h, canvas = "#E8DCC8", trim = "#C9B68A" }: { x: number; baseY: number; w: number; h: number; canvas?: string; trim?: string }) {
  return (
    <G>
      <Polygon points={`${x},${baseY} ${x + w / 2},${baseY - h} ${x + w},${baseY}`} fill={canvas} stroke={trim} strokeWidth={2} strokeLinejoin="round" />
      <Line x1={x + w / 2} y1={baseY - h} x2={x + w / 2} y2={baseY - h - 10} stroke="#8B5E34" strokeWidth={2.5} />
      <Polygon points={`${x + w / 2},${baseY - h - 10} ${x + w / 2 + 14},${baseY - h - 6} ${x + w / 2},${baseY - h - 2}`} fill="#B45309" />
      <Line x1={x + w / 2} y1={baseY} x2={x + w / 2} y2={baseY - h * 0.62} stroke={trim} strokeWidth={2} />
    </G>
  );
}

/** Wooden cabin with shingled roof, door, chimney, and a window that glows at night. */
function Cabin({ x, baseY, w, h, lit }: { x: number; baseY: number; w: number; h: number; lit: boolean }) {
  const roofH = h * 0.42;
  return (
    <G>
      <Rect x={x} y={baseY - h} width={w} height={h} fill="#8B5E34" stroke="#6B4423" strokeWidth={2} rx={2} />
      {[0.2, 0.45, 0.7].map((f) => (
        <Line key={f} x1={x} y1={baseY - h * f} x2={x + w} y2={baseY - h * f} stroke="#6B4423" strokeWidth={1} opacity={0.6} />
      ))}
      <Polygon
        points={`${x - 6},${baseY - h} ${x + w / 2},${baseY - h - roofH} ${x + w + 6},${baseY - h}`}
        fill="#5B3A1E"
        stroke="#4A2E16"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Rect x={x + w - 22} y={baseY - h - roofH - 10} width={12} height={22} fill="#6B4423" />
      <Rect x={x + w / 2 - 9} y={baseY - 30} width={18} height={30} fill="#4A2E16" rx={2} />
      <Rect x={x + 12} y={baseY - h + 14} width={16} height={16} fill={lit ? "#FFD66B" : "#BEE3F8"} stroke="#4A2E16" strokeWidth={2} />
      {lit && <Circle cx={x + 20} cy={baseY - h + 22} r={16} fill="#FFD66B" opacity={0.25} />}
    </G>
  );
}

/** Pine tree: stacked triangles on a trunk. */
function Pine({ x, baseY, s = 1, dark = false }: { x: number; baseY: number; s?: number; dark?: boolean }) {
  const leaf = dark ? "#2E5B3A" : "#3E7A4E";
  return (
    <G>
      <Rect x={x - 3 * s} y={baseY - 14 * s} width={6 * s} height={14 * s} fill="#6B4423" />
      <Polygon points={`${x},${baseY - 62 * s} ${x - 20 * s},${baseY - 18 * s} ${x + 20 * s},${baseY - 18 * s}`} fill={leaf} />
      <Polygon points={`${x},${baseY - 76 * s} ${x - 15 * s},${baseY - 38 * s} ${x + 15 * s},${baseY - 38 * s}`} fill={leaf} />
    </G>
  );
}

/** River reeds at the bank edge. */
function Reeds({ x, baseY, night }: { x: number; baseY: number; night: boolean }) {
  const c = night ? "#2E5B3A" : "#4E8A5E";
  return (
    <G>
      {[0, 7, 14].map((dx, i) => (
        <G key={i}>
          <Line x1={x + dx} y1={baseY} x2={x + dx + (i - 1) * 3} y2={baseY - 22 - i * 4} stroke={c} strokeWidth={2.5} strokeLinecap="round" />
          <Ellipse cx={x + dx + (i - 1) * 3} cy={baseY - 26 - i * 4} rx={3} ry={6} fill="#8B5E34" />
        </G>
      ))}
    </G>
  );
}

/** A fish glyph for the creel display. */
export function FishGlyph({ size = 14, color = "#3B82F6" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 14">
      <Ellipse cx={8} cy={7} rx={7} ry={4.5} fill={color} />
      <Polygon points="14,7 20,2 20,12" fill={color} />
      <Circle cx={5} cy={6} r={1.1} fill="#FFFFFF" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* The pawn, fishing                                                    */
/* ------------------------------------------------------------------ */

function Pawn({
  x,
  groundY,
  tunicColor,
  rodTip,
  bobber,
}: {
  x: number;
  groundY: number;
  tunicColor: string;
  rodTip: { x: number; y: number };
  bobber: { x: number; y: number };
}) {
  const headY = groundY - 34;
  return (
    <G>
      {/* shadow */}
      <Ellipse cx={x} cy={groundY + 2} rx={12} ry={3.5} fill="#000000" opacity={0.18} />
      {/* legs */}
      <Rect x={x - 7} y={groundY - 14} width={6} height={14} fill="#4A3728" rx={2} />
      <Rect x={x + 1} y={groundY - 14} width={6} height={14} fill="#4A3728" rx={2} />
      {/* tunic body */}
      <Rect x={x - 9} y={headY + 6} width={18} height={22} fill={tunicColor} rx={5} />
      <Rect x={x - 9} y={headY + 22} width={18} height={4} fill="#000000" opacity={0.12} />
      {/* head */}
      <Circle cx={x} cy={headY} r={8} fill="#E8B98A" />
      <Path d={`M ${x - 8} ${headY - 2} A 8 8 0 0 1 ${x + 8} ${headY - 2}`} fill="#5B3A1E" />
      {/* arm holding the rod */}
      <Line x1={x + 7} y1={headY + 12} x2={rodTip.x - 14} y2={rodTip.y + 8} stroke="#E8B98A" strokeWidth={5} strokeLinecap="round" />
      {/* rod */}
      <Line x1={x + 7} y1={headY + 12} x2={rodTip.x} y2={rodTip.y} stroke="#8B5E34" strokeWidth={3} strokeLinecap="round" />
      {/* line + bobber */}
      <Line x1={rodTip.x} y1={rodTip.y} x2={bobber.x} y2={bobber.y} stroke="#EDE9FE" strokeWidth={1.4} />
      <Circle cx={bobber.x} cy={bobber.y} r={4.5} fill="#EF4444" />
      <Circle cx={bobber.x} cy={bobber.y - 2.5} r={1.8} fill="#FFFFFF" />
    </G>
  );
}

/* ------------------------------------------------------------------ */
/* Campfire                                                             */
/* ------------------------------------------------------------------ */

/** Campfire base: stone ring, crossed logs, optional night glow. The flame
 * itself is drawn separately (FlameArt) so it can flicker in an overlay. */
function CampfireBase({ x, baseY, night }: { x: number; baseY: number; night: boolean }) {
  return (
    <G>
      {night && <Circle cx={x} cy={baseY - 18} r={64} fill="#F59E0B" opacity={0.16} />}
      {/* stone ring */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const a = (i / 7) * Math.PI * 2;
        return <Circle key={i} cx={x + Math.cos(a) * 26} cy={baseY + Math.sin(a) * 8} r={5.5} fill="#9CA3AF" stroke="#6B7280" strokeWidth={1} />;
      })}
      {/* logs */}
      <Line x1={x - 16} y1={baseY - 2} x2={x + 16} y2={baseY - 10} stroke="#6B4423" strokeWidth={6} strokeLinecap="round" />
      <Line x1={x - 16} y1={baseY - 10} x2={x + 16} y2={baseY - 2} stroke="#7C4A24" strokeWidth={6} strokeLinecap="round" />
    </G>
  );
}

/** Flame, sized by camp level — rendered in a flickering overlay. */
function FlameArt({ x, y, level }: { x: number; y: number; level: RiverLevel }) {
  const h = level === 1 ? 22 : level === 2 ? 30 : 38;
  return (
    <G>
      <Path
        d={`M ${x} ${y - h} C ${x + 12} ${y - 16} ${x + 8} ${y} ${x} ${y} C ${x - 8} ${y} ${x - 12} ${y - 16} ${x} ${y - h} Z`}
        fill="#F59E0B"
      />
      <Path
        d={`M ${x} ${y - h * 0.55} C ${x + 6} ${y - 10} ${x + 4} ${y} ${x} ${y} C ${x - 4} ${y} ${x - 6} ${y - 10} ${x} ${y - h * 0.55} Z`}
        fill="#FDE68A"
      />
    </G>
  );
}

/** Log seat around the fire. */
function LogSeat({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
  return (
    <G transform={`rotate(${rot} ${x} ${y})`}>
      <Rect x={x - 22} y={y - 8} width={44} height={16} fill="#8B5E34" stroke="#6B4423" strokeWidth={1.5} rx={8} />
      <Ellipse cx={x - 22} cy={y} rx={5} ry={8} fill="#C9A06A" />
    </G>
  );
}

/* ------------------------------------------------------------------ */
/* Wooden dock into the river                                           */
/* ------------------------------------------------------------------ */

function Dock({ x, fromY, toY, lanterns, night }: { x: number; fromY: number; toY: number; lanterns: boolean; night: boolean }) {
  const w = 36;
  const planks = Math.max(2, Math.round((fromY - toY) / 16));
  return (
    <G>
      {/* posts */}
      {[x + 2, x + w - 2].map((px) =>
        [toY + 4, fromY - 8].map((py) => (
          <Rect key={`${px}:${py}`} x={px - 3} y={py} width={6} height={fromY - py + 6} fill="#6B4423" rx={2} />
        ))
      )}
      {/* planks */}
      {Array.from({ length: planks }).map((_, i) => {
        const py = toY + (i * (fromY - toY)) / planks;
        return <Rect key={i} x={x} y={py} width={w} height={13} fill={i % 2 ? "#8B5E34" : "#9A6B3D"} stroke="#6B4423" strokeWidth={1} />;
      })}
      {/* lantern posts at the far end */}
      {lanterns &&
        [x + 2, x + w - 2].map((px) => (
          <G key={px}>
            <Rect x={px - 2.5} y={toY - 34} width={5} height={34} fill="#4A2E16" />
            <Line x1={px} y1={toY - 34} x2={px + (px < x + w / 2 ? 10 : -10)} y2={toY - 34} stroke="#4A2E16" strokeWidth={3} />
            <Circle cx={px + (px < x + w / 2 ? 10 : -10)} cy={toY - 28} r={6} fill="#FFD66B" stroke="#8B5E34" strokeWidth={1.5} />
            {night && <Circle cx={px + (px < x + w / 2 ? 10 : -10)} cy={toY - 28} r={16} fill="#FFD66B" opacity={0.28} />}
          </G>
        ))}
    </G>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                       */
/* ------------------------------------------------------------------ */

export function RiverCamp({ river, timeOfDay, pt, tunicColor, villagerNames, onCatch, onSell, onUpgrade }: RiverCampProps) {
  const level = river.level;
  const info = RIVER_LEVELS[level];
  const night = timeOfDay === "night";
  const sky = SKY_THEMES[timeOfDay];

  const water = night ? "#1C4E80" : timeOfDay === "evening" ? "#2E86C1" : timeOfDay === "morning" ? "#57B8E0" : "#3FA7DC";
  const grass = night ? "#234A32" : "#7FB069";
  const sand = night ? "#6B5B3E" : "#D9BE8C";

  const done = river.caughtToday >= info.fishPerDay;

  /* Fishing flow: idle -> cast (splash) -> waiting -> catch toast. */
  const [phase, setPhase] = useState<"idle" | "cast" | "waiting">("idle");
  const [toast, setToast] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  /* Animated: river wave drift, flame flicker, bobber bob, cast splash. */
  const drift = useRef(new Animated.Value(0)).current;
  const flicker = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const splash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const driftLoop = Animated.loop(
      Animated.timing(drift, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true })
    );
    const flickerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    driftLoop.start(); flickerLoop.start(); bobLoop.start();
    return () => { driftLoop.stop(); flickerLoop.stop(); bobLoop.stop(); };
  }, [drift, flicker, bob]);
  const driftX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -80] });
  const flameScale = flicker.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.1] });
  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });

  const runSplash = () => {
    splash.setValue(0);
    Animated.timing(splash, { toValue: 1, duration: 650, easing: Easing.out(Easing.sin), useNativeDriver: true }).start();
  };
  const splashScale = splash.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] });
  const splashOpacity = splash.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] });

  const handleCast = () => {
    if (phase !== "idle" || done) return;
    setPhase("cast");
    setToast(null);
    runSplash();
    timers.current.push(setTimeout(() => {
      setPhase("waiting");
      const wait = 1500 + Math.random() * 1000; // 1.5 - 2.5 s on the line
      timers.current.push(setTimeout(() => {
        const fish = randomFishName();
        onCatch(fish);
        setToast(`Caught a ${fish}!`);
        setPhase("idle");
        timers.current.push(setTimeout(() => setToast(null), 2600));
      }, wait));
    }, 700));
  };

  /* Villagers: deterministic daily pick. Nights gather at the fire; days fish. */
  const villagers = useMemo(
    () => pickVillagers(villagerNames, 5, river.day),
    [villagerNames, river.day]
  );

  /* Where the pawn fishes. */
  const fishSpot =
    level === 1
      ? { ground: { x: 70, y: 356 }, rodTip: { x: 112, y: 272 }, bobber: { x: 118, y: 312 } }
      : level === 2
        ? { ground: { x: 168, y: 262 }, rodTip: { x: 208, y: 210 }, bobber: { x: 214, y: 268 } }
        : { ground: { x: 168, y: 242 }, rodTip: { x: 208, y: 192 }, bobber: { x: 214, y: 254 } };

  const firePos = { x: 186, y: 468 };

  const sellCoins = (river.creel * info.coinPerFish).toFixed(2);
  const nextInfo = level < 3 ? RIVER_LEVELS[(level + 1) as RiverLevel] : null;

  const wavePath = (y: number, w: number, amp: number) => {
    let d = `M -80 ${y}`;
    for (let x = -80; x < w + 80; x += 40) d += ` Q ${x + 10} ${y - amp} ${x + 20} ${y} T ${x + 40} ${y}`;
    return d;
  };

  return (
    <View style={{ width: SCENE_W, alignSelf: "center" }}>
      <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: sky.bg }}>
        <InteriorAtmosphere holiday={getHolidaySeason()} season={getSeason()} building="river" />
        <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
          {/* sky */}
          <Rect x={0} y={0} width={SCENE_W} height={RIVER_TOP} fill={sky.bg} />
          {sky.showSun ? (
            <Circle cx={308} cy={52} r={24} fill={sky.orb} opacity={0.9} />
          ) : (
            <G>
              <Circle cx={308} cy={52} r={20} fill="#F4F1DE" opacity={0.95} />
              <Circle cx={300} cy={46} r={17} fill={sky.bg} opacity={0.9} />
              {[[40, 40], [90, 90], [150, 34], [210, 70], [260, 110], [120, 140]].map(([sx, sy], i) => (
                <Circle key={i} cx={sx} cy={sy} r={1.8} fill="#FFFFFF" opacity={0.8} />
              ))}
            </G>
          )}

          {/* treeline behind the river */}
          <Pine x={24} baseY={RIVER_TOP + 6} s={1.1} dark={night} />
          <Pine x={336} baseY={RIVER_TOP + 6} s={1.2} dark={night} />
          <Pine x={300} baseY={RIVER_TOP + 10} s={0.8} dark={night} />

          {/* river */}
          <Rect x={0} y={RIVER_TOP} width={SCENE_W} height={RIVER_BOTTOM - RIVER_TOP} fill={water} />
          <Rect x={0} y={RIVER_TOP} width={SCENE_W} height={6} fill="#FFFFFF" opacity={0.25} />

          {/* camp ground + bank */}
          <Rect x={0} y={RIVER_BOTTOM} width={SCENE_W} height={BANK_BOTTOM - RIVER_BOTTOM} fill={sand} />
          <Rect x={0} y={BANK_BOTTOM} width={SCENE_W} height={SCENE_H - BANK_BOTTOM} fill={grass} />
        </Svg>

        {/* drifting wave layers over the river */}
        <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, transform: [{ translateX: driftX }] }}>
          <Svg width={SCENE_W + 160} height={SCENE_H} viewBox={`-80 0 ${SCENE_W + 160} ${SCENE_H}`}>
            <Path d={wavePath(232, SCENE_W, 7)} fill="none" stroke="#FFFFFF" strokeWidth={3} opacity={0.4} strokeLinecap="round" />
            <Path d={wavePath(292, SCENE_W, 8)} fill="none" stroke="#FFFFFF" strokeWidth={2.5} opacity={0.3} strokeLinecap="round" />
          </Svg>
        </Animated.View>
        <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, transform: [{ translateX: driftX }] }}>
          <Svg width={SCENE_W + 160} height={SCENE_H} viewBox={`-80 0 ${SCENE_W + 160} ${SCENE_H}`}>
            <Path d={wavePath(262, SCENE_W, 6)} fill="none" stroke="#E0F2FE" strokeWidth={2} opacity={0.45} strokeLinecap="round" />
            <Path d={wavePath(316, SCENE_W, 5)} fill="none" stroke="#E0F2FE" strokeWidth={2} opacity={0.35} strokeLinecap="round" />
          </Svg>
        </Animated.View>

        {/* camp + shoreline art, drawn above the water */}
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0 }}>
          <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
            {/* reeds at the shoreline */}
            <Reeds x={16} baseY={RIVER_BOTTOM + 4} night={night} />
            <Reeds x={318} baseY={RIVER_BOTTOM + 4} night={night} />
            {/* lily pads */}
            <Ellipse cx={90} cy={252} rx={12} ry={6} fill="#4E8A5E" opacity={0.8} />
            <Ellipse cx={272} cy={296} rx={14} ry={7} fill="#4E8A5E" opacity={0.8} />
            <Circle cx={90} cy={249} r={3} fill="#F9A8D4" />

            {level === 1 && (
              <G>
                {/* L1: simple riverside camp — two canvas tents, small fire */}
                <Tent x={36} baseY={486} w={64} h={52} />
                <Tent x={252} baseY={486} w={64} h={52} canvas="#DCE8D4" trim="#A9BFA0" />
                {/* two fishing posts on the bank */}
                {[150, 250].map((px) => (
                  <G key={px}>
                    <Rect x={px - 3} y={336} width={6} height={26} fill="#6B4423" rx={2} />
                  </G>
                ))}
              </G>
            )}

            {level === 2 && (
              <G>
                {/* L2: outpost — one bigger tent plus a small cabin, wooden dock, log seating */}
                <Tent x={30} baseY={490} w={74} h={60} />
                <Cabin x={246} baseY={492} w={76} h={56} lit={night} />
                <Dock x={150} fromY={RIVER_BOTTOM} toY={258} lanterns={false} night={night} />
                <LogSeat x={140} y={478} rot={-18} />
                <LogSeat x={232} y={478} rot={18} />
                <LogSeat x={186} y={500} rot={0} />
              </G>
            )}

            {level === 3 && (
              <G>
                {/* L3: riverside retreat — two cabins, long lantern-lit dock, hanging lanterns, garden */}
                <Cabin x={18} baseY={494} w={84} h={64} lit={night} />
                <Cabin x={258} baseY={494} w={84} h={64} lit={night} />
                <Dock x={150} fromY={RIVER_BOTTOM} toY={238} lanterns night={night} />
                {/* lantern string between two posts near the cabins */}
                <Rect x={112} y={420} width={5} height={52} fill="#4A2E16" />
                <Rect x={246} y={420} width={5} height={52} fill="#4A2E16" />
                <Path d="M 114 424 Q 180 452 248 424" fill="none" stroke="#4A2E16" strokeWidth={2} />
                {[140, 180, 220].map((lx, i) => {
                  const ly = 424 + Math.sin(((lx - 114) / 134) * Math.PI) * 22;
                  return (
                    <G key={i}>
                      <Line x1={lx} y1={ly - 2} x2={lx} y2={ly + 6} stroke="#4A2E16" strokeWidth={1.5} />
                      <Circle cx={lx} cy={ly + 12} r={6} fill="#FFD66B" stroke="#8B5E34" strokeWidth={1.5} />
                      {night && <Circle cx={lx} cy={ly + 12} r={17} fill="#FFD66B" opacity={0.3} />}
                    </G>
                  );
                })}
                {/* garden patch */}
                <G>
                  <Rect x={28} y={404} width={64} height={44} fill="#6B4423" rx={6} />
                  {[0, 1, 2].map((r) =>
                    [0, 1, 2, 3].map((c) => (
                      <Circle key={`${r}:${c}`} cx={38 + c * 16} cy={414 + r * 12} r={4.5} fill={night ? "#3E7A4E" : "#5BA85B"} />
                    ))
                  )}
                </G>
                {/* richer fire ring: four log seats */}
                <LogSeat x={136} y={476} rot={-20} />
                <LogSeat x={236} y={476} rot={20} />
                <LogSeat x={136} y={502} rot={-8} />
                <LogSeat x={236} y={502} rot={8} />
              </G>
            )}

            {/* campfire base always drawn here; the flame flickers in an overlay below */}
            <CampfireBase x={firePos.x} baseY={firePos.y} night={night} />

            {/* villagers: nights gather at the fire; days fish the bank */}
            {night ? (
              <G>
                {villagers.slice(0, 4).map((n, i) => {
                  const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
                  return <VillagerLight key={n + i} x={firePos.x + Math.cos(a) * 52} y={firePos.y - 14 + Math.sin(a) * 18} r={6} />;
                })}
                {villagers[4] && (
                  <FishingVillager x={52} groundY={BANK_BOTTOM - 4} bobber={{ x: 78, y: 300 }} />
                )}
              </G>
            ) : (
              <G>
                {villagers.slice(0, 3).map((n, i) => {
                  const spots = [
                    { x: 44, bobber: { x: 70, y: 300 } },
                    { x: 128, bobber: { x: 152, y: 310 } },
                    { x: 250, bobber: { x: 276, y: 300 } },
                  ];
                  const s = spots[i % spots.length];
                  return <FishingVillager key={n + i} x={s.x} groundY={BANK_BOTTOM - 4} bobber={s.bobber} />;
                })}
                {villagers.slice(3).map((n, i) => (
                  <VillagerLight key={n + i} x={firePos.x - 40 + i * 80} y={firePos.y - 12} r={6} />
                ))}
              </G>
            )}

          </Svg>

          {/* flame flicker overlay (flame size grows with camp level) */}
          <Animated.View
            style={{
              position: "absolute",
              left: firePos.x - 20,
              top: firePos.y - 8 - 50,
              width: 40,
              height: 56,
              transform: [{ scale: flameScale }],
            }}
          >
            <Svg width={40} height={56} viewBox="0 0 40 56">
              <FlameArt x={20} y={54} level={level} />
            </Svg>
          </Animated.View>

          {/* the pawn, fishing */}
          <Animated.View
            style={{
              position: "absolute",
              left: fishSpot.ground.x - 30,
              top: fishSpot.ground.y - 46,
              width: 60,
              height: 50,
              transform: [{ translateY: phase === "waiting" ? bobY : 0 }],
            }}
          >
            <Svg width={60} height={50} viewBox="0 0 60 50">
              <Pawn
                x={30}
                groundY={46}
                tunicColor={tunicColor}
                rodTip={{ x: fishSpot.rodTip.x - (fishSpot.ground.x - 30), y: fishSpot.rodTip.y - (fishSpot.ground.y - 46) }}
                bobber={{ x: fishSpot.bobber.x - (fishSpot.ground.x - 30), y: fishSpot.bobber.y - (fishSpot.ground.y - 46) }}
              />
            </Svg>
          </Animated.View>

          {/* cast splash ring */}
          {phase !== "idle" && (
            <Animated.View
              style={{
                position: "absolute",
                left: fishSpot.bobber.x - 12,
                top: fishSpot.bobber.y - 12,
                width: 24,
                height: 24,
                opacity: splashOpacity,
                transform: [{ scale: splashScale }],
              }}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Circle cx={12} cy={12} r={10} fill="none" stroke="#FFFFFF" strokeWidth={2.5} />
              </Svg>
            </Animated.View>
          )}

          {/* catch toast */}
          {toast && (
            <View
              style={{
                position: "absolute",
                top: 84,
                left: 60,
                right: 60,
                backgroundColor: "rgba(15, 40, 70, 0.88)",
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>{toast}</Text>
            </View>
          )}
        </View>
      </View>

      {/* control panel */}
      <View style={{ backgroundColor: pt.card, borderRadius: 16, padding: 16, marginTop: 12, borderWidth: 1, borderColor: pt.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
          <MaterialIcons name="waves" size={20} color="#2563EB" />
          <Text style={{ fontWeight: "800", fontSize: 17, color: pt.text, marginLeft: 8 }}>
            River of Life — {RIVER_LEVEL_NAMES[level]}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: pt.subtext, marginBottom: 10 }}>
          Caught today: {river.caughtToday} / {info.fishPerDay} · Creel: {river.creel} fish · Level {level} of 3
        </Text>

        {/* creel fish */}
        {river.creel > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 10 }}>
            {Array.from({ length: Math.min(river.creel, 12) }).map((_, i) => (
              <View key={i} style={{ marginRight: 4, marginBottom: 4 }}>
                <FishGlyph size={16} />
              </View>
            ))}
          </View>
        )}

        <Pressable
          onPress={handleCast}
          disabled={phase !== "idle" || done}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: done || phase !== "idle" ? "#9CA3AF" : "#1D4ED8",
            borderRadius: 12,
            paddingVertical: 13,
            marginBottom: 10,
            opacity: done || phase !== "idle" ? 0.75 : 1,
          }}
        >
          <MaterialIcons name="phishing" size={20} color="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16, marginLeft: 8 }}>
            {done ? "The river rests — come back tomorrow" : phase === "cast" ? "Casting..." : phase === "waiting" ? "Waiting for a bite..." : "Cast line"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onSell}
          disabled={river.creel === 0}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: river.creel === 0 ? "#E5E7EB" : "#059669",
            borderRadius: 12,
            paddingVertical: 12,
            marginBottom: 10,
          }}
        >
          <MaterialIcons name="sell" size={18} color={river.creel === 0 ? "#9CA3AF" : "#FFFFFF"} />
          <Text style={{ color: river.creel === 0 ? "#9CA3AF" : "#FFFFFF", fontWeight: "700", fontSize: 15, marginLeft: 8 }}>
            {river.creel === 0 ? "Creel is empty" : `Sell catch (${river.creel} fish → ${sellCoins} coins)`}
          </Text>
        </Pressable>

        {/* upgrade */}
        {nextInfo ? (
          <View style={{ borderTopWidth: 1, borderTopColor: pt.border, paddingTop: 10 }}>
            <Text style={{ fontSize: 13, color: pt.subtext, marginBottom: 6 }}>
              Upgrade to {RIVER_LEVEL_NAMES[(level + 1) as RiverLevel]}: {nextInfo.fishPerDay} fish/day · {nextInfo.coinPerFish} coins per fish
            </Text>
            <Pressable
              onPress={onUpgrade}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#7C3AED",
                borderRadius: 12,
                paddingVertical: 11,
              }}
            >
              <MaterialIcons name="upgrade" size={18} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15, marginLeft: 8 }}>
                Upgrade camp — {info.upgradeCost.toFixed(2)} coins
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ borderTopWidth: 1, borderTopColor: pt.border, paddingTop: 10, alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: pt.subtext }}>Fully upgraded — the riverside retreat is complete.</Text>
          </View>
        )}
      </View>
    </View>
  );
}
