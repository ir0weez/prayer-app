// ---------- the Taco Stand, rebuilt 100% pixel ----------
// Phase 1 of the pixel interiors (Jonathan's pick, 2026-10-20: "100% all
// of them 8-bit pixel... in a Stardew Valley kind of way"). The room is
// ONE PixelCanvas painted from the kit's layout data (lib/pixel-interior)
// plus sprite overlays (pixel diners, the hero) through the kit's
// renderers (components/pixel-interior). Layout follows his chosen
// mockup: the counter spans the top under a pixel sun arch, booths hug
// the left/right walls, the tiled floor stays open in the middle where
// the hero stands, and the entrance mat waits at the foot.
//
// Progression is data, not decoration swaps: dressingForLevel /
// tableDressingFor / benchStyleFor / kitchenDressingFor decide what
// EXISTS in the room at each building level and furniture tier, so an
// upgrade visibly grows the room — here and in every rollout room that
// reuses the kit after this one.

import { useEffect, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import {
  PixelCanvas,
  PixelGlow,
  PixelPulse,
  PixelSeatedDiner,
  PixelSteam,
  PIXEL_INK,
  type PixelPainter,
} from "@/components/pixel-interior";
import { FigureName } from "@/components/activity-figures";
import { PawnPreview } from "@/components/pawn-preview";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import type { PrayedPerson } from "@/lib/hometown";
import {
  BOOTH,
  ENTRANCE_ROWS,
  FLOOR_TOP,
  PIXEL_ROOM_COLS,
  WALL_STACK_ROWS,
  benchStyleFor,
  boothForTable,
  boothSeatPos,
  boothX,
  dressingForLevel,
  kitchenDressingFor,
  pixelHash,
  roomRows,
  tableDressingFor,
} from "@/lib/pixel-interior";

/* The retro-cantina palette, in pixels (mirrors CUISINE_THEMES taco). */
const C = {
  ink: PIXEL_INK,
  wall: "#3A2260",
  wallDark: "#2C1849",
  wallLight: "#4A2E7A",
  floor: "#4A3A6E",
  floorAlt: "#43315F",
  grout: "#37275A",
  boothMat: "#3D2A5E",
  teal: "#2EC4B6",
  tealDark: "#1F8A80",
  pink: "#FF7BAC",
  pinkDark: "#D14E86",
  gold: "#F2B53A",
  goldLight: "#FFD97A",
  orange: "#FF9A3D",
  cream: "#F3E9FF",
  plate: "#FFF9F0",
  plateShade: "#D9C9A8",
  wood: "#6E5136",
  woodDark: "#46301E",
  woodLight: "#8A6A44",
  stone: "#7A7E85",
  stoneDark: "#55585E",
  pot: "#5A5A64",
  potDark: "#3E3E46",
  chili: "#C22E2E",
  chiliDark: "#8E1F1F",
  leaf: "#4E8B4A",
  salsaRed: "#C0392B",
  salsaGreen: "#4E8B4A",
  clothPurple: "#7B2D8B",
  mat: "#C96A2E",
  matDark: "#9C4E1E",
  shadow: "rgba(20,8,32,0.35)",
  gatherWash: "rgba(255,123,172,0.10)",
} as const;

/** Tabletop color by tables tier (the taco cloth ladder, in pixels). */
const CLOTH = ["", C.cream, C.teal, C.clothPurple] as const;

/* ------------------------------------------------------------------ */
/* Canvas helpers                                                      */
/* ------------------------------------------------------------------ */

/** Upper semicircle band (an arch ring), row by row — the painter has
 *  no clip, so arches are drawn as row spans like the discs are. */
function arc(p: PixelPainter, cx: number, cy: number, rOuter: number, rInner: number, color: string) {
  for (let dy = -rOuter; dy <= 0; dy++) {
    const outer = Math.floor(Math.sqrt(Math.max(0, rOuter * rOuter - dy * dy)));
    const innerSq = rInner * rInner - dy * dy;
    if (innerSq < 0) {
      p.fill(cx - outer, cy + dy, outer * 2 + 1, 1, color);
    } else {
      const inner = Math.floor(Math.sqrt(innerSq));
      p.fill(cx - outer, cy + dy, outer - inner, 1, color);
      p.fill(cx + inner + 1, cy + dy, outer - inner, 1, color);
    }
  }
}

/** A hanging chili ristra: a green cap, then clustered red pods. */
function ristra(p: PixelPainter, x: number, y: number, h: number) {
  p.fill(x + 1, y, 3, 1, C.leaf);
  for (let i = 0; i < h; i++) {
    const wob = i % 2 === 0 ? 0 : 1;
    p.fill(x + wob, y + 1 + i, 2, 1, i % 3 === 2 ? C.chiliDark : C.chili);
    p.fill(x + 3 - wob, y + 1 + i, 2, 1, i % 3 === 1 ? C.chiliDark : C.chili);
  }
  p.dot(x + 2, y + h + 1, C.chiliDark);
}

/** A potted pixel cactus. */
function cactus(p: PixelPainter, x: number, y: number) {
  // pot
  p.fill(x + 1, y + 6, 5, 1, "#B0724A");
  p.fill(x + 2, y + 7, 3, 2, "#8E5636");
  // cactus body + arms
  p.fill(x + 3, y + 1, 2, 5, C.leaf);
  p.fill(x + 1, y + 2, 1, 3, C.leaf);
  p.fill(x + 1, y + 2, 2, 1, C.leaf);
  p.fill(x + 6, y + 3, 1, 2, C.leaf);
  p.fill(x + 5, y + 3, 2, 1, C.leaf);
  p.dot(x + 3, y, "#E86A92");
}

/** A pixel jack-o'-lantern (Halloween dressing, drawn not emoji). */
function pumpkin(p: PixelPainter, x: number, y: number) {
  p.fill(x + 3, y, 2, 1, C.leaf);
  p.fill(x + 1, y + 1, 6, 5, "#E67E22");
  p.fill(x, y + 2, 8, 3, "#E67E22");
  p.fill(x + 1, y + 6, 6, 1, "#C75B12");
  // face: triangle eyes + a grin, in ink
  p.dot(x + 2, y + 3, C.ink);
  p.dot(x + 5, y + 3, C.ink);
  p.fill(x + 2, y + 5, 4, 1, C.ink);
  p.dot(x + 3, y + 4, C.ink);
}

/** A hanging lantern glyph (the glow overlays pool its light). */
function lanternGlyph(p: PixelPainter, cx: number, y: number) {
  p.fill(cx - 1, y, 2, 1, C.woodDark);
  p.fill(cx - 2, y + 1, 4, 1, C.gold);
  p.fill(cx - 2, y + 2, 4, 2, C.goldLight);
  p.dot(cx - 1, y + 2, "#FFF3D6");
  p.fill(cx - 2, y + 4, 4, 1, C.gold);
}

/* ------------------------------------------------------------------ */
/* The wall stack: brick, arch + sun, grill, cantina counter           */
/* ------------------------------------------------------------------ */
function paintWallStack(p: PixelPainter, level: number, kitchenTier: number) {
  const dressing = dressingForLevel(level);
  const kitchen = kitchenDressingFor(kitchenTier);

  // brick field
  p.fill(0, 0, PIXEL_ROOM_COLS, 28, C.wall);
  for (let y = 4; y < 28; y += 4) {
    p.fill(0, y, PIXEL_ROOM_COLS, 1, C.wallDark);
    for (let x = (y % 8 === 0 ? 6 : 14); x < PIXEL_ROOM_COLS; x += 16) p.dot(x, y - 2, C.wallDark);
  }
  // stone rim across the very top (the mockup's grey brick border)
  p.fill(0, 0, PIXEL_ROOM_COLS, 2, C.stone);
  p.fill(0, 1, PIXEL_ROOM_COLS, 1, C.stoneDark);
  for (let x = 3; x < PIXEL_ROOM_COLS; x += 8) p.dot(x, 0, C.stoneDark);

  // papel-picado bunting under the rim: little pixel flags on a sag
  const flagColors = [C.teal, C.pink, C.gold, C.pink, C.teal];
  for (let i = 0; i < 10; i++) {
    const fx = 8 + i * 11;
    if (fx > 46 && fx < 70) continue; // the lantern hangs center
    const fy = 3 + (i % 2);
    const col = flagColors[i % flagColors.length];
    p.fill(fx, fy, 5, 1, col);
    p.fill(fx + 1, fy + 1, 3, 1, col);
    p.dot(fx + 2, fy + 2, col);
  }

  // framed pictures on the side walls (sunset left, Memphis right)
  const picture = (x: number, sunset: boolean) => {
    p.fill(x, 8, 12, 10, C.woodDark);
    p.fill(x + 1, 9, 10, 8, sunset ? "#2C1849" : C.tealDark);
    if (sunset) {
      p.fill(x + 1, 13, 10, 1, C.pink);
      p.fill(x + 1, 14, 10, 1, C.orange);
      p.fill(x + 1, 15, 10, 2, C.gold);
      p.disc(x + 6, 12, 2, C.goldLight);
    } else {
      p.fill(x + 3, 10, 3, 3, C.pink);
      p.dot(x + 8, 12, C.goldLight);
      p.fill(x + 6, 14, 4, 1, C.pink);
      p.dot(x + 3, 15, C.goldLight);
    }
  };
  picture(4, true);
  picture(104, false);

  // hanging chili strings by the pictures
  ristra(p, 19, 3, 5);
  ristra(p, 97, 3, 5);

  // menu boards flank the arch from L2 (drawn boards, no words)
  if (dressing.menuBoards) {
    const board = (x: number) => {
      p.fill(x, 10, 11, 13, C.ink);
      p.fill(x + 1, 11, 9, 11, "#2E1B47");
      p.fill(x + 1, 11, 9, 1, C.pink);
      p.fill(x + 2, 13, 5, 1, C.teal);
      p.fill(x + 2, 15, 6, 1, C.cream);
      p.fill(x + 2, 17, 4, 1, C.cream);
      p.fill(x + 2, 19, 6, 1, C.cream);
      p.dot(x + 8, 13, C.gold);
      p.dot(x + 8, 15, C.gold);
      p.dot(x + 8, 17, C.gold);
      p.dot(x + 8, 19, C.gold);
      p.fill(x + 3, 21, 3, 1, C.gold);
    };
    board(24);
    board(85);
  }

  // pilasters: teal columns with pink capitals carry the arch
  for (const px0 of [36, 81]) {
    p.fill(px0, 9, 3, 19, C.tealDark);
    p.fill(px0, 9, 3, 1, C.pink);
    p.fill(px0, 26, 3, 2, C.pink);
    p.dot(px0 + 1, 16, C.teal);
  }

  // the sunset dome inside the arch
  const domeColors = [C.pink, C.pink, "#FF8FA3", C.orange, C.orange, C.gold, C.gold, C.goldLight];
  for (let dy = -19; dy <= 0; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, 19 * 19 - dy * dy)));
    const band = Math.min(domeColors.length - 1, Math.floor(((dy + 19) / 20) * domeColors.length));
    p.fill(60 - half, 24 + dy, half * 2 + 1, 1, domeColors[band]);
  }
  // arch rings: teal outside, pink inside
  arc(p, 60, 24, 22, 20, C.teal);
  arc(p, 60, 24, 19, 18, C.pink);

  // the smiling sun medallion
  p.disc(60, 14, 5, C.gold);
  p.disc(60, 14, 4, C.goldLight);
  for (const [rx, ry, rw, rh] of [
    [60, 6, 1, 2], [53, 8, 2, 1], [66, 8, 2, 1], [51, 14, 2, 1], [67, 14, 2, 1], [54, 20, 2, 1], [65, 20, 2, 1],
  ] as const) {
    p.fill(rx, ry, rw, rh, C.gold);
  }
  p.dot(58, 13, C.ink);
  p.dot(62, 13, C.ink);
  p.dot(57, 15, C.pink);
  p.dot(63, 15, C.pink);
  p.fill(59, 16, 3, 1, C.ink);

  // center lantern over the counter
  lanternGlyph(p, 60, 1);

  // the grill hood: sunset stripes deepen with level, flames at the pits
  p.fill(42, 25, 36, 4, C.ink);
  const stripeColors = [C.pink, C.orange, C.gold, C.teal];
  for (let i = 0; i < dressing.grillStripes; i++) p.fill(43, 25 + i, 34, 1, stripeColors[i]);
  for (const fx of [49, 59, 69]) {
    p.dot(fx, 27, C.goldLight);
    p.dot(fx, 28, C.orange);
  }

  // canisters stand on the slab (3, or 4 at the top kitchen tier)
  const canisterAt = [44, 52, 60, 68].slice(0, kitchen.canisters);
  for (const cx of canisterAt) {
    p.fill(cx, 26, 5, 3, C.pot);
    p.fill(cx, 25, 5, 1, C.potDark);
    p.dot(cx + 2, 24, C.potDark);
    p.dot(cx + 1, 27, "#8A8D91");
  }

  // the counter: wood slab over a tiled (or plank) front
  p.fill(34, 29, 52, 1, C.woodLight);
  p.fill(34, 30, 52, 1, C.wood);
  const tilePalette = [C.teal, C.pink, C.clothPurple, "#B9A3D9"];
  for (let row = 0; row < 3; row++) {
    const y = 31 + row;
    if (kitchen.tiled && row < kitchen.tileRows) {
      for (let x = 34; x < 86; x += 4) {
        const col = tilePalette[(pixelHash(`tile-${x}-${row}`) >> 3) % tilePalette.length];
        p.fill(x, y, 4, 1, col);
        p.dot(x, y, C.ink);
      }
    } else if (kitchen.tiled) {
      p.fill(34, y, 52, 1, C.woodDark);
    } else {
      p.fill(34, y, 52, 1, C.wood);
      for (let x = 38; x < 86; x += 6) p.dot(x, y, C.woodDark);
    }
  }
  // a chili ristra hangs by the pots from kitchen tier 2
  if (kitchen.ristra) ristra(p, 89, 25, 6);
  // a row of ready tacos rides the slab at kitchen tier 3
  if (kitchen.trayRow) {
    for (const tx of [36, 78]) {
      p.fill(tx, 28, 5, 1, "#B9C0C9");
      p.fill(tx + 1, 27, 3, 1, C.gold);
      p.dot(tx + 2, 27, C.leaf);
    }
  }
}

