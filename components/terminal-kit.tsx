// Terminal kit (v186) — the shared drawing primitives of the
// Terminal skin's artwork. The dialect is Pip-Boy: monochrome
// phosphor-green LINE ART — clean single-color strokes on the dark
// tube, thin outlines, little or no fill, a soft halo under every
// stroke (the glow pass: the same path drawn once more, wider and
// faint, beneath the true line). NOT text glyphs, NOT <pre> art —
// Jonathan's correction (2026-10-22): "think of pipboy."
//
// Every scene draws on one canvas (viewBox 0 0 200 120, sliced to
// fill its card) over the panel green. Strokes come in the tube's
// three depths — bright for the subject, mid for structure, dim for
// ground and distance — with soft green reserved for highlights.
// Motion inside scenes is stepped or nothing (TermBlink); the
// chrome's stepped dialect lives in hooks/use-skin.ts.

import { useEffect, useRef, type ReactNode } from "react";
import { Animated, View, type ViewStyle } from "react-native";
import Svg, { Circle, G, Line, Path, Polygon, Polyline, Rect } from "react-native-svg";

import { TERM_BG, TERM_DIM, TERM_MID, TERM_PANEL, TERM_PANEL_2, TERM_PHOS, TERM_SOFT } from "@/lib/skin-themes";

export { TERM_BG, TERM_DIM, TERM_MID, TERM_PANEL, TERM_PANEL_2, TERM_PHOS, TERM_SOFT };

/** The scene canvas every terminal scene draws on. */
export const TERM_VIEW_W = 200;
export const TERM_VIEW_H = 120;

/** Full-bleed terminal scene root: the panel green + one SVG canvas. */
export function TermSceneRoot({ children, bg = TERM_PANEL }: { children: ReactNode; bg?: string }) {
  return (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden", backgroundColor: bg }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${TERM_VIEW_W} ${TERM_VIEW_H}`} preserveAspectRatio="xMidYMid slice">
        {children}
      </Svg>
    </View>
  );
}

type StrokeTune = {
  /** Stroke color (one of the TERM greens). */
  c?: string;
  /** Stroke width in viewBox units. */
  w?: number;
  /** Overall opacity. */
  o?: number;
  /** Fill (default none — line art first; dim fills sparingly). */
  fill?: string;
  /** Dash pattern, for water lines and distant detail. */
  dash?: string;
};

/**
 * One stroked path with its phosphor halo: the glow copy (wider,
 * 16% opacity) under the true line. This pair is what makes a flat
 * stroke read as light on a tube.
 */
export function LP({ d, c = TERM_PHOS, w = 2, o = 1, fill = "none", dash }: StrokeTune & { d: string }) {
  return (
    <G>
      <Path d={d} stroke={c} strokeWidth={w + 2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.16 * o} />
      <Path d={d} stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill={fill} opacity={o} strokeDasharray={dash} />
    </G>
  );
}

/** A stroked circle with its halo (suns, moons, wheels, plates, heads). */
export function LC({ cx, cy, r, c = TERM_PHOS, w = 2, o = 1, fill = "none" }: StrokeTune & { cx: number; cy: number; r: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} stroke={c} strokeWidth={w + 2.6} fill="none" opacity={0.16 * o} />
      <Circle cx={cx} cy={cy} r={r} stroke={c} strokeWidth={w} fill={fill} opacity={o} />
    </G>
  );
}

/** A stroked rect with its halo (windows, screens, doors, books). */
export function LR({ x, y, width, height, rx = 0, c = TERM_PHOS, w = 2, o = 1, fill = "none" }: StrokeTune & { x: number; y: number; width: number; height: number; rx?: number }) {
  return (
    <G>
      <Rect x={x} y={y} width={width} height={height} rx={rx} stroke={c} strokeWidth={w + 2.6} fill="none" opacity={0.16 * o} />
      <Rect x={x} y={y} width={width} height={height} rx={rx} stroke={c} strokeWidth={w} fill={fill} opacity={o} />
    </G>
  );
}

/** A straight stroked segment with its halo. */
export function LL({ x1, y1, x2, y2, c = TERM_PHOS, w = 2, o = 1, dash }: StrokeTune & { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <G>
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={w + 2.6} strokeLinecap="round" opacity={0.16 * o} />
      <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={w} strokeLinecap="round" opacity={o} strokeDasharray={dash} />
    </G>
  );
}

