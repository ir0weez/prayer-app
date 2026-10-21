// Dark Forest: a pixel-art demon-battling mini game.
// Tap STRIKE to attack. Your equipped gear is your power — better blades
// and armor from the Weaponsmith and Armory let you push deeper.
// "Pray" heals once per battle. No auto-battle: Jonathan taps.
// The forest runs on energy (lib/forest-energy): max == your XP level,
// 1 per wave fight, rekindled at midnight. Boss Gate fights are free.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatCoins } from "@/lib/hometown";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { demonForWave, demonPalette, zoneForWave, zoneLabel, FOREST_ZONES, type DarkForestState, type DemonDef, type ForestZone } from "@/lib/dark-forest";
import { ArmorShapes, HeroBeard, HeroHair, PixelSprite, TierGlow, WeaponShapes, armorGlowColor, heroArtForBodyStyle, weaponGlowColor } from "@/components/hero-sprite";
import { BADGE_BY_ID, type BossDef } from "@/lib/badges";
import { loadForestEnergy, spendForestEnergy, type ForestEnergy } from "@/lib/forest-energy";
import { BadgeMedallion } from "@/components/badge-case";
import { BASE_CRIT_CHANCE, CRIT_DAMAGE_MULT, type CombatStats } from "@/lib/gear";
import { loadHouseState } from "@/lib/pawn-house";
import { boonFor, loadHeroNeeds } from "@/lib/hero-needs";

/** The Morning Care boon shape (lib/hero-needs boonFor). */
type NeedsBoon = { active: boolean; hpPct: number; atkPct: number };
import {
  loadHeroHealthRaw,
  restPctForBedTier,
  saveHeroHealth,
  settleHealth,
  wakeAfterDefeat,
  type HeroHealthState,
} from "@/lib/hero-health";
import type { PawnBeardStyle, PawnBodyStyle, PawnHairStyle } from "@/lib/pawn";
import type { PageTheme, TimeOfDay } from "@/lib/daynight";

export type DarkForestProps = {
  stats: CombatStats;
  /** Gym Training Reps bonus is folded into `stats` — this flag only
   *  drives the "bonus active" note in the panel. */
  trainingBonus?: boolean;
  /** Size of the training bonus in percent (10, or 20 while the campus
   *  Gymnasium stands). Only used by the panel note. */
  trainingBonusPct?: number;
  forest: DarkForestState;
  /** Tunic color from equipped clothes, so the pawn looks like yours. */
  tunicColor: string;
  /** Equipped armor id (lib/gear) — drawn on the pawn sprite. */
  armorId: string | null;
  /** Equipped weapon id (lib/gear) — drawn in the pawn's hand. */
  weaponId: string | null;
  /** Pawn appearance (lib/pawn) — the hero wears what the pawn wears. */
  hairStyle?: PawnHairStyle;
  hairColor?: string;
  beardStyle?: PawnBeardStyle;
  /** Creator appearance — body shape (pixel rows). The face stays the
   *  sprite's own pixels: no smooth eye/mouth/accessory overlays on the
   *  character (see HeroForPawn in hero-sprite.tsx). */
  bodyStyle?: PawnBodyStyle;
  /** Current beard growth 0-100 (lib/pawn beardGrowthFor). */
  beardLength?: number;
  timeOfDay: TimeOfDay;
  pt: PageTheme;
  onVictory: (wave: number) => void;
  /** The Boss Gate (prestige): set while a prestige offer is active. */
  bossGate?: { boss: BossDef; cleared: boolean } | null;
  /**
   * When the gate is hidden because the offer fast hasn't reached its
   * last day, the ISO date (YYYY-MM-DD) it opens — the select panel
   * shows one quiet line in the gate's place. Undefined/null = no offer
   * is waiting, so nothing renders.
   */
  bossGateOpensOn?: string | null;
  /** Fired once when a boss fight is won. Badge + gate handled host-side. */
  onBossVictory?: (boss: BossDef) => void;
};

const SCENE_W = 360;
const SCENE_H = 500;

const GATE_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 24" from an ISO day string — parsed by hand, never via Date, so
 *  no timezone can shift the day. Null when the string isn't ISO. */
function gateOpensLabel(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const month = GATE_MONTHS[Number(m[2]) - 1];
  if (!month) return null;
  return `${month} ${Number(m[3])}`;
}



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

function Mist({ seed, top, color = "#C7D2FE", opacity = 0.14 }: { seed: number; top: number; color?: string; opacity?: number }) {
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
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: 20, top, transform: [{ translateX }], opacity }}>
      <View style={{ width: 180, height: 28, borderRadius: 14, backgroundColor: color }} />
    </Animated.View>
  );
}

/** Pairs of red eyes watching from the dark. They blink. */
function WatchingEyes({ x, y, delay, color = "#EF4444" }: { x: number; y: number; delay: number; color?: string }) {
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
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </Animated.View>
  );
}

function Ember({ x, delay, dur, color = "#FB923C" }: { x: number; delay: number; dur: number; color?: string }) {
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
      <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
    </Animated.View>
  );
}


/* ------------------------------------------------------------------ */
/* Zone scenery: one distinguishing element per zone, drawn in the     */
/* scene's SVG behind the combatants.                                  */
/* ------------------------------------------------------------------ */

