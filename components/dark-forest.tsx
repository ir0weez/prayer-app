// Dark Forest: a pixel-art demon-battling mini game.
// Tap STRIKE to attack. Your equipped gear is your power — better blades
// and armor from the Weaponsmith and Armory let you push deeper.
// "Pray" heals once per battle. No auto-battle: Jonathan taps.

import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Svg, { Circle, G, Rect } from "react-native-svg";
import { demonForWave, type DarkForestState, type DemonDef } from "@/lib/dark-forest";
import type { CombatStats } from "@/lib/gear";
import type { PageTheme, TimeOfDay } from "@/lib/daynight";

export type DarkForestProps = {
  stats: CombatStats;
  forest: DarkForestState;
  /** Tunic color from equipped clothes, so the pawn looks like yours. */
  tunicColor: string;
  /** Equipped armor id (lib/gear) — drawn on the pawn sprite. */
  armorId: string | null;
  /** Equipped weapon id (lib/gear) — drawn in the pawn's hand. */
  weaponId: string | null;
  timeOfDay: TimeOfDay;
  pt: PageTheme;
  onVictory: (wave: number) => void;
};

const SCENE_W = 360;
const SCENE_H = 500;

/* ------------------------------------------------------------------ */
/* Pixel sprites: string art -> SVG rects. The authentic way.          */
/* ------------------------------------------------------------------ */

function PixelSprite({
  art,
  palette,
  px,
}: {
  art: string[];
  palette: Record<string, string>;
  px: number;
}) {
  const w = art[0].length;
  const h = art.length;
  return (
    <Svg width={w * px} height={h * px} viewBox={`0 0 ${w} ${h}`}>
      {art.map((row, y) =>
        [...row].map((ch, x) => {
          if (ch === "." || ch === " ") return null;
          const fill = palette[ch];
          if (!fill) return null;
          return <Rect key={`${x}:${y}`} x={x} y={y} width={1.04} height={1.04} fill={fill} />;
        })
      )}
    </Svg>
  );
}

const PAWN_ART = [
  ".....KKKK.....",
  "....KHHHHK....",
  "....KHSSHK....",
  "....KSEESK....",
  "....KSSSSK....",
  ".....KSSK.....",
  "....KCCCCK....",
  "...KCCCCCCK...",
  "...KCCBBCCK...",
  "...KCCCCCCK...",
  "....KLLLK.....",
  "....KLLLK.....",
  "...KLLKKLLK...",
  "..............",
];

const DEMON_ART = [
  "..KK......KK..",
  "..KWK....KWK..",
  "...KKKKKKK....",
  "..KDDDDDDDK...",
  "..KDEEDEEDK...",
  "..KDDDDDDDK...",
  "..KDDMMDDDK...",
  "...KDDDDDK....",
  "...KDDDDDK....",
  "..KKDDDDDKK...",
  "..K.DDDDK.K...",
  "...KKKKKKK....",
];

const DEMON_PALETTES: Record<0 | 1 | 2, Record<string, string>> = {
  0: { K: "#1E1B2E", W: "#DDD6FE", D: "#7C3AED", E: "#FDE68A", M: "#2E1065" },
  1: { K: "#1E1B2E", W: "#FECACA", D: "#DC2626", E: "#FDE68A", M: "#7F1D1D" },
  2: { K: "#000000", W: "#6B7280", D: "#111827", E: "#EF4444", M: "#000000" },
};

const TIER_NAMES = ["Lesser demon", "Greater demon", "Nightmare"];
const TIER_COLORS = ["#A78BFA", "#F87171", "#EF4444"];

const TREE_ART = [
  "..GGGG..",
  ".GGGGGG.",
  "GGGGGGGG",
  ".GGGGGG.",
  "GGGGGGGG",
  "..GGGG..",
  ".GGGGGG.",
  "...TT...",
  "...TT...",
];

const DEAD_TREE_ART = [
  "...BB...",
  "...BB...",
  ".B.BB.B.",
  "..BBBB..",
  ".BBBBBB.",
  "...BB...",
  "..BBBB..",
  "...BB...",
  "...BB...",
];

