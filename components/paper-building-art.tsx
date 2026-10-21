// ---------- paper town: exterior renderers ----------
// Every building on the town, city and School Campus maps, drawn in
// the PAPER CUTOUT language: one PaperCanvas per building — flat
// layered shapes, each piece casting the kit's soft offset shadow,
// warm palette, paper edge light. The storybook kit (v144) is shelved
// in app/hometown.tsx, unreachable from the map; this file is the
// map's only exterior renderer (BuildingArtFX routes here).
//
// Fidelity contract (the same the interiors keep): each type keeps
// its storybook identity — palette, roof, sign medallion, storefront
// wares — and each LEVEL adds visible pieces via the ladder data in
// lib/paper-town.ts. At night the windows glow warm from the glass
// itself (v145), never from an overlay. Sine motion only, and the
// only animation is the one the FX wrapper already owned.

import { memo } from "react";
import { View } from "react-native";
import { PaperCanvas, PAPER_INK, PAPER_SHADOW, type PaperPainter } from "@/components/paper-interior";
import { paperDinerLookFor, paperHash } from "@/lib/paper-interior";
import {
  PAPER_TOWN_COLS,
  exteriorDressingFor,
  paperEmbassyFlags,
  paperGlassFor,
  paperTowerRows,
  paperTownRows,
  paperWindowLit,
  PAPER_FLAG_COLORS,
  PAPER_GLASS_LIT,
  PAPER_STORY_CONFIGS,
  PAPER_TOWER_CONFIGS,
  type PaperDisplayKind,
  type PaperSignKind,
  type PaperStoryConfig,
} from "@/lib/paper-town";

export type PaperBuildingProps = {
  type: string;
  size: number;
  level?: number;
  floors?: number;
  prayedCount?: number;
  artH?: number;
  blessed?: boolean;
  night?: boolean;
};

const GOLD = "#C9963C";
const LIT = PAPER_GLASS_LIT;

type Ctx = {
  p: PaperPainter;
  rows: number;
  /** The ground line (bottom of the canvas, in paper units). */
  ground: number;
  lv: number;
  night: boolean;
  seed: number;
  /** Bank tower height, in floors (falls back to 1). */
  floors?: number;
};

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

/** An arched window: a rect body + a half-disc crown, cross mullions. */
function archedWin(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  glass: string,
  ink: string
) {
  const { p } = c;
  p.circle(x + w / 2, y + w / 2, w / 2, ink, { shadow: false });
  p.rect(x - 0.7, y + w / 2 - 0.7, w + 1.4, h - w / 2 + 0.7, ink, { shadow: false, r: 0.8 });
  p.circle(x + w / 2, y + w / 2, w / 2 - 0.8, glass, { shadow: false });
  p.rect(x + 0.8, y + w / 2, w - 1.6, h - w / 2 - 0.6, glass, { shadow: false, r: 0.6 });
  p.line(x + w / 2, y + 0.6, x + w / 2, y + h - 0.6, ink, 0.35);
  p.line(x + 0.6, y + h * 0.55, x + w - 0.6, y + h * 0.55, ink, 0.35);
}

/** An arched door with a knob and (from L2) a little glass pane. */
function paperDoor(
  c: Ctx,
  cx: number,
  w: number,
  h: number,
  color: string,
  ink: string,
  glass?: string
) {
  const { p } = c;
  const x = cx - w / 2;
  const y = c.ground - h;
  p.path(
    `M ${x} ${c.ground} L ${x} ${y + w / 2} A ${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} L ${x + w} ${c.ground} Z`,
    color,
    { r: 0 }
  );
  if (glass) {
    p.path(
      `M ${cx - w * 0.25} ${y + h * 0.42} L ${cx - w * 0.25} ${y + w * 0.28} A ${w * 0.25} ${w * 0.25} 0 0 1 ${cx + w * 0.25} ${y + w * 0.28} L ${cx + w * 0.25} ${y + h * 0.42} Z`,
      glass,
      { shadow: false }
    );
  }
  p.circle(cx + w / 2 - 2.2, y + h * 0.58, 0.95, "#FBBF24", { shadow: false });
}

/** A flower box under a window: green box, three blooms. */
function flowerBox(c: Ctx, cx: number, y: number, w: number) {
  const { p } = c;
  p.rect(cx - w / 2, y, w, 2.6, "#2F6B31", { r: 0.7 });
  [-0.3, 0, 0.3].forEach((f, i) => {
    p.circle(cx + f * w, y + 0.4, 1.35, i % 2 ? "#F9A8D4" : "#F472B6", { shadow: false });
  });
}

/** A plant pot at a building's base: foliage over terracotta. */
function plantPot(c: Ctx, cx: number, groundY: number, bloom: boolean) {
  const { p } = c;
  p.circle(cx, groundY - 3.4, 2.9, "#3E8E41", { shadow: false });
  if (bloom) p.circle(cx, groundY - 4.1, 1.25, "#F472B6", { shadow: false });
  p.poly(
    `${cx - 2.5},${groundY - 2.6} ${cx + 2.5},${groundY - 2.6} ${cx + 1.9},${groundY} ${cx - 1.9},${groundY}`,
    "#B45309"
  );
}

/** The hanging sign medallion — a ringed disc with the type's glyph. */
function medallion(c: Ctx, cx: number, cy: number, r: number, sign: PaperSignKind, bg: string, ring: string) {
  const { p } = c;
  p.circle(cx, cy, r + 0.9, ring, { shadow: false });
  p.circle(cx, cy, r, bg);
  signGlyph(c, sign, cx, cy, r * 0.82);
}

/** A plain round window (towers of clocks, gables). */
function roundWin(c: Ctx, cx: number, cy: number, r: number, glass: string, ink: string) {
  const { p } = c;
  p.circle(cx, cy, r, ink, { shadow: false });
  p.circle(cx, cy, r - 0.8, glass, { shadow: false });
  p.line(cx, cy - r + 1, cx, cy + r - 1, ink, 0.35);
  p.line(cx - r + 1, cy, cx + r - 1, cy, ink, 0.35);
}

function starPoints(cx: number, cy: number, rO: number, rI: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? rO : rI;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

/* ------------------------------------------------------------------ */
/* Sign glyphs — drawn in a 24-unit box around (cx, cy), radius r.    */
/* ------------------------------------------------------------------ */

function signGlyph(c: Ctx, kind: PaperSignKind, cx: number, cy: number, r: number) {
  const { p } = c;
  const u = r / 12;
  const X = (dx: number) => cx + dx * u;
  const Y = (dy: number) => cy + dy * u;
  switch (kind) {
    case "star":
      p.poly(starPoints(cx, cy, r * 0.92, r * 0.42), "#FACC15");
      break;
    case "coin":
      p.circle(cx, cy, r * 0.88, "#FBBF24", { shadow: false });
      p.circle(cx, cy, r * 0.55, "#F59E0B", { shadow: false });
      p.circle(cx, cy, r * 0.26, "#FBBF24", { shadow: false });
      break;
    case "loaf":
      p.ellipse(cx, cy + r * 0.16, r * 0.86, r * 0.6, "#E8A84C");
      [-4.5, 0, 4.5].forEach((dx) => p.line(X(dx), Y(-2.6), X(dx + 2.2), Y(0.6), "#92400E", 1.5 * u + 0.2));
      break;
    case "apple":
      p.circle(cx, cy + r * 0.14, r * 0.68, "#DC2626", { shadow: false });
      p.line(cx, cy - r * 0.4, cx, cy - r * 0.85, "#7F1D1D", 1.6 * u + 0.2);
      p.ellipse(X(3.4), Y(-7.6), r * 0.3, r * 0.17, "#16A34A", { shadow: false });
      break;
    case "scissors":
      p.circle(X(-4.6), Y(-4.6), r * 0.24, "#475569", { shadow: false });
      p.circle(X(-4.6), Y(-4.6), r * 0.11, "#F8FAFC", { shadow: false });
      p.circle(X(-4.6), Y(4.6), r * 0.24, "#475569", { shadow: false });
      p.circle(X(-4.6), Y(4.6), r * 0.11, "#F8FAFC", { shadow: false });
      p.line(X(-2.8), Y(-3.2), X(7.6), Y(6.4), "#475569", 1.9 * u + 0.2);
      p.line(X(-2.8), Y(3.2), X(7.6), Y(-6.4), "#475569", 1.9 * u + 0.2);
      break;
    case "shirt":
      p.path(
        `M ${X(-3)} ${Y(-8)} L ${X(-9.5)} ${Y(-4.5)} L ${X(-6.8)} ${Y(-0.5)} L ${X(-4.6)} ${Y(-1.8)} L ${X(-4.6)} ${Y(8.6)} L ${X(4.6)} ${Y(8.6)} L ${X(4.6)} ${Y(-1.8)} L ${X(6.8)} ${Y(-0.5)} L ${X(9.5)} ${Y(-4.5)} L ${X(3)} ${Y(-8)} C ${X(3)} ${Y(-5.4)} ${X(-3)} ${Y(-5.4)} ${X(-3)} ${Y(-8)} Z`,
        "#3B82F6"
      );
      break;
    case "shield":
      p.path(
        `M ${cx} ${Y(-9)} L ${X(8)} ${Y(-5.5)} L ${X(8)} ${Y(1)} C ${X(8)} ${Y(6.5)} ${X(4.6)} ${Y(9.6)} ${cx} ${Y(11)} C ${X(-4.6)} ${Y(9.6)} ${X(-8)} ${Y(6.5)} ${X(-8)} ${Y(1)} L ${X(-8)} ${Y(-5.5)} Z`,
        "#9CA3AF"
      );
      p.circle(cx, cy, r * 0.3, "#6B7280", { shadow: false });
      break;
    case "swords":
      p.line(X(-6.5), Y(-7), X(5.5), Y(6.5), "#6B7280", 2.2 * u + 0.2);
      p.line(X(6.5), Y(-7), X(-5.5), Y(6.5), "#6B7280", 2.2 * u + 0.2);
      p.line(X(-8), Y(4.6), X(-3.8), Y(8.8), "#78350F", 2 * u + 0.2);
      p.line(X(8), Y(4.6), X(3.8), Y(8.8), "#78350F", 2 * u + 0.2);
      break;
    case "hammer":
      p.rect(X(-7.5), Y(-8.5), r * 1.15, r * 0.5, "#6B7280", { r: 0.8, rot: { deg: 32, cx, cy } });
      p.line(X(-1), Y(-2), X(6.5), Y(8.5), "#92400E", 2.6 * u + 0.25);
      break;
    case "cloche":
      p.path(`M ${X(-9)} ${Y(3.5)} A ${r * 0.78} ${r * 0.78} 0 0 1 ${X(9)} ${Y(3.5)} Z`, "#D6D3D1");
      p.line(X(-10.5), Y(7.6), X(10.5), Y(7.6), "#78716C", 1.7 * u + 0.2);
      p.circle(cx, Y(-6.4), r * 0.16, "#78716C", { shadow: false });
      break;
    case "book":
      p.poly(`${cx},${Y(-6.5)} ${X(-9.5)},${Y(-8.6)} ${X(-9.5)},${Y(6.8)} ${cx},${Y(8.8)}`, "#FFFBEB");
      p.poly(`${cx},${Y(-6.5)} ${X(9.5)},${Y(-8.6)} ${X(9.5)},${Y(6.8)} ${cx},${Y(8.8)}`, "#FFF7ED");
      p.line(cx, Y(-6.5), cx, Y(8.8), "#78350F", 1.2 * u + 0.15);
      p.line(X(-7.6), Y(-4.6), X(-2), Y(-3.4), "#B8AE99", 1 * u + 0.15);
      p.line(X(2), Y(-3.4), X(7.6), Y(-4.6), "#B8AE99", 1 * u + 0.15);
      break;
    case "joystick":
      p.line(cx, Y(1), cx, Y(7.5), "#374151", 2.2 * u + 0.2);
      p.circle(cx, Y(-4.6), r * 0.34, "#EF4444", { shadow: false });
      p.poly(`${X(-6)} ${Y(10)} ${X(-3.4)} ${Y(6.4)} ${X(3.4)} ${Y(6.4)} ${X(6)} ${Y(10)}`, "#374151");
      break;
    case "chalkboard":
      p.rect(X(-10), Y(-8), r * 1.66, r * 1.33, "#166534", { r: 0.8 });
      p.line(X(-6.8), Y(-2.8), X(1.5), Y(-2.8), "#F8FAFC", 1.5 * u + 0.15);
      p.line(X(-6.8), Y(1.8), X(5), Y(1.8), "#F8FAFC", 1.5 * u + 0.15);
      p.poly(starPoints(X(6.4), Y(-3.4), r * 0.2, r * 0.09), "#FACC15");
      break;
    case "pizza":
      p.circle(cx, cy, r * 0.88, "#FBBF24", { shadow: false });
      p.circle(cx, cy, r * 0.72, "#FDE68A", { shadow: false });
      [[-3.4, -2.6], [3.8, -0.6], [-0.6, 3.8]].forEach(([dx, dy]) =>
        p.circle(X(dx), Y(dy), r * 0.17, "#DC2626", { shadow: false })
      );
      break;
    case "palms":
      p.line(X(-2.6), Y(9.5), X(-1), Y(-1.5), "#92400E", 1.8 * u + 0.2);
      p.line(X(2.6), Y(9.5), X(1), Y(-1.5), "#92400E", 1.8 * u + 0.2);
      [-7.5, -3.4, 0, 3.4, 7.5].forEach((dx) => {
        p.stroke(
          `M ${cx} ${Y(-1.5)} Q ${X(dx * 0.55)} ${Y(-8.6)} ${X(dx)} ${Y(-4.6)}`,
          "#16A34A",
          1.5 * u + 0.15
        );
      });
      break;
    case "sun": {
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 4) * i;
        p.line(
          cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62,
          cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95,
          "#F472B6", 1.7 * u + 0.2
        );
      }
      p.circle(cx, cy, r * 0.52, "#FBBF24", { shadow: false });
      p.circle(X(-1.9), Y(-0.8), r * 0.075, "#92400E", { shadow: false });
      p.circle(X(1.9), Y(-0.8), r * 0.075, "#92400E", { shadow: false });
      p.stroke(`M ${X(-2.6)} ${Y(1.6)} A ${r * 0.26} ${r * 0.26} 0 0 0 ${X(2.6)} ${Y(1.6)}`, "#92400E", 1.1 * u + 0.15);
      break;
    }
    case "sushi":
      p.rect(X(-8.5), Y(-1), r * 1.42, r * 0.78, "#FFFFFF", { r: r * 0.3 });
      p.rect(X(-6), Y(-5.6), r * 1.0, r * 0.44, "#FB7185", { r: r * 0.2 });
      break;
    case "coffee":
      p.path(
        `M ${X(-7.5)} ${Y(-2.5)} L ${X(5.5)} ${Y(-2.5)} L ${X(4.6)} ${Y(4.6)} A ${r * 0.42} ${r * 0.42} 0 0 1 ${X(-6.4)} ${Y(4.6)} Z`,
        "#FFFFFF"
      );
      p.stroke(`M ${X(5.5)} ${Y(-1.2)} C ${X(9.6)} ${Y(-1.4)} ${X(9.6)} ${Y(3)} ${X(4.9)} ${Y(3.2)}`, "#9A3412", 1.5 * u + 0.15);
      p.stroke(`M ${X(-3.6)} ${Y(-8.8)} C ${X(-4.8)} ${Y(-6.8)} ${X(-2.4)} ${Y(-5.8)} ${X(-3.6)} ${Y(-3.8)}`, "#F39C2C", 1.4 * u + 0.15);
      p.stroke(`M ${X(0.8)} ${Y(-8.8)} C ${X(-0.4)} ${Y(-6.8)} ${X(2)} ${Y(-5.8)} ${X(0.8)} ${Y(-3.8)}`, "#F39C2C", 1.4 * u + 0.15);
      break;
    case "candle":
      p.rect(X(-2.2), Y(-0.5), r * 0.37, r * 0.92, "#FFF7ED", { r: 0.5 });
      p.ellipse(cx, Y(-4.4), r * 0.19, r * 0.32, "#F59E0B", { shadow: false });
      p.ellipse(cx, Y(-3.9), r * 0.1, r * 0.17, "#FEF3C7", { shadow: false });
      break;
    case "wheat":
      p.line(cx, Y(9.5), cx, Y(-6.5), "#B45309", 1.6 * u + 0.2);
      [0, 1, 2].forEach((i) => {
        const gy = -4.6 + i * 4.4;
        p.ellipse(X(-3.1), Y(gy), r * 0.21, r * 0.3, "#E8A84C", { shadow: false, rot: { deg: -24, cx: X(-3.1), cy: Y(gy) } });
        p.ellipse(X(3.1), Y(gy), r * 0.21, r * 0.3, "#E8A84C", { shadow: false, rot: { deg: 24, cx: X(3.1), cy: Y(gy) } });
      });
      break;
    case "goblet":
      p.path(`M ${X(-6.5)} ${Y(-8)} L ${X(6.5)} ${Y(-8)} C ${X(6.5)} ${Y(-1.5)} ${X(3.8)} ${Y(0.8)} ${cx} ${Y(0.8)} C ${X(-3.8)} ${Y(0.8)} ${X(-6.5)} ${Y(-1.5)} ${X(-6.5)} ${Y(-8)} Z`, "#E9C767");
      p.line(cx, Y(0.8), cx, Y(6.4), "#8A6D1C", 1.7 * u + 0.2);
      p.line(X(-4.6), Y(8.4), X(4.6), Y(8.4), "#8A6D1C", 1.9 * u + 0.2);
      break;
    case "note":
      p.line(X(-2.5), Y(6.5), X(-2.5), Y(-5.5), "#B45309", 1.9 * u + 0.2);
      p.line(X(7.5), Y(4), X(7.5), Y(-8), "#B45309", 1.9 * u + 0.2);
      p.line(X(-2.5), Y(-5.5), X(7.5), Y(-8), "#B45309", 2.4 * u + 0.2);
      p.ellipse(X(-5.2), Y(6.5), r * 0.28, r * 0.21, "#B45309", { shadow: false, rot: { deg: -18, cx: X(-5.2), cy: Y(6.5) } });
      p.ellipse(X(4.8), Y(4), r * 0.28, r * 0.21, "#B45309", { shadow: false, rot: { deg: -18, cx: X(4.8), cy: Y(4) } });
      break;
    case "flask":
      p.path(
        `M ${X(-1.7)} ${Y(-9)} L ${X(1.7)} ${Y(-9)} L ${X(1.7)} ${Y(-2.5)} L ${X(6.8)} ${Y(7.6)} A ${r * 0.2} ${r * 0.2} 0 0 1 ${X(4.9)} ${Y(9.4)} L ${X(-4.9)} ${Y(9.4)} A ${r * 0.2} ${r * 0.2} 0 0 1 ${X(-6.8)} ${Y(7.6)} L ${X(-1.7)} ${Y(-2.5)} Z`,
        "#CCFBF1"
      );
      p.path(`M ${X(-3.9)} ${Y(2.6)} L ${X(3.9)} ${Y(2.6)} L ${X(6.8)} ${Y(7.6)} A ${r * 0.2} ${r * 0.2} 0 0 1 ${X(4.9)} ${Y(9.4)} L ${X(-4.9)} ${Y(9.4)} A ${r * 0.2} ${r * 0.2} 0 0 1 ${X(-6.8)} ${Y(7.6)} Z`, "#2DD4BF", { shadow: false });
      p.circle(X(0.5), Y(6), r * 0.09, "#ECFDF5", { shadow: false });
      break;
    case "palette":
      p.circle(cx, cy, r * 0.88, "#D9A96B", { shadow: false });
      [[-3.8, -3.8, "#DC2626"], [3.4, -4.6, "#2563EB"], [5.2, 1.8, "#FACC15"], [-2.2, 3.4, "#059669"]].forEach(([dx, dy, col]) =>
        p.circle(X(dx as number), Y(dy as number), r * 0.16, col as string, { shadow: false })
      );
      break;
    case "basketball":
      p.circle(cx, cy, r * 0.88, "#F97316", { shadow: false });
      p.line(X(-10.4), Y(-3.4), X(10.4), Y(-3.4), "#9A3412", 1.2 * u + 0.15);
      p.line(X(-10.4), Y(3.4), X(10.4), Y(3.4), "#9A3412", 1.2 * u + 0.15);
      p.stroke(`M ${cx} ${Y(-10.4)} C ${X(-4.6)} ${Y(-4)} ${X(-4.6)} ${Y(4)} ${cx} ${Y(10.4)}`, "#9A3412", 1.2 * u + 0.15);
      p.stroke(`M ${cx} ${Y(-10.4)} C ${X(4.6)} ${Y(-4)} ${X(4.6)} ${Y(4)} ${cx} ${Y(10.4)}`, "#9A3412", 1.2 * u + 0.15);
      break;
    case "tray":
      p.rect(X(-9.5), Y(-3.5), r * 1.58, r * 0.78, "#94A3B8", { r: 0.7 });
      p.circle(X(-4.6), Y(0.4), r * 0.19, "#FDE68A", { shadow: false });
      p.circle(X(1.5), Y(0.4), r * 0.19, "#65A30D", { shadow: false });
      p.circle(X(7), Y(0.4), r * 0.19, "#DC2626", { shadow: false });
      break;
    case "saw":
      p.circle(cx, cy, r * 0.86, "#CBD5E1", { shadow: false });
      p.circle(cx, cy, r * 0.24, "#78716C", { shadow: false });
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        p.circle(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.075, "#78716C", { shadow: false });
      }
      break;
    case "frame":
      p.rect(X(-9), Y(-7.5), r * 1.5, r * 1.25, "#FFFBEB", { r: 0.5 });
      p.poly(`${X(-9)} ${Y(7.4)} ${X(-2.5)} ${Y(-1)} ${X(1.5)} ${Y(3.4)} ${X(4.6)} ${Y(0.6)} ${X(9)} ${Y(7.4)}`, "#4C9A50");
      p.circle(X(5.4), Y(-4), r * 0.15, "#FBBF24", { shadow: false });
      break;
    case "bean":
      p.ellipse(cx, cy, r * 0.58, r * 0.8, "#8A5A2B", { shadow: false });
      p.stroke(`M ${cx} ${Y(-8.6)} C ${X(-3.6)} ${Y(-4)} ${X(3.6)} ${Y(3.6)} ${cx} ${Y(8.6)}`, "#5E3D22", 1.5 * u + 0.15);
      break;
    case "flower":
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        p.circle(cx + Math.cos(a) * r * 0.42, cy + Math.sin(a) * r * 0.42, r * 0.28, "#F9A8D4", { shadow: false });
      }
      p.circle(cx, cy, r * 0.26, "#FBBF24", { shadow: false });
      break;
    case "wave":
      [[-7.5, 5], [-2.5, 9.5], [2.5, 6.5], [7.5, 8]].forEach(([dx, h]) =>
        p.rect(X(dx) - r * 0.13, cy - (h as number) * u, r * 0.26, (h as number) * 2 * u, "#4338CA", { r: 0.5, shadow: false })
      );
      break;
    case "cross":
      p.rect(cx - r * 0.13, cy - r * 0.85, r * 0.26, r * 1.7, "#E9C767", { shadow: false, r: 0.4 });
      p.rect(cx - r * 0.5, cy - r * 0.42, r * 1.0, r * 0.26, "#E9C767", { shadow: false, r: 0.4 });
      break;
    case "heart":
      p.path(
        `M ${cx} ${Y(8.6)} C ${X(-8.6)} ${Y(2.6)} ${X(-9.6)} ${Y(-1.6)} ${X(-9.6)} ${Y(-3.6)} C ${X(-9.6)} ${Y(-7.6)} ${X(-3.4)} ${Y(-9.2)} ${cx} ${Y(-4.6)} C ${X(3.4)} ${Y(-9.2)} ${X(9.6)} ${Y(-7.6)} ${X(9.6)} ${Y(-3.6)} C ${X(9.6)} ${Y(-1.6)} ${X(8.6)} ${Y(2.6)} ${cx} ${Y(8.6)} Z`,
        "#C4493B"
      );
      break;
    case "mortar":
      p.path(`M ${X(-8)} ${Y(-1.5)} L ${X(8)} ${Y(-1.5)} C ${X(8)} ${Y(4.6)} ${X(4.6)} ${Y(8)} ${cx} ${Y(8)} C ${X(-4.6)} ${Y(8)} ${X(-8)} ${Y(4.6)} ${X(-8)} ${Y(-1.5)} Z`, "#8A5A2B");
      p.line(X(-1.5), Y(-8.6), X(6.5), Y(-0.5), "#5E3D22", 2.2 * u + 0.2);
      break;
    case "envelope":
      p.rect(X(-10), Y(-7), r * 1.66, r * 1.16, "#F8FAFC", { r: 0.6 });
      p.line(X(-10), Y(-6.4), cx, Y(1.5), "#1D4ED8", 1.3 * u + 0.15);
      p.line(X(10), Y(-6.4), cx, Y(1.5), "#1D4ED8", 1.3 * u + 0.15);
      break;
    case "kettlebell":
      p.stroke(`M ${X(-4.4)} ${Y(-1.5)} A ${r * 0.42} ${r * 0.42} 0 0 1 ${X(4.4)} ${Y(-1.5)}`, "#374151", 1.8 * u + 0.2);
      p.circle(cx, Y(3.4), r * 0.44, "#374151", { shadow: false });
      p.circle(X(-1.8), Y(1.6), r * 0.11, "#6B7280", { shadow: false });
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Storefront wares — mini paper goods inside the display glass.      */
/* ------------------------------------------------------------------ */

