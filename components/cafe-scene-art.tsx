// ─────────────────────────────────────────────────────────────────────────────
// v287 — The Café Is a Place: the café street vignette, drawn at scene
// scale in the approved language (hometown-blend-howitplays-v2.html's
// six street scenes + hometown-welcome-stage2-v3.html's dress rules).
//
// One composed PaperCanvas: layered paper depth (hills, the town's own
// rooftops, then the street), ONE light per phase (dawn gold / midday /
// dusk amber with long shadows east / night), and the café built to
// the standing construction rules — chimney seated into the roofline
// with its base merged below it, every window a square IN a wall,
// the building flush on the ground on its foundation strip with a
// path from the door to the street, nothing floating unattached.
//
// This file only draws. The people, the board's tickets, and every
// number come from lib/cafe-street.ts derivations, composed by
// components/cafe-scene.tsx; the route is app/cafe-street-scene.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { memo } from "react";
import { PaperCanvas, type PaperPainter } from "@/components/paper-interior";
import { HORIZON_DRESS, PHASE_WASH, type DayPhase } from "@/lib/welcoming-town";
import type { CafeOvenState } from "@/lib/cafe-street";

export const CAFE_SCENE_COLS = 78;
export const CAFE_SCENE_ROWS = 62;

/** Scene-unit layout shared by the canvas and the figure/text overlays. */
export const CAFE_LAYOUT = {
  cafeWall: { x: 13.5, y: 20, w: 25, h: 19.5 },
  doorCx: 26,
  groundY: 41.2,
  tablesX: [16.5, 24.5, 32.5],
  tableTopY: 45.3,
  servedFeetY: 49.5,
  servedDx: 5.4,
  slipCx: 31.5,
  slipFeetY: 44.8,
  boardPanel: { x: 45, y: 26, w: 16, h: 18 },
  heroFeet: { x: 42, y: 53 },
  weekLot: { x: 63, y: 53, w: 14, h: 8 },
} as const;

type PhasePalette = {
  sky: string;
  grass: string;
  street: string;
  windowsLit: boolean;
  sun: { cx: number; cy: number; r: number; fill: string } | null;
  moon: boolean;
  longShadows: boolean;
  lampLit: boolean;
};

const PHASE_PALETTE: Record<DayPhase, PhasePalette> = {
  dawn: { sky: "#F3C98A", grass: "#A9BC7A", street: "#D9B98A", windowsLit: true, sun: { cx: 68, cy: 10, r: 3.4, fill: "#FFDF9E" }, moon: false, longShadows: false, lampLit: false },
  day: { sky: "#BFE0EC", grass: "#9DBE6E", street: "#DEC39A", windowsLit: false, sun: { cx: 70, cy: 5.5, r: 3.2, fill: "#FFF3B0" }, moon: false, longShadows: false, lampLit: false },
  dusk: { sky: "#E79A63", grass: "#8FA35E", street: "#CFA87E", windowsLit: true, sun: { cx: 66, cy: 11, r: 3.6, fill: "#FFB35C" }, moon: false, longShadows: true, lampLit: true },
  night: { sky: "#2C3A56", grass: "#5E7350", street: "#8A7358", windowsLit: true, sun: null, moon: true, longShadows: false, lampLit: true },
};

const WALL = "#F0D9A8";
const SHEET_FAR = "#D9BE94";
const SHEET_NEAR = "#E8D3A8";
const ROOF = "#8A4A34";
const ROOF_DEEP = "#6E3826";
const CHIMNEY = "#9A6A48";
const FOUNDATION = "#8A6A4E";
const DOOR = "#6B4226";
const DOOR_DEEP = "#54341E";
const FRAME = "#FFF3D0";
const GLASS_DARK = "#B9CBD6";
const GLASS_LIT = "#FFD873";
const WOOD = "#8A5A3B";
const WOOD_DEEP_POST = "#7A4A2E";
const BOARD_WOOD = "#9A6A42";
const BOARD_INSET = "#86603C";
const BOARD_HEAD = "#8A4A34";
const TABLE_TOP = "#FFF6E2";
const SOIL = "#6B4A2B";
const SOIL_ROW = "#54371F";
const ROPE = "#D9CDB4";
const GOLD_COIN = "#F2C14E";
const GOLD_EDGE = "#B8860B";

