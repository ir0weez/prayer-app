// Stained Glass kit (v201) — the shared drawing primitives of the
// Stained Glass skin's artwork. The dialect is the cathedral window:
// every picture is built from JEWEL-TONE PANES — flat fills of
// sapphire, ruby, amber, emerald and violet — divided by dark LEAD
// came lines (#17130E), the way the approved mockup
// (schedule-mockups/stained-glass.html) rebuilds the schedule's art.
// Not a filter over the original art, not line art, not pixels:
// panes in lead.
//
// Every scene draws on one canvas (viewBox 0 0 200 120, sliced to
// fill its card) over its own deep jewel ground, with the mockup's
// CREAM LABEL PANE under the card's words (the left ~57%): in this
// material the text never sits on saturated glass. Motion is LIGHT
// THROUGH GLASS: a slow luminous shimmer drifting across the panes
// (GlassShimmer, mounted by every scene root), a gentle glow pulse
// on suns and candles — calm sine only, native driver, transform
// and opacity only. No steps, no elastic easing.

import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";
import Svg, { Circle, G, Line, Path, Polygon, Rect } from "react-native-svg";

import {
  GLASS_AMBER,
  GLASS_AMBER_INK,
  GLASS_AMBER_LT,
  GLASS_AMBER_PALE,
  GLASS_BAR,
  GLASS_CREAM,
  GLASS_CREAM_LT,
  GLASS_EMERALD,
  GLASS_FIELD_DEEP,
  GLASS_INK,
  GLASS_INK_SOFT,
  GLASS_LEAD,
  GLASS_ON_FIELD,
  GLASS_ON_FIELD_SOFT,
  GLASS_PANEL,
  GLASS_RUBY,
  GLASS_SAPPHIRE,
  GLASS_SAPPHIRE_LT,
  GLASS_VIOLET,
  GLASS_VIOLET_LT,
} from "@/lib/skin-themes";

export {
  GLASS_AMBER,
  GLASS_AMBER_INK,
  GLASS_AMBER_LT,
  GLASS_AMBER_PALE,
  GLASS_BAR,
  GLASS_CREAM,
  GLASS_CREAM_LT,
  GLASS_EMERALD,
  GLASS_FIELD_DEEP,
  GLASS_INK,
  GLASS_INK_SOFT,
  GLASS_LEAD,
  GLASS_ON_FIELD,
  GLASS_ON_FIELD_SOFT,
  GLASS_PANEL,
  GLASS_RUBY,
  GLASS_SAPPHIRE,
  GLASS_SAPPHIRE_LT,
  GLASS_VIOLET,
  GLASS_VIOLET_LT,
};

/** The scene canvas every glass scene draws on. */
export const GLASS_VIEW_W = 200;
export const GLASS_VIEW_H = 120;

/** The mockup's light band: warm white-gold, faint, drifting. */
const SHIMMER_FILL = "rgba(255,238,190,0.13)";

/**
 * The theme's signature motion: a soft luminous band drifting
 * across the panes as if the light behind the window were shifting
 * (the mockup's 8s glassShimmer). One slow sine traverse, there and
 * back, transform-only on the native driver. Mounted by the scene
 * root, so every glass scene breathes light — the theme never
 * ships static.
 */
export function GlassShimmer() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 8000, easing: Easing.bezier(0.37, 0, 0.63, 1), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 8000, easing: Easing.bezier(0.37, 0, 0.63, 1), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -30,
        bottom: -30,
        width: 84,
        backgroundColor: SHIMMER_FILL,
        transform: [
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-110, 300] }) },
          { rotate: "12deg" },
        ],
      }}
    />
  );
}

/**
 * A slow glow for a scene's light source (suns, candles, lamps):
 * opacity breathing between 0.72 and 1 on the calm sine, ~4.6s —
 * the mockup's glowPulse, slowed to the dialect's tempo.
 */
export function GlassGlow({
  children,
  style,
  period = 4600,
}: {
  children: ReactNode;
  style?: ViewStyle;
  period?: number;
}) {
  const v = useRef(new Animated.Value(0.72)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period / 2, easing: Easing.bezier(0.37, 0, 0.63, 1), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.72, duration: period / 2, easing: Easing.bezier(0.37, 0, 0.63, 1), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [period, v]);
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>;
}

/**
 * Full-bleed glass scene root: the scene's deep jewel ground, the
 * cream label pane under the card's words (a lead rule at its right
 * edge, one faint inner came line — panes are subdivided), the
 * caller's SVG canvas, and the light shimmer over everything.
 * `pane={false}` is for the rare full-bleed sky whose ground is
 * itself the deep reading surface.
 */