function displayContent(c: Ctx, kind: PaperDisplayKind, x: number, y: number, w: number, h: number) {
  const { p } = c;
  const cx = x + w / 2;
  const base = y + h - 1.5;
  const cols = ["#DC2626", "#F59E0B", "#16A34A", "#2563EB", "#C9963C", "#7C2D3E"];
  switch (kind) {
    case "goods":
      [-0.28, 0, 0.28].forEach((f, i) => {
        const bw = w * 0.2;
        const bh = h * (0.42 + i * 0.13);
        p.rect(cx + f * w - bw / 2, base - bh, bw, bh, cols[i % cols.length], { r: 0.7 });
      });
      break;
    case "loaves":
      [-0.27, 0, 0.27].forEach((f) => p.ellipse(cx + f * w, base - h * 0.2, w * 0.11, h * 0.17, "#F3C96B", { shadow: false }));
      p.rect(x + w * 0.08, base - h * 0.06, w * 0.84, 1.1, "#92400E", { shadow: false, r: 0.5 });
      break;
    case "produce":
      [0, 1].forEach((r) => {
        for (let i = 0; i < 4; i++) {
          p.circle(x + w * (0.18 + i * 0.21), y + h * (0.34 + r * 0.34), Math.min(w * 0.055, 2.6), (r + i) % 2 ? cols[i % cols.length] : "#FACC15", { shadow: false });
        }
      });
      p.rect(x + w * 0.06, base - h * 0.04, w * 0.88, 1.1, "#0369A1", { shadow: false, r: 0.5 });
      break;
    case "chairs":
      [-0.22, 0.22].forEach((f) => {
        p.rect(cx + f * w - w * 0.11, base - h * 0.62, w * 0.22, h * 0.62, "#334155", { r: 1 });
        p.rect(cx + f * w - w * 0.075, base - h * 0.52, w * 0.15, h * 0.2, "#FCA5A5", { shadow: false, r: 0.6 });
      });
      break;
    case "shirt":
      signGlyph(c, "shirt", cx, y + h * 0.52, Math.min(w, h) * 0.42);
      p.line(cx, y + h * 0.06, cx, y + h * 0.2, "#92400E", 0.5);
      break;
    case "anvil":
      p.path(
        `M ${cx - w * 0.3} ${base - h * 0.55} L ${cx + w * 0.05} ${base - h * 0.55} C ${cx + w * 0.2} ${base - h * 0.55} ${cx + w * 0.3} ${base - h * 0.66} ${cx + w * 0.36} ${base - h * 0.78} L ${cx + w * 0.36} ${base - h * 0.42} C ${cx + w * 0.22} ${base - h * 0.36} ${cx + w * 0.12} ${base - h * 0.36} ${cx + w * 0.05} ${base - h * 0.36} L ${cx + w * 0.02} ${base - h * 0.18} L ${cx - w * 0.12} ${base - h * 0.18} L ${cx - w * 0.14} ${base - h * 0.36} L ${cx - w * 0.3} ${base - h * 0.36} Z`,
        "#374151"
      );
      p.rect(cx - w * 0.16, base - h * 0.18, w * 0.32, h * 0.16, "#111827", { shadow: false, r: 0.5 });
      break;
    case "tools":
      [-0.26, 0, 0.26].forEach((f) => {
        p.rect(cx + f * w - w * 0.07, base - h * 0.62, w * 0.14, h * 0.2, "#6B7280", { shadow: false, r: 0.6 });
        p.rect(cx + f * w - w * 0.028, base - h * 0.44, w * 0.056, h * 0.4, "#92400E", { shadow: false, r: 0.5 });
      });
      break;
    case "stalls":
      [-0.3, 0, 0.3].forEach((f, i) => {
        p.poly(`${cx + f * w - w * 0.13},${base - h * 0.52} ${cx + f * w + w * 0.13},${base - h * 0.52} ${cx + f * w + w * 0.09},${base - h * 0.72} ${cx + f * w - w * 0.09},${base - h * 0.72}`, cols[i * 2 % cols.length]);
        p.rect(cx + f * w - w * 0.14, base - h * 0.5, w * 0.28, h * 0.34, "#D6D3D1", { shadow: false, r: 0.6 });
      });
      break;
    case "spines": {
      const n = 6;
      for (let i = 0; i < n; i++) {
        const bw = (w * 0.8) / n;
        p.rect(x + w * 0.1 + i * bw + 0.4, base - h * (0.52 + (i % 3) * 0.11), bw - 0.8, h * (0.52 + (i % 3) * 0.11), cols[(i + 1) % cols.length], { shadow: false, r: 0.5 });
      }
      break;
    }
    case "cabinets":
      [-0.28, 0, 0.28].forEach((f, i) => {
        p.rect(cx + f * w - w * 0.11, base - h * 0.66, w * 0.22, h * 0.66, "#1E1B4B", { r: 0.7 });
        p.rect(cx + f * w - w * 0.075, base - h * 0.58, w * 0.15, h * 0.3, ["#F0ABFC", "#67E8F9", "#FDE68A"][i], { shadow: false, r: 0.5 });
        p.rect(cx + f * w - w * 0.05, base - h * 0.2, w * 0.1, h * 0.07, ["#F0ABFC", "#67E8F9", "#FDE68A"][i], { shadow: false, r: 0.4 });
      });
      break;
    case "desks":
      [-0.28, 0, 0.28].forEach((f) => {
        p.rect(cx + f * w - w * 0.13, base - h * 0.3, w * 0.26, h * 0.16, "#B45309", { shadow: false, r: 0.6 });
        p.rect(cx + f * w - w * 0.07, base - h * 0.48, w * 0.14, h * 0.1, "#F8FAFC", { shadow: false, r: 0.4 });
      });
      break;
    case "pizza":
      signGlyph(c, "pizza", cx, y + h * 0.5, Math.min(w, h) * 0.44);
      if (c.lv >= 3) {
        p.poly(`${x + 0.5},${y + 0.5} ${x + w * 0.2},${y + 0.5} ${x + 0.5},${y + h * 0.42}`, "#B91C1C");
        p.poly(`${x + w - 0.5},${y + 0.5} ${x + w * 0.8},${y + 0.5} ${x + w - 0.5},${y + h * 0.42}`, "#B91C1C");
      }
      break;
    case "burger":
      p.path(`M ${cx - w * 0.3} ${base - h * 0.58} A ${w * 0.3} ${h * 0.34} 0 0 1 ${cx + w * 0.3} ${base - h * 0.58} Z`, "#FBBF24");
      p.rect(cx - w * 0.32, base - h * 0.52, w * 0.64, h * 0.13, "#65A30D", { shadow: false, r: 0.6 });
      p.rect(cx - w * 0.3, base - h * 0.36, w * 0.6, h * 0.15, "#78350F", { shadow: false, r: 0.6 });
      p.poly(`${cx - w * 0.28},${base - h * 0.18} ${cx + w * 0.28},${base - h * 0.18} ${cx + w * 0.22},${base - h * 0.02} ${cx - w * 0.22},${base - h * 0.02}`, "#FBBF24");
      break;
    case "taco":
      p.path(`M ${cx - w * 0.32} ${base - h * 0.18} A ${w * 0.32} ${w * 0.32} 0 0 1 ${cx + w * 0.32} ${base - h * 0.18} Z`, "#FACC15");
      [[-0.18, "#65A30D"], [0, "#DC2626"], [0.18, "#65A30D"]].forEach(([f, col]) =>
        p.circle(cx + (f as number) * w, base - h * 0.52, Math.min(w * 0.075, 3), col as string, { shadow: false })
      );
      ["#F472B6", "#FB923C", "#7C3AED"].forEach((col, i) =>
        p.rect(cx - w * 0.2 + i * w * 0.15, base - h * 0.05, w * 0.11, 1.1, col, { shadow: false, r: 0.5 })
      );
      break;
    case "plates":
      [-0.24, 0.24].forEach((f, i) => {
        p.rect(cx + f * w - w * 0.17, base - h * 0.5, w * 0.34, h * 0.36, "#FFFFFF", { r: 0.8 });
        p.rect(cx + f * w - w * 0.11, base - h * 0.42, w * 0.22, h * 0.13, i ? "#F59E0B" : "#FB7185", { shadow: false, r: 0.5 });
      });
      break;
    case "stools":
      [0, 1, 2, 3].forEach((i) => {
        const sx = x + w * (0.16 + i * 0.22);
        p.circle(sx, base - h * 0.42, Math.min(w * 0.075, 3.2), "#DC2626", { shadow: false });
        p.rect(sx - 0.55, base - h * 0.38, 1.1, h * 0.32, "#78716C", { shadow: false, r: 0.4 });
      });
      p.rect(x + w * 0.06, base - h * 0.04, w * 0.88, 1.1, "#9A3412", { shadow: false, r: 0.5 });
      break;
    case "shelves":
      [0, 1].forEach((r) => {
        [-0.26, 0, 0.26].forEach((f) =>
          p.ellipse(cx + f * w, y + h * (0.3 + r * 0.36), w * 0.1, h * 0.13, "#FDE68A", { shadow: false })
        );
        p.rect(x + w * 0.08, y + h * (0.42 + r * 0.36), w * 0.84, 1, "#92400E", { shadow: false, r: 0.5 });
      });
      break;
    case "bottles":
      [-0.24, 0, 0.24].forEach((f, i) => {
        const bh = h * (0.4 + i * 0.12);
        p.rect(cx + f * w - w * 0.07, base - bh, w * 0.14, bh, ["#C084FC", "#34D399", "#FBBF24"][i], { r: 0.8 });
        p.rect(cx + f * w - w * 0.03, base - bh - h * 0.1, w * 0.06, h * 0.12, ["#C084FC", "#34D399", "#FBBF24"][i], { shadow: false, r: 0.4 });
      });
      break;
    case "bolts":
      ["#EF4444", "#F59E0B", "#10B981", "#3B82F6"].forEach((col, i) => {
        const bw = w * 0.11;
        p.rect(x + w * 0.14 + i * (bw + w * 0.05), base - h * (0.5 + (i % 2) * 0.16), bw, h * (0.5 + (i % 2) * 0.16), col, { shadow: false, r: 0.6 });
      });
      break;
    case "frames":
      [-0.26, 0.26].forEach((f, i) => {
        p.rect(cx + f * w - w * 0.19, base - h * 0.66, w * 0.38, h * 0.52, "#FFFBEB", { r: 0.5 });
        p.poly(
          `${cx + f * w - w * 0.15},${base - h * 0.2} ${cx + f * w - w * 0.04},${base - h * 0.5} ${cx + f * w + w * 0.03},${base - h * 0.32} ${cx + f * w + w * 0.08},${base - h * 0.44} ${cx + f * w + w * 0.15},${base - h * 0.2}`,
          i ? "#7FA8C9" : "#4C9A50"
        );
        p.circle(cx + f * w + (i ? -w * 0.1 : w * 0.1), base - h * 0.56, Math.min(w * 0.045, 2), "#FBBF24", { shadow: false });
      });
      break;
    case "hoop":
      p.rect(cx - w * 0.17, base - h * 0.78, w * 0.34, h * 0.62, "#FFFFFF", { r: 0.5 });
      p.rect(cx - w * 0.09, base - h * 0.66, w * 0.18, h * 0.4, "#FACC15", { shadow: false, r: 0.4 });
      p.rect(cx - w * 0.115, base - h * 0.3, w * 0.23, h * 0.09, "#EA580C", { shadow: false, r: 0.5 });
      break;
    case "bowls":
      [-0.26, 0, 0.26].forEach((f, i) => {
        p.circle(cx + f * w, base - h * 0.3, Math.min(w * 0.1, 4), ["#FDE68A", "#FCA5A5", "#BBF7D0"][i], { shadow: false });
      });
      break;
    case "sacks":
      [-0.2, 0.2].forEach((f) => {
        p.path(
          `M ${cx + f * w - w * 0.14} ${base} L ${cx + f * w - w * 0.14} ${base - h * 0.34} A ${w * 0.14} ${w * 0.1} 0 0 1 ${cx + f * w + w * 0.14} ${base - h * 0.34} L ${cx + f * w + w * 0.14} ${base} Z`,
          "#C69A63"
        );
        signGlyph(c, "bean", cx + f * w, base - h * 0.2, Math.min(w * 0.09, 3.6));
      });
      break;
    case "blooms":
      [0, 1].forEach((r) => {
        ["#F472B6", "#FACC15", "#FB923C", "#A78BFA", "#F87171"].forEach((col, i) => {
          const fx = x + w * (0.14 + i * 0.18);
          const fy = y + h * (0.3 + r * 0.36);
          p.circle(fx, fy, Math.min(w * 0.05, 2.4), (r + i) % 2 ? col : "#F9A8D4", { shadow: false });
          p.rect(fx - 0.45, fy + 1, 0.9, h * 0.16, "#16A34A", { shadow: false, r: 0.4 });
        });
      });
      break;
    case "eq":
      [0.5, 0.95, 0.65, 1.15, 0.45, 0.8].forEach((f, i) => {
        const bh = h * 0.55 * f;
        p.rect(x + w * (0.12 + i * 0.14), base - bh, w * 0.08, bh, ["#818CF8", "#F0ABFC", "#67E8F9"][i % 3], { shadow: false, r: 0.6 });
      });
      break;
  }
}