function drawCafe(p: PaperPainter, pal: PhasePalette, oven: CafeOvenState, lit: boolean) {
  const w = CAFE_LAYOUT.cafeWall;
  const wallBottom = w.y + w.h; // 39.5 — the wall stands IN the foundation

  // contact shadow — the ground's own shade, not a hover gap
  p.ellipse(26, 41.6, 15.5, 1.15, "rgba(90,60,20,0.22)", { shadow: false });

  // backing-paper sheets (two pages, the under one offset down-right —
  // the scene's one light), behind wall and roof alike
  p.rect(w.x - 1.5 + 0.9, w.y - 3.5 + 0.9, w.w + 3, w.h + 6.5, SHEET_FAR, { shadow: false, r: 1.6 });
  p.rect(w.x - 1.5, w.y - 3.5, w.w + 3, w.h + 6.5, SHEET_NEAR, { shadow: false, r: 1.6 });

  // the chimney, drawn before the roof so its base merges INTO the
  // roofline: it stands from y9.5 down to y18, and the roof's slope at
  // its x crosses y15.7 — the stack's foot is inside the roof, seated,
  // never floating beside it
  p.rect(33.4, 9.5, 2.6, 8.5, CHIMNEY, { r: 0.5 });
  p.rect(33.1, 9.2, 3.2, 1.1, ROOF_DEEP, { r: 0.4 });
  if (oven === "lit") {
    // smoke curls from the stack while the ovens breathe
    p.stroke("M34.7 8.4 C33.4 6.4 36 5.6 34.9 3.8 C34.1 2.5 35.4 1.6 35 0.4", "#FFFFFF", 0.85, 0.55);
    p.circle(35.4, 1.2, 0.75, "#FFFFFF", { shadow: false, opacity: 0.4 });
  }

  // the roof in two layers — a darker cutout offset beneath the cap
  p.poly("11,21.4 26,12.9 41,21.4", ROOF_DEEP, { shadow: false });
  p.poly("11,20.2 26,11.7 41,20.2", ROOF, { shadow: false });

  // the wall, flush on the ground line
  p.rect(w.x, w.y, w.w, w.h, WALL, { r: 1.1 });
  // the foundation course — the wall stands in it, base on the ground
  p.rect(w.x - 0.5, wallBottom, w.w + 1, 1.7, FOUNDATION, { r: 0.5 });

  // windows IN the wall — squares inside the wall's own bounds
  const winGlass = lit ? GLASS_LIT : GLASS_DARK;
  for (const wx of [16, 21.2]) {
    p.rect(wx - 0.45, 25.6, 5.9, 6.9, FRAME, { shadow: false, r: 0.7 });
    p.rect(wx, 26, 5, 6, winGlass, { shadow: false, r: 0.5 });
    p.line(wx + 2.5, 26, wx + 2.5, 32, FRAME, 0.45);
    p.line(wx, 29, wx + 5, 29, FRAME, 0.45);
    if (lit) p.glow(wx + 2.5, 29, 4.6, "#FFC65C", 0.35);
  }

  // the oven window in the café front — a dark mouth with a heart of
  // fire and bread in the window while the fast feeds the day; slate
  // and cold on a missed day; plain glass when there is no fast
  const ox = 30.6;
  const oy = 25.6;
  p.rect(ox - 0.45, oy - 0.45, 8.4, 7.4, "#4A3220", { shadow: false, r: 0.8 });
  if (oven === "none") {
    p.rect(ox, oy, 7.5, 6.5, winGlass, { shadow: false, r: 0.5 });
  } else if (oven === "lit") {
    p.rect(ox, oy, 7.5, 6.5, "#2E1A0E", { shadow: false, r: 0.5 });
    p.ellipse(ox + 3.75, oy + 4.4, 2.6, 1.7, "#FF7A2E", { shadow: false });
    p.ellipse(ox + 3.75, oy + 4.7, 1.7, 1.15, "#FFB347", { shadow: false });
    p.ellipse(ox + 3.75, oy + 5, 0.9, 0.65, "#FFD23E", { shadow: false });
    // three loaves on the sill, in the window
    for (const lx of [ox + 0.7, ox + 2.9, ox + 5.1]) {
      p.rect(lx, oy + 5.6, 1.9, 0.95, "#E8B06A", { shadow: false, r: 0.45 });
    }
    p.glow(ox + 3.75, oy + 3.2, 6.4, "#FF9A3D", 0.4);
  } else {
    p.rect(ox, oy, 7.5, 6.5, "#2E3440", { shadow: false, r: 0.5 });
    p.line(ox + 0.8, oy + 5.6, ox + 6.7, oy + 0.9, "#475569", 0.5);
  }

  // the door — open, with its light pooling onto the path
  p.path("M23.8 39.5 L23.8 30.6 Q26 27.9 28.2 30.6 L28.2 39.5 Z", DOOR, { shadow: false });
  p.path("M28.2 30.6 L30.1 31.7 L30.1 39.5 L28.2 39.5 Z", DOOR_DEEP, { shadow: false });
  p.ellipse(26, 40.6, 3.4, 0.85, "#3A2410", { shadow: false, opacity: 0.35 });
  if (lit) p.glow(26, 41.6, 5.2, "#FFC65C", 0.45);
  // the path — from the doorstep to the street, so the door is
  // connected to the lane, never marooned on the grass
  p.poly("23.9,41.2 28.1,41.2 30.2,52 21.8,52", "#E7D3AC", { shadow: false, opacity: 0.85 });

  // the striped awning, seated ON the storefront (its top edge inside
  // the wall, its scallops hanging over the windows and door)
  const awnY = 23.6;
  const awnX = 12.9;
  const segW = 26.2 / 8;
  for (let i = 0; i < 8; i++) {
    const fill = i % 2 ? "#FFF3D9" : "#B4503C";
    p.rect(awnX + i * segW, awnY, segW + 0.06, 3.1, fill, { shadow: false, r: 0.3 });
    p.circle(awnX + i * segW + segW / 2, awnY + 3.1, segW / 2, fill, { shadow: false });
  }
}

