// ---------- the banquet rooms, rebuilt as paper dioramas ----------
// Paper rollout batch 1: the Feast Hall and the Marriage Supper
// (banquet-table) share one long-table room — the drawn BanquetTable
// translated into the paper kit. One long table down the room's
// middle, diners seated along both sides (the screen's drawn slicing:
// even indices down the left, odd down the right), the hero at the
// head of the table as a paper figure in his own clothes, plates
// along the table for every pair of seats. The Feast Hall dresses
// with banners, a goblet shelf, candelabras and bouquets; the
// Marriage Supper stands under an open sky with a floral garland
// and starry string lights — no roof, exactly as the drawn room had.

import { useEffect, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import {
  PaperCanvas,
  PaperGlowDisc,
  PaperHeroFigure,
  PaperPulse,
  PaperSeatedDiner,
  PAPER_HERO_H,
  PAPER_HERO_W,
  type PaperPainter,
} from "@/components/paper-interior";
import { FigureName } from "@/components/activity-figures";
import { paintPaperPlate } from "@/components/paper-restaurant-room";
import { loadCustomPawn, type CustomPawn } from "@/lib/pawn";
import type { PrayedPerson } from "@/lib/hometown";
import { PAPER_ROOM_COLS, paperHash } from "@/lib/paper-interior";
import {
  BANQUET_SEAT_ROWS,
  BANQUET_WALL_ROWS,
  banquetRoomRows,
  banquetSeatPairs,
  paperRoomDressingFor,
  type PaperCuisineConfig,
} from "@/lib/paper-restaurant";

const TABLE_X = 31;
const TABLE_W = 38;
const SEAT_DX = 17.5; // seat center offset from the table's center line

/** A standing candelabra — BanquetDressing's L2 piece, in paper. */
function candelabra(p: PaperPainter, cx: number, baseY: number) {
  p.rect(cx - 0.45, baseY - 7.5, 0.9, 7.5, "#8A6A34", { shadow: false });
  p.rect(cx - 2.6, baseY - 0.7, 5.2, 0.7, "#8A6A34", { shadow: false });
  p.line(cx, baseY - 7.5, cx - 2.2, baseY - 9.3, "#8A6A34", 0.55);
  p.line(cx, baseY - 7.5, cx + 2.2, baseY - 9.3, "#8A6A34", 0.55);
  for (const [ox, oy] of [[0, -8.6], [-2.2, -10.2], [2.2, -10.2]] as const) {
    p.rect(cx + ox - 0.4, baseY + oy - 1.9, 0.8, 1.9, "#F5EFE0", { r: 0.3, shadow: false });
    p.ellipse(cx + ox, baseY + oy - 2.6, 0.45, 0.75, "#FFC46B", { shadow: false });
  }
  p.glow(cx, baseY - 10.4, 4.5, "#FFC46B", 0.4);
}

/** A paper bouquet — BanquetDressing's L3 piece. */
function bouquet(p: PaperPainter, cx: number, baseY: number) {
  p.poly(`${cx - 1.7},${baseY} ${cx + 1.7},${baseY} ${cx + 0.5},${baseY - 3.4} ${cx - 0.5},${baseY - 3.4}`, "#EFE3CC");
  for (const [ox, oy, col] of [
    [-1.3, -4.3, "#C0392B"],
    [0, -5.2, "#E86A92"],
    [1.3, -4.3, "#F2C14E"],
    [-0.6, -3.6, "#E86A92"],
    [0.7, -3.7, "#C0392B"],
  ] as const) {
    p.circle(cx + ox, baseY + oy, 0.95, col, { shadow: false });
    p.circle(cx + ox, baseY + oy, 0.4, "#FFF3D6", { shadow: false });
  }
  p.poly(`${cx - 2.2},${baseY - 2.6} ${cx - 0.4},${baseY - 3.2} ${cx - 1.8},${baseY - 4.4}`, "#4E8B4A", { shadow: false });
  p.poly(`${cx + 2.2},${baseY - 2.6} ${cx + 0.4},${baseY - 3.2} ${cx + 1.8},${baseY - 4.4}`, "#4E8B4A", { shadow: false });
}

export function PaperBanquetRoom({
  config,
  diners,
  tablesTier,
  level,
  lightsTier,
  artTier,
  gathering,
  halloween,
  isNight,
}: {
  config: PaperCuisineConfig;
  /** The raw diner list — this room slices it (evens left, odds right). */
  diners: PrayedPerson[];
  tablesTier: number;
  level: number;
  lightsTier: number;
  artTier: number;
  gathering: boolean;
  halloween: boolean;
  isNight: boolean;
}) {
  const windowWidth = useWindowDimensions().width;
  const [measured, setMeasured] = useState(0);
  const width = measured > 0 ? measured : Math.max(280, windowWidth - 32);
  const unit = width / PAPER_ROOM_COLS;
  const dressing = paperRoomDressingFor(config, level, lightsTier, artTier);
  const pairs = banquetSeatPairs(diners.length);
  const rows = banquetRoomRows(diners.length);
  const floorTop = BANQUET_WALL_ROWS + 2;
  const tableTop = floorTop + 1;
  const tableH = pairs * BANQUET_SEAT_ROWS + 4;
  const cloth = config.cloth[Math.min(tablesTier, 3)];

  const [pawn, setPawn] = useState<CustomPawn | null>(null);
  useEffect(() => {
    loadCustomPawn().then((p) => p && setPawn(p)).catch(() => undefined);
  }, []);

  const draw = (p: PaperPainter) => {
    /* ---- the back wall (or the open sky) ---- */
    if (config.outdoor) {
      p.rect(0, 0, PAPER_ROOM_COLS, BANQUET_WALL_ROWS, config.wall, { shadow: false, edge: false, r: 0 });
      p.rect(0, 0, PAPER_ROOM_COLS, BANQUET_WALL_ROWS, "rgba(16,20,44,0.35)", { shadow: false, edge: false, r: 0 });
      // stars across the night-blue paper
      for (let i = 0; i < 26; i++) {
        const h = paperHash(`bstar-${i}`);
        const sx = 2 + (h % 96);
        const sy = 1.5 + ((h >> 5) % 26);
        p.line(sx - 0.75, sy, sx + 0.75, sy, "#F5EFE0", 0.32);
        p.line(sx, sy - 0.75, sx, sy + 0.75, "#F5EFE0", 0.32);
      }
      // the moon, a pale paper disc
      p.circle(86, 8, 3.6, "#F0EDE0");
      p.circle(84.6, 7, 3.0, config.wall, { shadow: false, opacity: 0.55 });
    } else {
      p.rect(0, 0, PAPER_ROOM_COLS, BANQUET_WALL_ROWS, config.wall, { shadow: false, edge: false, r: 0 });
      for (let y = 7; y < BANQUET_WALL_ROWS; y += 4.5) p.line(0, y, PAPER_ROOM_COLS, y, config.wallPanel, 0.5);
      p.rect(0, 0, PAPER_ROOM_COLS, 2.6, config.wallDark, { shadow: false, edge: false, r: 0 });
      // the goblet shelf — the Feast Hall's signature: goblets by level
      if (config.signature === "goblet-shelf") {
        const goblets = Math.max(2, level * 2);
        p.rect(28, 15.5, 44, 1.1, "#6E4A26", { r: 0.5 });
        for (let i = 0; i < goblets; i++) {
          const gx = 31 + (i * 38) / Math.max(1, goblets - 1);
          p.path(`M ${gx - 1.3} ${11.2} L ${gx + 1.3} ${11.2} L ${gx + 0.8} ${14.2} L ${gx - 0.8} ${14.2} Z`, i % 2 ? "#C8A24A" : "#B9BDC6", {
            shadow: false,
          });
          p.rect(gx - 0.22, 14.2, 0.44, 1.3, i % 2 ? "#C8A24A" : "#B9BDC6", { shadow: false });
        }
        // twin candle stands flank the shelf
        for (const sx of [18, 82]) {
          p.rect(sx - 0.4, 8.5, 0.8, 7, "#8A6A34", { shadow: false });
          p.rect(sx - 0.4, 6.6, 0.8, 1.9, "#F5EFE0", { r: 0.3, shadow: false });
          p.ellipse(sx, 5.9, 0.45, 0.75, "#FFC46B", { shadow: false });
          p.glow(sx, 6.2, isNight ? 5 : 3, "#FFC46B", isNight ? 0.5 : 0.26);
        }
      }
    }

    /* ---- overhead: swagged banners in the hall, starry strings
       over the Supper ---- */
    if (config.overhead === "banners") {
      for (const [x0, x1] of [[4, 48], [52, 96]] as const) {
        p.line(x0, 3, (x0 + x1) / 2, 5.6, "#2A1A33", 0.35);
        p.line((x0 + x1) / 2, 5.6, x1, 3, "#2A1A33", 0.35);
      }
      const bannerCols = ["#7A2E2E", config.accent, "#4E5E3A"];
      [10, 22, 34, 56, 68, 80].forEach((bx, i) => {
        const by = 3.6 + Math.sin(((bx - 4) / 44) * Math.PI) * 2.2;
        p.poly(`${bx},${by} ${bx + 6.4},${by} ${bx + 6.4},${by + 7.6} ${bx + 3.2},${by + 5.9} ${bx},${by + 7.6}`, bannerCols[i % 3], {
          rot: { deg: i % 2 ? 1.5 : -1.5, cx: bx + 3.2, cy: by },
        });
        p.circle(bx + 3.2, by + 2.8, 1.15, "rgba(245,239,224,0.8)", { shadow: false });
      });
    } else if (config.overhead === "stars" && dressing.overheadCount > 0) {
      // starry string lights sagging over the table
      for (const [x0, x1] of [[6, 48], [52, 94]] as const) {
        p.line(x0, BANQUET_WALL_ROWS - 9, (x0 + x1) / 2, BANQUET_WALL_ROWS - 5.6, "#F5EFE0", 0.3);
        p.line((x0 + x1) / 2, BANQUET_WALL_ROWS - 5.6, x1, BANQUET_WALL_ROWS - 9, "#F5EFE0", 0.3);
        const n = Math.ceil(dressing.overheadCount / 2);
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0.5 : i / (n - 1);
          const bx = x0 + (x1 - x0) * t;
          const by = BANQUET_WALL_ROWS - 9 + Math.sin(t * Math.PI) * 3.4 + 1.2;
          p.circle(bx, by, 0.9, "#FFD97A", { shadow: false });
          p.circle(bx, by, 0.45, "#FFF6EA", { shadow: false });
        }
      }
    }

    /* ---- the ground ---- */
    p.rect(0, BANQUET_WALL_ROWS, PAPER_ROOM_COLS, 2, "rgba(20,8,32,0.3)", { shadow: false, edge: false, r: 0 });
    const floorBottom = rows - 10;
    p.rect(0, floorTop, PAPER_ROOM_COLS, floorBottom - floorTop, config.floor, { shadow: false, edge: false, r: 0 });
    if (config.floorKind === "grass") {
      for (let i = 0; i < 60; i++) {
        const h = paperHash(`bgrass-${i}`);
        const gx = 2 + (h % 96);
        const gy = floorTop + 2 + ((h >> 5) % Math.max(4, Math.floor(floorBottom - floorTop - 4)));
        p.line(gx, gy, gx - 0.5, gy - 1.3, "#4E7A44", 0.35);
        p.line(gx + 0.7, gy, gx + 1.1, gy - 1.2, "#4E7A44", 0.35);
      }
      // a stone path to the table's head
      for (let i = 0; i < 4; i++) {
        p.ellipse(50, floorBottom - 2 - i * 3.4, 3.4, 1.5, "#8B8E98", { shadow: false, opacity: 0.8 });
      }
    } else {
      for (let y = floorTop + 8; y < floorBottom; y += 8) p.line(0, y, PAPER_ROOM_COLS, y, "rgba(0,0,0,0.2)", 0.55);
      // the hall's rug runs under the long table at the grand level
      if (dressing.rug) {
        p.rect(TABLE_X - 9, tableTop - 3, TABLE_W + 18, tableH + 6, "#7A2E2E", { r: 2 });
        p.rect(TABLE_X - 6.5, tableTop - 0.5, TABLE_W + 13, tableH + 1, "#96292F", { r: 1.6, shadow: false });
      }
    }
    if (gathering) {
      p.rect(0, floorTop, PAPER_ROOM_COLS, floorBottom - floorTop, "rgba(255,190,90,0.08)", { shadow: false, edge: false, r: 0 });
    }

    /* ---- BanquetDressing: candelabras from L2, bouquets join at
       L3 — flanking the table on both sides ---- */
    if (!config.outdoor && level >= 2) {
      candelabra(p, 14, tableTop + tableH * 0.32);
      candelabra(p, 86, tableTop + tableH * 0.68);
      if (level >= 3) {
        bouquet(p, 14, tableTop + tableH * 0.72);
        bouquet(p, 86, tableTop + tableH * 0.28);
      }
    }

    /* ---- benches along both sides ---- */
    for (let sideI = 0; sideI < 2; sideI++) {
      const benchX = sideI === 0 ? TABLE_X - 12.5 : TABLE_X + TABLE_W + 2.5;
      p.rect(benchX, tableTop + 1, 10, tableH - 2, config.benchFrame, { r: 1.6 });
      p.rect(benchX + 1.1, tableTop + 2.1, 7.8, tableH - 4.2, config.cushions[Math.min(3, tablesTier)], { r: 1.2, shadow: false });
    }

    /* ---- the long table itself ---- */
    p.rect(TABLE_X, tableTop, TABLE_W, tableH, config.tableWood, { r: 2 });
    if (tablesTier > 0 && cloth) {
      p.rect(TABLE_X + 1.2, tableTop + 1.2, TABLE_W - 2.4, tableH - 2.4, cloth, { r: 1.6, shadow: false });
      // the cloth hangs over the table's long edges
      for (const hx of [TABLE_X + 0.2, TABLE_X + TABLE_W - 1.4]) {
        p.rect(hx, tableTop + 2, 1.2, tableH - 4, cloth, { shadow: false, opacity: 0.92, r: 0.5 });
      }
    }

    // plates for every seat pair, capped at ten like the drawn room
    const plateCount = Math.min(Math.max(pairs, 2), 10);
    for (let i = 0; i < plateCount; i++) {
      const py = tableTop + 4 + i * BANQUET_SEAT_ROWS + BANQUET_SEAT_ROWS / 2 - 2;
      paintPaperPlate(p, config.food, 50 - 9.5, py, tablesTier >= 2);
      paintPaperPlate(p, config.food, 50 + 9.5, py, tablesTier >= 2);
      // goblets between the pairs
      p.path(`M ${50 - 1.1} ${py - 6.4} L ${50 + 1.1} ${py - 6.4} L ${50 + 0.7} ${py - 4.2} L ${50 - 0.7} ${py - 4.2} Z`, "#C8A24A", {
        shadow: false,
      });
    }

    // centerpieces down the table's spine — the drawn room set three
    const centerY = [tableTop + tableH * 0.22, tableTop + tableH * 0.52, tableTop + tableH * 0.82];
    if (config.signature === "garland") {
      // the Marriage Supper's floral garland runs the table's length
      p.rect(50 - 1.6, tableTop + 2, 3.2, tableH - 4, "#4E7A44", { r: 1.6, shadow: false });
      for (let gy = tableTop + 4; gy < tableTop + tableH - 3; gy += 4.4) {
        const h = paperHash(`garland-${Math.round(gy)}`);
        p.circle(50 + ((h % 3) - 1) * 1.1, gy, 1.05, ["#E86A92", "#F2C14E", "#F5EFE0", "#C9573F"][h % 4], { shadow: false });
        p.circle(50 + ((h % 3) - 1) * 1.1, gy, 0.42, "#FFF3D6", { shadow: false });
      }
    } else {
      for (const cy of centerY) {
        p.rect(50 - 0.45, cy - 1.8, 0.9, 2.6, "#F5EFE0", { r: 0.3, shadow: false });
        p.ellipse(50, cy - 2.5, 0.5, 0.85, "#FFC46B", { shadow: false });
        p.ellipse(48.2, cy + 1.6, 1.5, 0.9, "#5E9C4E", { shadow: false });
        p.ellipse(51.8, cy + 1.6, 1.5, 0.9, "#5E9C4E", { shadow: false });
      }
    }

    /* ---- entrance ---- */
    p.rect(0, floorBottom, PAPER_ROOM_COLS, 10, config.wallPanel, { shadow: false, edge: false, r: 0 });
    p.rect(38, floorBottom + 1.5, 24, 6.3, config.benchFrame, { r: 1 });
    p.rect(39.2, floorBottom + 2.4, 21.6, 4.5, config.benchSeat, { r: 0.8, shadow: false });
    if (halloween) {
      p.ellipse(18, floorBottom - 1.5, 3.0, 2.6, "#E67E22");
      p.ellipse(82, floorBottom - 1.5, 3.0, 2.6, "#E67E22");
    }
    p.rect(0, rows - 1.9, PAPER_ROOM_COLS, 1.9, "#3A2410", { shadow: false, edge: false, r: 0 });
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
  const figW = 12 * unit;
  const figH = 14 * unit;

  // the drawn room's slicing: evens down the left, odds down the right
  const leftDiners = diners.filter((_, i) => i % 2 === 0);
  const rightDiners = diners.filter((_, i) => i % 2 === 1);
  const seatPos = (side: "left" | "right", row: number) => ({
    x: 50 + (side === "left" ? -SEAT_DX : SEAT_DX) - 6,
    y: tableTop + 4 + row * BANQUET_SEAT_ROWS + BANQUET_SEAT_ROWS / 2 - 9,
  });

  return (
    <View
      onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}
      style={{ position: "relative", width: "100%", height: rows * unit, backgroundColor: config.wall }}
    >
      <PaperCanvas cols={PAPER_ROOM_COLS} rows={rows} unit={unit} draw={draw} />

      {/* candle glow at the table's heart */}
      {glowAt(50, tableTop + tableH * 0.4, 0)}
      {glowAt(50, tableTop + tableH * 0.75, 700)}

      {/* diners along both sides of the long table */}
      {leftDiners.map((person, row) => {
        const pos = seatPos("left", row);
        return (
          <View key={person.id} pointerEvents="none" style={{ position: "absolute", left: pos.x * unit, top: pos.y * unit, width: figW, height: figH }}>
            <PaperSeatedDiner person={person} unit={unit} flipX={false} delay={(row + 1) * 170} />
          </View>
        );
      })}
      {rightDiners.map((person, row) => {
        const pos = seatPos("right", row);
        return (
          <View key={person.id} pointerEvents="none" style={{ position: "absolute", left: pos.x * unit, top: pos.y * unit, width: figW, height: figH }}>
            <PaperSeatedDiner person={person} unit={unit} flipX delay={(row + 1) * 170} />
          </View>
        );
      })}

      {/* the hero at the head of the table — in his own clothes,
          his real hair and beard, no armor outside the forest */}
      {pawn && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 50 * unit - heroW / 2, top: (tableTop - PAPER_HERO_H - 1) * unit, alignItems: "center" }}
        >
          <FigureName name={pawn.name} />
          <View style={{ width: heroW, height: heroH }}>
            <PaperHeroFigure pawn={pawn} unit={unit} />
          </View>
        </View>
      )}

      {/* night warmth */}
      {isNight && (
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 0, top: 0, right: 0, bottom: 0, backgroundColor: "rgba(255,140,40,0.07)" }}
        />
      )}
    </View>
  );
}