export function GlassSceneRoot({
  children,
  bg = GLASS_FIELD_DEEP,
  pane = true,
}: {
  children: ReactNode;
  bg?: string;
  pane?: boolean;
}) {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", backgroundColor: bg }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${GLASS_VIEW_W} ${GLASS_VIEW_H}`} preserveAspectRatio="xMidYMid slice">
        {pane ? (
          <G>
            <Rect x={0} y={0} width={116} height={GLASS_VIEW_H} fill={GLASS_CREAM} />
            <Line x1={58} y1={0} x2={58} y2={GLASS_VIEW_H} stroke={GLASS_LEAD} strokeWidth={1} opacity={0.22} />
            <Line x1={116} y1={0} x2={116} y2={GLASS_VIEW_H} stroke={GLASS_LEAD} strokeWidth={2.6} />
          </G>
        ) : null}
        {children}
      </Svg>
      <GlassShimmer />
    </View>
  );
}

type PaneTune = {
  /** Lead stroke color (default the came ink). */
  lead?: string;
  /** Lead stroke width in viewBox units. */
  w?: number;
  /** Overall opacity. */
  o?: number;
};

/** One filled pane: a path closed in lead. */
export function GP({ d, fill, lead = GLASS_LEAD, w = 2.6, o = 1 }: PaneTune & { d: string; fill: string }) {
  return <Path d={d} fill={fill} stroke={lead} strokeWidth={w} strokeLinejoin="round" opacity={o} />;
}

/** A round pane (suns, moons, plates, heads, fruit). */
export function GC({ cx, cy, r, fill, lead = GLASS_LEAD, w = 2.6, o = 1 }: PaneTune & { cx: number; cy: number; r: number; fill: string }) {
  return <Circle cx={cx} cy={cy} r={r} fill={fill} stroke={lead} strokeWidth={w} opacity={o} />;
}

/** A rectangular pane (windows, doors, books, screens, signs). */
export function GR({ x, y, width, height, rx = 2, fill, lead = GLASS_LEAD, w = 2.6, o = 1 }: PaneTune & { x: number; y: number; width: number; height: number; rx?: number; fill: string }) {
  return <Rect x={x} y={y} width={width} height={height} rx={rx} fill={fill} stroke={lead} strokeWidth={w} opacity={o} />;
}

/** A polygonal pane (roofs, mountains, sails, rays, bills). */
export function GPoly({ points, fill, lead = GLASS_LEAD, w = 2.6, o = 1 }: PaneTune & { points: string; fill: string }) {
  return <Polygon points={points} fill={fill} stroke={lead} strokeWidth={w} strokeLinejoin="round" opacity={o} />;
}

/** A bare lead or light line (rays, strings, stems, water) — no fill. */
export function GLine({ x1, y1, x2, y2, c = GLASS_LEAD, w = 2.2, o = 1, dash }: PaneTune & { x1: number; y1: number; x2: number; y2: number; c?: string; dash?: string }) {
  return <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={w} strokeLinecap="round" opacity={o} strokeDasharray={dash} />;
}

/** A small jewel dot (stars, berries, seeds, lights) with a faint halo of its own color. */
export function GDot({ cx, cy, r = 2.4, fill, o = 1 }: { cx: number; cy: number; r?: number; fill: string; o?: number }) {
  return (
    <G opacity={o}>
      <Circle cx={cx} cy={cy} r={r * 1.9} fill={fill} opacity={0.25} />
      <Circle cx={cx} cy={cy} r={r} fill={fill} stroke={GLASS_LEAD} strokeWidth={1} />
    </G>
  );
}

/**
 * The glass figure: a person built from panes — a round head pane
 * and a single body pane — in one jewel tone, at (x, y) (the ground
 * line) with scale s. The window's stand-in wherever a scene needs
 * a human. Poses mirror the terminal figure's: standing, arms
 * raised (worship/concert), kneeling (prayer), seated (study).
 */
