// Pixel interiors, phase 1 — the kit + the Taco Stand rebuilt 100%
// pixel (Jonathan's pick: "100% all of them 8-bit pixel... in a Stardew
// Valley kind of way"). The lib half is pure data (geometry, booth
// layout, level/tier progression, diner looks) and is unit-tested
// directly; the scene wiring is pinned with source guards in the repo's
// idiom, including that the v147 DRAWN taco path is gone from the
// screen and that seats + mini-game hosting are untouched.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BAND_ROWS,
  DINER_H,
  DINER_W,
  DINER_HAIR_COLORS,
  DINER_PANTS,
  DINER_SHIRTS,
  DINER_SKINS,
  FLOOR_TOP,
  PIXEL_ROOM_COLS,
  bandCount,
  benchStyleFor,
  boothForTable,
  boothSeatPos,
  dinerLookFor,
  dressingForLevel,
  kitchenDressingFor,
  roomRows,
  tableDressingFor,
} from "../pixel-interior";

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe("booth layout — booths hug the walls, floor stays open", () => {
  it("alternates walls and steps down a band every two tables", () => {
    expect(boothForTable(0)).toEqual({ side: "left", band: 0, top: FLOOR_TOP });
    expect(boothForTable(1)).toEqual({ side: "right", band: 0, top: FLOOR_TOP });
    expect(boothForTable(2)).toEqual({ side: "left", band: 1, top: FLOOR_TOP + BAND_ROWS });
    expect(boothForTable(3)).toEqual({ side: "right", band: 1, top: FLOOR_TOP + BAND_ROWS });
  });

  it("room height grows by whole bands, entrance always at the foot", () => {
    expect(bandCount(2)).toBe(1);
    expect(bandCount(4)).toBe(2);
    expect(roomRows(4) - roomRows(2)).toBe(BAND_ROWS);
    expect(roomRows(2)).toBeGreaterThan(FLOOR_TOP + BAND_ROWS);
  });

  it("seat anchors mirror across the room and face the table", () => {
    const top = FLOOR_TOP;
    const lb = boothSeatPos("left", "bench", 0, top);
    const rb = boothSeatPos("right", "bench", 0, top);
    expect(lb.x + rb.x + DINER_W).toBe(PIXEL_ROOM_COLS);
    expect(lb.flipX).toBe(false); // authored sprite faces right, into the table
    expect(rb.flipX).toBe(true);
    const ls = boothSeatPos("left", "stool", 1, top);
    const rs = boothSeatPos("right", "stool", 1, top);
    expect(ls.x + rs.x + DINER_W).toBe(PIXEL_ROOM_COLS);
    expect(ls.flipX).toBe(true); // stool diners face the bench
    expect(rs.flipX).toBe(false);
    expect(ls.y).toBe(rb.y + 13); // second seat row sits below the first
    expect(DINER_H).toBe(12);
  });
});

describe("progression as data — upgrades grow the room structurally", () => {
  it("building level: L1 plain, L2 dressed, L3 grand", () => {
    const l1 = dressingForLevel(1);
    expect(l1).toEqual({
      menuBoards: false,
      grillStripes: 2,
      rug: false,
      cornerPlants: 0,
      barrel: false,
      extraLanterns: 0,
    });
    const l2 = dressingForLevel(2);
    expect(l2.menuBoards).toBe(true);
    expect(l2.grillStripes).toBe(3);
    expect(l2.cornerPlants).toBe(1);
    expect(l2.barrel).toBe(true);
    expect(l2.extraLanterns).toBe(1);
    expect(l2.rug).toBe(false);
    const l3 = dressingForLevel(3);
    expect(l3.grillStripes).toBe(4);
    expect(l3.rug).toBe(true);
    expect(l3.cornerPlants).toBe(2);
    expect(l3.extraLanterns).toBe(2);
    // out-of-range levels clamp to the ladder
    expect(dressingForLevel(9)).toEqual(l3);
    expect(dressingForLevel(0)).toEqual(l1);
  });

  it("tables tier: cups, then food, then full service", () => {
    expect(tableDressingFor(0)).toEqual({ cups: false, food: false, tray: false, fringe: false });
    expect(tableDressingFor(1)).toEqual({ cups: true, food: false, tray: false, fringe: false });
    expect(tableDressingFor(2)).toEqual({ cups: true, food: true, tray: false, fringe: false });
    expect(tableDressingFor(3)).toEqual({ cups: true, food: true, tray: true, fringe: true });
  });

  it("chairs tier: bare wood bench becomes the grand tufted booth", () => {
    expect(benchStyleFor(0)).toEqual({ cushion: "wood", tufted: false, goldTrim: false });
    expect(benchStyleFor(1).cushion).toBe("teal");
    expect(benchStyleFor(2).cushion).toBe("pink");
    expect(benchStyleFor(3)).toEqual({ cushion: "grand", tufted: true, goldTrim: true });
  });

  it("kitchen tier: planks become tile, the ristra and taco row arrive", () => {
    const k0 = kitchenDressingFor(0);
    expect(k0.tiled).toBe(false);
    expect(k0.steam).toBe(false);
    expect(k0.ristra).toBe(false);
    const k1 = kitchenDressingFor(1);
    expect(k1.tiled).toBe(true);
    expect(k1.steam).toBe(true);
    expect(k1.tileRows).toBe(2);
    expect(k1.canisters).toBe(3);
    const k2 = kitchenDressingFor(2);
    expect(k2.tileRows).toBe(3);
    expect(k2.ristra).toBe(true);
    expect(k2.trayRow).toBe(false);
    const k3 = kitchenDressingFor(3);
    expect(k3.canisters).toBe(4);
    expect(k3.trayRow).toBe(true);
  });
});

