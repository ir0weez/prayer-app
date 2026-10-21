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
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";
import { GentleBob } from "@/components/activity-figures";
import { FIGURE_H, FIGURE_W, paperDinerLookFor, type PaperDinerLook } from "@/lib/paper-interior";
import type { PrayedPerson } from "@/lib/hometown";
import {
  beardGrowthFor,
  beardShapeFor,
  hairGrowthFor,
  type BeardShape,
  type CustomPawn,
  type PawnBeardStyle,
} from "@/lib/pawn";

/** The kit's ink — faces and fine lines, a warm near-black violet. */
export const PAPER_INK = "#2A1A33";
/** The paper shadow every piece casts on the layer beneath it. */
export const PAPER_SHADOW = "rgba(24,8,44,0.28)";
const SHADOW_DX = 0.7;
const SHADOW_DY = 1.1;

/* ------------------------------------------------------------------ */
/* The shared FACE kit (Riders C + D + F, 2026-10-21). Every paper    */
/* figure — hero, standing villager, seated diner — draws its hair    */
/* and beard through these helpers, so a fix lands on every face at   */
/* once.                                                              */
/*                                                                    */
/* Rider C — the "unibrow": the old caps were an arc band whose       */
/* hairline ran straight and low across the forehead, and a light     */
/* notch sat in the hair mass. The cap below has a REAL hairline: it  */
/* sits HIGH (center at cy - 0.5r), curves (temples fall lower at     */
/* the sides, a shallow widow's dip at the center), and the shine is  */
/* a small offset highlight PATCH — never a full-width arc. No       */
/* skin-colored shape is ever cut into the hair.                      */
/*                                                                    */
/* Rider D/F — beards: shape comes from lib/pawn's beardShapeFor      */
/* (style family x growth ramp), drawn as contour paths — jaw-       */
/* framing for full, chin patch + mustache for goatee, twin lobes     */
/* for mustache — and CLIPPED to the head contour (a ClipPath of the  */
/* face circle plus a tapered chin zone), so no growth stage spills  */
/* past the jaw or cheek lines.                                       */
/* ------------------------------------------------------------------ */

const n2 = (v: number): number => Math.round(v * 100) / 100;

/** The shine on hair (and on a bald head): one small offset patch,
 *  up and to the left — never an arc, never full-width. */
function hairShinePatch(cx: number, cy: number, r: number, opacity = 0.2): ReactNode {
  return (
    <Ellipse
      cx={cx - 0.36 * r}
      cy={cy - 0.6 * r}
      rx={0.3 * r}
      ry={0.12 * r}
      fill="#FFFFFF"
      opacity={opacity}
      transform={`rotate(-24 ${n2(cx - 0.36 * r)} ${n2(cy - 0.6 * r)})`}
    />
  );
}

/**
 * Front-facing: the hair CAP over the face's top, with a real
 * curved hairline: high at the center with a shallow widow's dip,
 * falling lower at the temples (the side fall), tapering into the
 * sides of the head. `thin` draws the buzz-cut version (a close ring
 * following the same curve). `sweep` shifts the dip sideways for
 * parted styles. Clipped to the hair volume so it can never band
 * across the forehead.
 */
function paperHairCapFront({
  cx,
  cy,
  r,
  color,
  thin = false,
  sweep = 0,
  clipId,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  thin?: boolean;
  sweep?: number;
  clipId: string;
}): ReactNode {
  const R = r + (thin ? 0.07 : 0.22);
  const sideY = cy - 0.1 * r;
  const dipX = cx + sweep * 0.22 * r;
  const hl = thin ? 0.16 : 0; // buzz hairline rides closer to the edge
  const d = [
    `M ${n2(cx - R)} ${n2(sideY)}`,
    `A ${n2(R)} ${n2(R)} 0 0 1 ${n2(cx + R)} ${n2(sideY)}`,
    `C ${n2(cx + 0.97 * r)} ${n2(cy - (0.26 + hl) * r)}, ${n2(cx + 0.82 * r)} ${n2(cy - (0.38 + hl) * r)}, ${n2(cx + 0.56 * r)} ${n2(cy - (0.5 + hl) * r)}`,
    `C ${n2(cx + 0.36 * r)} ${n2(cy - (0.62 + hl) * r)}, ${n2(dipX + 0.16 * r)} ${n2(cy - (0.58 + hl) * r)}, ${n2(dipX)} ${n2(cy - (0.48 + hl) * r)}`,
    `C ${n2(dipX - 0.16 * r)} ${n2(cy - (0.58 + hl) * r)}, ${n2(cx - 0.36 * r)} ${n2(cy - (0.62 + hl) * r)}, ${n2(cx - 0.56 * r)} ${n2(cy - (0.5 + hl) * r)}`,
    `C ${n2(cx - 0.82 * r)} ${n2(cy - (0.38 + hl) * r)}, ${n2(cx - 0.97 * r)} ${n2(cy - (0.26 + hl) * r)}, ${n2(cx - R)} ${n2(sideY)}`,
    "Z",
  ].join(" ");
  return (
    <G clipPath={`url(#${clipId})`}>
      <Path d={d} fill={color} stroke="rgba(42,26,51,0.25)" strokeWidth={0.22} />
      {hairShinePatch(cx, cy, r, thin ? 0.14 : 0.2)}
    </G>
  );
}