/* ------------------------------------------------------------------ */
/* The story painter — one storefront, the storybook composition      */
/* redrawn in paper: gable/flat roof, body sheet, awning, medallion   */
/* sign, display glass or the window ladder, door, base dressing.     */
/* ------------------------------------------------------------------ */

function drawStory(c: Ctx, cfg: PaperStoryConfig) {
  const { p, rows, ground, lv, night } = c;
  const d = exteriorDressingFor(lv);
  const trim = cfg.trim ?? GOLD;
  const ink = cfg.ink;
  const bodyW = cfg.w ?? 88;
  const bodyX = (PAPER_TOWN_COLS - bodyW) / 2;
  const bodyH = rows * (cfg.bodyHFrac ?? 0.5);
  const bodyY = ground - bodyH;
  const gable = cfg.roofStyle !== "flat";
  const roofH = gable ? bodyW * 0.22 : Math.max(4.5, rows * 0.05);
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  const glassFor = (j: number) =>
    paperGlassFor({ night, warm: cfg.warm, lit: lit(c.seed, j), day: cfg.glass });
  const doorAt = cfg.doorAt ?? (cfg.display ? "right" : "center");
  const doorW = cfg.doorWide ? 26 : 17;
  const doorH = bodyH * 0.48;
  const doorCx = doorAt === "right" ? bodyX + bodyW - 6 - doorW / 2 : PAPER_TOWN_COLS / 2;
  const awningH = cfg.awning ? rows * 0.055 + 3 : 0;

  // ground shadow — the sheet the building sits on
  p.ellipse(50, ground + 0.5, bodyW * 0.58, 1.7, PAPER_SHADOW, { shadow: false });
  // chimney behind the roof
  if (cfg.chimney) {
    const chW = 8;
    const chX = bodyX + bodyW * 0.78;
    p.rect(chX, bodyY - roofH * 0.55, chW, bodyH * 0.34 + roofH * 0.55, cfg.chimney);
    p.rect(chX - 1.6, bodyY - roofH * 0.55 - 2.6, chW + 3.2, 3.4, cfg.chimney, { r: 0.7 });
  }
  // roof
  if (gable) {
    p.poly(`${bodyX - 3},${bodyY + 1.5} 50,${bodyY - roofH} ${bodyX + bodyW + 3},${bodyY + 1.5}`, cfg.roof);
    if (d.gildedRoof) {
      p.poly(`${bodyX + bodyW * 0.22},${bodyY + 1.5} 50,${bodyY - roofH * 0.5} ${bodyX + bodyW * 0.78},${bodyY + 1.5}`, trim, { shadow: false, opacity: 0.45 });
    }
  } else {
    p.rect(bodyX - 2, bodyY - roofH, bodyW + 4, roofH, cfg.roof, { r: 1 });
    p.line(bodyX, bodyY - roofH + 1.2, bodyX + bodyW, bodyY - roofH + 1.2, "#FFFFFF", 0.8);
  }
  // body sheet
  p.rect(bodyX, bodyY, bodyW, bodyH, cfg.wall, { r: 1.6 });
  p.rect(bodyX + bodyW - bodyW * 0.11, bodyY + 1, bodyW * 0.11, bodyH - 1, "#000000", { shadow: false, opacity: 0.1, r: 1 });
  // striped awning over the storefront
  if (cfg.awning) {
    const stripes = 6;
    for (let i = 0; i < stripes; i++) {
      p.rect(bodyX - 2 + ((bodyW + 4) / stripes) * i, bodyY, (bodyW + 4) / stripes - 0.3, awningH, i % 2 ? cfg.awning[1] : cfg.awning[0], { shadow: false, r: 0.6 });
    }
  }
  // L3 gold trim under the eaves
  if (d.goldTrim) {
    p.rect(bodyX + 4, bodyY + awningH + 2.4, bodyW - 8, 1.6, trim, { shadow: false, r: 0.8, opacity: 0.85 });
  }
  // upper window pair
  if (cfg.upperWin) {
    [3, 4].forEach((j, i) => {
      archedWin(c, 50 - 15 + i * 19 - 5.6, bodyY + bodyH * 0.1, 11.2, bodyH * 0.3, glassFor(j), ink);
    });
  }
  // storefront: display glass, or the window ladder
  if (cfg.display) {
    const dispW = doorAt === "right" ? bodyW * 0.56 : bodyW * 0.66;
    const dispX = doorAt === "right" ? bodyX + bodyW * 0.05 : 50 - dispW / 2;
    const dispY = bodyY + bodyH * 0.18;
    const dispH = bodyH * 0.46;
    p.rect(dispX - 1.1, dispY - 1.1, dispW + 2.2, dispH + 2.2, d.goldTrim ? trim : ink, { shadow: false, r: 1.2 });
    p.rect(dispX, dispY, dispW, dispH, night && !cfg.displayGlass ? LIT : (cfg.displayGlass ?? glassFor(2)), { shadow: false, r: 0.8 });
    p.line(dispX + dispW / 2, dispY, dispX + dispW / 2, dispY + dispH, ink, 0.4);
    displayContent(c, cfg.display, dispX + 1.5, dispY + 1, dispW - 3, dispH - 2);
  } else {
    const winW = 15;
    const winH = bodyH * 0.3;
    const winY = bodyY + bodyH * 0.3;
    archedWin(c, bodyX + bodyW * 0.06, winY, winW, winH, glassFor(0), ink);
    if (d.flowerBoxes) flowerBox(c, bodyX + bodyW * 0.06 + winW / 2, winY + winH + 1.2, winW + 3);
    if (d.windows >= 2) {
      archedWin(c, bodyX + bodyW * 0.94 - winW, winY, winW, winH, glassFor(1), ink);
      if (d.flowerBoxes) flowerBox(c, bodyX + bodyW * 0.94 - winW / 2, winY + winH + 1.2, winW + 3);
    }
  }
  // L3 banners flanking the door
  if (cfg.banner && d.banners && !cfg.display) {
    [doorCx - doorW / 2 - 6.4, doorCx + doorW / 2 + 1.4].forEach((bx) => {
      p.rect(bx, bodyY + awningH + bodyH * 0.06, 5, bodyH * 0.36, cfg.banner!, { r: 0.7 });
      p.rect(bx + 1.1, bodyY + awningH + bodyH * 0.12, 2.8, 1.1, trim, { shadow: false, r: 0.5 });
      p.rect(bx + 1.1, bodyY + awningH + bodyH * 0.2, 2.8, 1.1, trim, { shadow: false, r: 0.5 });
    });
  }
  // the door
  paperDoor(c, doorCx, doorW, doorH, cfg.door ?? "#6B4423", d.goldTrim ? trim : ink, d.doorGlass ? glassFor(9) : undefined);
  // L3 stone step
  if (d.stoneStep) {
    p.rect(doorCx - (doorW + 8) / 2, ground - 1.6, doorW + 8, 2.2, "#D6CDBB", { r: 0.7 });
  }
  // L2+ plant pots at the base corners
  if (d.pots && !cfg.front) {
    plantPot(c, bodyX + bodyW * 0.05, ground, lv >= 3);
    plantPot(c, bodyX + bodyW * 0.95, ground, lv >= 3);
  }
  // front dressing, per type
  if (cfg.front) drawStoryFront(c, cfg, bodyX, bodyY, bodyW, bodyH, doorCx, awningH);
  // the sign medallion rides last — identity over everything
  if (cfg.sign) {
    const medR = 9.5;
    const atCorner = !!cfg.upperWin;
    medallion(
      c,
      atCorner ? bodyX + bodyW * 0.1 + medR : 50,
      atCorner ? bodyY + rows * 0.045 : bodyY + 1.5,
      medR,
      cfg.sign,
      cfg.signBg ?? "#FFF8E7",
      d.goldTrim ? trim : ink
    );
  }
}

function drawStoryFront(
  c: Ctx,
  cfg: PaperStoryConfig,
  bodyX: number,
  bodyY: number,
  bodyW: number,
  bodyH: number,
  doorCx: number,
  awningH: number
) {
  const { p, ground, lv, rows } = c;
  switch (cfg.front) {
    case "barber-pole": {
      const poleW = 6.5;
      const poleH = rows * 0.3;
      const px = bodyX + bodyW - poleW - 1;
      p.rect(px, ground - poleH, poleW, poleH, "#FFFFFF", { r: poleW / 2 });
      ["#EF4444", "#FFFFFF", "#3B82F6", "#FFFFFF"].forEach((col, i) => {
        p.rect(px + 0.7, ground - poleH + 2.4 + i * ((poleH - 4.8) / 4), poleW - 1.4, (poleH - 4.8) / 4 - 0.8, col, { shadow: false, r: 0.6 });
      });
      p.circle(px + poleW / 2, ground - poleH - 1.6, 2.1, "#94A3B8", { shadow: false });
      break;
    }
    case "crates":
      if (lv >= 2) {
        [bodyX + bodyW * 0.03, bodyX + bodyW * 0.86].forEach((bx, i) => {
          p.rect(bx, ground - rows * 0.068, bodyW * 0.11, rows * 0.068, "#C69A63", { r: 0.7 });
          [0.25, 0.5, 0.75].forEach((f) =>
            p.circle(bx + bodyW * 0.11 * f, ground - rows * 0.052, 1.7, i ? "#F59E0B" : "#DC2626", { shadow: false })
          );
        });
      }
      break;
    case "logs":
      if (lv >= 2) {
        const lx = bodyX + bodyW * 0.8;
        [0, 1].forEach((i) => {
          const lw = bodyW * (0.2 - i * 0.03);
          p.rect(lx, ground - 3.4 - i * 3, lw, 3.1, "#8A5A2B", { r: 1.5 });
          p.circle(lx + lw - 1.2, ground - 2 - i * 3, 1.15, "#E3C08D", { shadow: false });
        });
      }
      break;
    case "sushi": {
      // noren curtain over the door (L2+)
      if (lv >= 2) {
        [0, 1, 2].forEach((i) => {
          p.rect(doorCx - 11 + i * 7.6, ground - bodyH * 0.48 - rows * 0.028, 6.9, rows * 0.068, "#1E3A5F", { shadow: false, r: 0.6 });
          p.circle(doorCx - 11 + i * 7.6 + 3.45, ground - bodyH * 0.48 - rows * 0.028 + rows * 0.034, 1.5, "#F8FAFC", { shadow: false });
        });
      }
      // paper lanterns (L3)
      if (lv >= 3) {
        [bodyX + bodyW * 0.09, bodyX + bodyW * 0.91].forEach((lx) => {
          p.line(lx, bodyY + bodyH * 0.06, lx, bodyY + bodyH * 0.16, "#1F2937", 0.4);
          p.ellipse(lx, bodyY + bodyH * 0.22, 3.1, 3.9, "#F87171");
        });
      }
      break;
    }
    case "string-lights":
      if (lv >= 3) {
        [0, 1, 2, 3, 4].forEach((i) => {
          p.circle(bodyX + bodyW * (0.2 + i * 0.15), bodyY + bodyH * 0.98 - rows * 0.3, 1.9, "#FDE68A", { shadow: false });
        });
      }
      break;
    case "columns":
      if (lv >= 2) {
        [0.08, 0.36, 0.64, 0.92].forEach((f) => {
          p.rect(bodyX + bodyW * f - 2.4, bodyY + 2, 4.8, bodyH - 2, "#FFFBEB", { r: 0.8 });
        });
      }
      break;
    case "flag":
      if (lv >= 3) {
        const fx = bodyX + bodyW * 0.82;
        p.rect(fx, bodyY - rows * 0.14, 1.4, rows * 0.14, "#78716C", { shadow: false, r: 0.5 });
        p.poly(`${fx + 1.4},${bodyY - rows * 0.14} ${fx + 11},${bodyY - rows * 0.115} ${fx + 1.4},${bodyY - rows * 0.085}`, "#16A34A");
      }
      break;
    case "dome":
      if (lv >= 3) {
        const dw = bodyW * 0.36;
        p.path(
          `M ${50 - dw / 2} ${bodyY - 1} A ${dw / 2} ${dw / 2} 0 0 1 ${50 + dw / 2} ${bodyY - 1} Z`,
          "#99F6E4",
          { opacity: 0.85 }
        );
      }
      break;
    case "skylight":
      p.rect(50 - bodyW * 0.13, bodyY - rows * 0.045 - 1, bodyW * 0.26, rows * 0.04, "#BAE6FD", { r: 0.6 });
      break;
  }
}

/* ------------------------------------------------------------------ */
/* Towers — stacked paper sheets: front sheet, darker side flap,      */
/* roof cap, window grid lit by the shared pattern.                   */
/* ------------------------------------------------------------------ */

function towerWindows(c: Ctx, x: number, top: number, w: number, h: number, rowsN: number, cols: number, winOff: string, seedBase: number) {
  const { p, lv, night } = c;
  const cellW = w / cols;
  const cellH = h / Math.max(rowsN, 1);
  for (let r = 0; r < rowsN; r++) {
    for (let col = 0; col < cols; col++) {
      const litWin = paperWindowLit(night, r + seedBase, col, lv);
      p.rect(
        x + col * cellW + cellW * 0.22,
        top + r * cellH + cellH * 0.24,
        cellW * 0.56,
        cellH * 0.5,
        litWin ? LIT : winOff,
        { shadow: false, r: 0.7, opacity: litWin ? 1 : 0.6 }
      );
    }
  }
}

function drawTowerBody(c: Ctx, x: number, w: number, top: number, front: string, side: string, roof: string) {
  const { p, ground } = c;
  const sideW = Math.max(4.5, w * 0.11);
  const bodyH = ground - top;
  const roofH = Math.max(5, bodyH * 0.05);
  p.ellipse(x + w / 2, ground + 0.5, w * 0.62, 1.7, PAPER_SHADOW, { shadow: false });
  p.rect(x - 2.5, top, w + 5, roofH, roof, { r: 1 });
  p.line(x - 1, top + 1.1, x + w + 1, top + 1.1, "#FFFFFF", 0.7);
  p.rect(x, top + roofH - 0.5, w - sideW, bodyH - roofH + 0.5, front, { r: 1.2 });
  p.rect(x + w - sideW, top + roofH - 0.5, sideW, bodyH - roofH + 0.5, side, { r: 1.2 });
  p.line(x + w - sideW + 0.9, top + roofH + 2, x + w - sideW + 0.9, ground - 2, "#FFFFFF", 0.6);
  return { frontX: x, frontW: w - sideW, frontTop: top + roofH + bodyH * 0.05, frontH: bodyH * 0.9, sideW };
}

function drawTower(c: Ctx, type: string) {
  const { p, rows, ground, lv, night } = c;
  const cfg = PAPER_TOWER_CONFIGS[type];
  if (!cfg) return;
  const w = cfg.w;
  const x = (PAPER_TOWN_COLS - w) / 2;
  const top = rows * 0.03;
  const rowsN = paperTowerRows(type, lv, c.floors ?? 1);

  // cap dressing that rises above the roof line
  if (cfg.cap === "crest") {
    const crestW = w * 0.6;
    [0.06, 0.22, 0.38, 0.54, 0.7, 0.86].forEach((f, i) => {
      p.rect(50 - crestW / 2 + f * crestW, top - rows * 0.085 + (i % 2) * rows * 0.02, crestW * 0.09, rows * 0.085 - (i % 2) * rows * 0.02, GOLD, { shadow: false, r: 0.5 });
    });
    p.rect(50 - crestW / 2 - 2, top - rows * 0.012, crestW + 4, rows * 0.016, "#8A6D1C", { shadow: false, r: 0.6 });
  }
  if (cfg.cap === "flags") {
    const n = paperEmbassyFlags(lv);
    const span = w * 0.8;
    for (let i = 0; i < n; i++) {
      const fx = 50 - span / 2 + (span / Math.max(n - 1, 1)) * i;
      p.line(fx, top + 1, fx, top - rows * 0.17, "#5E5646", 0.55);
      p.poly(`${fx},${top - rows * 0.17} ${fx + 9},${top - rows * 0.145 + i * 0.8} ${fx},${top - rows * 0.115 + i * 0.8}`, PAPER_FLAG_COLORS[i % PAPER_FLAG_COLORS.length], { shadow: false });
    }
  }
  const body = drawTowerBody(c, x, w, top, cfg.front, cfg.side, cfg.roof);
  if (cfg.cap === "awning") {
    [0, 1, 2, 3].forEach((i) => {
      p.rect(x + (w / 4) * i + 0.4, top + Math.max(5, (ground - top) * 0.05) + 0.6, w / 4 - 0.8, rows * 0.045, i % 2 ? "#FFFFFF" : "#EF4444", { shadow: false, r: 0.5 });
    });
  }
  if (cfg.cap === "hotel-sign") {
    const bw = w * 0.44;
    p.rect(50 - bw / 2, top + (ground - top) * 0.07, bw, rows * 0.1, "#FEF3C7", { r: 1 });
    // a drawn H: two posts and a bar — a sign, not a letterform dependency
    p.rect(50 - bw * 0.16, top + (ground - top) * 0.07 + rows * 0.02, 1.8, rows * 0.06, "#92400E", { shadow: false, r: 0.5 });
    p.rect(50 + bw * 0.16 - 1.8, top + (ground - top) * 0.07 + rows * 0.02, 1.8, rows * 0.06, "#92400E", { shadow: false, r: 0.5 });
    p.rect(50 - bw * 0.16, top + (ground - top) * 0.07 + rows * 0.045, bw * 0.32, 1.6, "#92400E", { shadow: false, r: 0.5 });
  }
  const winTop = cfg.cap === "hotel-sign" ? top + (ground - top) * 0.2 : body.frontTop;
  towerWindows(c, body.frontX + body.frontW * 0.06, winTop, body.frontW * 0.88, body.frontH * 0.82, rowsN, cfg.cols, cfg.winOff, c.seed);
  // embassy: the state door; grand library L3: brass doors
  if (type === "embassy") {
    paperDoor(c, 50, 22, (ground - top) * 0.2, "#4A4238", lv >= 3 ? GOLD : "#2E2A24");
  }
  if (type === "grand-library" && lv >= 3) {
    [-6.5, 6.5].forEach((dx) => {
      p.path(
        `M ${50 + dx - 4.6} ${ground} L ${50 + dx - 4.6} ${ground - (ground - top) * 0.14} A 4.6 4.6 0 0 1 ${50 + dx + 4.6} ${ground - (ground - top) * 0.14} L ${50 + dx + 4.6} ${ground} Z`,
        "#8A6D1C",
        { shadow: false }
      );
    });
  }
  void night;
}

