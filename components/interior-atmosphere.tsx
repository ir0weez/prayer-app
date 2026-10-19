/* ------------------------------------------------------------------ */
/* InteriorAtmosphere — full-scene holiday/season transformation       */
/*                                                                     */
/* Renders INSIDE an interior scene container (position: relative,     */
/* overflow: hidden). Transforms the whole room: color grade,          */
/* animated light strings hung in the room, drifting particles,        */
/* corner decorations, and flickering/twinkling light effects.         */
/*                                                                     */
/* This replaces the old top-banner garland — the theme lives IN the   */
/* scene, not above it. Holidays take priority; seasons fill the gaps. */
/* All SVG + Animated, zero emojis, gentle motion only.                */
/* ------------------------------------------------------------------ */

import { useEffect as useEffect2, useRef as useRef2 } from "react";
import { Animated as Animated2, Easing as Easing2, View as View2 } from "react-native";
import Svg2, { Circle as Circle2, Ellipse as Ellipse2, Path as Path2, Polygon as Polygon2, Rect as Rect2 } from "react-native-svg";
import { BuildingHolidayDecor, type InteriorBuilding } from "@/components/building-holiday-decor";
import type { HolidaySeason, Season as Season2 } from "@/lib/seasons";

/** Grade (lighting wash) colors per holiday and season. */
const ATMOSPHERE_GRADES: Record<string, string> = {
  halloween: "rgba(46, 16, 84, 0.22)",
  thanksgiving: "rgba(180, 110, 30, 0.10)",
  christmas: "rgba(30, 60, 120, 0.10)",
  valentines: "rgba(190, 40, 90, 0.08)",
  easter: "rgba(120, 90, 200, 0.08)",
  independence: "rgba(20, 50, 140, 0.07)",
  spring: "rgba(110, 190, 120, 0.06)",
  summer: "rgba(255, 200, 100, 0.07)",
  fall: "rgba(210, 130, 50, 0.08)",
  winter: "rgba(140, 180, 220, 0.10)",
};

/** A single room particle drifting through the scene. */
function RoomParticle({
  kind,
  leftPct,
  topPct,
  delay,
  duration,
  drift,
}: {
  kind: "fog" | "ember" | "snow" | "leaf" | "petal" | "heart" | "spark" | "firefly";
  leftPct: number;
  topPct: number;
  delay: number;
  duration: number;
  drift: number;
}) {
  const anim = useRef2(new Animated2.Value(0)).current;
  useEffect2(() => {
    const loop = Animated2.loop(
      Animated2.timing(anim, { toValue: 1, duration, easing: Easing2.inOut(Easing2.sin), useNativeDriver: true })
    );
    const starter = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(starter); loop.stop(); };
  }, [anim, delay, duration]);

  const dy = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift, 0] });
  const dx = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift * 0.6, 0] });
  const opacity = anim.interpolate({ inputRange: [0, 0.25, 0.75, 1], outputRange: [0.15, 0.7, 0.7, 0.15] });

  const glyph = (() => {
    switch (kind) {
      case "fog":
        return (
          <Svg2 width={90} height={30} viewBox="0 0 90 30">
            <Ellipse2 cx={45} cy={15} rx={42} ry={10} fill="#C4B5FD" opacity={0.35} />
            <Ellipse2 cx={25} cy={18} rx={22} ry={7} fill="#C4B5FD" opacity={0.3} />
          </Svg2>
        );
      case "ember":
        return (
          <Svg2 width={8} height={8} viewBox="0 0 8 8">
            <Circle2 cx={4} cy={4} r={3.2} fill="#FBBF24" opacity={0.9} />
            <Circle2 cx={4} cy={4} r={1.6} fill="#FEF3C7" />
          </Svg2>
        );
      case "snow":
        return (
          <Svg2 width={10} height={10} viewBox="0 0 10 10">
            <Circle2 cx={5} cy={5} r={3.4} fill="#FFFFFF" opacity={0.95} />
            <Circle2 cx={5} cy={5} r={4.6} fill="#FFFFFF" opacity={0.3} />
          </Svg2>
        );
      case "leaf":
        return (
          <Svg2 width={12} height={12} viewBox="0 0 20 20">
            <Path2 d="M10 1 C16 6, 17 13, 10 19 C3 13, 4 6, 10 1 Z" fill={["#EA580C", "#D97706", "#B91C1C"][Math.floor(Math.random() * 3)]} />
          </Svg2>
        );
      case "petal":
        return (
          <Svg2 width={11} height={11} viewBox="0 0 20 20">
            <Ellipse2 cx={10} cy={10} rx={8} ry={5.5} fill={["#F9A8D4", "#FBCFE8", "#FDE68A"][Math.floor(Math.random() * 3)]} opacity={0.9} />
          </Svg2>
        );
      case "heart":
        return (
          <Svg2 width={12} height={11} viewBox="0 0 20 18">
            <Path2 d="M10 17 C4 12, 1 8, 1 5 C1 2.5, 3 1, 5.5 1 C7.5 1, 9 2.5, 10 4 C11 2.5, 12.5 1, 14.5 1 C17 1, 19 2.5, 19 5 C19 8, 16 12, 10 17 Z" fill={["#EC4899", "#F43F5E", "#F9A8D4"][Math.floor(Math.random() * 3)]} opacity={0.85} />
          </Svg2>
        );
      case "spark":
        return (
          <Svg2 width={9} height={9} viewBox="0 0 10 10">
            <Polygon2 points="5,0 6.2,3.8 10,5 6.2,6.2 5,10 3.8,6.2 0,5 3.8,3.8" fill={["#EF4444", "#F8FAFC", "#3B82F6"][Math.floor(Math.random() * 3)]} opacity={0.9} />
          </Svg2>
        );
      case "firefly":
        return (
          <Svg2 width={10} height={10} viewBox="0 0 10 10">
            <Circle2 cx={5} cy={5} r={4} fill="#FEF08A" opacity={0.35} />
            <Circle2 cx={5} cy={5} r={1.8} fill="#FEF9C3" />
          </Svg2>
        );
    }
  })();

  return (
    <Animated2.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: `${leftPct}%` as any,
        top: `${topPct}%` as any,
        opacity,
        transform: [{ translateX: dx }, { translateY: dy }],
      }}
    >
      {glyph}
    </Animated2.View>
  );
}