/* ------------------------------------------------------------------ */
/* One booth: mat, bench, dressed table, stools                        */
/* ------------------------------------------------------------------ */
function paintBooth(
  p: PixelPainter,
  side: "left" | "right",
  top: number,
  tablesTier: number,
  chairsTier: number
) {
  const bx = boothX(side);
  const mx = (lx: number, w: number) => (side === "left" ? bx + lx : bx + (BOOTH.w - lx - w));
  const bench = benchStyleFor(chairsTier);
  const tableDress = tableDressingFor(tablesTier);

  // booth mat + shadow
  p.fill(bx + 1, top + 2, BOOTH.w - 2, BOOTH.h, C.shadow);
  p.fill(bx, top + 1, BOOTH.w, BOOTH.h, C.boothMat);
  p.fill(bx, top + 1, BOOTH.w, 1, C.grout);

  // bench back against the wall
  const cushionColor =
    bench.cushion === "grand" ? C.clothPurple : bench.cushion === "pink" ? C.pinkDark : C.wood;
  p.fill(mx(0, 9), top + 2, 9, 23, C.woodDark);
  p.fill(mx(1, 7), top + 3, 7, 21, cushionColor);
  if (bench.cushion === "teal" || bench.cushion === "pink" || bench.cushion === "grand") {
    p.fill(mx(1, 7), top + 12, 7, 2, bench.cushion === "teal" ? C.teal : bench.cushion === "pink" ? C.pink : C.gold);
  }
  if (bench.tufted) {
    for (const ty of [6, 11, 16, 21]) for (const tx of [2, 5]) p.dot(mx(tx, 1), top + ty, C.ink);
  }
  if (bench.goldTrim) p.fill(mx(1, 7), top + 3, 7, 1, C.gold);
  // seat ledge the diners sit on
  p.fill(mx(9, 3), top + 4, 3, 20, bench.cushion === "wood" ? C.woodLight : cushionColor);

  // stools under the stool-side seats
  for (const seatY of BOOTH.seatY) {
    p.fill(mx(24, 9), top + seatY + 8, 9, 2, C.wood);
    p.dot(mx(25, 1), top + seatY + 10, C.woodDark);
    p.dot(mx(31, 1), top + seatY + 10, C.woodDark);
  }

  // the table
  const t = BOOTH.table;
  const tx = mx(t.x, t.w);
  p.fill(tx + 1, top + t.y + 2, t.w, t.h, C.shadow);
  const cloth = tablesTier > 0 ? CLOTH[Math.min(tablesTier, 3)] : C.wood;
  p.fill(tx, top + t.y, t.w, t.h, cloth);
  p.fill(tx, top + t.y, t.w, 1, C.ink);
  p.fill(tx, top + t.y + t.h - 1, t.w, 1, C.ink);
  p.fill(tx, top + t.y, 1, t.h, C.ink);
  p.fill(tx + t.w - 1, top + t.y, 1, t.h, C.ink);
  p.fill(tx + 1, top + t.y + 1, t.w - 2, 1, "rgba(255,255,255,0.20)");

  // serving tray rides the middle at tables tier 3
  if (tableDress.tray) p.fill(tx + 4, top + t.y + 7, 8, 6, "#9AA1A9");

  // place settings at the four seat spots
  const plateAt = (lx: number, seatY: number, withFood: boolean) => {
    const px0 = mx(lx, 5);
    const py = top + seatY + 4;
    p.fill(px0, py, 5, 3, C.plate);
    p.dot(px0, py, C.plateShade);
    if (withFood) {
      p.fill(px0 + 1, py, 3, 1, C.gold);
      p.dot(px0 + 2, py, C.leaf);
    }
  };
  // bench-side plates sit on the table's bench edge, stool-side mirrored
  plateAt(t.x + 1, BOOTH.seatY[0], tableDress.food);
  plateAt(t.x + 1, BOOTH.seatY[1], tableDress.food);
  plateAt(t.x + t.w - 6, BOOTH.seatY[0], tableDress.food);
  plateAt(t.x + t.w - 6, BOOTH.seatY[1], tableDress.food);

  // salsa bowls between the seats at tables tier 2+
  if (tableDress.food) {
    p.fill(tx + 6, top + t.y + 6, 3, 2, C.salsaRed);
    p.fill(tx + 6, top + t.y + 12, 3, 2, C.salsaGreen);
    p.dot(tx + 7, top + t.y + 6, C.leaf);
    p.dot(tx + 7, top + t.y + 12, C.chili);
  }
  // cups with straws at tables tier 1+
  if (tableDress.cups) {
    for (const seatY of BOOTH.seatY) {
      for (const lx of [t.x + 2, t.x + t.w - 4]) {
        const cx = mx(lx, 2);
        p.fill(cx, top + seatY + 8, 2, 3, C.cream);
        p.dot(cx, top + seatY + 7, C.pink);
      }
    }
  }
  // two-tone fringe along the table's inner (room-side) edge at tier 3
  if (tableDress.fringe) {
    const fx = side === "left" ? tx + t.w : tx - 1;
    for (let fy = top + t.y + 2; fy < top + t.y + t.h - 1; fy += 2) {
      p.dot(fx, fy, (fy / 2) % 2 === 0 ? C.pink : C.teal);
    }
  }
}

