// Holiday/seasonal decorations for the Hometown.
// Date-driven via lib/seasons. Three overlays:
// - HolidaySkyEffect: animated particles for the border sky (leaves, snow, fog...)
// - HolidayMapOverlay: positioned SVG decorations + mood grading on the town/city map
// - HolidayInteriorOverlay: a decorative garland strip for interior screens
// All SVG + Animated — no emojis. Gentle motion only, no bounce.
// Per Jonathan: "Make it special" — real atmosphere, not sprinkled icons.

import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Ellipse, Path, Polygon, Rect } from "react-native-svg";
import { HOLIDAY_MAP_TINTS, type HolidaySeason } from "@/lib/seasons";

/* ------------------------------------------------------------------ */
/* Small SVG art pieces                                                */
/* ------------------------------------------------------------------ */

/** A simple autumn leaf. */
export function LeafShape({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 1 C16 6, 17 13, 10 19 C3 13, 4 6, 10 1 Z" fill={color} />
      <Path d="M10 3 L10 17" stroke="#00000033" strokeWidth={1} />
    </Svg>
  );
}

/** A plain pumpkin. */
export function Pumpkin({ size = 28 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.85} viewBox="0 0 32 28">
      <Ellipse cx={16} cy={16} rx={13} ry={10} fill="#EA580C" />
      <Ellipse cx={10} cy={16} rx={5} ry={9} fill="#F97316" opacity={0.6} />
      <Ellipse cx={22} cy={16} rx={5} ry={9} fill="#C2410C" opacity={0.5} />
      <Rect x={14} y={2} width={4} height={7} rx={1.5} fill="#65A30D" />
    </Svg>
  );
}

/** A jack-o'-lantern with a glowing carved face. */
export function JackOLantern({ size = 32 }: { size?: number }) {
  const glow = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.6, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);
  return (
    <View style={{ width: size, height: size * 0.9 }}>
      <Svg width={size} height={size * 0.9} viewBox="0 0 32 30">
        <Animated.View style={{ opacity: glow }}>
          <Circle cx={16} cy={16} r={13} fill="#FBBF24" opacity={0.35} />
        </Animated.View>
        <Ellipse cx={16} cy={17} rx={12} ry={10} fill="#EA580C" />
        <Ellipse cx={10} cy={17} rx={4.5} ry={9} fill="#F97316" opacity={0.55} />
        <Rect x={14} y={3} width={4} height={6} rx={1.5} fill="#3F6212" />
        <Polygon points="9,13 13,13 11,16" fill="#FDE68A" />
        <Polygon points="19,13 23,13 21,16" fill="#FDE68A" />
        <Path d="M9 20 Q16 25 23 20 Q16 22 9 20 Z" fill="#FDE68A" />
      </Svg>
    </View>
  );
}

/** A hay bale. */
function HayBale({ size = 30 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.7} viewBox="0 0 32 22">
      <Rect x={2} y={4} width={28} height={16} rx={8} fill="#EAB308" />
      <Rect x={2} y={4} width={28} height={16} rx={8} fill="none" stroke="#A16207" strokeWidth={1.5} />
      <Path d="M6 8 H26 M6 12 H26 M6 16 H26" stroke="#A16207" strokeWidth={1} opacity={0.6} />
    </Svg>
  );
}

/** A cornucopia (horn of plenty). */
export function Cornucopia({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 40 30">
      <Path d="M4 22 C10 24, 24 22, 34 8 C36 5, 34 2, 31 4 C22 12, 12 16, 4 16 Z" fill="#B45309" />
      <Path d="M8 20 C14 21, 24 19, 30 10" stroke="#92400E" strokeWidth={1.5} fill="none" opacity={0.6} />
      <Circle cx={8} cy={18} r={4} fill="#EA580C" />
      <Circle cx={14} cy={20} r={3.5} fill="#DC2626" />
      <Circle cx={19} cy={19} r={3} fill="#F59E0B" />
      <Ellipse cx={11} cy={22} rx={3} ry={2.4} fill="#65A30D" />
    </Svg>
  );
}