function drawCottage(p: PaperPainter, pal: PhasePalette, wakeLit: boolean) {
  // the neighbouring cottage — it wakes the same way the café does:
  // seated chimney, windows in its wall, flush on its foundation
  p.ellipse(6, 36.4, 5.6, 0.8, "rgba(90,60,20,0.2)", { shadow: false });
  p.rect(8.55, 18.6, 1.7, 6, CHIMNEY, { shadow: false, r: 0.4 });
  if (wakeLit) p.stroke("M9.4 17.8 C8.6 16.4 10 15.8 9.3 14.6", "#FFFFFF", 0.6, 0.45);
  p.poly("0.9,23.6 6,18.1 11.1,23.6", ROOF_DEEP, { shadow: false });
  p.poly("0.9,22.8 6,17.3 11.1,22.8", "#8A5A3B", { shadow: false });
  p.rect(2.2, 22.8, 7.6, 12.2, "#EFE0C0", { shadow: false, r: 0.9 });
  p.rect(1.8, 35, 8.4, 1.3, FOUNDATION, { shadow: false, r: 0.4 });
  p.rect(3.9, 26.6, 2.7, 3.3, FRAME, { shadow: false, r: 0.4 });
  p.rect(4.15, 26.85, 2.2, 2.8, wakeLit || pal.windowsLit ? GLASS_LIT : GLASS_DARK, { shadow: false, r: 0.3 });
  if (wakeLit || pal.windowsLit) p.glow(5.25, 28.2, 3, "#FFC65C", 0.32);
  p.rect(7.5, 29, 2, 6, DOOR, { shadow: false, r: 0.4 });
}

function drawTable(p: PaperPainter, cx: number, served: boolean) {
  const topY = CAFE_LAYOUT.tableTopY;
  p.rect(cx - 0.35, topY + 0.4, 0.7, 3.6, WOOD, { shadow: false });
  p.ellipse(cx, topY + 4.3, 2.2, 0.5, "rgba(90,60,20,0.18)", { shadow: false });
  p.ellipse(cx, topY, 3.4, 1.15, TABLE_TOP, { shadow: false });
  if (served) {
    // a plate and a cup — the order, on the table
    p.ellipse(cx - 1, topY - 0.15, 1.15, 0.45, "#FFFFFF", { shadow: false });
    p.ellipse(cx - 1, topY - 0.15, 0.7, 0.27, "#E9DFC8", { shadow: false });
    p.rect(cx + 1.1, topY - 1.05, 0.95, 1.1, "#B4503C", { shadow: false, r: 0.25 });
  }
}