function ZoneScenery({ zone }: { zone: ForestZone }) {
  switch (zone.scenery) {
    case "moss":
      // Hanging moss strands + low fog banks.
      return (
        <G>
          {[40, 110, 190, 268, 322].map((x, i) => (
            <G key={x}>
              <Rect x={x} y={0} width={3} height={64 + (i % 3) * 26} fill={zone.pine} opacity={0.9} />
              <Circle cx={x + 1.5} cy={68 + (i % 3) * 26} r={4} fill={zone.pine} />
            </G>
          ))}
          <Ellipse cx={90} cy={392} rx={110} ry={13} fill={zone.mist} opacity={0.16} />
          <Ellipse cx={272} cy={404} rx={120} ry={15} fill={zone.mist} opacity={0.13} />
        </G>
      );
    case "stumps":
      // Burning stumps: charred trunks with glowing hearts.
      return (
        <G>
          {[{ x: 58, w: 26, h: 22 }, { x: 168, w: 20, h: 16 }, { x: 282, w: 30, h: 26 }].map((s, i) => (
            <G key={i}>
              <Rect x={s.x} y={400 - s.h} width={s.w} height={s.h} fill="#1F0F05" />
              <Rect x={s.x} y={400 - s.h} width={s.w} height={4} fill="#7C2D12" />
              <Circle cx={s.x + s.w / 2} cy={400 - s.h + 2} r={3.4} fill="#F97316" opacity={0.95} />
              <Circle cx={s.x + s.w / 2} cy={400 - s.h + 2} r={7.5} fill="#F97316" opacity={0.22} />
            </G>
          ))}
        </G>
      );
    case "icicles":
      // Snow drifts + icicles hanging from the top edge.
      return (
        <G>
          <Ellipse cx={60} cy={404} rx={86} ry={12} fill="#E8F1F8" opacity={0.85} />
          <Ellipse cx={200} cy={410} rx={110} ry={13} fill="#DCE9F5" opacity={0.7} />
          <Ellipse cx={322} cy={402} rx={70} ry={10} fill="#E8F1F8" opacity={0.8} />
          {[24, 84, 150, 236, 306].map((x, i) => (
            <Path key={x} d={`M ${x} 0 L ${x + 10} 0 L ${x + 5} ${26 + (i % 3) * 10} Z`} fill="#BFDBFE" opacity={0.75} />
          ))}
        </G>
      );
    case "thorns":
      // Twisted thorn arches crossing the wood.
      return (
        <G>
          <Path d="M -10 400 Q 90 210 210 396" stroke="#3D0A18" strokeWidth={9} fill="none" />
          <Path d="M 372 400 Q 268 190 150 396" stroke="#2E0A16" strokeWidth={8} fill="none" />
          {[70, 130, 238, 296].map((x, i) => (
            <Path key={x} d={`M ${x} ${300 - (i % 2) * 60} l 12 -14 l 2 16 Z`} fill="#57102A" />
          ))}
        </G>
      );
    case "pools":
      // Still black pools with reeds at the edges.
      return (
        <G>
          <Ellipse cx={86} cy={428} rx={74} ry={13} fill="#06110C" />
          <Ellipse cx={86} cy={426} rx={74} ry={11} fill="#0E2A1E" opacity={0.8} />
          <Ellipse cx={272} cy={446} rx={88} ry={14} fill="#06110C" />
          <Ellipse cx={272} cy={444} rx={88} ry={12} fill="#0E2A1E" opacity={0.8} />
          {[30, 148, 214, 330].map((x) => (
            <G key={x}>
              <Rect x={x} y={368} width={3} height={34} fill="#14532D" />
              <Rect x={x + 6} y={376} width={3} height={26} fill="#166534" />
            </G>
          ))}
        </G>
      );
    case "ruins":
      // Broken stone pillars of something that stood here once.
      return (
        <G>
          {[{ x: 44, h: 120 }, { x: 128, h: 62 }, { x: 268, h: 96 }].map((s, i) => (
            <G key={i}>
              <Rect x={s.x} y={400 - s.h} width={24} height={s.h} fill="#3F3A44" />
              <Rect x={s.x - 4} y={400 - s.h} width={32} height={9} fill="#4C4653" />
              <Rect x={s.x - 4} y={392} width={32} height={8} fill="#4C4653" />
              <Rect x={s.x + 10} y={400 - s.h + 16} width={2.4} height={s.h - 30} fill="#2A262E" />
            </G>
          ))}
          <Rect x={196} y={388} width={30} height={11} fill="#3F3A44" transform="rotate(-14 211 393)" />
        </G>
      );
    case "crystals":
      // Violet crystals, humming with their own light.
      return (
        <G>
          {[{ x: 52, h: 74 }, { x: 150, h: 44 }, { x: 282, h: 92 }, { x: 322, h: 50 }].map((s, i) => (
            <G key={i}>
              <Circle cx={s.x + 9} cy={398 - s.h / 2} r={s.h / 2.4} fill="#7C3AED" opacity={0.14} />
              <Path d={`M ${s.x} 400 L ${s.x + 9} ${400 - s.h} L ${s.x + 18} 400 Z`} fill="#6D28D9" />
              <Path d={`M ${s.x + 9} ${400 - s.h} L ${s.x + 18} 400 L ${s.x + 9} 400 Z`} fill="#8B5CF6" opacity={0.8} />
            </G>
          ))}
        </G>
      );
    case "pillars":
      // Golden pillars of the fallen kingdom, one snapped mid-fall.
      return (
        <G>
          {[{ x: 52, h: 132 }, { x: 282, h: 108 }].map((s, i) => (
            <G key={i}>
              <Rect x={s.x} y={400 - s.h} width={22} height={s.h} fill="#8A6D2F" />
              <Rect x={s.x - 4} y={400 - s.h} width={30} height={9} fill="#D4AF37" />
              <Rect x={s.x - 4} y={391} width={30} height={9} fill="#D4AF37" />
              <Rect x={s.x + 5} y={400 - s.h + 12} width={3} height={s.h - 22} fill="#6E5626" />
              <Rect x={s.x + 14} y={400 - s.h + 12} width={3} height={s.h - 22} fill="#6E5626" />
            </G>
          ))}
          <Rect x={168} y={382} width={24} height={46} fill="#8A6D2F" transform="rotate(24 180 405)" />
          <Rect x={196} y={392} width={30} height={10} fill="#D4AF37" transform="rotate(24 211 397)" />
        </G>
      );
    case "spikes":
      // Obsidian spikes + shards that hang in the air, wrong.
      return (
        <G>
          {[{ x: 30, h: 88 }, { x: 120, h: 56 }, { x: 252, h: 104 }, { x: 322, h: 64 }].map((s, i) => (
            <Path key={i} d={`M ${s.x} 400 L ${s.x + 11} ${400 - s.h} L ${s.x + 22} 400 Z`} fill="#0D0D17" stroke="#26263A" strokeWidth={1} />
          ))}
          {[86, 196, 292].map((x, i) => (
            <Rect key={x} x={x} y={120 + i * 36} width={9} height={9} fill="#1B1B2A" stroke="#3A3A55" strokeWidth={1} transform={`rotate(45 ${x + 4.5} ${124 + i * 36})`} />
          ))}
        </G>
      );
    case "obelisks":
      // Leaning dead obelisks on a wind-blasted plain + wind streaks.
      return (
        <G>
          {[{ x: 46, h: 148, lean: -9 }, { x: 150, h: 92, lean: 7 }, { x: 282, h: 168, lean: -6 }].map((s, i) => (
            <G key={i}>
              <Rect x={s.x} y={400 - s.h} width={17} height={s.h} fill={zone.deadTree} transform={`rotate(${s.lean} ${s.x + 8} 400)`} />
              <Path d={`M ${s.x - 3} ${400 - s.h} L ${s.x + 8} ${386 - s.h} L ${s.x + 20} ${400 - s.h} Z`} fill={zone.pine} transform={`rotate(${s.lean} ${s.x + 8} 400)`} />
              <Rect x={s.x + 5} y={400 - s.h + 26} width={7} height={3} fill={zone.ground} opacity={0.7} />
              <Rect x={s.x + 5} y={400 - s.h + 44} width={7} height={3} fill={zone.ground} opacity={0.5} />
            </G>
          ))}
          {[150, 205, 262].map((y, i) => (
            <Path key={y} d={`M -8 ${y} Q 120 ${y - 12 - i * 5} 368 ${y - 26}`} stroke={zone.mist} strokeWidth={2.4} fill="none" opacity={0.35} />
          ))}
        </G>
      );
    case "cavern":
      // Black crystal clusters under a roof split by one crack of light.
      return (
        <G>
          <Path d="M 250 0 L 266 0 L 258 52 L 272 96 L 252 150 L 246 60 Z" fill="#E2E8F0" opacity={0.13} />
          <Path d="M 254 0 L 260 0 L 256 60 L 262 110 L 250 150 L 248 60 Z" fill="#F8FAFC" opacity={0.2} />
          <Ellipse cx={252} cy={398} rx={64} ry={9} fill="#E2E8F0" opacity={0.08} />
          {[{ x: 40, h: 66 }, { x: 128, h: 40 }, { x: 296, h: 84 }, { x: 330, h: 46 }].map((s, i) => (
            <G key={i}>
              <Path d={`M ${s.x} 400 L ${s.x + 8} ${400 - s.h} L ${s.x + 16} 400 Z`} fill="#0B0B18" stroke="#3F3F55" strokeWidth={1.2} />
              <Path d={`M ${s.x + 18} 400 L ${s.x + 24} ${400 - s.h * 0.6} L ${s.x + 30} 400 Z`} fill="#12121F" stroke="#2E2E44" strokeWidth={1} />
            </G>
          ))}
        </G>
      );
    case "vines":
      // Thorn arches AND vines crowding in from the top and both sides.
      return (
        <G>
          <Path d="M -10 400 Q 90 210 210 396" stroke="#12240A" strokeWidth={9} fill="none" />
          <Path d="M 372 400 Q 268 190 150 396" stroke="#0E1D08" strokeWidth={8} fill="none" />
          {[36, 96, 168, 244, 312].map((x, i) => (
            <G key={x}>
              <Path d={`M ${x} 0 Q ${x + (i % 2 ? 10 : -10)} ${44 + (i % 3) * 18} ${x + (i % 2 ? -6 : 6)} ${86 + (i % 3) * 22}`} stroke={zone.pine} strokeWidth={4} fill="none" />
              <Circle cx={x + (i % 2 ? -6 : 6)} cy={88 + (i % 3) * 22} r={4.4} fill={zone.pine} />
              <Circle cx={x + 8} cy={40 + (i % 3) * 16} r={3.2} fill={zone.deadTree} />
            </G>
          ))}
          {[70, 130, 238, 296].map((x, i) => (
            <Path key={x} d={`M ${x} ${300 - (i % 2) * 60} l 12 -14 l 2 16 Z`} fill="#2A421E" />
          ))}
        </G>
      );
    case "lava":
      // Lava cracks glowing in the ground + basalt pillars behind.
      return (
        <G>
          {[{ x: 56, h: 108 }, { x: 288, h: 128 }].map((s, i) => (
            <G key={i}>
              <Rect x={s.x} y={400 - s.h} width={20} height={s.h} fill="#170806" />
              <Rect x={s.x} y={400 - s.h} width={20} height={5} fill="#2A0F08" />
            </G>
          ))}
          <Path d="M -6 424 L 90 416 L 150 428 L 250 420 L 366 430" stroke="#F97316" strokeWidth={3.4} fill="none" opacity={0.9} />
          <Path d="M 30 452 L 130 444 L 210 456 L 320 448" stroke="#DC2626" strokeWidth={2.6} fill="none" opacity={0.8} />
          <Path d="M 96 416 L 110 438 L 104 452" stroke="#FDBA74" strokeWidth={2} fill="none" opacity={0.85} />
          <Path d="M 252 420 L 240 440 L 248 454" stroke="#FDBA74" strokeWidth={2} fill="none" opacity={0.8} />
          <Ellipse cx={90} cy={424} rx={52} ry={7} fill="#F97316" opacity={0.14} />
          <Ellipse cx={272} cy={448} rx={60} ry={8} fill="#DC2626" opacity={0.12} />
        </G>
      );
    case "bones":
      // Enormous ribcages arc over the path; a dragon skull rests at right.
      return (
        <G>
          {[0, 1, 2, 3].map((i) => (
            <Path
              key={i}
              d={`M ${28 + i * 26} 402 Q ${120 + i * 18} ${168 - i * 8} ${238 + i * 22} 402`}
              stroke="#E7DCC3"
              strokeWidth={7 - i * 0.7}
              fill="none"
              opacity={0.75 - i * 0.1}
            />
          ))}
          <G transform="translate(268 342)">
            <Path d="M 0 18 Q 2 2 22 0 L 52 4 Q 64 6 63 16 L 60 30 L 44 34 L 40 44 L 34 34 L 16 36 L 12 46 L 6 34 Q -1 28 0 18 Z" fill="#EFE7D2" />
            <Ellipse cx={24} cy={16} rx={7} ry={8.6} fill="#17130B" />
            <Ellipse cx={47} cy={13} rx={4.6} ry={5.6} fill="#17130B" />
            <Path d="M 56 4 Q 68 -6 74 2 Q 66 4 60 10 Z" fill="#E7DCC3" />
            <Path d="M 14 34 L 17 44 L 20 34 Z" fill="#FBF7EA" />
            <Path d="M 26 35 L 29 45 L 32 35 Z" fill="#FBF7EA" />
          </G>
          <Rect x={52} y={388} width={34} height={9} rx={4} fill="#E7DCC3" opacity={0.6} transform="rotate(-8 69 392)" />
          <Rect x={120} y={430} width={26} height={7} rx={3.5} fill="#E7DCC3" opacity={0.45} transform="rotate(6 133 433)" />
        </G>
      );
    case "deadwood":
    default:
      return null;
  }
}
/* ------------------------------------------------------------------ */
/* Floating damage numbers.                                            */
/* ------------------------------------------------------------------ */