/* ------------------------------------------------------------------ */
/* Special scenes — the hand-composed buildings, redrawn in paper.   */
/* Each mirrors its storybook composition: same silhouette story,     */
/* same level story, flat paper pieces.                               */
/* ------------------------------------------------------------------ */

function tinyFigure(c: Ctx, x: number, feetY: number, hgt: number, look: ReturnType<typeof paperDinerLookFor>) {
  const { p } = c;
  const k = hgt / 16;
  const top = feetY - hgt;
  const X = (dx: number) => x + (dx - 5) * k;
  const Y = (dy: number) => top + dy * k;
  const g = look.beardStyle === "none" ? 0 : Math.min(Math.max(look.beardLength, 0), 100) / 100;
  p.ellipse(x, feetY - 0.2, 3.4 * k, 0.5 * k, PAPER_SHADOW, { shadow: false });
  if (look.hairStyle === "long") {
    p.rect(X(1.7), Y(2.3), 1.6 * k, 6.2 * k, look.hair, { shadow: false, r: 0.8 * k });
    p.rect(X(6.7), Y(2.3), 1.6 * k, 6.2 * k, look.hair, { shadow: false, r: 0.8 * k });
  }
  p.rect(X(3.15), Y(11.2), 1.6 * k, 3.8 * k, look.pants, { shadow: false, r: 0.6 * k });
  p.rect(X(5.25), Y(11.2), 1.6 * k, 3.8 * k, look.pants, { shadow: false, r: 0.6 * k });
  p.rect(X(2.5), Y(6), 5 * k, 5.5 * k, look.shirt, { shadow: false, r: 1.5 * k });
  p.rect(X(1.25), Y(6.35), 1.3 * k, 4.1 * k, look.shirt, { shadow: false, r: 0.65 * k });
  p.rect(X(7.45), Y(6.35), 1.3 * k, 4.1 * k, look.shirt, { shadow: false, r: 0.65 * k });
  if (look.hairStyle !== "bald") p.circle(x, Y(2.9), 2.78 * k, look.hair, { shadow: false });
  p.circle(x, Y(3.32), 2.45 * k, look.skin, { shadow: false });
  if (look.hairStyle !== "bald") {
    p.path(
      `M ${X(2.58)} ${Y(3.28)} A ${2.48 * k} ${2.48 * k} 0 0 1 ${X(7.42)} ${Y(3.28)} L ${X(6.95)} ${Y(3.24)} A ${1.98 * k} ${1.98 * k} 0 0 0 ${X(3.05)} ${Y(3.24)} Z`,
      look.hair,
      { shadow: false }
    );
  }
  if (look.hairStyle === "bun") p.circle(X(4.35), Y(0.72), 0.92 * k, look.hair, { shadow: false });
  if (look.beardStyle === "full") p.ellipse(x, Y(5.3), 1.68 * k, (0.58 + g * 0.8) * k, look.hair, { shadow: false });
  if (look.beardStyle === "goatee") p.rect(X(4.48), Y(4.95), 1.05 * k, (0.5 + g * 1.05) * k, look.hair, { shadow: false, r: 0.5 * k });
  if (look.beardStyle === "mustache") p.rect(X(4.12), Y(4.58), 1.76 * k, (0.34 + g * 0.16) * k, look.hair, { shadow: false, r: 0.17 * k });
}

function bellShape(c: Ctx, cx: number, cy: number, r: number, fill: string) {
  const { p } = c;
  const x0 = cx - r;
  const x1 = cx + r;
  const yb = cy + r * 1.35;
  p.path(
    `M ${x0} ${yb} C ${x0} ${cy + r * 0.3} ${cx - r * 0.55} ${cy - r * 0.4} ${cx - r * 0.5} ${cy - r * 0.95} A ${r * 0.52} ${r * 0.52} 0 0 1 ${cx + r * 0.5} ${cy - r * 0.95} C ${cx + r * 0.55} ${cy - r * 0.4} ${x1} ${cy + r * 0.3} ${x1} ${yb} Z`,
    fill
  );
  p.rect(x0 - 0.9, yb - 0.4, 2 * r + 1.8, r * 0.24, "#7C5C10", { shadow: false, r: 0.5 });
  p.circle(cx, yb + r * 0.45, r * 0.3, "#B45309", { shadow: false });
}

function crossTop(c: Ctx, cx: number, yBase: number, h: number, color: string, beamAt = 0.3) {
  const { p } = c;
  const w = Math.max(1.6, h * 0.16);
  p.rect(cx - w / 2, yBase - h, w, h, color, { shadow: false, r: 0.4 });
  p.rect(cx - h * 0.34, yBase - h * (1 - beamAt) - w / 2, h * 0.68, w, color, { shadow: false, r: 0.4 });
}

function paperTree(c: Ctx, cx: number, groundY: number, h: number, trunk = "#7A4A21", canopy = "#4C9A50", canopy2 = "#3E8E41") {
  const { p } = c;
  p.rect(cx - h * 0.045, groundY - h * 0.3, h * 0.09, h * 0.3, trunk, { shadow: false, r: 0.6 });
  p.circle(cx - h * 0.16, groundY - h * 0.52, h * 0.26, canopy2);
  p.circle(cx + h * 0.17, groundY - h * 0.56, h * 0.24, canopy);
  p.circle(cx, groundY - h * 0.82, h * 0.27, canopy);
}

function sceneHouse(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const bodyW = 86;
  const bodyX = 7;
  const baseH = rows * 0.4;
  const bodyH = baseH + (lv - 1) * rows * 0.14;
  const bodyY = ground - bodyH;
  const gableH = bodyW * 0.24;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 52, 1.8, PAPER_SHADOW, { shadow: false });
  p.poly(`${bodyX - 2},${bodyY + 1.5} 50,${bodyY - gableH} ${bodyX + bodyW + 2},${bodyY + 1.5}`, "#8A5A2B");
  if (lv >= 3) p.poly(`${bodyX + bodyW * 0.2},${bodyY + 1.5} 50,${bodyY - gableH * 0.55} ${bodyX + bodyW * 0.8},${bodyY + 1.5}`, GOLD, { shadow: false, opacity: 0.4 });
  p.rect(bodyX, bodyY, bodyW, bodyH, "#FFF7E6", { r: 1.6 });
  if (lv >= 2) {
    const flH = rows * 0.14;
    p.line(bodyX + 2, ground - flH, bodyX + bodyW - 2, ground - flH, "#D8CDB4", 0.9);
    archedWin(c, bodyX + bodyW * 0.1, bodyY + flH * 0.3, 12, flH * 0.62, lit(seed, 5) ? LIT : "#BFDBFE", "#8A5A2B");
    archedWin(c, bodyX + bodyW * 0.9 - 12, bodyY + flH * 0.3, 12, flH * 0.62, lit(seed, 6) ? LIT : "#BFDBFE", "#8A5A2B");
  }
  const doorW = 17;
  paperDoor(c, 50, doorW, baseH * 0.52, "#6B4423", "#4A2F18", lv >= 2 ? (lit(seed, 9) ? LIT : "#BFDBFE") : undefined);
  archedWin(c, bodyX + bodyW * 0.06, ground - baseH * 0.62, 13, baseH * 0.34, lit(seed, 0) ? LIT : "#BFDBFE", "#8A5A2B");
  archedWin(c, bodyX + bodyW * 0.94 - 13, ground - baseH * 0.62, 13, baseH * 0.34, lit(seed, 1) ? LIT : "#BFDBFE", "#8A5A2B");
  if (lv >= 3) {
    flowerBox(c, bodyX + bodyW * 0.06 + 6.5, ground - baseH * 0.62 + baseH * 0.34 + 1.2, 16);
    flowerBox(c, bodyX + bodyW * 0.94 - 6.5, ground - baseH * 0.62 + baseH * 0.34 + 1.2, 16);
    plantPot(c, bodyX + bodyW * 0.03, ground, true);
    plantPot(c, bodyX + bodyW * 0.97, ground, true);
  }
  if (lv >= 2) {
    // porch: slab + two posts + little roof
    p.rect(50 - doorW * 0.95, ground - 1.8, doorW * 1.9, 2.2, "#D6CDBB", { r: 0.7 });
    p.rect(50 - doorW * 0.85, ground - baseH * 0.56, 2.6, baseH * 0.56, "#8A5A2B", { shadow: false, r: 0.6 });
    p.rect(50 + doorW * 0.85 - 2.6, ground - baseH * 0.56, 2.6, baseH * 0.56, "#8A5A2B", { shadow: false, r: 0.6 });
    p.rect(50 - doorW * 1.05, ground - baseH * 0.56 - 3.4, doorW * 2.1, 3.6, "#6B4423", { r: 0.8 });
  }
  roundWin(c, 50, bodyY + gableH * 0.35, 4.6, lit(seed, 7) ? LIT : "#BFDBFE", "#8A5A2B");
}

function sceneCottage(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 62;
  const x0 = 50 - W / 2;
  const baseH = rows * 0.34;
  const bodyH = baseH + (lv - 1) * rows * 0.09;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  const glass = (j: number) => (lit(seed, j) ? LIT : "#FDE68A");
  p.ellipse(50, ground + 0.4, 38, 1.5, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 3},${bodyY + 1.5} 50,${bodyY - W * 0.22} ${x0 + W + 3},${bodyY + 1.5}`, "#9A3412");
  p.rect(x0, bodyY, W, bodyH, "#FFE9D2", { r: 1.4 });
  if (lv >= 2) {
    const flH = rows * 0.09;
    p.line(x0 + 2, ground - flH, x0 + W - 2, ground - flH, "#D8BFA0", 0.8);
    archedWin(c, x0 + W * 0.3, bodyY + flH * 0.22, 10, flH * 0.6, glass(5), "#9A3412");
    archedWin(c, x0 + W * 0.56, bodyY + flH * 0.22, 10, flH * 0.6, glass(6), "#9A3412");
  }
  paperDoor(c, 50, 13, baseH * 0.55, "#7C2D12", "#5E2008");
  archedWin(c, x0 + W * 0.06, ground - baseH * 0.6, 11, baseH * 0.32, glass(0), "#9A3412");
  archedWin(c, x0 + W * 0.94 - 11, ground - baseH * 0.6, 11, baseH * 0.32, glass(1), "#9A3412");
  if (lv >= 2) {
    const chX = x0 + W * 0.8;
    p.rect(chX, bodyY - W * 0.14, 6.5, W * 0.14 + baseH * 0.3, "#B45309");
    p.rect(chX - 1.4, bodyY - W * 0.14 - 2.2, 9.3, 3, "#B45309", { r: 0.6 });
    if (lv >= 3) {
      p.stroke(`M ${chX + 3.2} ${bodyY - W * 0.14 - 4} C ${chX + 0.5} ${bodyY - W * 0.14 - 8} ${chX + 6} ${bodyY - W * 0.14 - 11} ${chX + 3.4} ${bodyY - W * 0.14 - 14.5}`, "#CBD5E1", 1.6, 0.85);
    }
  }
  if (lv >= 3) {
    flowerBox(c, x0 + W * 0.06 + 5.5, ground - baseH * 0.6 + baseH * 0.32 + 1.1, 14);
    flowerBox(c, x0 + W * 0.94 - 5.5, ground - baseH * 0.6 + baseH * 0.32 + 1.1, 14);
  }
}

function sceneFarm(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 84;
  const x0 = 8;
  const bodyH = rows * 0.36;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 50, 1.7, PAPER_SHADOW, { shadow: false });
  // gambrel roof + loft door
  p.poly(
    `${x0 + W * 0.14},${bodyY} ${x0 + W * 0.28},${bodyY - rows * 0.15} ${x0 + W * 0.72},${bodyY - rows * 0.15} ${x0 + W * 0.86},${bodyY}`,
    "#7C2D12"
  );
  p.rect(x0 + W * 0.42, bodyY - rows * 0.13, W * 0.16, rows * 0.11, "#8A3A1C", { r: 0.7 });
  p.rect(x0, bodyY, W, bodyH, "#B3402A", { r: 1.2 });
  // white X-brace on the big door
  const dW = W * 0.36;
  const dX = 50 - dW / 2;
  const dH = bodyH * 0.78;
  p.rect(dX, ground - dH, dW, dH, "#8F2F1E", { r: 0.8 });
  p.line(dX + 1.5, ground - dH + 1.5, dX + dW - 1.5, ground - 1.5, "#FFF7E6", 1.6);
  p.line(dX + 1.5, ground - 1.5, dX + dW - 1.5, ground - dH + 1.5, "#FFF7E6", 1.6);
  p.rect(dX, ground - dH, dW, 2.4, "#FFF7E6", { shadow: false, r: 0.6 });
  archedWin(c, x0 + W * 0.06, bodyY + bodyH * 0.16, 10, bodyH * 0.34, lit(seed, 0) ? LIT : "#FDE68A", "#5E2008");
  archedWin(c, x0 + W * 0.94 - 10, bodyY + bodyH * 0.16, 10, bodyH * 0.34, lit(seed, 1) ? LIT : "#FDE68A", "#5E2008");
  // crop rows (L2+) + hay bales (L3)
  if (lv >= 2) {
    [0.16, 0.5, 0.84].forEach((f) => {
      p.rect(x0 + W * f - 1.5, ground - rows * 0.012, 3, rows * 0.05, "#4C9A50", { shadow: false, r: 1.4 });
    });
  }
  if (lv >= 3) {
    [x0 + W * 0.1, x0 + W * 0.88].forEach((bx) => {
      p.rect(bx - 4.5, ground - rows * 0.042, 9, rows * 0.042, "#F3C96B", { r: rows * 0.02 });
      p.line(bx, ground - rows * 0.042, bx, ground, "#D9A83F", 0.7);
    });
  }
}

function sceneChurch(c: Ctx, prayedCount: number, blessed: boolean) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 78;
  const x0 = 11;
  const bodyH = rows * 0.44;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  const glass = (j: number, day: string) => (lit(seed, j) ? LIT : day);
  p.ellipse(50, ground + 0.5, 46, 1.8, PAPER_SHADOW, { shadow: false });
  // steep gable + gold cross
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.13} ${x0 + W + 2},${bodyY + 1.5}`, "#5E5646");
  crossTop(c, 50, bodyY - rows * 0.13 + 1, rows * 0.09, GOLD);
  p.rect(x0, bodyY, W, bodyH, "#FFF8E7", { r: 1.4 });
  // bell tower front-left; the bell is gold when the bell was rung
  const twX = x0 + W * 0.04;
  const twW = W * 0.2;
  const twTop = bodyY - rows * 0.1;
  p.rect(twX, twTop, twW, ground - twTop, "#F3E9CF", { r: 1.2 });
  p.poly(`${twX - 2.5},${twTop + 1} ${twX + twW / 2},${twTop - rows * 0.055} ${twX + twW + 2.5},${twTop + 1}`, "#5E5646");
  bellShape(c, twX + twW / 2, twTop + rows * 0.035, twW * 0.3, blessed ? "#E9C767" : "#A8843C");
  // tall lancet windows — rose by day, warm gold at night
  [0.36, 0.62, 0.86].forEach((f, i) => {
    archedWin(c, x0 + W * f - 6, bodyY + bodyH * 0.2, 12, bodyH * 0.52, glass(i, "#F5C6D6"), "#5E5646");
  });
  // double doors under a great arch
  paperDoor(c, 50, 20, bodyH * 0.44, "#6B4423", "#4A2F18", glass(9, "#BFDBFE"));
  p.line(50, ground - bodyH * 0.44, 50, ground, "#4A2F18", 0.7);
  // L2: candles in the lancets; L3: garden + paper congregation
  if (lv >= 2) {
    [0.36, 0.62, 0.86].forEach((f) => {
      p.rect(x0 + W * f - 1.3, bodyY + bodyH * 0.52, 2.6, bodyH * 0.12, "#FFF7ED", { shadow: false, r: 0.5 });
      p.ellipse(x0 + W * f, bodyY + bodyH * 0.49, 1.1, 1.7, "#F59E0B", { shadow: false });
    });
  }
  if (lv >= 3) {
    plantPot(c, x0 + W * 0.02, ground, true);
    plantPot(c, x0 + W * 0.98, ground, true);
    const n = Math.min(Math.max(prayedCount, 1), 5);
    for (let i = 0; i < n; i++) {
      const fx = 26 + i * 12.5;
      tinyFigure(c, fx, ground + 0.4, rows * 0.16, paperDinerLookFor({ id: `choir-${i}` }));
    }
  }
}

