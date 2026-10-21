// ---------- paper interior kit: renderers ----------
// The drawing half of the PAPER CUTOUT interiors. Where the shelved
// pixel kit painted chunky rects, this kit pins down smooth paper
// pieces: every shape is drawn TWICE — once offset in soft shadow,
// once in its color with a whisper of edge light — so the whole room
// reads as layers of colored paper in a diorama box, the language of
// the mockup Jonathan loved. One Svg per room (the Dark Forest's
// technique), figures as small Svgs of the same paper shapes.
//
// Warmth is the brief: saturated purples, warm browns, sunset stripes,
// people drawn LARGE and readable. Sine-ease motion only, native
// driver, no bounce — the house rule everywhere.

import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";
import Svg, { Circle, Defs, Ellipse, Line, Path, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";
import { GentleBob } from "@/components/activity-figures";
import { FIGURE_H, FIGURE_W, paperDinerLookFor, type PaperDinerLook } from "@/lib/paper-interior";
import type { PrayedPerson } from "@/lib/hometown";
import type { CustomPawn } from "@/lib/pawn";

/** The kit's ink — faces and fine lines, a warm near-black violet. */
export const PAPER_INK = "#2A1A33";
/** The paper shadow every piece casts on the layer beneath it. */
export const PAPER_SHADOW = "rgba(24,8,44,0.28)";
const SHADOW_DX = 0.7;
const SHADOW_DY = 1.1;

/* ------------------------------------------------------------------ */
/* PaperCanvas — one Svg of layered paper pieces. The painter's every  */
/* shape lands with its soft shadow beneath it and a faint edge light  */
/* on top: that's the whole cutout trick, and it's cheap.              */
/* ------------------------------------------------------------------ */
export type PaperOpts = {
  /** Cast the soft paper shadow (default true). */
  shadow?: boolean;
  /** Corner radius for rects (default 1.1). */
  r?: number;
  /** Edge highlight stroke (default true). */
  edge?: boolean;
  opacity?: number;
  /** Rotate the piece (degrees) around a center — crafted tilt. */
  rot?: { deg: number; cx: number; cy: number };
};

export type PaperPainter = {
  rect: (x: number, y: number, w: number, h: number, fill: string, opts?: PaperOpts) => void;
  circle: (cx: number, cy: number, r: number, fill: string, opts?: PaperOpts) => void;
  ellipse: (cx: number, cy: number, rx: number, ry: number, fill: string, opts?: PaperOpts) => void;
  path: (d: string, fill: string, opts?: PaperOpts) => void;
  poly: (points: string, fill: string, opts?: PaperOpts) => void;
  /** A plain stroked line (stitching, cords, straws) — casts no shadow. */
  line: (x1: number, y1: number, x2: number, y2: number, color: string, w?: number, dash?: string) => void;
  /** A soft radial pool of light — lantern warmth on paper. */
  glow: (cx: number, cy: number, r: number, color: string, opacity: number) => void;
};

type Geom =
  | { kind: "rect"; x: number; y: number; w: number; h: number; r: number }
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { kind: "path"; d: string }
  | { kind: "poly"; points: string };

function shapeEl(g: Geom, fill: string, extra: Record<string, unknown>, key: number): ReactNode {
  switch (g.kind) {
    case "rect":
      return <Rect key={key} x={g.x} y={g.y} width={g.w} height={g.h} rx={g.r} fill={fill} {...extra} />;
    case "circle":
      return <Circle key={key} cx={g.cx} cy={g.cy} r={g.r} fill={fill} {...extra} />;
    case "ellipse":
      return <Ellipse key={key} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} fill={fill} {...extra} />;
    case "path":
      return <Path key={key} d={g.d} fill={fill} {...extra} />;
    case "poly":
      return <Polygon key={key} points={g.points} fill={fill} {...extra} />;
  }
}