function FloatText({ text, color, crit = false, onDone }: { text: string; color: string; crit?: boolean; onDone: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = Animated.timing(anim, { toValue: 1, duration: 850, easing: Easing.out(Easing.quad), useNativeDriver: true });
    t.start(({ finished }) => { if (finished) onDone(); });
    return () => t.stop();
  }, [anim, onDone]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });
  // A critical hit pulses: the number swells past full size and settles
  // as it rises — one sine-like swell, no bounce.
  const scale = anim.interpolate({ inputRange: [0, 0.22, 1], outputRange: crit ? [0.55, 1.22, 1] : [1, 1, 1] });
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", transform: [{ translateY }, { scale }], opacity }}>
      <Text style={{ color, fontWeight: "900", fontSize: crit ? 25 : 20, textShadowColor: "#000", textShadowRadius: 4 }}>{text}</Text>
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
/* Forest energy flames. One living flame per energy point, drawn as   */
/* SVG art (never emoji). Lit flames flicker on staggered sine loops;  */
/* spent ones are a dark wick under a faint smoke curl; the flame a    */
/* fight just spent plays a snuff animation — it shrinks out while a   */
/* smoke wisp rises and fades. When max energy outgrows the row cap,   */
/* the row shows capped slots proportionally plus a "×N" count.        */
/* ------------------------------------------------------------------ */

type SnuffState = { from: number; to: number; key: number; long: boolean };

function energySlots(max: number, cap: number): number {
  return Math.max(1, Math.min(Math.max(1, max), cap));
}

function litForEnergy(energy: number, max: number, cap: number): number {
  const slots = energySlots(max, cap);
  if (max <= cap) return Math.max(0, Math.min(slots, Math.floor(energy)));
  if (max <= 0) return 0;
  return Math.round((Math.max(0, Math.min(max, energy)) / max) * slots);
}

/** The flame itself: three nested teardrops (outer, mid, core). */
function FlameArt() {
  return (
    <G>
      <Path d="M12 1.5 C13.9 6.6 19.5 10.2 19.5 16.6 C19.5 21.6 16.2 25.2 12 25.2 C7.8 25.2 4.5 21.6 4.5 16.6 C4.5 10.2 10.1 6.6 12 1.5 Z" fill="#F97316" />
      <Path d="M12 7.5 C13.4 11 16.8 13.4 16.8 17.8 C16.8 21 14.7 23.4 12 23.4 C9.3 23.4 7.2 21 7.2 17.8 C7.2 13.4 10.6 11 12 7.5 Z" fill="#FB923C" />
      <Path d="M12 13.5 C13 16 15 17.6 15 19.8 C15 21.6 13.7 22.8 12 22.8 C10.3 22.8 9 21.6 9 19.8 C9 17.6 11 16 12 13.5 Z" fill="#FDE047" />
    </G>
  );
}