/**
 * The hair cap in profile (the seated diner, facing +x): hair covers
 * the top and back of the head; the hairline ends at the front temple
 * — it never crosses the forehead. Same shine patch, offset back.
 */
function paperHairCapProfile({
  cx,
  cy,
  r,
  color,
  clipId,
}: {
  cx: number;
  cy: number;
  r: number;
  color: string;
  clipId: string;
}): ReactNode {
  const R = r + 0.2;
  const backX = cx - 0.99 * R;
  const backY = cy + 0.08 * r;
  const templeX = cx + 0.86 * r;
  const templeY = cy - 0.4 * r;
  const d = [
    `M ${n2(backX)} ${n2(backY)}`,
    `A ${n2(R)} ${n2(R)} 0 0 1 ${n2(templeX)} ${n2(templeY)}`,
    `C ${n2(cx + 0.52 * r)} ${n2(cy - 0.64 * r)}, ${n2(cx + 0.02 * r)} ${n2(cy - 0.8 * r)}, ${n2(cx - 0.48 * r)} ${n2(cy - 0.68 * r)}`,
    `C ${n2(cx - 0.78 * r)} ${n2(cy - 0.6 * r)}, ${n2(cx - 0.97 * r)} ${n2(cy - 0.34 * r)}, ${n2(backX)} ${n2(backY)}`,
    "Z",
  ].join(" ");
  return (
    <G clipPath={`url(#${clipId})`}>
      <Path d={d} fill={color} stroke="rgba(42,26,51,0.25)" strokeWidth={0.22} />
      {hairShinePatch(cx - 0.18 * r, cy - 0.08 * r, r, 0.2)}
    </G>
  );
}

/** Clip region for hair: the hair volume itself (face circle grown by
 *  the cap's lift) — the cap can fill it but never leave it. */
function hairClipDef(id: string, cx: number, cy: number, r: number, thin = false): ReactNode {
  const R = r + (thin ? 0.09 : 0.24);
  return (
    <Defs>
      <ClipPath id={id}>
        <Circle cx={cx} cy={cy} r={R} />
      </ClipPath>
    </Defs>
  );
}

/** Clip region for a beard: the face circle plus a TAPERED chin zone
 *  below the jaw — the only place a beard may extend past the face,
 *  and only narrowing as it goes (Rider F containment). */
function beardClipDef(id: string, cx: number, cy: number, r: number, chinDropFrac: number): ReactNode {
  const chinY = cy + (0.82 + chinDropFrac) * r;
  const d = [
    `M ${n2(cx - r)} ${n2(cy)}`,
    `A ${n2(r)} ${n2(r)} 0 0 0 ${n2(cx + r)} ${n2(cy)}`,
    `L ${n2(cx + 0.44 * r)} ${n2(chinY)}`,
    `Q ${n2(cx)} ${n2(chinY + 0.14 * r)} ${n2(cx - 0.44 * r)} ${n2(chinY)}`,
    "Z",
  ].join(" ");
  return (
    <Defs>
      <ClipPath id={id}>
        <Path d={d} />
      </ClipPath>
    </Defs>
  );
}

/** Twin mustache lobes — a real mustache silhouette (two lobes with a
 *  center dip), not a plain bar. Shared by every family that wears
 *  one: mustache alone, and the goatee / full connections. */
function mustacheLobes(cx: number, cy: number, r: number, shape: BeardShape, color: string): ReactNode {
  if (shape.mustacheWidthFrac <= 0) return null;
  const w = shape.mustacheWidthFrac * r;
  const t = Math.max(0.09, shape.mustacheThickFrac) * r;
  const y = cy + 0.42 * r;
  return (
    <G opacity={shape.opacity}>
      <Ellipse cx={cx - w * 0.48} cy={y} rx={w * 0.56} ry={t * 0.62} fill={color} transform={`rotate(-11 ${n2(cx - w * 0.48)} ${n2(y)})`} />
      <Ellipse cx={cx + w * 0.48} cy={y} rx={w * 0.56} ry={t * 0.62} fill={color} transform={`rotate(11 ${n2(cx + w * 0.48)} ${n2(y)})`} />
    </G>
  );
}

/**
 * The beard, front-facing — drawn from beardShapeFor's ramp, never a
 * scaled ellipse. Full: a jaw-framing contour that follows the face
 * (cheeks rise with cheekRiseFrac, the chin tapers as it lengthens,
 * the top edge sags under the mouth with a philtrum rise, mustache
 * lobes connect at the lip). Goatee: chin patch + mustache, cheeks
 * bare. Mustache: the lobes alone. Stubble stages ride the same
 * paths at shadow opacity, so growth deepens instead of jumping.
 * `extras` renders prestige dressing (gilded band, radiant edges)
 * inside the same clip.
 */
