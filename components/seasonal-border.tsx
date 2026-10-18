import React, { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Path, Polygon, Rect } from "react-native-svg";
import { getTimeOfDay, SKY_THEMES, type TimeOfDay } from "@/lib/daynight";

/**
 * Living border around the Hometown maps: each map sits inside a world
 * that breathes with the day.
 *
 * - Top + upper half of the sides: sky (existing sun/moon, drifting
 *   clouds, twinkling stars, golden prayer stars).
 * - Bottom: a beach — sand plus animated SVG waves, shifting color
 *   with the time of day.
 * - Sides vary per map (variant prop):
 *     town   → city skyline left, pine forest right
 *     city   → ocean left (water halfway up, then sky), hometown cottages right
 *     school / garden / well / field → quiet woods on both sides
 *
 * Windows glow warm at dusk and night, dark by day.
 *
 * Purely decorative — pointerEvents disabled, native-driver animations.
 * No emojis anywhere; all art is drawn (Views / SVG).
 */

const TOP_H = 26;
const SIDE_W = 26;
const BEACH_H = 44;

/** Per-time-of-day colors for the city / forest / beach scenes. */
type SceneTheme = {
  building: string;
  windowDark: string;
  windowLit: string;
  tree: string;
  treeDark: string;
  trunk: string;
  ground: string;
  sand: string;
  water: string;
  waterDeep: string;
  cottageBody: string;
  cottageRoof: string;
};

const SCENE_THEMES: Record<TimeOfDay, SceneTheme> = {
  morning: {
    building: "#9AA8BC", windowDark: "#6B7A90", windowLit: "#FFE9A8",
    tree: "#55A465", treeDark: "#3E8A52", trunk: "#8A6A45", ground: "#6B8E5A",
    sand: "#F2DFAE", water: "#7DD3FC", waterDeep: "#38BDF8",
    cottageBody: "#F5EFE0", cottageRoof: "#B08968",
  },
  afternoon: {
    building: "#8FA3B8", windowDark: "#5B6B7F", windowLit: "#FFE9A8",
    tree: "#4D9E5F", treeDark: "#3A7D4C", trunk: "#7C5A3A", ground: "#5F8A52",
    sand: "#F5DEB3", water: "#5ECBF5", waterDeep: "#2EA8E0",
    cottageBody: "#F5EFE0", cottageRoof: "#B08968",
  },
  evening: {
    building: "#6B5570", windowDark: "#4A3F55", windowLit: "#FCD34D",
    tree: "#3F7D4E", treeDark: "#2E5D3A", trunk: "#6B4A30", ground: "#4A6B42",
    sand: "#E8B88A", water: "#F0A06A", waterDeep: "#D97F4E",
    cottageBody: "#E8D9C0", cottageRoof: "#8A5A44",
  },
  night: {
    building: "#23233D", windowDark: "#141428", windowLit: "#FDE68A",
    tree: "#1F4030", treeDark: "#142A20", trunk: "#3A2E22", ground: "#16241A",
    sand: "#4A4A6A", water: "#2A4A6E", waterDeep: "#1E3A5F",
    cottageBody: "#4A4A6A", cottageRoof: "#2E2E4A",
  },
};

/** Which map the border frames — each map gets its own side scenery. */
export type BorderVariant = "town" | "city" | "school" | "garden" | "well" | "field";

/** A soft cloud drifting across the top of the frame. */
function DriftingCloud({ top, size, duration, delay, color }: { top: number; size: number; duration: number; delay: number; color: string }) {
  const translateX = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, { toValue: 400, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -80, duration: 1, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(t);
      loop.stop();
    };
  }, [delay, duration, translateX]);

  return (
    <Animated.View style={{ position: "absolute", top, left: 0, opacity: 0.55, transform: [{ translateX }] }}>
      <View style={{ width: size, height: size * 0.5, backgroundColor: color, borderRadius: size * 0.25 }} />
      <View style={{ position: "absolute", left: size * 0.2, top: -size * 0.2, width: size * 0.45, height: size * 0.45, backgroundColor: color, borderRadius: size * 0.22 }} />
    </Animated.View>
  );
}