const FlickerFlame = memo(function FlickerFlame({ index, size }: { index: number; size: number }) {
  const flick = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const dur = 620 + (index % 5) * 110;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flick, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flick, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), (index % 7) * 120);
    return () => { clearTimeout(t); loop.stop(); };
  }, [flick, index]);
  const scale = flick.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.1] });
  const opacity = flick.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Svg width={size} height={(size * 28) / 24} viewBox="0 0 24 28">
        <FlameArt />
      </Svg>
    </Animated.View>
  );
});

/** A spent flame: nothing left but the wick and yesterday's smoke. */
function SpentFlame({ size }: { size: number }) {
  return (
    <Svg width={size} height={(size * 28) / 24} viewBox="0 0 24 28">
      <Path d="M12 19 C9.5 15.8 14.8 14.2 12.6 11 C10.9 8.6 12.2 6 14.2 4.4" stroke="#A8A29E" strokeWidth={1.5} strokeLinecap="round" fill="none" opacity={0.4} />
      <Path d="M11.1 20.5 L12.9 20.5 L12.5 25.5 L11.5 25.5 Z" fill="#44403C" />
      <Circle cx={12} cy={26} r={1.1} fill="#292524" />
    </Svg>
  );
}

/**
 * The flame a fight just spent, caught mid-snuff: the flame shrinks
 * away while a smoke wisp climbs and thins. `long` stretches the trail
 * — used when the spend emptied the store.
 */
function SnuffingFlame({ size, long, onDone }: { size: number; long: boolean; onDone: () => void }) {
  const flameAnim = useRef(new Animated.Value(0)).current;
  const smokeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const smokeDur = long ? 1500 : 850;
    const flame = Animated.timing(flameAnim, { toValue: 1, duration: 300, easing: Easing.in(Easing.sin), useNativeDriver: true });
    const smoke = Animated.timing(smokeAnim, { toValue: 1, duration: smokeDur, easing: Easing.out(Easing.sin), useNativeDriver: true });
    Animated.parallel([flame, smoke]).start();
    const fallback = setTimeout(onDone, smokeDur + 60);
    return () => { flame.stop(); smoke.stop(); clearTimeout(fallback); };
  }, [flameAnim, smokeAnim, long, onDone]);
  const flameScale = flameAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.08] });
  const flameOpacity = flameAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const smokeOpacity = smokeAnim.interpolate({ inputRange: [0, 0.22, 1], outputRange: [0, 0.85, 0] });
  const smokeY = smokeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, long ? -22 : -13] });
  const h = (size * 28) / 24;
  return (
    <View style={{ width: size, height: h }}>
      <View style={{ position: "absolute", left: 0, top: 0 }}>
        <Svg width={size} height={h} viewBox="0 0 24 28">
          <Path d="M11.1 20.5 L12.9 20.5 L12.5 25.5 L11.5 25.5 Z" fill="#44403C" />
        </Svg>
      </View>
      <Animated.View style={{ position: "absolute", left: 0, top: 0, transform: [{ translateY: smokeY }], opacity: smokeOpacity }}>
        <Svg width={size} height={h} viewBox="0 0 24 28">
          <Path d="M12 24 C8.5 19.5 16 17.5 12.8 12.8 C10.4 9.4 12.4 5.8 15.5 3.6" stroke="#D6D3D1" strokeWidth={2} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
      <Animated.View style={{ position: "absolute", left: 0, top: 0, transform: [{ scale: flameScale }], opacity: flameOpacity }}>
        <Svg width={size} height={h} viewBox="0 0 24 28">
          <FlameArt />
        </Svg>
      </Animated.View>
    </View>
  );
}

type EnergyFlamesProps = {
  energy: number;
  max: number;
  /** Max flame slots before the row switches to proportional + "×N". */
  cap: number;
  size: number;
  snuff: SnuffState | null;
  onSnuffDone: () => void;
};

const EnergyFlames = memo(function EnergyFlames({ energy, max, cap, size, snuff, onSnuffDone }: EnergyFlamesProps) {
  const slots = energySlots(max, cap);
  const lit = litForEnergy(energy, max, cap);
  const snuffIndex =
    snuff && litForEnergy(snuff.to, max, cap) < litForEnergy(snuff.from, max, cap)
      ? litForEnergy(snuff.to, max, cap)
      : null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3, alignItems: "flex-end", justifyContent: "center" }}>
      {Array.from({ length: slots }, (_, i) => {
        if (snuff && snuffIndex === i) {
          return <SnuffingFlame key={`snuff-${snuff.key}`} size={size} long={snuff.long} onDone={onSnuffDone} />;
        }
        if (i < lit) return <FlickerFlame key={i} index={i} size={size} />;
        return <SpentFlame key={i} size={size} />;
      })}
      {max > cap && (
        <Text style={{ color: "#FDBA74", fontWeight: "900", fontSize: Math.round(size * 0.82), marginLeft: 3 }}>×{max}</Text>
      )}
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

type Phase = "select" | "fight" | "victory" | "defeat";
type FloatItem = { id: number; text: string; color: string; side: "left" | "right"; crit?: boolean };

let floatId = 0;

