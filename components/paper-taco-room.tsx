// ---------- the Taco Stand, rebuilt as a paper diorama ----------
// The PAPER CUTOUT proof (Jonathan's pivot, 2026-10-21): after two
// pixel builds missed the painted mockups — booths became giant
// slabs, diners shrank to stickers, the palette stayed murky — he
// proposed the paper mockup himself: "Maybe we should just try the
// paper one?" So the cantina is now layered paper in a diorama box:
// flat shapes with soft shadows, a big layered-paper sun in a teal
// arch, booths as wall benches with wooden tables (never freestanding
// slabs), paper people LARGE at the tables, and the hero standing in
// the open floor as a paper figure in his own colors.
//
// Everything behavioral is the pixel room's, untouched: the same seat
// slicing, the same per-table diner distribution from the screen,
// Serve the Table hosting above it, the "Cantina Kitchen" station,
// the InteriorAtmosphere layer the screen wraps around it. Only the
// drawing language changed — and the progression ladders are the
// kit's data (lib/paper-interior), expressed in paper pieces.

import { useEffect, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import {
  PAPER_INK,
  PaperCanvas,
  PaperGlowDisc,
  PaperHeroFigure,
  PaperPulse,
  PaperSeatedDiner,
  PaperSteam,
  PAPER_HERO_H,
  PAPER_HERO_W,
  type PaperPainter,
} from "@/components/paper-interior";
import { FigureName } from "@/components/activity-figures";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import type { PrayedPerson } from "@/lib/hometown";
import {
  BAND_ROWS,
  BOOTH,
  ENTRANCE_ROWS,
  FLOOR_TOP,
  PAPER_ROOM_COLS,
  WALL_STACK_ROWS,
  benchStyleFor,
  boothForTable,
  boothSeatPos,
  boothX,
  dressingForLevel,
  kitchenDressingFor,
  paperHash,
  roomRows,
  tableDressingFor,
  type BoothSide,
} from "@/lib/paper-interior";

/* The cantina palette, in paper — the mockup's warm, saturated set. */
const C = {
  ink: PAPER_INK,
  wall: "#58348F",
  wallDark: "#43256E",
  wallPanel: "#4B2A78",
  wallLight: "#7A52B0",
  dome: "#38205E",
  floor: "#332D68",
  floorAlt: "#3E387C",
  boothMat: "#C2A06B",
  boothMatDark: "#A87F45",
  teal: "#2EC4B6",
  tealDark: "#1F8A80",
  pink: "#FF7BAC",
  pinkDark: "#D14E86",
  gold: "#F2B53A",
  goldLight: "#FFD97A",
  orange: "#FF9A3D",
  cream: "#FFF6E9",
  plate: "#FFF9F0",
  plateShade: "#EFE3CC",
  wood: "#8A5A33",
  woodDark: "#5F3D22",
  woodLight: "#A9713F",
  stone: "#9A9DA8",
  pot: "#7A7E88",
  potDark: "#4E5158",
  potLight: "#B9BDC6",
  chili: "#D92B2B",
  chiliDark: "#9E1B1B",
  leaf: "#4E8B4A",
  salsaRed: "#C0392B",
  salsaGreen: "#4E8B4A",
  clothPurple: "#7B2D8B",
  lavender: "#6E639F",
  mat: "#C96A2E",
  matDark: "#9C4E1E",
  gatherWash: "rgba(255,123,172,0.10)",
} as const;

/** Tabletop cloth color by tables tier (the taco cloth ladder). */
const CLOTH = ["", C.cream, C.teal, C.clothPurple] as const;

/* ------------------------------------------------------------------ */
/* Paper piece helpers                                                 */
/* ------------------------------------------------------------------ */

/** Points for a star polygon (sun rays, medallions). */
function starPoints(cx: number, cy: number, spikes: number, rOuter: number, rInner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = ((-90 + (i * 180) / spikes) * Math.PI) / 180;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

/** A hanging chili ristra: green cap, clustered red paper pods. */
function ristra(p: PaperPainter, x: number, y: number) {
  p.line(x + 1.1, y - 1.2, x + 1.1, y + 0.4, C.leaf, 0.5);
  p.poly(`${x - 0.4},${y + 0.6} ${x + 2.6},${y + 0.6} ${x + 1.1},${y - 0.7}`, C.leaf);
  const pod = (px: number, py: number, col: string) =>
    p.path(
      `M ${px} ${py} C ${px + 1.5} ${py + 1.5}, ${px + 1.2} ${py + 3.2}, ${px} ${py + 4.4} C ${px - 1.2} ${py + 3.2}, ${px - 1.5} ${py + 1.5}, ${px} ${py} Z`,
      col
    );
  pod(x + 0.2, y + 0.6, C.chili);
  pod(x + 2.0, y + 1.1, C.chiliDark);
  pod(x + 1.1, y + 2.6, C.chili);
  pod(x + 0.1, y + 4.3, C.chiliDark);
  pod(x + 2.1, y + 4.8, C.chili);
  pod(x + 1.1, y + 6.2, C.chiliDark);
}

/** A potted paper cactus, standing on the floor at (x, baseY). */
function cactus(p: PaperPainter, x: number, baseY: number) {
  // arms + trunk
  p.rect(x + 0.1, baseY - 6.6, 1.25, 2.7, C.leaf, { r: 0.6 });
  p.rect(x + 0.1, baseY - 4.6, 1.9, 1.1, C.leaf, { r: 0.5, shadow: false });
  p.rect(x + 3.5, baseY - 7.4, 1.25, 2.2, C.leaf, { r: 0.6 });
  p.rect(x + 2.9, baseY - 5.7, 1.85, 1.1, C.leaf, { r: 0.5, shadow: false });
  p.rect(x + 1.75, baseY - 9.2, 1.6, 6.8, C.leaf, { r: 0.8 });
  p.circle(x + 2.55, baseY - 9.5, 0.55, C.pink, { shadow: false });
  // terracotta pot
  p.poly(`${x},${baseY} ${x + 5.1},${baseY} ${x + 4.5},${baseY - 2.7} ${x + 0.6},${baseY - 2.7}`, "#B0724A");
  p.rect(x + 0.3, baseY - 3.1, 4.5, 0.85, "#8E5636", { r: 0.4, shadow: false });
}

/** A paper jack-o'-lantern (Halloween dressing, drawn not emoji). */
function pumpkin(p: PaperPainter, cx: number, baseY: number) {
  p.ellipse(cx - 2.6, baseY - 3.1, 2.2, 2.8, "#D96F1B");
  p.ellipse(cx + 2.6, baseY - 3.1, 2.2, 2.8, "#D96F1B");
  p.ellipse(cx, baseY - 3.3, 3.3, 3.1, "#E67E22");
  p.rect(cx - 0.5, baseY - 7.2, 1.0, 1.2, C.leaf, { r: 0.4 });
  // face: triangle eyes + a crescent grin, cut-paper dark
  p.poly(`${cx - 1.9},${baseY - 3.9} ${cx - 0.7},${baseY - 3.9} ${cx - 1.3},${baseY - 4.9}`, C.ink, { shadow: false });
  p.poly(`${cx + 0.7},${baseY - 3.9} ${cx + 1.9},${baseY - 3.9} ${cx + 1.3},${baseY - 4.9}`, C.ink, { shadow: false });
  p.path(
    `M ${cx - 1.8} ${baseY - 2.2} Q ${cx} ${baseY - 0.9} ${cx + 1.8} ${baseY - 2.2} Q ${cx} ${baseY - 1.5} ${cx - 1.8} ${baseY - 2.2} Z`,
    C.ink,
    { shadow: false }
  );
}

/** A sombrero on a wall hook — the mockup's dressing. */
function sombrero(p: PaperPainter, cx: number, cy: number) {
  p.ellipse(cx, cy, 4.6, 1.35, C.gold);
  p.circle(cx, cy - 0.9, 1.95, C.goldLight);
  p.rect(cx - 1.95, cy - 1.15, 3.9, 0.8, C.pink, { r: 0.4, shadow: false });
}

/** A hanging paper lantern (the glow overlays pool its light). */
function lanternGlyph(p: PaperPainter, cx: number, topY: number) {
  p.line(cx, topY - 4.2, cx, topY, C.ink, 0.4);
  p.rect(cx - 1.1, topY - 0.7, 2.2, 0.8, C.woodDark, { r: 0.35 });
  p.rect(cx - 1.9, topY, 3.8, 4.4, "#F2A03D", { r: 1.7 });
  p.rect(cx - 1.15, topY + 0.8, 2.3, 2.8, "#FFE9B8", { r: 1, shadow: false });
  p.rect(cx - 1.1, topY + 4.4, 2.2, 0.8, C.woodDark, { r: 0.35, shadow: false });
}

/** A papel-picado flag: a paper rectangle with a scalloped lace hem. */
function papelFlag(p: PaperPainter, x: number, y: number, w: number, color: string, rot: number) {
  const o = { rot: { deg: rot, cx: x + w / 2, cy: y } };
  p.rect(x, y, w, 3.4, color, { r: 0.7, ...o });
  for (const bx of [x + 1.1, x + w / 2, x + w - 1.1]) p.circle(bx, y + 3.4, 1.05, color, { shadow: false, ...o });
  p.line(x + 1, y + 1.5, x + w - 1, y + 1.5, "rgba(255,255,255,0.4)", 0.4);
}

/* ------------------------------------------------------------------ */
/* The wall stack: paper brick, arch + sun, hood, cantina counter      */
/* ------------------------------------------------------------------ */
function paintWallStack(p: PaperPainter, level: number, kitchenTier: number, isNight: boolean) {
  const dressing = dressingForLevel(level);
  const kitchen = kitchenDressingFor(kitchenTier);

  // paper brick field — soft courses, saturated purple
  p.rect(0, 0, PAPER_ROOM_COLS, WALL_STACK_ROWS, C.wall, { shadow: false, edge: false, r: 0 });
  for (let y = 7; y < WALL_STACK_ROWS; y += 4.5) {
    p.line(0, y, PAPER_ROOM_COLS, y, C.wallPanel, 0.55);
    for (let x = (Math.round(y) % 9 === 0 ? 6 : 13); x < PAPER_ROOM_COLS; x += 14) {
      p.line(x, y, x, y + 4.5, C.wallPanel, 0.55);
    }
  }
  // scalloped valance across the very top (the mockup's crafted edge)
  p.rect(0, 0, PAPER_ROOM_COLS, 3.0, C.wallLight, { shadow: false, edge: false, r: 0 });
  for (let x = 2; x < PAPER_ROOM_COLS; x += 4) p.circle(x, 3.0, 1.7, C.wallLight, { shadow: false, edge: false });

  // papel-picado strings, sagging either side of the center lantern
  for (const [x0, x1] of [[2, 45], [55, 98]] as const) {
    p.line(x0, 5.2, x0 + (x1 - x0) / 3, 6.9, C.ink, 0.35);
    p.line(x0 + (x1 - x0) / 3, 6.9, x0 + (2 * (x1 - x0)) / 3, 6.9, C.ink, 0.35);
    p.line(x0 + (2 * (x1 - x0)) / 3, 6.9, x1, 5.2, C.ink, 0.35);
  }
  const flagColors = [C.teal, C.pink, C.orange, C.pink, C.teal];
  [5, 13.5, 22, 30.5, 39].forEach((fx, i) => papelFlag(p, fx, i % 2 ? 6.6 : 5.9, 6.5, flagColors[i % 5], i % 2 ? 2 : -2));
  [56, 64.5, 73, 81.5, 90].forEach((fx, i) => papelFlag(p, fx, i % 2 ? 5.9 : 6.6, 6.5, flagColors[(i + 2) % 5], i % 2 ? -2 : 2));
  // chili strings hang in the garland line, like the mockup's top edge
  ristra(p, 19, 6.4);
  ristra(p, 78, 6.4);

  // the center lantern, first of the room's warm lights
  lanternGlyph(p, 50, 2.4);
  p.glow(50, 4.6, isNight ? 11 : 7.5, "#FFB84D", isNight ? 0.5 : 0.3);

  // framed pictures on the side walls (sunset left, abstract right)
  const picture = (x: number, sunset: boolean, rot: number) => {
    const o = { rot: { deg: rot, cx: x + 5.25, cy: 17 } };
    p.rect(x, 12, 10.5, 10, C.woodDark, { r: 0.9, ...o });
    p.rect(x + 1, 13, 8.5, 8, sunset ? C.dome : C.tealDark, { r: 0.6, shadow: false, ...o });
    if (sunset) {
      p.circle(x + 5.25, 15.8, 1.9, C.goldLight, { shadow: false, ...o });
      p.rect(x + 1, 16.8, 8.5, 1.3, C.pink, { shadow: false, edge: false, ...o });
      p.rect(x + 1, 18.1, 8.5, 1.3, C.orange, { shadow: false, edge: false, ...o });
      p.rect(x + 1, 19.4, 8.5, 1.6, C.gold, { shadow: false, edge: false, ...o });
    } else {
      p.rect(x + 2.2, 14.2, 3.4, 3.4, C.pink, { r: 0.5, shadow: false, ...o });
      p.circle(x + 7.2, 16.6, 0.9, C.goldLight, { shadow: false, ...o });
      p.rect(x + 2.2, 18.8, 4.6, 1.1, C.pink, { shadow: false, edge: false, ...o });
    }
  };
  picture(2.5, true, -1.5);
  picture(87, false, 1.5);

  // sombreros hang under the pictures at the grand level
  if (dressing.sombreros) {
    sombrero(p, 7.75, 25.5);
    sombrero(p, 92.25, 25.5);
  }

  // menu boards flank the arch from L2 (drawn boards, no words)
  if (dressing.menuBoards) {
    const board = (x: number) => {
      p.rect(x - 0.7, 14.3, 9.9, 13.9, C.pinkDark, { r: 1 });
      p.rect(x, 15, 8.5, 12.5, "#2E1B47", { r: 0.7 });
      p.rect(x + 1, 16.1, 6.5, 1.5, C.teal, { r: 0.5, shadow: false });
      p.rect(x + 1, 18.9, 4.4, 1.1, C.cream, { r: 0.4, shadow: false });
      p.rect(x + 1, 21.2, 5.4, 1.1, C.cream, { r: 0.4, shadow: false });
      p.rect(x + 1, 23.5, 4.4, 1.1, C.cream, { r: 0.4, shadow: false });
      for (const dy of [18.9, 21.2, 23.5]) p.circle(x + 7.3, dy + 0.55, 0.55, C.gold, { shadow: false });
      p.rect(x + 2.4, 25.6, 3.7, 1.2, C.gold, { r: 0.5, shadow: false });
    };
    board(15.5);
    board(76);
  }

  // decorative wall tiles at counter height (the mockup's accents)
  const wallTile = (x: number, y: number, col: string) => {
    p.rect(x, y, 4.6, 4.6, col, { r: 0.6 });
    p.poly(`${x + 2.3},${y + 0.9} ${x + 3.7},${y + 2.3} ${x + 2.3},${y + 3.7} ${x + 0.9},${y + 2.3}`, C.cream, {
      shadow: false,
      opacity: 0.75,
    });
  };
  wallTile(5, 40, C.tealDark);
  wallTile(11.5, 46.5, C.pinkDark);
  wallTile(89.5, 40, C.pinkDark);
  wallTile(83, 46.5, C.tealDark);

  // pilasters: teal paper columns with pink caps carry the arch
  for (const px0 of [28, 69.6]) {
    p.rect(px0, 18, 2.4, 15, C.tealDark, { r: 0.8 });
    p.rect(px0 - 0.3, 18, 3, 1.6, C.pink, { r: 0.6, shadow: false });
    p.rect(px0 - 0.3, 31.4, 3, 1.6, C.pink, { r: 0.6, shadow: false });
  }

  // THE ARCH + SUN — the room's crown, layered paper at mockup scale:
  // gold band, teal band with scallop trim, deep dome, and a big
  // starburst sun with a grinning paper face.
  p.path("M 33.8 33 A 16.2 16.2 0 0 1 66.2 33 L 64.9 33 A 14.9 14.9 0 0 0 35.1 33 Z", C.gold);
  p.path("M 35.1 33 A 14.9 14.9 0 0 1 64.9 33 L 64 33 A 14 14 0 0 0 36 33 Z", C.teal);
  for (let a = 12; a <= 168; a += 13) {
    const rad = (a * Math.PI) / 180;
    p.circle(50 + 15.55 * Math.cos(rad), 33 - 15.55 * Math.sin(rad), 0.95, C.goldLight, { shadow: false });
  }
  p.path("M 36 33 A 14 14 0 0 1 64 33 Z", C.dome);
  for (const [sx, sy] of [[42, 24], [58, 25], [45, 29], [55, 29.5]] as const) {
    p.line(sx - 0.7, sy, sx + 0.7, sy, C.gold, 0.4);
    p.line(sx, sy - 0.7, sx, sy + 0.7, C.gold, 0.4);
  }
  // sunset stripes across the dome's foot
  p.rect(39, 29.2, 22, 1.3, C.pink, { shadow: false, edge: false, r: 0.3 });
  p.rect(37.5, 30.5, 25, 1.3, C.orange, { shadow: false, edge: false, r: 0.3 });
  p.rect(36.5, 31.8, 27, 1.2, C.gold, { shadow: false, edge: false, r: 0.3 });
  // the sun itself: two layered starbursts and a face you can read
  p.poly(starPoints(50, 24.5, 12, 9.2, 6.9), C.gold);
  p.poly(starPoints(50, 24.5, 12, 7.4, 5.9), C.orange, { shadow: false, opacity: 0.85 });
  p.circle(50, 24.5, 5.4, C.gold);
  p.circle(50, 24.5, 4.7, C.goldLight, { shadow: false });
  p.circle(48.3, 23.8, 0.5, C.ink, { shadow: false });
  p.circle(51.7, 23.8, 0.5, C.ink, { shadow: false });
  p.path("M 48.2 25.4 Q 50 27.2 51.8 25.4 Q 50 26.2 48.2 25.4 Z", C.ink, { shadow: false });
  p.circle(46.9, 25.3, 0.75, C.pink, { shadow: false, opacity: 0.65 });
  p.circle(53.1, 25.3, 0.75, C.pink, { shadow: false, opacity: 0.65 });

  // the grill hood: a dark cap with knobs over sunset paper stripes
  p.rect(35, 33, 30, 2.2, "#2E1B47", { r: 0.9 });
  for (const kx of [42, 50, 58]) p.ellipse(kx, 34.1, 1.6, 0.7, C.gold, { shadow: false });
  const stripeColors = [C.pink, C.orange, C.gold, C.teal];
  const stripeH = 4.4 / dressing.hoodStripes;
  for (let i = 0; i < dressing.hoodStripes; i++) {
    p.rect(34, 35.2 + i * stripeH, 32, stripeH + 0.25, stripeColors[i], {
      r: i === 0 || i === dressing.hoodStripes - 1 ? 1.1 : 0.2,
      shadow: i === 0,
      edge: false,
    });
  }
  for (const mx0 of [42, 50, 58]) p.poly(starPoints(mx0, 37.4, 4, 1.5, 0.65), C.goldLight, { shadow: false });

  // lamps hang under the hood, pooling light on the pass
  for (const lx of [41, 50, 59]) {
    p.line(lx, 39.6, lx, 40.4, C.ink, 0.4);
    p.path(`M ${lx - 1.9} 41.7 A 1.9 1.9 0 0 1 ${lx + 1.9} 41.7 Z`, C.gold);
    p.circle(lx, 41.95, 0.75, "#FFF3D6", { shadow: false });
    p.glow(lx, 42.4, isNight ? 5.5 : 3.4, "#FFC46B", isNight ? 0.5 : 0.26);
  }

  // canisters stand on the slab (3, or 4 at the top kitchen tier)
  const canisterAt = [36, 44, 52, 60].slice(0, kitchen.canisters);
  for (const cx of canisterAt) {
    p.rect(cx, 42.2, 4.5, 3.3, C.pot, { r: 0.9 });
    p.rect(cx - 0.2, 41.5, 4.9, 0.9, C.potDark, { r: 0.45, shadow: false });
    p.circle(cx + 2.25, 41.15, 0.5, C.potDark, { shadow: false });
    p.rect(cx + 0.7, 42.9, 0.9, 1.9, C.potLight, { r: 0.4, shadow: false, opacity: 0.8 });
  }

  // a row of ready tacos rides the slab's ends at kitchen tier 3
  if (kitchen.trayRow) {
    for (const tx of [30.3, 65.1]) {
      p.rect(tx, 44.6, 4.6, 0.9, "#B9C0C9", { r: 0.4 });
      for (const ox of [0.7, 2.4]) {
        p.path(`M ${tx + ox} 44.6 A 0.85 0.85 0 0 1 ${tx + ox + 1.7} 44.6 Z`, C.gold, { shadow: false });
        p.circle(tx + ox + 0.85, 44.15, 0.32, C.leaf, { shadow: false });
      }
    }
  }

  // the counter: wood slab over a tiled (or plank) paper front
  p.rect(29, 45.5, 42, 1.6, C.woodLight, { r: 0.6 });
  p.rect(29, 47.1, 42, 0.7, C.woodDark, { shadow: false, edge: false, r: 0 });
  p.rect(29, 47.8, 42, 6.2, C.woodDark, { shadow: false, edge: false, r: 0 });
  if (kitchen.tiled) {
    const tilePalette = [C.teal, C.pink, C.clothPurple, "#B9A3D9"];
    const tileH = 6.2 / kitchen.tileRows;
    for (let row = 0; row < kitchen.tileRows; row++) {
      for (let col = 0; col < 8; col++) {
        const tx = 29 + col * 5.25;
        const ty = 47.8 + row * tileH;
        const col2 = tilePalette[(paperHash(`ptile-${col}-${row}`) >> 3) % tilePalette.length];
        p.rect(tx + 0.35, ty + 0.35, 4.55, tileH - 0.7, col2, {
          r: 0.5,
          shadow: false,
          rot: { deg: (col + row) % 2 === 0 ? 0.8 : -0.8, cx: tx + 2.6, cy: ty + tileH / 2 },
        });
      }
    }
  } else {
    p.rect(29, 47.8, 42, 6.2, C.wood, { shadow: false, edge: false, r: 0 });
    for (let x = 34.25; x < 71; x += 5.25) p.line(x, 48.1, x, 53.7, C.woodDark, 0.5);
  }
  // a chili ristra hangs by the counter from kitchen tier 2
  if (kitchen.ristra) ristra(p, 72.5, 39);
}

/* ------------------------------------------------------------------ */
/* One booth: woven mat, wall bench, dressed table, stools. The bench  */
/* hugs the wall and the table stands in front of it — furniture, not  */
/* slabs — with the aisle kept open beside it.                         */
/* ------------------------------------------------------------------ */
function paintBooth(p: PaperPainter, side: BoothSide, top: number, tablesTier: number, chairsTier: number) {
  const bx = boothX(side);
  const mx = (lx: number, w: number) => (side === "left" ? bx + lx : bx + (BOOTH.w - lx - w));
  const mcx = (lc: number) => (side === "left" ? bx + lc : bx + (BOOTH.w - lc));
  const bench = benchStyleFor(chairsTier);
  const tableDress = tableDressingFor(tablesTier);
  const t = BOOTH.table;

  // woven mat under the whole booth, fringe on the room side
  p.rect(bx - 0.5, top + 0.5, BOOTH.w + 1, BOOTH.h + 1, C.boothMat, { r: 1.4 });
  for (let ly = top + 3; ly < top + BOOTH.h; ly += 2.4) p.line(bx + 0.4, ly, bx + BOOTH.w - 0.4, ly, C.boothMatDark, 0.35);
  const fringeX = side === "left" ? bx + BOOTH.w + 0.5 : bx - 0.5;
  for (let ly = top + 2.5; ly < top + BOOTH.h; ly += 2.2) {
    p.line(fringeX, ly, fringeX + (side === "left" ? 1.1 : -1.1), ly + 0.5, C.boothMatDark, 0.4);
  }

  // bench back against the wall: wood frame, cushion panel that
  // climbs the tiers, a ledge seat in front of it
  const panelColor =
    bench.cushion === "grand" ? C.clothPurple : bench.cushion === "pink" ? C.pinkDark : bench.cushion === "teal" ? "#7A4E2D" : C.woodLight;
  p.rect(mx(0, 5), top + 2, 5, 28, C.woodDark, { r: 1.4 });
  p.rect(mx(0.9, 3.2), top + 3.2, 3.2, 25.6, panelColor, { r: 1.1, shadow: false });
  if (bench.cushion !== "wood") {
    const strip = bench.cushion === "teal" ? C.teal : bench.cushion === "pink" ? C.pink : C.gold;
    p.rect(mx(0.9, 3.2), top + 15.4, 3.2, 2.2, strip, { r: 0.7, shadow: false });
  }
  if (bench.tufted) {
    for (const ty of [7.5, 12.5, 18.5, 23.5]) p.circle(mcx(2.5), top + ty, 0.45, "rgba(24,8,44,0.5)", { shadow: false });
  }
  if (bench.goldTrim) p.rect(mx(0.9, 3.2), top + 3.2, 3.2, 1.0, C.gold, { r: 0.4, shadow: false });
  p.rect(mx(5, 5.5), top + 3.5, 5.5, 25, bench.cushion === "wood" ? C.woodLight : panelColor, { r: 1.2 });

  // stools on the room side of the table, one per stool seat
  for (const seatY of BOOTH.seatY) {
    const scx = mcx(BOOTH.stoolX + 6.5);
    p.line(scx - 1.2, top + seatY + 13.6, scx - 1.6, top + seatY + 15.2, C.woodDark, 0.55);
    p.line(scx + 1.2, top + seatY + 13.6, scx + 1.6, top + seatY + 15.2, C.woodDark, 0.55);
    p.circle(scx, top + seatY + 12.1, 2.3, C.wood);
    p.circle(scx, top + seatY + 12.1, 1.55, C.woodLight, { shadow: false });
  }

  // the table: warm wood, a cloth laid over it from tables tier 1
  const tx = mx(t.x, t.w);
  p.rect(tx, top + t.y, t.w, t.h, C.wood, { r: 1.6 });
  if (tablesTier > 0) {
    p.rect(tx + 0.8, top + t.y + 0.8, t.w - 1.6, t.h - 1.6, CLOTH[Math.min(tablesTier, 3)], { r: 1.2, shadow: false });
  }

  // place settings at the four seat spots — plates big enough to
  // read across the room, tacos on them once the food tier lands
  const plateAt = (localCx: number, seatY: number, withFood: boolean) => {
    const cx = mcx(localCx);
    const cy = top + seatY + 7.5;
    p.circle(cx, cy, 2.3, C.plate);
    p.circle(cx, cy, 1.65, C.plateShade, { shadow: false });
    if (withFood) {
      p.path(`M ${cx - 1.5} ${cy + 0.55} A 1.5 1.5 0 0 1 ${cx + 1.5} ${cy + 0.55} Z`, C.gold, { shadow: false });
      p.circle(cx - 0.5, cy - 0.75, 0.38, C.leaf, { shadow: false });
      p.circle(cx + 0.55, cy - 0.55, 0.38, C.salsaRed, { shadow: false });
    }
  };
  plateAt(t.x + 3, BOOTH.seatY[0], tableDress.food);
  plateAt(t.x + 3, BOOTH.seatY[1], tableDress.food);
  plateAt(t.x + t.w - 3, BOOTH.seatY[0], tableDress.food);
  plateAt(t.x + t.w - 3, BOOTH.seatY[1], tableDress.food);

  // salsa bowls between the seats at tables tier 2+
  if (tableDress.food) {
    const cx = mcx(t.x + t.w / 2);
    p.circle(cx, top + t.y + 8.5, 1.6, C.salsaRed);
    p.circle(cx, top + t.y + 8.5, 0.55, C.leaf, { shadow: false });
    p.circle(cx, top + t.y + 17.5, 1.6, C.salsaGreen);
    p.circle(cx, top + t.y + 17.5, 0.55, C.chili, { shadow: false });
  }
  // a serving tray rides the table's middle at tables tier 3
  if (tableDress.tray) {
    const trayX = mx(t.x + 3, 6);
    p.rect(trayX, top + t.y + 11.2, 6, 4.4, "#9AA1A9", { r: 0.9 });
    const cx = mcx(t.x + t.w / 2);
    p.path(`M ${cx - 1.6} ${top + t.y + 14.2} A 1.6 1.6 0 0 1 ${cx + 1.6} ${top + t.y + 14.2} Z`, C.gold, { shadow: false });
    p.circle(cx, top + t.y + 12.35, 0.4, C.leaf, { shadow: false });
  }
  // cups with straws at tables tier 1+
  if (tableDress.cups) {
    for (const seatY of BOOTH.seatY) {
      for (const lc of [t.x + 1.6, t.x + t.w - 1.6]) {
        const cx = mcx(lc);
        p.rect(cx - 0.75, top + seatY + 11.3, 1.5, 2.1, C.cream, { r: 0.4 });
        p.line(cx + 0.2, top + seatY + 11.3, cx + 0.75, top + seatY + 10.2, C.pink, 0.42);
      }
    }
  }
  // paper fringe along the table's inner (room-side) edge at tier 3
  if (tableDress.fringe) {
    const edgeLocal = side === "left" ? t.x + t.w : t.x;
    const ex = mcx(edgeLocal);
    const dir = side === "left" ? 1 : -1;
    let i = 0;
    for (let fy = top + t.y + 2; fy < top + t.y + t.h - 1.5; fy += 3, i++) {
      p.poly(`${ex},${fy} ${ex},${fy + 1.7} ${ex + dir * 1.4},${fy + 0.85}`, i % 2 === 0 ? C.pink : C.teal, {
        shadow: false,
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* The floor + entrance                                                */
/* ------------------------------------------------------------------ */
function paintFloor(p: PaperPainter, tableCount: number, level: number, gathering: boolean, halloween: boolean) {
  const rows = roomRows(tableCount);
  const floorBottom = rows - ENTRANCE_ROWS;
  const dressing = dressingForLevel(level);

  // baseboard shadow where wall meets floor
  p.rect(0, WALL_STACK_ROWS, PAPER_ROOM_COLS, 2, "rgba(20,8,32,0.35)", { shadow: false, edge: false, r: 0 });

  // tile field: paper diamonds on deep violet — the mockup's floor
  p.rect(0, FLOOR_TOP, PAPER_ROOM_COLS, floorBottom - FLOOR_TOP, C.floor, { shadow: false, edge: false, r: 0 });
  for (let ty = 0; FLOOR_TOP + ty * 12 < floorBottom; ty++) {
    for (let tx = 0; tx * 12.5 < PAPER_ROOM_COLS; tx++) {
      const cx = tx * 12.5 + 6.25;
      const cy = FLOOR_TOP + ty * 12 + 6;
      const diamond = (rx: number, ry: number, col: string, opacity?: number) =>
        p.poly(`${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`, col, { shadow: false, opacity });
      if ((tx + ty) % 2 === 0) diamond(5, 4.6, C.floorAlt);
      const h = paperHash(`pfloor-${tx}-${ty}`);
      if (h % 17 === 0) diamond(2.6, 2.3, C.tealDark, 0.9);
      else if (h % 23 === 0) diamond(2.6, 2.3, C.pinkDark, 0.9);
      else if (h % 29 === 0) {
        p.line(cx - 0.8, cy, cx + 0.8, cy, C.goldLight, 0.4);
        p.line(cx, cy - 0.8, cx, cy + 0.8, C.goldLight, 0.4);
      }
    }
  }

  if (gathering) {
    p.rect(0, FLOOR_TOP, PAPER_ROOM_COLS, floorBottom - FLOOR_TOP, C.gatherWash, { shadow: false, edge: false, r: 0 });
  }

  // patterned medallion rug in the open floor at L3
  if (dressing.rug) {
    const cx = 50;
    const cy = FLOOR_TOP + 17;
    const dia = (rx: number, ry: number, col: string) =>
      p.poly(`${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`, col);
    dia(11, 9.5, C.teal);
    dia(8, 6.8, C.pink);
    dia(4.5, 3.8, C.gold);
    p.circle(cx, cy, 1.1, C.pinkDark, { shadow: false });
  }

  // a barrel keeps the entrance company from L2
  if (dressing.barrel) {
    const fb = floorBottom;
    p.rect(3.5, fb - 8.5, 6.5, 8, C.wood, { r: 2.2 });
    p.rect(3.5, fb - 6.6, 6.5, 0.85, C.woodDark, { shadow: false, edge: false, r: 0 });
    p.rect(3.5, fb - 3.4, 6.5, 0.85, C.woodDark, { shadow: false, edge: false, r: 0 });
    p.ellipse(6.75, fb - 8.5, 3.25, 1.0, C.woodLight, { shadow: false });
  }

  // potted cacti flank the entrance as the level dressing grows
  if (dressing.cornerPlants >= 1) cactus(p, 12, floorBottom - 0.5);
  if (dressing.cornerPlants >= 2) cactus(p, 83, floorBottom - 0.5);

  // Halloween: paper pumpkins flank the mat
  if (halloween) {
    pumpkin(p, 21, floorBottom - 0.5);
    pumpkin(p, 79, floorBottom - 0.5);
  }

  // entrance: a light lavender threshold with confetti, the woven
  // mat, and a wooden front edge with mini papel bunting (the
  // mockup's diorama base)
  p.rect(0, floorBottom, PAPER_ROOM_COLS, ENTRANCE_ROWS, C.lavender, { shadow: false, edge: false, r: 0 });
  for (let i = 0; i < 14; i++) {
    const h = paperHash(`confetti-${i}`);
    const cx = 3 + (h % 94);
    const cy = floorBottom + 1 + ((h >> 5) % 6);
    p.circle(cx, cy, 0.5, [C.pink, C.teal, C.gold][i % 3], { shadow: false, opacity: 0.8 });
  }
  p.rect(38, floorBottom + 1.5, 24, 6.3, C.matDark, { r: 1 });
  p.rect(39.2, floorBottom + 2.4, 21.6, 4.5, C.mat, { r: 0.8, shadow: false });
  p.poly(
    `${50},${floorBottom + 3.1} ${52.2},${floorBottom + 4.65} ${50},${floorBottom + 6.2} ${47.8},${floorBottom + 4.65}`,
    C.gold,
    { shadow: false }
  );
  p.rect(0, rows - 1.9, PAPER_ROOM_COLS, 1.9, C.woodDark, { shadow: false, edge: false, r: 0 });
  for (let x = 2, i = 0; x < PAPER_ROOM_COLS - 3; x += 8, i++) {
    p.poly(`${x},${rows - 1.9} ${x + 3.6},${rows - 1.9} ${x + 1.8},${rows - 0.25}`, i % 2 === 0 ? C.pink : C.teal, {
      shadow: false,
    });
  }
}

/* ------------------------------------------------------------------ */
/* The room                                                            */
/* ------------------------------------------------------------------ */
export function PaperTacoRoom({
  tableDiners,
  tablesTier,
  chairsTier,
  kitchenTier,
  level,
  gathering,
  halloween,
  isNight,
}: {
  /** Diners already distributed per table by the screen (round-robin). */
  tableDiners: PrayedPerson[][];
  tablesTier: number;
  chairsTier: number;
  kitchenTier: number;
  level: number;
  gathering: boolean;
  halloween: boolean;
  isNight: boolean;
}) {
  const windowWidth = useWindowDimensions().width;
  const [measured, setMeasured] = useState(0);
  const width = measured > 0 ? measured : Math.max(280, windowWidth - 32);
  const unit = width / PAPER_ROOM_COLS;
  const tableCount = tableDiners.length;
  const rows = roomRows(tableCount);
  const dressing = dressingForLevel(level);
  const kitchen = kitchenDressingFor(kitchenTier);

  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  useEffect(() => {
    loadCustomPawn().then((p) => p && setPawn(p)).catch(() => undefined);
  }, []);

  const draw = (p: PaperPainter) => {
    paintWallStack(p, level, kitchenTier, isNight);
    paintFloor(p, tableCount, level, gathering, halloween);
    tableDiners.forEach((_, i) => {
      const { side, top } = boothForTable(i);
      paintBooth(p, side, top, tablesTier, chairsTier);
    });
    // hanging lanterns over the aisle arrive with level dressing
    if (dressing.extraLanterns >= 1) lanternGlyph(p, 50, FLOOR_TOP + BAND_ROWS - 4.4);
    if (dressing.extraLanterns >= 2 && tableCount > 2) lanternGlyph(p, 50, FLOOR_TOP + BAND_ROWS * 2 - 4.4);
  };

  const glowSize = unit * (isNight ? 26 : 20);
  const lanternGlow = (ux: number, uy: number, delay: number) => (
    <PaperPulse
      key={`${ux}-${uy}`}
      duration={2100}
      min={isNight ? 0.8 : 0.55}
      max={1}
      delay={delay}
      style={{ position: "absolute", left: ux * unit - glowSize / 2, top: uy * unit - glowSize / 2 }}
    >
      <PaperGlowDisc size={glowSize} opacity={isNight ? 0.6 : 0.42} />
    </PaperPulse>
  );

  const heroW = PAPER_HERO_W * unit;
  const heroH = PAPER_HERO_H * unit;

  return (
    <View
      onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}
      style={{ position: "relative", width: "100%", height: rows * unit, backgroundColor: C.wall }}
    >
      <PaperCanvas cols={PAPER_ROOM_COLS} rows={rows} unit={unit} draw={draw} />

      {/* lantern light pools (stronger after dark) */}
      {lanternGlow(50, 4.6, 0)}
      {dressing.extraLanterns >= 1 && lanternGlow(50, FLOOR_TOP + BAND_ROWS - 2, 500)}
      {dressing.extraLanterns >= 2 && tableCount > 2 && lanternGlow(50, FLOOR_TOP + BAND_ROWS * 2 - 2, 1000)}

      {/* steam curls off the pass once the kitchen is furnished */}
      {kitchen.steam && (
        <View pointerEvents="none" style={{ position: "absolute", left: 44.5 * unit, top: 36.5 * unit }}>
          <PaperSteam unit={unit} />
        </View>
      )}

      {/* the station label under the counter */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, right: 0, top: (WALL_STACK_ROWS + 0.6) * unit, alignItems: "center" }}
      >
        <Text
          style={{
            color: "#D9C6F5",
            fontSize: 10,
            fontStyle: "italic",
            backgroundColor: "rgba(20,8,32,0.35)",
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          {kitchenTier > 0 ? "Cantina Kitchen" : "Cantina Counter"}
        </Text>
      </View>

      {/* diners — the same seat slicing the pixel room used:
          bench takes slice(0, pawnFirst ? 1 : 2), stools take slice(2, 4) */}
      {tableDiners.map((group, i) => {
        const pawnFirst = i === 0;
        const { side, top } = boothForTable(i);
        return (
          <View key={i} pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
            {group.slice(0, pawnFirst ? 1 : 2).map((person, seatIndex) => {
              const pos = boothSeatPos(side, "bench", seatIndex as 0 | 1, top);
              return (
                <View key={person.id} style={{ position: "absolute", left: pos.x * unit, top: pos.y * unit }}>
                  <PaperSeatedDiner person={person} unit={unit} flipX={pos.flipX} delay={(seatIndex + 1) * 180} />
                </View>
              );
            })}
            {group.slice(2, 4).map((person, seatIndex) => {
              const pos = boothSeatPos(side, "stool", seatIndex as 0 | 1, top);
              return (
                <View key={person.id} style={{ position: "absolute", left: pos.x * unit, top: pos.y * unit }}>
                  <PaperSeatedDiner person={person} unit={unit} flipX={pos.flipX} delay={(seatIndex + 2) * 180} />
                </View>
              );
            })}
          </View>
        );
      })}

      {/* the hero stands UNBOXED in the open floor, a paper figure in
          his own colors — nameplate above, his paper shadow below,
          no selection frame, no bubble, no portal ring */}
      {pawn && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 50 * unit - heroW / 2, top: (FLOOR_TOP + 3) * unit, alignItems: "center" }}
        >
          <FigureName name={pawn.name} />
          <View style={{ width: heroW, height: heroH }}>
            <PaperHeroFigure pawn={pawn} unit={unit} />
          </View>
        </View>
      )}

      {/* night warmth: a low amber wash over the whole room */}
      {isNight && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,140,40,0.07)" }}
        />
      )}
    </View>
  );
}