/** Twinkling bulb on a string light. */
function StringBulb({ color, delay, x, y }: { color: string; delay: number; x: number; y: number }) {
  const tw = useRef2(new Animated2.Value(0.5)).current;
  useEffect2(() => {
    const loop = Animated2.loop(
      Animated2.sequence([
        Animated2.timing(tw, { toValue: 1, duration: 800 + delay, easing: Easing2.inOut(Easing2.sin), useNativeDriver: true }),
        Animated2.timing(tw, { toValue: 0.35, duration: 800 + delay, easing: Easing2.inOut(Easing2.sin), useNativeDriver: true }),
      ])
    );
    const starter = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(starter); loop.stop(); };
  }, [tw, delay]);
  return (
    <Animated2.View pointerEvents="none" style={{ position: "absolute", left: x, top: y, opacity: tw }}>
      <Svg2 width={12} height={16} viewBox="0 0 12 16">
        <Rect2 x={4.5} y={0} width={3} height={3.5} rx={1} fill="#57534E" />
        <Circle2 cx={6} cy={10} r={4.2} fill={color} />
        <Circle2 cx={6} cy={10} r={6.5} fill={color} opacity={0.22} />
      </Svg2>
    </Animated2.View>
  );
}

/** A string of lights hung across the room (in-scene, not a banner). */
function RoomLightString({ colors, bulbCount = 7 }: { colors: string[]; bulbCount?: number }) {
  const bulbs = Array.from({ length: bulbCount });
  return (
    <View2 pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 52 }}>
      <Svg2 width="100%" height={52} viewBox="0 0 400 52" preserveAspectRatio="none">
        <Path2 d="M-10 6 Q 100 34 200 22 T 410 10" stroke="#3F3F46" strokeWidth={2.5} fill="none" opacity={0.8} />
      </Svg2>
      {bulbs.map((_, i) => {
        const t = (i + 0.5) / bulbCount;
        // Approximate the curve: y follows the sag.
        const y = 10 + 22 * Math.sin(Math.PI * t) * (1 - Math.abs(t - 0.5));
        return (
          <StringBulb
            key={i}
            color={colors[i % colors.length]}
            delay={(i * 340) % 1500}
            x={t * 380 - 6}
            y={y}
          />
        );
      })}
    </View2>
  );
}