describe("diner looks — deterministic per person", () => {
  it("the same villager is dressed the same at every table", () => {
    const a = dinerLookFor({ id: "person-melody" });
    const b = dinerLookFor({ id: "person-melody" });
    expect(a).toEqual(b);
    expect(DINER_SKINS).toContain(a.skin);
    expect(DINER_HAIR_COLORS).toContain(a.hair);
    expect(DINER_SHIRTS).toContain(a.shirt);
    expect(DINER_PANTS).toContain(a.pants);
    expect(["short", "long", "bun"]).toContain(a.hairStyle);
  });

  it("a prayer-light accent color leads as the shirt", () => {
    expect(dinerLookFor({ id: "joy", accentColor: "#FFD700" }).shirt).toBe("#FFD700");
  });

  it("never picks undefined, even for hashes that shift negative", () => {
    // Regression: bit-shifted hashes go negative for half of all ids,
    // and a negative list index silently picked undefined colors.
    for (let i = 0; i < 200; i++) {
      const look = dinerLookFor({ id: `villager-${i}` });
      expect(look.skin).toBeDefined();
      expect(look.hair).toBeDefined();
      expect(look.shirt).toBeDefined();
      expect(look.pants).toBeDefined();
      expect(look.hairStyle).toBeDefined();
    }
  });
});

describe("wiring — the taco room renders through the pixel kit", () => {
  const screen = readSrc("app/restaurant-interior.tsx");
  const room = readSrc("components/pixel-taco-room.tsx");
  const kit = readSrc("components/pixel-interior.tsx");

  it("the screen's taco branch is the pixel room, atmosphere kept", () => {
    expect(screen).toContain('cuisine === "taco-stand" ? (');
    expect(screen).toContain("<PixelTacoRoom");
    expect(screen).toContain("<InteriorAtmosphere");
    expect(screen).toContain('halloween={getHolidaySeason() === "halloween"}');
    expect(screen).toContain('isNight={getTimeOfDay() === "night"}');
  });

  it("the drawn taco path is gone from the screen", () => {
    expect(screen).not.toContain("CantinaTable");
    expect(screen).not.toContain("CantinaBench");
    expect(screen).not.toContain("TacoCantinaCounter");
  });

  it("the kit renders sprites through the hero's own PixelSprite", () => {
    expect(kit).toContain('from "@/components/hero-sprite"');
    expect(kit).toContain("PixelSprite");
    expect(kit).toContain("PixelCanvas");
    expect(kit).toContain("PixelSeatedDiner");
  });

  it("EVERY level and tier flows through the kit's progression data", () => {
    for (const fn of ["dressingForLevel", "tableDressingFor", "benchStyleFor", "kitchenDressingFor"]) {
      expect(room).toContain(fn);
    }
    // the drawn per-cuisine scene pieces are not the taco path anymore
    expect(room).not.toContain("CuisineSignature");
    expect(room).not.toContain("RetroCantina");
  });

  it("seat slicing is the drawn room's, exactly", () => {
    expect(room).toContain("group.slice(0, pawnFirst ? 1 : 2)");
    expect(room).toContain("group.slice(2, 4)");
    expect(screen).toContain("diners.forEach((p, i) => tableDiners[i % tableCount].push(p))");
    expect(screen).toContain("bLevel >= 3 ? 4 : bLevel >= 2 ? 3 : 2");
  });

  it("the hero stands in the room and the station is the Cantina Kitchen", () => {
    expect(room).toContain("PawnPreview");
    expect(room).toContain("loadCustomPawn");
    expect(room).toContain("Cantina Kitchen");
    expect(room).toContain("Cantina Counter");
  });

  it("Serve the Table hosting is untouched", () => {
    expect(screen).toContain('useMiniGameHost("serve"');
    expect(screen).toContain("<ServeGame");
    expect(screen).toContain("cuisine={cuisine}");
  });

  it("no emoji art in the pixel kit or the taco room", () => {
    expect(EMOJI.test(room)).toBe(false);
    expect(EMOJI.test(kit)).toBe(false);
  });
});
