import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, useWindowDimensions, View } from "react-native";
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
// Fixed horizontal space these scenes sit inside: 16px hometown ScrollView
// padding each side + 26px SeasonalBorder gutter each side = 84.
const SCENE_H_INSET = 84;

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

function Butterfly({ color, seed, bounds, k }: { color: string; seed: number; bounds: { x0: number; x1: number; y0: number; y1: number }; k: number }) {
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
  // Bounds are in scene (viewBox) units — scale to device px so the
  // butterflies stay inside the rendered scene at any screen width.
  const baseX = (bounds.x0 + ((seed * 97) % (bounds.x1 - bounds.x0))) * k;
  const baseY = (bounds.y0 + ((seed * 53) % (bounds.y1 - bounds.y0))) * k;
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-30 * k, 30 * k] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [-20 * k, 20 * k] });
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

function Fireflies({ count, seedOffset, k }: { count: number; seedOffset: number; k: number }) {
  const items = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const rng = mulberry32((i + seedOffset) * 331 + 7);
      return {
        // Scene (viewBox) units — scaled to device px at render so the
        // fireflies stay inside the rendered scene at any screen width.
        x: (20 + rng() * (SCENE_W - 40)) * k,
        y: (100 + rng() * 330) * k,
        dur: 2400 + rng() * 2600,
        delay: rng() * 2000,
      };
    });
  }, [count, seedOffset, k]);
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

/** A small tuft of grass — three blades. */
function GrassTuft({ x, y, s, color, color2 }: { x: number; y: number; s: number; color: string; color2: string }) {
  return (
    <G transform={`translate(${x} ${y}) scale(${s})`}>
      <Path d="M0 0 C -2 -8, -4 -12, -7 -16" stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Path d="M0 0 C 0 -9, 1 -14, 0 -19" stroke={color2} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <Path d="M0 0 C 2 -8, 4 -12, 7 -15" stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </G>
  );
}