/** A decorated Christmas pine. */
export function HolidayPine({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 32 40">
      <Polygon points="16,2 26,18 6,18" fill="#15803D" />
      <Polygon points="16,10 29,28 3,28" fill="#16A34A" />
      <Polygon points="16,20 30,36 2,36" fill="#15803D" />
      <Rect x={14} y={35} width={4} height={5} fill="#78350F" />
      <Circle cx={12} cy={16} r={1.8} fill="#EF4444" />
      <Circle cx={20} cy={22} r={1.8} fill="#FBBF24" />
      <Circle cx={14} cy={28} r={1.8} fill="#3B82F6" />
      <Circle cx={21} cy={14} r={1.8} fill="#EC4899" />
      <Polygon points="16,0 17.2,2.4 19.8,2.6 17.8,4.2 18.4,6.8 16,5.4 13.6,6.8 14.2,4.2 12.2,2.6 14.8,2.4" fill="#FBBF24" />
    </Svg>
  );
}

/** A wreath. */
export function Wreath({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28">
      <Circle cx={14} cy={14} r={10} fill="none" stroke="#15803D" strokeWidth={6} />
      <Circle cx={14} cy={14} r={10} fill="none" stroke="#16A34A" strokeWidth={3} strokeDasharray="4 3" />
      <Circle cx={8} cy={10} r={2} fill="#B91C1C" />
      <Circle cx={20} cy={12} r={2} fill="#B91C1C" />
      <Circle cx={14} cy={20} r={2} fill="#B91C1C" />
      <Path d="M14 24 L11 28 L17 28 Z" fill="#B91C1C" />
    </Svg>
  );
}

/** A heart shape (SVG, not emoji). */
export function HeartGlyph({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 18">
      <Path
        d="M10 17 C4 12, 1 8, 1 5 C1 2.5, 3 1, 5.5 1 C7.5 1, 9 2.5, 10 4 C11 2.5, 12.5 1, 14.5 1 C17 1, 19 2.5, 19 5 C19 8, 16 12, 10 17 Z"
        fill={color}
      />
    </Svg>
  );
}

/** A small flower. */
export function FlowerGlyph({ petal, center, size = 14 }: { petal: string; center: string; size?: number }) {
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

/** Rubble pile (post-apocalyptic). */
function Rubble({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.6} viewBox="0 0 36 22">
      <Polygon points="2,20 10,8 18,20" fill="#78716C" />
      <Polygon points="12,20 22,5 30,20" fill="#57534E" />
      <Polygon points="24,20 32,10 36,20" fill="#78716C" />
      <Polygon points="8,14 12,8 16,14" fill="#A8A29E" opacity={0.7} />
    </Svg>
  );
}

/** A makeshift barricade (post-apocalyptic). */
function Barricade({ size = 40 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.55} viewBox="0 0 40 22">
      <Rect x={4} y={6} width={32} height={4} fill="#92400E" transform="rotate(-8 20 8)" />
      <Rect x={4} y={12} width={32} height={4} fill="#78350F" transform="rotate(6 20 14)" />
      <Rect x={8} y={2} width={3} height={18} fill="#57534E" />
      <Rect x={29} y={2} width={3} height={18} fill="#57534E" />
    </Svg>
  );
}