function drawBoardShell(p: PaperPainter) {
  const b = CAFE_LAYOUT.boardPanel;
  // two posts standing IN the ground, the panel seated on them
  p.rect(b.x + 1.6, b.y + b.h, 1.1, 8, WOOD_DEEP_POST, { shadow: false, r: 0.4 });
  p.rect(b.x + b.w - 2.7, b.y + b.h, 1.1, 8, WOOD_DEEP_POST, { shadow: false, r: 0.4 });
  p.ellipse(b.x + b.w / 2, b.y + b.h + 8.2, 7.5, 0.8, "rgba(90,60,20,0.2)", { shadow: false });
  p.rect(b.x, b.y, b.w, b.h, BOARD_INSET, { shadow: false, r: 1.3 });
  p.rect(b.x + 0.7, b.y + 0.7, b.w - 1.4, b.h - 1.4, BOARD_WOOD, { shadow: false, r: 1 });
  p.rect(b.x, b.y, b.w, 3.8, BOARD_HEAD, { shadow: false, r: 1.1 });
}

function drawRegister(p: PaperPainter, earnings: number) {
  // the register table by the café — the day's coins PILED on it,
  // waiting. Drawn only; collecting stays on the street, as ever.
  p.rect(64.4, 42.6, 10.6, 1.1, WOOD, { shadow: false, r: 0.4 });
  p.rect(65.1, 43.7, 0.8, 4.6, WOOD_DEEP_POST, { shadow: false });
  p.rect(73.5, 43.7, 0.8, 4.6, WOOD_DEEP_POST, { shadow: false });
  p.ellipse(69.7, 48.6, 5.6, 0.7, "rgba(90,60,20,0.18)", { shadow: false });
  if (earnings > 0) {
    p.circle(67.2, 41.9, 1.05, GOLD_COIN, { shadow: false });
    p.circle(69.7, 42.1, 1.05, GOLD_COIN, { shadow: false });
    p.circle(72.2, 41.9, 1.05, GOLD_COIN, { shadow: false });
    p.circle(68.4, 40.6, 1.05, GOLD_COIN, { shadow: false });
    p.circle(71, 40.7, 1.05, GOLD_COIN, { shadow: false });
    p.circle(69.7, 39.4, 1.05, GOLD_COIN, { shadow: false });
  }
}

function drawWeekLot(p: PaperPainter, weeks: number) {
  if (weeks < 1) return;
  const l = CAFE_LAYOUT.weekLot;
  // fresh soil at the street's end, roped off, the lot the fast opened
  p.rect(l.x, l.y, l.w, l.h, SOIL, { shadow: false, r: 1 });
  for (let i = 1; i <= 3; i++) {
    p.line(l.x + 1, l.y + i * 2, l.x + l.w - 1, l.y + i * 2, SOIL_ROW, 0.55);
  }
  // the rope on its four corner posts
  for (const [px, py] of [
    [l.x - 0.4, l.y - 0.6],
    [l.x + l.w - 0.4, l.y - 0.6],
    [l.x - 0.4, l.y + l.h - 0.4],
    [l.x + l.w - 0.4, l.y + l.h - 0.4],
  ] as const) {
    p.rect(px, py, 0.85, 1.7, WOOD_DEEP_POST, { shadow: false, r: 0.3 });
  }
  p.line(l.x + 0.4, l.y + 0.1, l.x + l.w + 0.4, l.y + 0.1, ROPE, 0.5, "1.4 1.1");
  p.line(l.x + 0.4, l.y + l.h + 0.6, l.x + l.w + 0.4, l.y + l.h + 0.6, ROPE, 0.5, "1.4 1.1");
  p.line(l.x + 0.05, l.y + 0.2, l.x + 0.05, l.y + l.h + 0.4, ROPE, 0.5, "1.4 1.1");
  p.line(l.x + l.w + 0.35, l.y + 0.2, l.x + l.w + 0.35, l.y + l.h + 0.4, ROPE, 0.5, "1.4 1.1");
}