export function DarkForest({ stats, trainingBonus = false, trainingBonusPct = 10, forest, tunicColor, armorId, weaponId, hairStyle = "short", hairColor = "#111827", beardStyle = "none", beardLength = 0, bodyStyle = "pebble", timeOfDay, pt, onVictory, bossGate = null, bossGateOpensOn = null, onBossVictory }: DarkForestProps) {
  const [phase, setPhase] = useState<Phase>("select");
  const [wave, setWave] = useState(1);
  const [playerHp, setPlayerHp] = useState(stats.maxHp);
  const [demonHp, setDemonHp] = useState(1);
  const [prayed, setPrayed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [victoryFired, setVictoryFired] = useState(false);
  const [bossFight, setBossFight] = useState<BossDef | null>(null);
  /** Select panel: earlier levels hide behind a replay disclosure. */
  const [showReplay, setShowReplay] = useState(false);
  // Forest energy (lib/forest-energy): max == XP level, 1 per wave
  // fight, rekindled at midnight. Boss Gate fights never spend it.
  const [energyState, setEnergyState] = useState<ForestEnergy | null>(null);
  const [snuff, setSnuff] = useState<SnuffState | null>(null);
  const clearSnuff = useCallback(() => setSnuff(null), []);

  // Hero health (lib/hero-health): HP persists across waves, runs, and
  // app restarts — it settles over time (rest + slow mend) instead of
  // resetting per fight. The Morning Care boon (lib/hero-needs) lifts
  // max HP and attack while it lasts (till midnight).
  const [boon, setBoon] = useState<NeedsBoon>({ active: false, hpPct: 0, atkPct: 0 });
  const [heroHealth, setHeroHealth] = useState<HeroHealthState | null>(null);
  const healthRef = useRef<HeroHealthState | null>(null);

  const effStats: CombatStats = useMemo(
    () =>
      boon.active
        ? {
            ...stats,
            maxHp: Math.round(stats.maxHp * (1 + boon.hpPct)),
            attack: Math.round(stats.attack * (1 + boon.atkPct)),
          }
        : stats,
    [stats, boon.active, boon.hpPct, boon.atkPct]
  );
  /** Persist a new HP value into the settled health state. */
  const persistHp = useCallback((hp: number) => {
    const prev = healthRef.current;
    if (!prev) return;
    const next: HeroHealthState = { ...prev, hp, updatedAt: Date.now() };
    healthRef.current = next;
    setHeroHealth(next);
    void saveHeroHealth(next);
  }, []);

  // (Re)load the store whenever the player is back at the select panel —
  // picks up midnight rekindles and level-ups between fights.
  const backAtSelect = phase === "select";
  useEffect(() => {
    if (!backAtSelect) return;
    let live = true;
    loadForestEnergy().then((e) => { if (live) setEnergyState(e); });
    return () => { live = false; };
  }, [backAtSelect]);

  // Settle hero health whenever the player is back at the select panel
  // (and on mount): house → bed tier (rest %) + Morning Care boon
  // (effective max HP); needs → boon; raw health → settleHealth (day
  // rollover rest, +5% per full 4h, null → full). Persist when the
  // settle changed anything.
  useEffect(() => {
    if (!backAtSelect) return;
    let live = true;
    (async () => {
      try {
        const house = await loadHouseState();
        const settledNeeds = await loadHeroNeeds();
        const b = boonFor(settledNeeds, house);
        if (!live) return;
        setBoon(b);
        const effMax = b.active ? Math.round(stats.maxHp * (1 + b.hpPct)) : stats.maxHp;
        const bedTier = house.rooms.bedroom?.furniture["bed"] || 0;
        const raw = await loadHeroHealthRaw();
        const rawState: HeroHealthState =
          raw ?? { hp: null, updatedAt: Date.now(), day: "", hospitalHealsUsed: 0 };
        const { state: settled, changed } = settleHealth(
          rawState,
          Date.now(),
          effMax,
          restPctForBedTier(bedTier)
        );
        if (!live) return;
        healthRef.current = settled;
        setHeroHealth(settled);
        setPlayerHp(settled.hp ?? effMax);
        if (changed) void saveHeroHealth(settled);
      } catch {}
    })();
    return () => { live = false; };
  }, [backAtSelect, stats.maxHp]);

  const noEnergy = energyState !== null && energyState.energy <= 0;

  const demon: DemonDef = useMemo(() => demonForWave(wave), [wave]);
  const { zone, cycle } = useMemo(() => zoneForWave(wave), [wave]);
  const nextZoneInfo = useMemo(() => zoneForWave(wave + 1), [wave]);
  const maxWave = forest.highestWave + 1;

  // The foe abstraction: a boss fight borrows the whole combat loop. The
  // scene becomes the boss's own zone; the boss wears its badge's colors.
  const bossBadge = bossFight ? BADGE_BY_ID[bossFight.badgeId] : null;
  const sceneZone: ForestZone = bossFight ? FOREST_ZONES[bossFight.zoneIndex] : zone;
  const sceneCycle = bossFight ? 0 : cycle;
  const foeName = bossFight ? bossFight.displayName : demon.name;
  const foeTitle = bossFight ? `${bossBadge?.bossTitle ?? ""} · Boss` : TIER_NAMES[demon.tier];
  const foeColor = bossFight ? (bossBadge?.primary ?? "#F87171") : TIER_COLORS[demon.tier];
  const foeHp = bossFight ? bossFight.hp : demon.hp;
  const foeAttack = bossFight ? bossFight.attack : demon.attack;
  const foePalette = bossFight && bossBadge
    ? { K: "#050505", D: bossBadge.body, E: bossBadge.eye, M: "#F8FAFC", W: bossBadge.horn }
    : demonPalette(zone, demon.tier, cycle);

  const swordSwing = useRef(new Animated.Value(0)).current;
  const demonFlash = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const pushFloat = (text: string, color: string, side: "left" | "right", crit = false) => {
    const id = ++floatId;
    setFloats((f) => [...f.slice(-5), { id, text, color, side, crit }]);
  };
  const dropFloat = (id: number) => setFloats((f) => f.filter((x) => x.id !== id));

  /**
   * Spend 1 energy for a wave fight (win or lose, it's spent on entry).
   * The local store updates optimistically so the spent flame can play
   * its snuff animation in the fight HUD; lib/forest-energy persists.
   * Returns false — and starts nothing — when the store is empty.
   */
  const spendEnergyForWave = (): boolean => {
    if (!energyState || energyState.energy <= 0) return false;
    const from = energyState.energy;
    const to = from - 1;
    setEnergyState({ ...energyState, energy: to });
    setSnuff({ from, to, key: Date.now(), long: to === 0 });
    void spendForestEnergy();
    return true;
  };

  const startWave = (w: number) => {
    if (!spendEnergyForWave()) return;
    setBossFight(null);
    setWave(w);
    // HP is NOT reset: the settled/persisted pool carries across waves.
    setDemonHp(demonForWave(w).hp);
    setPrayed(false);
    setBusy(false);
    setFloats([]);
    setVictoryFired(false);
    setPhase("fight");
  };

  /** Enter the Boss Gate: the prestige boss, in its own zone. */
  const startBoss = () => {
    if (!bossGate || bossGate.cleared) return;
    setBossFight(bossGate.boss);
    // Same HP pool as wave fights — no reset at the gate either.
    setDemonHp(bossGate.boss.hp);
    setPrayed(false);
    setBusy(false);
    setFloats([]);
    setVictoryFired(false);
    setPhase("fight");
  };

  const leaveBoss = () => {
    setBossFight(null);
    setPhase("select");
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
    // Critical: chance from combat stats (base + Zeal), 150% damage,
    // announced in gold with a pulse (see FloatText's crit swell).
    const crit = Math.random() < (effStats.critChance ?? BASE_CRIT_CHANCE);
    const dmg = Math.max(1, Math.round(effStats.attack * (0.9 + Math.random() * 0.2) * (crit ? CRIT_DAMAGE_MULT : 1)));
    pushFloat(crit ? `CRIT ${dmg}!` : `${dmg}`, crit ? "#FDE68A" : "#FFFFFF", "right", crit);
    const newDemonHp = Math.max(0, demonHp - dmg);
    setDemonHp(newDemonHp);

    setTimeout(() => {
      if (!alive.current) return;
      if (newDemonHp <= 0) {
        // Victory: the HP he finished with is the HP he keeps.
        persistHp(playerHp);
        setPhase("victory");
        setBusy(false);
        if (!victoryFired) {
          setVictoryFired(true);
          if (bossFight) onBossVictory?.(bossFight);
          else onVictory(wave);
        }
        return;
      }
      // The foe retaliates.
      const raw = foeAttack * (0.9 + Math.random() * 0.2);
      const taken = Math.max(1, Math.round(raw - effStats.defense));
      shakeScene();
      pushFloat(`${taken}`, "#F87171", "left");
      const newPlayerHp = Math.max(0, playerHp - taken);
      setPlayerHp(newPlayerHp);
      if (newPlayerHp > 0) {
        persistHp(newPlayerHp);
      } else {
        // Defeat: he wakes at home (lib/hero-health decides the HP he
        // wakes with) and that state is what persists. The HUD keeps
        // showing 0 on the defeat panel; returning to select re-settles
        // and surfaces the woken HP.
        const prev = healthRef.current;
        if (prev) {
          const woken = wakeAfterDefeat({ ...prev, hp: 0 }, effStats.maxHp);
          healthRef.current = woken;
          setHeroHealth(woken);
          void saveHeroHealth(woken);
        }
      }
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
    // The heal amount and once-per-fight gating are unchanged. The cap
    // follows the effective max (boon included) so praying at boon-
    // lifted HP can never lower it; with no boon, effStats === stats.
    setPlayerHp((h) => Math.min(effStats.maxHp, h + heal));
    persistHp(Math.min(effStats.maxHp, playerHp + heal));
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
            {/* sky wash — the zone's own night (the boss's zone in a boss fight) */}
            <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill={sceneZone.sky} />
            {sceneZone.moonKind === "none" ? (
              <>
                {/* The Starless Deep: no moon — one crack of light far above. */}
                <Path d="M 250 0 L 268 0 L 259 54 L 274 100 L 253 158 L 246 62 Z" fill="#E2E8F0" opacity={0.1} />
                <Path d="M 255 0 L 261 0 L 257 62 L 264 112 L 252 158 L 249 62 Z" fill="#F8FAFC" opacity={0.16} />
                <Ellipse cx={254} cy={392} rx={72} ry={10} fill="#E2E8F0" opacity={0.07} />
              </>
            ) : sceneZone.moonKind === "eclipse" ? (
              <>
                <Circle cx={308} cy={54} r={36} fill={sceneZone.moonGlow} opacity={0.16} />
                <Circle cx={308} cy={54} r={24} fill="none" stroke={sceneZone.moonGlow} strokeWidth={2.6} opacity={0.9} />
                <Circle cx={308} cy={54} r={21} fill={sceneZone.moon} />
              </>
            ) : sceneZone.moonKind === "blood" ? (
              <>
                <Circle cx={308} cy={58} r={46} fill={sceneZone.moonGlow} opacity={0.28} />
                <Circle cx={308} cy={58} r={31} fill={sceneZone.moon} opacity={0.95} />
                <Circle cx={298} cy={50} r={5} fill={sceneZone.moonGlow} opacity={0.5} />
              </>
            ) : sceneZone.moonKind === "ember" ? (
              <>
                <Circle cx={308} cy={60} r={42} fill={sceneZone.moonGlow} opacity={0.3} />
                <Circle cx={308} cy={60} r={26} fill={sceneZone.moon} opacity={0.95} />
              </>
            ) : (
              <>
                <Circle cx={308} cy={54} r={34} fill={sceneZone.moonGlow} opacity={0.12} />
                <Circle cx={308} cy={54} r={22} fill={sceneZone.moon} opacity={0.9} />
              </>
            )}
            {/* ground */}
            <Rect x={0} y={400} width={SCENE_W} height={100} fill={sceneZone.ground} />
            <Rect x={0} y={396} width={SCENE_W} height={8} fill={sceneZone.groundEdge} />
            {/* dead trees, back row */}
            {[
              { x: 30, s: 1.1 }, { x: 120, s: 0.8 }, { x: 250, s: 1 }, { x: 320, s: 0.85 },
            ].map((t, i) => (
              <G key={i} transform={`translate(${t.x} 210) scale(${t.s * 7})`}>
                {DEAD_TREE_ART.map((row, y) =>
                  [...row].map((ch, x) =>
                    ch === "." ? null : <Rect key={`${x}:${y}`} x={x} y={y} width={1.04} height={1.04} fill={sceneZone.deadTree} />
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
                      <Rect key={`${x}:${y}`} x={x} y={y} width={1.04} height={1.04} fill={ch === "T" ? sceneZone.pineTrunk : sceneZone.pine} />
                    )
                  )
                )}
              </G>
            ))}
            <ZoneScenery zone={sceneZone} />
            {sceneCycle > 0 && <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill="#000000" opacity={Math.min(0.38, 0.12 * sceneCycle)} />}
          </Svg>

          {/* ambient life */}
          <WatchingEyes x={150} y={150} delay={0} color={sceneZone.eyes} />
          <WatchingEyes x={230} y={210} delay={1400} color={sceneZone.eyes} />
          <WatchingEyes x={90} y={250} delay={2600} color={sceneZone.eyes} />
          <Mist seed={1} top={330} color={sceneZone.mist} opacity={sceneZone.mistOpacity} />
          <Mist seed={2} top={370} color={sceneZone.mist} opacity={sceneZone.mistOpacity} />
          {sceneZone.spark != null && !sceneZone.snow && (
            <>
              <Ember x={80} delay={0} dur={5200} color={sceneZone.spark} />
              <Ember x={200} delay={1800} dur={6400} color={sceneZone.spark} />
              <Ember x={290} delay={900} dur={5800} color={sceneZone.spark} />
            </>
          )}
          {sceneZone.snow && (
            <>
              {[{ l: 40, t: 90 }, { l: 120, t: 190 }, { l: 210, t: 70 }, { l: 300, t: 160 }, { l: 170, t: 280 }, { l: 70, t: 320 }, { l: 260, t: 300 }, { l: 330, t: 250 }].map((s, i) => (
                <View key={i} pointerEvents="none" style={{ position: "absolute", left: s.l, top: s.t, width: 4, height: 4, borderRadius: 2, backgroundColor: "#E0F2FE", opacity: 0.75 }} />
              ))}
            </>
          )}

          {/* combatants */}
          {(phase === "fight" || phase === "victory" || phase === "defeat") && (
            <>
              {/* pawn */}
              <View style={{ position: "absolute", left: 52, top: 250 }}>
                {armorGlowColor(armorId) && (
                  <TierGlow color={armorGlowColor(armorId)!} size={104} left={-20} top={-17} />
                )}
                <PixelSprite art={heroArtForBodyStyle(bodyStyle)} palette={pawnPalette} px={5} />
                {armorId && (
                  <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
                    <Svg width={65} height={70} viewBox="0 0 65 70">
                      <ArmorShapes armorId={armorId} />
                    </Svg>
                  </View>
                )}
                {/* the hero's own hair + beard, from the saved appearance */}
                <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0 }}>
                  <Svg width={65} height={70} viewBox="0 0 65 70">
                    <HeroHair style={hairStyle} color={hairColor} />
                    <HeroBeard style={beardStyle} length={beardLength} color={hairColor} />
                  </Svg>
                </View>
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
              {/* demon — a boss stands larger, in its badge's own colors */}
              {phase !== "victory" && (
                <Animated.View style={{ position: "absolute", left: bossFight ? 172 : 218, top: bossFight ? 216 : 258, opacity: demonOpacity }}>
                  {bossFight && bossBadge && <TierGlow color={bossBadge.primary} size={176} left={-30} top={-24} />}
                  <PixelSprite art={DEMON_ART} palette={foePalette} px={bossFight ? 8 : 5} />
                </Animated.View>
              )}
              {/* floating damage numbers */}
              {floats.map((f) => (
                <View key={f.id} style={{ position: "absolute", left: f.side === "left" ? 70 : 236, top: 236 }}>
                  <FloatText text={f.text} color={f.color} crit={f.crit} onDone={() => dropFloat(f.id)} />
                </View>
              ))}
            </>
          )}

          {/* HUD */}
          <View style={{ position: "absolute", left: 12, right: 12, top: 10 }}>
            {phase === "fight" || phase === "victory" || phase === "defeat" ? (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ color: "#E2E8F0", fontWeight: "800", fontSize: 13 }}>{bossFight ? "Boss Gate" : `Level ${wave}`}</Text>
                  <Text style={{ color: foeColor, fontWeight: "800", fontSize: 13 }}>
                    {foeName} · {foeTitle}
                  </Text>
                </View>
                <HpBar hp={demonHp} maxHp={foeHp} color={foeColor} />
                <View style={{ height: 8 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <Text style={{ color: "#E2E8F0", fontWeight: "800", fontSize: 13 }}>You</Text>
                  <Text style={{ color: "#93C5FD", fontWeight: "700", fontSize: 12 }}>
                    {playerHp}/{effStats.maxHp} HP
                  </Text>
                </View>
                <HpBar hp={playerHp} maxHp={effStats.maxHp} color="#60A5FA" />
                {energyState && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 5 }}>
                    <EnergyFlames energy={energyState.energy} max={energyState.max} cap={12} size={11} snuff={snuff} onSnuffDone={clearSnuff} />
                    <Text style={{ color: "#FDBA74", fontWeight: "700", fontSize: 10 }}>
                      {energyState.energy}/{energyState.max} energy
                    </Text>
                  </View>
                )}
                <Text style={{ color: "#8B8BA8", fontWeight: "700", fontSize: 10, marginTop: 4 }}>
                  {bossFight ? `${zoneLabel(sceneZone, 0)} — the Boss Gate` : zoneLabel(zone, cycle)}
                </Text>
              </>
            ) : (
              <Text style={{ color: "#E2E8F0", fontWeight: "800", fontSize: 15, textAlign: "center", marginTop: 4 }}>
                The Dark Forest
              </Text>
            )}
          </View>

          {/* bottom panel — combat phases only. The select panels live
              in normal flow below the scene (see under the scene View), so
              nothing overlaps the scene or its title and nothing clips. */}
          {phase !== "select" && (
          <View style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
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
            {phase === "victory" && bossFight && bossBadge && (
              <View style={{ backgroundColor: "rgba(10,25,15,0.92)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: bossBadge.primary, alignItems: "center" }}>
                <Text style={{ color: "#4ADE80", fontWeight: "900", fontSize: 18, marginBottom: 6 }}>The Boss Has Fallen!</Text>
                <BadgeMedallion badge={bossBadge} earned size={72} />
                <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 15, marginTop: 6 }}>
                  {bossBadge.name} earned
                </Text>
                <Text style={{ color: "#C7D2FE", fontSize: 12.5, marginBottom: 4 }}>
                  {bossBadge.perk} — yours forever. Prestige cannot take it.
                </Text>
                <Text style={{ color: "#E2E8F0", fontSize: 13, marginBottom: 10 }}>
                  +{formatCoins(bossFight.coins)} coins · +{bossFight.xp} XP · the Boss Gate stands open
                </Text>
                <Pressable
                  onPress={leaveBoss}
                  style={{ backgroundColor: "#166534", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Return to the Forest</Text>
                </Pressable>
              </View>
            )}
            {phase === "victory" && !bossFight && (
              <View style={{ backgroundColor: "rgba(10,25,15,0.92)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#4ADE80", alignItems: "center" }}>
                <Text style={{ color: "#4ADE80", fontWeight: "900", fontSize: 18, marginBottom: 4 }}>Victory!</Text>
                <Text style={{ color: "#E2E8F0", fontSize: 13, marginBottom: 10 }}>
                  {demon.name} is banished. +{formatCoins(demon.coins)} coins · +{demon.xp} XP
                </Text>
                {wave % 10 === 0 && (
                  <Text style={{ color: "#C7D2FE", fontSize: 12, marginBottom: 10, fontStyle: "italic", textAlign: "center" }}>
                    The path leads on into {zoneLabel(nextZoneInfo.zone, nextZoneInfo.cycle)}.
                  </Text>
                )}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable
                    onPress={() => startWave(wave + 1)}
                    disabled={noEnergy}
                    style={{ backgroundColor: "#166534", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, opacity: noEnergy ? 0.45 : 1 }}
                  >
                    <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Next Level</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setPhase("select")}
                    style={{ backgroundColor: "#1F2937", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1, borderColor: "#4B5563" }}
                  >
                    <Text style={{ color: "#E2E8F0", fontWeight: "800" }}>Rest</Text>
                  </Pressable>
                </View>
                {noEnergy && (
                  <Text style={{ color: "#FCA5A5", fontSize: 11.5, fontWeight: "700", marginTop: 8 }}>
                    No energy — your strength returns at midnight.
                  </Text>
                )}
              </View>
            )}
            {phase === "defeat" && (
              <View style={{ backgroundColor: "rgba(25,10,10,0.92)", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#7F1D1D", alignItems: "center" }}>
                <Text style={{ color: "#F87171", fontWeight: "900", fontSize: 16, marginBottom: 4 }}>Overwhelmed…</Text>
                <Text style={{ color: "#C7D2FE", fontSize: 13, marginBottom: 10, textAlign: "center", fontStyle: "italic" }}>
                  {bossFight
                    ? "The boss holds the gate — for now. Nothing is lost: grow stronger, earn your badges, and return."
                    : "The darkness was too strong. Upgrade your gear and try again — nothing is lost."}
                </Text>
                <Pressable
                  onPress={bossFight ? leaveBoss : () => setPhase("select")}
                  style={{ backgroundColor: "#3B2F6B", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Retreat</Text>
                </Pressable>
              </View>
            )}
          </View>
          )}
        </View>
      </Animated.View>

      {phase === "select" && bossGate && (() => {
        const badge = BADGE_BY_ID[bossGate.boss.badgeId];
        return (
          <View style={{ backgroundColor: bossGate.cleared ? "rgba(8,30,18,0.92)" : "rgba(30,10,14,0.92)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: bossGate.cleared ? "#4ADE80" : badge.primary, width: SCENE_W, alignSelf: "center", marginTop: 10 }}>
            <Text style={{ color: bossGate.cleared ? "#4ADE80" : "#FCA5A5", fontWeight: "900", fontSize: 11, letterSpacing: 1.6, textAlign: "center", marginBottom: 8 }}>
              THE BOSS GATE
            </Text>
            {bossGate.cleared ? (
              <Text style={{ color: "#E2E8F0", fontSize: 12.5, textAlign: "center", lineHeight: 18 }}>
                {bossGate.boss.name} is defeated and the {badge.name} is yours.{"\n"}
                <Text style={{ color: "#4ADE80", fontWeight: "800" }}>Begin Again stands open.</Text>
              </Text>
            ) : (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <BadgeMedallion badge={badge} earned={false} size={56} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 15 }}>
                      {bossGate.boss.displayName}
                    </Text>
                    <Text style={{ color: badge.primary, fontWeight: "700", fontSize: 11.5 }}>
                      {badge.bossTitle} · guards the {badge.name}
                    </Text>
                    <Text style={{ color: "#C7D2FE", fontSize: 11, marginTop: 2 }}>
                      {badge.perk} · {bossGate.boss.hp.toLocaleString()} HP · {bossGate.boss.attack} ATK
                    </Text>
                  </View>
                </View>
                <Text style={{ color: "#8B8BA8", fontSize: 11, textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
                  A Begin Again is waiting — but the way is shut until this boss falls. Defeat costs nothing.
                </Text>
                <Pressable
                  onPress={startBoss}
                  style={{ backgroundColor: "#991B1B", borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 8, borderWidth: 1, borderColor: badge.primary }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 14, letterSpacing: 1 }}>FACE THE BOSS</Text>
                </Pressable>
              </>
            )}
          </View>
        );
      })()}
      {/* Gate shut until the fast's last day: one quiet line in its
          place (host passes bossGateOpensOn only when an offer waits). */}
      {phase === "select" && !bossGate && bossGateOpensOn && (() => {
        const label = gateOpensLabel(bossGateOpensOn);
        return (
          <View style={{ width: SCENE_W, alignSelf: "center", marginTop: 10, paddingHorizontal: 12 }}>
            <Text style={{ color: "rgba(199,210,254,0.6)", fontSize: 12, textAlign: "center", fontStyle: "italic" }}>
              {label
                ? `The Boss Gate opens ${label} — the last day of your fast.`
                : "The Boss Gate opens on the last day of your fast."}
            </Text>
          </View>
        );
      })()}
      {/* Level select — normal flow under the scene: the current level
          up front, earlier levels behind one replay disclosure. The card
          grows with its content and the page scrolls; nothing overlaps. */}
      {phase === "select" && (
        <View style={{ width: SCENE_W, alignSelf: "center", marginTop: 10, backgroundColor: "rgba(10,10,25,0.88)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "#3A3A5E" }}>
          {energyState && (
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <Text style={{ color: "#FDBA74", fontSize: 10, fontWeight: "900", letterSpacing: 1.6, marginBottom: 5 }}>
                FOREST ENERGY · {energyState.energy}/{energyState.max}
              </Text>
              <EnergyFlames energy={energyState.energy} max={energyState.max} cap={24} size={17} snuff={snuff} onSnuffDone={clearSnuff} />
              <Text style={{ color: "#8B8BA8", fontSize: 11, marginTop: 5 }}>
                Rekindles at midnight · Lv {energyState.max} = {energyState.max} energy
              </Text>
            </View>
          )}
          <Text style={{ color: "#C7D2FE", fontSize: 12, textAlign: "center", marginBottom: trainingBonus ? 2 : 8 }}>
            Attack {effStats.attack} · Defense {effStats.defense} · {effStats.maxHp} HP · {Math.round((effStats.critChance ?? BASE_CRIT_CHANCE) * 100)}% crit — your strength for the forest.
          </Text>
          {boon.active && (
            <Text style={{ color: "#FDE68A", fontSize: 11.5, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
              Set for the Day — forest strength till midnight.
            </Text>
          )}
          {heroHealth && (
            <Text style={{ color: playerHp < effStats.maxHp ? "#FCA5A5" : "#93C5FD", fontSize: 12, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
              HP {playerHp}/{effStats.maxHp}
            </Text>
          )}
          {heroHealth && playerHp < effStats.maxHp && (
            <Text style={{ color: "#8B8BA8", fontSize: 11.5, textAlign: "center", marginBottom: 8 }}>
              Wounded? The hospital in town heals free — 2 visits a day.
            </Text>
          )}
          {trainingBonus && (
            <Text style={{ color: "#F2C14E", fontSize: 11.5, fontWeight: "700", textAlign: "center", marginBottom: 8 }}>
              Training bonus active — +{trainingBonusPct}% attack &amp; defense until midnight.
            </Text>
          )}
          {(() => {
            const cur = zoneForWave(maxWave);
            const d = demonForWave(maxWave);
            const zoneIdx = FOREST_ZONES.indexOf(cur.zone) + 1;
            return (
              <>
                <Text style={{ color: "#E2E8F0", fontWeight: "800", fontSize: 13, textAlign: "center" }}>
                  {zoneLabel(cur.zone, cur.cycle)}
                </Text>
                <Text style={{ color: "#8B8BA8", fontSize: 11, textAlign: "center", marginBottom: 8, fontStyle: "italic" }}>
                  {cur.zone.blurb}
                </Text>
                {/* The current level: the next uncleared demon, one tap. */}
                <Pressable
                  onPress={() => startWave(maxWave)}
                  disabled={noEnergy || energyState === null}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#3B2F6B", borderRadius: 10, borderWidth: 1, borderColor: TIER_COLORS[d.tier], paddingHorizontal: 14, paddingVertical: 10, opacity: noEnergy || energyState === null ? 0.45 : 1 }}
                >
                  <View>
                    <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 16 }}>Level {maxWave}</Text>
                    <Text style={{ color: TIER_COLORS[d.tier], fontSize: 11.5, fontWeight: "700" }}>{d.name} · {TIER_NAMES[d.tier]}</Text>
                  </View>
                  <View style={{ backgroundColor: "#991B1B", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: "#F87171" }}>
                    <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 13, letterSpacing: 0.6 }}>FIGHT</Text>
                  </View>
                </Pressable>
                <Text style={{ color: "#8B8BA8", fontSize: 11, textAlign: "center", marginTop: 8 }}>
                  {forest.highestWave} {forest.highestWave === 1 ? "level" : "levels"} cleared · Zone {zoneIdx} of {FOREST_ZONES.length}
                </Text>
                {noEnergy && (
                  <Text style={{ color: "#FCA5A5", fontSize: 11.5, fontWeight: "700", textAlign: "center", marginTop: 6 }}>
                    No energy — your strength returns at midnight.
                  </Text>
                )}
                {/* Replay: every earlier level, behind one disclosure row. */}
                <Pressable
                  onPress={() => setShowReplay((s) => !s)}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingVertical: 4 }}
                >
                  <Text style={{ color: "#C7D2FE", fontSize: 12, fontWeight: "700" }}>Replay earlier levels</Text>
                  <Text style={{ color: "#8B8BA8", fontSize: 12, fontWeight: "700" }}>{showReplay ? "Hide" : "Show"}</Text>
                </Pressable>
                {showReplay && (
                  <ScrollView style={{ maxHeight: 196 }} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: Math.ceil(maxWave / 10) }, (_, g) => g).map((g) => {
                      const zInfo = zoneForWave(g * 10 + 1);
                      const levels = Array.from({ length: Math.min(10, maxWave - g * 10) }, (_, i) => g * 10 + i + 1);
                      return (
                        <View key={g} style={{ marginBottom: 8 }}>
                          <Text style={{ color: "#C7D2FE", fontWeight: "800", fontSize: 11, marginBottom: 4 }}>
                            {zoneLabel(zInfo.zone, zInfo.cycle)}
                          </Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                            {levels.map((w) => {
                              const d = demonForWave(w);
                              const cleared = w <= forest.highestWave;
                              return (
                                <Pressable
                                  key={w}
                                  onPress={() => startWave(w)}
                                  disabled={noEnergy || energyState === null}
                                  style={{
                                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                                    backgroundColor: cleared ? "#1E3A2E" : "#3B2F6B",
                                    borderWidth: 1, borderColor: cleared ? "#4ADE80" : TIER_COLORS[d.tier],
                                    opacity: noEnergy || energyState === null ? 0.45 : 1,
                                  }}
                                >
                                  <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>
                                    {cleared ? "✓ " : ""}Level {w}
                                  </Text>
                                  <Text style={{ color: TIER_COLORS[d.tier], fontSize: 10 }}>{d.name}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            );
          })()}
          <Text style={{ color: "#8B8BA8", fontSize: 11, textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
            Stronger blades and armor from the Weaponsmith and Armory let you push deeper.
          </Text>
        </View>
      )}

      {/* verse line under the scene */}
      <Text style={{ marginTop: 10, fontSize: 12, color: pt.subtext, fontStyle: "italic", textAlign: "center", paddingHorizontal: 16 }}>
        &ldquo;Resist the devil, and he will flee from you.&rdquo; — James 4:7
      </Text>
      {isNight && <View style={{ height: 0 }} />}
    </View>
  );
}