const CROSSBAR_Y = 176; // rope anchor under the crossbar
const BUCKET_DOWN = 300; // resting, just above the water
const BUCKET_UP = 190;   // raised to the crossbar
const WELL_CX = 180;

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

  // Scene dimensions are anchored to the device window, not to onLayout
  // measurement: the scene's visible slot is exactly windowWidth - 84, and
  // measuring the container could report a width wider than the visible
  // screen (overflow). aspectRatio is also unreliable inside flex parents.
  const { width: windowW } = useWindowDimensions();
  const sceneW =
    Number.isFinite(windowW) && windowW > SCENE_H_INSET ? Math.floor(windowW - SCENE_H_INSET) : 300;
  const sceneH = Math.round(sceneW * (SCENE_H / SCENE_W));
  // Scale factor for the rope/bucket overlay + tap target (SVG scales via viewBox).
  const k = sceneW / SCENE_W;

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
  const ropeHeight = bucketAnim.interpolate({ inputRange: [0, 1], outputRange: [BUCKET_DOWN - CROSSBAR_Y, BUCKET_UP - CROSSBAR_Y] });

  const grassWash = isNight ? "#2B2740" : "#CFE0C2";
  const grassDeep = isNight ? "#241F38" : "#BFD3B0";
  const dirt = isNight ? "#4A4159" : "#D9C49A";
  const stone = isNight ? "#6B6683" : "#B9AB8C";
  const stoneEdge = isNight ? "#4E4A66" : "#8F8060";
  const wood = isNight ? "#7D6545" : "#7A5228";
  const woodDark = isNight ? "#5E4C33" : "#5E3F1E";
  const leaf = isNight ? "#35543D" : "#5D8F5D";
  const leaf2 = isNight ? "#40604A" : "#6FA06F";
  const water = isNight ? "#3E5F7A" : "#7DD3FC";

  const flowers = useMemo(() => {
    const rng = mulberry32(4242);
    const cols = isNight ? ["#8B7BB8", "#7BA3B8", "#B88BA3"] : ["#F9A8D4", "#FDE68A", "#FCA5A5", "#FBCFE8", "#FDBA74"];
    return Array.from({ length: 22 }, (_, i) => {
      // Bias flowers to the sides so the well and path stay clear.
      const side = rng() < 0.5 ? 0 : 1;
      const x = side === 0 ? 18 + rng() * 80 : 262 + rng() * 80;
      return {
        x,
        y: 120 + rng() * 330,
        c: cols[i % cols.length],
        s: 3 + rng() * 2.5,
      };
    });
  }, [isNight]);

  const tufts = useMemo(() => {
    const rng = mulberry32(777);
    return Array.from({ length: 12 }, (_, i) => {
      const side = rng() < 0.5 ? 0 : 1;
      return {
        x: side === 0 ? 14 + rng() * 90 : 256 + rng() * 90,
        y: 140 + rng() * 310,
        s: 0.8 + rng() * 0.7,
      };
    });
  }, []);

  const pebbles = useMemo(() => {
    const rng = mulberry32(999);
    return Array.from({ length: 8 }, () => ({
      x: 20 + rng() * (SCENE_W - 40),
      y: 200 + rng() * 250,
      r: 2.5 + rng() * 3,
    }));
  }, []);

  const streakLine =
    well.streak >= 2
      ? `${well.streak} days in a row at the well`
      : well.totalDraws === 0 && !drawnToday
        ? "Your first drawing"
        : drawnToday && well.streak <= 1
          ? "A new beginning"
          : null;

  const renderedW = sceneW;
  const renderedH = sceneH;

  return (
    // Root pinned to the window-anchored slot: the SeasonalBorder center
    // column sizes from content intrinsic width (flexShrink: 0), which can
    // measure wider than the screen and cut the verse off at the right edge.
    <View style={{ marginBottom: 16, width: sceneW, maxWidth: "100%" }}>
      <View
        style={{ width: renderedW, maxWidth: "100%", height: renderedH, backgroundColor: SCENE_BG[timeOfDay], borderRadius: 16, overflow: "hidden", alignSelf: "center" }}
      >
        <Svg width={renderedW} height={renderedH} viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} preserveAspectRatio="xMidYMid slice">
          {/* grass — layered wash, deeper toward the bottom */}
          <Rect x={0} y={0} width={SCENE_W} height={SCENE_H} fill={grassWash} opacity={0.7} />
          <Rect x={0} y={300} width={SCENE_W} height={SCENE_H - 300} fill={grassDeep} opacity={0.45} />
          {/* moonlight pool behind the well so the scene reads at night */}
          {isNight && (
            <>
              <Ellipse cx={WELL_CX} cy={250} rx={150} ry={190} fill="#A8C4E8" opacity={0.1} />
              <Ellipse cx={WELL_CX} cy={392} rx={120} ry={42} fill="#C7D8F2" opacity={0.08} />
            </>
          )}

          {/* winding stone path from the bottom edge up to the well */}
          <Path d={`M ${WELL_CX} ${SCENE_H} C 160 445, 200 432, 186 408`} stroke={stoneEdge} strokeWidth={38} fill="none" strokeLinecap="round" opacity={0.85} />
          <Path d={`M ${WELL_CX} ${SCENE_H} C 160 445, 200 432, 186 408`} stroke={stone} strokeWidth={30} fill="none" strokeLinecap="round" />
          <Line x1={172} y1={448} x2={192} y2={444} stroke={stoneEdge} strokeWidth={2} opacity={0.5} />
          <Line x1={176} y1={428} x2={196} y2={426} stroke={stoneEdge} strokeWidth={2} opacity={0.5} />

          {/* stone patio around the well */}
          <Ellipse cx={WELL_CX} cy={392} rx={104} ry={46} fill={stone} opacity={0.55} />
          <Ellipse cx={WELL_CX} cy={392} rx={104} ry={46} fill="none" stroke={stoneEdge} strokeWidth={2.5} opacity={0.5} />

          {/* scattered pebbles */}
          {pebbles.map((p, i) => (
            <Ellipse key={i} cx={p.x} cy={p.y} rx={p.r} ry={p.r * 0.7} fill={stoneEdge} opacity={0.35} />
          ))}

          {/* grass tufts */}
          {tufts.map((t, i) => (
            <GrassTuft key={i} x={t.x} y={t.y} s={t.s} color={leaf} color2={leaf2} />
          ))}

          {/* corner trees */}
          {[
            { x: 42, y: 70, s: 1.1 },
            { x: 318, y: 62, s: 0.95 },
            { x: 54, y: 404, s: 1.0 },
            { x: 308, y: 410, s: 1.1 },
          ].map((t, i) => (
            <G key={i} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}>
              <Rect x={-4.5} y={0} width={9} height={20} rx={3.5} fill={isNight ? "#55432C" : "#6E4F26"} />
              <Circle cx={0} cy={-16} r={22} fill={leaf} opacity={0.95} />
              <Circle cx={-13} cy={-7} r={14} fill={leaf2} opacity={0.9} />
              <Circle cx={13} cy={-7} r={14} fill={leaf2} opacity={0.9} />
            </G>
          ))}

          {/* bushes flanking the well */}
          {[
            { x: 82, y: 320 },
            { x: 278, y: 320 },
          ].map((b, i) => (
            <G key={i}>
              <Circle cx={b.x} cy={b.y} r={20} fill={leaf} opacity={0.95} />
              <Circle cx={b.x - 12} cy={b.y + 6} r={13} fill={leaf2} opacity={0.9} />
              <Circle cx={b.x + 12} cy={b.y + 6} r={13} fill={leaf2} opacity={0.9} />
            </G>
          ))}

          {/* small wildflowers */}
          {flowers.map((f, i) => (
            <G key={i}>
              <Circle cx={f.x} cy={f.y} r={f.s} fill={f.c} opacity={0.95} />
              <Circle cx={f.x} cy={f.y} r={f.s * 0.4} fill={isNight ? "#3A3450" : "#FFF7ED"} opacity={0.95} />
            </G>
          ))}

          {/* wooden bench (lower left) */}
          <G>
            <Rect x={44} y={356} width={56} height={9} rx={4} fill={wood} />
            <Rect x={48} y={348} width={48} height={8} rx={4} fill={woodDark} opacity={0.55} />
            <Rect x={50} y={365} width={7} height={16} rx={2.5} fill={woodDark} />
            <Rect x={87} y={365} width={7} height={16} rx={2.5} fill={woodDark} />
          </G>

          {/* stone lantern (lower right) */}
          <G>
            {isNight && <Circle cx={306} cy={348} r={34} fill="#FBBF24" opacity={0.42} />}
            {isNight && <Ellipse cx={306} cy={386} rx={30} ry={10} fill="#FDE68A" opacity={0.14} />}
            <Rect x={302} y={366} width={8} height={18} fill={stoneEdge} opacity={0.9} />
            <Rect x={296} y={344} width={20} height={24} rx={4} fill={stone} stroke={stoneEdge} strokeWidth={2} />
            <Rect x={300} y={349} width={12} height={14} rx={2} fill={isNight ? "#FDE68A" : "#FEF3C7"} opacity={isNight ? 1 : 0.75} />
            <Polygon points="292,344 320,344 306,332" fill={stoneEdge} />
          </G>

          {/* moon glow at night */}
          {isNight && (
            <>
              <Circle cx={310} cy={52} r={48} fill="#FDE68A" opacity={0.16} />
              <Circle cx={310} cy={52} r={30} fill="#FDE68A" opacity={0.5} />
            </>
          )}

          {/* ---- the well ---- */}
          {/* posts */}
          <Rect x={116} y={150} width={15} height={182} rx={5} fill={wood} />
          <Rect x={229} y={150} width={15} height={182} rx={5} fill={wood} />
          <Line x1={120} y1={170} x2={120} y2={310} stroke={woodDark} strokeWidth={2} opacity={0.5} />
          <Line x1={233} y1={170} x2={233} y2={310} stroke={woodDark} strokeWidth={2} opacity={0.5} />
          {/* roof */}
          <Polygon points="94,158 266,158 180,84" fill={woodDark} />
          <Polygon points="108,158 252,158 180,94" fill={wood} opacity={0.9} />
          <Path d="M 120 150 C 140 132, 160 116, 180 100 C 200 116, 220 132, 240 150" stroke={woodDark} strokeWidth={2.5} fill="none" opacity={0.5} />
          <Rect x={175} y={72} width={10} height={18} rx={4} fill={woodDark} />
          {/* crossbar */}
          <Rect x={106} y={168} width={148} height={12} rx={5} fill={woodDark} />
          {/* crank handle */}
          <Circle cx={254} cy={174} r={7} fill={woodDark} />
          <Line x1={254} y1={174} x2={254} y2={190} stroke={woodDark} strokeWidth={4} strokeLinecap="round" />
          {/* stone base — individual blocks */}
          <G>
            <Rect x={114} y={322} width={44} height={32} rx={7} fill={stone} stroke={stoneEdge} strokeWidth={2} />
            <Rect x={162} y={322} width={44} height={32} rx={7} fill={stone} stroke={stoneEdge} strokeWidth={2} />
            <Rect x={210} y={322} width={36} height={32} rx={7} fill={stone} stroke={stoneEdge} strokeWidth={2} />
            <Rect x={114} y={358} width={36} height={32} rx={7} fill={stone} stroke={stoneEdge} strokeWidth={2} />
            <Rect x={154} y={358} width={44} height={32} rx={7} fill={stone} stroke={stoneEdge} strokeWidth={2} />
            <Rect x={202} y={358} width={44} height={32} rx={7} fill={stone} stroke={stoneEdge} strokeWidth={2} />
            <Ellipse cx={WELL_CX} cy={394} rx={70} ry={13} fill={stoneEdge} opacity={0.55} />
          </G>
          {/* dark water opening */}
          <Ellipse cx={WELL_CX} cy={318} rx={50} ry={15} fill={stone} stroke={stoneEdge} strokeWidth={3} />
          <Ellipse cx={WELL_CX} cy={318} rx={38} ry={11} fill={isNight ? "#10131F" : "#1E293B"} />
          <Ellipse cx={WELL_CX} cy={316} rx={24} ry={7} fill={water} opacity={isNight ? 0.65 : 0.8} />
        </Svg>

        {/* rope + bucket (animated, scaled to scene width so it tracks the crossbar) */}
        <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width: renderedW, height: renderedH }}>
          <Animated.View style={{ position: "absolute", left: (WELL_CX - 1.5) * k, top: CROSSBAR_Y * k, width: 3 * k, height: Animated.multiply(ropeHeight, k), backgroundColor: isNight ? "#8A7550" : "#A0824F" }} />
          <Animated.View style={{ position: "absolute", left: (WELL_CX - 18) * k, top: Animated.add(Animated.multiply(bucketY, k), -13 * k), width: 36 * k, height: 26 * k }}>
            <Svg width={36 * k} height={26 * k} viewBox="0 0 36 26">
              <Polygon points="4,2 32,2 28,24 8,24" fill={isNight ? "#7D6545" : "#8B5E34"} />
              <Rect x={4} y={2} width={28} height={4} fill={isNight ? "#5E4C33" : "#6B4423"} />
              <Rect x={7} y={12} width={22} height={3} fill={isNight ? "#5E4C33" : "#6B4423"} opacity={0.8} />
              <Ellipse cx={18} cy={4} rx={12} ry={3} fill={water} opacity={0.9} />
            </Svg>
          </Animated.View>
        </Animated.View>

        {/* tap target over the well (scaled) */}
        <Pressable
          onPress={startDraw}
          disabled={phase !== "idle" || drawnToday}
          style={{ position: "absolute", left: 88 * k, top: 70 * k, width: 184 * k, height: 340 * k }}
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
            <Butterfly color="#F9A8D4" seed={1} bounds={{ x0: 40, x1: 300, y0: 120, y1: 360 }} k={k} />
            <Butterfly color="#FDE68A" seed={2} bounds={{ x0: 40, x1: 300, y0: 120, y1: 360 }} k={k} />
            <Butterfly color="#BAE6FD" seed={3} bounds={{ x0: 40, x1: 300, y0: 120, y1: 360 }} k={k} />
          </>
        )}
        {isNight && <Fireflies count={9} seedOffset={11} k={k} />}
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