/**
 * Full-scene holiday/season atmosphere for interior rooms.
 * Place as a child of the scene container (which must have
 * overflow: hidden). Renders nothing when there's no holiday
 * and no distinct season mood.
 *
 * Layers (all pointerEvents="none"):
 *  1. Color grade wash — the room's lighting shifts
 *  2. Light string — twinkling bulbs hung across the room
 *  3. Drifting particles — fog, snow, embers, leaves, petals...
 *  4. Corner decorations — jack-o-lanterns, tree, wreath, etc.
 */
export function InteriorAtmosphere({
  holiday,
  season,
  building,
}: {
  holiday: HolidaySeason;
  season: Season2;
  building: InteriorBuilding;
}) {
  const active = holiday !== "none" ? holiday : season;
  const grade = ATMOSPHERE_GRADES[active];
  if (!grade) return null;

  // Particle plan per mood.
  const particles: Array<{ kind: "fog" | "ember" | "snow" | "leaf" | "petal" | "heart" | "spark" | "firefly"; count: number; drift: number }> =
    holiday === "halloween"
      ? [{ kind: "fog", count: 2, drift: 26 }, { kind: "ember", count: 4, drift: -34 }]
      : holiday === "christmas"
        ? [{ kind: "snow", count: 7, drift: 30 }]
        : holiday === "thanksgiving"
          ? [{ kind: "leaf", count: 5, drift: 24 }]
          : holiday === "valentines"
            ? [{ kind: "heart", count: 5, drift: -22 }]
            : holiday === "easter"
              ? [{ kind: "petal", count: 6, drift: 26 }]
              : holiday === "independence"
                ? [{ kind: "spark", count: 5, drift: 20 }]
                : season === "spring"
                  ? [{ kind: "petal", count: 5, drift: 24 }]
                  : season === "summer"
                    ? [{ kind: "firefly", count: 5, drift: 30 }]
                    : season === "fall"
                      ? [{ kind: "leaf", count: 6, drift: 26 }]
                      : [{ kind: "snow", count: 6, drift: 28 }]; // winter

  const lightColors =
    holiday === "halloween"
      ? ["#F97316", "#FBBF24", "#A855F7"]
      : holiday === "christmas"
        ? ["#EF4444", "#FBBF24", "#3B82F6", "#22C55E", "#FDE68A"]
        : holiday === "thanksgiving"
          ? ["#F59E0B", "#EA580C", "#FDE68A"]
          : holiday === "valentines"
            ? ["#EC4899", "#F9A8D4", "#F43F5E"]
            : holiday === "easter"
              ? ["#C4B5FD", "#F9A8D4", "#FDE68A"]
              : holiday === "independence"
                ? ["#EF4444", "#F8FAFC", "#3B82F6"]
                : season === "winter"
                  ? ["#BAE6FD", "#FDE68A", "#E0F2FE"]
                  : ["#FDE68A", "#FBCFE8", "#BBF7D0"];

  return (
    <View2 pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 }}>
      {/* 1. Lighting grade — the whole room shifts mood */}
      <View2 style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: grade }} />

      {/* 2. Light string hung across the room */}
      <RoomLightString colors={lightColors} bulbCount={holiday === "halloween" ? 6 : 7} />

      {/* 3. Drifting particles */}
      {particles.map((p) =>
        Array.from({ length: p.count }).map((_, i) => (
          <RoomParticle
            key={`${p.kind}-${i}`}
            kind={p.kind}
            leftPct={6 + ((i * 37 + p.kind.length * 13) % 88)}
            topPct={12 + ((i * 53) % 70)}
            delay={(i * 1100) % 5000}
            duration={6000 + ((i * 1700) % 5000)}
            drift={p.drift}
          />
        ))
      )}

      {/* 4. Unique per-building decorations — each place gets its OWN
          holiday personality, hand-placed for that building. */}
      <BuildingHolidayDecor building={building} holiday={holiday} season={season} />
    </View2>
  );
}