export const CafeSceneCanvas = memo(function CafeSceneCanvas(props: {
  phase: DayPhase;
  oven: CafeOvenState;
  servedCount: number;
  anyoneServed: boolean;
  weekLots: number;
  earnings: number;
  width: number;
}) {
  const { phase, oven, servedCount, anyoneServed, weekLots, earnings, width } = props;
  const pal = PHASE_PALETTE[phase];
  const horizon = HORIZON_DRESS[phase];
  const unit = width / CAFE_SCENE_COLS;
  const lit = pal.windowsLit || oven === "lit";

  return (
    <PaperCanvas
      cols={CAFE_SCENE_COLS}
      rows={CAFE_SCENE_ROWS}
      unit={unit}
      draw={(p) => {
        // sky, then the layered depth: far hills, near hills, and the
        // town's own rooftops (their chimney nubs seated on the
        // rooflines, their windows lit when the phase lights them)
        p.rect(0, 0, CAFE_SCENE_COLS, CAFE_SCENE_ROWS, pal.sky, { shadow: false, r: 0 });
        if (phase === "night") {
          for (const [sx, sy] of [[8, 3], [20, 6], [34, 2.4], [48, 5], [58, 2.8], [74, 6.4]] as const) {
            p.circle(sx, sy, 0.32, "#FFF6E2", { shadow: false, opacity: 0.8 });
          }
        }
        if (pal.sun) p.circle(pal.sun.cx, pal.sun.cy, pal.sun.r, pal.sun.fill, { shadow: false });
        if (pal.moon) {
          p.circle(69, 5, 2.6, "#F5EFE0", { shadow: false });
          p.circle(68.2, 4.4, 2.2, pal.sky, { shadow: false });
        }
        p.path("M0 17 L10 10.5 L20 15.5 L31 9.5 L43 15 L55 10.5 L66 15.5 L78 11 L78 20 L0 20 Z", horizon.far, { shadow: false });
        p.path("M0 19.5 L12 13.5 L24 18 L37 12.5 L50 18 L63 13.5 L78 17.5 L78 23 L0 23 Z", horizon.near, { shadow: false });
        // rooftop silhouettes along the horizon, chimneys seated
        for (const [rx, rw, rh] of [[4, 7, 3.4], [30, 8, 4], [56, 7, 3.2], [70, 6.4, 3.8]] as const) {
          const top = 20.5 - rh;
          p.rect(rx + rw - 2.1, top - 1.5, 1.1, 2.2, horizon.roofs, { shadow: false, r: 0.3 });
          p.poly(`${rx - 0.7},${top + 0.4} ${rx + rw / 2},${top - 1.7} ${rx + rw + 0.7},${top + 0.4}`, horizon.roofs, { shadow: false });
          p.rect(rx, top, rw, rh, horizon.roofs, { shadow: false, r: 0.5 });
          if (horizon.windowsLit) {
            p.rect(rx + 1.2, top + 1.1, 1.15, 1.3, GLASS_LIT, { shadow: false, r: 0.25 });
            p.rect(rx + rw - 2.4, top + 1.1, 1.15, 1.3, GLASS_LIT, { shadow: false, r: 0.25 });
          }
        }

        // the ground: grass, then the lane across the front
        p.rect(0, 19, CAFE_SCENE_COLS, CAFE_SCENE_ROWS - 19, pal.grass, { shadow: false, r: 0 });
        p.rect(0, 50, CAFE_SCENE_COLS, 12, pal.street, { shadow: false, r: 0 });
        p.line(0, 50, CAFE_SCENE_COLS, 50, "rgba(90,60,20,0.25)", 0.5);
        // the café's own plot — lighter ground the building stands on
        p.rect(10.5, 36, 33, 15, "#C9CF8E", { shadow: false, r: 1.6, opacity: phase === "night" ? 0.35 : 0.55 });

        // dusk: every building throws a long shadow east (one light)
        if (pal.longShadows) {
          p.poly("39,38 52,41 52,44 39,41.5", "rgba(70,35,10,0.16)", { shadow: false });
          p.poly("61,42 70,44 70,46.5 61,45", "rgba(70,35,10,0.14)", { shadow: false });
        }

        drawCottage(p, pal, anyoneServed);
        drawCafe(p, pal, oven, lit);

        // the tables out front — a plate and cup where someone sits served
        CAFE_LAYOUT.tablesX.forEach((tx, i) => drawTable(p, tx, i < servedCount));

        // a street lamp on the lane's edge, lit at dusk and night
        p.rect(62.3, 36, 0.7, 16, "#4A3A28", { shadow: false, r: 0.3 });
        p.circle(62.65, 35, 1.25, pal.lampLit ? GLASS_LIT : "#D9CDB4", { shadow: false });
        if (pal.lampLit) p.glow(62.65, 35.4, 6.5, "#FFC65C", 0.5);

        drawBoardShell(p);
        drawRegister(p, earnings);
        drawWeekLot(p, weekLots);

        // the phase wash over everything, exactly as the town map wears it
        const wash = PHASE_WASH[phase];
        if (wash) p.rect(0, 0, CAFE_SCENE_COLS, CAFE_SCENE_ROWS, wash.color, { shadow: false, r: 0, opacity: wash.opacity });
      }}
    />
  );
});