/** A star that gently twinkles. */
function TwinkleStar({ left, top, size, delay, duration }: { left: number; top: number; size: number; delay: number; duration: number }) {
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => twinkle.start(), delay);
    return () => {
      clearTimeout(t);
      twinkle.stop();
    };
  }, [delay, duration, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left, top, width: size, height: size, borderRadius: size / 2, backgroundColor: "#FFFBEA", opacity }}
    />
  );
}

/** A golden prayer star — one per person prayed for today. Drawn SVG, no emoji. */
function PrayerStar({ left, top, delay }: { left: number; top: number; delay: number }) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const twinkle = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => twinkle.start(), delay);
    return () => {
      clearTimeout(t);
      twinkle.stop();
    };
  }, [delay, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left, top, opacity }}
    >
      <Svg width={13} height={13} viewBox="0 0 24 24">
        <Path
          d="M12 2l2.9 6.26 6.6 1.04-4.75 4.87L17.8 21 12 17.77 6.2 21l1.05-6.83L2.5 9.3l6.6-1.04L12 2z"
          fill="#FDE68A"
        />
      </Svg>
    </Animated.View>
  );
}

/** A snowflake drifting gently downward (December only). Rendered as a
 *  soft white dot — calm, not cartoonish. */
function Snowflake({ left, delay, duration, size }: { left: number; delay: number; duration: number; size: number }) {
  const y = useRef(new Animated.Value(-10)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fall = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 300, duration, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(y, { toValue: -10, duration: 1, useNativeDriver: true }),
      ])
    );
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: duration * 0.2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.9, duration: duration * 0.6, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: duration * 0.2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => {
      fall.start();
      fade.start();
    }, delay);
    return () => {
      clearTimeout(t);
      fall.stop();
      fade.stop();
    };
  }, [delay, duration, y, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left, top: 0, opacity, transform: [{ translateY: y }] }}
    >
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#FFFFFF" }} />
    </Animated.View>
  );
}

/** Sun or moon with a gentle breathing glow. */
function CelestialOrb({ color, glowColor, isMoon }: { color: string; glowColor: string; isMoon: boolean }) {
  const glow = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 0.75, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.5, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [glow]);

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 4, right: 34 }}>
      <Animated.View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: glowColor, opacity: glow }} />
      <View style={{ position: "absolute", top: 7, left: 7, width: 20, height: 20, borderRadius: 10, backgroundColor: color }}>
        {isMoon && (
          <View style={{ position: "absolute", top: 4, left: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.12)" }} />
        )}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* City skyline (left gutter, lower half)                              */
/* ------------------------------------------------------------------ */

function CityBuilding({
  left, width, height, scene, glow, lit, seed,
}: {
  left: number; width: number; height: number; scene: SceneTheme;
  glow: Animated.Value; lit: boolean; seed: number;
}) {
  const cols = Math.max(1, Math.floor((width - 2) / 3.5));
  const rows = Math.max(1, Math.floor((height - 6) / 6));
  const windows: ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isLit = lit && ((r * 5 + c * 11 + seed) % 3 !== 0);
      const pos = { position: "absolute" as const, left: 2 + c * 3.5, top: 4 + r * 6, width: 2, height: 3, borderRadius: 0.5 };
      windows.push(
        isLit ? (
          <Animated.View key={`${r}-${c}`} style={[pos, { backgroundColor: scene.windowLit, opacity: glow }]} />
        ) : (
          <View key={`${r}-${c}`} style={[pos, { backgroundColor: scene.windowDark }]} />
        )
      );
    }
  }
  return (
    <View style={{ position: "absolute", left, bottom: 0, width, height, backgroundColor: scene.building, borderTopLeftRadius: 1, borderTopRightRadius: 1 }}>
      {windows}
    </View>
  );
}