export function PaperCanvas({
  cols,
  rows,
  unit,
  draw,
  style,
}: {
  cols: number;
  rows: number;
  unit: number;
  draw: (p: PaperPainter) => void;
  style?: ViewStyle;
}) {
  const nodes: ReactNode[] = [];
  const defs: ReactNode[] = [];
  let k = 0;
  let g = 0;

  const push = (geom: Geom, fill: string, opts?: PaperOpts) => {
    const rot = opts?.rot ? `rotate(${opts.rot.deg} ${opts.rot.cx} ${opts.rot.cy})` : undefined;
    if (opts?.shadow !== false) {
      const t = `translate(${SHADOW_DX} ${SHADOW_DY})${rot ? ` ${rot}` : ""}`;
      nodes.push(shapeEl(geom, PAPER_SHADOW, { transform: t }, k++));
    }
    const extra: Record<string, unknown> = {};
    if (rot) extra.transform = rot;
    if (opts?.opacity !== undefined) extra.opacity = opts.opacity;
    if (opts?.edge !== false) {
      extra.stroke = "rgba(255,255,255,0.14)";
      extra.strokeWidth = 0.3;
    }
    nodes.push(shapeEl(geom, fill, extra, k++));
  };

  const p: PaperPainter = {
    rect: (x, y, w, h, fill, opts) => push({ kind: "rect", x, y, w, h, r: opts?.r ?? 1.1 }, fill, opts),
    circle: (cx, cy, r, fill, opts) => push({ kind: "circle", cx, cy, r }, fill, opts),
    ellipse: (cx, cy, rx, ry, fill, opts) => push({ kind: "ellipse", cx, cy, rx, ry }, fill, opts),
    path: (d, fill, opts) => push({ kind: "path", d }, fill, opts),
    poly: (points, fill, opts) => push({ kind: "poly", points }, fill, opts),
    line: (x1, y1, x2, y2, color, w = 0.35, dash) => {
      nodes.push(
        <Line
          key={k++}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={w}
          strokeLinecap="round"
          strokeDasharray={dash}
        />
      );
    },
    glow: (cx, cy, r, color, opacity) => {
      const id = `paper-glow-${g++}`;
      defs.push(
        <RadialGradient key={id} id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
          <Stop offset="55%" stopColor={color} stopOpacity={opacity * 0.45} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      );
      nodes.push(<Circle key={k++} cx={cx} cy={cy} r={r} fill={`url(#${id})`} />);
    },
  };
  draw(p);
  return (
    <Svg width={cols * unit} height={rows * unit} viewBox={`0 0 ${cols} ${rows}`} style={style}>
      {defs.length > 0 && <Defs>{defs}</Defs>}
      {nodes}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* PaperPulse — a gentle sine breathe (lantern light, sun warmth).     */
/* ------------------------------------------------------------------ */
export function PaperPulse({
  children,
  duration = 2100,
  min = 0.55,
  max = 1,
  delay = 0,
  style,
}: {
  children: ReactNode;
  duration?: number;
  min?: number;
  max?: number;
  delay?: number;
  style?: ViewStyle;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const t = setTimeout(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
    }, delay);
    return () => {
      clearTimeout(t);
      loop?.stop();
    };
  }, [v, duration, delay]);
  return (
    <Animated.View style={[{ opacity: v.interpolate({ inputRange: [0, 1], outputRange: [min, max] }) }, style]}>
      {children}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* PaperGlowDisc — a soft radial pool of warm light, for overlays.     */
/* ------------------------------------------------------------------ */
let glowDiscId = 0;

export function PaperGlowDisc({
  size,
  color = "#FFB84D",
  opacity = 0.55,
}: {
  size: number;
  color?: string;
  opacity?: number;
}) {
  const id = useRef(`paper-glow-disc-${++glowDiscId}`).current;
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
          <Stop offset="55%" stopColor={color} stopOpacity={opacity * 0.45} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={5} cy={5} r={5} fill={`url(#${id})`} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* PaperSteam — soft paper wisps curling off a hot pass: three pale    */
/* ellipses breathing on one shared sine loop.                         */
/* ------------------------------------------------------------------ */
export function PaperSteam({ unit, color = "#FFF6EA" }: { unit: number; color?: string }) {
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: 1, duration: 2300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: 0, duration: 2300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [s]);
  return (
    <View
      pointerEvents="none"
      style={{ flexDirection: "row", justifyContent: "space-between", width: unit * 11, height: unit * 5 }}
    >
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={{
            width: unit * 2.4,
            height: unit * 3.6,
            borderRadius: unit * 1.8,
            backgroundColor: color,
            opacity: s.interpolate({ inputRange: [0, 1], outputRange: i === 1 ? [0.34, 0.12] : [0.1, 0.36] }),
            transform: [
              { translateY: s.interpolate({ inputRange: [0, 1], outputRange: [unit * 1.4, -unit * 1.4] }) },
              { translateX: s.interpolate({ inputRange: [0, 1], outputRange: [0, i === 0 ? -unit : i === 2 ? unit : 0] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* The seated diner — a villager in profile at a table, facing right,  */
/* built from paper shapes: a big round head with a hair crescent, a   */
/* torso leaning in, an arm reaching to the table, thigh + shin +      */
/* shoe. People are LARGE in the paper mockup — heads the width of a   */
/* plate — so the figure spans 12 of the room's 100 units. Look comes  */
/* from the person's deterministic paper look (lib/paper-interior).    */
/* ------------------------------------------------------------------ */
export function PaperSeatedDiner({
  person,
  unit,
  flipX = false,
  delay = 0,
}: {
  person: PrayedPerson;
  unit: number;
  flipX?: boolean;
  delay?: number;
}) {
  const look: PaperDinerLook = paperDinerLookFor(person);
  const w = FIGURE_W * unit;
  const h = FIGURE_H * unit;
  const figure = (
    <Svg width={w} height={h} viewBox={`0 0 ${FIGURE_W} ${FIGURE_H}`}>
      {/* long hair falls behind everything */}
      {look.hairStyle === "long" && <Rect x={2.6} y={2.4} width={2.3} height={7.4} rx={1.15} fill={look.hair} />}
      {/* thigh, shin, shoe — the seated leg, reaching under the table */}
      <Rect x={5.0} y={10.3} width={5.6} height={1.9} rx={0.95} fill={look.pants} />
      <Rect x={9.3} y={11.4} width={1.5} height={1.9} rx={0.6} fill={look.pants} />
      <Ellipse cx={10.7} cy={13.3} rx={1.5} ry={0.6} fill="#3A2A1C" />
      {/* torso leaning toward the table */}
      <Rect x={2.9} y={6.4} width={4.9} height={4.6} rx={1.6} fill={look.shirt} />
      {/* arm: sleeve, then a skin hand landing on the table */}
      <Rect x={5.9} y={7.9} width={3.1} height={1.7} rx={0.85} fill={look.shirt} />
      <Rect x={8.7} y={8.2} width={2.2} height={1.25} rx={0.6} fill={look.skin} />
      {/* neck + head */}
      <Rect x={5.3} y={5.6} width={1.5} height={1.3} fill={look.skin} />
      {/* hair mass behind the face — offset up/back, the face circle
          laid over it leaves the crescent that reads as hair */}
      <Circle cx={5.9} cy={3.0} r={2.95} fill={look.hair} />
      {look.hairStyle === "bun" && <Circle cx={4.0} cy={0.95} r={1.1} fill={look.hair} />}
      <Circle cx={6.4} cy={3.35} r={2.8} fill={look.skin} />
      {/* face: one kind eye, a small smile, a rosy cheek */}
      <Circle cx={8.45} cy={3.4} r={0.34} fill={PAPER_INK} />
      <Path d="M8.0 4.7 Q8.65 5.15 9.2 4.65" stroke={PAPER_INK} strokeWidth={0.32} fill="none" strokeLinecap="round" />
      <Circle cx={7.8} cy={4.55} r={0.5} fill="#FF7BAC" opacity={0.5} />
    </Svg>
  );
  return (
    <GentleBob delay={delay} amount={1.2}>
      {/* warm light pooled behind the diner, like candlelight */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: unit * 1,
          left: unit * 0.5,
          width: unit * 11,
          height: unit * 12,
          borderRadius: unit * 5,
          backgroundColor: "#FF9A3D",
          opacity: 0.13,
        }}
      />
      {flipX ? <View style={{ transform: [{ scaleX: -1 }] }}>{figure}</View> : figure}
    </GentleBob>
  );
}

/* ------------------------------------------------------------------ */
/* The hero, standing — a paper figure dressed in the pawn's own       */
/* colors (body + hair), so Pebble is recognizably Pebble standing in  */
/* the open floor. No frame, no ring: just the figure and his shadow.  */
/* ------------------------------------------------------------------ */
export const PAPER_HERO_W = 11;
export const PAPER_HERO_H = 17;

export function PaperHeroFigure({ pawn, unit }: { pawn: CustomPawn; unit: number }) {
  const skin = "#EFC39A";
  const hair = pawn.hairColor || "#6B4423";
  const beard = Math.min(Math.max(pawn.beardLength ?? 0, 0), 100);
  return (
    <Svg width={PAPER_HERO_W * unit} height={PAPER_HERO_H * unit} viewBox={`0 0 ${PAPER_HERO_W} ${PAPER_HERO_H}`}>
      {/* ground shadow */}
      <Ellipse cx={5.5} cy={16.3} rx={4.2} ry={0.7} fill={PAPER_SHADOW} />
      {/* long hair panel behind the body */}
      {pawn.hairStyle === "long" && <Rect x={2.3} y={2.6} width={2.0} height={6.2} rx={1} fill={hair} />}
      {/* legs + shoes */}
      <Rect x={3.3} y={11.5} width={1.9} height={4.3} rx={0.7} fill="#3E4A5C" />
      <Rect x={5.9} y={11.5} width={1.9} height={4.3} rx={0.7} fill="#3E4A5C" />
      <Ellipse cx={4.2} cy={16.05} rx={1.25} ry={0.55} fill="#3A2A1C" />
      <Ellipse cx={6.9} cy={16.05} rx={1.25} ry={0.55} fill="#3A2A1C" />
      {/* torso + arms */}
      <Rect x={2.6} y={6.2} width={5.9} height={5.6} rx={1.8} fill={pawn.bodyColor} />
      <Rect x={1.15} y={6.6} width={1.55} height={4.6} rx={0.75} fill={pawn.bodyColor} />
      <Rect x={8.35} y={6.6} width={1.55} height={4.6} rx={0.75} fill={pawn.bodyColor} />
      <Circle cx={1.9} cy={11.5} r={0.8} fill={skin} />
      <Circle cx={9.1} cy={11.5} r={0.8} fill={skin} />
      {/* neck, hair, head */}
      <Rect x={4.8} y={5.2} width={1.5} height={1.2} fill={skin} />
      <Circle cx={5.3} cy={3.1} r={2.85} fill={hair} />
      {pawn.hairStyle === "bun" && <Circle cx={3.3} cy={1.0} r={1.05} fill={hair} />}
      <Circle cx={5.55} cy={3.4} r={2.7} fill={skin} />
      {/* the beard, at its grown length, over the chin */}
      {beard >= 25 && <Ellipse cx={5.75} cy={5.55} rx={1.85} ry={0.95 + (beard / 100) * 0.85} fill={hair} />}
      {/* face */}
      <Circle cx={4.85} cy={3.5} r={0.3} fill={PAPER_INK} />
      <Circle cx={6.55} cy={3.5} r={0.3} fill={PAPER_INK} />
      {beard < 25 && (
        <Path d="M4.9 4.6 Q5.7 5.25 6.5 4.6" stroke={PAPER_INK} strokeWidth={0.3} fill="none" strokeLinecap="round" />
      )}
    </Svg>
  );
}
