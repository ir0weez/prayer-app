// ---------- paper rooms: the batch-2 scene renderers ----------
// The drawing half of lib/paper-rooms. Where batch 1 gave every
// restaurant its own room component, batch 2 covers forty-plus
// interiors, so the room is PARAMETERIZED: PaperRoomScene draws any
// config from lib/paper-rooms — wall, windows, overhead dressing, the
// signature furniture row (whose count climbs with level), rug,
// corner plants, floor — and stands the screen's own cast in it as
// paper figures (the kit's standing villager / seated diner / hero,
// plus the kneeling, swimming and white-coated poses drawn here in
// the same shapes). The bespoke scenes — church (event-adaptive),
// theater (genre screen + an audience seen from behind), hospital —
// are exported alongside, drawn through the same painter so the whole
// app reads as one diorama. Sine-ease motion only; no bounce.

import type { ReactNode } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path, Rect } from "react-native-svg";
import {
  PAPER_INK,
  PaperCanvas,
  PaperHeroFigure,
  PaperSeatedDiner,
  PaperStandingVillager,
  type PaperPainter,
} from "@/components/paper-interior";
import { paperDinerLookFor, paperHash, type PaperDinerLook } from "@/lib/paper-interior";
import type { PrayedPerson } from "@/lib/hometown";
import { beardGrowthFor, beardShapeFor, type CustomPawn } from "@/lib/pawn";
import {
  paperRoomDressingFor,
  type PaperChurchMode,
  type PaperRoomConfig,
  type PaperTheaterGenre,
} from "@/lib/paper-rooms";

export const ROOM_COLS = 100;
export const ROOM_ROWS = 96;
export const WALL_H = 46;
const FLOOR_FEET = 90; // figure feet baseline, room units

export function isNightHour(d = new Date()): boolean {
  const h = d.getHours();
  return h >= 19 || h < 6;
}

/* ------------------------------------------------------------------ */
/* Shared wall / floor / dressing pieces                               */
/* ------------------------------------------------------------------ */

function drawFloor(p: PaperPainter, cfg: PaperRoomConfig) {
  p.rect(0, WALL_H, ROOM_COLS, ROOM_ROWS - WALL_H, cfg.floor, { shadow: false, edge: false });
  if (cfg.floorKind === "planks" || cfg.floorKind === "dark") {
    for (let y = WALL_H + 7; y < ROOM_ROWS; y += 7) p.line(0, y, ROOM_COLS, y, cfg.floorAlt, 0.5);
    for (let i = 0; i < 7; i++) {
      const x = ((paperHash(cfg.id + "plank" + i) >> 3) % 92) + 4;
      p.line(x, WALL_H + (i % 3) * 7 + 1, x, WALL_H + (i % 3) * 7 + 6, cfg.floorAlt, 0.5);
    }
  } else if (cfg.floorKind === "tile") {
    for (let x = 8; x < ROOM_COLS; x += 8) p.line(x, WALL_H, x, ROOM_ROWS, cfg.floorAlt, 0.45);
    for (let y = WALL_H + 8; y < ROOM_ROWS; y += 8) p.line(0, y, ROOM_COLS, y, cfg.floorAlt, 0.45);
  } else if (cfg.floorKind === "checker") {
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 12; c++)
        if ((r + c) % 2 === 0)
          p.rect(c * 8.4, WALL_H + r * 8.4, 8.4, 8.4, cfg.floorAlt, { shadow: false, edge: false });
  } else if (cfg.floorKind === "stone") {
    for (let y = WALL_H + 9; y < ROOM_ROWS; y += 9) p.line(0, y, ROOM_COLS, y, cfg.floorAlt, 0.5);
    for (let i = 0; i < 8; i++) {
      const y = WALL_H + (i % 5) * 9;
      const x = ((paperHash(cfg.id + "stone" + i) >> 3) % 88) + 4;
      p.line(x, y + 1, x, y + 8, cfg.floorAlt, 0.5);
    }
  } else if (cfg.floorKind === "grass") {
    for (let i = 0; i < 26; i++) {
      const x = ((paperHash(cfg.id + "tuft" + i) >> 3) % 96) + 2;
      const y = WALL_H + 6 + ((paperHash(cfg.id + "tufty" + i) >> 5) % 42);
      p.stroke(`M${x} ${y} q0.6 -2.4 1.4 -3 M${x + 1.6} ${y} q0 -2.8 -0.8 -3.6`, cfg.floorAlt, 0.5);
    }
  }
}

function drawWall(p: PaperPainter, cfg: PaperRoomConfig, windows: number, night: boolean) {
  p.rect(0, 0, ROOM_COLS, WALL_H, cfg.wall, { shadow: false, edge: false });
  p.rect(0, WALL_H - 7, ROOM_COLS, 7, cfg.wallPanel, { shadow: false, edge: false });
  p.rect(0, WALL_H - 1.4, ROOM_COLS, 1.4, cfg.wallDark, { shadow: false, edge: false });
  // panel seams
  for (let x = 12; x < ROOM_COLS; x += 12) p.line(x, 2, x, WALL_H - 8, cfg.wallDark, 0.35);
  // windows — arched, sky by day, lantern-warm by night
  const sky = night ? "#F2A950" : cfg.pale;
  for (let i = 0; i < windows; i++) {
    const cx = windows === 1 ? 50 : 18 + i * (64 / Math.max(1, windows - 1));
    const w = 11, h = 19, top = 9;
    p.path(
      `M${cx - w / 2} ${top + h} L${cx - w / 2} ${top + 5} A${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${top + 5} L${cx + w / 2} ${top + h} Z`,
      sky
    );
    p.line(cx, top + 1.5, cx, top + h, cfg.wallDark, 0.5);
    p.line(cx - w / 2, top + 10, cx + w / 2, top + 10, cfg.wallDark, 0.5);
    if (night) p.glow(cx, top + 10, 9, "#FF9A3D", 0.35);
  }
}

function drawOverhead(p: PaperPainter, cfg: PaperRoomConfig, count: number, night: boolean) {
  if (cfg.overhead === "none" || count <= 0) return;
  for (let i = 0; i < count; i++) {
    const x = count === 1 ? 50 : 14 + i * (72 / (count - 1));
    if (cfg.overhead === "lanterns") {
      p.line(x, 0, x, 5, cfg.wallDark, 0.5);
      p.rect(x - 2.2, 5, 4.4, 5.6, cfg.accent, { r: 1.6 });
      p.rect(x - 1.2, 6.2, 2.4, 3.2, "#FFE9B8", { shadow: false });
      if (night) p.glow(x, 8, 8.5, "#FF9A3D", 0.5);
    } else if (cfg.overhead === "pendants") {
      p.line(x, 0, x, 4.4, cfg.wallDark, 0.5);
      p.poly(`${x - 3.4},8 ${x + 3.4},8 ${x + 1.1},4.4 ${x - 1.1},4.4`, cfg.accent);
      p.circle(x, 9.2, 1.15, "#FFE9B8", { shadow: false });
      if (night) p.glow(x, 9.4, 7.5, "#FFC46B", 0.45);
    } else if (cfg.overhead === "banners") {
      const c = cfg.cloths[i % cfg.cloths.length];
      p.stroke(`M${x - 6} 1 Q${x} 5 ${x + 6} 1`, cfg.wallDark, 0.5);
      p.poly(`${x - 2.6},2.2 ${x + 2.6},2.2 ${x + 2.6},8.6 ${x},6.8 ${x - 2.6},8.6`, c);
    } else if (cfg.overhead === "beams") {
      p.rect(x - 7, 2.5, 14, 2.2, cfg.wallDark, { r: 0.7 });
    } else if (cfg.overhead === "stars") {
      for (let s = 0; s < 7; s++) {
        const sx = x - 7 + ((paperHash(cfg.id + "star" + i * 7 + s) >> 3) % 14);
        const sy = 2 + ((paperHash(cfg.id + "stary" + i * 7 + s) >> 5) % 9);
        p.circle(sx, sy, s % 3 === 0 ? 0.55 : 0.32, "#FDE68A", { shadow: false });
      }
    }
  }
}

function drawRugAndPlants(p: PaperPainter, cfg: PaperRoomConfig, rug: boolean, plants: number) {
  if (rug && cfg.rug) {
    p.rect(24, 68, 52, 17, cfg.rug, { r: 2.4, opacity: 0.92 });
    p.rect(28, 71, 44, 11, cfg.rug, { r: 1.8, edge: true });
    p.line(28, 76.5, 72, 76.5, "rgba(255,255,255,0.25)", 0.5, "2 2");
  }
  for (let i = 0; i < plants; i++) {
    const x = i === 0 ? 5.5 : 94.5;
    p.poly(`${x - 2.2},88 ${x + 2.2},88 ${x + 1.5},83.4 ${x - 1.5},83.4`, "#B45F3B");
    p.ellipse(x, 80.5, 2.9, 3.4, "#4E7A3A", { shadow: false });
    p.ellipse(x - 1.8, 82, 1.8, 2.4, "#5E8C4A", { shadow: false });
    p.ellipse(x + 1.8, 82, 1.8, 2.4, "#5E8C4A", { shadow: false });
  }
}

/* ------------------------------------------------------------------ */
/* Signature furniture — one draw per kind. Each piece stands on the   */
/* wall base line (y = WALL_H), roughly `w` wide, ~20 tall.            */
/* ------------------------------------------------------------------ */