function CitySkyline({ scene, lit }: { scene: SceneTheme; lit: boolean }) {
  const glow = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.65, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [glow]);

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <CityBuilding left={1} width={8} height={54} scene={scene} glow={glow} lit={lit} seed={3} />
      <CityBuilding left={10} width={9} height={78} scene={scene} glow={glow} lit={lit} seed={7} />
      <CityBuilding left={20} width={6} height={42} scene={scene} glow={glow} lit={lit} seed={11} />
      {/* Antenna on the tallest tower, with a soft red beacon */}
      <View style={{ position: "absolute", left: 14, bottom: 78, width: 1.5, height: 8, backgroundColor: scene.building }} />
      <Animated.View style={{ position: "absolute", left: 13.2, bottom: 86, width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#F87171", opacity: glow }} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pine forest (right gutter, lower half)                              */
/* ------------------------------------------------------------------ */

function PineTree({ size, scene }: { size: number; scene: SceneTheme }) {
  const w = size * 0.55;
  return (
    <Svg width={w} height={size} viewBox="0 0 22 40">
      <Polygon points="11,1 19,15 3,15" fill={scene.tree} />
      <Polygon points="11,10 21,26 1,26" fill={scene.treeDark} />
      <Polygon points="11,20 20,33 2,33" fill={scene.tree} />
      <Rect x="9" y="33" width="4" height="7" fill={scene.trunk} />
    </Svg>
  );
}

function SwayingTree({
  size, scene, left, bottom, duration, delay, sway,
}: {
  size: number; scene: SceneTheme; left: number; bottom: number;
  duration: number; delay: number; sway: number;
}) {
  const x = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: sway, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(x, { toValue: -sway, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => anim.start(), delay);
    return () => {
      clearTimeout(t);
      anim.stop();
    };
  }, [delay, duration, sway, x]);

  return (
    <Animated.View style={{ position: "absolute", left, bottom, transform: [{ translateX: x }] }}>
      <PineTree size={size} scene={scene} />
    </Animated.View>
  );
}

function ForestStrip({ scene }: { scene: SceneTheme }) {
  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <SwayingTree size={62} scene={scene} left={-4} bottom={6} duration={2800} delay={0} sway={1.6} />
      <SwayingTree size={44} scene={scene} left={8} bottom={6} duration={3400} delay={700} sway={1.2} />
      <SwayingTree size={54} scene={scene} left={13} bottom={6} duration={3100} delay={1400} sway={1.4} />
      {/* Ground */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, backgroundColor: scene.ground }} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Ocean (city left gutter): water rising halfway up the side, then    */
/* sky above. Gentle sliding wavelets along the surface.               */
/* ------------------------------------------------------------------ */

// Small repeating wavelet: one full swell every 50px, so a -100px slide loops seamlessly.
const OCEAN_WAVE = "M0,6 Q12.5,1 25,6 T50,6 T75,6 T100,6 T125,6 T150,6 T175,6 T200,6 L200,12 L0,12 Z";

function OceanStrip({ scene }: { scene: SceneTheme }) {
  const x1 = useRef(new Animated.Value(0)).current;
  const x2 = useRef(new Animated.Value(-25)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(x1, { toValue: -100, duration: 8000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(x1, { toValue: 0, duration: 1, useNativeDriver: true }),
      ])
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(x2, { toValue: -125, duration: 12000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(x2, { toValue: -25, duration: 1, useNativeDriver: true }),
      ])
    );
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [x1, x2]);

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      {/* Water fills the lower ~two-thirds; sky shows above */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: "35%", backgroundColor: scene.waterDeep, overflow: "hidden" }}>
        <Animated.View style={{ position: "absolute", left: 0, top: 0, transform: [{ translateX: x2 }] }}>
          <Svg width={200} height={12} viewBox="0 0 200 12">
            <Path d={OCEAN_WAVE} fill={scene.water} opacity={0.6} />
          </Svg>
        </Animated.View>
        <Animated.View style={{ position: "absolute", left: 0, top: 5, transform: [{ translateX: x1 }] }}>
          <Svg width={200} height={12} viewBox="0 0 200 12">
            <Path d={OCEAN_WAVE} fill={scene.water} />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Hometown cottages (city right gutter): cozy houses with warm        */
/* windows at dusk and night.                                          */
/* ------------------------------------------------------------------ */