/* ------------------------------------------------------------------ */
/* Ambient: drifting mist, watching eyes, rising embers.               */
/* ------------------------------------------------------------------ */

function Mist({ seed, top }: { seed: number; top: number }) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000 + seed * 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000 + seed * 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [drift, seed]);
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-40, 40] });
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: 20, top, transform: [{ translateX }], opacity: 0.14 }}>
      <View style={{ width: 180, height: 28, borderRadius: 14, backgroundColor: "#C7D2FE" }} />
    </Animated.View>
  );
}

/** Pairs of red eyes watching from the dark. They blink. */
function WatchingEyes({ x, y, delay }: { x: number; y: number; delay: number }) {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(blink, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 0, duration: 120, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [blink, delay]);
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: x, top: y, opacity: blink, flexDirection: "row", gap: 7 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444" }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444" }} />
    </Animated.View>
  );
}

function Ember({ x, delay, dur }: { x: number; delay: number; dur: number }) {
  const rise = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(rise, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [rise, delay, dur]);
  const translateY = rise.interpolate({ inputRange: [0, 1], outputRange: [0, -190] });
  const opacity = rise.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.9, 0.9, 0] });
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: x, top: 430, transform: [{ translateY }], opacity }}>
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#FB923C" }} />
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* Equipped gear visuals: armor on the pawn, weapon in its hand.       */
/* The sprite is 65x70 (13x14 art at px=5). Overlays are drawn to      */
/* match: head rows 0-5 (y 0-30), torso rows 6-9 (y 30-50).            */
/* ------------------------------------------------------------------ */

/** Gentle pulsing halo for high-tier gear. Not flashy — a slow breathe. */
function TierGlow({ color, size, left, top }: { color: string; size: number; left: number; top: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.34] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left, top, width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity }}
    />
  );
}