function drawSignaturePiece(p: PaperPainter, cfg: PaperRoomConfig, kind: string, x: number, w: number, i: number, rich: boolean) {
  const base = WALL_H;
  const cloth = cfg.cloths[i % cfg.cloths.length];
  const h1 = paperHash(cfg.id + "sig" + i);
  switch (kind) {
    case "shelves": {
      p.rect(x, base - 21, w, 21, "#5E3D22");
      p.rect(x + 1, base - 20, w - 2, 19, "#6E4A2A", { shadow: false });
      for (let s = 0; s < 3; s++) {
        const sy = base - 13.5 + s * 6.4;
        p.rect(x + 1, sy + 4.6, w - 2, 1.1, "#4A2E18", { shadow: false });
        for (let b = 0; b < 5; b++) {
          const bx = x + 2 + b * ((w - 4) / 5) + ((h1 >> (b + s)) % 2) * 0.4;
          p.rect(bx, sy, (w - 4) / 5 - 1.1, 4.6, cfg.cloths[(b + s + i) % cfg.cloths.length], { shadow: false, r: 0.4 });
        }
      }
      if (rich) p.circle(x + w / 2, base - 22.6, 1.7, "#5E8C4A", { shadow: false });
      break;
    }
    case "counter": {
      p.rect(x, base - 10.5, w, 10.5, "#7A5230");
      p.rect(x - 0.8, base - 12, w + 1.6, 1.8, cfg.accent);
      for (let gI = 0; gI < (rich ? 5 : 3); gI++) {
        const gx = x + 2.4 + gI * ((w - 4.8) / Math.max(1, (rich ? 5 : 3) - 1));
        p.circle(gx, base - 13.6, 1.25, cfg.cloths[(gI + i) % cfg.cloths.length], { shadow: false });
      }
      p.line(x + 1.5, base - 6, x + w - 1.5, base - 6, "#5E3D22", 0.5);
      break;
    }
    case "stalls": {
      p.line(x + 1, base, x + 1, base - 15, "#5E3D22", 0.8);
      p.line(x + w - 1, base, x + w - 1, base - 15, "#5E3D22", 0.8);
      for (let s = 0; s < 5; s++)
        p.poly(
          `${x - 1 + s * ((w + 2) / 5)},${base - 15} ${x - 1 + (s + 1) * ((w + 2) / 5)},${base - 15} ${x - 0.2 + (s + 1) * ((w + 2) / 5)},${base - 18.6} ${x - 0.2 + s * ((w + 2) / 5)},${base - 18.6}`,
          s % 2 ? "#F7EBD4" : cloth,
          { shadow: s === 0 }
        );
      p.rect(x + 0.6, base - 9, w - 1.2, 9, "#8A5A2B");
      for (let gI = 0; gI < 4; gI++)
        p.circle(x + 3 + gI * ((w - 6) / 3), base - 10.6, 1.5, cfg.cloths[(gI + i + 1) % cfg.cloths.length], { shadow: false });
      break;
    }
    case "beds": {
      p.rect(x, base - 12.5, 2, 12.5, "#5E3D22");
      p.rect(x + w - 2, base - 9.5, 2, 9.5, "#5E3D22");
      p.rect(x, base - 8.5, w, 5.5, "#8A5A2B");
      p.rect(x + 0.8, base - 10.5, w - 1.6, 3.4, "#F8FAFC", { shadow: false });
      p.rect(x + 0.8, base - 7.4, w - 1.6, 3.2, cloth, { shadow: false });
      p.rect(x + 1.4, base - 11.8, 4.6, 2.4, "#FFFFFF", { shadow: false, r: 1 });
      if (rich) p.rect(x + w - 6.4, base - 7.4, 5, 3.2, cfg.pale, { shadow: false, opacity: 0.75 });
      break;
    }
    case "desks": {
      p.rect(x + 1, base - 7.5, w - 2, 1.9, "#8A5A2B");
      p.rect(x + 1.6, base - 5.6, 1.3, 5.6, "#5E3D22", { shadow: false });
      p.rect(x + w - 2.9, base - 5.6, 1.3, 5.6, "#5E3D22", { shadow: false });
      p.rect(x + w / 2 - 2.6, base - 9.9, 5.2, 2.5, cloth, { r: 0.5 });
      p.line(x + w / 2, base - 9.9, x + w / 2, base - 7.4, "rgba(42,26,51,0.3)", 0.3);
      if (rich) p.circle(x + 3.4, base - 8.6, 0.95, cfg.accent, { shadow: false });
      break;
    }
    case "pews": {
      p.rect(x, base - 13, w, 2.2, "#7A5230");
      p.rect(x, base - 8, w, 1.9, "#8A5A2B");
      p.rect(x + 0.8, base - 13, 1.4, 13, "#5E3D22", { shadow: false });
      p.rect(x + w - 2.2, base - 13, 1.4, 13, "#5E3D22", { shadow: false });
      p.rect(x + w / 2 - 2.2, base - 15.6, 4.4, 2.4, cloth, { r: 0.5 });
      break;
    }
    case "easels": {
      p.line(x + w / 2, base - 17, x + 1.5, base, "#7A5230", 0.8);
      p.line(x + w / 2, base - 17, x + w - 1.5, base, "#7A5230", 0.8);
      p.line(x + w / 2, base - 17, x + w / 2, base, "#7A5230", 0.8);
      p.rect(x + 2, base - 18.5, w - 4, 11.5, "#FDFBF6");
      p.circle(x + w / 2 + 1.6, base - 14.6, 1.7, "#E9C767", { shadow: false });
      p.path(`M${x + 2.6} ${base - 7.6} Q${x + w / 2} ${base - 12.6} ${x + w - 2.6} ${base - 7.6} Z`, cloth, { shadow: false });
      break;
    }
    case "instruments": {
      if (i % 2 === 0) {
        // music stand + a guitar resting against it
        p.line(x + w / 2, base - 12, x + w / 2, base, "#3A2A1C", 0.7);
        p.rect(x + w / 2 - 3.4, base - 15.4, 6.8, 4.4, cfg.pale, { rot: { deg: -7, cx: x + w / 2, cy: base - 13 } });
        p.ellipse(x + 3.4, base - 4.4, 2.6, 3.4, "#A9713F");
        p.rect(x + 4.6, base - 11.5, 1.1, 5.4, "#7A5230", { shadow: false, rot: { deg: 18, cx: x + 5, cy: base - 9 } });
      } else {
        // a drum + brass bell
        p.ellipse(x + w / 2 - 2.4, base - 5.4, 3.6, 4.4, cloth);
        p.ellipse(x + w / 2 - 2.4, base - 9.6, 3.6, 1.1, "#F7EBD4", { shadow: false });
        p.poly(`${x + w - 4.6},${base - 12.5} ${x + w - 1.6},${base - 12.5} ${x + w - 2.6},${base - 7.5} ${x + w - 3.6},${base - 7.5}`, "#C9963C");
        p.line(x + w - 3.1, base - 7.5, x + w - 3.1, base - 3, "#C9963C", 0.7);
      }
      break;
    }
    case "lab": {
      p.rect(x, base - 8, w, 2, "#5C6658");
      p.rect(x + 1, base - 6, 1.4, 6, "#3E463C", { shadow: false });
      p.rect(x + w - 2.4, base - 6, 1.4, 6, "#3E463C", { shadow: false });
      const fx = x + w / 2 - 3;
      p.path(`M${fx} ${base - 15} h2.4 v3.4 l1.9 3.6 a1.6 1.6 0 0 1 -1.4 2.4 h-3.4 a1.6 1.6 0 0 1 -1.4 -2.4 l1.9 -3.6 Z`, cloth, { opacity: 0.9 });
      p.ellipse(fx + 1.2, base - 9.4, 1.5, 0.75, "#FFFFFF", { shadow: false, opacity: 0.65 });
      if (rich) {
        p.circle(x + 3.4, base - 10.4, 1.5, cfg.cloths[(i + 2) % cfg.cloths.length], { shadow: false, opacity: 0.85 });
        p.circle(x + w - 3.4, base - 11.4, 1.1, cfg.accent, { shadow: false, opacity: 0.85 });
      }
      break;
    }
    case "herbs": {
      p.rect(x, base - 20, w, 1.4, "#5E3D22");
      p.rect(x, base - 13, w, 1.4, "#5E3D22");
      for (let b = 0; b < 4; b++) {
        const bx = x + 1.6 + b * ((w - 3.2) / 4);
        p.rect(bx, base - 23.4 + (b % 2) * 1.2, 2, 3.4 - (b % 2) * 1.2, cfg.cloths[(b + i) % cfg.cloths.length], { shadow: false, r: 0.5 });
        p.rect(bx, base - 16.4 + ((b + 1) % 2), 2, 3.2, cfg.cloths[(b + i + 2) % cfg.cloths.length], { shadow: false, r: 0.5 });
      }
      p.line(x + w - 3, base - 24.5, x + w - 3, base - 21.5, "#7A5230", 0.4);
      p.ellipse(x + w - 3, base - 20.4, 1.5, 2, "#5E8C4A", { shadow: false });
      break;
    }
    case "vault": {
      if (i === 0) {
        p.rect(x, base - 21, w, 21, "#3D4F70");
        p.circle(x + w / 2, base - 10.5, 6.4, "#C9963C");
        p.circle(x + w / 2, base - 10.5, 4.6, "#8A6D1C", { shadow: false });
        p.circle(x + w / 2, base - 10.5, 1.2, "#C9963C", { shadow: false });
        for (let s = 0; s < 4; s++) {
          const a = (s * Math.PI) / 2 + 0.4;
          p.line(x + w / 2, base - 10.5, x + w / 2 + Math.cos(a) * 4.2, base - 10.5 + Math.sin(a) * 4.2, "#C9963C", 0.8);
        }
      } else {
        p.rect(x, base - 10.5, w, 10.5, "#4A5A78");
        p.rect(x - 0.8, base - 12, w + 1.6, 1.8, "#C9963C");
        for (let sIdx = 0; sIdx < 3; sIdx++)
          p.rect(x + 3 + sIdx * 2.2, base - 14.6 - (sIdx % 2), 1.8, 2.6 + (sIdx % 2), "#E9C767", { shadow: false, r: 0.4 });
      }
      break;
    }
    case "benches": {
      p.rect(x, base - 8.6, w, 2.1, "#A9713F");
      p.rect(x + 1, base - 6.5, 1.5, 6.5, "#5E3D22", { shadow: false });
      p.rect(x + w - 2.5, base - 6.5, 1.5, 6.5, "#5E3D22", { shadow: false });
      // a plank on top + tools
      p.rect(x + 2, base - 10.4, w - 5, 1.2, "#C89B62", { shadow: false });
      p.line(x + w - 5, base - 13.4, x + w - 3.4, base - 10.2, "#8A8D91", 0.9);
      p.rect(x + w - 6.2, base - 14.2, 2.6, 1.2, "#7A5230", { shadow: false, rot: { deg: -24, cx: x + w - 4.9, cy: base - 13.6 } });
      if (rich) p.rect(x + 1.5, base - 13.4, 3.4, 4.4, cloth, { shadow: false });
      break;
    }
    case "wheel": {
      if (i % 2 === 0) {
        p.rect(x + w / 2 - 1.1, base - 6.4, 2.2, 6.4, "#7A5230");
        p.ellipse(x + w / 2, base - 6.9, 4.4, 1.3, "#5E3D22");
        p.path(`M${x + w / 2 - 2} ${base - 6.9} q0 -3.4 2 -3.4 q2 0 2 3.4 Z`, cloth);
        p.ellipse(x + w / 2, base - 10.2, 2, 0.6, cloth, { shadow: false });
      } else {
        p.rect(x, base - 15, w, 1.2, "#7A5230");
        p.rect(x, base - 8.5, w, 1.2, "#7A5230");
        for (let pot = 0; pot < 3; pot++) {
          const px = x + 2.4 + pot * ((w - 4.8) / 2);
          p.path(`M${px - 1.3} ${base - 15.2} q0 2.8 1.3 2.8 q1.3 0 1.3 -2.8 Z`, cfg.cloths[(pot + i) % cfg.cloths.length], { shadow: false });
          p.path(`M${px - 1.1} ${base - 8.7} q0 2.4 1.1 2.4 q1.1 0 1.1 -2.4 Z`, cfg.cloths[(pot + i + 1) % cfg.cloths.length], { shadow: false });
        }
      }
      break;
    }
    case "loom": {
      if (i % 2 === 0) {
        for (let b = 0; b < 3; b++)
          p.rect(x + 1.6 + b * ((w - 3.2) / 3), base - 16, (w - 3.2) / 3 - 1.4, 16, cfg.cloths[(b + i) % cfg.cloths.length], { r: 1.6 });
      } else {
        p.line(x + w / 2, base - 13.5, x + w / 2, base, "#3A2A1C", 0.7);
        p.ellipse(x + w / 2, base - 10.4, 3, 4.4, cloth);
        p.circle(x + w / 2, base - 15.6, 1.5, "#E8B88A", { shadow: false });
        p.poly(`${x + w / 2 - 3.4},${base} ${x + w / 2 + 3.4},${base} ${x + w / 2},${base - 3.4}`, "#3A2A1C");
      }
      break;
    }
    case "telescope": {
      if (i % 2 === 0) {
        p.line(x + w / 2, base - 8, x + w / 2 - 3.6, base, "#3A2A1C", 0.8);
        p.line(x + w / 2, base - 8, x + w / 2 + 3.6, base, "#3A2A1C", 0.8);
        p.line(x + w / 2, base - 8, x + w / 2, base, "#3A2A1C", 0.8);
        p.rect(x + w / 2 - 6.4, base - 15.6, 12.8, 3.6, "#4A6FA5", { rot: { deg: -18, cx: x + w / 2, cy: base - 13.8 } });
        p.rect(x + w / 2 + 4.4, base - 17.8, 3.2, 4.4, "#C9963C", { shadow: false, rot: { deg: -18, cx: x + w / 2 + 6, cy: base - 15.6 } });
      } else {
        p.rect(x + 1, base - 16, w - 2, 11, "#322C52");
        for (let s = 0; s < 5; s++)
          p.circle(x + 3 + ((h1 >> s) % Math.max(2, w - 5)), base - 13.5 + ((h1 >> (s + 4)) % 7), 0.5, "#FDE68A", { shadow: false });
        p.stroke(`M${x + 2.5} ${base - 7} Q${x + w / 2} ${base - 12} ${x + w - 2.5} ${base - 8.4}`, "#FDE68A", 0.4, 0.8);
      }
      break;
    }
    case "equipment": {
      if (i % 2 === 0) {
        p.rect(x + 1, base - 1.8, w - 2, 1.8, "#374151");
        p.rect(x + w - 4.4, base - 13.5, 1.6, 11.7, "#374151", { shadow: false });
        p.rect(x + w - 6.2, base - 15.6, 5.4, 3, cfg.accent, { r: 0.7 });
      } else {
        p.rect(x + 1, base - 14.5, w - 2, 1.3, "#374151");
        p.rect(x + 1, base - 7.5, w - 2, 1.3, "#374151", { shadow: false });
        for (let dI = 0; dI < 3; dI++) {
          const dx = x + 3 + dI * ((w - 6) / 2);
          p.circle(dx, base - 10.6, 1.65, "#23272E", { shadow: false });
          p.circle(dx, base - 3.6, 1.65, "#23272E", { shadow: false });
        }
      }
      break;
    }
    case "oven": {
      if (i % 2 === 0) {
        p.rect(x, base - 17, w, 17, "#8A5A3A");
        p.path(`M${x + 3} ${base} L${x + 3} ${base - 8} A${(w - 6) / 2} ${(w - 6) / 2} 0 0 1 ${x + w - 3} ${base - 8} L${x + w - 3} ${base} Z`, "#2A1A12");
        p.ellipse(x + w / 2, base - 3.4, (w - 8) / 2, 2.4, "#F97316", { shadow: false });
        p.ellipse(x + w / 2, base - 2.6, (w - 12) / 2, 1.5, "#FBBF24", { shadow: false });
        p.rect(x - 0.6, base - 18.6, w + 1.2, 1.8, "#6E4A2A");
      } else {
        p.rect(x, base - 12, w, 12, "#7A5230");
        p.rect(x + 1.2, base - 16.4, w - 2.4, 4.6, "#EAF6F4", { opacity: 0.85 });
        for (let sIdx = 0; sIdx < 3; sIdx++)
          p.circle(x + 3.4 + sIdx * ((w - 6.8) / 2), base - 14.3, 1.4, cloth === cfg.cloths[0] ? cfg.cloths[(sIdx + i) % cfg.cloths.length] : cfg.cloths[(sIdx + i) % cfg.cloths.length], { shadow: false });
        p.rect(x + 1.2, base - 11.4, w - 2.4, 0.9, "#5E3D22", { shadow: false });
        for (let sIdx = 0; sIdx < 3; sIdx++)
          p.ellipse(x + 3.4 + sIdx * ((w - 6.8) / 2), base - 8.6, 1.5, 1, cfg.cloths[(sIdx + i + 1) % cfg.cloths.length], { shadow: false });
      }
      break;
    }
    case "podium": {
      if (i === 1) {
        p.poly(`${x + 2},${base} ${x + 3.4},${base - 13} ${x + w - 3.4},${base - 13} ${x + w - 2},${base}`, "#7A5230");
        p.rect(x + 2.6, base - 14.6, w - 5.2, 1.8, cfg.accent);
        p.circle(x + w / 2, base - 8.6, 1.6, cfg.pale, { shadow: false });
      } else {
        // a citizen's chair with a cushion
        p.rect(x + 1, base - 9.5, w - 2, 1.7, "#7A5230");
        p.rect(x + 1.6, base - 5.4, w - 3.2, 1.4, cloth, { shadow: false });
        p.rect(x + 1.4, base - 7.8, 1.2, 7.8, "#5E3D22", { shadow: false });
        p.rect(x + w - 2.6, base - 7.8, 1.2, 7.8, "#5E3D22", { shadow: false });
      }
      break;
    }
    case "hearth": {
      p.rect(x, base - 15, w, 15, "#78716C");
      p.path(`M${x + 3} ${base} L${x + 3} ${base - 6.4} A${(w - 6) / 2} ${(w - 6) / 2} 0 0 1 ${x + w - 3} ${base - 6.4} L${x + w - 3} ${base} Z`, "#1C1917");
      p.ellipse(x + w / 2, base - 2.8, (w - 9) / 2, 2.1, "#F97316", { shadow: false });
      p.ellipse(x + w / 2, base - 2.1, (w - 13) / 2, 1.3, "#FBBF24", { shadow: false });
      p.rect(x - 0.6, base - 16.6, w + 1.2, 1.8, "#A8A29E");
      if (rich) p.circle(x + w / 2, base - 18.2, 1.3, cfg.accent, { shadow: false });
      break;
    }
    case "candles": {
      p.line(x + w / 2, base, x + w / 2, base - 13.5, "#3A3226", 0.8);
      p.line(x + w / 2, base - 9.5, x + 2.4, base - 11.4, "#3A3226", 0.6);
      p.line(x + w / 2, base - 9.5, x + w - 2.4, base - 11.4, "#3A3226", 0.6);
      const flames: Array<[number, number]> = [
        [x + w / 2, base - 13.5],
        [x + 2.4, base - 11.4],
        [x + w - 2.4, base - 11.4],
      ];
      for (const [fx, fy] of flames) {
        p.rect(fx - 0.85, fy, 1.7, 3.4, "#F7EBD4", { shadow: false, r: 0.5 });
        p.ellipse(fx, fy - 1.1, 0.62, 1.05, "#FFB84D", { shadow: false });
        p.glow(fx, fy - 1, 3.6, "#FF9A3D", 0.4);
      }
      p.poly(`${x + w / 2 - 3},${base} ${x + w / 2 + 3},${base} ${x + w / 2},${base - 2.2}`, "#3A3226");
      break;
    }
    case "study": {
      if (i % 2 === 0) {
        p.rect(x + 0.6, base - 8.4, w - 1.2, 2, "#7A5230");
        p.rect(x + 1.4, base - 6.4, 1.3, 6.4, "#54381E", { shadow: false });
        p.rect(x + w - 2.7, base - 6.4, 1.3, 6.4, "#54381E", { shadow: false });
        // open book on the table
        p.poly(`${x + w / 2 - 3.4},${base - 8.8} ${x + w / 2},${base - 9.8} ${x + w / 2},${base - 7.2} ${x + w / 2 - 3.4},${base - 6.4}`, "#FDFBF6");
        p.poly(`${x + w / 2 + 3.4},${base - 8.8} ${x + w / 2},${base - 9.8} ${x + w / 2},${base - 7.2} ${x + w / 2 + 3.4},${base - 6.4}`, "#F7EBD4");
        if (rich) p.rect(x + 2.2, base - 10.6, 2.6, 3.4, cloth, { shadow: false, r: 0.4 });
      } else {
        // a low bookcase
        p.rect(x, base - 14, w, 14, "#5E3D22");
        for (let b = 0; b < 4; b++)
          p.rect(x + 1.8 + b * ((w - 3.6) / 4), base - 11.6, (w - 3.6) / 4 - 1, 4.4, cfg.cloths[(b + i) % cfg.cloths.length], { shadow: false, r: 0.4 });
        for (let b = 0; b < 3; b++)
          p.rect(x + 2.4 + b * ((w - 4.8) / 3), base - 5.4, (w - 4.8) / 3 - 1, 3.6, cfg.cloths[(b + i + 1) % cfg.cloths.length], { shadow: false, r: 0.4 });
      }
      break;
    }
    case "pantry": {
      if (i % 2 === 0) {
        p.rect(x, base - 18, w, 1.3, "#7A5230");
        p.rect(x, base - 11.5, w, 1.3, "#7A5230");
        for (let b = 0; b < 4; b++) {
          p.rect(x + 1.6 + b * ((w - 3.2) / 4), base - 22 + (b % 2), (w - 3.2) / 4 - 1.2, 4 - (b % 2), cfg.cloths[(b + i) % cfg.cloths.length], { shadow: false, r: 0.5 });
          p.rect(x + 1.6 + b * ((w - 3.2) / 4), base - 15.4, (w - 3.2) / 4 - 1.2, 3.8, cfg.cloths[(b + i + 2) % cfg.cloths.length], { shadow: false, r: 0.5 });
        }
      } else {
        p.rect(x + 1, base - 6.5, w - 2, 6.5, "#A9713F");
        p.line(x + 1, base - 3.2, x + w - 1, base - 3.2, "#7A5230", 0.5);
        p.rect(x + 2.2, base - 12.4, w - 4.4, 5.9, "#B98A54", { shadow: false });
        p.line(x + 2.2, base - 9.4, x + w - 2.2, base - 9.4, "#8A6136", 0.5);
      }
      break;
    }
    case "clock": {
      if (i === 1) {
        p.circle(x + w / 2, base - 11, 8.6, "#3A2E20");
        p.circle(x + w / 2, base - 11, 7.4, "#F7F2E4", { shadow: false });
        for (let tI = 0; tI < 12; tI++) {
          const a = (tI * Math.PI) / 6;
          p.circle(x + w / 2 + Math.cos(a) * 6.2, base - 11 + Math.sin(a) * 6.2, 0.42, "#3A2E20", { shadow: false });
        }
        p.line(x + w / 2, base - 11, x + w / 2 + 2.6, base - 14.6, "#3A2E20", 0.8);
        p.line(x + w / 2, base - 11, x + w / 2 - 3.8, base - 9.8, "#3A2E20", 0.8);
      } else {
        p.circle(x + w / 2, base - 8, 5.6, "#8A6D1C");
        p.circle(x + w / 2, base - 8, 3.9, cfg.wall, { shadow: false });
        for (let tI = 0; tI < 6; tI++) {
          const a = (tI * Math.PI) / 3 + 0.3;
          p.rect(x + w / 2 + Math.cos(a) * 5 - 0.85, base - 8 + Math.sin(a) * 5 - 0.85, 1.7, 1.7, "#8A6D1C", { shadow: false });
        }
      }
      break;
    }
    case "cases": {
      p.rect(x + 1, base - 13.5, w - 2, 9.5, "#BFE3EA", { opacity: 0.55 });
      p.rect(x + 1, base - 4, w - 2, 4, "#5E5648");
      if (i % 2 === 0) {
        p.path(`M${x + w / 2 - 2.2} ${base - 4.6} q-0.6 -3.4 1 -4.6 q-1.2 -1.4 0.4 -2.6 h2.2 q1.6 1.2 0.4 2.6 q1.6 1.2 1 4.6 Z`, cloth, { shadow: false });
      } else {
        p.poly(`${x + w / 2},${base - 11.4} ${x + w / 2 + 2.4},${base - 7.4} ${x + w / 2},${base - 4.8} ${x + w / 2 - 2.4},${base - 7.4}`, cloth, { shadow: false });
      }
      p.rect(x + 0.4, base - 14.4, w - 0.8, 1.1, cfg.accent);
      break;
    }
    case "stage": {
      const c = cfg.cloths[0];
      p.poly(`${x},${base - 24} ${x + w * 0.3},${base - 24} ${x + w * 0.22},${base} ${x},${base}`, c);
      p.poly(`${x + w},${base - 24} ${x + w * 0.7},${base - 24} ${x + w * 0.78},${base} ${x + w},${base}`, c);
      p.rect(x, base - 25.6, w, 2, "#C9963C");
      p.rect(x + w * 0.28, base - 21, w * 0.44, 21, "#241423", { shadow: false });
      p.circle(x + w / 2, base - 13.5, 1.5, "#FDE68A", { shadow: false });
      p.glow(x + w / 2, base - 10, 7.5, "#FFC46B", 0.3);
      break;
    }
    case "racks": {
      p.line(x + 1, base - 15.5, x + w - 1, base - 15.5, "#8A8D91", 0.8);
      p.line(x + 1.6, base - 15.5, x + 1.6, base, "#8A8D91", 0.7);
      p.line(x + w - 1.6, base - 15.5, x + w - 1.6, base, "#8A8D91", 0.7);
      for (let gI = 0; gI < 4; gI++) {
        const gx = x + 2.6 + gI * ((w - 5.2) / 3.4);
        p.rect(gx, base - 15.2, 3, 6.8 + (gI % 2) * 1.6, cfg.cloths[(gI + i) % cfg.cloths.length], { shadow: false, r: 0.6 });
      }
      break;
    }
    case "mail": {
      if (i % 2 === 0) {
        p.rect(x, base - 19, w, 19, "#7A5230");
        const colsN = 4, rowsN = 3;
        for (let rI = 0; rI < rowsN; rI++)
          for (let cI = 0; cI < colsN; cI++) {
            const cxp = x + 1.4 + cI * ((w - 2.8) / colsN);
            const cyp = base - 17.6 + rI * 5.6;
            p.rect(cxp, cyp, (w - 2.8) / colsN - 1, 4.4, "#5E3D22", { shadow: false, r: 0.4 });
            if ((rI * colsN + cI + i) % 3 !== 0)
              p.rect(cxp + 0.7, cyp + 1, (w - 2.8) / colsN - 2.4, 2.2, "#F7EBD4", { shadow: false, r: 0.3 });
          }
      } else {
        p.rect(x, base - 10.5, w, 10.5, "#8A5A2B");
        p.rect(x - 0.8, base - 12, w + 1.6, 1.8, cfg.accent);
        p.rect(x + 2.4, base - 15.4, 5.4, 3.2, "#C4493B", { shadow: false, r: 0.5 });
        p.rect(x + w - 7.8, base - 14.8, 4.6, 2.6, "#F7EBD4", { shadow: false, r: 0.5 });
      }
      break;
    }
    case "plants": {
      p.rect(x + 0.6, base - 7.6, w - 1.2, 1.8, "#7A5230");
      p.rect(x + 1.4, base - 5.8, 1.3, 5.8, "#54381E", { shadow: false });
      p.rect(x + w - 2.7, base - 5.8, 1.3, 5.8, "#54381E", { shadow: false });
      for (let pot = 0; pot < 3; pot++) {
        const px = x + 3 + pot * ((w - 6) / 2);
        p.poly(`${px - 1.7},${base - 7.8} ${px + 1.7},${base - 7.8} ${px + 1.2},${base - 10.6} ${px - 1.2},${base - 10.6}`, "#B45F3B", { shadow: false });
        p.ellipse(px, base - 12.6, 2, 2.2, "#5E8C4A", { shadow: false });
        p.circle(px + (pot % 2 ? 1 : -1), base - 13.6, 0.8, cloth, { shadow: false });
      }
      break;
    }
    default: {
      p.rect(x, base - 10, w, 10, cfg.wallPanel);
      break;
    }
  }
}