function paperBeardFront({
  cx,
  cy,
  r,
  style,
  growth,
  color,
  clipId,
  extras,
}: {
  cx: number;
  cy: number;
  r: number;
  style: PawnBeardStyle;
  growth: number;
  color: string;
  clipId: string;
  extras?: (shape: BeardShape) => ReactNode;
}): ReactNode {
  const shape = beardShapeFor(style, growth);
  if (!shape.visible) return null;
  const chinY = cy + (0.82 + shape.chinDropFrac) * r;
  let mass: ReactNode = null;
  if (shape.family === "full") {
    const jawX = shape.jawWidthFrac * r;
    const chinW = shape.chinWidthFrac * r;
    const sideY = cy + (0.58 - 0.43 * shape.cheekRiseFrac) * r;
    const lipY = cy + 0.58 * r;
    const d = [
      `M ${n2(cx - jawX)} ${n2(sideY)}`,
      `C ${n2(cx - jawX - 0.05 * r)} ${n2(cy + 0.64 * r)}, ${n2(cx - chinW - 0.3 * r)} ${n2(chinY - 0.22 * r)}, ${n2(cx - chinW)} ${n2(chinY - 0.04 * r)}`,
      `Q ${n2(cx)} ${n2(chinY + 0.15 * r)} ${n2(cx + chinW)} ${n2(chinY - 0.04 * r)}`,
      `C ${n2(cx + chinW + 0.3 * r)} ${n2(chinY - 0.22 * r)}, ${n2(cx + jawX + 0.05 * r)} ${n2(cy + 0.64 * r)}, ${n2(cx + jawX)} ${n2(sideY)}`,
      `C ${n2(cx + jawX * 0.7)} ${n2(sideY + 0.12 * r)}, ${n2(cx + 0.44 * r)} ${n2(cy + 0.42 * r)}, ${n2(cx + 0.17 * r)} ${n2(lipY)}`,
      `Q ${n2(cx)} ${n2(lipY - 0.13 * r)} ${n2(cx - 0.17 * r)} ${n2(lipY)}`,
      `C ${n2(cx - 0.44 * r)} ${n2(cy + 0.42 * r)}, ${n2(cx - jawX * 0.7)} ${n2(sideY + 0.12 * r)}, ${n2(cx - jawX)} ${n2(sideY)}`,
      "Z",
    ].join(" ");
    mass = <Path d={d} fill={color} opacity={shape.opacity} />;
  } else if (shape.family === "goatee") {
    const patchW = shape.jawWidthFrac * r;
    const chinW = shape.chinWidthFrac * r;
    const topY = cy + 0.56 * r;
    const d = [
      `M ${n2(cx - patchW)} ${n2(topY)}`,
      `C ${n2(cx - patchW - 0.04 * r)} ${n2(cy + 0.72 * r)}, ${n2(cx - chinW - 0.14 * r)} ${n2(chinY - 0.18 * r)}, ${n2(cx - chinW)} ${n2(chinY - 0.03 * r)}`,
      `Q ${n2(cx)} ${n2(chinY + 0.13 * r)} ${n2(cx + chinW)} ${n2(chinY - 0.03 * r)}`,
      `C ${n2(cx + chinW + 0.14 * r)} ${n2(chinY - 0.18 * r)}, ${n2(cx + patchW + 0.04 * r)} ${n2(cy + 0.72 * r)}, ${n2(cx + patchW)} ${n2(topY)}`,
      `Q ${n2(cx)} ${n2(topY + 0.14 * r)} ${n2(cx - patchW)} ${n2(topY)}`,
      "Z",
    ].join(" ");
    mass = <Path d={d} fill={color} opacity={shape.opacity} />;
  }
  return (
    <>
      {beardClipDef(clipId, cx, cy, r, shape.chinDropFrac)}
      <G clipPath={`url(#${clipId})`}>
        {mass}
        {mustacheLobes(cx, cy, r, shape, color)}
        {extras?.(shape)}
      </G>
    </>
  );
}

/**
 * The beard in profile (seated diner, facing +x): the mass rides the
 * FRONT of the jaw — a contour from the jaw's underside around the
 * chin, top edge under the mouth. Goatee shrinks to the chin front
 * plus a small mustache lobe; mustache is the lobe alone. Same ramp,
 * same tapered containment clip (rotated to the profile's front).
 */