/** Armor plates drawn over the pawn sprite. One look per tier. */
function ArmorShapes({ armorId }: { armorId: string }) {
  switch (armorId) {
    case "cloth-guard":
      // Padded cloth: quilted shoulder pads and a stitched chest pad.
      return (
        <G>
          <Rect x={12} y={26} width={14} height={10} rx={4} fill="#C9B184" stroke="#A68B5B" strokeWidth={1} />
          <Rect x={39} y={26} width={14} height={10} rx={4} fill="#C9B184" stroke="#A68B5B" strokeWidth={1} />
          <Rect x={19} y={32} width={27} height={16} rx={4} fill="#D6C298" opacity={0.95} />
          <Rect x={19} y={37.5} width={27} height={1.4} fill="#B39267" />
          <Rect x={19} y={43} width={27} height={1.4} fill="#B39267" />
        </G>
      );
    case "iron-plate":
      // Forged steel: breastplate, pauldrons, helm band.
      return (
        <G>
          <Rect x={10} y={24} width={17} height={13} rx={6} fill="#9AA3B2" />
          <Rect x={10} y={24} width={17} height={4} rx={2} fill="#C3CAD6" />
          <Rect x={38} y={24} width={17} height={13} rx={6} fill="#9AA3B2" />
          <Rect x={38} y={24} width={17} height={4} rx={2} fill="#C3CAD6" />
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#8E97A6" />
          <Rect x={31} y={30} width={3} height={20} fill="#6B7280" />
          <Rect x={15} y={46} width={35} height={4} fill="#6B7280" />
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#9AA3B2" />
          <Rect x={31} y={9} width={3} height={9} fill="#6B7280" />
        </G>
      );
    case "chainmail-vest":
      // Interlocked rings: dark vest with ring links, mail skirt and coif shoulders.
      return (
        <G>
          <Rect x={12} y={27} width={14} height={9} rx={4} fill="#4A525E" />
          <Rect x={39} y={27} width={14} height={9} rx={4} fill="#4A525E" />
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#5B6470" />
          {[22, 30, 38, 46].map((cx) =>
            [36, 44].map((cy) => (
              <Circle key={`${cx}:${cy}`} cx={cx} cy={cy} r={2.4} fill="none" stroke="#39404B" strokeWidth={1.2} />
            ))
          )}
          <Rect x={20} y={50} width={25} height={9} rx={3} fill="#4A525E" />
        </G>
      );
    case "mithril-plate":
      // Light as faith: bright silver-blue plate with a soft shimmer halo.
      return (
        <G>
          <Rect x={10} y={24} width={17} height={13} rx={6} fill="#C7DFF5" />
          <Rect x={10} y={24} width={17} height={4} rx={2} fill="#F2F9FF" />
          <Rect x={38} y={24} width={17} height={13} rx={6} fill="#C7DFF5" />
          <Rect x={38} y={24} width={17} height={4} rx={2} fill="#F2F9FF" />
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#CFE4F7" />
          <Rect x={31} y={30} width={3} height={20} fill="#8FB8DD" />
          <Rect x={15} y={46} width={35} height={4} fill="#8FB8DD" />
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#CFE4F7" />
          <Rect x={24} y={3} width={17} height={2.4} rx={1.2} fill="#F2F9FF" />
          <Rect x={31} y={9} width={3} height={9} fill="#8FB8DD" />
        </G>
      );
    case "celestial-bulwark":
      // Heaven's shield: radiant gold plate, bright trim, glowing crest.
      return (
        <G>
          <Rect x={10} y={24} width={17} height={13} rx={6} fill="#F6DC8E" />
          <Rect x={10} y={24} width={17} height={4} rx={2} fill="#FFF6D9" />
          <Rect x={38} y={24} width={17} height={13} rx={6} fill="#F6DC8E" />
          <Rect x={38} y={24} width={17} height={4} rx={2} fill="#FFF6D9" />
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#F3D27A" />
          <Rect x={31} y={30} width={3} height={20} fill="#D9A93F" />
          <Rect x={15} y={46} width={35} height={4} fill="#D9A93F" />
          <Rect x={20} y={1} width={25} height={10} rx={5} fill="#F3D27A" />
          <Rect x={24} y={3} width={17} height={2.4} rx={1.2} fill="#FFF6D9" />
          <Rect x={31} y={9} width={3} height={9} fill="#D9A93F" />
        </G>
      );
    default:
      // Unknown armor: plain steel plate, safe fallback.
      return (
        <G>
          <Rect x={15} y={30} width={35} height={20} rx={4} fill="#8E97A6" />
          <Rect x={31} y={30} width={3} height={20} fill="#6B7280" />
        </G>
      );
  }
}

/** Weapon drawn in the pawn's hand (10x56 viewBox, same swing anchor as before). */
function WeaponShapes({ weaponId }: { weaponId: string }) {
  switch (weaponId) {
    case "wooden-staff":
      return (
        <G>
          <Rect x={3} y={2} width={4} height={48} rx={2} fill="#8B5A2B" />
          <Circle cx={5} cy={5} r={4.5} fill="#A16207" />
          <Rect x={3} y={18} width={4} height={3} fill="#5C3D1E" />
          <Rect x={3} y={30} width={4} height={3} fill="#5C3D1E" />
        </G>
      );
    case "iron-sword":
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#94A3B8" />
          <Rect x={4.2} y={2} width={1.6} height={36} fill="#64748B" />
          <Rect x={0} y={40} width={10} height={4} fill="#57534C" />
          <Rect x={3} y={44} width={4} height={12} fill="#292524" />
          <Circle cx={5} cy={54} r={2.5} fill="#57534C" />
        </G>
      );
    case "dawnblade":
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#FDE68A" />
          <Rect x={4} y={2} width={2} height={36} fill="#FBBF24" />
          <Rect x={0} y={40} width={10} height={4} fill="#B45309" />
          <Rect x={3} y={44} width={4} height={12} fill="#451A03" />
        </G>
      );
    case "runeblade":
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#BFDBFE" />
          {[6, 14, 22, 30].map((y) => (
            <Rect key={y} x={3.5} y={y} width={3} height={2} fill="#1D4ED8" />
          ))}
          <Rect x={0} y={40} width={10} height={4} fill="#1E3A8A" />
          <Rect x={3} y={44} width={4} height={12} fill="#0F172A" />
        </G>
      );
    case "seraphim-edge":
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#FFFBEA" />
          <Rect x={4} y={2} width={2} height={36} fill="#FDE047" />
          <Rect x={0} y={40} width={10} height={4} fill="#F59E0B" />
          <Rect x={3} y={44} width={4} height={12} fill="#78350F" />
          <Circle cx={5} cy={54} r={2.5} fill="#FBBF24" />
        </G>
      );
    case "steel-sword":
    default:
      return (
        <G>
          <Rect x={3} y={0} width={4} height={40} fill="#CBD5E1" />
          <Rect x={3} y={0} width={2} height={40} fill="#F1F5F9" />
          <Rect x={0} y={40} width={10} height={4} fill="#92400E" />
          <Rect x={3} y={44} width={4} height={12} fill="#451A03" />
        </G>
      );
  }
}