function sceneChapel(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 54;
  const x0 = 23;
  const bodyH = rows * 0.36;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.4, 33, 1.5, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.09} ${x0 + W + 2},${bodyY + 1.5}`, "#6B4A2F");
  p.rect(x0, bodyY, W, bodyH, "#FFF3D6", { r: 1.3 });
  roundWin(c, 50, bodyY + bodyH * 0.24, 5.6, lit(seed, 4) ? LIT : "#F5C6D6", "#6B4A2F");
  paperDoor(c, 50, 15, bodyH * 0.5, "#5E3D22", "#4A2F18", lv >= 2 ? (lit(seed, 9) ? LIT : "#FDE68A") : undefined);
  // candle window L2+; garden L3
  if (lv >= 2) {
    p.rect(x0 + W * 0.12, ground - bodyH * 0.24, 3, bodyH * 0.2, "#FFF7ED", { shadow: false, r: 0.6 });
    p.ellipse(x0 + W * 0.12 + 1.5, ground - bodyH * 0.27, 1.2, 1.9, "#F59E0B", { shadow: false });
  }
  if (lv >= 3) {
    plantPot(c, x0 + 1, ground, true);
    plantPot(c, x0 + W - 1, ground, true);
  }
  archedWin(c, x0 + W * 0.78, ground - bodyH * 0.52, 9, bodyH * 0.3, lit(seed, 0) ? LIT : "#FDE68A", "#6B4A2F");
}

function sceneCinema(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 86;
  const x0 = 7;
  const bodyH = rows * 0.42;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 50, 1.7, PAPER_SHADOW, { shadow: false });
  p.rect(x0 - 1.5, bodyY - rows * 0.05, W + 3, rows * 0.05, "#4C1D95", { r: 1 });
  p.rect(x0, bodyY, W, bodyH, "#2E1065", { r: 1.4 });
  // marquee: cream board, gold bulb row (lit bulbs at night)
  const mW = W * 0.72;
  const mY = bodyY - rows * 0.028;
  p.rect(50 - mW / 2, mY, mW, rows * 0.1, "#FFF3C4");
  const bulbs = 9;
  for (let i = 0; i < bulbs; i++) {
    p.circle(50 - mW / 2 + 4 + ((mW - 8) / (bulbs - 1)) * i, mY + rows * 0.05, 1.9, night || lit(seed, i) ? "#FDE68A" : "#F3C96B", { shadow: false });
  }
  // poster cases + ticket booth
  [-0.3, 0.3].forEach((f, i) => {
    p.rect(50 + f * W - W * 0.09, bodyY + bodyH * 0.3, W * 0.18, bodyH * 0.52, "#FFFBEB", { r: 0.8 });
    p.rect(50 + f * W - W * 0.09 + 1.6, bodyY + bodyH * 0.3 + 1.6, W * 0.18 - 3.2, bodyH * 0.52 - 3.2, i ? "#7FA8C9" : "#C4493B", { shadow: false, r: 0.6 });
  });
  p.rect(50 - W * 0.09, ground - bodyH * 0.42, W * 0.18, bodyH * 0.42, "#4C1D95", { r: 0.8 });
  p.rect(50 - W * 0.09 + 1.8, ground - bodyH * 0.42 + 1.8, W * 0.18 - 3.6, bodyH * 0.2, lit(seed, 3) ? LIT : "#BFDBFE", { shadow: false, r: 0.6 });
  // L3: gold star finial + red carpet
  if (lv >= 3) {
    p.poly(starPoints(50, bodyY - rows * 0.075, 5.4, 2.3), GOLD);
    p.rect(50 - W * 0.14, ground - 1.6, W * 0.28, 2, "#B91C1C", { r: 0.6 });
  }
}

function sceneTheater(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 84;
  const x0 = 8;
  const bodyH = rows * 0.44;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 49, 1.7, PAPER_SHADOW, { shadow: false });
  // fly tower + pediment
  p.rect(50 - W * 0.16, bodyY - rows * 0.1, W * 0.32, rows * 0.1, "#3B0764", { r: 1 });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.06} ${x0 + W + 2},${bodyY + 1.5}`, "#4C1D95");
  p.rect(x0, bodyY, W, bodyH, "#2E1065", { r: 1.4 });
  // mask medallion: two drawn faces
  p.circle(50, bodyY + bodyH * 0.24, 8.6, GOLD, { shadow: false });
  p.circle(50, bodyY + bodyH * 0.24, 7.4, "#2E1065", { shadow: false });
  p.circle(47.6, bodyY + bodyH * 0.21, 0.95, "#FDE68A", { shadow: false });
  p.circle(52.4, bodyY + bodyH * 0.21, 0.95, "#FDE68A", { shadow: false });
  p.stroke(`M 46.4 ${bodyY + bodyH * 0.28} A 3.2 3.2 0 0 0 53.6 ${bodyY + bodyH * 0.28}`, "#FDE68A", 0.9);
  // columns + arched doors
  if (lv >= 2) {
    [0.1, 0.3, 0.7, 0.9].forEach((f) => p.rect(x0 + W * f - 2.2, bodyY + bodyH * 0.34, 4.4, bodyH * 0.66, "#E9D5FF", { r: 0.7 }));
  }
  [-0.22, 0.22].forEach((f, i) => paperDoor(c, 50 + f * W, 15, bodyH * 0.4, "#581C87", "#3B0764", lit(seed, i + 2) ? LIT : undefined));
  if (lv >= 3) {
    p.rect(50 - W * 0.13, ground - 1.7, W * 0.26, 2.1, "#B91C1C", { r: 0.6 });
    p.poly(starPoints(x0 + W * 0.06, bodyY - rows * 0.02, 4, 1.7), GOLD, { shadow: false });
    p.poly(starPoints(x0 + W * 0.94, bodyY - rows * 0.02, 4, 1.7), GOLD, { shadow: false });
  }
}

function sceneHospital(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 84;
  const x0 = 8;
  const bodyH = rows * (0.4 + (lv - 1) * 0.1);
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 49, 1.7, PAPER_SHADOW, { shadow: false });
  p.rect(x0 - 1.5, bodyY - rows * 0.045, W + 3, rows * 0.045, "#0369A1", { r: 1 });
  p.rect(x0, bodyY, W, bodyH, "#FFFFFF", { r: 1.4 });
  // the red cross: two drawn bars on a white disc band
  const bandY = bodyY + bodyH * 0.05;
  p.rect(50 - 7, bandY, 14, 14, "#DC2626", { shadow: false, r: 1.2 });
  p.rect(50 - 2.2, bandY + 2.2, 4.4, 9.6, "#FFFFFF", { shadow: false, r: 0.6 });
  p.rect(50 - 4.8, bandY + 4.8, 9.6, 4.4, "#FFFFFF", { shadow: false, r: 0.6 });
  // window grid, per-level rows
  const gridRows = lv;
  const gridTop = bodyY + bodyH * 0.34;
  const gridH = bodyH * 0.5;
  for (let r = 0; r < gridRows; r++) {
    for (let colI = 0; colI < 4; colI++) {
      p.rect(x0 + W * 0.08 + colI * W * 0.22, gridTop + (gridH / gridRows) * r + 1.5, W * 0.15, gridH / gridRows - 3.4, lit(seed + r, colI) ? LIT : "#BFDBFE", { shadow: false, r: 0.7, opacity: 0.95 });
    }
  }
  // entrance canopy + ambulance door
  p.rect(50 - W * 0.16, ground - bodyH * 0.3 - 3.4, W * 0.32, 3.8, "#DC2626", { r: 0.8 });
  paperDoor(c, 50, 19, bodyH * 0.3, "#0369A1", "#075985", lit(seed, 9) ? LIT : "#BFDBFE");
}

function sceneInn(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 82;
  const x0 = 9;
  const bodyH = rows * 0.46;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  const glass = (j: number) => (lit(seed, j) ? LIT : "#FDE68A");
  p.ellipse(50, ground + 0.5, 48, 1.7, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.09} ${x0 + W + 2},${bodyY + 1.5}`, "#7C2D12");
  p.rect(x0, bodyY, W, bodyH, "#FFE9C9", { r: 1.4 });
  // hanging sign
  p.line(x0 + W * 0.16, bodyY + bodyH * 0.06, x0 + W * 0.16, bodyY + bodyH * 0.16, "#5E3D22", 0.7);
  p.rect(x0 + W * 0.16 - 7.5, bodyY + bodyH * 0.16, 15, rows * 0.075, "#8A5A2B", { r: 0.8 });
  signGlyph(c, "candle", x0 + W * 0.16, bodyY + bodyH * 0.16 + rows * 0.037, 4.6);
  // two window rows; balcony L2+; lanterns L3
  [0.14, 0.38, 0.62, 0.86].forEach((f, i) => {
    archedWin(c, x0 + W * f - 5.5, bodyY + bodyH * 0.1, 11, bodyH * 0.24, glass(i), "#7C2D12");
    archedWin(c, x0 + W * f - 5.5, ground - bodyH * 0.56, 11, bodyH * 0.24, glass(i + 4), "#7C2D12");
  });
  if (lv >= 2) {
    p.rect(x0 + W * 0.04, bodyY + bodyH * 0.38, W * 0.92, 2.6, "#8A5A2B", { shadow: false, r: 0.7 });
    [0.1, 0.3, 0.5, 0.7, 0.9].forEach((f) => p.rect(x0 + W * f - 0.8, bodyY + bodyH * 0.38, 1.6, bodyH * 0.14, "#8A5A2B", { shadow: false, r: 0.4 }));
  }
  if (lv >= 3) {
    [x0 + W * 0.06, x0 + W * 0.94].forEach((lx) => {
      p.ellipse(lx, ground - bodyH * 0.62, 2.9, 3.7, "#F87171");
      p.line(lx, ground - bodyH * 0.62 - 3.4, lx, ground - bodyH * 0.62 - 5.6, "#5E3D22", 0.5);
    });
  }
  paperDoor(c, 50, 16, bodyH * 0.36, "#7C2D12", "#5E2008", glass(9));
}

function sceneBathhouse(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 76;
  const x0 = 12;
  const bodyH = rows * 0.36;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 45, 1.7, PAPER_SHADOW, { shadow: false });
  // domed roof: half-disc + finial
  p.path(`M ${x0 - 2} ${bodyY + 1} A ${W / 2 + 2} ${rows * 0.16} 0 0 1 ${x0 + W + 2} ${bodyY + 1} Z`, "#0E7490");
  p.circle(50, bodyY - rows * 0.155, 2.6, GOLD, { shadow: false });
  p.rect(x0, bodyY, W, bodyH, "#E0F2FE", { r: 1.4 });
  // steam curls above the dome
  [-0.2, 0.05, 0.3].forEach((f, i) => {
    p.stroke(
      `M ${50 + f * W} ${bodyY - rows * 0.17} C ${50 + f * W - 3} ${bodyY - rows * (0.21 + i * 0.012)} ${50 + f * W + 3} ${bodyY - rows * (0.24 + i * 0.012)} ${50 + f * W} ${bodyY - rows * (0.27 + i * 0.012)}`,
      "#FFFFFF",
      1.7,
      0.8
    );
  });
  // round windows; lanterns L3
  [0.2, 0.5, 0.8].forEach((f, i) => roundWin(c, x0 + W * f, bodyY + bodyH * 0.3, 5, lit(seed, i) ? LIT : "#BAE6FD", "#0E7490"));
  paperDoor(c, 50, 16, bodyH * 0.44, "#155E75", "#0E7490", lit(seed, 9) ? LIT : "#BAE6FD");
  if (lv >= 3) {
    [x0 + W * 0.05, x0 + W * 0.95].forEach((lx) => p.ellipse(lx, ground - bodyH * 0.5, 2.8, 3.6, "#FDE68A"));
  }
}

function sceneTownHall(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 86;
  const x0 = 7;
  const bodyH = rows * 0.42;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  const glass = (j: number) => (lit(seed, j) ? LIT : "#BFDBFE");
  p.ellipse(50, ground + 0.5, 50, 1.7, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.07} ${x0 + W + 2},${bodyY + 1.5}`, "#334155");
  p.rect(x0, bodyY, W, bodyH, "#F1F5F9", { r: 1.4 });
  // clock tower: gable cap + clock face, gold at night
  const twW = W * 0.24;
  const twTop = bodyY - rows * 0.16;
  p.rect(50 - twW / 2, twTop, twW, rows * 0.16 + bodyH * 0.3, "#E2E8F0", { r: 1 });
  p.poly(`${50 - twW / 2 - 2},${twTop + 1} 50,${twTop - rows * 0.06} ${50 + twW / 2 + 2},${twTop + 1}`, "#334155");
  p.circle(50, twTop + rows * 0.075, twW * 0.3, night ? "#FDE68A" : "#FFFFFF");
  p.line(50, twTop + rows * 0.075, 50, twTop + rows * 0.075 - twW * 0.2, "#1F2937", 0.9);
  p.line(50, twTop + rows * 0.075, 50 + twW * 0.15, twTop + rows * 0.075 + twW * 0.1, "#1F2937", 0.9);
  // columns + windows
  [0.08, 0.26, 0.74, 0.92].forEach((f) => p.rect(x0 + W * f - 2.3, bodyY + bodyH * 0.12, 4.6, bodyH * 0.88, "#E2E8F0", { r: 0.7 }));
  [0.17, 0.83].forEach((f, i) => archedWin(c, x0 + W * f - 5.5, bodyY + bodyH * 0.16, 11, bodyH * 0.3, glass(i), "#334155"));
  paperDoor(c, 50, 18, bodyH * 0.4, "#1E293B", "#0F172A", glass(9));
  // steps + flag L3
  p.rect(50 - W * 0.2, ground - 1.5, W * 0.4, 1.9, "#CBD5E1", { r: 0.6 });
  if (lv >= 3) {
    const fx = x0 + W * 0.94;
    p.line(fx, bodyY - rows * 0.02, fx, bodyY - rows * 0.2, "#5E5646", 0.6);
    p.poly(`${fx},${bodyY - rows * 0.2} ${fx + 10},${bodyY - rows * 0.175} ${fx},${bodyY - rows * 0.15}`, "#DC2626", { shadow: false });
  }
}

function scenePostOffice(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 78;
  const x0 = 11;
  const bodyH = rows * 0.38;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  const glass = (j: number) => (lit(seed, j) ? LIT : "#BFDBFE");
  p.ellipse(50, ground + 0.5, 46, 1.7, PAPER_SHADOW, { shadow: false });
  p.rect(x0 - 1.5, bodyY - rows * 0.05, W + 3, rows * 0.05, "#1E3A8A", { r: 1 });
  p.rect(x0, bodyY, W, bodyH, "#EFF6FF", { r: 1.4 });
  // envelope sign
  p.rect(50 - 11, bodyY + bodyH * 0.06, 22, bodyH * 0.26, "#FFFFFF", { r: 0.8 });
  p.line(50 - 11, bodyY + bodyH * 0.07, 50, bodyY + bodyH * 0.2, "#1D4ED8", 0.9);
  p.line(50 + 11, bodyY + bodyH * 0.07, 50, bodyY + bodyH * 0.2, "#1D4ED8", 0.9);
  archedWin(c, x0 + W * 0.08, ground - bodyH * 0.56, 12, bodyH * 0.32, glass(0), "#1E3A8A");
  archedWin(c, x0 + W * 0.92 - 12, ground - bodyH * 0.56, 12, bodyH * 0.32, glass(1), "#1E3A8A");
  // blue mailbox + sacks L2+
  p.rect(x0 + W * 0.03, ground - bodyH * 0.3, W * 0.13, bodyH * 0.3, "#1D4ED8", { r: 1 });
  p.rect(x0 + W * 0.03, ground - bodyH * 0.3, W * 0.13, bodyH * 0.1, "#1E3A8A", { shadow: false, r: 0.8 });
  if (lv >= 2) {
    [0.82, 0.9].forEach((f) => {
      p.path(`M ${x0 + W * f - 4} ${ground} L ${x0 + W * f - 4} ${ground - bodyH * 0.2} A 4.5 3.4 0 0 1 ${x0 + W * f + 4} ${ground - bodyH * 0.2} L ${x0 + W * f + 4} ${ground} Z`, "#C69A63");
    });
  }
  paperDoor(c, 50, 16, bodyH * 0.42, "#1E3A8A", "#172554", glass(9));
}

function sceneCarpenter(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 80;
  const x0 = 10;
  const bodyH = rows * 0.36;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 47, 1.7, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.09} ${x0 + W + 2},${bodyY + 1.5}`, "#5E3D22");
  p.rect(x0, bodyY, W, bodyH, "#E8C07A", { r: 1.3 });
  // plank seams
  [0.3, 0.55, 0.8].forEach((f) => p.line(x0 + 2, bodyY + bodyH * f, x0 + W - 2, bodyY + bodyH * f, "#C69A63", 0.7));
  archedWin(c, x0 + W * 0.07, bodyY + bodyH * 0.18, 11, bodyH * 0.3, lit(seed, 0) ? LIT : "#FDE68A", "#5E3D22");
  archedWin(c, x0 + W * 0.93 - 11, bodyY + bodyH * 0.18, 11, bodyH * 0.3, lit(seed, 1) ? LIT : "#FDE68A", "#5E3D22");
  // big barn doors, open work bay at L2+
  [-7.5, 7.5].forEach((dx) => {
    p.path(`M ${50 + dx - 6.8} ${ground} L ${50 + dx - 6.8} ${ground - bodyH * 0.5} A 6.8 6.8 0 0 1 ${50 + dx + 6.8} ${ground - bodyH * 0.5} L ${50 + dx + 6.8} ${ground} Z`, "#8A5A2B");
  });
  if (lv >= 2) {
    // lumber stack on a sawhorse bay
    p.rect(x0 + W * 0.36, ground - bodyH * 0.34, W * 0.28, 2.6, "#C69A63", { shadow: false, r: 0.6 });
    p.rect(x0 + W * 0.38, ground - bodyH * 0.34 - 2.8, W * 0.24, 2.6, "#E3C08D", { shadow: false, r: 0.6 });
  }
  if (lv >= 3) {
    // log stack at the side
    [0, 1].forEach((i) => {
      const lw = W * (0.17 - i * 0.025);
      p.rect(x0 + W * 0.84, ground - 3.2 - i * 2.9, lw, 2.9, "#8A5A2B", { r: 1.4 });
      p.circle(x0 + W * 0.84 + lw - 1.1, ground - 1.8 - i * 2.9, 1.05, "#E3C08D", { shadow: false });
    });
  }
  medallion(c, 50, bodyY + 1, 7.6, "saw", "#FFF8E7", "#5E3D22");
}

function scenePottery(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 70;
  const x0 = 15;
  const bodyH = rows * 0.34;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 42, 1.6, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.08} ${x0 + W + 2},${bodyY + 1.5}`, "#9A3412");
  p.rect(x0, bodyY, W, bodyH, "#FDEBD3", { r: 1.3 });
  archedWin(c, x0 + W * 0.08, bodyY + bodyH * 0.2, 11, bodyH * 0.32, lit(seed, 0) ? LIT : "#FDE68A", "#9A3412");
  archedWin(c, x0 + W * 0.92 - 11, bodyY + bodyH * 0.2, 11, bodyH * 0.32, lit(seed, 1) ? LIT : "#FDE68A", "#9A3412");
  // vases: the wares themselves, on the front shelf
  const vase = (vx: number, h: number, col: string) => {
    p.path(
      `M ${vx - 3.4} ${ground} C ${vx - 4.6} ${ground - h * 0.5} ${vx - 2.2} ${ground - h * 0.75} ${vx - 1.6} ${ground - h} L ${vx + 1.6} ${ground - h} C ${vx + 2.2} ${ground - h * 0.75} ${vx + 4.6} ${ground - h * 0.5} ${vx + 3.4} ${ground} Z`,
      col
    );
  };
  vase(x0 + W * 0.3, bodyH * 0.4, "#C0562F");
  if (lv >= 2) vase(x0 + W * 0.7, bodyH * 0.52, "#7C6AAE");
  if (lv >= 3) {
    vase(x0 + W * 0.5, bodyH * 0.3, "#2F6B31");
    p.rect(x0 + W * 0.16, ground - 1.4, W * 0.68, 1.8, "#9A3412", { shadow: false, r: 0.6 });
  }
  paperDoor(c, 50, 13, bodyH * 0.42, "#9A3412", "#7C2D12");
}