function Cottage({
  left, width, height, scene, glow, lit,
}: {
  left: number; width: number; height: number; scene: SceneTheme;
  glow: Animated.Value; lit: boolean;
}) {
  const roofH = height * 0.34;
  return (
    <View style={{ position: "absolute", left, bottom: 0, width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polygon points={`${width / 2},0 ${width},${roofH} 0,${roofH}`} fill={scene.cottageRoof} />
        <Rect x={0.5} y={roofH} width={width - 1} height={height - roofH} fill={scene.cottageBody} />
        {/* Door */}
        <Rect x={width / 2 - 2} y={height - 8} width={4} height={8} fill={scene.trunk} />
      </Svg>
      {/* Window — warm and breathing at dusk/night */}
      <Animated.View
        style={{
          position: "absolute", left: 2.5, top: roofH + 3, width: 4, height: 4,
          borderRadius: 1, backgroundColor: lit ? scene.windowLit : scene.windowDark,
          opacity: lit ? glow : 1,
        }}
      />
    </View>
  );
}

function TownStrip({ scene, lit }: { scene: SceneTheme; lit: boolean }) {
  const glow = useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.65, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    breathe.start();
    return () => breathe.stop();
  }, [glow]);

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <Cottage left={-3} width={20} height={36} scene={scene} glow={glow} lit={lit} />
      <Cottage left={10} width={17} height={27} scene={scene} glow={glow} lit={lit} />
      <Cottage left={19} width={13} height={31} scene={scene} glow={glow} lit={lit} />
      {/* Ground */}
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, backgroundColor: scene.ground }} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Beach (bottom strip): sand + animated SVG waves                     */
/* ------------------------------------------------------------------ */

// Repeating wave: one full swell every 100px, so a -200px slide loops seamlessly.
const WAVE_PATH =
  "M0,8 Q25,2 50,8 " +
  "T100,8 T150,8 T200,8 T250,8 T300,8 T350,8 T400,8 T450,8 T500,8 T550,8 " +
  "T600,8 T650,8 T700,8 T750,8 T800,8 T850,8 T900,8 T950,8 T1000,8 " +
  "L1000,34 L0,34 Z";