/* ------------------------------------------------------------------ */
/* The floor + entrance                                                */
/* ------------------------------------------------------------------ */
function paintFloor(
  p: PixelPainter,
  tableCount: number,
  level: number,
  gathering: boolean,
  halloween: boolean
) {
  const rows = roomRows(tableCount);
  const floorBottom = rows - ENTRANCE_ROWS;
  const dressing = dressingForLevel(level);

  // baseboard shadow where wall meets floor
  p.fill(0, WALL_STACK_ROWS, PIXEL_ROOM_COLS, 2, C.ink);
  p.fill(0, WALL_STACK_ROWS + 1, PIXEL_ROOM_COLS, 1, C.wallDark);

  // tile field: 6-unit tiles, grout lines, sparse accent tiles
  p.fill(0, FLOOR_TOP, PIXEL_ROOM_COLS, floorBottom - FLOOR_TOP, C.floor);
  for (let ty = 0; ty * 6 + FLOOR_TOP < floorBottom; ty++) {
    for (let tx = 0; tx * 6 < PIXEL_ROOM_COLS; tx++) {
      const x = tx * 6;
      const y = FLOOR_TOP + ty * 6;
      if ((tx + ty) % 2 === 0) p.fill(x, y, 6, Math.min(6, floorBottom - y), C.floorAlt);
      const h = pixelHash(`floor-${tx}-${ty}`);
      if (h % 17 === 0) p.fill(x + 1, y + 1, 4, 4, C.tealDark);
      else if (h % 23 === 0) p.fill(x + 1, y + 1, 4, 4, C.pinkDark);
    }
  }
  for (let x = 0; x <= PIXEL_ROOM_COLS; x += 6) p.fill(x, FLOOR_TOP, 1, floorBottom - FLOOR_TOP, C.grout);
  for (let y = FLOOR_TOP; y <= floorBottom; y += 6) p.fill(0, y, PIXEL_ROOM_COLS, 1, C.grout);

  if (gathering) p.fill(0, FLOOR_TOP, PIXEL_ROOM_COLS, floorBottom - FLOOR_TOP, C.gatherWash);

  // patterned medallion rug in the open floor at L3
  if (dressing.rug) {
    p.ring(60, FLOOR_TOP + 12, 9, 7, C.teal);
    p.ring(60, FLOOR_TOP + 12, 6, 5, C.pink);
    p.disc(60, FLOOR_TOP + 12, 3, C.gold);
    p.dot(60, FLOOR_TOP + 12, C.pink);
  }

  // a barrel keeps the counter company from L2
  if (dressing.barrel) {
    const bx = 40;
    const by = FLOOR_TOP + 1;
    p.fill(bx, by, 7, 8, C.wood);
    p.fill(bx, by + 1, 7, 1, C.woodDark);
    p.fill(bx, by + 6, 7, 1, C.woodDark);
    p.fill(bx + 1, by, 5, 1, C.woodLight);
  }

  // potted cacti flank the entrance as the level dressing grows
  if (dressing.cornerPlants >= 1) cactus(p, 28, floorBottom - 9);
  if (dressing.cornerPlants >= 2) cactus(p, 86, floorBottom - 9);

  // Halloween: pixel pumpkins flank the mat
  if (halloween) {
    pumpkin(p, 33, floorBottom - 6);
    pumpkin(p, 80, floorBottom - 6);
  }

  // entrance: stone border + woven mat at the foot
  p.fill(0, floorBottom, PIXEL_ROOM_COLS, ENTRANCE_ROWS, C.stone);
  for (let x = 4; x < PIXEL_ROOM_COLS; x += 9) p.dot(x, floorBottom + 3, C.stoneDark);
  p.fill(0, rows - 1, PIXEL_ROOM_COLS, 1, C.stoneDark);
  p.fill(46, floorBottom + 1, 28, 5, C.matDark);
  p.fill(47, floorBottom + 2, 26, 3, C.mat);
  for (let x = 50; x < 72; x += 5) p.dot(x, floorBottom + 3, C.gold);
}

