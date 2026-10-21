// Paper cutout interiors — the kit + the Taco Stand rebuilt as a
// paper diorama (Jonathan's pivot, 2026-10-21: after v149's miniature
// and v151's slab booths, he proposed the paper mockup himself —
// "Maybe we should just try the paper one?"). The lib half is pure
// data (geometry, booth layout, level/tier progression, diner looks)
// and is unit-tested directly; the scene wiring is pinned with source
// guards in the repo's idiom, including that the taco screen renders
// the PAPER room and the pixel room stays shelved, not deleted.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BAND_ROWS,
  BOOTH,
  ENTRANCE_ROWS,
  FIGURE_H,
  FIGURE_W,
  FLOOR_TOP,
  PAPER_DINER_HAIR_COLORS,
  PAPER_DINER_PANTS,
  PAPER_DINER_SHIRTS,
  PAPER_DINER_SKINS,
  PAPER_ROOM_COLS,
  WALL_STACK_ROWS,
  bandCount,
  benchPieceScore,
  benchStyleFor,
  boothForTable,
  boothSeatPos,
  boothX,
  dressingForLevel,
  kitchenDressingFor,
  kitchenPieceScore,
  levelPieceScore,
  paperDinerLookFor,
  roomRows,
  tableDressingFor,
  tablePieceScore,
} from "../paper-interior";
import { dinerLookFor } from "../pixel-interior";

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
    expect(roomRows(2)).toBe(FLOOR_TOP + BAND_ROWS + 2 + ENTRANCE_ROWS);
    expect(WALL_STACK_ROWS).toBe(FLOOR_TOP - 2);
  });

  it("seat anchors mirror across the room and face the table", () => {
    const top = FLOOR_TOP;
    const lb = boothSeatPos("left", "bench", 0, top);
    const rb = boothSeatPos("right", "bench", 0, top);
    expect(lb.x + rb.x + FIGURE_W).toBe(PAPER_ROOM_COLS);
    expect(lb.flipX).toBe(false); // authored figure faces right, into the table
    expect(rb.flipX).toBe(true);
    const ls = boothSeatPos("left", "stool", 1, top);
    const rs = boothSeatPos("right", "stool", 1, top);
    expect(ls.x + rs.x + FIGURE_W).toBe(PAPER_ROOM_COLS);
    expect(ls.flipX).toBe(true); // stool diners face the bench
    expect(rs.flipX).toBe(false);
    expect(ls.y).toBeGreaterThan(lb.y); // second seat row sits below the first
  });
});

describe("diorama scale — the v151 failures can never quietly come back", () => {
  it("people are LARGE relative to the room, like the paper mockup", () => {
    // v151's diners shrank to stickers on slab booths. In the paper
    // mockup a diner's head alone is a plate's width — the figure
    // spans 12% of the room, and its head most of its own width.
    expect(FIGURE_W).toBe(12);
    expect(FIGURE_H).toBe(14);
    expect(FIGURE_W / PAPER_ROOM_COLS).toBeGreaterThanOrEqual(0.12);
  });

  it("booths are furniture against the walls, never monoliths", () => {
    // Two booths leave a real open aisle down the middle: the hero
    // (11 wide) fits between them with room to breathe.
    expect(BOOTH.w * 2).toBeLessThan(PAPER_ROOM_COLS);
    expect(PAPER_ROOM_COLS - BOOTH.w * 2).toBeGreaterThanOrEqual(30);
    expect(boothX("right")).toBe(PAPER_ROOM_COLS - BOOTH.w);
    // a booth is wider than the figure is tall — a bench, a table
    // and stools — but it never eats the room
    expect(BOOTH.w).toBeGreaterThan(FIGURE_H * 2);
  });

  it("the room is tall — a diorama you scroll through, not a band", () => {
    expect(roomRows(4)).toBe(140);
    expect(roomRows(4) / PAPER_ROOM_COLS).toBeGreaterThan(1.3);
    expect(roomRows(2)).toBe(104);
  });
});