function paperBeardProfile({
  cx,
  cy,
  r,
  style,
  growth,
  color,
  clipId,
}: {
  cx: number;
  cy: number;
  r: number;
  style: PawnBeardStyle;
  growth: number;
  color: string;
  clipId: string;
}): ReactNode {
  const shape = beardShapeFor(style, growth);
  if (!shape.visible) return null;
  const chinY = cy + (0.82 + shape.chinDropFrac) * r;
  const y = cy + 0.44 * r; // mustache line, just above the mouth
  const lobe =
    shape.mustacheWidthFrac > 0 ? (
      <Ellipse
        cx={cx + 0.82 * r}
        cy={y}
        rx={shape.mustacheWidthFrac * r * 0.42}
        ry={Math.max(0.09, shape.mustacheThickFrac) * r * 0.62}
        fill={color}
        opacity={shape.opacity}
        transform={`rotate(14 ${n2(cx + 0.82 * r)} ${n2(y)})`}
      />
    ) : null;
  let mass: ReactNode = null;
  if (shape.family === "full") {
    const backX = cx - (0.15 + 0.55 * shape.cheekRiseFrac) * r;
    const d = [
      `M ${n2(backX)} ${n2(cy + 0.42 * r)}`,
      `C ${n2(cx + 0.1 * r)} ${n2(cy + 0.72 * r)}, ${n2(cx + 0.55 * r)} ${n2(chinY - 0.16 * r)}, ${n2(cx + 0.62 * r)} ${n2(chinY - 0.02 * r)}`,
      `Q ${n2(cx + 0.88 * r)} ${n2(chinY + 0.02 * r)} ${n2(cx + 0.92 * r)} ${n2(cy + 0.6 * r)}`,
      `C ${n2(cx + 0.95 * r)} ${n2(cy + 0.5 * r)}, ${n2(cx + 0.8 * r)} ${n2(cy + 0.52 * r)}, ${n2(cx + 0.62 * r)} ${n2(cy + 0.56 * r)}`,
      `Q ${n2(cx + 0.2 * r)} ${n2(cy + 0.62 * r)} ${n2(backX)} ${n2(cy + 0.42 * r)}`,
      "Z",
    ].join(" ");
    mass = <Path d={d} fill={color} opacity={shape.opacity} />;
  } else if (shape.family === "goatee") {
    const d = [
      `M ${n2(cx + 0.34 * r)} ${n2(cy + 0.56 * r)}`,
      `C ${n2(cx + 0.45 * r)} ${n2(cy + 0.78 * r)}, ${n2(cx + 0.55 * r)} ${n2(chinY - 0.14 * r)}, ${n2(cx + 0.62 * r)} ${n2(chinY - 0.02 * r)}`,
      `Q ${n2(cx + 0.9 * r)} ${n2(chinY)} ${n2(cx + 0.9 * r)} ${n2(cy + 0.62 * r)}`,
      `Q ${n2(cx + 0.6 * r)} ${n2(cy + 0.66 * r)} ${n2(cx + 0.34 * r)} ${n2(cy + 0.56 * r)}`,
      "Z",
    ].join(" ");
    mass = <Path d={d} fill={color} opacity={shape.opacity} />;
  }
  // Profile containment: face circle + tapered zone toward the front chin.
  const clipD = [
    `M ${n2(cx - r)} ${n2(cy)}`,
    `A ${n2(r)} ${n2(r)} 0 0 0 ${n2(cx + r)} ${n2(cy)}`,
    `L ${n2(cx + 0.44 * r)} ${n2(chinY)}`,
    `Q ${n2(cx)} ${n2(chinY + 0.14 * r)} ${n2(cx - 0.44 * r)} ${n2(chinY)}`,
    "Z",
  ].join(" ");
  return (
    <>
      <Defs>
        <ClipPath id={clipId}>
          <Path d={clipD} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        {mass}
        {lobe}
      </G>
    </>
  );
}

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
  /** A stroked path (water arcs, steam curls, swags) — casts no shadow. */
  stroke: (d: string, color: string, w?: number, opacity?: number) => void;
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
    stroke: (d, color, w = 0.4, opacity) => {
      nodes.push(
        <Path
          key={k++}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={w}
          strokeLinecap="round"
          opacity={opacity}
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
/* built from paper shapes: a big round head with a REAL hair cap     */
/* (a wavy hairline over the top of the face — the first pass left     */
/* only a hairline-thin crescent behind the face circle, so every     */
/* diner read bald on Jonathan's phone), a torso leaning in, an arm   */
/* reaching to the table, thigh + shin + shoe. People are LARGE in    */
/* the paper mockup — heads the width of a plate — so the figure      */
/* spans 12 of the room's 100 units. Look comes from the person's     */
/* deterministic paper look (lib/paper-interior): hair style (short / */
/* long / bun / genuinely bald — one style among four, with a shine   */
/* on the bare head), hair color, and a beard in the pawn system's    */
/* vocabulary where the look calls for one.                           */
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
  const bald = look.hairStyle === "bald";
  const figure = (
    <Svg width={w} height={h} viewBox={`0 0 ${FIGURE_W} ${FIGURE_H}`}>
      {/* long hair falls behind everything — a wide panel down the back */}
      {look.hairStyle === "long" && <Rect x={3.1} y={2.2} width={2.5} height={7.8} rx={1.2} fill={look.hair} />}
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
      {/* hair mass behind the face — a full head of hair, not a sliver */}
      {!bald && <Circle cx={5.9} cy={2.9} r={3.05} fill={look.hair} />}
      {look.hairStyle === "bun" && <Circle cx={4.05} cy={0.8} r={1.15} fill={look.hair} />}
      <Circle cx={6.4} cy={3.35} r={2.8} fill={look.skin} />
      {/* the shared profile hair cap (Rider C): the hairline ends at
          the front temple with a curved fall — never a band across
          the forehead — and the shine is a small offset patch */}
      {!bald && hairClipDef("paper-diner-hairclip", 6.4, 3.35, 2.8)}
      {!bald && paperHairCapProfile({ cx: 6.4, cy: 3.35, r: 2.8, color: look.hair, clipId: "paper-diner-hairclip" })}
      {/* bald is a style, not a missing render: a bare head with a shine */}
      {bald && <Ellipse cx={5.7} cy={1.65} rx={1.15} ry={0.5} fill="#FFFFFF" opacity={0.38} transform="rotate(-18 5.7 1.65)" />}
      {/* face: one kind eye, a small smile, a rosy cheek */}
      <Circle cx={8.45} cy={3.4} r={0.34} fill={PAPER_INK} />
      <Path d="M8.0 4.7 Q8.65 5.15 9.2 4.65" stroke={PAPER_INK} strokeWidth={0.32} fill="none" strokeLinecap="round" />
      <Circle cx={7.8} cy={4.55} r={0.5} fill="#FF7BAC" opacity={0.5} />
      {/* the beard, where the look calls for one — the shared profile
          renderer (Riders D/F): beardShapeFor's ramp in the pawn
          system's vocabulary, clipped to the jaw's front contour */}
      {paperBeardProfile({
        cx: 6.4,
        cy: 3.35,
        r: 2.8,
        style: look.beardStyle,
        growth: look.beardLength,
        color: look.hair,
        clipId: "paper-diner-beardclip",
      })}
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
/* The hero, standing — a paper figure in his normal clothes (the      */
/* gear rule: armor + weapons exist ONLY in the Dark Forest; this      */
/* figure never draws them), wearing his ACTUAL saved appearance:      */
/* the barbershop hair style in his hair color, and his beard style    */
/* at its live grown length — read from the same pawn state the rest   */
/* of the app uses (lib/pawn: pawn.hairStyle / pawn.beardStyle /       */
/* beardGrowthFor), mirroring HeroHair / HeroBeard in hero-sprite.     */
/* The first paper pass read the raw stored beardLength (length at     */
/* last trim, usually 0) and drew only a hair sliver — Pebble stood    */
/* bald and clean-shaven in his own cantina. No frame, no ring: just   */
/* the figure and his shadow.                                          */
/* ------------------------------------------------------------------ */
export const PAPER_HERO_W = 11;
export const PAPER_HERO_H = 17;

export function PaperHeroFigure({ pawn, unit }: { pawn: CustomPawn; unit: number }) {
  const skin = "#EFC39A";
  const hair = pawn.hairColor || "#6B4423";
  const style = pawn.hairStyle;
  // Live beard: style from the pawn, length grown since the last trim
  // (beardGrowthFor already returns 0 for female pawns; the gender
  // guard mirrors HeroForPawn).
  const beardLength = pawn.gender === "male" ? beardGrowthFor(pawn) : 0;
  const beardStyle = pawn.beardStyle;
  const beardShape = beardShapeFor(beardStyle, beardLength);
  const hasBeard = beardShape.visible;
  const fullBeard = hasBeard && beardShape.family === "full";
  // Hair growth rides the same weekly ramp (Rider F): as the days
  // since the last cut pass, long panels hang lower and short styles
  // grow sideburn shag — a ramp, never a jump.
  const hairG = Math.min(Math.max(hairGrowthFor(pawn), 0), 100) / 100;
  const bald = style === "bald";
  const mohawk = style === "mohawk";
  const buzz = style === "buzz";
  // The hair cap is the SHARED front cap (Rider C): a curved, high
  // hairline with a temple fall and a small offset shine patch —
  // never the old straight band across the forehead.
  const capBand = !bald && !mohawk && (
    <>
      {hairClipDef("paper-hero-hairclip", 5.5, 3.55, 2.62, buzz)}
      {paperHairCapFront({
        cx: 5.5,
        cy: 3.55,
        r: 2.62,
        color: hair,
        thin: buzz,
        sweep: style === "sidepart" ? 1 : 0,
        clipId: "paper-hero-hairclip",
      })}
    </>
  );
  return (
    <Svg width={PAPER_HERO_W * unit} height={PAPER_HERO_H * unit} viewBox={`0 0 ${PAPER_HERO_W} ${PAPER_HERO_H}`}>
      {/* ground shadow */}
      <Ellipse cx={5.5} cy={16.3} rx={4.2} ry={0.7} fill={PAPER_SHADOW} />
      {/* hair that hangs BEHIND the body: long panels, bob, ponytail,
          braid, pigtails, dreads, the glory mane */}
      {(style === "long" || style === "wavy" || style === "lob" || style === "glorymane") && (
        <>
          <Rect x={1.95} y={2.4} width={1.9} height={7.6 + hairG * 1.6} rx={0.95} fill={hair} />
          <Rect x={7.15} y={2.4} width={1.9} height={7.6 + hairG * 1.6} rx={0.95} fill={hair} />
          {style === "glorymane" && (
            <>
              <Rect x={2.5} y={3.2} width={0.5} height={6.0} fill="#FDE68A" opacity={0.85} />
              <Rect x={8.0} y={3.2} width={0.5} height={6.0} fill="#FDE68A" opacity={0.85} />
            </>
          )}
        </>
      )}
      {style === "bob" && (
        <>
          <Rect x={2.35} y={2.4} width={1.45} height={4.6} rx={0.7} fill={hair} />
          <Rect x={7.2} y={2.4} width={1.45} height={4.6} rx={0.7} fill={hair} />
        </>
      )}
      {style === "ponytail" && (
        <>
          <Circle cx={7.9} cy={1.5} r={0.95} fill={hair} />
          <Rect x={7.55} y={1.6} width={1.6} height={6.8 + hairG * 1.2} rx={0.8} fill={hair} />
        </>
      )}
      {style === "braid" &&
        [0, 1, 2, 3].map((i) => (
          <Rect key={i} x={7.7 - (i % 2) * 0.5} y={2.0 + i * 1.5} width={1.35} height={1.45} rx={0.6} fill={hair} />
        ))}
      {style === "pigtails" && (
        <>
          <Rect x={1.55} y={1.9} width={1.5} height={5.6} rx={0.75} fill={hair} />
          <Rect x={7.95} y={1.9} width={1.5} height={5.6} rx={0.75} fill={hair} />
        </>
      )}
      {style === "dreads" &&
        [2.2, 3.35, 6.8, 7.95].map((x) => (
          <Rect key={x} x={x} y={2.5} width={0.85} height={5.4} rx={0.4} fill={hair} />
        ))}
      {/* legs + shoes */}
      <Rect x={3.3} y={11.5} width={1.9} height={4.3} rx={0.7} fill="#3E4A5C" />
      <Rect x={5.9} y={11.5} width={1.9} height={4.3} rx={0.7} fill="#3E4A5C" />
      <Ellipse cx={4.2} cy={16.05} rx={1.25} ry={0.55} fill="#3A2A1C" />
      <Ellipse cx={6.9} cy={16.05} rx={1.25} ry={0.55} fill="#3A2A1C" />
      {/* torso + arms — his clothes, never armor */}
      <Rect x={2.6} y={6.2} width={5.9} height={5.6} rx={1.8} fill={pawn.bodyColor} />
      <Rect x={1.15} y={6.6} width={1.55} height={4.6} rx={0.75} fill={pawn.bodyColor} />
      <Rect x={8.35} y={6.6} width={1.55} height={4.6} rx={0.75} fill={pawn.bodyColor} />
      <Circle cx={1.9} cy={11.5} r={0.8} fill={skin} />
      <Circle cx={9.1} cy={11.5} r={0.8} fill={skin} />
      {/* neck, hair mass, head */}
      <Rect x={4.8} y={5.2} width={1.5} height={1.2} fill={skin} />
      {!bald && !mohawk && <Circle cx={5.5} cy={3.0} r={(buzz ? 2.78 : 2.95) + hairG * 0.12} fill={hair} />}
      <Circle cx={5.5} cy={3.55} r={2.62} fill={skin} />
      {/* grown-out short styles gather sideburn shag at the ears —
          the visible daily step of the hair ramp (Rider F) */}
      {!bald && !mohawk && hairG > 0.05 && (
        <>
          <Rect x={2.82} y={3.1} width={0.42} height={0.5 + hairG * 0.95} rx={0.2} fill={hair} />
          <Rect x={7.76} y={3.1} width={0.42} height={0.5 + hairG * 0.95} rx={0.2} fill={hair} />
        </>
      )}
      {/* bald is a chosen style: bare head, a little shine */}
      {bald && <Ellipse cx={4.9} cy={1.8} rx={1.05} ry={0.46} fill="#FFFFFF" opacity={0.38} transform="rotate(-18 4.9 1.8)" />}
      {capBand}
      {/* per-style crowns on the cap */}
      {style === "bun" && <Circle cx={4.9} cy={0.8} r={0.95} fill={hair} />}
      {style === "highbun" && <Circle cx={5.5} cy={0.55} r={1.05} fill={hair} />}
      {style === "curly" && (
        <>
          <Circle cx={3.75} cy={1.15} r={0.95} fill={hair} />
          <Circle cx={5.5} cy={0.8} r={1.05} fill={hair} />
          <Circle cx={7.25} cy={1.15} r={0.95} fill={hair} />
        </>
      )}
      {mohawk && <Rect x={4.8} y={0.1} width={1.4} height={3.6} rx={0.65} fill={hair} />}
      {style === "pompadour" && <Rect x={3.3} y={0.15} width={4.4} height={1.35} rx={0.65} fill={hair} transform="rotate(-7 5.5 0.8)" />}
      {/* the part is a DARK hairline stroke swept through the cap —
          never a skin-colored notch cut into the hair (Rider C) */}
      {style === "sidepart" && (
        <Path d="M4.35 0.85 Q4.1 1.6 4.3 2.3" stroke="rgba(42,26,51,0.45)" strokeWidth={0.22} fill="none" strokeLinecap="round" />
      )}
      {style === "laurel" && (
        <>
          {[3.3, 4.4, 5.5, 6.6, 7.7].map((x, i) => (
            <Circle key={x} cx={x} cy={1.35} r={0.42} fill={i % 2 ? "#D4AF37" : "#F6C453"} />
          ))}
          <Rect x={2.95} y={1.95} width={5.1} height={0.42} fill="#B8912C" />
        </>
      )}
      {style === "coronet" && (
        <>
          <Rect x={2.95} y={0.95} width={5.1} height={0.62} fill="#F6C453" />
          {[3.6, 5.15, 6.7].map((x) => (
            <Rect key={x} x={x} y={0.1} width={0.8} height={0.95} rx={0.35} fill="#FDE68A" />
          ))}
          {[4.0, 5.55, 7.1].map((x) => (
            <Circle key={x} cx={x} cy={1.26} r={0.22} fill="#FFFFFF" />
          ))}
        </>
      )}
      {/* glorymane's light lives in the mane's gold side streaks
          (drawn with the back panels) — no light bars on the cap,
          which read as stray notches (Rider C) */}
      {/* face */}
      <Circle cx={4.75} cy={3.6} r={0.3} fill={PAPER_INK} />
      <Circle cx={6.25} cy={3.6} r={0.3} fill={PAPER_INK} />
      {(!fullBeard || beardLength <= 25) && (
        <Path d="M4.85 4.75 Q5.5 5.35 6.15 4.75" stroke={PAPER_INK} strokeWidth={0.3} fill="none" strokeLinecap="round" />
      )}
      {/* the beard — the SHARED shaped renderer (Riders D/F): his
          style at its grown length via beardShapeFor's ramp, clipped
          to the head contour. The prestige families dress the same
          full shape: "heavenly" wears white + longer, "gilded" binds
          a gold band at the chin, "radiant" keeps light at the edges,
          "mustache" and "goatee" are their own silhouettes. */}
      {paperBeardFront({
        cx: 5.5,
        cy: 3.55,
        r: 2.62,
        style: beardStyle,
        growth: beardLength,
        color: beardStyle === "heavenly" ? "#E8E4DA" : hair,
        clipId: "paper-hero-beardclip",
        extras: (shape) => {
          const chinY = 3.55 + (0.82 + shape.chinDropFrac) * 2.62;
          const chinW = shape.chinWidthFrac * 2.62;
          return (
            <>
              {beardStyle === "gilded" && shape.stage !== "stubble" && (
                <Rect x={5.5 - chinW - 0.25} y={chinY - 0.55} width={(chinW + 0.25) * 2} height={0.4} rx={0.2} fill="#D4AF37" />
              )}
              {beardStyle === "radiant" && shape.family === "full" && (
                <>
                  <Rect x={5.5 - shape.jawWidthFrac * 2.62 + 0.05} y={4.4} width={0.32} height={Math.max(0.4, chinY - 4.9)} fill="#FDE68A" opacity={0.9} />
                  <Rect x={5.5 + shape.jawWidthFrac * 2.62 - 0.37} y={4.4} width={0.32} height={Math.max(0.4, chinY - 4.9)} fill="#FDE68A" opacity={0.9} />
                </>
              )}
              {beardStyle === "heavenly" && shape.family === "full" && (
                <Rect x={5.5 - chinW - 0.25} y={chinY - 0.5} width={(chinW + 0.25) * 2} height={0.38} rx={0.19} fill="#D4AF37" opacity={0.85} />
              )}
            </>
          );
        },
      })}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* The standing villager — the map-facing paper figure (Paper Town).   */
/* Front-facing, drawn ONCE here as raw SVG shapes in a 10x16 box, so   */
/* every surface draws the identical person: the map streets            */
/* (PaperStandingVillager), the Garden of Remembrance, and — wrapped    */
/* in a <G> — the SVG scenes of the River camp and the Mission Field   */
/* (PaperFigureGlyph). The look is the person's deterministic paper     */
/* look (paperDinerLookFor): the villager you meet on the street IS     */
/* the diner seated in the cantina — same skin, same hair cap (short /  */
/* long / bun / genuinely bald with its shine), same beard in the       */
/* pawn system's vocabulary, same shirt. No golden light bodies: real   */
/* paper people, characteristic, as Jonathan asked.                     */
/* ------------------------------------------------------------------ */
export const PAPER_FIGURE_W = 10;
export const PAPER_FIGURE_H = 16;

export function paperFigureShapes(look: PaperDinerLook): ReactNode {
  const bald = look.hairStyle === "bald";
  const villagerBeard = beardShapeFor(look.beardStyle, look.beardLength);
  return (
    <>
      {/* ground shadow */}
      <Ellipse cx={5} cy={15.35} rx={3.6} ry={0.55} fill={PAPER_SHADOW} />
      {/* long hair falls behind the shoulders */}
      {look.hairStyle === "long" && (
        <>
          <Rect x={1.7} y={2.3} width={1.6} height={6.2} rx={0.8} fill={look.hair} />
          <Rect x={6.7} y={2.3} width={1.6} height={6.2} rx={0.8} fill={look.hair} />
        </>
      )}
      {/* legs + shoes */}
      <Rect x={3.15} y={11.2} width={1.6} height={3.8} rx={0.6} fill={look.pants} />
      <Rect x={5.25} y={11.2} width={1.6} height={3.8} rx={0.6} fill={look.pants} />
      <Ellipse cx={3.9} cy={15.15} rx={1.1} ry={0.5} fill="#3A2A1C" />
      <Ellipse cx={6.1} cy={15.15} rx={1.1} ry={0.5} fill="#3A2A1C" />
      {/* torso + arms at the sides, in their shirt */}
      <Rect x={2.5} y={6.0} width={5.0} height={5.5} rx={1.5} fill={look.shirt} />
      <Rect x={1.25} y={6.35} width={1.3} height={4.1} rx={0.65} fill={look.shirt} />
      <Rect x={7.45} y={6.35} width={1.3} height={4.1} rx={0.65} fill={look.shirt} />
      <Circle cx={1.9} cy={10.8} r={0.62} fill={look.skin} />
      <Circle cx={8.1} cy={10.8} r={0.62} fill={look.skin} />
      {/* neck, hair mass, face */}
      <Rect x={4.4} y={5.15} width={1.2} height={1.05} fill={look.skin} />
      {!bald && <Circle cx={5} cy={2.9} r={2.78} fill={look.hair} />}
      <Circle cx={5} cy={3.32} r={2.45} fill={look.skin} />
      {/* the shared front hair cap (Rider C) — the same curved,
          high hairline the hero wears; identical clip geometry for
          every villager, so the deterministic id is shared safely */}
      {!bald && hairClipDef("paper-figure-hairclip", 5, 3.32, 2.45)}
      {!bald &&
        paperHairCapFront({ cx: 5, cy: 3.32, r: 2.45, color: look.hair, sweep: 0.35, clipId: "paper-figure-hairclip" })}
      {look.hairStyle === "bun" && <Circle cx={4.35} cy={0.72} r={0.92} fill={look.hair} />}
      {/* bald is a style, not a missing render: a bare head with a shine */}
      {bald && <Ellipse cx={4.45} cy={1.7} rx={0.95} ry={0.42} fill="#FFFFFF" opacity={0.38} transform="rotate(-18 4.45 1.7)" />}
      {/* face */}
      <Circle cx={4.32} cy={3.5} r={0.25} fill={PAPER_INK} />
      <Circle cx={5.68} cy={3.5} r={0.25} fill={PAPER_INK} />
      {!(villagerBeard.family === "full" && villagerBeard.coverage > 0.25) && (
        <Path d="M4.45 4.6 Q5 5.05 5.55 4.6" stroke={PAPER_INK} strokeWidth={0.26} fill="none" strokeLinecap="round" />
      )}
      {/* the beard, where the look calls for one — the shared shaped
          renderer (Riders D/F), in the pawn system's vocabulary */}
      {paperBeardFront({
        cx: 5,
        cy: 3.32,
        r: 2.45,
        style: look.beardStyle,
        growth: look.beardLength,
        color: look.beardStyle === "heavenly" ? "#E8E4DA" : look.hair,
        // glyph scenes hold many villagers in ONE Svg: the clip id
        // carries the shape's chin drop so different beard lengths
        // never share (and shrink) each other's clip
        clipId: `paper-figure-beardclip-${Math.round(villagerBeard.chinDropFrac * 100)}`,
      })}
    </>
  );
}

/** A villager standing in the world — an Svg of the shared shapes. */
export function PaperStandingVillager({
  look,
  width,
}: {
  look: PaperDinerLook;
  width: number;
}) {
  return (
    <Svg width={width} height={(width * PAPER_FIGURE_H) / PAPER_FIGURE_W} viewBox={`0 0 ${PAPER_FIGURE_W} ${PAPER_FIGURE_H}`}>
      {paperFigureShapes(look)}
    </Svg>
  );
}

/** The same figure as an SVG group, for the drawn scenes (River camp,
 *  Mission Field) whose worlds are one big Svg: place the figure's
 *  feet at (x, yFeet) at the given height in scene units. */
export function PaperFigureGlyph({
  look,
  x,
  yFeet,
  height,
}: {
  look: PaperDinerLook;
  x: number;
  yFeet: number;
  height: number;
}) {
  const k = height / PAPER_FIGURE_H;
  return (
    <G transform={`translate(${x - (PAPER_FIGURE_W / 2) * k} ${yFeet - height}) scale(${k})`}>
      {paperFigureShapes(look)}
    </G>
  );
}
