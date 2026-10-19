import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from "react-native-svg";
import { localDateStr, wellDrawnOn, wellVerseForDate, type WellState } from "@/lib/hometown";
import type { PageTheme, TimeOfDay } from "@/lib/daynight";

export type TheWellProps = {
  well: WellState;
  timeOfDay: TimeOfDay;
  pt: PageTheme;
  /** Persist a draw for today. Called once the bucket finishes rising. */
  onDraw: () => void;
};

const SCENE_W = 360;
const SCENE_H = 470;

const SCENE_BG: Record<TimeOfDay, string> = {
  morning: "#FDF6EC",
  afternoon: "#F1F8F3",
  evening: "#FBF0E2",
  night: "#252135",
};

/** Deterministic PRNG so ambient placement is stable. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Butterfly({ color, seed, bounds }: { color: string; seed: number; bounds: { x0: number; x1: number; y0: number; y1: number } }) {
  const drift = useRef(new Animated.Value(0)).current;
  const flap = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const d = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 7000 + seed * 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 7000 + seed * 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const f = Animated.loop(
      Animated.sequence([
        Animated.timing(flap, { toValue: 1, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flap, { toValue: 0, duration: 320, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    d.start(); f.start();
    return () => { d.stop(); f.stop(); };
  }, [drift, flap, seed]);
  const baseX = bounds.x0 + ((seed * 97) % (bounds.x1 - bounds.x0));
  const baseY = bounds.y0 + ((seed * 53) % (bounds.y1 - bounds.y0));
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] });
  const scaleX = flap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.35] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left: baseX, top: baseY, transform: [{ translateX }, { translateY }, { scaleX }] }}
    >
      <Svg width={24} height={18} viewBox="0 0 26 20">
        <G>
          <Ellipse cx={7} cy={10} rx={7} ry={9} fill={color} opacity={0.9} />
          <Ellipse cx={19} cy={10} rx={7} ry={9} fill={color} opacity={0.9} />
          <Rect x={12} y={4} width={2.5} height={12} rx={1.2} fill="#3F3F46" />
        </G>
      </Svg>
    </Animated.View>
  );
}

function Firefly({ x, y, dur, delay }: { x: number; y: number; dur: number; delay: number }) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(glow, { toValue: 1, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.15, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glow, dur, delay]);
  const opacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] });
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: x, top: y, opacity }}>
      <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FDE68A", shadowColor: "#FBBF24", shadowOpacity: 0.9, shadowRadius: 8 }} />
    </Animated.View>
  );
}

function Fireflies({ count, seedOffset }: { count: number; seedOffset: number }) {
  const items = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const rng = mulberry32((i + seedOffset) * 331 + 7);
      return {
        x: 20 + rng() * (SCENE_W - 40),
        y: 120 + rng() * 300,
        dur: 2400 + rng() * 2600,
        delay: rng() * 2000,
      };
    });
  }, [count, seedOffset]);
  return (
    <>
      {items.map((f, i) => (
        <Firefly key={i} x={f.x} y={f.y} dur={f.dur} delay={f.delay} />
      ))}
    </>
  );
}

/** Slow breathing glow behind the verse — a moment of stillness. */
function BreathingGlow({ color }: { color: string }) {
  const breathe = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const opacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.45] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute", left: 24, right: 24, top: -14, height: 190,
        borderRadius: 95, backgroundColor: color, transform: [{ scale }], opacity,
      }}
    />
  );
}

const BUCKET_DOWN = 318; // resting, just above the water
const BUCKET_UP = 208;   // raised to the crossbar