function drawSignatureRow(p: PaperPainter, cfg: PaperRoomConfig, count: number, rich: boolean) {
  if (cfg.signature === "pool") return; // the pool is drawn in the floor
  if (cfg.signature === "stage") {
    drawSignaturePiece(p, cfg, "stage", 16, 68, 0, rich);
    return;
  }
  const span = 88;
  const w = Math.min(24, span / count - 3);
  const total = count * w + (count - 1) * ((span - count * w) / Math.max(1, count - 1));
  let x = 50 - total / 2;
  for (let i = 0; i < count; i++) {
    drawSignaturePiece(p, cfg, cfg.signature, x, w, i, rich);
    x += w + (span - count * w) / Math.max(1, count - 1);
  }
}

function drawPool(p: PaperPainter, cfg: PaperRoomConfig, rich: boolean) {
  // the soak pool fills the floor's heart; benches + ferns at the sides
  p.rect(16, 58, 68, 30, "#5E9AA6", { r: 3 });
  p.rect(19, 61, 62, 24, "#8FC9CF", { shadow: false, r: 2.4 });
  for (let i = 0; i < 5; i++)
    p.stroke(`M${24 + i * 11} ${67 + (i % 2) * 6} q3 -1.8 6 0 q3 1.8 6 0`, "#EAFBFA", 0.55, 0.7);
  p.rect(16, 55.4, 68, 2.6, "#CBD5E1", { r: 1 });
  if (rich) {
    p.rect(6, 62, 7, 2, "#7A5230");
    p.rect(87, 62, 7, 2, "#7A5230");
    p.ellipse(9.5, 58.5, 2.6, 3.2, "#4E7A3A", { shadow: false });
    p.ellipse(90.5, 58.5, 2.6, 3.2, "#4E7A3A", { shadow: false });
  }
}

/* ------------------------------------------------------------------ */
/* Paper poses the kit doesn't ship: kneeling (prayer), swimming       */
/* (pool / backyard), and the white coat (hospital). Drawn in the      */
/* kit's own shapes — the same head, hair cap and beard vocabulary —   */
/* so a person reads identically in every pose.                        */
/* ------------------------------------------------------------------ */

