// ---------- the restaurants, rebuilt as paper dioramas ----------
// Paper rollout batch 1 (Jonathan's gate, 2026-10-21: "paper works
// much better. Theme it all to paper."). The Taco Stand proved the
// kit; this room is its parameterized sibling — ONE booth room driven
// by the per-cuisine configs in lib/paper-restaurant.ts, so pizza,
// burgers, sushi, the diner, the Upper Room, the Manna House and the
// generic restaurant each keep their identity (pizza oven + party
// band, red-and-white burger counter under crossed palms, the diner's
// pie case and coffee decanters, the sushi conveyor under bamboo,
// the communion table, the bread oven) while the booths, the diners
// and the hero all come from the shared paper kit — real hair and
// beards on every figure, the hero in his own clothes.
//
// Everything behavioral is the screen's, untouched: the same seat
// slicing (bench slice(0, pawnFirst ? 1 : 2), stools slice(2, 4)),
// the same per-table distribution, Serve the Table and Token Toss
// hosting in the screen below, the diner coffee purchase flow in the
// screen's card — the decanters here are its paper portrait. The
// progression ladders are data (lib/paper-restaurant): level
// dressing, furniture tiers, kitchen tiers — pieces, never recolors.

import { useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
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
import { arcadeCabinetsForTier } from "@/lib/pizza-features";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import type { PrayedPerson } from "@/lib/hometown";
import {
  BOOTH,
  ENTRANCE_ROWS,
  PAPER_ROOM_COLS,
  benchStyleFor,
  boothSeatPos,
  boothX,
  paperHash,
  tableDressingFor,
  type BoothSide,
} from "@/lib/paper-interior";
import {
  RESTAURANT_WALL_ROWS,
  paperCuisineFor,
  paperKitchenFor,
  paperRoomDressingFor,
  paperSignatureCount,
  pizzaPartyRows,
  restaurantBoothForTable,
  restaurantFloorTop,
  restaurantRoomRows,
  type PaperCuisineConfig,
  type PaperFoodKind,
} from "@/lib/paper-restaurant";

export type PaperPizzaTiers = { stageTier: number; arcadeTier: number; prizeTier: number };

const PLATE = "#FFF9F0";
const PLATE_SHADE = "#EFE3CC";
const STEEL = "#9AA1A9";
const ARCADE_COLORS = ["#FF5A7A", "#2EC4B6", "#FFD23F", "#7AE08B", "#9C6FB5", "#5AB9EA"];

/* ------------------------------------------------------------------ */
/* The plate — one painter per cuisine's food, shared with the       */
/* banquet room. cx/cy is the plate center.                          */
/* ------------------------------------------------------------------ */
export function paintPaperPlate(p: PaperPainter, kind: PaperFoodKind, cx: number, cy: number, withFood: boolean) {
  p.circle(cx, cy, 2.3, PLATE);
  p.circle(cx, cy, 1.65, PLATE_SHADE, { shadow: false });
  if (!withFood) return;
  switch (kind) {
    case "pizza":
      p.circle(cx, cy, 1.5, "#E8B96A", { shadow: false });
      p.circle(cx, cy, 1.15, "#C0392B", { shadow: false });
      p.circle(cx - 0.5, cy - 0.4, 0.3, "#F2C14E", { shadow: false });
      p.circle(cx + 0.55, cy + 0.3, 0.3, "#F2C14E", { shadow: false });
      p.circle(cx + 0.1, cy - 0.7, 0.22, "#4E8B4A", { shadow: false });
      break;
    case "burger":
      p.rect(cx - 1.3, cy + 0.5, 2.6, 0.7, "#E8B96A", { r: 0.3, shadow: false });
      p.rect(cx - 1.35, cy - 0.05, 2.7, 0.55, "#6E3B1E", { r: 0.25, shadow: false });
      p.rect(cx - 1.4, cy - 0.5, 2.8, 0.4, "#5E9C4E", { r: 0.2, shadow: false });
      p.path(`M ${cx - 1.3} ${cy - 0.55} A 1.3 1.1 0 0 1 ${cx + 1.3} ${cy - 0.55} Z`, "#F0C078", { shadow: false });
      break;
    case "sushi":
      p.rect(cx - 1.7, cy - 1.1, 3.4, 2.2, "#23262E", { r: 0.5, shadow: false });
      for (const ox of [-1.0, 0, 1.0]) {
        p.circle(cx + ox, cy, 0.52, "#F5F2EA", { shadow: false });
        p.circle(cx + ox, cy, 0.3, ox === 0 ? "#E2725B" : "#2E3138", { shadow: false });
      }
      break;
    case "pie":
      p.poly(`${cx - 1.4},${cy + 0.9} ${cx + 1.4},${cy + 0.9} ${cx},${cy - 1.3}`, "#C0392B", { shadow: false });
      p.poly(`${cx - 1.4},${cy + 0.9} ${cx + 1.4},${cy + 0.9} ${cx + 0.9},${cy + 0.35} ${cx - 0.9},${cy + 0.35}`, "#E8A84C", {
        shadow: false,
      });
      p.circle(cx, cy + 0.1, 0.42, "#FFF6E9", { shadow: false });
      break;
    case "bread":
      p.ellipse(cx - 0.4, cy + 0.1, 1.35, 0.85, "#D9A45B", { shadow: false });
      p.line(cx - 1.0, cy - 0.25, cx - 0.4, cy + 0.05, "#B57F35", 0.3);
      p.line(cx - 0.3, cy - 0.4, cx + 0.3, cy - 0.1, "#B57F35", 0.3);
      // the cup beside the loaf — wine-dark for the communion table
      p.path(`M ${cx + 0.9} ${cy - 1.0} L ${cx + 1.7} ${cy - 1.0} L ${cx + 1.55} ${cy - 0.1} L ${cx + 1.05} ${cy - 0.1} Z`, "#C8A24A", {
        shadow: false,
      });
      p.rect(cx + 1.22, cy - 0.1, 0.16, 0.55, "#C8A24A", { shadow: false });
      break;
    case "feast":
    case "supper":
      p.ellipse(cx, cy + 0.15, 1.6, 1.0, "#8A4B24", { shadow: false });
      p.ellipse(cx - 0.3, cy - 0.3, 1.0, 0.6, "#A85E2E", { shadow: false });
      p.circle(cx - 1.1, cy - 0.8, 0.3, "#5E9C4E", { shadow: false });
      p.circle(cx + 1.15, cy - 0.7, 0.3, "#C0392B", { shadow: false });
      p.circle(cx + 0.4, cy - 1.0, 0.26, "#F2C14E", { shadow: false });
      break;
  }
}

/** A small glowing candle (candlelit centerpieces, sconces, stands). */
function candleGlyph(p: PaperPainter, cx: number, baseY: number, h = 2.6) {
  p.rect(cx - 0.45, baseY - h, 0.9, h, "#F5EFE0", { r: 0.3 });
  p.ellipse(cx, baseY - h - 0.75, 0.5, 0.85, "#FFC46B", { shadow: false });
  p.ellipse(cx, baseY - h - 0.55, 0.26, 0.5, "#FFF3D6", { shadow: false });
}

/** A paper jack-o'-lantern (Halloween dressing, drawn not emoji). */
function pumpkin(p: PaperPainter, cx: number, baseY: number) {
  p.ellipse(cx - 2.6, baseY - 3.1, 2.2, 2.8, "#D96F1B");
  p.ellipse(cx + 2.6, baseY - 3.1, 2.2, 2.8, "#D96F1B");
  p.ellipse(cx, baseY - 3.3, 3.3, 3.1, "#E67E22");
  p.rect(cx - 0.5, baseY - 7.2, 1.0, 1.2, "#4E8B4A", { r: 0.4 });
  p.poly(`${cx - 1.9},${baseY - 3.9} ${cx - 0.7},${baseY - 3.9} ${cx - 1.3},${baseY - 4.9}`, PAPER_INK, { shadow: false });
  p.poly(`${cx + 0.7},${baseY - 3.9} ${cx + 1.9},${baseY - 3.9} ${cx + 1.3},${baseY - 4.9}`, PAPER_INK, { shadow: false });
  p.path(
    `M ${cx - 1.8} ${baseY - 2.2} Q ${cx} ${baseY - 0.9} ${cx + 1.8} ${baseY - 2.2} Q ${cx} ${baseY - 1.5} ${cx - 1.8} ${baseY - 2.2} Z`,
    PAPER_INK,
    { shadow: false }
  );
}

/* ------------------------------------------------------------------ */
/* Overhead dressing — hangs from the top of the wall stack (below   */
/* the pizza party band when there is one).                          */
/* ------------------------------------------------------------------ */
function paintOverhead(p: PaperPainter, config: PaperCuisineConfig, count: number, top: number, isNight: boolean) {
  if (count <= 0) return;
  const y = top + 6.5;
  switch (config.overhead) {
    case "awning": {
      // the striped canopy: red-and-white paper stripes, scalloped hem
      const stripes = Math.max(6, count);
      const w = PAPER_ROOM_COLS / stripes;
      for (let i = 0; i < stripes; i++) {
        p.rect(i * w, top, w + 0.2, 6.4, i % 2 === 0 ? "#D22630" : "#FFFFFF", { shadow: false, edge: false, r: 0 });
        p.circle(i * w + w / 2, top + 6.4, w / 2, i % 2 === 0 ? "#D22630" : "#FFFFFF", { shadow: false, edge: false });
      }
      break;
    }
    case "lanterns": {
      // noren-warm paper lanterns: cream ovals with a vermillion band
      const n = Math.min(count, 6);
      for (let i = 0; i < n; i++) {
        const cx = 14 + (i * 72) / Math.max(1, n - 1 || 1);
        p.line(cx, top, cx, top + 2.2, PAPER_INK, 0.4);
        p.ellipse(cx, top + 5.4, 2.6, 3.1, "#F5EFE0");
        p.rect(cx - 2.6, top + 4.6, 5.2, 1.1, config.accent, { shadow: false, edge: false, r: 0 });
        p.glow(cx, top + 5.4, isNight ? 5 : 3, "#FFD9A0", isNight ? 0.45 : 0.22);
      }
      break;
    }
    case "pendants":
    case "bakery-pendants": {
      const n = Math.min(count, 7);
      for (let i = 0; i < n; i++) {
        const cx = 12 + (i * 76) / Math.max(1, n - 1 || 1);
        p.line(cx, top, cx, top + 3.4, PAPER_INK, 0.45);
        p.path(`M ${cx - 2.6} ${top + 6.4} A 2.6 2.6 0 0 1 ${cx + 2.6} ${top + 6.4} Z`, config.overhead === "pendants" ? "#3A3F46" : "#8A6A34");
        p.circle(cx, top + 6.7, 0.8, "#FFF3D6", { shadow: false });
        p.glow(cx, top + 7.2, isNight ? 5.5 : 3.2, "#FFC46B", isNight ? 0.5 : 0.26);
      }
      break;
    }
    case "oil-lamps": {
      const n = Math.min(count, 7);
      for (let i = 0; i < n; i++) {
        const cx = 12 + (i * 76) / Math.max(1, n - 1 || 1);
        p.line(cx, top, cx, top + 3.0, PAPER_INK, 0.4);
        p.rect(cx - 1.5, top + 5.6, 3.0, 0.8, "#8A6A34", { r: 0.35 });
        p.ellipse(cx, top + 4.4, 1.05, 1.5, "#FFE9B8", { shadow: false });
        p.ellipse(cx, top + 4.5, 0.5, 0.85, "#FF9A3D", { shadow: false });
        p.glow(cx, top + 4.6, isNight ? 5 : 2.8, "#FFB84D", isNight ? 0.5 : 0.24);
      }
      break;
    }
    default: {
      // bistro string lights: two sagging strings of warm bulbs
      const per = Math.ceil(count / 2);
      for (const [x0, x1, stringTop] of [[3, 48, top + 1.5], [52, 97, top + 1.5]] as const) {
        p.line(x0, stringTop, (x0 + x1) / 2, stringTop + 3.4, PAPER_INK, 0.35);
        p.line((x0 + x1) / 2, stringTop + 3.4, x1, stringTop, PAPER_INK, 0.35);
        for (let i = 0; i < per; i++) {
          const t = per === 1 ? 0.5 : i / (per - 1);
          const bx = x0 + (x1 - x0) * t;
          const by = stringTop + Math.sin(t * Math.PI) * 3.4 + 1.1;
          p.circle(bx, by, 0.95, "#FFD97A");
          p.circle(bx, by, 0.5, "#FFF6EA", { shadow: false });
        }
      }
      p.glow(25, y, isNight ? 8 : 5, "#FFC46B", isNight ? 0.4 : 0.2);
      p.glow(75, y, isNight ? 8 : 5, "#FFC46B", isNight ? 0.4 : 0.2);
    }
  }
}

/** The candlelit chandelier: a candle beam at L2, two-tiered and
 *  crystal-dropped at L3. */
function paintChandelier(p: PaperPainter, tier: 0 | 1 | 2, top: number, isNight: boolean) {
  if (tier === 0) return;
  const cx = 50;
  const beamW = tier === 2 ? 19 : 13.5;
  const beamY = top + 11.5;
  p.line(cx - beamW / 2 + 1, top, cx - 2, beamY, PAPER_INK, 0.45);
  p.line(cx + beamW / 2 - 1, top, cx + 2, beamY, PAPER_INK, 0.45);
  if (tier === 2) {
    // the upper beam, shorter, with its own candles
    p.rect(cx - 5.5, beamY - 4.6, 11, 1.1, "#6E5636", { r: 0.5 });
    for (const dx of [-4, 0, 4]) candleGlyph(p, cx + dx, beamY - 4.6, 1.7);
  }
  p.rect(cx - beamW / 2, beamY, beamW, 1.3, "#8A6A34", { r: 0.6 });
  const candles = tier === 2 ? 7 : 5;
  for (let i = 0; i < candles; i++) {
    const t = i / (candles - 1);
    candleGlyph(p, cx - beamW / 2 + 1.2 + t * (beamW - 2.4), beamY, 1.9);
  }
  if (tier === 2) {
    // crystal drops under the grand beam
    for (const dx of [-7, -3.5, 0, 3.5, 7]) {
      p.poly(`${cx + dx - 0.7},${beamY + 1.3} ${cx + dx + 0.7},${beamY + 1.3} ${cx + dx},${beamY + 3.0}`, "#DCE9F2", { shadow: false });
    }
  }
  p.glow(cx, beamY - 1.5, isNight ? 10 : 6, "#FFC46B", isNight ? 0.5 : 0.28);
}

/* ------------------------------------------------------------------ */
/* The pizza party band — stage, arcade row, prize counter, standing */
/* on the back wall over the ovens. Paper figures for the band: the  */
/* mouse plays, the hen joins at tier 2, the dog and bear at tier 3.  */
/* ------------------------------------------------------------------ */
function partyPerformer(p: PaperPainter, kind: "mouse" | "hen" | "dog" | "bear", cx: number, floorY: number, s: number) {
  const body =
    kind === "mouse" ? "#8A8F98" : kind === "hen" ? "#F5F2EA" : kind === "dog" ? "#C89B6D" : "#8A5A33";
  const dark = kind === "mouse" ? "#6E7278" : kind === "hen" ? "#E8E2D2" : kind === "dog" ? "#A87F45" : "#6E4226";
  // body + head
  p.rect(cx - 1.6 * s, floorY - 5.2 * s, 3.2 * s, 5.2 * s, body, { r: 1.2 * s });
  p.circle(cx, floorY - 6.9 * s, 1.9 * s, body);
  if (kind === "mouse") {
    p.circle(cx - 1.7 * s, floorY - 8.6 * s, 1.05 * s, body);
    p.circle(cx + 1.7 * s, floorY - 8.6 * s, 1.05 * s, body);
    p.circle(cx - 1.7 * s, floorY - 8.6 * s, 0.5 * s, "#E8A0B4", { shadow: false });
    p.circle(cx + 1.7 * s, floorY - 8.6 * s, 0.5 * s, "#E8A0B4", { shadow: false });
    p.ellipse(cx, floorY - 6.2 * s, 1.0 * s, 0.7 * s, dark, { shadow: false });
  } else if (kind === "hen") {
    p.circle(cx, floorY - 9.1 * s, 0.55 * s, "#C0392B", { shadow: false });
    p.circle(cx - 0.7 * s, floorY - 8.9 * s, 0.45 * s, "#C0392B", { shadow: false });
    p.circle(cx + 0.7 * s, floorY - 8.9 * s, 0.45 * s, "#C0392B", { shadow: false });
    p.poly(`${cx + 1.6 * s},${floorY - 6.9 * s} ${cx + 2.6 * s},${floorY - 6.4 * s} ${cx + 1.6 * s},${floorY - 5.9 * s}`, "#F39C2C", {
      shadow: false,
    });
  } else if (kind === "dog") {
    p.rect(cx - 2.5 * s, floorY - 8.4 * s, 1.1 * s, 2.8 * s, dark, { r: 0.5 * s });
    p.rect(cx + 1.4 * s, floorY - 8.4 * s, 1.1 * s, 2.8 * s, dark, { r: 0.5 * s });
    p.ellipse(cx, floorY - 6.2 * s, 1.05 * s, 0.75 * s, "#E8D3AC", { shadow: false });
  } else {
    p.circle(cx - 1.6 * s, floorY - 8.7 * s, 0.85 * s, body);
    p.circle(cx + 1.6 * s, floorY - 8.7 * s, 0.85 * s, body);
    p.ellipse(cx, floorY - 6.2 * s, 1.1 * s, 0.8 * s, "#C89B6D", { shadow: false });
  }
  // the instrument: a paper guitar for mouse and bear, banjo for the
  // hen, a drum for the dog
  if (kind === "dog") {
    p.rect(cx - 2.2 * s, floorY - 3.4 * s, 4.4 * s, 2.6 * s, "#C0392B", { r: 0.8 * s });
    p.ellipse(cx, floorY - 3.4 * s, 2.2 * s, 0.7 * s, "#F5EFE0", { shadow: false });
  } else {
    const gx = cx + 2.4 * s;
    const gy = floorY - 3.2 * s;
    if (kind === "hen") p.circle(gx, gy, 1.5 * s, "#D9A45B");
    else p.ellipse(gx, gy, 1.7 * s, 2.1 * s, kind === "bear" ? "#8A4B24" : "#B5651D");
    p.line(gx + 0.8 * s, gy - 1.2 * s, gx + 2.6 * s, gy - 3.4 * s, "#5E3D22", 0.55 * s);
  }
}

export function paintPizzaPartyBand(p: PaperPainter, tiers: PaperPizzaTiers, isNight: boolean): number {
  let y = 0;
  if (tiers.stageTier > 0) {
    const h = 17;
    // curtain backdrop with paper folds, gold proscenium trim
    p.rect(14, y, 72, h, "#5E2149", { shadow: false, edge: false, r: 0 });
    for (let x = 18; x < 86; x += 6) p.line(x, y + 1, x, y + h - 3, "rgba(0,0,0,0.22)", 1.6);
    p.rect(14, y, 72, 1.6, "#C8A24A", { shadow: false, edge: false, r: 0 });
    p.rect(14, y + h - 3, 72, 3, "#3A2410", { shadow: false, edge: false, r: 0 });
    const stageFloor = y + h - 3;
    const kinds: ("mouse" | "hen" | "dog" | "bear")[] =
      tiers.stageTier >= 3 ? ["dog", "mouse", "hen", "bear"] : tiers.stageTier >= 2 ? ["mouse", "hen"] : ["mouse"];
    kinds.forEach((k, i) => {
      const cx = kinds.length === 1 ? 50 : 32 + (i * 36) / (kinds.length - 1);
      partyPerformer(p, k, cx, stageFloor, 0.92);
    });
    // footlights along the stage lip
    for (let i = 0; i < 6; i++) {
      const fx = 20 + i * 12;
      p.circle(fx, stageFloor + 1.2, 0.8, "#FFD97A", { shadow: false });
      p.glow(fx, stageFloor + 1.2, isNight ? 4 : 2.4, "#FFC46B", isNight ? 0.5 : 0.26);
    }
    y += h;
  }
  if (tiers.arcadeTier > 0) {
    const h = 13;
    p.rect(10, y, 80, h, "#241433", { shadow: false, edge: false, r: 0 });
    const count = arcadeCabinetsForTier(tiers.arcadeTier);
    for (let i = 0; i < count; i++) {
      const w = 9;
      const x = 50 - (count * (w + 2) - 2) / 2 + i * (w + 2);
      const col = ARCADE_COLORS[i % ARCADE_COLORS.length];
      p.rect(x, y + 2.2, w, h - 3.4, col, { r: 1 });
      p.rect(x + 1.1, y + 3.4, w - 2.2, 4.2, "#BFE8F2", { r: 0.6, shadow: false });
      p.circle(x + w / 2 - 1.2, y + 9.3, 0.55, "#2A1A33", { shadow: false });
      p.circle(x + w / 2 + 1.1, y + 9.3, 0.55, "#FFD23F", { shadow: false });
    }
    y += h;
  }
  if (tiers.prizeTier > 0) {
    const h = 13;
    p.rect(16, y, 68, h, "#33204E", { shadow: false, edge: false, r: 0 });
    const shelves = Math.min(3, tiers.prizeTier);
    for (let s = 0; s < shelves; s++) {
      const sy = y + 3.4 + s * 3.4;
      p.rect(20, sy + 1.8, 60, 0.7, "#8A5A33", { shadow: false, edge: false, r: 0 });
      for (let i = 0; i < 6; i++) {
        const px = 24 + i * 9.5 + (s % 2) * 2;
        const col = ["#FF8FA3", "#7AC8A8", "#FFD97A", "#9CC8E8", "#D9A7E8", "#F2A65A"][(i + s * 2) % 6];
        p.rect(px, sy - 0.6, 2.6, 2.4, col, { r: 0.9, shadow: false });
        p.circle(px + 1.3, sy - 1.3, 1.05, col, { shadow: false });
        p.circle(px + 0.75, sy - 2.2, 0.4, col, { shadow: false });
        p.circle(px + 1.85, sy - 2.2, 0.4, col, { shadow: false });
      }
    }
    y += h;
  }
  return y;
}

/* ------------------------------------------------------------------ */
/* Signatures — the piece you recognize the cuisine by. Zone: from   */
/* sigTop to the counter slab.                                       */
/* ------------------------------------------------------------------ */
function paintSignature(
  p: PaperPainter,
  config: PaperCuisineConfig,
  level: number,
  kitchenTier: number,
  sigTop: number,
  slabY: number,
  isNight: boolean
) {
  const pieces = paperSignatureCount(config, level, kitchenTier);
  switch (config.signature) {
    case "pizza-oven": {
      // the brick oven: arch body on the counter line, fire inside,
      // a pizza from kitchen tier 1, the peel leaning from L2
      const cx = 50;
      const base = slabY;
      p.rect(cx - 13, sigTop + 8, 26, base - sigTop - 8, "#9C4A2F", { r: 2 });
      p.path(`M ${cx - 13} ${sigTop + 8} A 13 9 0 0 1 ${cx + 13} ${sigTop + 8} Z`, "#B5563A");
      for (let x = cx - 11; x < cx + 12; x += 5.5) p.line(x, sigTop + 13, x, base - 2, "rgba(0,0,0,0.16)", 0.5);
      p.rect(cx - 3.5, sigTop - 2, 7, sigTop + 10 - (sigTop - 2), "#7A3B2E", { r: 0.8 });
      // mouth
      p.path(`M ${cx - 7.5} ${base} A 7.5 8.5 0 0 1 ${cx + 7.5} ${base} Z`, "#2A1408");
      p.ellipse(cx, base - 0.6, 5.2, 1.6, "#FF9A3D", { shadow: false });
      p.ellipse(cx, base - 1.1, 3.2, 1.1, "#FFC46B", { shadow: false });
      p.glow(cx, base - 3, isNight ? 9 : 5.5, "#FF9A3D", isNight ? 0.55 : 0.3);
      if (pieces >= 2) {
        p.circle(cx, base - 3.4, 3.1, "#E8B96A", { shadow: false });
        p.circle(cx, base - 3.4, 2.3, "#C0392B", { shadow: false });
        p.circle(cx - 0.8, base - 3.9, 0.45, "#F2C14E", { shadow: false });
        p.circle(cx + 0.9, base - 3.0, 0.45, "#4E8B4A", { shadow: false });
      }
      if (pieces >= 3) {
        // the peel, leaning on the oven's right flank
        p.line(cx + 12.5, base, cx + 16.5, sigTop + 12, "#C89B6D", 1.1);
        p.ellipse(cx + 16.9, sigTop + 10.6, 2.6, 1.7, "#D9B47C", { rot: { deg: -32, cx: cx + 16.9, cy: sigTop + 10.6 } });
      }
      break;
    }
    case "pie-case": {
      // the glass case stands on the counter's left end: chrome
      // shelves, pies 2 → 3 → 4 by level under the glass
      const x = 28.5;
      const top = slabY - 10.5;
      p.rect(x - 0.8, top - 1.2, 15.6, 1.4, "#B9BDC6", { r: 0.6 });
      p.rect(x, top, 14, 10.5, "rgba(220,238,246,0.5)", { r: 1 });
      for (const sy of [top + 4.6, top + 9.6]) p.rect(x + 0.6, sy, 12.8, 0.7, "#9AA1A9", { shadow: false, edge: false, r: 0 });
      const pieAt = (px: number, py: number, col: string) => {
        p.ellipse(px, py, 2.3, 1.15, "#C8CDD4");
        p.ellipse(px, py - 0.35, 1.9, 0.85, col, { shadow: false });
        p.line(px - 1.2, py - 0.7, px + 1.2, py - 0.15, "#B57F35", 0.32);
        p.line(px - 1.2, py - 0.15, px + 1.2, py - 0.7, "#B57F35", 0.32);
      };
      const cols = ["#C0392B", "#7A3B2E", "#E8A84C", "#5E2E46"];
      const spots: [number, number][] = [
        [x + 3.4, top + 4.2],
        [x + 10.4, top + 4.2],
        [x + 3.4, top + 9.2],
        [x + 10.4, top + 9.2],
      ];
      spots.slice(0, pieces).forEach(([px, py], i) => pieAt(px, py, cols[i % cols.length]));
      break;
    }
    case "sushi-counter": {
      // the bamboo backdrop stands behind the kitchen (painted in the
      // room's draw, taller at L3); the signature piece here is the
      // noren curtain from L2: dark, vermillion, dark
      if (pieces >= 4) {
        const panels = ["#23262E", "#C0392B", "#23262E"];
        panels.forEach((col, i) => {
          const px = 38 + i * 8.6;
          p.rect(px, sigTop + 1, 8, 8.5, col, { r: 0.7 });
          p.circle(px + 4, sigTop + 4.6, 1.5, "rgba(245,239,224,0.75)", { shadow: false });
        });
      }
      break;
    }
    case "burger-counter": {
      // three menu boards over the counter, lines not words; the
      // crossed palms arrive at L2 and meet over the middle board
      for (let i = 0; i < Math.min(3, Math.max(2, pieces - 1)); i++) {
        const bx = 31 + i * 13.5;
        p.rect(bx, sigTop + 2, 11.5, 12, "#2E2A26", { r: 0.9 });
        p.rect(bx + 1.1, sigTop + 3.4, 9.3, 1.5, "#D22630", { r: 0.5, shadow: false });
        for (const dy of [6.2, 8.6, 11.0]) p.rect(bx + 1.1, sigTop + dy, 6.5 + ((i * 7 + dy) % 3), 1.0, "#F5EFE0", { r: 0.4, shadow: false });
      }
      if (pieces >= 3) {
        const palm = (baseX: number, lean: number) => {
          p.line(baseX, slabY, baseX + lean * 0.45, slabY - 9, "#8A6A45", 1.5);
          p.line(baseX + lean * 0.45, slabY - 9, baseX + lean, sigTop + 6.5, "#8A6A45", 1.5);
          const tx = baseX + lean;
          const ty = sigTop + 6.5;
          for (const a of [-70, -35, 0, 35, 70]) {
            const rad = ((a - 90) * Math.PI) / 180;
            p.line(tx, ty, tx + Math.cos(rad) * 6.4, ty + Math.sin(rad) * 3.4 + 2.2, "#3E7C43", 1.05);
          }
        };
        palm(24, 9);
        palm(76, -9);
      }
      break;
    }
    case "communion": {
      // the communion table stands before the counter: white cloth,
      // the cup, the bread from L2, the full dressing at L3
      const tw = 30;
      const tx = 50 - tw / 2;
      const ty = slabY - 7.5;
      p.rect(tx + 1.5, slabY - 1.2, tw - 3, 1.2, "#6E5636", { shadow: false, edge: false, r: 0 });
      p.rect(tx, ty, tw, 7.5, "#F7F0DC", { r: 1.2 });
      p.rect(tx, ty, tw, 1.6, "#EDE2C4", { shadow: false, edge: false, r: 0 });
      for (let x = tx + 3; x < tx + tw - 2; x += 5) p.line(x, ty + 3.4, x, slabY - 0.6, "rgba(160,140,100,0.5)", 0.4);
      // the cup
      p.path(`M 47.6 ${ty - 2.6} L 52.4 ${ty - 2.6} L 51.4 ${ty + 0.6} L 48.6 ${ty + 0.6} Z`, "#C8A24A");
      p.rect(49.6, ty + 0.6, 0.8, 1.3, "#C8A24A", { shadow: false });
      p.rect(47.9, ty + 1.9, 4.2, 0.7, "#C8A24A", { shadow: false });
      if (pieces >= 2) {
        // the bread on its plate, left of the cup
        p.circle(41.5, ty + 0.9, 2.6, PLATE);
        p.ellipse(41.5, ty + 0.6, 1.9, 1.1, "#D9A45B", { shadow: false });
        p.line(40.6, ty + 0.1, 41.3, ty + 0.5, "#B57F35", 0.3);
        p.line(41.8, ty + 0.1, 42.5, ty + 0.5, "#B57F35", 0.3);
      }
      if (pieces >= 3) {
        // an open book and a small cross, right of the cup
        p.poly(`58.5,${ty + 1.8} 62.5,${ty + 0.9} 62.5,${ty - 1.2} 58.5,${ty - 0.3}`, "#F5EFE0");
        p.poly(`66.5,${ty + 1.8} 62.5,${ty + 0.9} 62.5,${ty - 1.2} 66.5,${ty - 0.3}`, "#EDE2C4", { shadow: false });
        p.rect(69.2, ty - 2.2, 0.9, 4.4, "#8A6A34", { shadow: false });
        p.rect(68.2, ty - 1.2, 2.9, 0.9, "#8A6A34", { shadow: false });
      }
      break;
    }
    case "bread-oven": {
      // a smaller brick oven, and the bread shelf above the pass —
      // one more loaf per kitchen tier
      const cx = 50;
      p.rect(cx - 10, sigTop + 12, 20, slabY - sigTop - 12, "#8A5A30", { r: 1.8 });
      p.path(`M ${cx - 10} ${sigTop + 12} A 10 7 0 0 1 ${cx + 10} ${sigTop + 12} Z`, "#9C6A38");
      p.path(`M ${cx - 5.8} ${slabY} A 5.8 6.6 0 0 1 ${cx + 5.8} ${slabY} Z`, "#241305");
      p.ellipse(cx, slabY - 0.5, 4.0, 1.3, "#FF9A3D", { shadow: false });
      p.glow(cx, slabY - 2.4, isNight ? 7.5 : 4.6, "#FF9A3D", isNight ? 0.5 : 0.28);
      // the shelf and its loaves
      p.rect(24, sigTop + 7.5, 52, 1.1, "#6E4A26", { r: 0.5 });
      const loaves = Math.max(1, pieces);
      for (let i = 0; i < loaves; i++) {
        const lx = 32 + i * 9 + (loaves % 2) * 2;
        p.ellipse(lx, sigTop + 6.2, 3.4, 1.9, i % 2 ? "#C98F3D" : "#D9A45B");
        p.line(lx - 1.6, sigTop + 5.4, lx - 0.5, sigTop + 6.1, "#A86F28", 0.35);
        p.line(lx + 0.2, sigTop + 5.2, lx + 1.3, sigTop + 5.9, "#A86F28", 0.35);
      }
      break;
    }
    case "hearth": {
      // the generic room's stone hearth: arch, mantel, fire, logs
      const cx = 50;
      p.rect(cx - 11, sigTop + 6, 22, slabY - sigTop - 6, "#8B8E98", { r: 1.6 });
      p.path(`M ${cx - 11} ${sigTop + 6} A 11 8 0 0 1 ${cx + 11} ${sigTop + 6} Z`, "#9A9DA8");
      p.rect(cx - 12.5, sigTop + 4.4, 25, 1.8, "#6E4A26", { r: 0.7 });
      p.path(`M ${cx - 6.4} ${slabY} A 6.4 7.4 0 0 1 ${cx + 6.4} ${slabY} Z`, "#241A10");
      p.rect(cx - 4.6, slabY - 1.8, 9.2, 1.5, "#5E3D22", { r: 0.7, shadow: false });
      p.ellipse(cx, slabY - 2.6, 3.4, 2.6, "#FF9A3D", { shadow: false });
      p.ellipse(cx, slabY - 2.2, 1.9, 1.7, "#FFC46B", { shadow: false });
      p.glow(cx, slabY - 3, isNight ? 9 : 5.5, "#FF9A3D", isNight ? 0.5 : 0.28);
      break;
    }
    default:
      break;
  }
}

/* ------------------------------------------------------------------ */
/* The kitchen strip: backsplash, slab, dressed front, the pass.     */
/* Burger and sushi dress their own counters; the diner keeps its    */
/* coffee decanters on the slab (the purchase flow is the screen's   */
/* card below — this is its paper portrait).                         */
/* ------------------------------------------------------------------ */
function paintKitchen(
  p: PaperPainter,
  config: PaperCuisineConfig,
  kitchenTier: number,
  stackRows: number,
  isNight: boolean
) {
  const kitchen = paperKitchenFor(kitchenTier);
  const slabY = stackRows - 10;
  const frontY = stackRows - 8.4;
  const cx0 = 27;
  const cw = 46;

  if (config.signature === "burger-counter") {
    // the cold, bright counter: white slab, white front, red stripe,
    // red trays riding the top
    p.rect(cx0 - 3, slabY - 6.5, cw + 6, 6.5, "#F1EDE4", { shadow: false, edge: false, r: 0 });
    p.rect(cx0 - 2, slabY, cw + 4, 1.7, "#FFFFFF", { r: 0.6 });
    p.rect(cx0 - 2, frontY, cw + 4, stackRows - frontY, "#FFFFFF", { shadow: false, edge: false, r: 0 });
    p.rect(cx0 - 2, frontY + 2.2, cw + 4, 1.6, "#D22630", { shadow: false, edge: false, r: 0 });
    for (const tx of [cx0 + 3, cx0 + cw / 2 - 3, cx0 + cw - 9]) {
      p.rect(tx, slabY - 1.1, 6.4, 1.1, "#D22630", { r: 0.5, shadow: false });
      p.circle(tx + 3.2, slabY - 1.5, 1.15, "#F0C078", { shadow: false });
    }
    return;
  }

  // backsplash band behind the pass
  p.rect(cx0 - 4, slabY - 6.5, cw + 8, 6.5, config.wallPanel, { shadow: false, edge: false, r: 0 });
  if (kitchen.hanging) {
    // a hanging garnish bundle by the counter's right end
    const hx = cx0 + cw + 1.5;
    p.line(hx + 1, slabY - 6.5, hx + 1, slabY - 4.4, PAPER_INK, 0.4);
    p.circle(hx + 0.2, slabY - 3.2, 0.9, "#F5EFE0", { shadow: false });
    p.circle(hx + 1.8, slabY - 2.8, 0.9, "#EDE2C4", { shadow: false });
    p.circle(hx + 1.0, slabY - 1.7, 0.9, "#F5EFE0", { shadow: false });
    p.poly(`${hx - 0.6},${slabY - 4.6} ${hx + 2.6},${slabY - 4.6} ${hx + 1},${slabY - 5.6}`, "#4E8B4A", { shadow: false });
  }

  // the slab
  p.rect(cx0, slabY, cw, 1.6, config.id === "sushi-bar" ? "#1A1410" : "#A9713F", { r: 0.6 });
  p.rect(cx0, slabY + 1.6, cw, 0.7, "rgba(0,0,0,0.3)", { shadow: false, edge: false, r: 0 });

  if (config.signature === "sushi-counter") {
    // the conveyor rides the slab: a dark belt with plates on it
    p.rect(cx0 + 1, slabY - 2.2, cw - 2, 2.0, "#3A3F46", { r: 0.9, shadow: false });
    if (kitchenTier >= 1) {
      for (let i = 0; i < 5; i++) {
        const px = cx0 + 5 + i * 8.6;
        p.circle(px, slabY - 1.2, 1.7, "#F5F2EA", { shadow: false });
        p.circle(px, slabY - 1.2, 0.95, i % 2 ? "#E2725B" : "#2E4A3E", { shadow: false });
        p.circle(px, slabY - 1.2, 0.42, "#F5F2EA", { shadow: false });
      }
    }
  }

  // pots, jars and canisters on the slab, growing with the kitchen.
  // The diner's slab is spoken for — pie case left, decanters right —
  // so its pots stand in the middle two spots only.
  const itemXs =
    config.id === "diner"
      ? [cx0 + 18.5, cx0 + 25.5].slice(0, Math.min(kitchen.items, 2))
      : [cx0 + 2.5, cx0 + 10, cx0 + cw - 13, cx0 + cw - 6].slice(0, kitchen.items);
  itemXs.forEach((ix, i) => {
    p.rect(ix, slabY - 3.6, 4.4, 3.6, i % 2 ? "#7A7E88" : "#9A9DA8", { r: 0.9 });
    p.rect(ix - 0.2, slabY - 4.3, 4.8, 0.9, "#4E5158", { r: 0.45, shadow: false });
    p.rect(ix + 0.7, slabY - 3.0, 0.9, 1.9, "rgba(255,255,255,0.35)", { r: 0.4, shadow: false });
  });

  if (config.id === "diner") {
    // the coffee station: two glass decanters on their warmer —
    // brown band for regular, orange for decaf — always steaming
    const dx = cx0 + cw - 12.5;
    p.rect(dx - 1, slabY - 0.2, 13, 0.5, "#3A3F46", { shadow: false, edge: false, r: 0 });
    const decanter = (x: number, band: string) => {
      p.rect(x, slabY - 4.6, 4.6, 4.6, "rgba(220,238,246,0.55)", { r: 1.4 });
      p.rect(x + 0.5, slabY - 2.2, 3.6, 1.9, "#3A2410", { r: 0.8, shadow: false });
      p.rect(x + 0.5, slabY - 2.9, 3.6, 0.8, band, { shadow: false, edge: false, r: 0 });
      p.rect(x + 1.5, slabY - 5.5, 1.6, 1.0, "#2A2D33", { r: 0.4, shadow: false });
      p.line(x + 4.6, slabY - 3.8, x + 5.7, slabY - 3.0, "#2A2D33", 0.6);
    };
    decanter(dx, "#7A4A21");
    decanter(dx + 6.8, "#E67E22");
    p.glow(dx + 5.5, slabY - 2.4, isNight ? 5 : 3, "#FFC46B", isNight ? 0.4 : 0.2);
  }

  // ready food rides the pass's ends at the top kitchen tier
  if (kitchen.readyRow && config.signature !== "sushi-counter") {
    for (const tx of [cx0 + 1.5, cx0 + cw - 6.5]) {
      p.rect(tx, slabY - 1.0, 5.2, 0.9, STEEL, { r: 0.4, shadow: false });
      paintPaperPlate(p, config.food, tx + 2.6, slabY - 1.6, true);
    }
  }

  // the counter front: planks, panels, then full tile work
  const frontH = stackRows - frontY;
  if (config.id === "sushi-bar") {
    p.rect(cx0, frontY, cw, frontH, "#241D16", { shadow: false, edge: false, r: 0 });
    for (let x = cx0 + 5.75; x < cx0 + cw; x += 5.75) p.line(x, frontY + 0.3, x, stackRows - 0.3, "rgba(0,0,0,0.5)", 0.5);
  } else if (kitchen.front === "tiled") {
    const tilePalette = [config.accent, config.wallPanel, config.pale, config.wallDark];
    const rowsN = 2;
    const tileH = frontH / rowsN;
    for (let row = 0; row < rowsN; row++) {
      for (let col = 0; col < 8; col++) {
        const tx = cx0 + col * (cw / 8);
        const ty = frontY + row * tileH;
        const col2 = tilePalette[(paperHash(`rtile-${config.id}-${col}-${row}`) >> 3) % tilePalette.length];
        p.rect(tx + 0.35, ty + 0.35, cw / 8 - 0.7, tileH - 0.7, col2, {
          r: 0.5,
          shadow: false,
          rot: { deg: (col + row) % 2 === 0 ? 0.8 : -0.8, cx: tx + cw / 16, cy: ty + tileH / 2 },
        });
      }
    }
    p.rect(cx0, frontY, cw, frontH, "rgba(0,0,0,0)", { shadow: false, edge: false, r: 0 });
  } else if (kitchen.front === "paneled") {
    p.rect(cx0, frontY, cw, frontH, config.benchSeat, { shadow: false, edge: false, r: 0 });
    for (let i = 0; i < 4; i++) {
      p.rect(cx0 + 2 + i * ((cw - 4) / 4), frontY + 1.2, (cw - 4) / 4 - 3.4, frontH - 2.4, "rgba(0,0,0,0.14)", { r: 0.8, shadow: false });
    }
  } else {
    p.rect(cx0, frontY, cw, frontH, config.benchSeat, { shadow: false, edge: false, r: 0 });
    for (let x = cx0 + 5.75; x < cx0 + cw; x += 5.75) p.line(x, frontY + 0.3, x, stackRows - 0.3, "rgba(0,0,0,0.28)", 0.5);
  }
}

/* ------------------------------------------------------------------ */
/* One booth, in the cuisine's colors: woven mat, wall bench with a  */
/* cushion that climbs the chair tiers, a dressed table, stools.     */
/* ------------------------------------------------------------------ */
function paintBooth(
  p: PaperPainter,
  config: PaperCuisineConfig,
  side: BoothSide,
  top: number,
  tablesTier: number,
  chairsTier: number
) {
  const bx = boothX(side);
  const mx = (lx: number, w: number) => (side === "left" ? bx + lx : bx + (BOOTH.w - lx - w));
  const mcx = (lc: number) => (side === "left" ? bx + lc : bx + (BOOTH.w - lc));
  const bench = benchStyleFor(chairsTier);
  const tableDress = tableDressingFor(tablesTier);
  const t = BOOTH.table;
  const cushionLevel = bench.cushion === "grand" ? 3 : bench.cushion === "pink" ? 2 : bench.cushion === "teal" ? 1 : 0;
  const panelColor = config.cushions[cushionLevel];
  const mat = config.id === "burger-joint" ? "#EFE6D8" : "#C2A06B";

  // woven mat under the whole booth, fringe on the room side
  p.rect(bx - 0.5, top + 0.5, BOOTH.w + 1, BOOTH.h + 1, mat, { r: 1.4 });
  for (let ly = top + 3; ly < top + BOOTH.h; ly += 2.4) p.line(bx + 0.4, ly, bx + BOOTH.w - 0.4, ly, config.benchFrame, 0.35);
  const fringeX = side === "left" ? bx + BOOTH.w + 0.5 : bx - 0.5;
  for (let ly = top + 2.5; ly < top + BOOTH.h; ly += 2.2) {
    p.line(fringeX, ly, fringeX + (side === "left" ? 1.1 : -1.1), ly + 0.5, config.benchFrame, 0.4);
  }

  // bench back against the wall: frame, cushion panel, ledge seat
  p.rect(mx(0, 5), top + 2, 5, 28, config.benchFrame, { r: 1.4 });
  p.rect(mx(0.9, 3.2), top + 3.2, 3.2, 25.6, panelColor, { r: 1.1, shadow: false });
  if (bench.cushion !== "wood") {
    p.rect(mx(0.9, 3.2), top + 15.4, 3.2, 2.2, config.accent, { r: 0.7, shadow: false });
  }
  if (bench.tufted) {
    for (const ty of [7.5, 12.5, 18.5, 23.5]) p.circle(mcx(2.5), top + ty, 0.45, "rgba(24,8,44,0.5)", { shadow: false });
  }
  if (bench.goldTrim) p.rect(mx(0.9, 3.2), top + 3.2, 3.2, 1.0, "#F2B53A", { r: 0.4, shadow: false });
  p.rect(mx(5, 5.5), top + 3.5, 5.5, 25, bench.cushion === "wood" ? config.benchSeat : panelColor, { r: 1.2 });

  // stools on the room side of the table
  for (const seatY of BOOTH.seatY) {
    const scx = mcx(BOOTH.stoolX + 6.5);
    p.line(scx - 1.2, top + seatY + 13.6, scx - 1.6, top + seatY + 15.2, config.benchFrame, 0.55);
    p.line(scx + 1.2, top + seatY + 13.6, scx + 1.6, top + seatY + 15.2, config.benchFrame, 0.55);
    p.circle(scx, top + seatY + 12.1, 2.3, config.benchSeat);
    p.circle(scx, top + seatY + 12.1, 1.55, config.tableWood, { shadow: false });
  }

  // the table: cuisine wood, a cloth laid over it from tables tier 1
  const tx = mx(t.x, t.w);
  p.rect(tx, top + t.y, t.w, t.h, config.tableWood, { r: 1.6 });
  const cloth = config.cloth[Math.min(tablesTier, 3)];
  if (tablesTier > 0 && cloth) {
    p.rect(tx + 0.8, top + t.y + 0.8, t.w - 1.6, t.h - 1.6, cloth, { r: 1.2, shadow: false });
  }

  // place settings at the four seat spots — the cuisine's own food
  for (const seatY of BOOTH.seatY) {
    paintPaperPlate(p, config.food, mcx(t.x + 3), top + seatY + 7.5, tableDress.food);
    paintPaperPlate(p, config.food, mcx(t.x + t.w - 3), top + seatY + 7.5, tableDress.food);
  }

  // a centerpiece between the seats once the food lands: a candle in
  // the candlelit rooms, a little flower vase everywhere else
  if (tableDress.food) {
    const cx = mcx(t.x + t.w / 2);
    if (config.candlelit) {
      candleGlyph(p, cx, top + t.y + 10.5, 2.2);
      candleGlyph(p, cx, top + t.y + 19.5, 2.2);
    } else {
      for (const cy of [top + t.y + 8.5, top + t.y + 17.5]) {
        p.rect(cx - 0.8, cy - 0.5, 1.6, 2.0, config.accent, { r: 0.5, shadow: false });
        p.circle(cx - 0.7, cy - 1.3, 0.62, config.accent, { shadow: false });
        p.circle(cx + 0.7, cy - 1.5, 0.62, "#E86A92", { shadow: false });
        p.circle(cx, cy - 2.1, 0.55, "#F2C14E", { shadow: false });
      }
    }
  }
  // a serving tray rides the table's middle at tables tier 3
  if (tableDress.tray) {
    const trayX = mx(t.x + 3, 6);
    p.rect(trayX, top + t.y + 11.2, 6, 4.4, STEEL, { r: 0.9 });
    paintPaperPlate(p, config.food, mcx(t.x + t.w / 2), top + t.y + 13.4, true);
  }
  // cups at tables tier 1+, the cuisine's drink in them
  if (tableDress.cups) {
    for (const seatY of BOOTH.seatY) {
      for (const lc of [t.x + 1.6, t.x + t.w - 1.6]) {
        const cx = mcx(lc);
        p.rect(cx - 0.75, top + seatY + 11.3, 1.5, 2.1, "#FFF6E9", { r: 0.4 });
        p.rect(cx - 0.75, top + seatY + 11.3, 1.5, 0.8, config.drink, { r: 0.35, shadow: false });
        p.line(cx + 0.2, top + seatY + 11.3, cx + 0.75, top + seatY + 10.2, config.accent, 0.42);
      }
    }
  }
  // paper fringe along the table's room-side edge at tier 3
  if (tableDress.fringe) {
    const edgeLocal = side === "left" ? t.x + t.w : t.x;
    const ex = mcx(edgeLocal);
    const dir = side === "left" ? 1 : -1;
    let i = 0;
    for (let fy = top + t.y + 2; fy < top + t.y + t.h - 1.5; fy += 3, i++) {
      p.poly(`${ex},${fy} ${ex},${fy + 1.7} ${ex + dir * 1.4},${fy + 0.85}`, i % 2 === 0 ? config.accent : config.pale, {
        shadow: false,
      });
    }
  }
}

/* ------------------------------------------------------------------ */
/* The floor + entrance, per cuisine floor treatment.                 */
/* ------------------------------------------------------------------ */
function paintFloor(
  p: PaperPainter,
  config: PaperCuisineConfig,
  rows: number,
  stackRows: number,
  level: number,
  gathering: boolean,
  halloween: boolean
) {
  const floorTop = restaurantFloorTop(stackRows);
  const floorBottom = rows - ENTRANCE_ROWS;

  p.rect(0, stackRows, PAPER_ROOM_COLS, 2, "rgba(20,8,32,0.35)", { shadow: false, edge: false, r: 0 });
  p.rect(0, floorTop, PAPER_ROOM_COLS, floorBottom - floorTop, config.floor, { shadow: false, edge: false, r: 0 });

  const plankLines = (col: string) => {
    for (let y = floorTop + 6; y < floorBottom; y += 6) p.line(0, y, PAPER_ROOM_COLS, y, col, 0.5);
    for (let r = 0; r < 6; r++) {
      for (let x = ((r % 3) * 17 + 9) % 100; x < PAPER_ROOM_COLS; x += 34) {
        p.line(x, floorTop + r * 6, x, floorTop + r * 6 + 6, col, 0.5);
      }
    }
  };

  switch (config.floorKind) {
    case "confetti": {
      for (let ty = 0; floorTop + ty * 12 < floorBottom; ty++) {
        for (let tx = 0; tx * 12.5 < PAPER_ROOM_COLS; tx++) {
          const cx = tx * 12.5 + 6.25;
          const cy = floorTop + ty * 12 + 6;
          if ((tx + ty) % 2 === 0) {
            p.poly(`${cx},${cy - 4.6} ${cx + 5},${cy} ${cx},${cy + 4.6} ${cx - 5},${cy}`, config.floorAlt, { shadow: false });
          }
          const h = paperHash(`rconfetti-${config.id}-${tx}-${ty}`);
          if (h % 9 === 0) p.circle(cx, cy, 0.55, ["#FF7BAC", "#2EC4B6", "#FFD23F"][h % 3], { shadow: false, opacity: 0.85 });
        }
      }
      break;
    }
    case "white-tile": {
      // white tile grid, a red tile every fifth column
      for (let cx = 0; cx * 6.25 < PAPER_ROOM_COLS; cx++) {
        if (cx % 5 === 4) {
          p.rect(cx * 6.25, floorTop, 6.25, floorBottom - floorTop, "rgba(210,38,48,0.8)", { shadow: false, edge: false, r: 0 });
        }
      }
      for (let x = 0; x <= PAPER_ROOM_COLS; x += 6.25) p.line(x, floorTop, x, floorBottom, "rgba(90,80,70,0.25)", 0.4);
      for (let y = floorTop; y <= floorBottom; y += 6.25) p.line(0, y, PAPER_ROOM_COLS, y, "rgba(90,80,70,0.25)", 0.4);
      break;
    }
    case "checker-wood": {
      if (level >= 2) {
        // the classic black-and-white checkerboard, paper-flat
        const sq = 8.33;
        for (let ry = 0; floorTop + ry * sq < floorBottom; ry++) {
          for (let rx = 0; rx * sq < PAPER_ROOM_COLS; rx++) {
            if ((rx + ry) % 2 === 0) continue;
            p.rect(rx * sq, floorTop + ry * sq, sq, Math.min(sq, floorBottom - (floorTop + ry * sq)), "#2A2A2E", {
              shadow: false,
              edge: false,
              r: 0,
            });
          }
        }
        p.rect(0, floorTop, PAPER_ROOM_COLS, floorBottom - floorTop, "rgba(245,242,234,0.25)", { shadow: false, edge: false, r: 0 });
        // re-lay the white squares' paper over the dark ones cleanly
        for (let ry = 0; floorTop + ry * sq < floorBottom; ry++) {
          for (let rx = 0; rx * sq < PAPER_ROOM_COLS; rx++) {
            if ((rx + ry) % 2 !== 0) continue;
            p.rect(rx * sq, floorTop + ry * sq, sq, Math.min(sq, floorBottom - (floorTop + ry * sq)), "#F5F2EA", {
              shadow: false,
              edge: false,
              r: 0,
            });
          }
        }
      } else {
        plankLines("rgba(0,0,0,0.22)");
      }
      break;
    }
    case "stone": {
      for (let y = floorTop + 8; y < floorBottom; y += 8) p.line(0, y, PAPER_ROOM_COLS, y, "rgba(0,0,0,0.2)", 0.55);
      for (let r = 0; r < 6; r++) {
        for (let x = ((r % 2) * 13 + 8) % 100; x < PAPER_ROOM_COLS; x += 26) {
          p.line(x, floorTop + r * 8, x, floorTop + r * 8 + 8, "rgba(0,0,0,0.2)", 0.55);
        }
      }
      break;
    }
    case "dark-planks":
      plankLines("rgba(0,0,0,0.4)");
      break;
    default:
      plankLines("rgba(0,0,0,0.2)");
  }

  if (gathering) {
    p.rect(0, floorTop, PAPER_ROOM_COLS, floorBottom - floorTop, "rgba(255,190,90,0.08)", { shadow: false, edge: false, r: 0 });
  }

  // entrance: threshold, woven mat, wooden front edge with bunting
  p.rect(0, floorBottom, PAPER_ROOM_COLS, ENTRANCE_ROWS, config.wallPanel, { shadow: false, edge: false, r: 0 });
  for (let i = 0; i < 12; i++) {
    const h = paperHash(`rentrance-${config.id}-${i}`);
    p.circle(3 + (h % 94), floorBottom + 1 + ((h >> 5) % 6), 0.5, [config.accent, config.pale, config.floorAlt][i % 3], {
      shadow: false,
      opacity: 0.8,
    });
  }
  p.rect(38, floorBottom + 1.5, 24, 6.3, config.benchFrame, { r: 1 });
  p.rect(39.2, floorBottom + 2.4, 21.6, 4.5, config.benchSeat, { r: 0.8, shadow: false });
  p.poly(
    `${50},${floorBottom + 3.1} ${52.2},${floorBottom + 4.65} ${50},${floorBottom + 6.2} ${47.8},${floorBottom + 4.65}`,
    config.accent,
    { shadow: false }
  );
  if (halloween) {
    pumpkin(p, 21, floorBottom - 0.5);
    pumpkin(p, 79, floorBottom - 0.5);
  }
  p.rect(0, rows - 1.9, PAPER_ROOM_COLS, 1.9, "#3A2410", { shadow: false, edge: false, r: 0 });
  for (let x = 2, i = 0; x < PAPER_ROOM_COLS - 3; x += 8, i++) {
    p.poly(`${x},${rows - 1.9} ${x + 3.6},${rows - 1.9} ${x + 1.8},${rows - 0.25}`, i % 2 === 0 ? config.accent : config.pale, {
      shadow: false,
    });
  }
}

/* ------------------------------------------------------------------ */
/* The room                                                           */
/* ------------------------------------------------------------------ */
export function PaperRestaurantRoom({
  config,
  tableDiners,
  tablesTier,
  chairsTier,
  kitchenTier,
  level,
  lightsTier,
  artTier,
  pizzaTiers,
  gathering,
  halloween,
  isNight,
}: {
  config: PaperCuisineConfig;
  /** Diners already distributed per table by the screen (round-robin). */
  tableDiners: PrayedPerson[][];
  tablesTier: number;
  chairsTier: number;
  kitchenTier: number;
  level: number;
  lightsTier: number;
  artTier: number;
  /** Pizza party features (stage/arcade/prize) — pizza-place only. */
  pizzaTiers?: PaperPizzaTiers;
  gathering: boolean;
  halloween: boolean;
  isNight: boolean;
}) {
  const windowWidth = useWindowDimensions().width;
  const [measured, setMeasured] = useState(0);
  const width = measured > 0 ? measured : Math.max(280, windowWidth - 32);
  const unit = width / PAPER_ROOM_COLS;
  const tableCount = tableDiners.length;
  const partyRows =
    config.id === "pizza-place" && pizzaTiers
      ? pizzaPartyRows({ stage: pizzaTiers.stageTier, arcade: pizzaTiers.arcadeTier, prize: pizzaTiers.prizeTier })
      : 0;
  const stackRows = RESTAURANT_WALL_ROWS + partyRows;
  const floorTop = restaurantFloorTop(stackRows);
  const rows = restaurantRoomRows(stackRows, tableCount);
  const slabY = stackRows - 10;
  const sigTop = stackRows - 38;
  const dressing = paperRoomDressingFor(config, level, lightsTier, artTier);
  const kitchen = paperKitchenFor(kitchenTier);

  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  useEffect(() => {
    loadCustomPawn().then((p) => p && setPawn(p)).catch(() => undefined);
  }, []);

  const draw = (p: PaperPainter) => {
    // wall field + crafted top edge
    p.rect(0, 0, PAPER_ROOM_COLS, stackRows, config.wall, { shadow: false, edge: false, r: 0 });
    for (let y = 7; y < stackRows; y += 4.5) p.line(0, y, PAPER_ROOM_COLS, y, config.wallPanel, 0.5);
    p.rect(0, 0, PAPER_ROOM_COLS, 2.6, config.wallDark, { shadow: false, edge: false, r: 0 });

    // the pizza party band stands on the wall over the ovens
    if (config.id === "pizza-place" && pizzaTiers) paintPizzaPartyBand(p, pizzaTiers, isNight);

    // framed wall art hangs with the wall-art furniture tier
    if (dressing.wallArt) {
      const artTop = partyRows + 13;
      const frame = (x: number, sun: boolean) => {
        p.rect(x, artTop, 10.5, 10, config.benchFrame, { r: 0.9 });
        p.rect(x + 1, artTop + 1, 8.5, 8, config.wallDark, { r: 0.6, shadow: false });
        if (sun) {
          p.circle(x + 5.25, artTop + 3.6, 1.8, config.accent, { shadow: false });
          p.rect(x + 1, artTop + 5.6, 8.5, 1.2, config.accent, { shadow: false, edge: false, r: 0, opacity: 0.7 });
          p.rect(x + 1, artTop + 6.9, 8.5, 2.1, config.wallPanel, { shadow: false, edge: false, r: 0 });
        } else {
          p.rect(x + 2.2, artTop + 2.2, 3.4, 3.4, config.accent, { r: 0.5, shadow: false });
          p.circle(x + 7.2, artTop + 4.6, 0.9, config.pale, { shadow: false });
          p.rect(x + 2.2, artTop + 6.8, 4.6, 1.1, config.accent, { r: 0.4, shadow: false });
        }
      };
      frame(2.5, true);
      frame(87, false);
    }

    // overhead dressing, then the candlelit chandelier at the center
    paintOverhead(p, config, dressing.overheadCount, partyRows, isNight);
    paintChandelier(p, dressing.chandelier, partyRows, isNight);

    // sconce candles on the side walls at the grand level
    if (dressing.sconces) {
      for (const sx of [5, 95]) {
        p.rect(sx - 0.5, sigTop + 3.4, 1.0, 2.6, "#8A6A34", { shadow: false });
        candleGlyph(p, sx, sigTop + 3.6, 2.2);
        p.glow(sx, sigTop + 0.8, isNight ? 5.5 : 3.2, "#FFC46B", isNight ? 0.5 : 0.26);
      }
    }

    // sushi's bamboo stands behind everything at counter height
    if (config.signature === "sushi-counter") {
      const top = sigTop - (level >= 3 ? 3 : 0);
      for (let x = 9; x < 92; x += 4.6) {
        p.rect(x, top + ((paperHash(`bamboo-${x}`) >> 4) % 3), 2.9, slabY - top, "#5E7A3A", { r: 1.2 });
      }
    }

    paintKitchen(p, config, kitchenTier, stackRows, isNight);
    paintSignature(p, config, level, kitchenTier, sigTop, slabY, isNight);

    paintFloor(p, config, rows, stackRows, level, gathering, halloween);

    // the diner's counter stools stand in a row before the counter
    if (config.id === "diner") {
      for (const sx of [34, 42, 58, 66]) {
        p.circle(sx, floorTop + 2.8, 2.2, "#B9BDC6");
        p.circle(sx, floorTop + 2.8, 1.5, "#C0392B", { shadow: false });
      }
    }

    tableDiners.forEach((_, i) => {
      const { side, top } = restaurantBoothForTable(i, stackRows);
      paintBooth(p, config, side, top, tablesTier, chairsTier);
    });
  };

  const glowSize = unit * (isNight ? 26 : 20);
  const glowAt = (ux: number, uy: number, delay: number) => (
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
  const flameSignature = config.signature === "pizza-oven" || config.signature === "bread-oven" || config.signature === "hearth";

  return (
    <View
      onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}
      style={{ position: "relative", width: "100%", height: rows * unit, backgroundColor: config.wall }}
    >
      <PaperCanvas cols={PAPER_ROOM_COLS} rows={rows} unit={unit} draw={draw} />

      {/* warm light pools: the room's center light, its chandelier,
          its oven fire */}
      {glowAt(50, partyRows + 6, 0)}
      {dressing.chandelier > 0 && glowAt(50, partyRows + 10, 500)}
      {flameSignature && glowAt(50, slabY - 3, 900)}

      {/* steam curls off the pass once the kitchen is furnished;
          the diner's coffee steams at every tier */}
      {kitchen.steam && (
        <View pointerEvents="none" style={{ position: "absolute", left: 44.5 * unit, top: (slabY - 9.5) * unit }}>
          <PaperSteam unit={unit} />
        </View>
      )}
      {config.id === "diner" && (
        <View pointerEvents="none" style={{ position: "absolute", left: 63 * unit, top: (slabY - 8.5) * unit }}>
          <PaperSteam unit={unit} />
        </View>
      )}

      {/* diners — the kit's seat slicing, same as the cantina:
          bench takes slice(0, pawnFirst ? 1 : 2), stools slice(2, 4) */}
      {tableDiners.map((group, i) => {
        const pawnFirst = i === 0;
        const { side, top } = restaurantBoothForTable(i, stackRows);
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

      {/* the hero stands UNBOXED in the open floor — a paper figure
          in his own clothes, his real hair and beard */}
      {pawn && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 50 * unit - heroW / 2, top: (floorTop + 3) * unit, alignItems: "center" }}
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

/** Convenience wrapper: resolve the config from a cuisine id. */
export function PaperRestaurantRoomForCuisine(props: Omit<Parameters<typeof PaperRestaurantRoom>[0], "config"> & { cuisine: string }) {
  const { cuisine, ...rest } = props;
  return <PaperRestaurantRoom config={paperCuisineFor(cuisine)} {...rest} />;
}