export function GFigure({
  x,
  y,
  s = 1,
  fill = GLASS_VIOLET,
  pose = "stand",
}: {
  x: number;
  y: number;
  s?: number;
  fill?: string;
  pose?: "stand" | "armsUp" | "kneel" | "sit";
}) {
  const head = <GC cx={x} cy={y - 35 * s} r={6.8 * s} fill={GLASS_CREAM} w={2.2} />;
  if (pose === "kneel") {
    return (
      <G>
        {head}
        <GP
          d={`M ${x - 5 * s} ${y} L ${x - 4 * s} ${y - 26 * s} Q ${x} ${y - 30 * s} ${x + 4 * s} ${y - 26 * s} L ${x + 6 * s} ${y - 8 * s} L ${x + 11 * s} ${y} Z`}
          fill={fill}
          w={2.2}
        />
      </G>
    );
  }
  if (pose === "sit") {
    return (
      <G>
        {head}
        <GP
          d={`M ${x - 5 * s} ${y - 8 * s} L ${x - 4 * s} ${y - 26 * s} Q ${x} ${y - 30 * s} ${x + 4 * s} ${y - 26 * s} L ${x + 5 * s} ${y - 8 * s} L ${x + 12 * s} ${y - 8 * s} L ${x + 12 * s} ${y - 2 * s} L ${x - 5 * s} ${y - 2 * s} Z`}
          fill={fill}
          w={2.2}
        />
      </G>
    );
  }
  const arms =
    pose === "armsUp"
      ? `M ${x - 11 * s} ${y - 38 * s} L ${x - 4 * s} ${y - 24 * s} L ${x + 4 * s} ${y - 24 * s} L ${x + 11 * s} ${y - 38 * s} L ${x + 13 * s} ${y - 26 * s} L ${x + 5 * s} ${y - 12 * s} L ${x + 5 * s} ${y} L ${x - 5 * s} ${y} L ${x - 5 * s} ${y - 12 * s} L ${x - 13 * s} ${y - 26 * s} Z`
      : `M ${x - 5 * s} ${y} L ${x - 4 * s} ${y - 26 * s} Q ${x} ${y - 30 * s} ${x + 4 * s} ${y - 26 * s} L ${x + 5 * s} ${y} L ${x + 1.5 * s} ${y} L ${x} ${y - 10 * s} L ${x - 1.5 * s} ${y} Z`;
  return (
    <G>
      {head}
      <GP d={arms} fill={fill} w={2.2} />
    </G>
  );
}

/**
 * The glass checkbox (v201): the mockup's box — cream glass, a 3px
 * lead frame, and when checked the pane fills AMBER and glows,
 * with the check struck in near-black (light through amber). The
 * schedule's TermCheckbox counterpart: same call sites, same
 * control, the cathedral dialect.
 */
export function GlassCheckbox({ checked, size = 22 }: { checked: boolean; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderWidth: 3,
        borderColor: GLASS_LEAD,
        borderRadius: 5,
        backgroundColor: checked ? GLASS_AMBER : GLASS_CREAM,
        alignItems: "center",
        justifyContent: "center",
        ...(checked
          ? { shadowColor: GLASS_AMBER, shadowOpacity: 0.55, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 3 }
          : {}),
      }}
    >
      {checked ? (
        <Svg width={size * 0.78} height={size * 0.78} viewBox="0 0 24 24">
          <Path d="M4.5 12.5 L10 18 L19.5 6.5" stroke={GLASS_AMBER_INK} strokeWidth={3.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}

/**
 * The rose-window FAB (v201): the mockup's floating rose — five
 * jewel wedges (ruby, amber, emerald, sapphire, violet) in lead
 * around an amber heart, the cream "add" cross struck over it.
 * Drawn here once for the shell's add button.
 */
export function GlassRoseFab({ size = 44 }: { size?: number }) {
  const pts: Array<[number, number]> = [
    [22, 7],
    [36.3, 17.4],
    [30.8, 34.1],
    [13.2, 34.1],
    [7.7, 17.4],
  ];
  const fills = [GLASS_RUBY, GLASS_AMBER, GLASS_EMERALD, GLASS_SAPPHIRE, GLASS_VIOLET];
  return (
    <Svg width={size} height={size} viewBox="0 0 44 44">
      <Circle cx={22} cy={22} r={20.5} fill={GLASS_BAR} stroke={GLASS_LEAD} strokeWidth={2.6} />
      {pts.map(([x, y], i) => {
        const [x2, y2] = pts[(i + 1) % pts.length];
        return (
          <Polygon
            key={i}
            points={`22,22 ${x},${y} ${x2},${y2}`}
            fill={fills[i]}
            stroke={GLASS_LEAD}
            strokeWidth={1.6}
            strokeLinejoin="round"
          />
        );
      })}
      <Circle cx={22} cy={22} r={6.4} fill={GLASS_AMBER} stroke={GLASS_LEAD} strokeWidth={1.8} />
      <Rect x={20.7} y={16.8} width={2.6} height={10.4} fill={GLASS_CREAM} stroke={GLASS_LEAD} strokeWidth={0.7} />
      <Rect x={16.8} y={20.7} width={10.4} height={2.6} fill={GLASS_CREAM} stroke={GLASS_LEAD} strokeWidth={0.7} />
    </Svg>
  );
}