describe("progression as data — upgrades grow the room structurally", () => {
  it("building level: L1 plain, L2 dressed, L3 grand", () => {
    const l1 = dressingForLevel(1);
    expect(l1).toEqual({
      menuBoards: false,
      hoodStripes: 2,
      rug: false,
      cornerPlants: 0,
      barrel: false,
      extraLanterns: 0,
      sombreros: false,
    });
    const l2 = dressingForLevel(2);
    expect(l2.menuBoards).toBe(true);
    expect(l2.hoodStripes).toBe(3);
    expect(l2.cornerPlants).toBe(1);
    expect(l2.barrel).toBe(true);
    expect(l2.extraLanterns).toBe(1);
    expect(l2.rug).toBe(false);
    const l3 = dressingForLevel(3);
    expect(l3.hoodStripes).toBe(4);
    expect(l3.rug).toBe(true);
    expect(l3.cornerPlants).toBe(2);
    expect(l3.extraLanterns).toBe(2);
    expect(l3.sombreros).toBe(true);
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

  it("every ladder is monotonic — each step ADDS paper pieces", () => {
    const levels = [1, 2, 3].map((l) => levelPieceScore(dressingForLevel(l)));
    expect(levels[1]).toBeGreaterThan(levels[0]);
    expect(levels[2]).toBeGreaterThan(levels[1]);
    const tables = [0, 1, 2, 3].map((t) => tablePieceScore(tableDressingFor(t)));
    const benches = [0, 1, 2, 3].map((t) => benchPieceScore(benchStyleFor(t)));
    const kitchens = [0, 1, 2, 3].map((t) => kitchenPieceScore(kitchenDressingFor(t)));
    for (const scores of [tables, benches, kitchens]) {
      for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
  });
});

describe("diner looks — deterministic per person", () => {
  it("the same villager is dressed the same at every table", () => {
    const a = paperDinerLookFor({ id: "person-melody" });
    const b = paperDinerLookFor({ id: "person-melody" });
    expect(a).toEqual(b);
    expect(PAPER_DINER_SKINS).toContain(a.skin);
    expect(PAPER_DINER_HAIR_COLORS).toContain(a.hair);
    expect(PAPER_DINER_SHIRTS).toContain(a.shirt);
    expect(PAPER_DINER_PANTS).toContain(a.pants);
    expect(["short", "long", "bun", "bald"]).toContain(a.hairStyle);
    // the beard rides in the pawn system's vocabulary (lib/pawn)
    expect(["none", "full", "goatee", "mustache", "gilded", "radiant", "heavenly"]).toContain(a.beardStyle);
    expect(a.beardLength).toBeGreaterThanOrEqual(0);
    expect(a.beardLength).toBeLessThanOrEqual(100);
  });

  it("a prayer-light accent color leads as the shirt", () => {
    expect(paperDinerLookFor({ id: "joy", accentColor: "#FFD700" }).shirt).toBe("#FFD700");
  });

  it("keeps the shelved pixel kit's COLORS for the same person", () => {
    // The pivot changes the drawing, not the people: same hash, same
    // palettes, so a villager keeps their colors across the styles.
    // (Hair STYLE may differ — the paper kit's style list grew "bald",
    // and the paper look carries a beard the pixel look never had.)
    for (const id of ["person-melody", "joy", "villager-7", "person-aaron"]) {
      const paper = paperDinerLookFor({ id });
      const pixel = dinerLookFor({ id });
      expect(paper.skin).toBe(pixel.skin);
      expect(paper.hair).toBe(pixel.hair);
      expect(paper.shirt).toBe(pixel.shirt);
      expect(paper.pants).toBe(pixel.pants);
    }
  });

  it("never picks undefined, even for hashes that shift negative", () => {
    for (let i = 0; i < 200; i++) {
      const look = paperDinerLookFor({ id: `villager-${i}` });
      expect(look.skin).toBeDefined();
      expect(look.hair).toBeDefined();
      expect(look.shirt).toBeDefined();
      expect(look.pants).toBeDefined();
      expect(look.hairStyle).toBeDefined();
      expect(look.beardStyle).toBeDefined();
      expect(look.beardLength).toBeDefined();
    }
  });
});

describe("diner hair + beards — a crowd must not read as clones (2026-10-21)", () => {
  // Jonathan's v152 screenshot: every diner read BALD and alike — the
  // first paper pass left only a hairline crescent of hair, and the
  // hero stood hairless. These pins keep the appearance data varied
  // and the renderers honest.
  const looks = Array.from({ length: 200 }, (_, i) => paperDinerLookFor({ id: `villager-${i}` }));

  it("villagers wear at least three distinct hair styles — bald among them", () => {
    const styles = new Set(looks.map((l) => l.hairStyle));
    expect(styles.size).toBeGreaterThanOrEqual(3);
    expect(styles.has("bald")).toBe(true); // bald is ONE style, worn by some
    expect(styles.size).toBeLessThanOrEqual(4);
    // …but most villagers DO wear hair — bald is not the default read
    expect(looks.filter((l) => l.hairStyle === "bald").length).toBeLessThan(looks.length / 2);
  });

  it("hair color, skin and shirt all vary across a crowd", () => {
    expect(new Set(looks.map((l) => l.hair)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(looks.map((l) => l.skin)).size).toBeGreaterThanOrEqual(4);
    expect(new Set(looks.map((l) => l.shirt)).size).toBeGreaterThanOrEqual(4);
  });

  it("some villagers wear a grown beard; clean-shaven stays common", () => {
    const bearded = looks.filter((l) => l.beardStyle !== "none");
    expect(bearded.length).toBeGreaterThan(20);
    expect(bearded.length).toBeLessThan(looks.length / 2);
    for (const l of bearded) expect(l.beardLength).toBeGreaterThan(0);
  });

  it("the diner renderer draws hair caps, a bald shine, and beards", () => {
    const kit = readSrc("components/paper-interior.tsx");
    // a real cap over the face's top — not the old offset-circle sliver
    expect(kit).toContain("the hair CAP over the face's top");
    expect(kit).toContain('look.hairStyle === "bald"');
    expect(kit).toContain('look.beardStyle === "full"');
    expect(kit).toContain('look.beardStyle === "goatee"');
    expect(kit).toContain('look.beardStyle === "mustache"');
    expect(kit).toContain("look.beardLength");
  });

  it("the hero figure reads his appearance from the pawn state itself", () => {
    const kit = readSrc("components/paper-interior.tsx");
    // live beard growth + equipped style from lib/pawn — NOT the raw
    // stored beardLength (length at last trim) the first pass used
    expect(kit).toContain("beardGrowthFor(pawn)");
    expect(kit).toContain("pawn.beardStyle");
    expect(kit).toContain("pawn.hairStyle");
    expect(kit).not.toContain("pawn.beardLength ?? 0");
    // the barbershop styles render as paper pieces, incl. the ones
    // Jonathan named: mohawk + bun alongside bald/short/long
    for (const s of ["mohawk", "bun", "highbun", "ponytail", "braid", "curly", "pompadour", "dreads", "laurel", "coronet", "glorymane"]) {
      expect(kit).toContain(`"${s}"`);
    }
    // beard styles render too, with the prestige families
    for (const s of ["mustache", "goatee", "gilded", "radiant", "heavenly"]) {
      expect(kit).toContain(`"${s}"`);
    }
  });
});

describe("wiring — the taco room renders through the paper kit", () => {
  const screen = readSrc("app/restaurant-interior.tsx");
  const room = readSrc("components/paper-taco-room.tsx");
  const kit = readSrc("components/paper-interior.tsx");
  const lib = readSrc("lib/paper-interior.ts");

  it("the screen's taco branch is the PAPER room, atmosphere kept", () => {
    expect(screen).toContain('cuisine === "taco-stand" ? (');
    expect(screen).toContain("<PaperTacoRoom");
    expect(screen).not.toContain("<PixelTacoRoom");
    expect(screen).toContain("<InteriorAtmosphere");
    expect(screen).toContain('halloween={getHolidaySeason() === "halloween"}');
    expect(screen).toContain('isNight={getTimeOfDay() === "night"}');
  });

  it("the pixel kit stays in the repo, shelved — not deleted", () => {
    const pixelRoom = readSrc("components/pixel-taco-room.tsx");
    const pixelKit = readSrc("components/pixel-interior.tsx");
    expect(pixelRoom).toContain("PixelTacoRoom");
    expect(pixelKit).toContain("PixelSeatedDiner");
    expect(readSrc("lib/pixel-interior.ts")).toContain("PIXEL_ROOM_COLS");
  });

  it("the paper kit is one Svg of shadowed paper pieces", () => {
    expect(kit).toContain("PaperCanvas");
    expect(kit).toContain("PAPER_SHADOW"); // every piece casts its layer shadow
    expect(kit).toContain("PaperSeatedDiner");
    expect(kit).toContain("PaperHeroFigure");
    expect(kit).toContain("RadialGradient"); // soft light, not hard discs
  });

  it("EVERY level and tier flows through the kit's progression data", () => {
    for (const fn of ["dressingForLevel", "tableDressingFor", "benchStyleFor", "kitchenDressingFor"]) {
      expect(room).toContain(fn);
      expect(lib).toContain(`export function ${fn}`);
    }
  });

  it("seat slicing is the pixel room's, exactly", () => {
    expect(room).toContain("group.slice(0, pawnFirst ? 1 : 2)");
    expect(room).toContain("group.slice(2, 4)");
    expect(screen).toContain("diners.forEach((p, i) => tableDiners[i % tableCount].push(p))");
    expect(screen).toContain("bLevel >= 3 ? 4 : bLevel >= 2 ? 3 : 2");
  });

  it("the hero stands in the room as a paper figure, unboxed", () => {
    expect(room).toContain("PaperHeroFigure");
    expect(room).toContain("loadCustomPawn");
    expect(room).toContain("FigureName");
    expect(room).not.toContain("PawnPreview"); // the pixel sprite stays shelved
    expect(room).toContain("Cantina Kitchen");
    expect(room).toContain("Cantina Counter");
  });

  it("the sun is the room's crown and the booths are wall benches", () => {
    expect(room).toContain("starPoints(50, 24.5, 12"); // the big layered sun
    expect(room).toContain("sombrero(p");
    expect(room).toContain("dressing.sombreros");
  });

  it("Serve the Table hosting is untouched", () => {
    expect(screen).toContain('useMiniGameHost("serve"');
    expect(screen).toContain("<ServeGame");
    expect(screen).toContain("cuisine={cuisine}");
  });

  it("no emoji art in the paper kit or the taco room", () => {
    expect(EMOJI.test(room)).toBe(false);
    expect(EMOJI.test(kit)).toBe(false);
    expect(EMOJI.test(lib)).toBe(false);
  });
});