function PaperHeadShapes({ look, cx, cy, r }: { look: PaperDinerLook; cx: number; cy: number; r: number }) {
  const bald = look.hairStyle === "bald";
  const beardG = look.beardStyle === "none" ? 0 : Math.min(Math.max(look.beardLength, 0), 100) / 100;
  return (
    <>
      {look.hairStyle === "long" && (
        <>
          <Rect x={cx - r - 0.4} y={cy - r * 0.4} width={r * 0.62} height={r * 2.4} rx={r * 0.3} fill={look.hair} />
          <Rect x={cx + r - r * 0.35} y={cy - r * 0.4} width={r * 0.62} height={r * 2.4} rx={r * 0.3} fill={look.hair} />
        </>
      )}
      {!bald && <Circle cx={cx} cy={cy - r * 0.18} r={r * 1.1} fill={look.hair} />}
      <Circle cx={cx} cy={cy} r={r} fill={look.skin} />
      {!bald && (
        <Path
          d={`M ${cx - r * 0.98} ${cy - r * 0.12} A ${r * 1.02} ${r * 1.02} 0 0 1 ${cx + r * 0.98} ${cy - r * 0.12} L ${cx + r * 0.78} ${cy - r * 0.18} A ${r * 0.8} ${r * 0.8} 0 0 0 ${cx - r * 0.78} ${cy - r * 0.18} Z`}
          fill={look.hair}
          stroke="rgba(42,26,51,0.25)"
          strokeWidth={0.2}
        />
      )}
      {look.hairStyle === "bun" && <Circle cx={cx - r * 0.28} cy={cy - r * 1.28} r={r * 0.4} fill={look.hair} />}
      {bald && <Ellipse cx={cx - r * 0.22} cy={cy - r * 0.62} rx={r * 0.4} ry={r * 0.18} fill="#FFFFFF" opacity={0.38} transform={`rotate(-18 ${cx - r * 0.22} ${cy - r * 0.62})`} />}
      <Circle cx={cx - r * 0.28} cy={cy + r * 0.08} r={r * 0.1} fill={PAPER_INK} />
      <Circle cx={cx + r * 0.28} cy={cy + r * 0.08} r={r * 0.1} fill={PAPER_INK} />
      {look.beardStyle === "full" && <Ellipse cx={cx} cy={cy + r * 0.78} rx={r * 0.68} ry={r * (0.24 + beardG * 0.34)} fill={look.hair} />}
      {look.beardStyle === "goatee" && <Rect x={cx - r * 0.21} y={cy + r * 0.6} width={r * 0.42} height={r * (0.2 + beardG * 0.42)} rx={r * 0.2} fill={look.hair} />}
      {look.beardStyle === "mustache" && <Rect x={cx - r * 0.36} y={cy + r * 0.42} width={r * 0.72} height={r * 0.14} rx={r * 0.07} fill={look.hair} />}
    </>
  );
}

/** Kneeling in prayer — folded legs, leaning torso, bowed head. */
export function PaperKneelFigure({ person, unit }: { person: PrayedPerson; unit: number }) {
  const look = paperDinerLookFor(person);
  const W = 10, H = 10.6;
  return (
    <Svg width={W * unit} height={H * unit} viewBox={`0 0 ${W} ${H}`}>
      <Ellipse cx={5} cy={10.1} rx={3.8} ry={0.5} fill="rgba(24,8,44,0.28)" />
      {/* folded legs along the floor */}
      <Rect x={2.2} y={9.2} width={5.6} height={1.1} rx={0.55} fill={look.pants} />
      <Rect x={3.1} y={8.2} width={3.9} height={1.3} rx={0.6} fill={look.pants} />
      {/* torso leaning forward in prayer */}
      <Rect x={2.9} y={4.4} width={4.4} height={4.6} rx={1.5} fill={look.shirt} transform="rotate(7 5 6.7)" />
      {/* arms folded down in front */}
      <Rect x={4.1} y={6.4} width={1.15} height={3} rx={0.55} fill={look.shirt} transform="rotate(-16 4.7 7.9)" />
      <Rect x={5.6} y={6.4} width={1.15} height={3} rx={0.55} fill={look.shirt} transform="rotate(16 6.2 7.9)" />
      <Circle cx={4.9} cy={9.4} r={0.62} fill={look.skin} />
      <Circle cx={6} cy={9.4} r={0.62} fill={look.skin} />
      <PaperHeadShapes look={look} cx={5.45} cy={3.1} r={2.3} />
    </Svg>
  );
}

/** Swimming / soaking — head and shoulders above the waterline. */
export function PaperSwimFigure({ person, unit }: { person: PrayedPerson; unit: number }) {
  const look = paperDinerLookFor(person);
  const W = 10, H = 6.8;
  return (
    <Svg width={W * unit} height={H * unit} viewBox={`0 0 ${W} ${H}`}>
      <Rect x={2.4} y={4.9} width={5.2} height={1.9} rx={0.9} fill={look.shirt} />
      <PaperHeadShapes look={look} cx={5} cy={2.9} r={2.3} />
    </Svg>
  );
}

/** A villager in a white coat — the hospital's doctor / nurse. */
export function PaperDoctorFigure({ person, width }: { person: PrayedPerson; width: number }) {
  const height = width * 1.6;
  return (
    <View style={{ width, height }}>
      <PaperStandingVillager look={paperDinerLookFor(person)} width={width} />
      <Svg width={width} height={height} viewBox="0 0 10 16" style={{ position: "absolute", left: 0, top: 0 }}>
        {/* the coat over the torso */}
        <Rect x={2.35} y={5.9} width={5.3} height={5.9} rx={1.3} fill="#F8FAFC" opacity={0.97} />
        <Rect x={4.82} y={6.2} width={0.36} height={5.4} fill="#CBD5E1" />
        <Rect x={4.35} y={7.7} width={1.3} height={0.42} rx={0.2} fill="#EF4444" />
        <Rect x={4.79} y={7.26} width={0.42} height={1.3} rx={0.2} fill="#EF4444" />
      </Svg>
    </View>
  );
}

/** A small music note — the worship overlay (sine-bobbed by the host). */
export function PaperNoteGlyph({ unit, color = "#7B2D8B" }: { unit: number; color?: string }) {
  return (
    <Svg width={3.4 * unit} height={4.6 * unit} viewBox="0 0 3.4 4.6">
      <Ellipse cx={1.1} cy={3.8} rx={1.05} ry={0.78} fill={color} transform="rotate(-18 1.1 3.8)" />
      <Rect x={2} y={0.4} width={0.42} height={3.5} fill={color} />
      <Path d="M2 0.4 q1.3 0.4 1.2 1.7 q-0.5 -0.8 -1.2 -0.9 Z" fill={color} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* The cast — one entry per person the screen places in its room.      */
/* ------------------------------------------------------------------ */

export type PaperPose = "stand" | "seated" | "kneel" | "sing" | "work" | "swim";
export type PaperCastEntry = { person: PrayedPerson; pose?: PaperPose; flip?: boolean; hideName?: boolean };

function CastFigure({
  entry,
  unit,
  labelColor,
  delay,
}: {
  entry: PaperCastEntry;
  unit: number;
  labelColor: string;
  delay: number;
}) {
  const pose = entry.pose ?? "stand";
  let fig: ReactNode;
  if (pose === "seated") {
    fig = <PaperSeatedDiner person={entry.person} unit={unit} flipX={entry.flip} delay={delay} />;
  } else if (pose === "kneel") {
    fig = <PaperKneelFigure person={entry.person} unit={unit} />;
  } else if (pose === "swim") {
    fig = <PaperSwimFigure person={entry.person} unit={unit} />;
  } else {
    fig = (
      <View>
        <PaperStandingVillager look={paperDinerLookFor(entry.person)} width={12.5 * unit} />
        {pose === "sing" && (
          <View style={{ position: "absolute", right: -unit * 1.2, top: -unit * 0.6 }}>
            <PaperNoteGlyph unit={unit} />
          </View>
        )}
        {pose === "work" && (
          <View style={{ position: "absolute", right: -unit * 0.8, top: unit * 7.4 }}>
            <Svg width={3.6 * unit} height={3.6 * unit} viewBox="0 0 3.6 3.6">
              <Rect x={1.5} y={1.2} width={0.55} height={2.3} rx={0.27} fill="#7A5230" transform="rotate(-24 1.8 2.4)" />
              <Rect x={0.5} y={0.3} width={2.2} height={0.95} rx={0.4} fill="#8A8D91" transform="rotate(-24 1.6 0.8)" />
            </Svg>
          </View>
        )}
      </View>
    );
  }
  return (
    <View style={{ alignItems: "center" }}>
      {fig}
      {!entry.hideName && (
        <Text style={{ fontSize: Math.max(8, unit * 2.6), color: labelColor, marginTop: unit * 0.4, fontWeight: "600" }}>
          {entry.person.name}
        </Text>
      )}
    </View>
  );
}

/** Figure heights in room units, by pose — for floor placement. */
function poseHeight(pose: PaperPose): number {
  switch (pose) {
    case "seated": return 14;
    case "kneel": return 10.6;
    case "swim": return 6.8;
    default: return 20;
  }
}

/* ------------------------------------------------------------------ */
/* PaperRoomScene — the generic interior. The screen keeps its shell,  */
/* its actions and its games; only the room renders here.              */
/* ------------------------------------------------------------------ */

export function PaperRoomScene({
  config,
  level,
  cast = [],
  pawn = null,
  pawnPose = "stand",
  width = 360,
  labelColor = "#4A3421",
  extraDraw,
  nightOverride,
}: {
  config: PaperRoomConfig;
  level: number;
  cast?: PaperCastEntry[];
  pawn?: CustomPawn | null;
  pawnPose?: PaperPose;
  width?: number;
  labelColor?: string;
  /** Bespoke additions drawn into the room after the signature row. */
  extraDraw?: (p: PaperPainter) => void;
  nightOverride?: boolean;
}) {
  const unit = width / ROOM_COLS;
  const night = nightOverride ?? isNightHour();
  const dressing = paperRoomDressingFor(level);

  // Slots: cast + hero (hero stands mid-row, as the screens place him).
  type Slot = { kind: "cast"; entry: PaperCastEntry } | { kind: "pawn" };
  const slots: Slot[] = cast.map((entry) => ({ kind: "cast", entry }) as Slot);
  if (pawn) slots.splice(Math.ceil(slots.length / 2), 0, { kind: "pawn" });
  const swimmers = slots.filter((s) => s.kind === "cast" && (s.entry.pose ?? "stand") === "swim");
  const floorSlots = slots.filter((s) => !swimmers.includes(s));
  const slotX = (i: number, n: number) => (n <= 1 ? 50 : 15 + i * (70 / (n - 1)));
  const swimX = (i: number, n: number) => (n <= 1 ? 50 : 30 + i * (40 / Math.max(1, n - 1)));

  const seatedSlots = floorSlots
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.kind === "cast" && (s.entry.pose ?? "stand") === "seated");

  return (
    <View style={{ width, height: ROOM_ROWS * unit, overflow: "hidden" }}>
      <PaperCanvas
        cols={ROOM_COLS}
        rows={ROOM_ROWS}
        unit={unit}
        draw={(p) => {
          drawWall(p, config, dressing.windows, night);
          drawFloor(p, config);
          drawOverhead(p, config, config.overhead === "none" ? 0 : dressing.overheadCount, night);
          if (config.signature === "pool") drawPool(p, config, dressing.richSignature);
          else drawSignatureRow(p, config, dressing.signatureCount, dressing.richSignature);
          drawRugAndPlants(p, config, dressing.rug, dressing.cornerPlants);
          // benches under seated figures
          for (const { i } of seatedSlots) {
            const cx = slotX(i, floorSlots.length);
            p.rect(cx - 6.8, FLOOR_FEET - 4.4, 13.6, 1.7, "#7A5230", { r: 0.8 });
            p.rect(cx - 6.8, FLOOR_FEET - 4.4, 13.6, 0.8, config.accent, { shadow: false, r: 0.4 });
          }
          if (night && config.overhead !== "none" && config.overhead !== "stars")
            p.glow(50, 12, 26, "#FF9A3D", 0.16);
          extraDraw?.(p);
        }}
      />
      {/* swimmers ride in the pool band */}
      {swimmers.map((s, i) =>
        s.kind === "cast" ? (
          <View key={`swim-${s.entry.person.id}`} style={{ position: "absolute", left: swimX(i, swimmers.length) * unit - 5 * unit, top: 63 * unit }}>
            <CastFigure entry={s.entry} unit={unit} labelColor={labelColor} delay={i * 220} />
          </View>
        ) : null
      )}
      {/* the floor cast */}
      {floorSlots.map((s, i) => {
        const cx = slotX(i, floorSlots.length);
        if (s.kind === "pawn") {
          if (!pawn) return null;
          const h = pawnPose === "seated" ? 17 : PAPER_HERO_UNITS_H;
          return (
            <View key="pawn" style={{ position: "absolute", left: cx * unit - (PAPER_HERO_UNITS_W * unit) / 2, top: (FLOOR_FEET - h) * unit, alignItems: "center" }}>
              <PaperHeroFigure pawn={pawn} unit={unit} />
              <Text style={{ fontSize: Math.max(8, unit * 2.6), color: labelColor, marginTop: unit * 0.4, fontWeight: "700" }}>
                {pawn.name}
              </Text>
            </View>
          );
        }
        const pose = s.entry.pose ?? "stand";
        const h = poseHeight(pose);
        const wUnits = pose === "seated" ? 12 : pose === "stand" || pose === "sing" || pose === "work" ? 12.5 : 10;
        return (
          <View
            key={`cast-${s.entry.person.id}-${i}`}
            style={{ position: "absolute", left: cx * unit - (wUnits * unit) / 2, top: (FLOOR_FEET - h) * unit }}
          >
            <CastFigure entry={s.entry} unit={unit} labelColor={labelColor} delay={i * 200} />
          </View>
        );
      })}
      {night && (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, top: 0, width, height: ROOM_ROWS * unit, backgroundColor: "rgba(255,150,60,0.05)" }} />
      )}
    </View>
  );
}