function BeachStrip({ scene }: { scene: SceneTheme }) {
  const frontX = useRef(new Animated.Value(0)).current;
  const backX = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    const front = Animated.loop(
      Animated.sequence([
        Animated.timing(frontX, { toValue: -200, duration: 6500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(frontX, { toValue: 0, duration: 1, useNativeDriver: true }),
      ])
    );
    const back = Animated.loop(
      Animated.sequence([
        Animated.timing(backX, { toValue: -250, duration: 11000, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(backX, { toValue: -50, duration: 1, useNativeDriver: true }),
      ])
    );
    front.start();
    back.start();
    return () => {
      front.stop();
      back.stop();
    };
  }, [frontX, backX]);

  return (
    <View style={{ height: BEACH_H, backgroundColor: scene.sand, overflow: "hidden", position: "relative" }}>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 34, backgroundColor: scene.waterDeep, overflow: "hidden" }}>
        <Animated.View style={{ position: "absolute", left: 0, top: 0, transform: [{ translateX: backX }] }}>
          <Svg width={1000} height={34} viewBox="0 0 1000 34">
            <Path d={WAVE_PATH} fill={scene.water} opacity={0.55} />
          </Svg>
        </Animated.View>
        <Animated.View style={{ position: "absolute", left: 0, top: 5, transform: [{ translateX: frontX }] }}>
          <Svg width={1000} height={34} viewBox="0 0 1000 34">
            <Path d={WAVE_PATH} fill={scene.water} />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* The border                                                          */
/* ------------------------------------------------------------------ */

export function SeasonalBorder({ children, variant = "town" }: { children: ReactNode; variant?: BorderVariant }) {
  // Re-evaluate time of day every 5 minutes so the border shifts
  // if the hour boundary passes while the app is open.
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => getTimeOfDay());
  useEffect(() => {
    const t = setInterval(() => setTimeOfDay(getTimeOfDay()), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  // Prayer stars: one golden star per person prayed for today.
  const [prayerStarCount, setPrayerStarCount] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
        const raw = await AsyncStorage.getItem("prayercircle.people.v1");
        if (!raw) return;
        const people = JSON.parse(raw);
        if (!Array.isArray(people)) return;
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        setPrayerStarCount(people.filter((p: any) => p?.lastPrayerCompletedDate === today).length);
      } catch {}
    })();
  }, []);
  const sky = SKY_THEMES[timeOfDay];
  const scene = SCENE_THEMES[timeOfDay];
  // City windows light up at dusk and night.
  const windowsLit = timeOfDay === "evening" || timeOfDay === "night";

  // Side scenery per map:
  // - town: city skyline left, pine forest right
  // - city: ocean left (water halfway up, then sky), hometown cottages right
  // - school / garden / well / field: quiet woods on both sides
  const leftScene =
    variant === "city" ? <OceanStrip scene={scene} /> :
    variant === "town" ? <CitySkyline scene={scene} lit={windowsLit} /> :
    <ForestStrip scene={scene} />;
  const rightScene =
    variant === "city" ? <TownStrip scene={scene} lit={windowsLit} /> :
    <ForestStrip scene={scene} />;

  // Gentle snowfall in December — calm white dots, no cartoon glyphs.
  const showSnow = new Date().getMonth() === 11;

  return (
    <View style={{ position: "relative", backgroundColor: sky.bg, borderRadius: 16, overflow: "hidden" }}>
      {/* Animated sky life — behind everything; shows through the
          top strip and the upper halves of the side gutters */}
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        {sky.showSun && (
          <>
            <DriftingCloud top={2} size={26} duration={26000} delay={0} color="#FFFFFF" />
            <DriftingCloud top={10} size={18} duration={34000} delay={8000} color="#FFFFFF" />
            <DriftingCloud top={-2} size={32} duration={42000} delay={16000} color={sky.glow} />
          </>
        )}
        {sky.isNight && (
          <>
            <TwinkleStar left={20} top={4} size={3} delay={0} duration={1800} />
            <TwinkleStar left={70} top={10} size={2} delay={600} duration={2400} />
            <TwinkleStar left={130} top={3} size={3} delay={1200} duration={2000} />
            <TwinkleStar left={200} top={12} size={2} delay={300} duration={2800} />
            <TwinkleStar left={260} top={5} size={3} delay={900} duration={1600} />
            <TwinkleStar left={310} top={14} size={2} delay={1500} duration={2200} />
            <TwinkleStar left={40} top={18} size={2} delay={2000} duration={2600} />
            <TwinkleStar left={170} top={20} size={2} delay={400} duration={1900} />
            <TwinkleStar left={290} top={22} size={2} delay={1100} duration={2300} />
            <TwinkleStar left={100} top={22} size={2} delay={700} duration={2100} />
            {/* Prayer stars: one golden star per person prayed for today */}
            {Array.from({ length: Math.min(prayerStarCount, 12) }).map((_, i) => (
              <PrayerStar
                key={`prayer-${i}`}
                left={10 + ((i * 47) % 320)}
                top={2 + ((i * 31) % 20)}
                delay={i * 350}
              />
            ))}
          </>
        )}
        {showSnow && (
          <>
            <Snowflake left={30} delay={0} duration={9000} size={12} />
            <Snowflake left={90} delay={2500} duration={11000} size={10} />
            <Snowflake left={160} delay={1200} duration={10000} size={14} />
            <Snowflake left={230} delay={4000} duration={12000} size={10} />
            <Snowflake left={300} delay={800} duration={9500} size={12} />
            <Snowflake left={60} delay={5500} duration={10500} size={9} />
            <Snowflake left={200} delay={3000} duration={11500} size={11} />
            <Snowflake left={270} delay={1800} duration={9800} size={10} />
          </>
        )}
      </View>

      {/* Sun / moon */}
      <CelestialOrb color={sky.orb} glowColor={sky.glow} isMoon={sky.isNight} />

      {/* Top sky strip */}
      <View style={{ height: TOP_H }} />

      {/* Middle: side scenery | map | side scenery.
          The map must size to its content (flexShrink: 0) — a plain
          flex: 1 collapses to ~0 in this shrink-wrapped row (regression
          that squished every map into a thin strip). */}
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: SIDE_W, overflow: "hidden" }}>
          <View style={{ flex: 0.45 }} />
          <View style={{ flex: 0.55, overflow: "hidden" }}>
            {leftScene}
          </View>
        </View>
        <View style={{ flexGrow: 1, flexShrink: 0 }}>
          {children}
        </View>
        <View style={{ width: SIDE_W, overflow: "hidden" }}>
          <View style={{ flex: 0.45 }} />
          <View style={{ flex: 0.55, overflow: "hidden" }}>
            {rightScene}
          </View>
        </View>
      </View>

      {/* Beach: sand + animated waves */}
      <BeachStrip scene={scene} />
    </View>
  );
}