function sceneTailor(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 74;
  const x0 = 13;
  const bodyH = rows * 0.4;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 44, 1.6, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.08} ${x0 + W + 2},${bodyY + 1.5}`, "#581C87");
  p.rect(x0, bodyY, W, bodyH, "#F5F0FF", { r: 1.3 });
  // awning stripes
  [0, 1, 2, 3, 4, 5].forEach((i) => {
    p.rect(x0 - 1 + ((W + 2) / 6) * i, bodyY, (W + 2) / 6 - 0.3, rows * 0.045 + 2.6, i % 2 ? "#FFFFFF" : "#A855F7", { shadow: false, r: 0.6 });
  });
  // dress form in the window
  const fx = x0 + W * 0.24;
  p.path(`M ${fx - 4.5} ${ground - bodyH * 0.06} C ${fx - 5} ${ground - bodyH * 0.34} ${fx - 2.6} ${ground - bodyH * 0.42} ${fx - 1.7} ${ground - bodyH * 0.56} L ${fx + 1.7} ${ground - bodyH * 0.56} C ${fx + 2.6} ${ground - bodyH * 0.42} ${fx + 5} ${ground - bodyH * 0.34} ${fx + 4.5} ${ground - bodyH * 0.06} Z`, "#A855F7");
  p.line(fx, ground - bodyH * 0.56, fx, ground - bodyH * 0.66, "#581C87", 0.8);
  // fabric bolts by the door (L2+); needle sign
  if (lv >= 2) {
    ["#EF4444", "#F59E0B", "#10B981"].forEach((col, i) => {
      p.rect(x0 + W * 0.66 + i * 4.6, ground - bodyH * 0.4, 3.8, bodyH * 0.4, col, { shadow: false, r: 0.6 });
    });
  }
  paperDoor(c, x0 + W * 0.5, 15, bodyH * 0.42, "#581C87", "#3B0764", lit(seed, 9) ? LIT : undefined);
  medallion(c, x0 + W * 0.86, bodyY + rows * 0.03, 6.8, "shirt", "#FFF8E7", "#581C87");
}

function sceneObservatory(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 66;
  const x0 = 17;
  const bodyH = rows * 0.3;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 40, 1.6, PAPER_SHADOW, { shadow: false });
  // the glass dome on its drum
  const domeR = W * 0.42;
  p.rect(50 - domeR, bodyY - rows * 0.02, domeR * 2, rows * 0.05, "#334155", { r: 0.8 });
  p.path(`M ${50 - domeR} ${bodyY} A ${domeR} ${domeR} 0 0 1 ${50 + domeR} ${bodyY} Z`, night ? "#1E3A5F" : "#A5D8F0");
  // telescope poking through the slit
  p.rect(50 + domeR * 0.1, bodyY - domeR * 0.95, domeR * 0.85, rows * 0.045, "#94A3B8", { r: rows * 0.02, rot: { deg: -24, cx: 50 + domeR * 0.1, cy: bodyY - domeR * 0.95 } });
  p.line(50, bodyY - domeR * 0.98, 50, bodyY, "#E2E8F0", 0.8);
  // stars over the dome — gold at night, pale by day
  [[0.12, -0.3], [0.3, -0.42], [0.72, -0.36], [0.9, -0.24], [0.5, -0.5]].forEach(([f, fy], i) => {
    p.poly(starPoints(x0 + W * f, bodyY + rows * fy, 2.6 - (i % 2) * 0.7, 1.1), night ? "#FDE68A" : "#CBD5E1", { shadow: false });
  });
  p.rect(x0, bodyY, W, bodyH, "#E8EDF5", { r: 1.3 });
  archedWin(c, x0 + W * 0.08, bodyY + bodyH * 0.2, 10, bodyH * 0.34, lit(seed, 0) ? LIT : "#BFDBFE", "#334155");
  archedWin(c, x0 + W * 0.92 - 10, bodyY + bodyH * 0.2, 10, bodyH * 0.34, lit(seed, 1) ? LIT : "#BFDBFE", "#334155");
  paperDoor(c, 50, 14, bodyH * 0.5, "#1E293B", "#0F172A", lit(seed, 9) ? LIT : undefined);
  if (lv >= 3) {
    // an armillary ring beside the door
    p.circle(x0 + W * 0.06, ground - bodyH * 0.3, 4.6, "#C9963C", { shadow: false });
    p.circle(x0 + W * 0.06, ground - bodyH * 0.3, 3.4, "#E8EDF5", { shadow: false });
    p.circle(x0 + W * 0.06, ground - bodyH * 0.3, 1.2, GOLD, { shadow: false });
  }
}

function sceneMusicHall(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 82;
  const x0 = 9;
  const bodyH = rows * 0.44;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 48, 1.7, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.07} ${x0 + W + 2},${bodyY + 1.5}`, "#7C2D3E");
  p.rect(x0, bodyY, W, bodyH, "#FDF3E3", { r: 1.4 });
  // staff lines + notes across the frieze
  [0.1, 0.16, 0.22].forEach((f) => p.line(x0 + W * 0.14, bodyY + bodyH * f, x0 + W * 0.86, bodyY + bodyH * f, "#7C2D3E", 0.6));
  [0.24, 0.44, 0.64, 0.8].forEach((f, i) => {
    p.circle(x0 + W * f, bodyY + bodyH * (0.19 - (i % 2) * 0.05), 1.7, "#7C2D3E", { shadow: false });
    p.line(x0 + W * f + 1.6, bodyY + bodyH * (0.19 - (i % 2) * 0.05), x0 + W * f + 1.6, bodyY + bodyH * 0.06, "#7C2D3E", 0.6);
  });
  // arched shell windows; open doors L2+; harp silhouette L3
  [0.2, 0.5, 0.8].forEach((f, i) => archedWin(c, x0 + W * f - 6, bodyY + bodyH * 0.32, 12, bodyH * 0.4, lit(seed, i) ? LIT : "#FDE68A", "#7C2D3E"));
  if (lv >= 2) {
    p.line(50, ground - bodyH * 0.4, 50, ground, "#5E2008", 0.6);
  }
  if (lv >= 3) {
    p.stroke(`M ${x0 + W * 0.06} ${ground - bodyH * 0.52} C ${x0 + W * 0.02} ${ground - bodyH * 0.3} ${x0 + W * 0.05} ${ground - bodyH * 0.12} ${x0 + W * 0.1} ${ground - bodyH * 0.04}`, GOLD, 1.6);
  }
  paperDoor(c, 50, 19, bodyH * 0.4, "#6B4423", "#4A2F18", lit(seed, 9) ? LIT : undefined);
}

function sceneBibleStudyHall(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 80;
  const x0 = 10;
  const bodyH = rows * 0.42;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  const glass = (j: number) => (lit(seed, j) ? LIT : "#FDE68A");
  p.ellipse(50, ground + 0.5, 47, 1.7, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.1} ${x0 + W + 2},${bodyY + 1.5}`, "#4A5D3A");
  p.rect(x0, bodyY, W, bodyH, "#FDF6E3", { r: 1.4 });
  // open-book medallion over the gable
  medallion(c, 50, bodyY + bodyH * 0.02, 8.4, "book", "#FFF8E7", "#4A5D3A");
  archedWin(c, x0 + W * 0.08, bodyY + bodyH * 0.26, 12, bodyH * 0.4, glass(0), "#4A5D3A");
  archedWin(c, x0 + W * 0.92 - 12, bodyY + bodyH * 0.26, 12, bodyH * 0.4, glass(1), "#4A5D3A");
  // study benches L2; garden L3
  if (lv >= 2) {
    [x0 + W * 0.16, x0 + W * 0.84 - 9].forEach((bx) => {
      p.rect(bx, ground - bodyH * 0.1, 9, 2.2, "#8A5A2B", { shadow: false, r: 0.6 });
      p.rect(bx + 0.8, ground - bodyH * 0.1 + 2, 1.6, bodyH * 0.08, "#8A5A2B", { shadow: false, r: 0.4 });
      p.rect(bx + 6.6, ground - bodyH * 0.1 + 2, 1.6, bodyH * 0.08, "#8A5A2B", { shadow: false, r: 0.4 });
    });
  }
  if (lv >= 3) {
    plantPot(c, x0 + W * 0.02, ground, true);
    plantPot(c, x0 + W * 0.98, ground, true);
  }
  paperDoor(c, 50, 17, bodyH * 0.42, "#5E4A26", "#4A3A1C", glass(9));
}

function sceneFastingHouse(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 66;
  const x0 = 17;
  const bodyH = rows * 0.36;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 40, 1.6, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.1} ${x0 + W + 2},${bodyY + 1.5}`, "#2F4A3E");
  p.rect(x0, bodyY, W, bodyH, "#EFF7EE", { r: 1.4 });
  // candle medallion — the house's whole identity
  medallion(c, 50, bodyY + bodyH * 0.06, 8.2, "candle", "#FFF8E7", "#2F4A3E");
  archedWin(c, x0 + W * 0.1, bodyY + bodyH * 0.3, 11, bodyH * 0.36, lit(seed, 0) ? LIT : "#FDE68A", "#2F4A3E");
  archedWin(c, x0 + W * 0.9 - 11, bodyY + bodyH * 0.3, 11, bodyH * 0.36, lit(seed, 1) ? LIT : "#FDE68A", "#2F4A3E");
  // quiet garden: stones + a bench, L2+; a second candle L3
  if (lv >= 2) {
    [0.14, 0.3, 0.7, 0.86].forEach((f, i) => p.ellipse(x0 + W * f, ground - 1, 3.4 - (i % 2), 1.3, "#CBD5C0", { shadow: false }));
    p.rect(x0 + W * 0.4, ground - bodyH * 0.12, W * 0.2, 2.2, "#6B8F71", { shadow: false, r: 0.6 });
  }
  if (lv >= 3) {
    p.rect(x0 + W * 0.88, ground - bodyH * 0.22, 2.4, bodyH * 0.16, "#FFF7ED", { shadow: false, r: 0.5 });
    p.ellipse(x0 + W * 0.88 + 1.2, ground - bodyH * 0.25, 1, 1.6, "#F59E0B", { shadow: false });
  }
  paperDoor(c, 50, 15, bodyH * 0.44, "#2F4A3E", "#1E332A", lit(seed, 9) ? LIT : undefined);
}

function sceneGym(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 84;
  const x0 = 8;
  const bodyH = rows * 0.4;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 49, 1.7, PAPER_SHADOW, { shadow: false });
  // barrel roof
  p.path(`M ${x0 - 1.5} ${bodyY + 1.5} A ${W / 2 + 1.5} ${rows * 0.09} 0 0 1 ${x0 + W + 1.5} ${bodyY + 1.5} Z`, "#B91C1C");
  p.rect(x0, bodyY, W, bodyH, "#FEF2F2", { r: 1.4 });
  // kettlebell medallion
  medallion(c, 50, bodyY + bodyH * 0.05, 8.2, "kettlebell", "#FFF8E7", "#B91C1C");
  // big glass front, split in three
  const gW = W * 0.62;
  const gX = 50 - gW / 2;
  const gY = bodyY + bodyH * 0.3;
  const gH = bodyH * 0.44;
  p.rect(gX - 1, gY - 1, gW + 2, gH + 2, "#7F1D1D", { shadow: false, r: 1 });
  p.rect(gX, gY, gW, gH, lit(seed, 2) ? LIT : "#BFDBFE", { shadow: false, r: 0.7 });
  [1, 2].forEach((i) => p.line(gX + (gW / 3) * i, gY, gX + (gW / 3) * i, gY + gH, "#7F1D1D", 0.6));
  // rack + plates L2; outdoor rig L3
  if (lv >= 2) {
    [x0 + W * 0.03, x0 + W * 0.9].forEach((rx) => {
      p.rect(rx, ground - bodyH * 0.4, 1.8, bodyH * 0.4, "#374151", { shadow: false, r: 0.5 });
      p.circle(rx + 3.6, ground - bodyH * 0.32, 3.4, "#1F2937", { shadow: false });
      p.circle(rx + 3.6, ground - bodyH * 0.32, 1.2, "#9CA3AF", { shadow: false });
    });
  }
  if (lv >= 3) {
    p.rect(x0 + W * 0.3, ground - 1.6, W * 0.4, 2, "#B91C1C", { shadow: false, r: 0.6 });
  }
  paperDoor(c, x0 + W * 0.06 + 4, 11, bodyH * 0.4, "#7F1D1D", "#450A0A");
}

function sceneOutreach(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 78;
  const x0 = 11;
  const bodyH = rows * 0.38;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 46, 1.7, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.09} ${x0 + W + 2},${bodyY + 1.5}`, "#9A3412");
  p.rect(x0, bodyY, W, bodyH, "#FFF7ED", { r: 1.4 });
  // heart medallion
  medallion(c, 50, bodyY + bodyH * 0.04, 8.2, "heart", "#FFF8E7", "#9A3412");
  archedWin(c, x0 + W * 0.08, bodyY + bodyH * 0.28, 11, bodyH * 0.34, lit(seed, 0) ? LIT : "#FDE68A", "#9A3412");
  archedWin(c, x0 + W * 0.92 - 11, bodyY + bodyH * 0.28, 11, bodyH * 0.34, lit(seed, 1) ? LIT : "#FDE68A", "#9A3412");
  // supply crates L2; banner + boxes L3
  if (lv >= 2) {
    [x0 + W * 0.05, x0 + W * 0.86].forEach((bx, i) => {
      p.rect(bx, ground - rows * 0.055, W * 0.1, rows * 0.055, "#C69A63", { r: 0.6 });
      p.circle(bx + W * 0.05, ground - rows * 0.042, 1.6, i ? "#F59E0B" : "#DC2626", { shadow: false });
    });
  }
  if (lv >= 3) {
    p.rect(x0 + W * 0.3, bodyY + bodyH * 0.14, W * 0.4, rows * 0.05, "#C2410C", { shadow: false, r: 0.7 });
    signGlyph(c, "heart", 50, bodyY + bodyH * 0.14 + rows * 0.025, rows * 0.02);
  }
  paperDoor(c, 50, 16, bodyH * 0.42, "#7C2D12", "#5E2008", lit(seed, 9) ? LIT : undefined);
}

function sceneOpera(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 88;
  const x0 = 6;
  const bodyH = rows * 0.46;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 51, 1.8, PAPER_SHADOW, { shadow: false });
  // grand pediment + dome
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.08} ${x0 + W + 2},${bodyY + 1.5}`, "#78350F");
  p.path(`M ${50 - W * 0.14} ${bodyY - rows * 0.075} A ${W * 0.14} ${W * 0.14} 0 0 1 ${50 + W * 0.14} ${bodyY - rows * 0.075} Z`, "#92400E");
  p.circle(50, bodyY - rows * 0.075 - W * 0.135, 2.2, GOLD, { shadow: false });
  p.rect(x0, bodyY, W, bodyH, "#FFF7E6", { r: 1.4 });
  // full colonnade
  [0.06, 0.22, 0.38, 0.62, 0.78, 0.94].forEach((f) => {
    p.rect(x0 + W * f - 2.4, bodyY + bodyH * 0.1, 4.8, bodyH * 0.9, "#F5E6C8", { r: 0.7 });
    p.rect(x0 + W * f - 3.1, bodyY + bodyH * 0.1, 6.2, 2.2, "#E9D5A8", { shadow: false, r: 0.6 });
  });
  // arched niches with stone paper figures (statues) L2+
  if (lv >= 2) {
    [0.3, 0.7].forEach((f) => {
      const nx = x0 + W * f;
      p.path(`M ${nx - 5} ${ground - bodyH * 0.34} L ${nx - 5} ${ground - bodyH * 0.62} A 5 5 0 0 1 ${nx + 5} ${ground - bodyH * 0.62} L ${nx + 5} ${ground - bodyH * 0.34} Z`, "#E7E0CE", { shadow: false });
      tinyFigure(c, nx, ground - bodyH * 0.34, bodyH * 0.26, { ...paperDinerLookFor({ id: `statue-${f}` }), skin: "#D8D2C0", shirt: "#D8D2C0", pants: "#CFC8B4", hair: "#CFC8B4" });
    });
  }
  // red carpet + gold rope L3
  if (lv >= 3) {
    p.rect(50 - W * 0.12, ground - 1.7, W * 0.24, 2.1, "#B91C1C", { r: 0.6 });
    [-0.14, 0.14].forEach((f) => {
      p.circle(50 + f * W, ground - 3.4, 1.5, GOLD, { shadow: false });
      p.rect(50 + f * W - 0.6, ground - 3.4, 1.2, 2.6, "#8A6D1C", { shadow: false, r: 0.4 });
    });
  }
  paperDoor(c, 50, 18, bodyH * 0.4, "#78350F", "#5E2008", lit(seed, 9) ? LIT : undefined);
}