// Hero placement box in room units — kit parity (v160 scale fix:
// a small hero-only multiplier used to make him larger than every
// villager in the room; he now renders at the same unit as the cast).
const PAPER_HERO_UNITS_W = 11;
const PAPER_HERO_UNITS_H = 17;

/* ------------------------------------------------------------------ */
/* The church — paper, and still event-adaptive: the same room reads   */
/* altar / prayer / worship / study / serve by its cast and dressing,  */
/* exactly as the schedule scene system routes it.                     */
/* ------------------------------------------------------------------ */

const CHURCH_WALL = "#8A6136";
const CHURCH_WALL_DARK = "#6E4D2E";
const CHURCH_FLOOR = "#A9713F";
const GLASS_COLORS = ["#C4493B", "#4A6FA5", "#E9C767", "#2E7D74", "#7B2D8B", "#E07B39"];

function drawStainedGlass(p: PaperPainter, cx: number, top: number, w: number, h: number, seed: number) {
  p.path(
    `M${cx - w / 2} ${top + h} L${cx - w / 2} ${top + w / 2} A${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${top + w / 2} L${cx + w / 2} ${top + h} Z`,
    "#F7EBD4"
  );
  const rowsN = 4, colsN = 3;
  for (let rI = 0; rI < rowsN; rI++)
    for (let cI = 0; cI < colsN; cI++) {
      const px = cx - w / 2 + 1 + cI * ((w - 2) / colsN);
      const py = top + w / 2 + 0.6 + rI * ((h - w / 2 - 1.6) / rowsN);
      if (py > top + h - 2) continue;
      p.rect(px, py, (w - 2) / colsN - 0.8, (h - w / 2 - 1.6) / rowsN - 0.8, GLASS_COLORS[(rI * colsN + cI + seed) % GLASS_COLORS.length], { shadow: false, r: 0.4, opacity: 0.92 });
    }
  p.line(cx, top + 1, cx, top + h, CHURCH_WALL_DARK, 0.5);
  p.glow(cx, top + h / 2, w * 0.9, "#FFD18A", 0.3);
}

export function PaperChurchScene({
  level,
  mode,
  cast = [],
  pawn = null,
  width = 360,
  labelColor = "#4A3421",
}: {
  level: number;
  mode: PaperChurchMode;
  cast?: PaperCastEntry[];
  pawn?: CustomPawn | null;
  width?: number;
  labelColor?: string;
}) {
  const unit = width / ROOM_COLS;
  const night = isNightHour();
  const candles = level + 1; // altar candles per side climb with level

  // Cast placement by mode (room-unit centers + feet lines).
  type Placed = { entry?: PaperCastEntry; pawn?: boolean; x: number; feet: number; pose: PaperPose };
  const placed: Placed[] = [];
  const mid = Math.ceil(cast.length / 2);
  if (mode === "study") {
    // two circles: three seats per study table, hero at the first table
    cast.forEach((entry, i) => {
      const table = i < 3 ? 0 : 1;
      const seat = i % 3;
      const tx = table === 0 ? 29 : 71;
      const spots: Array<{ x: number; feet: number; flip: boolean }> = [
        { x: tx - 11, feet: 82, flip: false },
        { x: tx + 11, feet: 82, flip: true },
        { x: tx, feet: 68, flip: seat % 2 === 0 },
      ];
      const s = spots[seat];
      placed.push({ entry: { ...entry, pose: "seated", flip: s.flip }, x: s.x, feet: s.feet, pose: "seated" });
    });
    if (pawn) placed.push({ pawn: true, x: 29, feet: 92, pose: "stand" });
  } else if (mode === "prayer") {
    cast.forEach((entry, i) => {
      const row = i < mid ? 0 : 1;
      const j = row === 0 ? i : i - mid;
      const n = row === 0 ? mid : cast.length - mid;
      placed.push({ entry: { ...entry, pose: "kneel" }, x: n <= 1 ? 32 + row * 36 : 20 + j * (24 / Math.max(1, n - 1)) + row * 38, feet: row === 0 ? 74 : 88, pose: "kneel" });
    });
    if (pawn) placed.push({ pawn: true, x: 50, feet: 66, pose: "kneel" });
  } else {
    const pose: PaperPose = mode === "worship" ? "sing" : mode === "serve" ? "work" : "stand";
    cast.forEach((entry, i) => {
      const n = cast.length + (pawn ? 1 : 0);
      const idx = pawn && i >= mid ? i + 1 : i;
      placed.push({ entry: { ...entry, pose }, x: n <= 1 ? 50 : 14 + idx * (72 / (n - 1)), feet: 88, pose });
    });
    if (pawn) placed.push({ pawn: true, x: cast.length <= 1 ? 50 : 14 + mid * (72 / Math.max(1, cast.length)), feet: 88, pose: "stand" });
  }

  return (
    <View style={{ width, height: ROOM_ROWS * unit, overflow: "hidden" }}>
      <PaperCanvas
        cols={ROOM_COLS}
        rows={ROOM_ROWS}
        unit={unit}
        draw={(p) => {
          // wall + floor
          p.rect(0, 0, ROOM_COLS, WALL_H, CHURCH_WALL, { shadow: false, edge: false });
          p.rect(0, WALL_H - 6, ROOM_COLS, 6, "#7A5636", { shadow: false, edge: false });
          p.rect(0, WALL_H, ROOM_COLS, ROOM_ROWS - WALL_H, CHURCH_FLOOR, { shadow: false, edge: false });
          for (let y = WALL_H + 7; y < ROOM_ROWS; y += 7) p.line(0, y, ROOM_COLS, y, "#9C6533", 0.5);
          // stained glass — the center window joins at L2, the third at L3
          drawStainedGlass(p, 50, 5, 15, 27, 0);
          if (level >= 2) drawStainedGlass(p, 16, 8, 11, 21, 2);
          if (level >= 3) drawStainedGlass(p, 84, 8, 11, 21, 4);
          // banners at L2+
          if (level >= 2) {
            p.poly(`28,4 34,4 34,15 31,13.4 28,15`, "#7C2D3E");
            p.poly(`66,4 72,4 72,15 69,13.4 66,15`, "#2E7D74");
          }
          // chandelier at L3 — a ring of candle glow
          if (level >= 3) {
            p.line(50, 0, 50, 4, CHURCH_WALL_DARK, 0.6);
            p.ellipse(50, 6.4, 7, 1.6, "#C9963C");
            for (let cI = 0; cI < 5; cI++) {
              const cxp = 44.5 + cI * 2.75;
              p.ellipse(cxp, 4.9, 0.55, 0.95, "#FFB84D", { shadow: false });
            }
            p.glow(50, 6, 11, "#FF9A3D", 0.35);
          }
          // the altar: cloth, cross, candles climbing with level
          p.rect(33, WALL_H - 13, 34, 13, "#7A5230");
          p.rect(31.6, WALL_H - 14.6, 36.8, 2, "#FDFBF6");
          p.rect(33.8, WALL_H - 12.6, 32.4, 6.4, "#F7EBD4", { shadow: false });
          p.rect(49.2, WALL_H - 24.5, 1.6, 9.5, "#C9963C", { shadow: false });
          p.rect(46.9, WALL_H - 21.4, 6.2, 1.5, "#C9963C", { shadow: false });
          for (let sIdx = 0; sIdx < candles; sIdx++) {
            for (const sideSign of [-1, 1]) {
              const cxp = 50 + sideSign * (11 + sIdx * 3.4);
              p.rect(cxp - 0.7, WALL_H - 18.4, 1.4, 3.8, "#F7EBD4", { shadow: false, r: 0.4 });
              p.ellipse(cxp, WALL_H - 19.4, 0.55, 0.9, "#FFB84D", { shadow: false });
            }
          }
          p.glow(50, WALL_H - 16, 15, "#FF9A3D", night ? 0.4 : 0.22);
          // pew backs — two blocks, a center aisle
          for (const rowY of [60, 76]) {
            for (const blockX of [6, 58]) {
              p.rect(blockX, rowY, 36, 2.4, "#7A5230", { r: 0.9 });
              p.rect(blockX, rowY + 4.6, 36, 1.7, "#8A5A2B", { shadow: false, r: 0.8 });
              p.rect(blockX + 1, rowY, 1.3, 6.3, "#5E3D22", { shadow: false });
              p.rect(blockX + 33.7, rowY, 1.3, 6.3, "#5E3D22", { shadow: false });
            }
          }
          if (mode === "study") {
            for (const tx of [29, 71]) {
              p.circle(tx, 74, 9.5, "#7A5230");
              p.circle(tx, 74, 7.9, "#8A5A2B", { shadow: false });
              p.poly(`${tx - 3.2},71.4 ${tx},70.4 ${tx},74.8 ${tx - 3.2},75.8`, "#FDFBF6", { shadow: false });
              p.poly(`${tx + 3.2},71.4 ${tx},70.4 ${tx},74.8 ${tx + 3.2},75.8`, "#F7EBD4", { shadow: false });
            }
            p.rect(44, 52, 12, 1.8, "#B45309", { r: 0.9, opacity: 0.85 });
          }
          if (mode === "serve") {
            for (let cIdx = 0; cIdx < 3; cIdx++) {
              const bx = 8 + cIdx * 5.4;
              p.rect(bx, 84, 4.8, 4.8, "#A9713F");
              p.line(bx, 86.4, bx + 4.8, 86.4, "#7A5230", 0.45);
              p.rect(84 - cIdx * 5.4, 84, 4.8, 4.8, "#B98A54", { shadow: false });
            }
          }
          if (night) p.glow(50, 14, 30, "#FF9A3D", 0.13);
        }}
      />
      {placed.map((pl, i) => {
        if (pl.pawn) {
          if (!pawn) return null;
          if (pl.pose === "kneel") {
            // the hero kneels: draw him at kneel height with the
            // standing figure scaled into a bowed stance is wrong —
            // the hero kneels via the kit figure at reduced height is
            // also wrong; he stands at the altar rail instead is NOT
            // what prayer mode means. Use the kneel silhouette in his
            // colors through a villager-shaped proxy is wrong too.
            // Honest read: hero kneels with the cast using PaperHeroFigure
            // at the rail is replaced below by a real kneel in his look.
            return (
              <View key="pawn-kneel" style={{ position: "absolute", left: pl.x * unit - 5.5 * unit, top: (pl.feet - 10.6) * unit, alignItems: "center" }}>
                <PaperHeroKneel pawn={pawn} unit={unit} />
                <Text style={{ fontSize: Math.max(8, unit * 2.6), color: labelColor, marginTop: unit * 0.4, fontWeight: "700" }}>{pawn.name}</Text>
              </View>
            );
          }
          return (
            <View key="pawn" style={{ position: "absolute", left: pl.x * unit - (PAPER_HERO_UNITS_W * unit) / 2, top: (pl.feet - PAPER_HERO_UNITS_H) * unit, alignItems: "center" }}>
              <PaperHeroFigure pawn={pawn} unit={unit} />
              <Text style={{ fontSize: Math.max(8, unit * 2.6), color: labelColor, marginTop: unit * 0.4, fontWeight: "700" }}>{pawn.name}</Text>
            </View>
          );
        }
        if (!pl.entry) return null;
        const h = poseHeight(pl.pose);
        const wUnits = pl.pose === "seated" ? 12 : pl.pose === "stand" || pl.pose === "sing" || pl.pose === "work" ? 12.5 : 10;
        return (
          <View key={`church-cast-${pl.entry.person.id}-${i}`} style={{ position: "absolute", left: pl.x * unit - (wUnits * unit) / 2, top: (pl.feet - h) * unit }}>
            <CastFigure entry={pl.entry} unit={unit} labelColor={labelColor} delay={i * 200} />
          </View>
        );
      })}
    </View>
  );
}

/** The hero kneeling — his own hair, beard and clothes, folded into
 *  the kneel pose (the kit ships the pose for villagers; the hero's
 *  appearance rules are his own, from lib/pawn via PaperHeroFigure's
 *  vocabulary, redrawn here at kneel proportions). */
