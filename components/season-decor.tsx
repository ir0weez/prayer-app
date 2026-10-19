// Four-seasons decorations for the Hometown.
// Fills the gaps when no holiday is active (holidays take priority).
// The season sets the palette/atmosphere; the time of day sets the
// lighting — they combine (winter night = dark blue snow + warm windows,
// spring evening = sunset glow + blossoms, summer night = fireflies,
// fall morning = mist over orange leaves).
//
// - SeasonSkyEffect: animated particles for the border sky
// - SeasonMapOverlay: tint wash + edge decorations over town/city grids
// - SeasonInteriorOverlay: a subtle seasonal strip for interior screens
// - SeasonBorderMood: whole-border atmosphere (mist, haze, cold grade)
// - LighthouseSeasonDressing: snow cap in winter, blossoms in spring
// All SVG + Animated — no emojis. Gentle motion only, no bounce.

import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from "react-native-svg";
import { SEASON_MAP_TINTS, type HolidaySeason, type Season } from "@/lib/seasons";
import type { TimeOfDay } from "@/lib/daynight";

/* ------------------------------------------------------------------ */
/* Small SVG art pieces                                                */
/* ------------------------------------------------------------------ */

/** A falling autumn leaf. */
function SeasonLeaf({ color, size = 11 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 1 C16 6, 17 13, 10 19 C3 13, 4 6, 10 1 Z" fill={color} />
      <Path d="M10 3 L10 17" stroke="#00000033" strokeWidth={1} />
    </Svg>
  );
}

/** A cherry-blossom petal. */
function BlossomPetal({ color, size = 11 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Ellipse cx={10} cy={10} rx={8} ry={5.5} fill={color} opacity={0.95} />
      <Ellipse cx={10} cy={10} rx={4} ry={2.6} fill="#FFFFFF" opacity={0.5} />
    </Svg>
  );
}

/** A tiny spring flower. */
function SpringFlower({ petal, center, size = 14 }: { petal: string; center: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {[0, 72, 144, 216, 288].map((a) => (
        <Ellipse
          key={a}
          cx={10 + 5.5 * Math.cos((a * Math.PI) / 180)}
          cy={10 + 5.5 * Math.sin((a * Math.PI) / 180)}
          rx={3.4}
          ry={3.4}
          fill={petal}
        />
      ))}
      <Circle cx={10} cy={10} r={3} fill={center} />
    </Svg>
  );
}

/** A grass tuft. */
function GrassTuft({ color, size = 22 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 24 16">
      <Path d="M3 16 C4 10, 5 6, 3 2 C7 6, 8 10, 8 16 Z" fill={color} />
      <Path d="M9 16 C10 9, 12 5, 11 1 C14 6, 14 10, 14 16 Z" fill={color} opacity={0.85} />
      <Path d="M15 16 C16 10, 18 7, 17 3 C20 7, 20 11, 21 16 Z" fill={color} opacity={0.7} />
    </Svg>
  );
}

/** A sunflower. */
function Sunflower({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 28">
      <Rect x={11} y={12} width={2.4} height={14} fill="#4D7C0F" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => (
        <Ellipse
          key={a}
          cx={12 + 7 * Math.cos((a * Math.PI) / 180)}
          cy={7 + 7 * Math.sin((a * Math.PI) / 180)}
          rx={3}
          ry={3}
          fill="#FBBF24"
        />
      ))}
      <Circle cx={12} cy={7} r={4.4} fill="#78350F" />
      <Circle cx={10.5} cy={5.8} r={1.2} fill="#A16207" opacity={0.6} />
    </Svg>
  );
}

/** A pile of fallen leaves. */
function LeafPile({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.55} viewBox="0 0 36 20">
      <Ellipse cx={18} cy={14} rx={15} ry={6} fill="#B45309" opacity={0.85} />
      <Ellipse cx={12} cy={11} rx={9} ry={5} fill="#D97706" />
      <Ellipse cx={24} cy={11} rx={8} ry={4.5} fill="#92400E" opacity={0.8} />
      <Ellipse cx={18} cy={8} rx={6} ry={3.5} fill="#EA580C" />
    </Svg>
  );
}