function sceneMuseum(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 86;
  const x0 = 7;
  const bodyH = rows * 0.42;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 50, 1.7, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.075} ${x0 + W + 2},${bodyY + 1.5}`, "#57534E");
  p.rect(x0, bodyY, W, bodyH, "#F5F5F4", { r: 1.4 });
  // entablature band + columns
  p.rect(x0 + 2, bodyY + bodyH * 0.1, W - 4, bodyH * 0.12, "#E7E5E4", { shadow: false, r: 0.7 });
  [0.08, 0.26, 0.74, 0.92].forEach((f) => p.rect(x0 + W * f - 2.3, bodyY + bodyH * 0.26, 4.6, bodyH * 0.74, "#E7E5E4", { r: 0.7 }));
  // exhibit windows: framed landscape + vase
  [-0.24, 0.24].forEach((f, i) => {
    p.rect(50 + f * W - W * 0.11, bodyY + bodyH * 0.34, W * 0.22, bodyH * 0.4, "#FFFBEB", { r: 0.7 });
    if (i === 0) {
      p.poly(`${50 + f * W - W * 0.08},${bodyY + bodyH * 0.7} ${50 + f * W - W * 0.02},${bodyY + bodyH * 0.5} ${50 + f * W + W * 0.02},${bodyY + bodyH * 0.6} ${50 + f * W + W * 0.08},${bodyY + bodyH * 0.7}`, "#4C9A50");
    } else {
      p.path(`M ${50 + f * W - 2.6} ${bodyY + bodyH * 0.7} C ${50 + f * W - 3.4} ${bodyY + bodyH * 0.58} ${50 + f * W - 1.4} ${bodyY + bodyH * 0.52} ${50 + f * W - 1} ${bodyY + bodyH * 0.44} L ${50 + f * W + 1} ${bodyY + bodyH * 0.44} C ${50 + f * W + 1.4} ${bodyY + bodyH * 0.52} ${50 + f * W + 3.4} ${bodyY + bodyH * 0.58} ${50 + f * W + 2.6} ${bodyY + bodyH * 0.7} Z`, "#A16207");
    }
  });
  // statue on the steps L3
  if (lv >= 3) {
    p.rect(x0 + W * 0.02, ground - bodyH * 0.12, 6, bodyH * 0.12, "#D6D3D1", { shadow: false, r: 0.6 });
    tinyFigure(c, x0 + W * 0.02 + 3, ground - bodyH * 0.12, bodyH * 0.3, { ...paperDinerLookFor({ id: "statue-museum" }), skin: "#D8D2C0", shirt: "#D8D2C0", pants: "#CFC8B4", hair: "#CFC8B4" });
  }
  paperDoor(c, 50, 17, bodyH * 0.38, "#44403C", "#292524", lit(seed, 9) ? LIT : undefined);
}

function sceneClockTower(c: Ctx) {
  const { p, rows, ground, lv, night } = c;
  const W = 40;
  const x0 = 30;
  const bodyH = rows * 0.72;
  const bodyY = ground - bodyH;
  p.ellipse(50, ground + 0.5, 26, 1.5, PAPER_SHADOW, { shadow: false });
  // spire + finial
  p.poly(`${x0 - 3},${bodyY + 1.5} 50,${bodyY - rows * 0.12} ${x0 + W + 3},${bodyY + 1.5}`, "#334155");
  p.circle(50, bodyY - rows * 0.125, 2, GOLD, { shadow: false });
  p.rect(x0, bodyY, W, bodyH, "#E2E8F0", { r: 1.3 });
  // the clock face — cream by day, glowing gold after dark
  const clockR = W * 0.34;
  const clockY = bodyY + bodyH * 0.2;
  p.circle(50, clockY, clockR + 1.4, "#334155", { shadow: false });
  p.circle(50, clockY, clockR, night ? "#FDE68A" : "#FFFBEB", { shadow: false });
  p.line(50, clockY, 50, clockY - clockR * 0.62, "#1F2937", 1.1);
  p.line(50, clockY, 50 + clockR * 0.45, clockY + clockR * 0.3, "#1F2937", 1.1);
  p.circle(50, clockY, 1.3, "#1F2937", { shadow: false });
  // belfry slats + small windows down the shaft
  [0.48, 0.66, 0.84].forEach((f, i) => {
    if (i === 0) {
      [0, 1, 2].forEach((s2) => p.rect(50 - W * 0.16, bodyY + bodyH * f, W * 0.32, 1.6, "#475569", { shadow: false, r: 0.5 }));
    } else {
      archedWin(c, 50 - 4.5, bodyY + bodyH * f, 9, bodyH * 0.1, night ? LIT : "#BFDBFE", "#334155");
    }
  });
  paperDoor(c, 50, 13, bodyH * 0.16, "#1E293B", "#0F172A");
  if (lv >= 3) {
    plantPot(c, x0 - 2, ground, true);
    plantPot(c, x0 + W + 2, ground, true);
  }
}

function sceneMainOffice(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 80;
  const x0 = 10;
  const bodyH = rows * 0.4;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  const glass = (j: number) => (lit(seed, j) ? LIT : "#BFDBFE");
  p.ellipse(50, ground + 0.5, 47, 1.7, PAPER_SHADOW, { shadow: false });
  p.rect(x0 - 1.5, bodyY - rows * 0.05, W + 3, rows * 0.05, "#1F2937", { r: 1 });
  p.rect(x0, bodyY, W, bodyH, "#F8FAFC", { r: 1.4 });
  // crest medallion + name band (drawn bars, like the storybook's)
  medallion(c, 50, bodyY + bodyH * 0.1, 7.4, "star", "#FFF8E7", "#1F2937");
  [0.34, 0.44, 0.54].forEach((f) => p.rect(50 - 8, bodyY + bodyH * f, 16, 1.5, "#CBD5E1", { shadow: false, r: 0.6 }));
  archedWin(c, x0 + W * 0.07, bodyY + bodyH * 0.24, 12, bodyH * 0.36, glass(0), "#1F2937");
  archedWin(c, x0 + W * 0.93 - 12, bodyY + bodyH * 0.24, 12, bodyH * 0.36, glass(1), "#1F2937");
  paperDoor(c, 50, 17, bodyH * 0.4, "#1F2937", "#0F172A", glass(9));
  if (lv >= 2) {
    [x0 + W * 0.04, x0 + W * 0.96].forEach((lx) => {
      p.line(lx, ground, lx, ground - bodyH * 0.52, "#475569", 0.6);
      p.ellipse(lx, ground - bodyH * 0.56, 2.7, 3.5, "#FDE68A");
    });
  }
  if (lv >= 3) {
    plantPot(c, x0 + W * 0.3, ground, true);
    plantPot(c, x0 + W * 0.7, ground, true);
  }
}

function sceneBellTower(c: Ctx, blessed: boolean) {
  const { p, rows, ground, lv, night } = c;
  const W = 38;
  const x0 = 31;
  const bodyH = rows * 0.66;
  const bodyY = ground - bodyH;
  p.ellipse(50, ground + 0.5, 25, 1.5, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 3},${bodyY + 1.5} 50,${bodyY - rows * 0.11} ${x0 + W + 3},${bodyY + 1.5}`, "#6B4A2F");
  crossTop(c, 50, bodyY - rows * 0.11 + 0.5, rows * 0.07, GOLD);
  p.rect(x0, bodyY, W, bodyH, "#F3E9CF", { r: 1.3 });
  // open belfry arch + the bell (gold when rung)
  const archY = bodyY + bodyH * 0.1;
  p.path(`M ${50 - W * 0.3} ${archY + bodyH * 0.3} L ${50 - W * 0.3} ${archY + W * 0.3} A ${W * 0.3} ${W * 0.3} 0 0 1 ${50 + W * 0.3} ${archY + W * 0.3} L ${50 + W * 0.3} ${archY + bodyH * 0.3} Z`, "#2E2118", { shadow: false });
  bellShape(c, 50, archY + bodyH * 0.16, W * 0.24, blessed ? "#E9C767" : "#A8843C");
  // rope down the shaft
  p.line(50 + W * 0.34, archY + bodyH * 0.3, 50 + W * 0.34, ground - bodyH * 0.2, "#8A5A2B", 0.7);
  archedWin(c, 50 - 4.5, bodyY + bodyH * 0.58, 9, bodyH * 0.14, night ? LIT : "#FDE68A", "#6B4A2F");
  paperDoor(c, 50, 13, bodyH * 0.2, "#6B4423", "#4A2F18");
  if (lv >= 3) {
    plantPot(c, x0 - 2.5, ground, true);
    plantPot(c, x0 + W + 2.5, ground, true);
  }
}