/** Soft glow color for magic-tier weapons. Null for plain steel. */
function weaponGlowColor(weaponId: string | null): string | null {
  if (weaponId === "dawnblade") return "#FBBF24";
  if (weaponId === "runeblade") return "#60A5FA";
  if (weaponId === "seraphim-edge") return "#FDE047";
  return null;
}

/* ------------------------------------------------------------------ */
/* Floating damage numbers.                                            */
/* ------------------------------------------------------------------ */

function FloatText({ text, color, onDone }: { text: string; color: string; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = Animated.timing(anim, { toValue: 1, duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: true });
    t.start(({ finished }) => { if (finished) onDone(); });
    return () => t.stop();
  }, [anim, onDone]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", transform: [{ translateY }], opacity }}>
      <Text style={{ color, fontWeight: "900", fontSize: 20, textShadowColor: "#000", textShadowRadius: 4 }}>{text}</Text>
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* HP bar                                                              */
/* ------------------------------------------------------------------ */

function HpBar({ hp, maxHp, color }: { hp: number; maxHp: number; color: string }) {
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: "rgba(0,0,0,0.55)", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" }}>
      <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: color, borderRadius: 5 }} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

type Phase = "select" | "fight" | "victory" | "defeat";
type FloatItem = { id: number; text: string; color: string; side: "left" | "right" };

let floatId = 0;

