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
// CHUNK PASS (v149 verdict: "It's certainly not the same as the mockup"):
// the grid is COARSE — 60 units across, so a unit is ~6pt on his phone
// and everything renders BIG: a sun you can grin back at, diners with
// faces, booths that read as booths, a tall room that fills the screen.
// The palette is the mockup's too: saturated purple brick, deep
// blue-violet floor, vivid sunset stripes. If a detail can't be read at
// arm's length, it gets bigger or it goes.
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
  BAND_ROWS,
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

/* The retro-cantina palette, in pixels — the mockup's saturated set. */
const C = {
  ink: PIXEL_INK,
  wall: "#5E3A96",
  wallDark: "#452A73",
  wallLight: "#7550B8",
  dome: "#3B2166",
  floor: "#33306E",
  floorAlt: "#3E3A82",
  grout: "#252254",
  boothMat: "#2C2150",
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
  stone: "#8A8D96",
  stoneDark: "#5E6068",
  pot: "#6A6E78",
  potDark: "#43464E",
  chili: "#D92B2B",
  chiliDark: "#9E1B1B",
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

/** A potted pixel cactus (6 wide, 8 tall). */
function cactus(p: PixelPainter, x: number, y: number) {
  // arms + trunk
  p.fill(x + 2, y + 1, 2, 5, C.leaf);
  p.fill(x, y + 2, 1, 3, C.leaf);
  p.fill(x, y + 2, 2, 1, C.leaf);
  p.fill(x + 5, y + 3, 1, 2, C.leaf);
  p.fill(x + 4, y + 3, 2, 1, C.leaf);
  p.dot(x + 2, y, "#E86A92");
  // pot
  p.fill(x + 1, y + 6, 4, 1, "#B0724A");
  p.fill(x + 1, y + 7, 4, 1, "#8E5636");
}

/** A pixel jack-o'-lantern (Halloween dressing, drawn not emoji). */
function pumpkin(p: PixelPainter, x: number, y: number) {
  p.fill(x + 4, y, 2, 1, C.leaf);
  p.fill(x + 1, y + 1, 7, 6, "#E67E22");
  p.fill(x, y + 2, 9, 4, "#E67E22");
  p.fill(x + 1, y + 7, 7, 1, "#C75B12");
  // face: two eyes, a nose, a grin — all big enough to read
  p.dot(x + 2, y + 3, C.ink);
  p.dot(x + 6, y + 3, C.ink);
  p.dot(x + 4, y + 4, C.ink);
  p.fill(x + 2, y + 5, 5, 1, C.ink);
}

/** A sombrero on a wall hook (7 wide, 4 tall) — the mockup's dressing. */
function sombrero(p: PixelPainter, x: number, y: number) {
  p.fill(x + 2, y, 3, 1, C.gold);
  p.fill(x + 2, y + 1, 3, 1, C.goldLight);
  p.fill(x, y + 2, 7, 1, C.gold);
  p.fill(x + 2, y + 2, 3, 1, C.pink);
  p.dot(x + 1, y + 2, C.pink);
  p.dot(x + 5, y + 2, C.pink);
  p.fill(x + 3, y + 3, 1, 1, C.gold);
}

/** A hanging lantern glyph (the glow overlays pool its light). */
function lanternGlyph(p: PixelPainter, cx: number, y: number) {
  p.fill(cx - 1, y, 2, 1, C.woodDark);
  p.fill(cx - 3, y + 1, 6, 1, C.gold);
  p.fill(cx - 3, y + 2, 6, 3, C.goldLight);
  p.fill(cx - 1, y + 2, 2, 2, "#FFF3D6");
  p.fill(cx - 3, y + 5, 6, 1, C.gold);
}

/* ------------------------------------------------------------------ */
/* The wall stack: brick, arch + sun, grill, cantina counter           */
/* ------------------------------------------------------------------ */
function paintWallStack(p: PixelPainter, level: number, kitchenTier: number) {
  const dressing = dressingForLevel(level);
  const kitchen = kitchenDressingFor(kitchenTier);

  // brick field — chunky courses, saturated purple
  p.fill(0, 0, PIXEL_ROOM_COLS, WALL_STACK_ROWS, C.wall);
  for (let y = 3; y < WALL_STACK_ROWS; y += 3) {
    p.fill(0, y, PIXEL_ROOM_COLS, 1, C.wallDark);
    for (let x = (y % 6 === 0 ? 4 : 8); x < PIXEL_ROOM_COLS; x += 8) p.dot(x, y - 1, C.wallDark);
  }
  // stone rim across the very top (the mockup's grey brick border)
  p.fill(0, 0, PIXEL_ROOM_COLS, 2, C.stone);
  p.fill(0, 1, PIXEL_ROOM_COLS, 1, C.stoneDark);
  for (let x = 3; x < PIXEL_ROOM_COLS; x += 6) p.dot(x, 0, C.stoneDark);

  // papel-picado bunting under the rim: chunky pixel flags on a sag
  const flagColors = [C.teal, C.pink, C.gold, C.pink, C.teal];
  for (let i = 0; i < 9; i++) {
    const fx = 4 + i * 6;
    if (fx > 24 && fx < 34) continue; // the lantern hangs center
    const fy = 3 + (i % 2);
    const col = flagColors[i % flagColors.length];
    p.fill(fx, fy, 5, 2, col);
    p.fill(fx + 1, fy + 2, 3, 1, col);
    p.dot(fx + 2, fy + 3, col);
  }
  // chili strings hang in the garland line, like the mockup's top edge
  ristra(p, 13, 3, 5);
  ristra(p, 43, 3, 5);

  // framed pictures on the side walls (sunset left, Memphis right)
  const picture = (x: number, sunset: boolean) => {
    p.fill(x, 10, 8, 9, C.woodDark);
    p.fill(x + 1, 11, 6, 7, sunset ? C.dome : C.tealDark);
    if (sunset) {
      p.disc(x + 4, 13, 2, C.goldLight);
      p.fill(x + 1, 14, 6, 1, C.pink);
      p.fill(x + 1, 15, 6, 1, C.orange);
      p.fill(x + 1, 16, 6, 2, C.gold);
    } else {
      p.fill(x + 2, 12, 3, 3, C.pink);
      p.dot(x + 5, 14, C.goldLight);
      p.fill(x + 2, 16, 4, 1, C.pink);
      p.dot(x + 2, 13, C.goldLight);
    }
  };
  picture(1, true);
  picture(51, false);

  // sombreros hang under the pictures at the grand level
  if (dressing.sombreros) {
    sombrero(p, 2, 20);
    sombrero(p, 51, 20);
  }

  // menu boards flank the arch from L2 (drawn boards, no words)
  if (dressing.menuBoards) {
    const board = (x: number) => {
      p.fill(x, 12, 7, 11, C.ink);
      p.fill(x + 1, 13, 5, 9, "#2E1B47");
      p.fill(x + 1, 13, 5, 1, C.pink);
      p.fill(x + 1, 15, 3, 1, C.teal);
      p.fill(x + 1, 17, 4, 1, C.cream);
      p.fill(x + 1, 19, 3, 1, C.cream);
      p.dot(x + 5, 15, C.gold);
      p.dot(x + 5, 17, C.gold);
      p.dot(x + 5, 19, C.gold);
      p.fill(x + 2, 21, 3, 1, C.gold);
    };
    board(9);
    board(44);
  }

  // pilasters: teal columns with pink capitals carry the arch
  for (const px0 of [16, 42]) {
    p.fill(px0, 16, 2, 14, C.tealDark);
    p.fill(px0, 16, 2, 1, C.pink);
    p.fill(px0, 28, 2, 2, C.pink);
  }

  // the dome inside the arch: deep purple, so the sun blazes on it
  for (let dy = -9; dy <= 0; dy++) {
    const half = Math.floor(Math.sqrt(Math.max(0, 9 * 9 - dy * dy)));
    p.fill(30 - half, 28 + dy, half * 2 + 1, 1, C.dome);
  }
  for (const [sx, sy] of [[24, 20], [36, 21], [26, 26], [34, 26]] as const) p.dot(sx, sy, C.gold);
  // arch rings: teal outside with gold trim dots, gold line inside
  arc(p, 30, 28, 12, 10, C.teal);
  arc(p, 30, 28, 10, 9, C.gold);
  for (const [tx, ty] of [[30, 16], [23, 20], [37, 20], [20, 24], [40, 24]] as const) p.dot(tx, ty, C.goldLight);

  // THE SUN — the room's crown, at mockup scale: a big grinning face
  // with a ray ring, drawn over the dome.
  for (const [rx, ry] of [[29, 14], [36, 16], [37, 21], [36, 26], [29, 28], [21, 21], [22, 16], [22, 26]] as const) {
    p.fill(rx, ry, 2, 2, C.gold);
  }
  p.disc(30, 22, 5, C.gold);
  p.disc(30, 22, 4, C.goldLight);
  // face: two tall eyes, raised smile corners, rosy cheeks
  p.fill(28, 20, 1, 2, C.ink);
  p.fill(32, 20, 1, 2, C.ink);
  p.dot(26, 23, C.pink);
  p.dot(34, 23, C.pink);
  p.dot(27, 23, C.ink);
  p.dot(33, 23, C.ink);
  p.fill(28, 24, 5, 1, C.ink);

  // center lantern over the counter
  lanternGlyph(p, 30, 1);

  // the grill hood: sunset stripes deepen with level, star medallions
  p.fill(19, 30, 22, 5, C.ink);
  const stripeColors = [C.pink, C.orange, C.gold, C.teal];
  for (let i = 0; i < dressing.grillStripes; i++) p.fill(20, 31 + i, 20, 1, stripeColors[i]);
  for (const mx0 of [24, 30, 36]) {
    p.dot(mx0, 32, C.goldLight);
    p.dot(mx0 - 1, 32, C.gold);
    p.dot(mx0 + 1, 32, C.gold);
    p.dot(mx0, 31, C.gold);
    p.dot(mx0, 33, C.gold);
  }

  // canisters stand on the slab (3, or 4 at the top kitchen tier)
  const canisterAt = [20, 26, 32, 38].slice(0, kitchen.canisters);
  for (const cx of canisterAt) {
    p.fill(cx, 35, 4, 3, C.pot);
    p.fill(cx, 34, 4, 1, C.potDark);
    p.dot(cx + 1, 36, "#9BA0A8");
  }

  // the counter: wood slab over a tiled (or plank) front
  p.fill(16, 38, 28, 1, C.woodLight);
  p.fill(16, 39, 28, 1, C.wood);
  const tilePalette = [C.teal, C.pink, C.clothPurple, "#B9A3D9"];
  for (let row = 0; row < 3; row++) {
    const y = 40 + row * 2;
    if (kitchen.tiled && row < kitchen.tileRows) {
      for (let x = 16; x < 44; x += 4) {
        const col = tilePalette[(pixelHash(`tile-${x}-${row}`) >> 3) % tilePalette.length];
        p.fill(x, y, 4, 2, col);
        p.dot(x, y, C.ink);
      }
    } else if (kitchen.tiled) {
      p.fill(16, y, 28, 2, C.woodDark);
    } else {
      p.fill(16, y, 28, 2, C.wood);
      for (let x = 19; x < 44; x += 5) p.dot(x, y + 1, C.woodDark);
    }
  }
  // a chili ristra hangs by the pots from kitchen tier 2
  if (kitchen.ristra) ristra(p, 46, 33, 7);
  // a row of ready tacos rides the slab at kitchen tier 3
  if (kitchen.trayRow) {
    for (const tx of [18, 38]) {
      p.fill(tx, 37, 5, 1, "#B9C0C9");
      p.fill(tx + 1, 36, 3, 1, C.gold);
      p.dot(tx + 2, 36, C.leaf);
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
  p.fill(bx + 1, top + 2, BOOTH.w - 1, BOOTH.h, C.shadow);
  p.fill(bx, top + 1, BOOTH.w, BOOTH.h, C.boothMat);
  p.fill(bx, top + 1, BOOTH.w, 1, C.grout);

  // bench back against the wall — a real piece of furniture now:
  // chunky frame, cushion panel, a strip that climbs the tiers
  const cushionColor =
    bench.cushion === "grand" ? C.clothPurple : bench.cushion === "pink" ? C.pinkDark : C.wood;
  p.fill(mx(0, 5), top + 2, 5, 26, C.woodDark);
  p.fill(mx(1, 3), top + 3, 3, 24, cushionColor);
  if (bench.cushion === "teal" || bench.cushion === "pink" || bench.cushion === "grand") {
    p.fill(mx(1, 3), top + 14, 3, 2, bench.cushion === "teal" ? C.teal : bench.cushion === "pink" ? C.pink : C.gold);
  }
  if (bench.tufted) {
    for (const ty of [7, 12, 18, 23]) p.dot(mx(2, 1), top + ty, C.ink);
  }
  if (bench.goldTrim) p.fill(mx(1, 3), top + 3, 3, 1, C.gold);
  // seat ledge the diners sit on
  p.fill(mx(5, 2), top + 4, 2, 22, bench.cushion === "wood" ? C.woodLight : cushionColor);

  // stools under the stool-side seats
  for (const seatY of BOOTH.seatY) {
    p.fill(mx(19, 4), top + seatY + 10, 4, 2, C.wood);
    p.dot(mx(19, 1), top + seatY + 12, C.woodDark);
    p.dot(mx(22, 1), top + seatY + 12, C.woodDark);
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

  // place settings at the four seat spots — plates big enough to see,
  // with a taco arc + leaf on top once the food tier lands
  const plateAt = (lx: number, seatY: number, withFood: boolean) => {
    const px0 = mx(lx, 6);
    const py = top + seatY + 7;
    p.fill(px0, py, 6, 4, C.plate);
    p.dot(px0, py + 3, C.plateShade);
    if (withFood) {
      p.fill(px0 + 1, py + 1, 4, 2, C.gold);
      p.dot(px0 + 2, py + 1, C.leaf);
      p.dot(px0 + 3, py + 2, C.salsaRed);
    }
  };
  plateAt(t.x + 1, BOOTH.seatY[0], tableDress.food);
  plateAt(t.x + 1, BOOTH.seatY[1], tableDress.food);
  plateAt(t.x + t.w - 7, BOOTH.seatY[0], tableDress.food);
  plateAt(t.x + t.w - 7, BOOTH.seatY[1], tableDress.food);

  // salsa bowls between the seats at tables tier 2+
  if (tableDress.food) {
    p.fill(tx + 4, top + t.y + 6, 4, 3, C.salsaRed);
    p.dot(tx + 5, top + t.y + 6, C.leaf);
    p.fill(tx + 4, top + t.y + 16, 4, 3, C.salsaGreen);
    p.dot(tx + 5, top + t.y + 16, C.chili);
  }
  // a serving tray rides the table's middle at tables tier 3
  if (tableDress.tray) {
    p.fill(tx + 3, top + t.y + 11, 5, 4, "#9AA1A9");
    p.dot(tx + 5, top + t.y + 12, C.gold);
  }
  // cups with straws at tables tier 1+
  if (tableDress.cups) {
    for (const seatY of BOOTH.seatY) {
      for (const lx of [t.x + 2, t.x + t.w - 4]) {
        const cx = mx(lx, 2);
        p.fill(cx, top + seatY + 12, 2, 3, C.cream);
        p.dot(cx, top + seatY + 11, C.pink);
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

  // tile field: big 6-unit tiles, readable grout, sparse accents and
  // gold sparkles — the mockup's deep blue-violet floor
  p.fill(0, FLOOR_TOP, PIXEL_ROOM_COLS, floorBottom - FLOOR_TOP, C.floor);
  for (let ty = 0; ty * 6 + FLOOR_TOP < floorBottom; ty++) {
    for (let tx = 0; tx * 6 < PIXEL_ROOM_COLS; tx++) {
      const x = tx * 6;
      const y = FLOOR_TOP + ty * 6;
      if ((tx + ty) % 2 === 0) p.fill(x, y, 6, Math.min(6, floorBottom - y), C.floorAlt);
      const h = pixelHash(`floor-${tx}-${ty}`);
      if (h % 17 === 0) p.fill(x + 1, y + 1, 4, 4, C.tealDark);
      else if (h % 23 === 0) p.fill(x + 1, y + 1, 4, 4, C.pinkDark);
      else if (h % 29 === 0) {
        p.dot(x + 3, y + 2, C.goldLight);
        p.dot(x + 2, y + 3, C.goldLight);
        p.dot(x + 3, y + 3, C.goldLight);
        p.dot(x + 4, y + 3, C.goldLight);
        p.dot(x + 3, y + 4, C.goldLight);
      }
    }
  }
  for (let x = 0; x <= PIXEL_ROOM_COLS; x += 6) p.fill(x, FLOOR_TOP, 1, floorBottom - FLOOR_TOP, C.grout);
  for (let y = FLOOR_TOP; y <= floorBottom; y += 6) p.fill(0, y, PIXEL_ROOM_COLS, 1, C.grout);

  if (gathering) p.fill(0, FLOOR_TOP, PIXEL_ROOM_COLS, floorBottom - FLOOR_TOP, C.gatherWash);

  // patterned medallion rug in the open floor at L3
  if (dressing.rug) {
    p.ring(30, FLOOR_TOP + 15, 7, 5, C.teal);
    p.ring(30, FLOOR_TOP + 15, 4, 3, C.pink);
    p.disc(30, FLOOR_TOP + 15, 2, C.gold);
    p.dot(30, FLOOR_TOP + 15, C.pink);
  }

  // a barrel keeps the entrance company from L2
  if (dressing.barrel) {
    const bx = 3;
    const by = floorBottom - 7;
    p.fill(bx, by, 6, 7, C.wood);
    p.fill(bx, by + 1, 6, 1, C.woodDark);
    p.fill(bx, by + 5, 6, 1, C.woodDark);
    p.fill(bx + 1, by, 4, 1, C.woodLight);
  }

  // potted cacti flank the entrance as the level dressing grows
  if (dressing.cornerPlants >= 1) cactus(p, 11, floorBottom - 8);
  if (dressing.cornerPlants >= 2) cactus(p, 43, floorBottom - 8);

  // Halloween: chunky pixel pumpkins flank the mat
  if (halloween) {
    pumpkin(p, 16, floorBottom - 8);
    pumpkin(p, 36, floorBottom - 8);
  }

  // entrance: stone border + woven mat at the foot
  p.fill(0, floorBottom, PIXEL_ROOM_COLS, ENTRANCE_ROWS, C.stone);
  for (let x = 3; x < PIXEL_ROOM_COLS; x += 6) p.dot(x, floorBottom + 4, C.stoneDark);
  p.fill(0, rows - 1, PIXEL_ROOM_COLS, 1, C.stoneDark);
  p.fill(21, floorBottom + 1, 18, 6, C.matDark);
  p.fill(22, floorBottom + 2, 16, 4, C.mat);
  for (let x = 24; x < 38; x += 4) p.dot(x, floorBottom + 3, C.gold);
  for (let x = 26; x < 38; x += 4) p.dot(x, floorBottom + 5, C.gold);
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
    if (dressing.extraLanterns >= 1) lanternGlyph(p, 30, FLOOR_TOP + BAND_ROWS - 5);
    if (dressing.extraLanterns >= 2 && tableCount > 2) lanternGlyph(p, 30, FLOOR_TOP + BAND_ROWS * 2 - 5);
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

  const heroSize = Math.round(px * 13);

  return (
    <View
      onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}
      style={{ position: "relative", width: "100%", height: rows * px, backgroundColor: C.wall }}
    >
      <PixelCanvas cols={PIXEL_ROOM_COLS} rows={rows} px={px} draw={draw} />

      {/* lantern light pools (stronger after dark) */}
      {lanternGlow(30, 4, 0)}
      {dressing.extraLanterns >= 1 && lanternGlow(30, FLOOR_TOP + BAND_ROWS - 2, 500)}
      {dressing.extraLanterns >= 2 && tableCount > 2 && lanternGlow(30, FLOOR_TOP + BAND_ROWS * 2 - 2, 1000)}

      {/* steam curls off the grill once the kitchen is furnished */}
      {kitchen.steam && (
        <View pointerEvents="none" style={{ position: "absolute", left: 24.5 * px, top: 28 * px }}>
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

      {/* the hero stands UNBOXED in the open floor, as in his mockup —
          nameplate and a soft ground shadow, no selection frame */}
      {pawn && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 30 * px - heroSize / 2, top: (FLOOR_TOP + 4) * px, alignItems: "center" }}
        >
          <FigureName name={pawn.name} />
          <View style={{ alignItems: "center", justifyContent: "flex-end" }}>
            <PawnPreview pawn={pawn} size={heroSize} />
            <View
              style={{
                width: heroSize * 0.78,
                height: px * 2.2,
                borderRadius: px * 1.1,
                backgroundColor: C.shadow,
                marginTop: -px * 1.6,
              }}
            />
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