function sceneBanquet(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 88;
  const x0 = 6;
  const bodyH = rows * 0.44;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 51, 1.8, PAPER_SHADOW, { shadow: false });
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.08} ${x0 + W + 2},${bodyY + 1.5}`, "#7C2D3E");
  p.rect(x0, bodyY, W, bodyH, "#FFF9EC", { r: 1.4 });
  // goblet medallion + chandeliers
  medallion(c, 50, bodyY + bodyH * 0.04, 8.4, "goblet", "#FFF8E7", "#7C2D3E");
  [0.22, 0.78].forEach((f) => {
    const cx2 = x0 + W * f;
    p.line(cx2, bodyY + bodyH * 0.12, cx2, bodyY + bodyH * 0.22, "#8A6D1C", 0.6);
    [-2.6, 0, 2.6].forEach((dx) => p.circle(cx2 + dx, bodyY + bodyH * 0.26, 1.5, night || lit(seed, 3) ? "#FDE68A" : "#F3C96B", { shadow: false }));
    p.rect(cx2 - 4.4, bodyY + bodyH * 0.28, 8.8, 1.4, GOLD, { shadow: false, r: 0.6 });
  });
  // the long table seen through the great window
  const tw = W * 0.56;
  const tx = 50 - tw / 2;
  const ty = bodyY + bodyH * 0.4;
  p.rect(tx - 1, ty - 1, tw + 2, bodyH * 0.34 + 2, "#7C2D3E", { shadow: false, r: 1 });
  p.rect(tx, ty, tw, bodyH * 0.34, night ? "#FDE68A" : "#FFF3C4", { shadow: false, r: 0.7 });
  p.rect(tx + tw * 0.08, ty + bodyH * 0.18, tw * 0.84, 2, "#FFFFFF", { shadow: false, r: 0.6 });
  [0.2, 0.4, 0.6, 0.8].forEach((f) => p.circle(tx + tw * f, ty + bodyH * 0.12, 1.6, "#C4493B", { shadow: false }));
  // columns L2; named seats L3 (little gold place cards)
  if (lv >= 2) {
    [0.06, 0.94].forEach((f) => p.rect(x0 + W * f - 2.4, bodyY + bodyH * 0.3, 4.8, bodyH * 0.7, "#F5E6C8", { r: 0.7 }));
  }
  if (lv >= 3) {
    [0.25, 0.5, 0.75].forEach((f) => p.rect(tx + tw * f - 2.4, ty + bodyH * 0.22, 4.8, 2.6, GOLD, { shadow: false, r: 0.5 }));
  }
  paperDoor(c, x0 + W * 0.06 + 5, 10, bodyH * 0.36, "#7C2D3E", "#5E1F2C");
}

function sceneGarden(c: Ctx) {
  const { p, rows, ground, lv } = c;
  const W = 88;
  const x0 = 6;
  const plotY = ground - rows * 0.34;
  p.ellipse(50, ground + 0.5, 51, 1.8, PAPER_SHADOW, { shadow: false });
  // soil plot + crop rows
  p.rect(x0, plotY, W, rows * 0.34, "#8A5A2B", { r: 1.2 });
  p.rect(x0, plotY, W, rows * 0.34, "#000000", { shadow: false, opacity: 0.08, r: 1.2 });
  const rowCols = ["#4C9A50", "#65A30D", "#F59E0B", "#DC2626"];
  for (let r = 0; r < 3; r++) {
    for (let i = 0; i < 7; i++) {
      const cx2 = x0 + W * (0.1 + i * 0.135);
      const cy2 = plotY + rows * (0.09 + r * 0.1);
      p.circle(cx2, cy2, 2.4 - r * 0.3, rowCols[(r + i) % 4], { shadow: false });
      p.circle(cx2, cy2 - 1.6, 1.1, "#7FB069", { shadow: false });
    }
  }
  // picket fence across the front
  for (let i = 0; i < 11; i++) {
    const fx = x0 + 2 + i * ((W - 4) / 10);
    p.poly(`${fx - 1.5},${ground} ${fx - 1.5},${ground - rows * 0.1} ${fx},${ground - rows * 0.13} ${fx + 1.5},${ground - rows * 0.1} ${fx + 1.5},${ground}`, "#FFF7E6");
  }
  p.rect(x0 + 1, ground - rows * 0.075, W - 2, 1.6, "#F3E9CF", { shadow: false, r: 0.6 });
  // trellis + vines L2; scarecrow L3
  if (lv >= 2) {
    [x0 + W * 0.06, x0 + W * 0.94].forEach((tx) => {
      p.rect(tx - 0.8, plotY - rows * 0.2, 1.6, rows * 0.2, "#8A5A2B", { shadow: false, r: 0.5 });
      p.rect(tx - 5, plotY - rows * 0.2, 10, 1.6, "#8A5A2B", { shadow: false, r: 0.5 });
      p.circle(tx - 2.5, plotY - rows * 0.14, 1.8, "#4C9A50", { shadow: false });
      p.circle(tx + 2.5, plotY - rows * 0.1, 1.8, "#65A30D", { shadow: false });
    });
  }
  if (lv >= 3) {
    const sx = 50;
    p.line(sx, plotY - rows * 0.02, sx, plotY - rows * 0.24, "#8A5A2B", 1.2);
    p.line(sx - 6, plotY - rows * 0.18, sx + 6, plotY - rows * 0.18, "#8A5A2B", 1.1);
    p.circle(sx, plotY - rows * 0.28, 3, "#F3C96B", { shadow: false });
    p.rect(sx - 4.4, plotY - rows * 0.28 - 2.6, 8.8, 2.2, "#B45309", { shadow: false, r: 0.6 });
    p.rect(sx - 3.4, plotY - rows * 0.17, 6.8, rows * 0.09, "#C4493B", { shadow: false, r: 0.6 });
  }
}

function sceneAmphitheater(c: Ctx) {
  const { p, rows, ground, lv, night } = c;
  const W = 88;
  const x0 = 6;
  const stageY = ground - rows * 0.3;
  p.ellipse(50, ground + 0.5, 51, 1.8, PAPER_SHADOW, { shadow: false });
  // shell: concentric paper arcs
  [0.46, 0.38, 0.3].forEach((rf, i) => {
    p.path(
      `M ${50 - W * rf} ${stageY + rows * 0.06} A ${W * rf} ${rows * rf * 0.95} 0 0 1 ${50 + W * rf} ${stageY + rows * 0.06} Z`,
      ["#E9D5B3", "#F5E6C8", "#FFF3D6"][i]
    );
  });
  // stage floor + backdrop glow at night
  p.rect(50 - W * 0.3, stageY, W * 0.6, rows * 0.1, "#8A5A2B", { r: 1 });
  if (night) p.ellipse(50, stageY - rows * 0.05, W * 0.2, rows * 0.08, "#FDE68A", { shadow: false, opacity: 0.5 });
  // tiered seating rows
  [0, 1, 2].forEach((r) => {
    const sy = ground - rows * 0.02 - r * rows * 0.055;
    p.rect(50 - W * (0.34 + r * 0.05), sy - rows * 0.045, W * (0.68 + r * 0.1), rows * 0.045, ["#D8C39A", "#CBB488", "#BFA678"][r], { r: 0.8 });
  });
  // music stands L2; banners L3
  if (lv >= 2) {
    [-0.14, 0.14].forEach((f) => {
      p.rect(50 + f * W - 3, stageY - rows * 0.07, 6, rows * 0.05, "#374151", { shadow: false, r: 0.5 });
      p.line(50 + f * W, stageY - rows * 0.02, 50 + f * W, stageY + rows * 0.02, "#374151", 0.7);
    });
  }
  if (lv >= 3) {
    [x0 + W * 0.03, x0 + W * 0.97].forEach((bx) => {
      p.line(bx, stageY - rows * 0.3, bx, stageY + rows * 0.04, "#5E3D22", 0.7);
      p.poly(`${bx},${stageY - rows * 0.3} ${bx + 7},${stageY - rows * 0.27} ${bx},${stageY - rows * 0.24}`, "#C4493B", { shadow: false });
    });
  }
}

function sceneFountain(c: Ctx) {
  const { p, rows, ground, lv, night } = c;
  p.ellipse(50, ground + 0.5, 40, 1.7, PAPER_SHADOW, { shadow: false });
  // plaza disc + basin
  p.ellipse(50, ground - rows * 0.02, 34, rows * 0.09, "#E7E0CE", { shadow: false });
  p.ellipse(50, ground - rows * 0.05, 26, rows * 0.07, "#BEE3F8");
  p.ellipse(50, ground - rows * 0.05, 26, rows * 0.07, "#7FB6D9", { shadow: false, opacity: 0.35 });
  // tiers
  p.rect(50 - 3.2, ground - rows * 0.3, 6.4, rows * 0.24, "#D8D2C0");
  p.ellipse(50, ground - rows * 0.3, 13, rows * 0.045, "#D8D2C0");
  p.ellipse(50, ground - rows * 0.3, 10.5, rows * 0.034, "#BEE3F8", { shadow: false });
  p.rect(50 - 2, ground - rows * 0.42, 4, rows * 0.12, "#D8D2C0", { shadow: false });
  p.ellipse(50, ground - rows * 0.42, 7.5, rows * 0.03, "#D8D2C0");
  p.ellipse(50, ground - rows * 0.42, 5.6, rows * 0.022, "#BEE3F8", { shadow: false });
  // water arcs — stroked paths, the painter's calm curves
  [-1, 0, 1].forEach((f) => {
    p.stroke(
      `M 50 ${ground - rows * 0.44} Q ${50 + f * 12} ${ground - rows * 0.52} ${50 + f * 16} ${ground - rows * 0.3}`,
      "#7FB6D9",
      1.4,
      0.85
    );
    p.stroke(
      `M 50 ${ground - rows * 0.32} Q ${50 + f * 16} ${ground - rows * 0.38} ${50 + f * 22} ${ground - rows * 0.12}`,
      "#7FB6D9",
      1.2,
      0.7
    );
  });
  // finial drop + night glow
  p.circle(50, ground - rows * 0.47, 1.7, "#7FB6D9", { shadow: false });
  if (night) p.ellipse(50, ground - rows * 0.3, 16, rows * 0.1, "#FDE68A", { shadow: false, opacity: 0.3 });
  // benches + lanterns L2; flower ring L3
  if (lv >= 2) {
    [16, 84].forEach((bx) => {
      p.rect(bx - 6, ground - rows * 0.06, 12, 2.2, "#8A5A2B", { shadow: false, r: 0.6 });
      p.ellipse(bx, ground - rows * 0.13, 2.4, 3.2, "#FDE68A");
    });
  }
  if (lv >= 3) {
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      p.circle(50 + Math.cos(a) * 31, ground - rows * 0.02 + Math.sin(a) * rows * 0.075, 1.6, i % 2 ? "#F9A8D4" : "#F472B6", { shadow: false });
    }
  }
}

function sceneApartments(c: Ctx) {
  const { p } = c;
  const top = c.rows * 0.02;
  const tall = drawTowerBody(c, 8, 46, top, "#D9A441", "#B57F24", "#7A4A21");
  towerWindows(c, tall.frontX + 2, top + c.rows * 0.1, tall.frontW - 4, c.rows * 0.72, 3, 2, "#92400E", 3);
  paperDoor(c, 8 + 46 * 0.44, 12, c.rows * 0.14, "#5E3D22", "#4A2F18");
  const shortTop = c.ground - c.rows * 0.62;
  const short = drawTowerBody(c, 56, 38, shortTop, "#E3B85C", "#C99B3F", "#8A5A2B");
  towerWindows(c, short.frontX + 2, shortTop + c.rows * 0.08, short.frontW - 4, c.rows * 0.44, 2, 2, "#92400E", 7);
  if (c.lv >= 2) {
    // a paper tree between the blocks
    paperTree(c, 53, c.ground, c.rows * 0.3);
  }
  if (c.lv >= 3) {
    // rooftop garden on the short block
    p.rect(56, shortTop - 3.4, 38, 3.2, "#4C9A50", { shadow: false, r: 0.8 });
    [62, 72, 82].forEach((fx) => p.circle(fx, shortTop - 4.4, 1.6, "#F472B6", { shadow: false }));
  }
}

function sceneBank(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 84;
  const x0 = 8;
  const bodyH = rows * 0.42;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 49, 1.7, PAPER_SHADOW, { shadow: false });
  // stone pediment + entablature
  p.poly(`${x0 - 2},${bodyY + 1.5} 50,${bodyY - rows * 0.075} ${x0 + W + 2},${bodyY + 1.5}`, "#44403C");
  p.rect(x0, bodyY, W, bodyH, "#E7E5E4", { r: 1.4 });
  p.rect(x0 + 2, bodyY + bodyH * 0.14, W - 4, bodyH * 0.1, "#D6D3D1", { shadow: false, r: 0.7 });
  // coin medallion in the pediment's heart
  medallion(c, 50, bodyY + bodyH * 0.05, 7.8, "coin", "#FFF8E7", "#44403C");
  // four stone columns
  [0.1, 0.3, 0.7, 0.9].forEach((f) => {
    p.rect(x0 + W * f - 2.6, bodyY + bodyH * 0.3, 5.2, bodyH * 0.7, "#F5F5F4", { r: 0.7 });
    p.rect(x0 + W * f - 3.3, bodyY + bodyH * 0.3, 6.6, 2.2, "#D6D3D1", { shadow: false, r: 0.6 });
  });
  // the vault window: a great round window, gold-lit at night
  roundWin(c, 50, bodyY + bodyH * 0.52, 7.4, lit(seed, 4) ? LIT : "#FDE68A", "#44403C");
  // double doors + steps (deeper at L2+); gold trim L3
  [-6.2, 6.2].forEach((dx) => {
    p.path(
      `M ${50 + dx - 5.2} ${ground} L ${50 + dx - 5.2} ${ground - bodyH * 0.3} A 5.2 5.2 0 0 1 ${50 + dx + 5.2} ${ground - bodyH * 0.3} L ${50 + dx + 5.2} ${ground} Z`,
      "#44403C"
    );
  });
  if (lv >= 2) {
    p.rect(50 - W * 0.2, ground - 1.7, W * 0.4, 2, "#D6D3D1", { r: 0.6 });
    p.rect(50 - W * 0.26, ground - 0.2, W * 0.52, 1.6, "#C9C4BC", { shadow: false, r: 0.6 });
  }
  if (lv >= 3) {
    p.rect(x0 + 3, bodyY + bodyH * 0.27, W - 6, 1.6, GOLD, { shadow: false, r: 0.8, opacity: 0.85 });
  }
}

function sceneCityMarket(c: Ctx) {
  const { p, rows, ground, lv, night, seed } = c;
  const W = 88;
  const x0 = 6;
  const bodyH = rows * 0.4;
  const bodyY = ground - bodyH;
  const lit = (i: number, j: number) => paperWindowLit(night, i, j, lv);
  p.ellipse(50, ground + 0.5, 51, 1.7, PAPER_SHADOW, { shadow: false });
  p.rect(x0 - 1.5, bodyY - rows * 0.05, W + 3, rows * 0.05, "#92400E", { r: 1 });
  p.rect(x0, bodyY, W, bodyH, "#FFF7E6", { r: 1.4 });
  // the great striped awning across the open front
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    p.rect(x0 - 1 + ((W + 2) / stripes) * i, bodyY + bodyH * 0.06, (W + 2) / stripes - 0.3, rows * 0.055, i % 2 ? "#FFFFFF" : "#DC2626", { shadow: false, r: 0.6 });
  }
  // apple medallion over the awning
  medallion(c, 50, bodyY + bodyH * 0.02, 7.6, "apple", "#FFF8E7", "#92400E");
  // three market stalls inside the open hall
  [-0.29, 0, 0.29].forEach((f, i) => {
    const sx = 50 + f * W;
    p.poly(`${sx - W * 0.13},${ground - bodyH * 0.52} ${sx + W * 0.13},${ground - bodyH * 0.52} ${sx + W * 0.09},${ground - bodyH * 0.7} ${sx - W * 0.09},${ground - bodyH * 0.7}`, ["#DC2626", "#F59E0B", "#16A34A"][i]);
    p.rect(sx - W * 0.14, ground - bodyH * 0.5, W * 0.28, bodyH * 0.34, "#D6D3D1", { shadow: false, r: 0.6 });
    [0.25, 0.5, 0.75].forEach((ff, k) =>
      p.circle(sx - W * 0.14 + W * 0.28 * ff, ground - bodyH * 0.42, 1.9, ["#DC2626", "#FACC15", "#65A30D"][(i + k) % 3], { shadow: false })
    );
  });
  // crates at the sides L2+; hanging bulbs under the awning L3
  if (lv >= 2) {
    [x0 + W * 0.02, x0 + W * 0.9].forEach((bx, i) => {
      p.rect(bx, ground - rows * 0.05, W * 0.09, rows * 0.05, "#C69A63", { r: 0.6 });
      p.circle(bx + W * 0.045, ground - rows * 0.038, 1.6, i ? "#F59E0B" : "#DC2626", { shadow: false });
    });
  }
  if (lv >= 3) {
    [0.16, 0.38, 0.62, 0.84].forEach((f, i) => {
      p.circle(x0 + W * f, bodyY + bodyH * 0.3, 1.8, night || lit(seed, i) ? "#FDE68A" : "#F3C96B", { shadow: false });
    });
  }
}

function sceneGeneric(c: Ctx, type: string) {
  // A type with no paper config and no bespoke scene (should not
  // happen — lib/paper-town guarantees full coverage and the guard
  // test pins it): a plain paper storefront keeps the map honest.
  const hash = paperHash(type);
  const hues = ["#FDE68A", "#FCA5A5", "#A7F3D0", "#BFDBFE", "#DDD6FE", "#FBCFE8"];
  drawStory(c, {
    wall: "#FFF7E6",
    roof: "#8A5A2B",
    ink: "#5E3D22",
    sign: "star",
    signBg: hues[hash % hues.length],
    door: "#6B4423",
  });
}

/* ------------------------------------------------------------------ */
/* The dispatch + the public renderers                                 */
/* ------------------------------------------------------------------ */

function drawSpecial(c: Ctx, type: string, props: PaperBuildingProps) {
  switch (type) {
    case "house": sceneHouse(c); break;
    case "villager-cottage": sceneCottage(c); break;
    case "farm": sceneFarm(c); break;
    case "church": sceneChurch(c, props.prayedCount ?? 0, !!props.blessed); break;
    case "chapel": sceneChapel(c); break;
    case "bank": sceneBank(c); break;
    case "city-market": sceneCityMarket(c); break;
    case "cinema": sceneCinema(c); break;
    case "theater": sceneTheater(c); break;
    case "hospital": sceneHospital(c); break;
    case "inn": sceneInn(c); break;
    case "carpenter": sceneCarpenter(c); break;
    case "pottery": scenePottery(c); break;
    case "tailor": sceneTailor(c); break;
    case "observatory": sceneObservatory(c); break;
    case "bathhouse": sceneBathhouse(c); break;
    case "town-hall": sceneTownHall(c); break;
    case "post-office": scenePostOffice(c); break;
    case "music-hall": sceneMusicHall(c); break;
    case "bible-study-hall": sceneBibleStudyHall(c); break;
    case "fasting-house": sceneFastingHouse(c); break;
    case "gym": sceneGym(c); break;
    case "outreach-center": sceneOutreach(c); break;
    case "opera-house": sceneOpera(c); break;
    case "museum": sceneMuseum(c); break;
    case "clock-tower": sceneClockTower(c); break;
    case "main-office": sceneMainOffice(c); break;
    case "bell-tower": sceneBellTower(c, !!props.blessed); break;
    case "banquet-table": sceneBanquet(c); break;
    case "community-garden": sceneGarden(c); break;
    case "amphitheater": sceneAmphitheater(c); break;
    case "fountain-plaza": sceneFountain(c); break;
    case "apartments": sceneApartments(c); break;
    default: sceneGeneric(c, type);
  }
}

/** Every building exterior on the maps, in paper. Same props as the
 *  storybook BuildingArt it replaces; size is the on-screen width. */
export const PaperBuildingArt = memo(function PaperBuildingArt(props: PaperBuildingProps) {
  const { type, size, level = 1, floors = 1, artH, night = false } = props;
  const rows = paperTownRows(size, artH);
  const height = (size * rows) / PAPER_TOWN_COLS;
  return (
    <View style={{ width: size, height }} pointerEvents="none">
      <PaperCanvas
        cols={PAPER_TOWN_COLS}
        rows={rows}
        unit={size / PAPER_TOWN_COLS}
        draw={(p) => {
          const c: Ctx = {
            p,
            rows,
            ground: rows - 1.2,
            lv: Math.max(1, Math.min(3, level)),
            night,
            seed: paperHash(type) % 7,
            floors,
          };
          const story = PAPER_STORY_CONFIGS[type];
          if (story) {
            drawStory(c, story);
            return;
          }
          if (PAPER_TOWER_CONFIGS[type]) {
            drawTower(c, type);
            return;
          }
          drawSpecial(c, type, props);
        }}
      />
    </View>
  );
});

/* ------------------------------------------------------------------ */
/* The special places — the map's landmarks, in paper. These render   */
/* wider than a building (the place scenes' own canvases), so they    */
/* use a 100x64 paper field: a portal grove, a dock, a garden gate,   */
/* the well, the mission trailhead. The Dark Forest landmark is a     */
/* town-map portal — dark paper trees; the forest INTERIOR stays      */
/* pixel, untouched.                                                  */
/* ------------------------------------------------------------------ */

const LANDMARK_ROWS = 64;

export function PaperLandmarkArt({ art, size }: { art: string; size: number }) {
  const rows = LANDMARK_ROWS;
  const height = (size * rows) / PAPER_TOWN_COLS;
  return (
    <View style={{ width: size, height }} pointerEvents="none">
      <PaperCanvas
        cols={PAPER_TOWN_COLS}
        rows={rows}
        unit={size / PAPER_TOWN_COLS}
        draw={(p) => {
          const c: Ctx = { p, rows, ground: rows - 2, lv: 1, night: false, seed: 3 };
          const ground = c.ground;
          switch (art) {
            case "dark-forest": {
              // dark paper pines over a shadow path + fireflies
              p.rect(2, 4, 96, ground - 2, "#22301F", { r: 3 });
              const pine = (cx: number, h: number, col: string) => {
                p.rect(cx - 1.4, ground - h * 0.22, 2.8, h * 0.22, "#3A2A1C", { shadow: false, r: 0.6 });
                [0.95, 0.68, 0.42].forEach((f, i) => {
                  p.poly(`${cx - h * 0.3 * f + 2},${ground - h * (0.16 + i * 0.24)} ${cx},${ground - h * (0.42 + i * 0.26)} ${cx + h * 0.3 * f - 2},${ground - h * (0.16 + i * 0.24)}`, col);
                });
              };
              pine(20, 44, "#2C4A2E");
              pine(38, 52, "#243D26");
              pine(62, 50, "#2C4A2E");
              pine(80, 42, "#243D26");
              p.poly(`44,${ground} 50,${ground - 26} 56,${ground} 52,${ground} 50,${ground - 20} 48,${ground}`, "#4A3A28", { shadow: false });
              [[30, 30], [70, 24], [58, 38], [42, 20]].forEach(([fx, fy]) =>
                p.circle(fx, fy, 1.3, "#FDE68A", { shadow: false, opacity: 0.9 })
              );
              break;
            }
            case "river-dock": {
              p.rect(2, 4, 96, ground - 2, "#BEE3F8", { r: 3 });
              [0.25, 0.45, 0.65].forEach((f) => {
                p.stroke(`M 8 ${ground - rows * f * 0.4} Q 30 ${ground - rows * f * 0.4 - 4} 52 ${ground - rows * f * 0.4} T 94 ${ground - rows * f * 0.4}`, "#7FB6D9", 1.6, 0.8);
              });
              // dock planks out over the water
              [0, 1, 2, 3].forEach((i) => {
                p.rect(38 + i * 6.4, ground - 14, 5.6, 12, "#A9743F", { shadow: false, r: 0.6 });
              });
              p.rect(36, ground - 15.5, 28, 2.4, "#8A5A2B", { r: 0.7 });
              // a little paper boat
              p.poly(`70,${ground - 6} 88,${ground - 6} 84,${ground - 1.5} 74,${ground - 1.5}`, "#C4493B");
              p.rect(78.4, ground - 13, 1.6, 7, "#8A5A2B", { shadow: false, r: 0.5 });
              p.poly(`80,${ground - 13} 86,${ground - 6.5} 80,${ground - 6.5}`, "#FFF7E6", { shadow: false });
              paperTree(c, 14, ground - 2, 26);
              break;
            }
            case "garden-gate": {
              p.rect(2, 4, 96, ground - 2, "#DDECC8", { r: 3 });
              // flower beds
              [0, 1].forEach((r) => {
                for (let i = 0; i < 6; i++) {
                  p.circle(12 + i * 13, ground - 6 - r * 7, 2.2, ["#F472B6", "#FACC15", "#FB923C"][i % 3], { shadow: false });
                  p.rect(12 + i * 13 - 0.5, ground - 4 - r * 7, 1, 3.4, "#4C9A50", { shadow: false, r: 0.4 });
                }
              });
              // the gate: two posts, an arch of vines, open doors
              [26, 74].forEach((gx) => p.rect(gx - 1.6, ground - 34, 3.2, 34, "#8A5A2B", { r: 0.7 }));
              p.stroke(`M 26 ${ground - 34} Q 50 ${ground - 48} 74 ${ground - 34}`, "#4C9A50", 2.6);
              [34, 44, 56, 66].forEach((fx, i) => p.circle(fx, ground - 40 + (i % 2) * 3, 2, i % 2 ? "#F9A8D4" : "#F472B6", { shadow: false }));
              [30, 70].forEach((gx, side) => {
                p.rect(gx - 1, ground - 26, 2, 26, "#A9743F", { shadow: false, r: 0.5, rot: { deg: side ? -14 : 14, cx: gx, cy: ground } });
              });
              break;
            }
            case "well": {
              p.rect(2, 4, 96, ground - 2, "#E7E0CE", { r: 3 });
              // stone ring: layered paper stones
              const ringY = ground - 12;
              [0, 1].forEach((r) => {
                for (let i = 0; i < 5; i++) {
                  p.rect(34 + i * 6.6 + (r ? 3.3 : 0), ringY + r * 5.6, 6, 5.2, r ? "#CFC8B4" : "#D8D2C0", { shadow: false, r: 1 });
                }
              });
              p.ellipse(50, ringY, 17, 4.6, "#3E5C76");
              p.ellipse(50, ringY, 13.5, 3.4, "#7FB6D9", { shadow: false });
              // posts + little roof + bucket on a rope
              [35, 65].forEach((px) => p.rect(px - 1.4, ringY - 26, 2.8, 26, "#8A5A2B", { r: 0.6 }));
              p.poly(`30,${ringY - 24} 50,${ringY - 36} 70,${ringY - 24}`, "#9A3412");
              p.line(50, ringY - 25, 50, ringY - 8, "#5E3D22", 0.8);
              p.poly(`46,${ringY - 8} 54,${ringY - 8} 52.6,${ringY - 2.5} 47.4,${ringY - 2.5}`, "#78716C");
              break;
            }
            case "mission-field": {
              p.rect(2, 4, 96, ground - 2, "#F3E3B3", { r: 3 });
              // a trail winding out through wheat
              p.stroke(`M 14 ${ground} C 34 ${ground - 16} 30 ${ground - 30} 50 ${ground - 38} C 66 ${ground - 45} 74 ${ground - 52} 84 ${ground - 58}`, "#D9B96A", 5);
              p.stroke(`M 14 ${ground} C 34 ${ground - 16} 30 ${ground - 30} 50 ${ground - 38} C 66 ${ground - 45} 74 ${ground - 52} 84 ${ground - 58}`, "#C4A355", 1.4);
              // wheat tufts
              [[18, 18], [30, 34], [58, 14], [72, 30], [44, 44], [84, 44], [24, 50]].forEach(([fx, fy]) => {
                p.line(fx, ground - fy + 8, fx, ground - fy, "#B45309", 0.9);
                p.ellipse(fx - 2, ground - fy, 1.3, 2, "#E8A84C", { shadow: false, rot: { deg: -22, cx: fx - 2, cy: ground - fy } });
                p.ellipse(fx + 2, ground - fy, 1.3, 2, "#E8A84C", { shadow: false, rot: { deg: 22, cx: fx + 2, cy: ground - fy } });
              });
              // a signpost at the trailhead
              p.rect(12, ground - 20, 2.4, 20, "#8A5A2B", { r: 0.6 });
              p.rect(8, ground - 20, 15, 4.6, "#A9743F", { r: 0.8 });
              p.rect(10.5, ground - 18.2, 10, 1.2, "#FFF7E6", { shadow: false, r: 0.5 });
              break;
            }
            default: {
              p.rect(6, 6, 88, ground - 8, "#DDECC8", { r: 3 });
              paperTree(c, 50, ground, 34);
            }
          }
        }}
      />
    </View>
  );
}