export function DarkForest({ stats, forest, tunicColor, armorId, weaponId, timeOfDay, pt, onVictory }: DarkForestProps) {
  const [phase, setPhase] = useState<Phase>("select");
  const [wave, setWave] = useState(1);
  const [playerHp, setPlayerHp] = useState(stats.maxHp);
  const [demonHp, setDemonHp] = useState(1);
  const [prayed, setPrayed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [victoryFired, setVictoryFired] = useState(false);

  const demon: DemonDef = useMemo(() => demonForWave(wave), [wave]);
  const maxWave = forest.highestWave + 1;

  const swordSwing = useRef(new Animated.Value(0)).current;
  const demonFlash = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const pushFloat = (text: string, color: string, side: "left" | "right") => {
    const id = ++floatId;
    setFloats((f) => [...f.slice(-5), { id, text, color, side }]);
  };
  const dropFloat = (id: number) => setFloats((f) => f.filter((x) => x.id !== id));

  const startWave = (w: number) => {
    setWave(w);
    setPlayerHp(stats.maxHp);
    setDemonHp(demonForWave(w).hp);
    setPrayed(false);
    setBusy(false);
    setFloats([]);
    setVictoryFired(false);
    setPhase("fight");
  };

  const animateSword = () => {
    swordSwing.setValue(0);
    Animated.timing(swordSwing, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  const flashDemon = () => {
    demonFlash.setValue(1);
    Animated.timing(demonFlash, { toValue: 0, duration: 320, useNativeDriver: true }).start();
  };
  const shakeScene = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const strike = () => {
    if (phase !== "fight" || busy) return;
    setBusy(true);
    animateSword();
    flashDemon();
    const crit = Math.random() < 0.12;
    const dmg = Math.max(1, Math.round(stats.attack * (0.9 + Math.random() * 0.2) * (crit ? 1.6 : 1)));
    pushFloat(crit ? `${dmg}!` : `${dmg}`, crit ? "#FDE68A" : "#FFFFFF", "right");
    const newDemonHp = Math.max(0, demonHp - dmg);
    setDemonHp(newDemonHp);

    setTimeout(() => {
      if (!alive.current) return;
      if (newDemonHp <= 0) {
        setPhase("victory");
        setBusy(false);
        if (!victoryFired) {
          setVictoryFired(true);
          onVictory(wave);
        }
        return;
      }
      // The demon retaliates.
      const raw = demon.attack * (0.9 + Math.random() * 0.2);
      const taken = Math.max(1, Math.round(raw - stats.defense));
      shakeScene();
      pushFloat(`${taken}`, "#F87171", "left");
      const newPlayerHp = Math.max(0, playerHp - taken);
      setPlayerHp(newPlayerHp);
      setTimeout(() => {
        if (!alive.current) return;
        if (newPlayerHp <= 0) setPhase("defeat");
        setBusy(false);
      }, 350);
    }, 520);
  };

  const pray = () => {
    if (phase !== "fight" || busy || prayed) return;
    setPrayed(true);
    const heal = Math.round(stats.maxHp * 0.3);
    setPlayerHp((h) => Math.min(stats.maxHp, h + heal));
    pushFloat(`+${heal}`, "#86EFAC", "left");
  };

  const swordRotate = swordSwing.interpolate({ inputRange: [0, 1], outputRange: ["8deg", "-52deg"] });
  const demonOpacity = demonFlash.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] });
  const shakeX = shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [-9, 0, 9] });

  const pawnPalette = { K: "#1F2937", H: "#6B4423", S: "#F5D0A9", E: "#1F2937", C: tunicColor, B: "#4A3728", L: "#374151" };
  const isNight = timeOfDay === "night";

  return (
    <View style={{ marginBottom: 16 }}>
      <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
        <View style={{ width: SCENE_W, height: SCENE_H, borderRadius: 16, overflow: "hidden", alignSelf: "center", backgroundColor: "#0B0B18", borderWidth: 1, borderColor: "#2A2A45" }}>
          <Svg width={SCENE_W} height={SCENE_H} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`}>
            {/* night sky wash */}
            <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="#0B0B18" />
            <Circle cx={308} cy={54} r={22} fill="#E2E8F0" opacity={0.9} />
            <Circle cx={308} cy={54} r={34} fill="#E2E8F0" opacity={0.12} />
            {/* ground */}
            <Rect x={0} y={400} width={SCENE_W} height={100} fill="#141428" />
            <Rect x={0} y={396} width={SCENE_W} height={8} fill="#1E1E38" />
            {/* dead trees, back row */}
            {[
              { x: 30, s: 1.1 }, { x: 120, s: 0.8 }, { x: 250, s: 1 }, { x: 320, s: 0.85 },
            ].map((t, i) => (
              <G key={i} transform={`translate(${t.x} 210) scale(${t.s * 7})`}>
                {DEAD_TREE_ART.map((row, y) =>
                  [...row].map((ch, x) =>
                    ch === "." ? null : <Rect key={`${x}:${y}`} x={x} y={y} width={1.04} height={1.04} fill="#23233A" />
                  )
                )}
              </G>
            ))}
            {/* dark pines, front edges */}
            {[
              { x: 4, s: 1 }, { x: 316, s: 1.15 }, { x: 66, s: 0.7 },
            ].map((t, i) => (
              <G key={`p${i}`} transform={`translate(${t.x} 250) scale(${t.s * 6.5})`}>
                {TREE_ART.map((row, y) =>
                  [...row].map((ch, x) =>
                    ch === "." ? null : (
                      <Rect key={`${x}:${y}`} x={x} y={y} width={1.04} height={1.04} fill={ch === "T" ? "#3A2A1A" : "#14301E"} />
                    )
                  )
                )}
              </G>
            ))}
          </Svg>

          {/* ambient life */}
          <WatchingEyes x={150} y={150} delay={0} />
          <WatchingEyes x={230} y={210} delay={1400} />
          <WatchingEyes x={90} y={250} delay={2600} />
          <Mist seed={1} top={330} />
          <Mist seed={2} top={370} />
          <Ember x={80} delay={0} dur={5200} />
          <Ember x={200} delay={1800} dur={6400} />
          <Ember x={290} delay={900} dur={5800} />

          {/* combatants */}
          {(phase === "fight" || phase === "victory" || phase === "defeat") && (
            <>
              {/* pawn */}
              <View style={{ position: "absolute", left: 52, top: 250 }}>
                {(armorId === "mithril-plate" || armorId === "celestial-bulwark") && (
                  <TierGlow
                    color={armorId === "mithril-plate" ? "#BFDBFE" : "#FDE68A"}
                    size={104}
                    left={-20}
                    top={-17}
                  />
                )}
                <PixelSprite art={PAWN_ART} palette={pawnPalette} px={5} />
                {armorId && (
                  <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
                    <Svg width={65} height={70} viewBox="0 0 65 70">
                      <ArmorShapes armorId={armorId} />
                    </Svg>
                  </View>
                )}
                {/* weapon */}
                {weaponId && (
                  <Animated.View style={{ position: "absolute", left: 58, top: 34, transform: [{ rotate: swordRotate }] }}>
                    {weaponGlowColor(weaponId) && (
                      <TierGlow color={weaponGlowColor(weaponId)!} size={36} left={-13} top={6} />
                    )}
                    <Svg width={10} height={56} viewBox="0 0 10 56">
                      <WeaponShapes weaponId={weaponId} />
                    </Svg>
                  </Animated.View>
                )}
              </View>
              {/* demon */}
              {phase !== "victory" && (
                <Animated.View style={{ position: "absolute", left: 218, top: 258, opacity: demonOpacity }}>
                  <PixelSprite art={DEMON_ART} palette={DEMON_PALETTES[demon.tier]} px={5} />
                </Animated.View>
              )}
              {/* floating damage numbers */}
              {floats.map((f) => (
                <View key={f.id} style={{ position: "absolute", left: f.side === "left" ? 70 : 236, top: 236 }}>
                  <FloatText text={f.text} color={f.color} onDone={() => dropFloat(f.id)} />
                </View>
              ))}
            </>
          )}

          {/* HUD */}
          <View style={{ position: "absolute", left: 12, right: 12, top: 10 }}>
            {phase === "fight" || phase === "victory" || phase === "defeat" ? (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ color: "#E2E8F0", fontWeight: "800", fontSize: 13 }}>Wave {wave}</Text>
                  <Text style={{ color: TIER_COLORS[demon.tier], fontWeight: "800", fontSize: 13 }}>
                    {demon.name} · {TIER_NAMES[demon.tier]}
                  </Text>
                </View>
                <HpBar hp={demonHp} maxHp={demon.hp} color={TIER_COLORS[demon.tier]} />
                <View style={{ height: 8 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ color: "#E2E8F0", fontWeight: "800", fontSize: 13 }}>You</Text>
                  <Text style={{ color: "#93C5FD", fontWeight: "700", fontSize: 12 }}>
                    {playerHp}/{stats.maxHp} HP
                  </Text>
                </View>
                <HpBar hp={playerHp} maxHp={stats.maxHp} color="#60A5FA" />
              </>
            ) : (
              <Text style={{ color: "#E2E8F0", fontWeight: "800", fontSize: 15, textAlign: "center", marginTop: 4 }}>
                The Dark Forest
              </Text>
            )}
          </View>

          {/* bottom panel */}
          <View style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
            {phase === "select" && (
              <View style={{ backgroundColor: "rgba(10,10,25,0.88)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#3A3A5E" }}>
                <Text style={{ color: "#C7D2FE", fontSize: 12, textAlign: "center", marginBottom: 8 }}>
                  Attack {stats.attack} · Defense {stats.defense} · {stats.maxHp} HP — your gear is your strength.
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                  {Array.from({ length: maxWave }, (_, i) => i + 1).map((w) => {
                    const d = demonForWave(w);
                    const cleared = w <= forest.highestWave;
                    return (
                      <Pressable
                        key={w}
                        onPress={() => startWave(w)}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                          backgroundColor: cleared ? "#1E3A2E" : "#3B2F6B",
                          borderWidth: 1, borderColor: cleared ? "#4ADE80" : TIER_COLORS[d.tier],
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>
                          {cleared ? "✓ " : ""}Wave {w}
                        </Text>
                        <Text style={{ color: TIER_COLORS[d.tier], fontSize: 10 }}>{d.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={{ color: "#8B8BA8", fontSize: 11, textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
                  Stronger blades and armor from the Weaponsmith and Armory let you push deeper.
                </Text>
              </View>
            )}
            {phase === "fight" && (
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={strike}
                  disabled={busy}
                  style={{
                    flex: 2, backgroundColor: busy ? "#4C1D1D" : "#991B1B", borderRadius: 12,
                    paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: "#F87171",
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 16, letterSpacing: 1 }}>STRIKE</Text>
                </Pressable>
                <Pressable
                  onPress={pray}
                  disabled={busy || prayed}
                  style={{
                    flex: 1, backgroundColor: prayed ? "#1F2937" : "#1E3A8A", borderRadius: 12,
                    paddingVertical: 14, alignItems: "center", borderWidth: 1,
                    borderColor: prayed ? "#374151" : "#93C5FD", opacity: prayed ? 0.5 : 1,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 14 }}>{prayed ? "Prayed" : "Pray"}</Text>
                </Pressable>
              </View>
            )}
            {phase === "victory" && (
              <View style={{ backgroundColor: "rgba(10,25,15,0.92)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#4ADE80", alignItems: "center" }}>
                <Text style={{ color: "#4ADE80", fontWeight: "900", fontSize: 18, marginBottom: 4 }}>Victory!</Text>
                <Text style={{ color: "#E2E8F0", fontSize: 13, marginBottom: 10 }}>
                  {demon.name} is banished. +{demon.coins.toFixed(2)} coins · +{demon.xp} XP
                </Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={() => startWave(wave + 1)}
                    style={{ backgroundColor: "#166534", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 }}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Next Wave</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPhase("select")}
                    style={{ backgroundColor: "#1F2937", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: "#4B5563" }}
                  >
                    <Text style={{ color: "#E2E8F0", fontWeight: "800" }}>Rest</Text>
                  </Pressable>
                </View>
              </View>
            )}
            {phase === "defeat" && (
              <View style={{ backgroundColor: "rgba(25,10,10,0.92)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#7F1D1D", alignItems: "center" }}>
                <Text style={{ color: "#F87171", fontWeight: "900", fontSize: 16, marginBottom: 4 }}>Overwhelmed…</Text>
                <Text style={{ color: "#C7D2FE", fontSize: 13, marginBottom: 10, textAlign: "center", fontStyle: "italic" }}>
                  The darkness was too strong. Upgrade your gear and try again — nothing is lost.
                </Text>
                <Pressable
                  onPress={() => setPhase("select")}
                  style={{ backgroundColor: "#3B2F6B", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Retreat</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      {/* verse line under the scene */}
      <Text style={{ marginTop: 10, fontSize: 12, color: pt.subtext, fontStyle: "italic", textAlign: "center", paddingHorizontal: 16 }}>
        &ldquo;Resist the devil, and he will flee from you.&rdquo; — James 4:7
      </Text>
      {isNight && <View style={{ height: 0 }} />}
    </View>
  );
}