export function PaperHeroKneel({ pawn, unit }: { pawn: CustomPawn; unit: number }) {
  const skin = "#EFC39A";
  const hair = pawn.hairColor || "#6B4423";
  const W = 11, H = 11.4;
  return (
    <Svg width={W * unit} height={H * unit} viewBox={`0 0 ${W} ${H}`}>
      <Ellipse cx={5.5} cy={10.9} rx={4.2} ry={0.55} fill="rgba(24,8,44,0.28)" />
      <Rect x={2.4} y={9.9} width={6.2} height={1.2} rx={0.6} fill="#3E4A5C" />
      <Rect x={3.2} y={8.7} width={4.4} height={1.4} rx={0.65} fill="#3E4A5C" />
      <Rect x={3.1} y={4.6} width={4.9} height={4.8} rx={1.6} fill={pawn.bodyColor} transform="rotate(7 5.5 7)" />
      <Rect x={4.3} y={6.8} width={1.2} height={3.2} rx={0.6} fill={pawn.bodyColor} transform="rotate(-16 4.9 8.4)" />
      <Rect x={5.9} y={6.8} width={1.2} height={3.2} rx={0.6} fill={pawn.bodyColor} transform="rotate(16 6.5 8.4)" />
      <Circle cx={5.2} cy={10} r={0.66} fill={skin} />
      <Circle cx={6.4} cy={10} r={0.66} fill={skin} />
      {/* head bowed: hair mass + cap in his style, face low */}
      {pawn.hairStyle !== "bald" && <Circle cx={5.8} cy={2.9} r={2.85} fill={hair} />}
      <Circle cx={5.8} cy={3.45} r={2.5} fill={skin} />
      {pawn.hairStyle !== "bald" && pawn.hairStyle !== "mohawk" && (
        <Path d="M 3.32 3.3 A 2.55 2.55 0 0 1 8.28 3.3 L 7.8 3.26 A 2.02 2.02 0 0 0 3.8 3.26 Z" fill={hair} stroke="rgba(42,26,51,0.25)" strokeWidth={0.24} />
      )}
      {pawn.hairStyle === "bald" && <Ellipse cx={5.2} cy={1.75} rx={1} ry={0.44} fill="#FFFFFF" opacity={0.38} transform="rotate(-18 5.2 1.75)" />}
      {pawn.hairStyle === "bun" && <Circle cx={5.2} cy={0.75} r={0.92} fill={hair} />}
      {pawn.hairStyle === "mohawk" && <Rect x={5.1} y={0.1} width={1.4} height={3.4} rx={0.65} fill={hair} />}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* Hero poses (Rider H2) — the hero DOING his house's life, in his     */
/* own look: his hair style/color and his beard at its live grown      */
/* length (beardGrowthFor + beardShapeFor from lib/pawn, the same      */
/* vocabulary PaperHeroFigure speaks). Seated, lying, in the shower,   */
/* soaking in the tub — a static standing hero in his own home is a    */
/* fail, and so is a scene naming an activity the picture doesn't      */
/* show.                                                               */
/* ------------------------------------------------------------------ */

const HERO_SKIN = "#EFC39A";

function HeroHeadShapes({
  pawn,
  cx,
  cy,
  r,
  closedEyes = false,
}: {
  pawn: CustomPawn;
  cx: number;
  cy: number;
  r: number;
  closedEyes?: boolean;
}) {
  const hair = pawn.hairColor || "#6B4423";
  const bald = pawn.hairStyle === "bald";
  const beardLength = pawn.gender === "male" ? beardGrowthFor(pawn) : 0;
  const beard = beardShapeFor(pawn.beardStyle, beardLength);
  const beardColor = pawn.beardStyle === "heavenly" ? "#E8E4DA" : hair;
  return (
    <>
      {pawn.hairStyle === "long" && (
        <>
          <Rect x={cx - r - 0.5} y={cy - r * 0.3} width={r * 0.55} height={r * 2.2} rx={r * 0.27} fill={hair} />
          <Rect x={cx + r - r * 0.28} y={cy - r * 0.3} width={r * 0.55} height={r * 2.2} rx={r * 0.27} fill={hair} />
        </>
      )}
      {!bald && <Circle cx={cx} cy={cy - r * 0.16} r={r * 1.08} fill={hair} />}
      <Circle cx={cx} cy={cy} r={r} fill={HERO_SKIN} />
      {!bald && pawn.hairStyle !== "mohawk" && (
        <Path
          d={`M ${cx - r * 0.98} ${cy - r * 0.12} A ${r * 1.02} ${r * 1.02} 0 0 1 ${cx + r * 0.98} ${cy - r * 0.12} L ${cx + r * 0.78} ${cy - r * 0.2} A ${r * 0.8} ${r * 0.8} 0 0 0 ${cx - r * 0.78} ${cy - r * 0.2} Z`}
          fill={hair}
          stroke="rgba(42,26,51,0.25)"
          strokeWidth={0.2}
        />
      )}
      {pawn.hairStyle === "bun" && <Circle cx={cx - r * 0.25} cy={cy - r * 1.3} r={r * 0.38} fill={hair} />}
      {pawn.hairStyle === "mohawk" && <Rect x={cx - r * 0.22} y={cy - r * 1.5} width={r * 0.44} height={r * 1.4} rx={r * 0.2} fill={hair} />}
      {bald && <Ellipse cx={cx - r * 0.22} cy={cy - r * 0.62} rx={r * 0.4} ry={r * 0.18} fill="#FFFFFF" opacity={0.38} transform={`rotate(-18 ${cx - r * 0.22} ${cy - r * 0.62})`} />}
      {closedEyes ? (
        <>
          <Path d={`M ${cx - r * 0.42} ${cy + r * 0.05} Q ${cx - r * 0.26} ${cy + r * 0.2} ${cx - r * 0.1} ${cy + r * 0.05}`} stroke={PAPER_INK} strokeWidth={0.22} fill="none" strokeLinecap="round" />
          <Path d={`M ${cx + r * 0.1} ${cy + r * 0.05} Q ${cx + r * 0.26} ${cy + r * 0.2} ${cx + r * 0.42} ${cy + r * 0.05}`} stroke={PAPER_INK} strokeWidth={0.22} fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <Circle cx={cx - r * 0.28} cy={cy + r * 0.06} r={r * 0.1} fill={PAPER_INK} />
          <Circle cx={cx + r * 0.28} cy={cy + r * 0.06} r={r * 0.1} fill={PAPER_INK} />
        </>
      )}
      {beard.visible && beard.family === "full" && (
        <Ellipse cx={cx} cy={cy + r * 0.74} rx={r * 0.66} ry={r * (0.24 + beard.chinDropFrac * 0.55)} fill={beardColor} opacity={beard.opacity} />
      )}
      {beard.visible && beard.family === "goatee" && (
        <Rect x={cx - r * 0.22} y={cy + r * 0.58} width={r * 0.44} height={r * (0.24 + beard.chinDropFrac * 0.5)} rx={r * 0.2} fill={beardColor} opacity={beard.opacity} />
      )}
      {beard.visible && beard.mustacheWidthFrac > 0 && (
        <Rect x={cx - r * 0.36} y={cy + r * 0.4} width={r * 0.72} height={r * 0.15} rx={r * 0.07} fill={beardColor} opacity={beard.opacity} />
      )}
    </>
  );
}

/** Seated — on the sofa, at the kitchen table, at the study desk.
 *  Thigh + shin folded under him, torso upright, one arm resting
 *  forward toward whatever is in front of him. */
export function PaperHeroSeatedFigure({ pawn, unit }: { pawn: CustomPawn; unit: number }) {
  const W = 11, H = 12.6;
  return (
    <Svg width={W * unit} height={H * unit} viewBox={`0 0 ${W} ${H}`}>
      <Ellipse cx={5.5} cy={12.1} rx={4.2} ry={0.55} fill="rgba(24,8,44,0.28)" />
      {/* seated legs: thigh forward, shin down, shoe */}
      <Rect x={4.6} y={9.6} width={5.4} height={1.8} rx={0.9} fill="#3E4A5C" />
      <Rect x={8.6} y={10.6} width={1.5} height={1.6} rx={0.6} fill="#3E4A5C" />
      <Ellipse cx={10.2} cy={12.2} rx={1.3} ry={0.5} fill="#3A2A1C" />
      <Rect x={3.4} y={9.9} width={2.2} height={1.7} rx={0.8} fill="#3E4A5C" />
      {/* torso + arm resting forward */}
      <Rect x={3} y={4.9} width={4.9} height={5.2} rx={1.6} fill={pawn.bodyColor} />
      <Rect x={6.4} y={6.6} width={3.4} height={1.6} rx={0.8} fill={pawn.bodyColor} transform="rotate(14 8 7.4)" />
      <Circle cx={9.7} cy={8.3} r={0.72} fill={HERO_SKIN} />
      <Rect x={4.7} y={4.1} width={1.5} height={1.1} fill={HERO_SKIN} />
      <HeroHeadShapes pawn={pawn} cx={5.5} cy={2.7} r={2.35} />
    </Svg>
  );
}

/** Lying in bed — horizontal, head on the pillow, the blanket drawn
 *  over his body. The bed furniture draws its own frame around him;
 *  this figure is the sleeper himself, eyes closed. */
export function PaperHeroLyingFigure({
  pawn,
  unit,
  blanket = "#8A6BA8",
}: {
  pawn: CustomPawn;
  unit: number;
  blanket?: string;
}) {
  const W = 17, H = 7.6;
  return (
    <Svg width={W * unit} height={H * unit} viewBox={`0 0 ${W} ${H}`}>
      <Ellipse cx={8.5} cy={7.1} rx={7.6} ry={0.5} fill="rgba(24,8,44,0.22)" />
      {/* the pillow under his head */}
      <Rect x={0.5} y={3.3} width={4.9} height={2.7} rx={1.1} fill="#FFFFFF" />
      <Rect x={0.5} y={3.3} width={4.9} height={2.7} rx={1.1} fill="none" stroke="rgba(42,26,51,0.12)" strokeWidth={0.25} />
      {/* body stretched out in his clothes, blanket over the top */}
      <Rect x={4.4} y={3.5} width={12.1} height={3.1} rx={1.5} fill={pawn.bodyColor} />
      <Rect x={7.3} y={3.8} width={9.2} height={3} rx={1.3} fill={blanket} />
      <Rect x={7.3} y={3.8} width={1.1} height={3} fill="#FFFFFF" opacity={0.35} />
      {/* feet peeking past the blanket's end */}
      <Ellipse cx={16.3} cy={6.4} rx={0.85} ry={0.5} fill="#3A2A1C" />
      {/* head resting on the pillow, eyes closed */}
      <HeroHeadShapes pawn={pawn} cx={3.1} cy={3} r={2.15} closedEyes />
    </Svg>
  );
}

/** In the shower — standing in the stall with the water running over
 *  him: streaks from above his head to his feet, droplets at his
 *  shoulders, a drift of steam at the side. */
export function PaperHeroShowerFigure({ pawn, unit }: { pawn: CustomPawn; unit: number }) {
  const W = 10, H = 15;
  return (
    <Svg width={W * unit} height={H * unit} viewBox={`0 0 ${W} ${H}`}>
      <Ellipse cx={5} cy={14.5} rx={3.9} ry={0.5} fill="rgba(24,8,44,0.22)" />
      {/* legs + torso in his clothes, soaked through */}
      <Rect x={3.4} y={10} width={1.5} height={4.2} rx={0.6} fill="#3E4A5C" />
      <Rect x={5.2} y={10} width={1.5} height={4.2} rx={0.6} fill="#3E4A5C" />
      <Rect x={2.7} y={5.1} width={4.7} height={5.3} rx={1.5} fill={pawn.bodyColor} />
      <Rect x={1.5} y={5.5} width={1.3} height={4.2} rx={0.6} fill={pawn.bodyColor} />
      <Rect x={7.3} y={5.5} width={1.3} height={4.2} rx={0.6} fill={pawn.bodyColor} />
      <Rect x={4.3} y={4.3} width={1.4} height={1} fill={HERO_SKIN} />
      <HeroHeadShapes pawn={pawn} cx={5} cy={2.7} r={2.3} />
      {/* the water itself, running over him */}
      {[1.9, 3.1, 4.3, 5.6, 6.8, 8].map((x) => (
        <Path key={x} d={`M${x} 0.6 L${x} 13.6`} stroke="#7DD3FC" strokeWidth={0.5} strokeLinecap="round" opacity={0.75} />
      ))}
      {[2.5, 5, 7.5].map((x) => (
        <Path key={`w${x}`} d={`M${x} 3.4 L${x} 12.2`} stroke="#BAE6FD" strokeWidth={0.34} strokeLinecap="round" opacity={0.6} />
      ))}
      <Circle cx={2.6} cy={5.6} r={0.42} fill="#BAE6FD" />
      <Circle cx={7.5} cy={6.4} r={0.42} fill="#BAE6FD" />
      <Circle cx={5.1} cy={11.8} r={0.38} fill="#BAE6FD" />
      {/* steam drifting at the stall's edge */}
      <Ellipse cx={9.1} cy={4.6} rx={0.75} ry={1.6} fill="#FFFFFF" opacity={0.35} />
      <Ellipse cx={0.9} cy={6.4} rx={0.65} ry={1.3} fill="#FFFFFF" opacity={0.28} />
    </Svg>
  );
}

/** Soaking in the tub — body below the water line, head and shoulders
 *  above it, bubbles on the surface. Also his pool swim: the same
 *  head-and-shoulders read above the pool's water. */
export function PaperHeroTubFigure({ pawn, unit }: { pawn: CustomPawn; unit: number }) {
  const W = 11, H = 7.2;
  return (
    <Svg width={W * unit} height={H * unit} viewBox={`0 0 ${W} ${H}`}>
      {/* shoulders above the water */}
      <Rect x={2.7} y={4.2} width={5.6} height={2.6} rx={1.2} fill={pawn.bodyColor} />
      <Rect x={4.8} y={3.6} width={1.4} height={1} fill={HERO_SKIN} />
      <HeroHeadShapes pawn={pawn} cx={5.5} cy={2.55} r={2.25} />
      {/* the water line across him, with bubbles */}
      <Rect x={0.7} y={5.5} width={9.6} height={1.5} rx={0.75} fill="#8FC9CF" opacity={0.92} />
      <Path d="M0.9 5.6 q1.2 -0.7 2.4 0 q1.2 0.7 2.4 0 q1.2 -0.7 2.4 0 q1.2 0.7 2.2 0" stroke="#EAFBFA" strokeWidth={0.4} fill="none" />
      <Circle cx={2.2} cy={5.3} r={0.5} fill="#FFFFFF" opacity={0.85} />
      <Circle cx={8.6} cy={5.2} r={0.62} fill="#FFFFFF" opacity={0.85} />
      <Circle cx={9.6} cy={5.9} r={0.4} fill="#FFFFFF" opacity={0.7} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/* The theater — a dark paper room, a big screen whose picture keys    */
/* off the movie's genre, footlights, and an audience seen from        */
/* behind: rows of heads and shoulders in each person's own hair and   */
/* shirt colors, the hero among them.                                  */
/* ------------------------------------------------------------------ */

function drawGenreArt(p: PaperPainter, genre: PaperTheaterGenre) {
  // screen interior: x 12..88, y 8..38
  switch (genre) {
    case "horror": {
      p.rect(12, 8, 76, 30, "#1E2440", { shadow: false, edge: false });
      p.circle(76, 14.5, 4.6, "#EDEAF8", { shadow: false });
      // haunted house on its hill
      p.poly(`18,38 30,31 82,38`, "#141021", { shadow: false });
      p.rect(38, 24, 24, 12, "#0F0C1C", { shadow: false });
      p.poly(`36,24 50,16.5 64,24`, "#0F0C1C", { shadow: false });
      p.rect(47.5, 20.5, 5, 5.5, "#0F0C1C", { shadow: false });
      p.rect(41, 27.5, 3.4, 3.4, "#FFB84D", { shadow: false });
      p.rect(56, 27.5, 3.4, 3.4, "#FFB84D", { shadow: false });
      p.rect(48.4, 31, 3.2, 5, "#FFB84D", { shadow: false });
      // bats
      for (const [bx, by] of [[26, 13], [36, 10.5], [66, 20]] as const)
        p.path(`M${bx - 2.2} ${by} Q${bx - 1} ${by - 1.6} ${bx} ${by} Q${bx + 1} ${by - 1.6} ${bx + 2.2} ${by} Q${bx + 1} ${by + 0.7} ${bx} ${by} Q${bx - 1} ${by + 0.7} ${bx - 2.2} ${by} Z`, "#0F0C1C", { shadow: false });
      break;
    }
    case "comedy": {
      p.rect(12, 8, 76, 30, "#F7C873", { shadow: false, edge: false });
      p.circle(50, 15, 5.4, "#FFE9B8", { shadow: false });
      // the two masks
      for (const [mx, smile] of [[36, 1], [64, -1]] as const) {
        p.ellipse(mx, 27, 7.4, 8.6, "#FDFBF6", { shadow: false });
        p.circle(mx - 2.6, 24.6, 0.85, PAPER_INK, { shadow: false });
        p.circle(mx + 2.6, 24.6, 0.85, PAPER_INK, { shadow: false });
        p.stroke(`M${mx - 3.2} ${29.6 + (smile < 0 ? 1.6 : 0)} Q${mx} ${29.6 + smile * 3.4} ${mx + 3.2} ${29.6 + (smile < 0 ? 1.6 : 0)}`, PAPER_INK, 0.7);
      }
      break;
    }
    case "action": {
      p.rect(12, 8, 76, 30, "#7A8BA8", { shadow: false, edge: false });
      for (let b = 0; b < 7; b++) {
        const bx = 14 + b * 10.6;
        const bh = 12 + ((paperHash("action" + b) >> 3) % 12);
        p.rect(bx, 38 - bh, 8.6, bh, "#2E3A4E", { shadow: false });
        for (let wI = 0; wI < 3; wI++) p.rect(bx + 1.4 + (wI % 2) * 3.4, 38 - bh + 2 + wI * 3.4, 1.7, 1.7, "#FFD66B", { shadow: false });
      }
      // the burst
      p.poly(`50,10 52.4,16 58.6,14.6 54.8,19.4 60,22.4 53.6,23.4 54.6,29.6 50,25.6 45.4,29.6 46.4,23.4 40,22.4 45.2,19.4 41.4,14.6 47.6,16`, "#F97316", { shadow: false });
      p.circle(50, 19.8, 2.6, "#FDE68A", { shadow: false });
      break;
    }
    case "romance": {
      p.rect(12, 8, 76, 30, "#8A3B5E", { shadow: false, edge: false });
      p.circle(24, 14, 3.6, "#F7D8E8", { shadow: false });
      const heart = (cx: number, cy: number, s: number, fill: string) =>
        p.path(`M${cx} ${cy + s * 1.5} C${cx - s * 1.7} ${cy - s * 0.1} ${cx - s * 0.75} ${cy - s * 1.5} ${cx} ${cy - s * 0.45} C${cx + s * 0.75} ${cy - s * 1.5} ${cx + s * 1.7} ${cy - s * 0.1} ${cx} ${cy + s * 1.5} Z`, fill, { shadow: false });
      heart(50, 21, 4.6, "#F472B6");
      heart(33, 27, 2.4, "#F9A8D4");
      heart(67, 27.5, 2.8, "#E04E8A");
      heart(73, 15, 1.7, "#F9A8D4");
      break;
    }
    case "christmas": {
      p.rect(12, 8, 76, 30, "#274436", { shadow: false, edge: false });
      p.poly(`50,11 57,21 43,21`, "#2E7D4F", { shadow: false });
      p.poly(`50,16.5 59,27.5 41,27.5`, "#35925E", { shadow: false });
      p.poly(`50,22.5 61,34.5 39,34.5`, "#2E7D4F", { shadow: false });
      p.rect(48.3, 34.5, 3.4, 3, "#7A5230", { shadow: false });
      for (const [ox, oy, oc] of [[46, 20, "#EF4444"], [54, 24, "#E9C767"], [48, 29, "#4A6FA5"], [53, 31, "#EF4444"], [50, 25.5, "#F9A8D4"]] as const)
        p.circle(ox, oy, 1.05, oc, { shadow: false });
      p.poly(`50,8.6 51,10.2 52.7,10.3 51.4,11.3 51.8,13 50,12.2 48.2,13 48.6,11.3 47.3,10.3 49,10.2`, "#FDE68A", { shadow: false });
      for (let s = 0; s < 12; s++)
        p.circle(15 + ((paperHash("snow" + s) >> 3) % 70), 10 + ((paperHash("snowy" + s) >> 4) % 25), 0.55, "#FFFFFF", { shadow: false, opacity: 0.85 });
      break;
    }
    case "western": {
      p.rect(12, 8, 76, 30, "#E8A34F", { shadow: false, edge: false });
      p.circle(27, 15.5, 4.8, "#FDE68A", { shadow: false });
      p.rect(58, 22, 26, 16, "#B4593B", { shadow: false });
      p.rect(64, 17, 15, 21, "#C4653F", { shadow: false });
      p.rect(12, 33, 76, 5, "#C9754A", { shadow: false });
      // cactus
      p.rect(36.8, 24, 2.6, 11, "#3E7D4E", { shadow: false, r: 1.2 });
      p.rect(33.4, 27, 1.9, 5.4, "#3E7D4E", { shadow: false, r: 0.9 });
      p.rect(40.9, 26, 1.9, 6.4, "#3E7D4E", { shadow: false, r: 0.9 });
      p.rect(33.4, 26.2, 4, 1.7, "#3E7D4E", { shadow: false });
      p.rect(38.4, 25.2, 4.4, 1.7, "#3E7D4E", { shadow: false });
      break;
    }
    case "scifi": {
      p.rect(12, 8, 76, 30, "#141433", { shadow: false, edge: false });
      for (let s = 0; s < 16; s++)
        p.circle(14 + ((paperHash("sf" + s) >> 3) % 72), 10 + ((paperHash("sfy" + s) >> 4) % 24), s % 4 === 0 ? 0.6 : 0.34, "#EDEAF8", { shadow: false });
      p.circle(30, 27, 7.6, "#7B5EA7", { shadow: false });
      p.ellipse(30, 27, 12.4, 2.7, "#C9A8E0", { shadow: false, opacity: 0.8 });
      p.circle(27, 24.4, 1.7, "#5E4782", { shadow: false });
      // the rocket
      p.path(`M66 12 q3.4 3.8 3.4 8.2 q0 2.4 -1.2 4.2 h-4.4 q-1.2 -1.8 -1.2 -4.2 q0 -4.4 3.4 -8.2 Z`, "#E8E4DA", { shadow: false });
      p.circle(66, 17.6, 1.5, "#4A6FA5", { shadow: false });
      p.poly(`62.6,22 60.6,26 62.6,25.2`, "#EF4444", { shadow: false });
      p.poly(`69.4,22 71.4,26 69.4,25.2`, "#EF4444", { shadow: false });
      p.poly(`66,28.6 64.6,24.8 67.4,24.8`, "#F97316", { shadow: false });
      break;
    }
    case "musical": {
      p.rect(12, 8, 76, 30, "#3A2440", { shadow: false, edge: false });
      for (let l = 0; l < 5; l++) p.line(16, 14 + l * 3.4, 84, 14 + l * 3.4, "#8A6BA8", 0.4);
      const noteAt = (x: number, y: number, c: string) => {
        p.ellipse(x, y, 1.9, 1.35, c, { shadow: false });
        p.line(x + 1.7, y - 0.4, x + 1.7, y - 6.4, c, 0.6);
      };
      noteAt(30, 24, "#FDE68A");
      noteAt(44, 20.5, "#F9A8D4");
      noteAt(58, 25.5, "#7FD4C9");
      noteAt(71, 19, "#FDE68A");
      p.poly(`12,8 30,8 20,38 12,38`, "#FFE9B8", { shadow: false, opacity: 0.14 });
      p.poly(`88,8 70,8 80,38 88,38`, "#FFE9B8", { shadow: false, opacity: 0.14 });
      break;
    }
    case "kids": {
      p.rect(12, 8, 76, 30, "#8FD0E8", { shadow: false, edge: false });
      const bands = ["#EF4444", "#F97316", "#E9C767", "#4E9B47", "#4A6FA5"];
      bands.forEach((c, i) => p.stroke(`M${20 + i * 2.2} 30 A ${30 - i * 2.2} ${20 - i * 1.6} 0 0 1 ${80 - i * 2.2} 30`, c, 1.7));
      p.circle(24, 13.5, 3.6, "#FDE68A", { shadow: false });
      for (const [bx, by, bc] of [[66, 14, "#F472B6"], [74, 19, "#7B5EA7"], [59, 18.5, "#EF4444"]] as const) {
        p.circle(bx, by, 2.7, bc, { shadow: false });
        p.line(bx, by + 2.7, bx - 1, 30, "#5E4630", 0.35);
      }
      p.ellipse(40, 34.5, 9, 1.8, "#7FB069", { shadow: false });
      break;
    }
    case "drama": {
      p.rect(12, 8, 76, 30, "#4A3B30", { shadow: false, edge: false });
      for (const cxp of [26, 42, 58, 74]) {
        p.rect(cxp - 2.6, 13, 5.2, 19, "#E8DFC8", { shadow: false });
        p.rect(cxp - 3.4, 11, 6.8, 2, "#C9B98F", { shadow: false });
        p.rect(cxp - 3.4, 32, 6.8, 2, "#C9B98F", { shadow: false });
      }
      p.rect(12, 34, 76, 4, "#33281F", { shadow: false });
      break;
    }
    default: {
      p.rect(12, 8, 76, 30, "#5C1F24", { shadow: false, edge: false });
      for (let f = 0; f < 6; f++) p.line(20 + f * 12, 8, 20 + f * 12, 38, "#4A181D", 2.2);
      p.poly(`50,14 51.9,19.4 57.6,19.6 53.1,23 54.7,28.5 50,25.4 45.3,28.5 46.9,23 42.4,19.6 48.1,19.4`, "#FDE68A", { shadow: false });
      p.glow(50, 21, 12, "#FFC46B", 0.35);
      break;
    }
  }
}

export function PaperTheaterScene({
  level,
  genre,
  audience = [],
  pawn = null,
  width = 360,
}: {
  level: number;
  genre: PaperTheaterGenre;
  audience?: PrayedPerson[];
  pawn?: CustomPawn | null;
  width?: number;
}) {
  const unit = width / ROOM_COLS;
  // Seat the audience: three rows of six; the hero sits mid-row two.
  type Seat = { person?: PrayedPerson; hero?: boolean; row: number; col: number };
  const seats: Seat[] = [];
  const perRow = 6;
  audience.slice(0, 17).forEach((person, i) => {
    seats.push({ person, row: Math.floor(i / perRow), col: i % perRow });
  });
  if (pawn) seats.push({ hero: true, row: 1, col: 2 + (audience.length % 2) });
  const seatPos = (row: number, col: number) => ({ x: 14 + col * 14.4, y: 56 + row * 13.5 });

  return (
    <View style={{ width, height: ROOM_ROWS * unit, overflow: "hidden", backgroundColor: "#141021" }}>
      <PaperCanvas
        cols={ROOM_COLS}
        rows={ROOM_ROWS}
        unit={unit}
        draw={(p) => {
          p.rect(0, 0, ROOM_COLS, ROOM_ROWS, "#1B1530", { shadow: false, edge: false });
          // proscenium + curtains
          p.rect(6, 3, 88, 40, "#C9963C", { r: 1.6 });
          p.rect(8, 5, 84, 36, "#0F0C1C", { shadow: false });
          drawGenreArt(p, genre);
          p.poly(`6,3 17,3 12.5,43 6,43`, "#7C2D3E");
          p.poly(`94,3 83,3 87.5,43 94,43`, "#7C2D3E");
          p.rect(6, 3, 88, 2.2, "#7C2D3E", { shadow: false });
          // footlights — more of them as the room grandens
          const lights = 3 + level * 2;
          for (let i = 0; i < lights; i++) {
            const fx = 12 + i * (76 / (lights - 1));
            p.circle(fx, 45.4, 0.95, "#FFD66B", { shadow: false });
            p.glow(fx, 44.6, 3.4, "#FFC46B", 0.4);
          }
          // seat rows (backs), three rows, grander trim at L3
          for (let r = 0; r < 3; r++) {
            const y = 58 + r * 13.5;
            for (let cI = 0; cI < perRow; cI++) {
              const { x } = seatPos(r, cI);
              p.rect(x - 5.6, y, 11.2, 6.4, "#5C2430", { r: 1.6 });
              if (level >= 3) p.rect(x - 5.6, y, 11.2, 1.1, "#C9963C", { shadow: false, r: 0.5 });
            }
          }
          // the audience, from behind: hair + shoulders in their own colors
          for (const s of seats) {
            const { x, y } = seatPos(s.row, s.col);
            const look = s.person ? paperDinerLookFor(s.person) : null;
            const hair = s.hero ? pawn?.hairColor || "#6B4423" : look?.hair ?? "#3A2A1C";
            const bald = s.hero ? pawn?.hairStyle === "bald" : look?.hairStyle === "bald";
            const shirt = s.hero ? pawn?.bodyColor || "#4A6FA5" : look?.shirt ?? "#4A6FA5";
            const skin = look?.skin ?? "#EFC39A";
            p.rect(x - 4.6, y - 1.5, 9.2, 4.6, shirt, { r: 1.6 });
            p.circle(x, y - 3.1, 3.15, bald ? skin : hair, { shadow: false });
            if (bald) p.ellipse(x - 0.8, y - 4.6, 1.1, 0.5, "#FFFFFF", { shadow: false, opacity: 0.35 });
            if (!bald && look?.hairStyle === "long") {
              p.rect(x - 3.6, y - 3.4, 1.5, 4.6, hair, { shadow: false });
              p.rect(x + 2.1, y - 3.4, 1.5, 4.6, hair, { shadow: false });
            }
          }
          // aisle runner
          p.rect(47.6, 52, 4.8, 42, "#7C2D3E", { shadow: false, opacity: 0.5 });
        }}
      />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* The hospital — paper wards: beds climbing with level, the exam      */
/* table at the center, a vitals wall, and the hero's checkup cast.    */
/* ------------------------------------------------------------------ */

const HOSPITAL_CFG: PaperRoomConfig = {
  id: "hospital",
  wall: "#CFE3DE",
  wallDark: "#9FBDB4",
  wallPanel: "#E4F0EC",
  floor: "#D8DEDC",
  floorAlt: "#C6CFCC",
  floorKind: "tile",
  accent: "#0E7C86",
  pale: "#FFFFFF",
  signature: "beds",
  overhead: "pendants",
  rug: "",
  cloths: ["#BFE3DE", "#F2C4CE", "#FDE9C8", "#D5E8D4"],
};

export function PaperHospitalScene({
  level,
  cast = [],
  pawn = null,
  width = 360,
  labelColor = "#1E3A40",
}: {
  level: number;
  cast?: PaperCastEntry[];
  pawn?: CustomPawn | null;
  width?: number;
  labelColor?: string;
}) {
  const unit = width / ROOM_COLS;
  const dressing = paperRoomDressingFor(level);
  const doctor = cast[0];
  const patients = cast.slice(1);
  // bed spots follow the signature row's own layout math
  const bedCount = dressing.signatureCount;
  const span = 88;
  const wBed = Math.min(24, span / bedCount - 3);
  const total = bedCount * wBed + (bedCount - 1) * ((span - bedCount * wBed) / Math.max(1, bedCount - 1));
  const bedX = (i: number) => 50 - total / 2 + i * (wBed + (span - bedCount * wBed) / Math.max(1, bedCount - 1)) + wBed / 2;

  return (
    <View style={{ width, height: ROOM_ROWS * unit, overflow: "hidden" }}>
      <PaperCanvas
        cols={ROOM_COLS}
        rows={ROOM_ROWS}
        unit={unit}
        draw={(p) => {
          drawWall(p, HOSPITAL_CFG, 2, false);
          drawFloor(p, HOSPITAL_CFG);
          // the cross sign over the ward
          p.circle(50, 12, 5.4, "#FFFFFF");
          p.rect(48.9, 8.9, 2.2, 6.2, "#EF4444", { shadow: false, r: 0.5 });
          p.rect(46.9, 10.9, 6.2, 2.2, "#EF4444", { shadow: false, r: 0.5 });
          // vitals wall (L2+): a dark panel with a heartbeat trace
          if (level >= 2) {
            p.rect(79, 8, 15, 11, "#1E3A40", { r: 1 });
            p.stroke(`M80.5 13.5 h2.6 l1.2 -2.6 l1.8 5 l1.2 -2.4 h5.2`, "#4ADE80", 0.55);
            p.circle(92, 10.4, 0.8, "#EF4444", { shadow: false });
          }
          // a gilded frame at the state-of-the-art level
          if (level >= 3) p.rect(44.6, 6.6, 10.8, 10.8, "#C9963C", { shadow: false, opacity: 0.55 });
          drawSignatureRow(p, HOSPITAL_CFG, bedCount, dressing.richSignature);
          // the exam table at the room's heart
          p.rect(38, 66, 24, 2.2, "#9FBDB4");
          p.rect(39, 63.4, 22, 2.8, "#FFFFFF", { shadow: false, r: 1 });
          p.rect(40, 68.2, 1.8, 8, "#7A9A92", { shadow: false });
          p.rect(58.2, 68.2, 1.8, 8, "#7A9A92", { shadow: false });
          p.glow(50, 60, 12, "#FFFFFF", 0.25);
        }}
      />
      {/* patients sit up in their beds */}
      {patients.slice(0, bedCount).map((entry, i) => (
        <View key={`patient-${entry.person.id}`} style={{ position: "absolute", left: bedX(i) * unit - 6 * unit, top: (WALL_H - 15.5) * unit }}>
          <CastFigure entry={{ ...entry, pose: "seated", flip: i % 2 === 1 }} unit={unit} labelColor={labelColor} delay={i * 200} />
        </View>
      ))}
      {/* the doctor makes rounds at the exam table's left */}
      {doctor && (
        <View style={{ position: "absolute", left: 24 * unit, top: (FLOOR_FEET - 20) * unit, alignItems: "center" }}>
          <PaperDoctorFigure person={doctor.person} width={12.5 * unit} />
          <Text style={{ fontSize: Math.max(8, unit * 2.6), color: labelColor, marginTop: unit * 0.4, fontWeight: "600" }}>{doctor.person.name}</Text>
        </View>
      )}
      {pawn && (
        <View style={{ position: "absolute", left: 68 * unit, top: (FLOOR_FEET - PAPER_HERO_UNITS_H) * unit, alignItems: "center" }}>
          <PaperHeroFigure pawn={pawn} unit={unit} />
          <Text style={{ fontSize: Math.max(8, unit * 2.6), color: labelColor, marginTop: unit * 0.4, fontWeight: "700" }}>{pawn.name}</Text>
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* The backyard — grass, the pool, the grill: Grill Master's ground.   */
/* ------------------------------------------------------------------ */

export function PaperBackyardScene({
  level,
  cast = [],
  pawn = null,
  width = 360,
  labelColor = "#3E4A22",
}: {
  level: number;
  cast?: PaperCastEntry[];
  pawn?: CustomPawn | null;
  width?: number;
  labelColor?: string;
}) {
  const unit = width / ROOM_COLS;
  const swimmers = cast.filter((e) => (e.pose ?? "stand") === "swim");
  const loungers = cast.filter((e) => (e.pose ?? "stand") !== "swim");
  return (
    <View style={{ width, height: ROOM_ROWS * unit, overflow: "hidden" }}>
      <PaperCanvas
        cols={ROOM_COLS}
        rows={ROOM_ROWS}
        unit={unit}
        draw={(p) => {
          // sky band + fence + lawn
          p.rect(0, 0, ROOM_COLS, 16, "#BFE3F2", { shadow: false, edge: false });
          p.circle(88, 7, 4.4, "#FDE68A", { shadow: false });
          p.rect(0, 16, ROOM_COLS, 6, "#A9713F", { shadow: false });
          for (let x = 6; x < ROOM_COLS; x += 6) p.line(x, 16.6, x, 21.4, "#8A5A2B", 0.55);
          p.rect(0, 22, ROOM_COLS, ROOM_ROWS - 22, "#7FA653", { shadow: false, edge: false });
          for (let i = 0; i < 30; i++) {
            const x = ((paperHash("yard" + i) >> 3) % 96) + 2;
            const y = 26 + ((paperHash("yardy" + i) >> 5) % 62);
            p.stroke(`M${x} ${y} q0.6 -2.4 1.4 -3 M${x + 1.6} ${y} q0 -2.8 -0.8 -3.6`, "#6E9347", 0.5);
          }
          // flower beds along the fence — richer with level
          for (let i = 0; i < 4 + level; i++) {
            const x = 6 + i * (88 / (3 + level));
            p.circle(x, 24.6, 1.05, ["#F472B6", "#E9C767", "#C26D9C", "#F97316"][i % 4], { shadow: false });
            p.ellipse(x, 26.4, 1.7, 1.1, "#5E8C4A", { shadow: false });
          }
          // the pool
          p.rect(10, 52, 52, 34, "#5E9AA6", { r: 3 });
          p.rect(13, 55, 46, 28, "#8FC9CF", { shadow: false, r: 2.4 });
          for (let i = 0; i < 4; i++)
            p.stroke(`M${18 + i * 10} ${62 + (i % 2) * 7} q3 -1.8 6 0 q3 1.8 6 0`, "#EAFBFA", 0.55, 0.7);
          p.rect(10, 49.6, 52, 2.4, "#CBD5E1", { r: 1 });
          // the grill — kettle, lid by level, smoke curls
          p.ellipse(79, 66, 8.4, 6.2, "#2E2A26");
          p.ellipse(79, 61.4, 8.4, 2.6, "#3E3833", { shadow: false });
          p.line(73, 71, 70.4, 82, "#2E2A26", 0.9);
          p.line(85, 71, 87.6, 82, "#2E2A26", 0.9);
          p.line(79, 72.4, 79, 83, "#2E2A26", 0.9);
          if (level >= 2) p.ellipse(88.6, 60, 4.6, 3.6, "#57504A", { shadow: false, rot: { deg: -18, cx: 88.6, cy: 60 } });
          p.stroke(`M75 54 q-1.6 -3.4 0 -6.4 q1.4 -2.6 0 -5.4`, "#FFFFFF", 0.8, 0.55);
          p.stroke(`M81 53 q-1.6 -3.4 0 -6.4 q1.4 -2.6 0 -5.4`, "#FFFFFF", 0.8, 0.4);
          p.glow(79, 63, 8, "#F97316", 0.22);
          // a picnic table at L2+, string lights at L3
          if (level >= 2) {
            p.rect(68, 86, 24, 2, "#8A5A2B");
            p.rect(70, 88, 1.6, 5, "#54381E", { shadow: false });
            p.rect(88.4, 88, 1.6, 5, "#54381E", { shadow: false });
          }
          if (level >= 3) {
            p.stroke(`M4 30 Q50 40 96 30`, "#5E4630", 0.5);
            for (let i = 0; i < 7; i++) {
              const lx = 10 + i * 13.3;
              p.circle(lx, 32.4 + Math.sin((i / 6) * Math.PI) * 3.4, 1.05, "#FFD66B", { shadow: false });
            }
            p.glow(50, 34, 30, "#FFC46B", 0.14);
          }
        }}
      />
      {swimmers.map((entry, i) => (
        <View key={`yard-swim-${entry.person.id}`} style={{ position: "absolute", left: (24 + i * 16) * unit - 5 * unit, top: 60 * unit }}>
          <CastFigure entry={entry} unit={unit} labelColor={labelColor} delay={i * 220} />
        </View>
      ))}
      {loungers.map((entry, i) => (
        <View key={`yard-${entry.person.id}`} style={{ position: "absolute", left: (72 + (i % 2) * 10) * unit - 6 * unit, top: (88 - poseHeight(entry.pose ?? "stand")) * unit }}>
          <CastFigure entry={entry} unit={unit} labelColor={labelColor} delay={i * 200} />
        </View>
      ))}
      {pawn && (
        <View style={{ position: "absolute", left: 66 * unit, top: (88 - PAPER_HERO_UNITS_H) * unit, alignItems: "center" }}>
          <PaperHeroFigure pawn={pawn} unit={unit} />
          <Text style={{ fontSize: Math.max(8, unit * 2.6), color: labelColor, marginTop: unit * 0.4, fontWeight: "700" }}>{pawn.name}</Text>
        </View>
      )}
    </View>
  );
}