export function TheWell({ well, timeOfDay, pt, onDraw }: TheWellProps) {
  const isNight = timeOfDay === "night";
  const today = localDateStr();
  const drawnToday = wellDrawnOn(well, today);
  const verse = useMemo(() => wellVerseForDate(today), [today]);

  const [phase, setPhase] = useState<"idle" | "drawing" | "drawn">(drawnToday ? "drawn" : "idle");
  const bucketAnim = useRef(new Animated.Value(0)).current;

  // If the draw lands (parent persisted), settle into the drawn phase.
  useEffect(() => {
    if (drawnToday && phase !== "drawn") {
      bucketAnim.setValue(1);
      setPhase("drawn");
    }
    if (!drawnToday && phase === "drawn") setPhase("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnToday]);

  const startDraw = () => {
    if (phase !== "idle" || drawnToday) return;
    setPhase("drawing");
    bucketAnim.setValue(0);
    Animated.timing(bucketAnim, {
      toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        onDraw();
        setPhase("drawn");
      }
    });
  };

  const bucketY = bucketAnim.interpolate({ inputRange: [0, 1], outputRange: [BUCKET_DOWN, BUCKET_UP] });
  const ropeHeight = bucketAnim.interpolate({ inputRange: [0, 1], outputRange: [BUCKET_DOWN - 196, BUCKET_UP - 196] });

  const grassWash = isNight ? "#1E1B2E" : "#D8E6CE";
  const dirt = isNight ? "#3A3145" : "#E3D3B3";
  const stone = isNight ? "#4A4458" : "#CFC4AC";
  const stoneEdge = isNight ? "#37324A" : "#A99B7E";
  const wood = isNight ? "#5B4A32" : "#8B5E34";
  const woodDark = isNight ? "#463826" : "#6B4423";
  const leaf = isNight ? "#243528" : "#6B9E6B";
  const leaf2 = isNight ? "#2A3D2E" : "#7BAF7B";
  const water = isNight ? "#2E4A5E" : "#7DD3FC";

  const flowers = useMemo(() => {
    const rng = mulberry32(4242);
    const cols = isNight ? ["#8B7BB8", "#7BA3B8", "#B88BA3"] : ["#F9A8D4", "#FDE68A", "#FCA5A5", "#FBCFE8"];
    return Array.from({ length: 14 }, (_, i) => ({
      x: 24 + rng() * (SCENE_W - 48),
      y: 150 + rng() * 290,
      c: cols[i % cols.length],
      s: 3 + rng() * 2.5,
    }));
  }, [isNight]);

  const streakLine =
    well.streak >= 2
      ? `${well.streak} days in a row at the well`
      : well.totalDraws === 0 && !drawnToday
        ? "Your first drawing"
        : drawnToday && well.streak <= 1
          ? "A new beginning"
          : null;

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ width: "100%", aspectRatio: SCENE_W / SCENE_H, backgroundColor: SCENE_BG[timeOfDay], borderRadius: 16, overflow: "hidden", alignSelf: "center" }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="xMidYMid slice">
          {/* grass wash */}
          <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill={grassWash} opacity={0.6} />
          {/* dirt clearing around the well */}
          <Ellipse cx={180} cy={380} rx={120} ry={70} fill={dirt} opacity={0.8} />

          {/* corner trees */}
          {[
            { x: 40, y: 84, s: 1 },
            { x: 322, y: 76, s: 0.85 },
            { x: 52, y: 420, s: 0.9 },
            { x: 312, y: 428, s: 1 },
          ].map((t, i) => (
            <G key={i} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}>
              <Rect x={-4} y={0} width={8} height={18} rx={3} fill={isNight ? "#3E2F22" : "#7C5A2E"} />
              <Circle cx={0} cy={-14} r={20} fill={leaf} opacity={0.95} />
              <Circle cx={-12} cy={-6} r={13} fill={leaf2} opacity={0.9} />
              <Circle cx={12} cy={-6} r={13} fill={leaf2} opacity={0.9} />
            </G>
          ))}

          {/* small wildflowers */}
          {flowers.map((f, i) => (
            <G key={i}>
              <Circle cx={f.x} cy={f.y} r={f.s} fill={f.c} opacity={0.9} />
              <Circle cx={f.x} cy={f.y} r={f.s * 0.4} fill={isNight ? "#3A3450" : "#FFF7ED"} opacity={0.9} />
            </G>
          ))}

          {/* moon glow at night */}
          {isNight && <Circle cx={310} cy={52} r={26} fill="#FDE68A" opacity={0.35} />}

          {/* ---- the well ---- */}
          {/* posts */}
          <Rect x={118} y={168} width={13} height={178} rx={4} fill={wood} />
          <Rect x={229} y={168} width={13} height={178} rx={4} fill={wood} />
          {/* roof */}
          <Polygon points="100,172 260,172 180,104" fill={woodDark} />
          <Polygon points="112,172 248,172 180,112" fill={wood} opacity={0.85} />
          <Rect x={176} y={92} width={8} height={16} rx={3} fill={woodDark} />
          {/* crossbar */}
          <Rect x={112} y={186} width={136} height={10} rx={4} fill={woodDark} />
          {/* stone base */}
          <Rect x={112} y={336} width={136} height={62} rx={10} fill={stone} />
          <Ellipse cx={180} cy={398} rx={68} ry={14} fill={stoneEdge} opacity={0.7} />
          <Ellipse cx={180} cy={336} rx={68} ry={20} fill={stone} stroke={stoneEdge} strokeWidth={3} />
          {/* dark water opening */}
          <Ellipse cx={180} cy={336} rx={46} ry={13} fill={isNight ? "#10131F" : "#1E293B"} />
          <Ellipse cx={180} cy={334} rx={30} ry={8} fill={water} opacity={isNight ? 0.5 : 0.8} />
          {/* stone seams */}
          <Path d="M 130 352 L 130 388 M 180 354 L 180 392 M 230 352 L 230 388" stroke={stoneEdge} strokeWidth={2} opacity={0.6} />
        </Svg>

        {/* rope + bucket (animated, above the SVG so it can move) */}
        <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: SCENE_W, height: SCENE_H }}>
          <Animated.View style={{ position: "absolute", left: 178.5, top: 196, width: 3, height: ropeHeight, backgroundColor: isNight ? "#6B5B3E" : "#A0824F" }} />
          <Animated.View style={{ position: "absolute", left: 162, top: Animated.add(bucketY, -13), width: 36, height: 26 }}>
            <Svg width={36} height={26} viewBox="0 0 36 26">
              <Polygon points="4,2 32,2 28,24 8,24" fill={isNight ? "#5B4A32" : "#8B5E34"} />
              <Rect x={4} y={2} width={28} height={4} fill={isNight ? "#463826" : "#6B4423"} />
              <Rect x={7} y={12} width={22} height={3} fill={isNight ? "#463826" : "#6B4423"} opacity={0.8} />
              <Ellipse cx={18} cy={4} rx={12} ry={3} fill={water} opacity={0.9} />
            </Svg>
          </Animated.View>
        </Animated.View>

        {/* tap target over the well */}
        <Pressable
          onPress={startDraw}
          disabled={phase !== "idle" || drawnToday}
          style={{ position: "absolute", left: 90, top: 90, width: 180, height: 330 }}
          accessibilityLabel={drawnToday ? "The well — drawn today" : "Draw water from the well"}
        />

        {/* hint */}
        {phase === "idle" && !drawnToday && (
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 14, alignItems: "center" }}>
            <Text style={{ color: isNight ? "#C9BFAE" : "#6B5B3E", fontSize: 13, fontStyle: "italic", backgroundColor: isNight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.65)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, overflow: "hidden" }}>
              Tap the well to draw today&apos;s water
            </Text>
          </View>
        )}

        {/* ambient life */}
        {!isNight && (
          <>
            <Butterfly color="#F9A8D4" seed={1} bounds={{ x0: 40, x1: 300, y0: 150, y1: 330 }} />
            <Butterfly color="#FDE68A" seed={2} bounds={{ x0: 40, x1: 300, y0: 150, y1: 330 }} />
            <Butterfly color="#BAE6FD" seed={3} bounds={{ x0: 40, x1: 300, y0: 150, y1: 330 }} />
          </>
        )}
        {isNight && <Fireflies count={9} seedOffset={11} />}
      </View>

      {/* verse + streak */}
      {phase !== "idle" && (
        <View style={{ marginTop: 16, alignItems: "center", paddingHorizontal: 16, width: "100%" }}>
          <View style={{ position: "relative", width: "100%", alignItems: "center" }}>
            <BreathingGlow color={isNight ? "#3B82F6" : "#7DD3FC"} />
            <Text style={{ fontSize: 15, fontStyle: "italic", lineHeight: 24, textAlign: "center", color: pt.text, flexShrink: 1, width: "100%" }}>
              &ldquo;{verse.text}&rdquo;
            </Text>
            <Text style={{ marginTop: 8, fontSize: 13, fontWeight: "800", color: "#B45309", letterSpacing: 1 }}>
              {verse.ref} · KJV
            </Text>
          </View>
          {streakLine && (
            <Text style={{ marginTop: 10, fontSize: 12, color: pt.subtext, fontStyle: "italic" }}>
              {streakLine}
            </Text>
          )}
          {phase === "drawing" && (
            <Text style={{ marginTop: 10, fontSize: 12, color: pt.subtext }}>Drawing…</Text>
          )}
        </View>
      )}
    </View>
  );
}