/** A stroked polyline (open) or polygon (closed) with its halo. */
export function LPoly({ points, close = false, c = TERM_PHOS, w = 2, o = 1, fill = "none" }: StrokeTune & { points: string; close?: boolean }) {
  const Shape = close ? Polygon : Polyline;
  return (
    <G>
      <Shape points={points} stroke={c} strokeWidth={w + 2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.16 * o} />
      <Shape points={points} stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill={fill} opacity={o} />
    </G>
  );
}

/** A small filled phosphor dot (stars, eyes, seeds, lights) with a faint halo. */
export function LDot({ cx, cy, r = 1.8, c = TERM_PHOS, o = 1 }: { cx: number; cy: number; r?: number; c?: string; o?: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r * 2.1} fill={c} opacity={0.18 * o} />
      <Circle cx={cx} cy={cy} r={r} fill={c} opacity={o} />
    </G>
  );
}

/**
 * The Pip-Boy figure: a simple outline person — round head, torso,
 * arms, legs — drawn in strokes at (x, y) (the ground line) with
 * scale s. The Vault-Tec illustration stand-in wherever a scene
 * needs a human. Variants: arms raised (worship/concert), kneeling
 * (prayer), seated (study/desk work reads from the torso up).
 */
export function TFigure({
  x,
  y,
  s = 1,
  c = TERM_PHOS,
  pose = "stand",
}: {
  x: number;
  y: number;
  s?: number;
  c?: string;
  pose?: "stand" | "armsUp" | "kneel" | "sit";
}) {
  const head = <LC cx={x} cy={y - 34 * s} r={6.5 * s} c={c} w={1.9} />;
  if (pose === "kneel") {
    return (
      <G>
        {head}
        <LP d={`M ${x} ${y - 27 * s} L ${x} ${y - 12 * s}`} c={c} w={1.9} />
        <LP d={`M ${x} ${y - 22 * s} L ${x + 8 * s} ${y - 14 * s}`} c={c} w={1.9} />
        <LP d={`M ${x} ${y - 12 * s} L ${x + 9 * s} ${y - 2 * s} L ${x - 2 * s} ${y - 2 * s} L ${x - 2 * s} ${y - 10 * s}`} c={c} w={1.9} />
      </G>
    );
  }
  if (pose === "sit") {
    return (
      <G>
        {head}
        <LP d={`M ${x} ${y - 27 * s} L ${x} ${y - 10 * s} L ${x + 10 * s} ${y - 10 * s}`} c={c} w={1.9} />
        <LP d={`M ${x} ${y - 21 * s} L ${x + 9 * s} ${y - 16 * s}`} c={c} w={1.9} />
      </G>
    );
  }
  const arms =
    pose === "armsUp" ? (
      <>
        <LP d={`M ${x} ${y - 24 * s} L ${x - 9 * s} ${y - 34 * s}`} c={c} w={1.9} />
        <LP d={`M ${x} ${y - 24 * s} L ${x + 9 * s} ${y - 34 * s}`} c={c} w={1.9} />
      </>
    ) : (
      <>
        <LP d={`M ${x} ${y - 24 * s} L ${x - 8 * s} ${y - 12 * s}`} c={c} w={1.9} />
        <LP d={`M ${x} ${y - 24 * s} L ${x + 8 * s} ${y - 12 * s}`} c={c} w={1.9} />
      </>
    );
  return (
    <G>
      {head}
      <LP d={`M ${x} ${y - 27 * s} L ${x} ${y - 11 * s}`} c={c} w={1.9} />
      {arms}
      <LP d={`M ${x} ${y - 11 * s} L ${x - 6 * s} ${y}`} c={c} w={1.9} />
      <LP d={`M ${x} ${y - 11 * s} L ${x + 6 * s} ${y}`} c={c} w={1.9} />
    </G>
  );
}

/**
 * A hard on/off blink for a wrapped piece (the cursor's dialect):
 * opacity flips between frames, never fades. View-level, like the
 * pixel kit's StepBlink — for the Rest sky's stars and the boot
 * banner's block cursor.
 */
export function TermBlink({
  children,
  style,
  period = 1060,
}: {
  children: ReactNode;
  style?: ViewStyle;
  period?: number;
}) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0, duration: 1, useNativeDriver: true }),
        Animated.delay(period * 0.46),
        Animated.timing(v, { toValue: 1, duration: 1, useNativeDriver: true }),
        Animated.delay(period * 0.54),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [period, v]);
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>;
}

/** The blinking block cursor itself (mockup: 1.06s hard blink, glowing block). */
export function TermCursor({ size = 13, color = TERM_PHOS }: { size?: number; color?: string }) {
  return (
    <TermBlink period={1060}>
      <View
        style={{
          width: size * 0.62,
          height: size,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.8,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </TermBlink>
  );
}