/* ------------------------------------------------------------------ */
/* The room                                                            */
/* ------------------------------------------------------------------ */
export function PixelTacoRoom({
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
  const px = width / PIXEL_ROOM_COLS;
  const tableCount = tableDiners.length;
  const rows = roomRows(tableCount);
  const dressing = dressingForLevel(level);
  const kitchen = kitchenDressingFor(kitchenTier);

  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  useEffect(() => {
    loadCustomPawn().then((p) => p && setPawn(p)).catch(() => undefined);
  }, []);

  const draw = (p: PixelPainter) => {
    paintWallStack(p, level, kitchenTier);
    paintFloor(p, tableCount, level, gathering, halloween);
    tableDiners.forEach((_, i) => {
      const { side, top } = boothForTable(i);
      paintBooth(p, side, top, tablesTier, chairsTier);
    });
    // hanging lanterns over the aisle arrive with level dressing
    if (dressing.extraLanterns >= 1) lanternGlyph(p, 60, FLOOR_TOP + 12);
    if (dressing.extraLanterns >= 2 && tableCount > 2) lanternGlyph(p, 60, FLOOR_TOP + 42);
  };

  const glowTiers = isNight ? 4 : 3;
  const glowSize = (glowTiers * 2 + 1) * px;
  const lanternGlow = (ux: number, uy: number, delay: number) => (
    <PixelPulse
      key={`${ux}-${uy}`}
      duration={2100}
      min={isNight ? 0.75 : 0.5}
      max={1}
      delay={delay}
      style={{ position: "absolute", left: ux * px - glowSize / 2, top: uy * px - glowSize / 2 }}
    >
      <PixelGlow px={px} tiers={glowTiers} />
    </PixelPulse>
  );

  const heroSize = Math.round(px * 15);

  return (
    <View
      onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}
      style={{ position: "relative", width: "100%", height: rows * px, backgroundColor: C.wall }}
    >
      <PixelCanvas cols={PIXEL_ROOM_COLS} rows={rows} px={px} draw={draw} />

      {/* lantern light pools (stronger after dark) */}
      {lanternGlow(60, 3, 0)}
      {dressing.extraLanterns >= 1 && lanternGlow(60, FLOOR_TOP + 14, 500)}
      {dressing.extraLanterns >= 2 && tableCount > 2 && lanternGlow(60, FLOOR_TOP + 44, 1000)}

      {/* steam curls off the grill once the kitchen is furnished */}
      {kitchen.steam && (
        <View pointerEvents="none" style={{ position: "absolute", left: 49 * px, top: 20 * px }}>
          <PixelSteam px={px} />
        </View>
      )}

      {/* the station label under the counter */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, right: 0, top: (WALL_STACK_ROWS + 0.6) * px, alignItems: "center" }}
      >
        <Text
          style={{
            color: "#B9A3D9",
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

      {/* diners — the same seat slicing the drawn room used:
          bench takes slice(0, pawnFirst ? 1 : 2), stools take slice(2, 4) */}
      {tableDiners.map((group, i) => {
        const pawnFirst = i === 0;
        const { side, top } = boothForTable(i);
        return (
          <View key={i} pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0 }}>
            {group.slice(0, pawnFirst ? 1 : 2).map((person, seatIndex) => {
              const pos = boothSeatPos(side, "bench", seatIndex as 0 | 1, top);
              return (
                <View key={person.id} style={{ position: "absolute", left: pos.x * px, top: pos.y * px }}>
                  <PixelSeatedDiner person={person} px={px} flipX={pos.flipX} delay={(seatIndex + 1) * 180} />
                </View>
              );
            })}
            {group.slice(2, 4).map((person, seatIndex) => {
              const pos = boothSeatPos(side, "stool", seatIndex as 0 | 1, top);
              return (
                <View key={person.id} style={{ position: "absolute", left: pos.x * px, top: pos.y * px }}>
                  <PixelSeatedDiner person={person} px={px} flipX={pos.flipX} delay={(seatIndex + 2) * 180} />
                </View>
              );
            })}
          </View>
        );
      })}

      {/* the hero stands in the open floor, as in his mockup */}
      {pawn && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 60 * px - heroSize / 2, top: (FLOOR_TOP + 3) * px, alignItems: "center" }}
        >
          <FigureName name={pawn.name} />
          <View style={{ borderWidth: 2, borderColor: C.gold, backgroundColor: "rgba(242,181,58,0.12)", padding: 1 }}>
            <PawnPreview pawn={pawn} size={heroSize} />
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