/** A bare winter branch. */
function BareBranch({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 30 30">
      <Path d="M15 29 L15 8 M15 16 L7 8 M15 13 L23 5 M15 21 L8 17 M15 21 L22 17" stroke="#57534E" strokeWidth={2.2} strokeLinecap="round" fill="none" />
      <Path d="M7 8 L4 5 M23 5 L26 2" stroke="#57534E" strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** A snow drift. */
function SnowDrift({ width = 60 }: { width?: number }) {
  return (
    <Svg width={width} height={16} viewBox="0 0 60 16" preserveAspectRatio="none">
      <Path d="M0 16 L0 10 Q15 4 30 9 T60 8 L60 16 Z" fill="#F8FAFC" opacity={0.95} />
      <Path d="M8 10 Q20 6 34 9" stroke="#FFFFFF" strokeWidth={1.5} fill="none" opacity={0.9} />
    </Svg>
  );
}

/** A frost sparkle. */
function FrostSparkle({ size = 8 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Path d="M5 0 L5 10 M0 5 L10 5 M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="#E0F2FE" strokeWidth={1.2} />
      <Circle cx={5} cy={5} r={1.4} fill="#FFFFFF" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Animated sky particles — season + time-of-day aware                 */
/* ------------------------------------------------------------------ */

type SeasonParticleKind = "petal" | "rain" | "mote" | "firefly" | "leaf" | "snow";

const SEASON_PARTICLE_COLORS: Record<SeasonParticleKind, string[]> = {
  petal: ["#F9A8D4", "#FBCFE8", "#FFFFFF", "#F472B6"],
  rain: ["#BAE6FD", "#E0F2FE", "#7DD3FC"],
  mote: ["#FDE68A", "#FBBF24", "#FFF7D6"],
  firefly: ["#D9F99D", "#FDE047", "#BEF264"],
  leaf: ["#EA580C", "#D97706", "#B91C1C", "#F59E0B", "#92400E"],
  snow: ["#FFFFFF", "#F8FAFC", "#E0F2FE"],
};

function SeasonParticle({
  kind,
  leftPct,
  delay,
  duration,
  size,
  wander,
}: {
  kind: SeasonParticleKind;
  leftPct: number;
  delay: number;
  duration: number;
  size: number;
  wander?: boolean;
}) {
  const fall = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const fallLoop = Animated.loop(
      Animated.timing(fall, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    );
    const starter = setTimeout(() => fallLoop.start(), delay);
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    swayLoop.start();
    let pulseLoop: Animated.CompositeAnimation | undefined;
    if (kind === "firefly") {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 0.25, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      pulseLoop.start();
    }
    return () => {
      clearTimeout(starter);
      fallLoop.stop();
      swayLoop.stop();
      pulseLoop?.stop();
    };
  }, [fall, sway, pulse, delay, duration, kind]);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-30, 340] });
  const swayRange = wander ? 34 : 14;
  const translateX = sway.interpolate({ inputRange: [-1, 1], outputRange: [-swayRange, swayRange] });
  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-40deg", "40deg"] });
  const colors = SEASON_PARTICLE_COLORS[kind];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const glyph =
    kind === "petal" ? <BlossomPetal color={color} size={size} /> :
    kind === "leaf" ? <SeasonLeaf color={color} size={size} /> :
    kind === "firefly" ? (
      <Svg width={size + 8} height={size + 8} viewBox="0 0 20 20">
        <Circle cx={10} cy={10} r={8} fill={color} opacity={0.25} />
        <Circle cx={10} cy={10} r={size / 2.4} fill={color} />
      </Svg>
    ) :
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {kind === "rain" ? (
        <Rect x={8.6} y={4} width={2.8} height={12} rx={1.4} fill={color} opacity={0.85} />
      ) : (
        <Circle cx={10} cy={10} r={kind === "mote" ? 3.4 : 4} fill={color} opacity={0.9} />
      )}
    </Svg>;

  const inner = kind === "firefly" ? (
    <Animated.View style={{ opacity: pulse }}>{glyph}</Animated.View>
  ) : glyph;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: `${leftPct}%` as any,
        top: 0,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    >
      {inner}
    </Animated.View>
  );
}