/** A flickering street lamp (post-apocalyptic vibe). */
function FlickerLamp({ size = 30 }: { size?: number }) {
  const flicker = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1, duration: 180, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.25, duration: 120, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.9, duration: 220, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0.4, duration: 150, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [flicker]);
  return (
    <View style={{ width: size, height: size * 1.6 }}>
      <Svg width={size} height={size * 1.6} viewBox="0 0 24 40">
        <Rect x={10.5} y={8} width={3} height={30} fill="#44403C" />
        <Rect x={6} y={2} width={12} height={8} rx={2} fill="#292524" />
        <Circle cx={12} cy={6} r={2.5} fill="#FDE68A" />
      </Svg>
      <Animated.View style={{ position: "absolute", top: -4, left: size / 2 - 8, opacity: flicker }}>
        <Svg width={16} height={16} viewBox="0 0 16 16">
          <Circle cx={8} cy={8} r={7} fill="#FBBF24" opacity={0.35} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Patriotic bunting string. */
export function Bunting({ width = 120, colors = ["#B91C1C", "#F8FAFC", "#1D4ED8"] }: { width?: number; colors?: string[] }) {
  const flags = Math.max(3, Math.floor(width / 18));
  const w = width / flags;
  return (
    <Svg width={width} height={22} viewBox={`0 0 ${width} 22`}>
      <Path d={`M0 2 Q ${width / 2} 12 ${width} 2`} stroke="#78716C" strokeWidth={1.5} fill="none" />
      {Array.from({ length: flags }).map((_, i) => {
        const x = (i + 0.5) * w;
        const sag = 2 + 10 * Math.sin((Math.PI * (i + 0.5)) / flags);
        return <Polygon key={i} points={`${x - w / 2 + 2},${sag} ${x + w / 2 - 2},${sag} ${x},${sag + 10}`} fill={colors[i % colors.length]} />;
      })}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Animated sky particles                                              */
/* ------------------------------------------------------------------ */

type ParticleKind = "leaf" | "snow" | "heart" | "petal" | "spark" | "fog" | "ember";

const PARTICLE_COLORS: Record<ParticleKind, string[]> = {
  leaf: ["#EA580C", "#D97706", "#B91C1C", "#F59E0B"],
  snow: ["#FFFFFF", "#F8FAFC", "#E0F2FE"],
  heart: ["#EC4899", "#F43F5E", "#F9A8D4"],
  petal: ["#F9A8D4", "#C4B5FD", "#FDE68A", "#FBCFE8"],
  spark: ["#EF4444", "#F8FAFC", "#3B82F6"],
  fog: ["#A8A29E"],
  ember: ["#FBBF24", "#F97316"],
};

function SkyParticle({
  kind,
  leftPct,
  delay,
  duration,
  size,
}: {
  kind: ParticleKind;
  leftPct: number;
  delay: number;
  duration: number;
  size: number;
}) {
  const fall = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const fallLoop = Animated.loop(
      Animated.timing(fall, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    );
    // Stagger start with a one-shot delay timer.
    const starter = setTimeout(() => fallLoop.start(), delay);
    const swayLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(sway, { toValue: -1, duration: duration / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    swayLoop.start();
    return () => { clearTimeout(starter); fallLoop.stop(); swayLoop.stop(); };
  }, [fall, sway, delay, duration]);

  const translateY = fall.interpolate({ inputRange: [0, 1], outputRange: [-30, 340] });
  const translateX = sway.interpolate({ inputRange: [-1, 1], outputRange: [-14, 14] });
  const rotate = sway.interpolate({ inputRange: [-1, 1], outputRange: ["-40deg", "40deg"] });
  const colors = PARTICLE_COLORS[kind];
  const color = colors[Math.floor(Math.random() * colors.length)];

  if (kind === "fog") {
    return (
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: `${leftPct}%` as any,
          top: "25%",
          opacity: 0.3,
          transform: [{ translateX }],
        }}
      >
        <Svg width={120} height={40} viewBox="0 0 120 40">
          <Ellipse cx={60} cy={20} rx={55} ry={14} fill={color} opacity={0.5} />
          <Ellipse cx={35} cy={24} rx={30} ry={10} fill={color} opacity={0.4} />
          <Ellipse cx={90} cy={16} rx={28} ry={9} fill={color} opacity={0.4} />
        </Svg>
      </Animated.View>
    );
  }

  const glyph =
    kind === "leaf" ? <LeafShape color={color} size={size} /> :
    kind === "heart" ? <HeartGlyph color={color} size={size} /> :
    kind === "petal" ? (
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Ellipse cx={10} cy={10} rx={8} ry={5.5} fill={color} opacity={0.9} />
      </Svg>
    ) :
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={kind === "ember" ? 7 : 4} fill={color} opacity={0.9} />
    </Svg>;

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
      {glyph}
    </Animated.View>
  );
}

/** Animated particles for the border sky, per season. */
export function HolidaySkyEffect({ season }: { season: HolidaySeason }) {
  if (season === "none" || season === "christmas") return null; // christmas keeps its snowfall
  const specs: Record<Exclude<HolidaySeason, "none" | "christmas">, { kind: ParticleKind; count: number; size: [number, number]; dur: [number, number] }> = {
    halloween: { kind: "fog", count: 3, size: [100, 140], dur: [9000, 14000] },
    thanksgiving: { kind: "leaf", count: 9, size: [9, 14], dur: [7000, 12000] },
    valentines: { kind: "heart", count: 7, size: [10, 15], dur: [8000, 13000] },
    easter: { kind: "petal", count: 9, size: [9, 14], dur: [7000, 12000] },
    independence: { kind: "spark", count: 8, size: [6, 10], dur: [6000, 10000] },
  };
  const spec = specs[season];
  const embers = season === "halloween";
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
      {Array.from({ length: spec.count }).map((_, i) => (
        <SkyParticle
          key={`${season}-p-${i}`}
          kind={spec.kind}
          leftPct={8 + ((i * 97) % 84)}
          delay={(i * 1300) % 6000}
          duration={spec.dur[0] + ((i * 1700) % (spec.dur[1] - spec.dur[0]))}
          size={spec.size[0] + ((i * 7) % (spec.size[1] - spec.size[0] + 1))}
        />
      ))}
      {embers && Array.from({ length: 5 }).map((_, i) => (
        <SkyParticle
          key={`ember-${i}`}
          kind="ember"
          leftPct={12 + ((i * 53) % 76)}
          delay={(i * 900) % 4000}
          duration={5000 + ((i * 1100) % 4000)}
          size={5 + (i % 4)}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Map overlay — mood grading + positioned decorations                 */
/* ------------------------------------------------------------------ */

/**
 * Overlays the town/city grid: a seasonal color-grade wash plus
 * hand-placed SVG decorations at the map edges (never covering the
 * middle where buildings live). pointerEvents="none" throughout.
 */
export function HolidayMapOverlay({ season }: { season: HolidaySeason }) {
  if (season === "none") return null;
  const tint = HOLIDAY_MAP_TINTS[season];

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, zIndex: 4 }}>
      {/* Mood grade wash */}
      <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: tint }} />
      {/* Extra mood layers per season */}
      {season === "halloween" && (
        <>
          {/* Dusty vignette — darker, worn edges */}
          <View style={{ position: "absolute", left: 0, top: 0, right: 0, height: 60, backgroundColor: "rgba(41,37,36,0.25)" }} />
          <View style={{ position: "absolute", left: 0, bottom: 0, right: 0, height: 60, backgroundColor: "rgba(41,37,36,0.25)" }} />
        </>
      )}
      {season === "christmas" && (
        <>
          {/* Warm glow wash — cozy winter light */}
          <View style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(251,191,36,0.05)" }} />
        </>
      )}

      {/* Corner + edge decorations */}
      {season === "halloween" && (
        <>
          <View style={{ position: "absolute", top: 6, left: 6 }}><JackOLantern size={34} /></View>
          <View style={{ position: "absolute", top: 10, right: 8 }}><Rubble size={36} /></View>
          <View style={{ position: "absolute", bottom: 8, left: 10 }}><Barricade size={42} /></View>
          <View style={{ position: "absolute", bottom: 6, right: 6 }}><JackOLantern size={28} /></View>
          <View style={{ position: "absolute", top: "42%", left: 4 }}><FlickerLamp size={30} /></View>
          <View style={{ position: "absolute", top: "42%", right: 4 }}><FlickerLamp size={30} /></View>
          <View style={{ position: "absolute", top: 4, left: "38%" as any }}><Rubble size={30} /></View>
        </>
      )}
      {season === "thanksgiving" && (
        <>
          <View style={{ position: "absolute", top: 6, left: 6 }}><Pumpkin size={30} /></View>
          <View style={{ position: "absolute", top: 8, right: 8 }}><HayBale size={32} /></View>
          <View style={{ position: "absolute", bottom: 8, left: 8 }}><HayBale size={28} /></View>
          <View style={{ position: "absolute", bottom: 6, right: 10 }}><Cornucopia size={42} /></View>
          <View style={{ position: "absolute", top: 4, left: "40%" as any }}><Pumpkin size={24} /></View>
          <View style={{ position: "absolute", top: "45%", left: 4 }}>
            <LeafShape color="#D97706" size={14} />
          </View>
          <View style={{ position: "absolute", top: "45%", right: 4 }}>
            <LeafShape color="#B91C1C" size={14} />
          </View>
        </>
      )}
      {season === "christmas" && (
        <>
          <View style={{ position: "absolute", top: 4, left: 6 }}><HolidayPine size={42} /></View>
          <View style={{ position: "absolute", top: 6, right: 8 }}><HolidayPine size={36} /></View>
          <View style={{ position: "absolute", bottom: 6, left: 8 }}><Wreath size={28} /></View>
          <View style={{ position: "absolute", bottom: 8, right: 8 }}><HolidayPine size={38} /></View>
          <View style={{ position: "absolute", top: 2, left: "42%" as any }}><Wreath size={24} /></View>
        </>
      )}
      {season === "valentines" && (
        <>
          <View style={{ position: "absolute", top: 8, left: 8 }}><HeartGlyph color="#EC4899" size={22} /></View>
          <View style={{ position: "absolute", top: 8, right: 10 }}><HeartGlyph color="#BE123C" size={18} /></View>
          <View style={{ position: "absolute", bottom: 8, left: 10 }}>
            <FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={22} />
          </View>
          <View style={{ position: "absolute", bottom: 8, right: 8 }}>
            <FlowerGlyph petal="#F43F5E" center="#FDE68A" size={20} />
          </View>
          <View style={{ position: "absolute", top: "44%", left: 6 }}><HeartGlyph color="#F9A8D4" size={16} /></View>
          <View style={{ position: "absolute", top: "44%", right: 6 }}><HeartGlyph color="#EC4899" size={16} /></View>
        </>
      )}
      {season === "easter" && (
        <>
          <View style={{ position: "absolute", top: 8, left: 8 }}>
            <FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={22} />
          </View>
          <View style={{ position: "absolute", top: 8, right: 10 }}>
            <FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={20} />
          </View>
          <View style={{ position: "absolute", bottom: 8, left: 10 }}>
            <FlowerGlyph petal="#FDE68A" center="#F97316" size={22} />
          </View>
          <View style={{ position: "absolute", bottom: 8, right: 8 }}>
            <FlowerGlyph petal="#A5B4FC" center="#FDE68A" size={20} />
          </View>
          <View style={{ position: "absolute", top: 4, left: "42%" as any }}>
            <FlowerGlyph petal="#FBCFE8" center="#EC4899" size={18} />
          </View>
        </>
      )}
      {season === "independence" && (
        <>
          <View style={{ position: "absolute", top: 6, left: 4 }}>
            <Bunting width={110} />
          </View>
          <View style={{ position: "absolute", top: 6, right: 4 }}>
            <Bunting width={110} />
          </View>
          <View style={{ position: "absolute", bottom: 8, left: 8 }}>
            <Svg width={20} height={30} viewBox="0 0 20 30">
              <Rect x={9} y={4} width={2} height={24} fill="#78716C" />
              <Polygon points="11,4 11,14 19,9" fill="#B91C1C" />
              <Polygon points="11,4 11,9 16,6.5" fill="#F8FAFC" />
            </Svg>
          </View>
          <View style={{ position: "absolute", bottom: 8, right: 8 }}>
            <Svg width={20} height={30} viewBox="0 0 20 30">
              <Rect x={9} y={4} width={2} height={24} fill="#78716C" />
              <Polygon points="11,4 11,14 19,9" fill="#1D4ED8" />
              <Polygon points="11,4 11,9 16,6.5" fill="#F8FAFC" />
            </Svg>
          </View>
        </>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Interior overlay — a decorative garland strip                       */
/* ------------------------------------------------------------------ */

/** A single twinkling Christmas light. */
function TwinkleLight({ color, delay }: { color: string; delay: number }) {
  const tw = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(tw, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true, delay }),
        Animated.timing(tw, { toValue: 0.4, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [tw, delay]);
  return (
    <Animated.View style={{ opacity: tw }}>
      <Svg width={10} height={14} viewBox="0 0 10 14">
        <Circle cx={5} cy={9} r={4} fill={color} />
        <Circle cx={5} cy={9} r={6.5} fill={color} opacity={0.25} />
        <Rect x={3.5} y={1} width={3} height={3} fill="#57534E" />
      </Svg>
    </Animated.View>
  );
}

/** A cobweb for a corner (Halloween). */
export function Cobweb({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Path d="M0 0 L44 0 M0 0 L0 44" stroke="#E7E5E4" strokeWidth={1.2} opacity={0.8} />
      <Path d="M0 0 L30 12 M0 0 L12 30 M0 0 L38 22 M0 0 L22 38" stroke="#E7E5E4" strokeWidth={1} opacity={0.7} />
      <Path d="M8 4 Q14 10 10 18 M18 6 Q26 14 20 26 M28 8 Q34 18 28 30 M6 18 Q12 26 8 34" stroke="#E7E5E4" strokeWidth={1} fill="none" opacity={0.7} />
    </Svg>
  );
}

/**
 * A decorative garland strip for the top of interior screens.
 * Renders nothing outside of holiday seasons.
 */
export function HolidayInteriorOverlay({ season }: { season: HolidaySeason }) {
  if (season === "none") return null;

  return (
    <View pointerEvents="none" style={{ position: "relative", height: 44, overflow: "hidden" }}>
      {season === "halloween" && (
        <View style={{ flex: 1 }}>
          {/* Dark garland string with mini pumpkins */}
          <Svg width="100%" height={44} viewBox="0 0 400 44" preserveAspectRatio="none">
            <Path d="M0 6 Q 200 26 400 6" stroke="#44403C" strokeWidth={3} fill="none" />
          </Svg>
          <View style={{ position: "absolute", top: 8, left: "12%" as any }}><Pumpkin size={20} /></View>
          <View style={{ position: "absolute", top: 12, left: "38%" as any }}><JackOLantern size={24} /></View>
          <View style={{ position: "absolute", top: 8, left: "64%" as any }}><Pumpkin size={20} /></View>
          <View style={{ position: "absolute", top: 12, left: "86%" as any }}><JackOLantern size={22} /></View>
          <View style={{ position: "absolute", top: 0, left: 0 }}><Cobweb size={40} /></View>
          <View style={{ position: "absolute", top: 0, right: 0, transform: [{ scaleX: -1 }] }}><Cobweb size={40} /></View>
        </View>
      )}
      {season === "thanksgiving" && (
        <View style={{ flex: 1 }}>
          <Svg width="100%" height={44} viewBox="0 0 400 44" preserveAspectRatio="none">
            <Path d="M0 6 Q 200 26 400 6" stroke="#92400E" strokeWidth={3} fill="none" />
          </Svg>
          {[
            { left: "8%" as any, color: "#EA580C" },
            { left: "24%" as any, color: "#D97706" },
            { left: "40%" as any, color: "#B91C1C" },
            { left: "56%" as any, color: "#F59E0B" },
            { left: "72%" as any, color: "#EA580C" },
            { left: "88%" as any, color: "#D97706" },
          ].map((l, i) => (
            <View key={i} style={{ position: "absolute", top: 10 + (i % 2) * 6, left: l.left as any }}>
              <LeafShape color={l.color} size={18} />
            </View>
          ))}
          <View style={{ position: "absolute", top: 14, left: "48%" as any }}><Pumpkin size={22} /></View>
        </View>
      )}
      {season === "christmas" && (
        <View style={{ flex: 1 }}>
          {/* Pine garland with twinkling lights */}
          <Svg width="100%" height={44} viewBox="0 0 400 44" preserveAspectRatio="none">
            <Path d="M0 8 Q 200 30 400 8" stroke="#15803D" strokeWidth={7} fill="none" />
            <Path d="M0 8 Q 200 30 400 8" stroke="#16A34A" strokeWidth={3.5} fill="none" strokeDasharray="8 5" />
          </Svg>
          <View style={{ position: "absolute", top: 6, left: 0, right: 0, flexDirection: "row", justifyContent: "space-around" }}>
            {["#EF4444", "#FBBF24", "#3B82F6", "#22C55E", "#EC4899", "#FBBF24", "#EF4444", "#3B82F6"].map((c, i) => (
              <TwinkleLight key={i} color={c} delay={i * 220} />
            ))}
          </View>
          <View style={{ position: "absolute", top: 16, left: "6%" as any }}>
            <Svg width={16} height={16} viewBox="0 0 16 16">
              <Path d="M8 14 L3 7 L13 7 Z" fill="#B91C1C" />
              <Circle cx={8} cy={6} r={2.4} fill="#B91C1C" />
            </Svg>
          </View>
          <View style={{ position: "absolute", top: 16, right: "6%" }}>
            <Svg width={16} height={16} viewBox="0 0 16 16">
              <Path d="M8 14 L3 7 L13 7 Z" fill="#B91C1C" />
              <Circle cx={8} cy={6} r={2.4} fill="#B91C1C" />
            </Svg>
          </View>
        </View>
      )}
      {season === "valentines" && (
        <View style={{ flex: 1 }}>
          <Svg width="100%" height={44} viewBox="0 0 400 44" preserveAspectRatio="none">
            <Path d="M0 6 Q 200 26 400 6" stroke="#F9A8D4" strokeWidth={2.5} fill="none" />
          </Svg>
          {[
            { left: "10%" as any, color: "#EC4899", size: 18 },
            { left: "28%" as any, color: "#F43F5E", size: 14 },
            { left: "46%" as any, color: "#F9A8D4", size: 18 },
            { left: "64%" as any, color: "#EC4899", size: 14 },
            { left: "82%" as any, color: "#BE123C", size: 18 },
          ].map((h, i) => (
            <View key={i} style={{ position: "absolute", top: 10 + (i % 2) * 8, left: h.left as any }}>
              <HeartGlyph color={h.color} size={h.size} />
            </View>
          ))}
        </View>
      )}
      {season === "easter" && (
        <View style={{ flex: 1 }}>
          <Svg width="100%" height={44} viewBox="0 0 400 44" preserveAspectRatio="none">
            <Path d="M0 6 Q 200 26 400 6" stroke="#C4B5FD" strokeWidth={2.5} fill="none" />
          </Svg>
          {[
            { left: "8%" as any, petal: "#F9A8D4", center: "#FBBF24" },
            { left: "26%" as any, petal: "#C4B5FD", center: "#FDE68A" },
            { left: "44%" as any, petal: "#FDE68A", center: "#F97316" },
            { left: "62%" as any, petal: "#A5B4FC", center: "#FDE68A" },
            { left: "80%" as any, petal: "#FBCFE8", center: "#EC4899" },
          ].map((f, i) => (
            <View key={i} style={{ position: "absolute", top: 10 + (i % 2) * 8, left: f.left as any }}>
              <FlowerGlyph petal={f.petal} center={f.center} size={20} />
            </View>
          ))}
        </View>
      )}
      {season === "independence" && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Bunting width={300} />
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Border dressing — lighthouse + border mood for holidays             */
/* ------------------------------------------------------------------ */

/**
 * Holiday dressing for the lighthouse in the town border.
 * Christmas: twinkling light string + snow cap. Halloween: glowing
 * pumpkin at the base + fog. Others: small seasonal touches.
 */
export function LighthouseHolidayDressing({ season }: { season: HolidaySeason }) {
  if (season === "none") return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
      {season === "christmas" && (
        <>
          {/* Snow cap on the roof */}
          <Svg width={16} height={8} viewBox="0 0 16 8" style={{ position: "absolute", top: 2, left: 5 }}>
            <Polygon points="1,8 15,8 8,0" fill="#F8FAFC" />
            <Circle cx={4} cy={6} r={1.5} fill="#FFFFFF" />
            <Circle cx={12} cy={6} r={1.5} fill="#FFFFFF" />
          </Svg>
          {/* Twinkling lights spiraling the tower */}
          {[
            { top: 14, left: 4, c: "#EF4444" },
            { top: 22, left: 16, c: "#FBBF24" },
            { top: 30, left: 5, c: "#3B82F6" },
            { top: 38, left: 15, c: "#22C55E" },
            { top: 46, left: 6, c: "#FBBF24" },
          ].map((l, i) => (
            <View key={i} style={{ position: "absolute", top: l.top, left: l.left }}>
              <TwinkleLight color={l.c} delay={i * 300} />
            </View>
          ))}
        </>
      )}
      {season === "halloween" && (
        <>
          {/* Glowing pumpkin at the base */}
          <View style={{ position: "absolute", bottom: 2, left: 1 }}>
            <JackOLantern size={20} />
          </View>
          {/* Fog pooling at the base */}
          <Svg width={30} height={14} viewBox="0 0 30 14" style={{ position: "absolute", bottom: 0, left: -2 }}>
            <Ellipse cx={15} cy={10} rx={14} ry={5} fill="#A8A29E" opacity={0.45} />
          </Svg>
        </>
      )}
      {season === "thanksgiving" && (
        <View style={{ position: "absolute", bottom: 2, left: 2 }}>
          <Pumpkin size={18} />
        </View>
      )}
      {season === "valentines" && (
        <View style={{ position: "absolute", top: 30, left: 8 }}>
          <HeartGlyph color="#EC4899" size={12} />
        </View>
      )}
      {season === "easter" && (
        <View style={{ position: "absolute", bottom: 2, left: 1, flexDirection: "row" }}>
          <FlowerGlyph petal="#F9A8D4" center="#FBBF24" size={12} />
          <FlowerGlyph petal="#C4B5FD" center="#FDE68A" size={12} />
        </View>
      )}
      {season === "independence" && (
        <View style={{ position: "absolute", top: 24, left: 2 }}>
          <Bunting width={22} colors={["#B91C1C", "#F8FAFC", "#1D4ED8"]} />
        </View>
      )}
    </View>
  );
}

/**
 * Whole-border mood layer: a seasonal atmosphere wash over the entire
 * border frame. Halloween gets drifting fog banks; Christmas a warm
 * golden shimmer; others a whisper of seasonal color.
 */
export function HolidayBorderMood({ season }: { season: HolidaySeason }) {
  if (season === "none") return null;
  const fogDrift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (season !== "halloween") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fogDrift, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(fogDrift, { toValue: 0, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [season, fogDrift]);
  const fogX = fogDrift.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });

  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
      {season === "halloween" && (
        <>
          {/* Spooky purple-grey grade */}
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(76,29,149,0.12)" }} />
          {/* Drifting fog banks */}
          <Animated.View style={{ position: "absolute", bottom: 20, left: "10%", transform: [{ translateX: fogX }] }}>
            <Svg width={160} height={36} viewBox="0 0 160 36">
              <Ellipse cx={80} cy={22} rx={75} ry={13} fill="#A8A29E" opacity={0.35} />
              <Ellipse cx={40} cy={26} rx={38} ry={9} fill="#A8A29E" opacity={0.3} />
            </Svg>
          </Animated.View>
          <Animated.View style={{ position: "absolute", bottom: 60, right: "5%", transform: [{ translateX: fogX }] }}>
            <Svg width={120} height={28} viewBox="0 0 120 28">
              <Ellipse cx={60} cy={18} rx={55} ry={10} fill="#A8A29E" opacity={0.3} />
            </Svg>
          </Animated.View>
        </>
      )}
      {season === "christmas" && (
        <>
          {/* Warm golden grade — cozy winter */}
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(251,191,36,0.07)" }} />
          {/* Snow resting along the bottom edge */}
          <Svg width="100%" height={14} viewBox="0 0 400 14" preserveAspectRatio="none" style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
            <Path d="M0 14 L0 8 Q30 4 60 8 T120 8 T180 8 T240 8 T300 8 T360 8 T420 8 L420 14 Z" fill="#F8FAFC" opacity={0.85} />
          </Svg>
        </>
      )}
      {season === "thanksgiving" && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(217,119,6,0.08)" }} />
      )}
      {season === "valentines" && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(236,72,153,0.06)" }} />
      )}
      {season === "easter" && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(167,139,250,0.06)" }} />
      )}
      {season === "independence" && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(29,78,216,0.05)" }} />
      )}
    </View>
  );
}