/** Animated particles for the border sky, per season and time of day. */
export function SeasonSkyEffect({ season, timeOfDay }: { season: Season; timeOfDay: TimeOfDay }) {
  const isNight = timeOfDay === "night";
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
      {season === "spring" && (
        <>
          {Array.from({ length: 8 }).map((_, i) => (
            <SeasonParticle key={`petal-${i}`} kind="petal"
              leftPct={8 + ((i * 97) % 84)} delay={(i * 1300) % 6000}
              duration={8000 + ((i * 1700) % 5000)} size={9 + ((i * 5) % 6)} />
          ))}
          {/* Light rain sparkle */}
          {Array.from({ length: 6 }).map((_, i) => (
            <SeasonParticle key={`rain-${i}`} kind="rain"
              leftPct={12 + ((i * 61) % 76)} delay={(i * 700) % 3000}
              duration={3500 + ((i * 900) % 2500)} size={10 + (i % 5)} />
          ))}
        </>
      )}
      {season === "summer" && (
        <>
          {/* Warm haze motes drifting by day */}
          {!isNight && Array.from({ length: 6 }).map((_, i) => (
            <SeasonParticle key={`mote-${i}`} kind="mote"
              leftPct={10 + ((i * 71) % 80)} delay={(i * 1100) % 5000}
              duration={9000 + ((i * 1500) % 5000)} size={7 + (i % 4)} />
          ))}
          {/* Fireflies at night */}
          {isNight && Array.from({ length: 7 }).map((_, i) => (
            <SeasonParticle key={`firefly-${i}`} kind="firefly" wander
              leftPct={8 + ((i * 83) % 84)} delay={(i * 900) % 4000}
              duration={14000 + ((i * 1900) % 6000)} size={7 + (i % 4)} />
          ))}
        </>
      )}
      {season === "fall" && (
        <>
          {Array.from({ length: 9 }).map((_, i) => (
            <SeasonParticle key={`leaf-${i}`} kind="leaf"
              leftPct={8 + ((i * 97) % 84)} delay={(i * 1300) % 6000}
              duration={7000 + ((i * 1700) % 5000)} size={9 + ((i * 7) % 6)} />
          ))}
        </>
      )}
      {season === "winter" && (
        <>
          {Array.from({ length: 8 }).map((_, i) => (
            <SeasonParticle key={`snow-${i}`} kind="snow"
              leftPct={8 + ((i * 89) % 84)} delay={(i * 1200) % 7000}
              duration={9000 + ((i * 1600) % 5000)} size={8 + ((i * 5) % 7)} />
          ))}
        </>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Map overlay — mood grading + positioned decorations                 */
/* ------------------------------------------------------------------ */

/**
 * Overlays the town/city grid when no holiday is active: a seasonal
 * color-grade wash plus hand-placed SVG decorations at the map edges
 * (never covering the middle where buildings live).
 */
export function SeasonMapOverlay({ season, holiday }: { season: Season; holiday: HolidaySeason }) {
  if (holiday !== "none") return null;
  const tint = SEASON_MAP_TINTS[season];

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 4 }}>
      <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: tint }} />

      {season === "spring" && (
        <>
          <View style={{ position: "absolute", top: 6, left: 6, flexDirection: "row" }}>
            <SpringFlower petal="#F9A8D4" center="#FBBF24" size={18} />
            <SpringFlower petal="#FFFFFF" center="#F472B6" size={15} />
          </View>
          <View style={{ position: "absolute", top: 8, right: 8, flexDirection: "row" }}>
            <SpringFlower petal="#FBCFE8" center="#F59E0B" size={16} />
            <SpringFlower petal="#F9A8D4" center="#FDE68A" size={18} />
          </View>
          <View style={{ position: "absolute", bottom: 8, left: 10 }}>
            <GrassTuft color="#4ADE80" size={24} />
          </View>
          <View style={{ position: "absolute", bottom: 8, right: 10 }}>
            <GrassTuft color="#22C55E" size={20} />
          </View>
          <View style={{ position: "absolute", top: 4, left: "42%" as any }}>
            <SpringFlower petal="#FDE68A" center="#F97316" size={16} />
          </View>
        </>
      )}
      {season === "summer" && (
        <>
          <View style={{ position: "absolute", top: 6, left: 8 }}>
            <Sunflower size={26} />
          </View>
          <View style={{ position: "absolute", top: 8, right: 8 }}>
            <GrassTuft color="#16A34A" size={24} />
          </View>
          <View style={{ position: "absolute", bottom: 8, left: 8 }}>
            <GrassTuft color="#22C55E" size={22} />
          </View>
          <View style={{ position: "absolute", bottom: 6, right: 10 }}>
            <Sunflower size={22} />
          </View>
          <View style={{ position: "absolute", top: "44%", left: 4 }}>
            <GrassTuft color="#4ADE80" size={18} />
          </View>
          <View style={{ position: "absolute", top: "44%", right: 4 }}>
            <GrassTuft color="#16A34A" size={18} />
          </View>
        </>
      )}
      {season === "fall" && (
        <>
          <View style={{ position: "absolute", top: 6, left: 6 }}><LeafPile size={36} /></View>
          <View style={{ position: "absolute", bottom: 8, right: 8 }}><LeafPile size={30} /></View>
          <View style={{ position: "absolute", bottom: 6, left: 10 }}>
            <SeasonLeaf color="#D97706" size={15} />
          </View>
          <View style={{ position: "absolute", top: 8, right: 10 }}>
            <SeasonLeaf color="#B91C1C" size={14} />
          </View>
          <View style={{ position: "absolute", top: 4, left: "42%" as any }}>
            <SeasonLeaf color="#EA580C" size={13} />
          </View>
        </>
      )}
      {season === "winter" && (
        <>
          <View style={{ position: "absolute", top: 2, left: 0 }}><SnowDrift width={70} /></View>
          <View style={{ position: "absolute", top: 2, right: 0 }}><SnowDrift width={60} /></View>
          <View style={{ position: "absolute", bottom: 2, left: 6 }}><BareBranch size={30} /></View>
          <View style={{ position: "absolute", bottom: 4, right: 10 }}>
            <FrostSparkle size={10} />
          </View>
          <View style={{ position: "absolute", top: "45%", left: 6 }}>
            <FrostSparkle size={8} />
          </View>
          <View style={{ position: "absolute", top: "45%", right: 6 }}>
            <FrostSparkle size={9} />
          </View>
        </>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Interior overlay — a subtle seasonal strip                         */
/* ------------------------------------------------------------------ */

/**
 * A quiet seasonal touch for the top of interior screens — slimmer and
 * calmer than the holiday garland. Renders nothing while a holiday
 * is active (the holiday garland owns the strip then).
 */
export function SeasonInteriorOverlay({ season, holiday }: { season: Season; holiday: HolidaySeason }) {
  if (holiday !== "none") return null;

  return (
    <View pointerEvents="none" style={{ position: "relative", height: 36, overflow: "hidden", opacity: 0.95 }}>
      {season === "spring" && (
        <View style={{ flex: 1 }}>
          <Svg width="100%" height={36} viewBox="0 0 400 36" preserveAspectRatio="none">
            <Path d="M0 8 Q 200 24 400 8" stroke="#86EFAC" strokeWidth={2.5} fill="none" />
          </Svg>
          {[
            { left: "10%" as any, petal: "#F9A8D4", center: "#FBBF24" },
            { left: "30%" as any, petal: "#FFFFFF", center: "#F472B6" },
            { left: "50%" as any, petal: "#FBCFE8", center: "#F59E0B" },
            { left: "70%" as any, petal: "#F9A8D4", center: "#FDE68A" },
            { left: "90%" as any, petal: "#FFFFFF", center: "#EC4899" },
          ].map((f, i) => (
            <View key={i} style={{ position: "absolute", top: 8 + (i % 2) * 7, left: f.left as any }}>
              <SpringFlower petal={f.petal} center={f.center} size={16} />
            </View>
          ))}
        </View>
      )}
      {season === "summer" && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Svg width="100%" height={36} viewBox="0 0 400 36" preserveAspectRatio="none">
            <Path d="M0 22 Q 100 18 200 22 T 400 22" stroke="#7DD3FC" strokeWidth={2.5} fill="none" />
            <Path d="M0 28 Q 100 24 200 28 T 400 28" stroke="#BAE6FD" strokeWidth={2} fill="none" />
          </Svg>
          <View style={{ position: "absolute", top: 2, left: "8%" as any }}>
            <Svg width={20} height={20} viewBox="0 0 20 20">
              <Circle cx={10} cy={10} r={5} fill="#FBBF24" />
              <Circle cx={10} cy={10} r={8} fill="#FDE68A" opacity={0.35} />
            </Svg>
          </View>
          <View style={{ position: "absolute", top: 4, right: "10%" }}>
            <GrassTuft color="#4ADE80" size={18} />
          </View>
        </View>
      )}
      {season === "fall" && (
        <View style={{ flex: 1 }}>
          <Svg width="100%" height={36} viewBox="0 0 400 36" preserveAspectRatio="none">
            <Path d="M0 8 Q 200 24 400 8" stroke="#B45309" strokeWidth={2.5} fill="none" />
          </Svg>
          {[
            { left: "8%" as any, color: "#EA580C" },
            { left: "26%" as any, color: "#D97706" },
            { left: "44%" as any, color: "#B91C1C" },
            { left: "62%" as any, color: "#F59E0B" },
            { left: "80%" as any, color: "#92400E" },
          ].map((l, i) => (
            <View key={i} style={{ position: "absolute", top: 8 + (i % 2) * 7, left: l.left as any }}>
              <SeasonLeaf color={l.color} size={15} />
            </View>
          ))}
        </View>
      )}
      {season === "winter" && (
        <View style={{ flex: 1 }}>
          <Svg width="100%" height={36} viewBox="0 0 400 36" preserveAspectRatio="none">
            <Path d="M0 10 Q 200 26 400 10" stroke="#6B8E9E" strokeWidth={2.5} fill="none" />
          </Svg>
          {[
            "12%" as any, "32%" as any, "52%" as any, "72%" as any, "90%" as any,
          ].map((left, i) => (
            <View key={i} style={{ position: "absolute", top: 6 + (i % 2) * 8, left: left as any }}>
              <Svg width={20} height={16} viewBox="0 0 20 16">
                <Path d="M10 14 L10 4 M10 8 L5 4 M10 8 L15 4 M10 11 L6 8 M10 11 L14 8" stroke="#3F6212" strokeWidth={1.8} strokeLinecap="round" fill="none" />
                <Circle cx={6} cy={5} r={1.6} fill="#FFFFFF" />
                <Circle cx={14} cy={5} r={1.6} fill="#FFFFFF" />
                <Circle cx={10} cy={3} r={1.6} fill="#FFFFFF" />
              </Svg>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Border mood + lighthouse dressing                                   */
/* ------------------------------------------------------------------ */

/**
 * Whole-border seasonal atmosphere. Combines with the time of day:
 * fall morning gets mist over the amber grade; winter morning a pale
 * icy mist; summer evening a warm haze; winter night a deeper blue.
 */
export function SeasonBorderMood({ season, timeOfDay }: { season: Season; timeOfDay: TimeOfDay }) {
  const mistX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!(season === "fall" && timeOfDay === "morning") && !(season === "winter" && timeOfDay === "morning") && !(season === "spring" && timeOfDay === "morning")) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(mistX, { toValue: 1, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(mistX, { toValue: 0, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [season, timeOfDay, mistX]);
  const drift = mistX.interpolate({ inputRange: [0, 1], outputRange: [-24, 24] });
  const showMist = timeOfDay === "morning" && (season === "fall" || season === "winter" || season === "spring");

  const grade =
    season === "spring" ? "rgba(110, 200, 130, 0.06)" :
    season === "summer" ? timeOfDay === "evening" ? "rgba(255, 180, 100, 0.10)" : "rgba(255, 210, 130, 0.06)" :
    season === "fall" ? "rgba(220, 140, 60, 0.08)" :
    timeOfDay === "night" ? "rgba(90, 130, 190, 0.14)" : "rgba(150, 190, 230, 0.08)";

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: grade }} />
      {showMist && (
        <>
          <Animated.View style={{ position: "absolute", bottom: 30, left: "8%", transform: [{ translateX: drift }] }}>
            <Svg width={170} height={34} viewBox="0 0 170 34">
              <Ellipse cx={85} cy={20} rx={80} ry={12} fill={season === "winter" ? "#E0F2FE" : "#F5F0E6"} opacity={0.4} />
              <Ellipse cx={45} cy={24} rx={40} ry={8} fill={season === "winter" ? "#E0F2FE" : "#F5F0E6"} opacity={0.35} />
            </Svg>
          </Animated.View>
          <Animated.View style={{ position: "absolute", bottom: 70, right: "4%", transform: [{ translateX: drift }] }}>
            <Svg width={130} height={26} viewBox="0 0 130 26">
              <Ellipse cx={65} cy={16} rx={60} ry={9} fill={season === "winter" ? "#E0F2FE" : "#F5F0E6"} opacity={0.32} />
            </Svg>
          </Animated.View>
        </>
      )}
    </View>
  );
}

/**
 * Seasonal dressing for the border lighthouse. Winter: a snow cap on the
 * roof. Spring: tiny blossoms at the base. Rendered only when no holiday
 * is active (the caller gates on that).
 */
export function LighthouseSeasonDressing({ season }: { season: Season }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
      {season === "winter" && (
        <Svg width={16} height={8} viewBox="0 0 16 8" style={{ position: "absolute", top: 2, left: 5 }}>
          <Polygon points="1,8 15,8 8,0" fill="#F8FAFC" />
          <Circle cx={4} cy={6} r={1.5} fill="#FFFFFF" />
          <Circle cx={12} cy={6} r={1.5} fill="#FFFFFF" />
        </Svg>
      )}
      {season === "spring" && (
        <View style={{ position: "absolute", bottom: 2, left: 1, flexDirection: "row" }}>
          <SpringFlower petal="#F9A8D4" center="#FBBF24" size={11} />
          <SpringFlower petal="#FFFFFF" center="#F472B6" size={10} />
        </View>
      )}
      {season === "fall" && (
        <View style={{ position: "absolute", bottom: 2, left: 2 }}>
          <SeasonLeaf color="#D97706" size={12} />
        </View>
      )}
    </View>
  );
}
