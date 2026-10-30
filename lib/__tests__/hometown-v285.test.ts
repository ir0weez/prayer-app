// v285 — The Town, Redrawn. Jonathan's Oct 27 rulings: the stage-2
// facelift was promised and never dispatched ("What about the rest of
// the freaking map you said you were going to change and make
// completely freaking different?"), and the reshape was always the ask
// ("I thought the lots and stuff were changing too? I thought it was a
// completely reshaped and redone game? That's what we said no?").
//
// These pins hold the two halves of that build:
//  - THE RESHAPE: a new town geography (one winding lane, districts,
//    the school at the end of the neighborhood) in which every lot
//    keeps its identity — id, footprint, allowed types, cost, preset,
//    beach flag — and his live town carries over by building identity.
//  - THE DRESS: the approved drawing's construction rules (chimneys
//    seated, windows in walls, buildings flush on foundations with
//    path connections, nothing floating) pinned against the renderer.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TOWN_LANDMARKS,
  TOWN_LOTS,
  TOWN_PATH,
  TOWN_SHOP_TYPES,
  TOWN_STREAM,
  ensureTownNeighborhood,
  isBridgeTile,
  isStreamTile,
  townPathRoads,
  type MapState,
  type PlacedBuilding,
  type TownLot,
} from "../hometown";
import { PAPER_STORY_CONFIGS } from "../paper-town";
import { HORIZON_DRESS } from "../welcoming-town";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const key = (x: number, y: number) => `${x}-${y}`;
const rectTiles = (r: { x: number; y: number; w: number; h: number }) => {
  const out: string[] = [];
  for (let xx = r.x; xx < r.x + r.w; xx++)
    for (let yy = r.y; yy < r.y + r.h; yy++) out.push(key(xx, yy));
  return out;
};
const pathSet = new Set(TOWN_PATH.map((t) => key(t.x, t.y)));
const streamSet = new Set(TOWN_STREAM.map((t) => key(t.x, t.y)));

/* The pre-reshape lot table (v284, commit e0e71cb) — identity only.
 * x/y are the OLD positions, used to build the synthetic old save. */
const OLD_LOTS: Array<{
  id: string; x: number; y: number; w: number; h: number;
  allowed: string[] | "SHOP"; cost: number; preset: string | null; beach: boolean;
}> = [
  { id: "town-lot-n1", x: 0, y: 0, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "diner", beach: false },
  { id: "town-lot-church", x: 3, y: 0, w: 2, h: 2, allowed: ["church"], cost: 550, preset: null, beach: false },
  { id: "town-lot-pawn", x: 6, y: 0, w: 2, h: 2, allowed: ["pawn-house"], cost: 275, preset: null, beach: false },
  { id: "town-lot-farm", x: 8, y: 0, w: 2, h: 2, allowed: ["farm"], cost: 550, preset: null, beach: false },
  { id: "town-lot-s1", x: 0, y: 3, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "shop", beach: false },
  { id: "town-lot-s2", x: 2, y: 3, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "bakery", beach: false },
  { id: "town-lot-s3", x: 4, y: 3, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "market", beach: false },
  { id: "town-lot-s4", x: 6, y: 3, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "bank", beach: false },
  { id: "town-lot-s6", x: 0, y: 6, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "barbershop", beach: false },
  { id: "town-lot-s7", x: 2, y: 6, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "carpenter", beach: false },
  { id: "town-lot-s8", x: 4, y: 6, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "pottery", beach: false },
  { id: "town-lot-s9", x: 6, y: 6, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "tailor", beach: false },
  { id: "town-lot-s5", x: 0, y: 9, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "bookstore", beach: false },
  { id: "town-lot-s10", x: 2, y: 9, w: 2, h: 2, allowed: ["community-garden"], cost: 825, preset: "community-garden", beach: false },
  { id: "town-lot-banquet", x: 4, y: 9, w: 2, h: 2, allowed: ["banquet-table"], cost: 2200, preset: "banquet-table", beach: false },
  { id: "town-lot-plaza", x: 6, y: 9, w: 2, h: 2, allowed: ["fountain-plaza"], cost: 990, preset: "fountain-plaza", beach: false },
  { id: "town-lot-c1", x: 9, y: 3, w: 1, h: 1, allowed: ["villager-cottage"], cost: 275, preset: null, beach: false },
  { id: "town-lot-c2", x: 9, y: 4, w: 1, h: 1, allowed: ["villager-cottage"], cost: 275, preset: null, beach: false },
  { id: "town-lot-c3", x: 9, y: 6, w: 1, h: 1, allowed: ["villager-cottage"], cost: 275, preset: null, beach: false },
  { id: "town-lot-c4", x: 9, y: 7, w: 1, h: 1, allowed: ["villager-cottage"], cost: 275, preset: null, beach: false },
  { id: "town-lot-c5", x: 9, y: 9, w: 1, h: 1, allowed: ["villager-cottage"], cost: 275, preset: null, beach: false },
  { id: "town-lot-c6", x: 9, y: 10, w: 1, h: 1, allowed: ["villager-cottage"], cost: 275, preset: null, beach: false },
  { id: "town-lot-c7", x: 9, y: 12, w: 1, h: 1, allowed: ["villager-cottage"], cost: 275, preset: null, beach: false },
  { id: "town-lot-c8", x: 9, y: 13, w: 1, h: 1, allowed: ["villager-cottage"], cost: 275, preset: null, beach: false },
  { id: "town-lot-s11", x: 0, y: 12, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "pizza-place", beach: true },
  { id: "town-lot-s12", x: 2, y: 12, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "burger-joint", beach: true },
  { id: "town-lot-s13", x: 4, y: 12, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "taco-stand", beach: true },
  { id: "town-lot-s14", x: 6, y: 12, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "sushi-bar", beach: true },
  { id: "town-lot-hospital", x: 0, y: 14, w: 2, h: 2, allowed: ["hospital"], cost: 1320, preset: "hospital", beach: false },
  { id: "town-lot-amphi", x: 4, y: 14, w: 2, h: 2, allowed: ["amphitheater"], cost: 1650, preset: "amphitheater", beach: false },
  { id: "town-lot-inn", x: 0, y: 28, w: 2, h: 2, allowed: ["fasting-house"], cost: 1320, preset: "fasting-house", beach: false },
  { id: "town-lot-carpenter", x: 2, y: 28, w: 2, h: 2, allowed: ["carpenter"], cost: 1210, preset: "carpenter", beach: false },
  { id: "town-lot-pottery", x: 4, y: 28, w: 2, h: 2, allowed: ["pottery"], cost: 1100, preset: "pottery", beach: false },
  { id: "town-lot-musichall", x: 6, y: 28, w: 2, h: 2, allowed: ["music-hall"], cost: 1760, preset: "music-hall", beach: false },
  { id: "town-lot-tailor", x: 8, y: 28, w: 2, h: 2, allowed: ["tailor"], cost: 1100, preset: "tailor", beach: false },
  { id: "town-lot-observatory", x: 0, y: 31, w: 2, h: 2, allowed: ["observatory"], cost: 2200, preset: "observatory", beach: false },
  { id: "town-lot-bathhouse", x: 2, y: 31, w: 2, h: 2, allowed: ["gym"], cost: 1650, preset: "gym", beach: false },
  { id: "town-lot-apothecary", x: 4, y: 31, w: 2, h: 2, allowed: ["apothecary"], cost: 1430, preset: "apothecary", beach: false },
  { id: "town-lot-townhall", x: 6, y: 31, w: 2, h: 2, allowed: ["bible-study-hall"], cost: 2750, preset: "bible-study-hall", beach: false },
  { id: "town-lot-postoffice", x: 8, y: 31, w: 2, h: 2, allowed: ["outreach-center"], cost: 990, preset: "outreach-center", beach: false },
  { id: "town-lot-s15", x: 2, y: 14, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "pizza-place", beach: false },
  { id: "town-lot-s16", x: 6, y: 14, w: 2, h: 2, allowed: "SHOP", cost: 825, preset: "sushi-bar", beach: false },
  { id: "town-lot-p1", x: 0, y: 25, w: 2, h: 2, allowed: "SHOP", cost: 935, preset: "burger-joint", beach: false },
  { id: "town-lot-p2", x: 3, y: 25, w: 2, h: 2, allowed: ["fountain-plaza"], cost: 990, preset: "fountain-plaza", beach: false },
  { id: "town-lot-p3", x: 5, y: 25, w: 2, h: 2, allowed: "SHOP", cost: 935, preset: "taco-stand", beach: false },
];

describe("v285 reshape — lot identity survives the move", () => {
  it("the same 45 lots exist, each exactly once", () => {
    expect(TOWN_LOTS.length).toBe(45);
    expect(new Set(TOWN_LOTS.map((l) => l.id)).size).toBe(45);
    expect(TOWN_LOTS.map((l) => l.id).sort()).toEqual(OLD_LOTS.map((l) => l.id).sort());
  });

  it("every lot keeps its footprint, allowed types, cost, preset and beach flag", () => {
    for (const old of OLD_LOTS) {
      const now = TOWN_LOTS.find((l) => l.id === old.id)!;
      expect(now, old.id).toBeDefined();
      expect(now.w, old.id).toBe(old.w);
      expect(now.h, old.id).toBe(old.h);
      expect(now.cost, old.id).toBe(old.cost);
      expect(now.presetType ?? null, old.id).toBe(old.preset);
      expect(!!now.beach, old.id).toBe(old.beach);
      if (old.allowed === "SHOP") {
        expect(now.allowedTypes, old.id).toBe(TOWN_SHOP_TYPES);
      } else {
        expect(now.allowedTypes, old.id).toEqual(old.allowed);
      }
    }
  });

  it("the geography actually changed (this is a reshape, not a relabel)", () => {
    const moved = OLD_LOTS.filter((old) => {
      const now = TOWN_LOTS.find((l) => l.id === old.id)!;
      return now.x !== old.x || now.y !== old.y;
    });
    expect(moved.length).toBeGreaterThanOrEqual(30);
  });
});

describe("v285 reshape — the new geography is sound", () => {
  it("everything stays on the 10x34 board", () => {
    for (const lot of TOWN_LOTS) {
      expect(lot.x, lot.id).toBeGreaterThanOrEqual(0);
      expect(lot.y, lot.id).toBeGreaterThanOrEqual(0);
      expect(lot.x + lot.w, lot.id).toBeLessThanOrEqual(10);
      expect(lot.y + lot.h, lot.id).toBeLessThanOrEqual(34);
    }
    for (const t of [...TOWN_PATH, ...TOWN_STREAM]) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x).toBeLessThanOrEqual(9);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(33);
    }
  });

  it("no two placed things overlap (bridges are the only path/stream crossings)", () => {
    const claim = new Map<string, string>();
    const put = (tiles: string[], owner: string) => {
      for (const t of tiles) {
        expect(claim.has(t), `${owner} overlaps ${claim.get(t)} at ${t}`).toBe(false);
        claim.set(t, owner);
      }
    };
    for (const lot of TOWN_LOTS) put(rectTiles(lot), lot.id);
    for (const lm of TOWN_LANDMARKS) put(rectTiles(lm), lm.id);
    // stream never runs under a lot or a landmark
    for (const t of streamSet) expect(claim.has(t), `stream under ${claim.get(t)} at ${t}`).toBe(false);
    // path never runs under a lot or a landmark
    for (const t of pathSet) expect(claim.has(t), `path under ${claim.get(t)} at ${t}`).toBe(false);
    // path has no duplicate tiles
    expect(pathSet.size).toBe(TOWN_PATH.length);
    expect(streamSet.size).toBe(TOWN_STREAM.length);
  });

  it("the café week green (tiles 7-8, 25-26) stays open grass", () => {
    for (const t of [key(7, 25), key(8, 25), key(7, 26), key(8, 26)]) {
      expect(pathSet.has(t), t).toBe(false);
      expect(streamSet.has(t), t).toBe(false);
      for (const lot of TOWN_LOTS) expect(rectTiles(lot).includes(t), `${lot.id} on ${t}`).toBe(false);
      for (const lm of TOWN_LANDMARKS) expect(rectTiles(lm).includes(t), `${lm.id} on ${t}`).toBe(false);
    }
  });

  it("every lot and landmark fronts the lane (a path tile touches it)", () => {
    const fronts = (r: { x: number; y: number; w: number; h: number }) =>
      rectTiles(r).some((t) => {
        const [x, y] = t.split("-").map(Number);
        return (
          pathSet.has(key(x + 1, y)) || pathSet.has(key(x - 1, y)) ||
          pathSet.has(key(x, y + 1)) || pathSet.has(key(x, y - 1))
        );
      });
    for (const lot of TOWN_LOTS) expect(fronts(lot), lot.id).toBe(true);
    for (const lm of TOWN_LANDMARKS) expect(fronts(lm), lm.id).toBe(true);
  });

  it("the lane is ONE connected street, from the school end to the gate", () => {
    const start = key(4, 2); // Chapel Way, at the schoolhouse door
    expect(pathSet.has(start)).toBe(true);
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length) {
      const [x, y] = queue.pop()!.split("-").map(Number);
      for (const n of [key(x + 1, y), key(x - 1, y), key(x, y + 1), key(x, y - 1)]) {
        if (pathSet.has(n) && !seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    expect(seen.size).toBe(pathSet.size);
    // the lane's south end: Artisans' Lane, at the foot of the town
    expect(pathSet.has(key(0, 29))).toBe(true);
    expect(seen.has(key(9, 29))).toBe(true);
  });

  it("cottages keep their (y,x) reading order — no villager changes homes", () => {
    const cottages = TOWN_LOTS
      .filter((l) => l.allowedTypes.includes("villager-cottage"))
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((l) => l.id);
    expect(cottages).toEqual([
      "town-lot-c1", "town-lot-c2", "town-lot-c3", "town-lot-c4",
      "town-lot-c5", "town-lot-c6", "town-lot-c7", "town-lot-c8",
    ]);
  });

  it("the stream crosses the lane only on bridges", () => {
    const bridges: string[] = [];
    for (let x = 0; x < 10; x++)
      for (let y = 0; y < 34; y++) if (isBridgeTile(x, y)) bridges.push(key(x, y));
    expect(bridges.sort()).toEqual(
      [key(9, 16), key(8, 18), key(8, 19), key(9, 23), key(9, 24), key(9, 25)].sort()
    );
    for (const b of bridges) {
      expect(isStreamTile(...(b.split("-").map(Number) as [number, number]))).toBe(true);
      expect(pathSet.has(b)).toBe(true);
    }
  });
});

describe("v285 reshape — the gates", () => {
  it("the five hub gates keep their id, target and art", () => {
    const want: Record<string, { targetMap: string; art: string }> = {
      "landmark-well": { targetMap: "well", art: "well" },
      "landmark-garden": { targetMap: "mall", art: "garden-gate" },
      "landmark-mission": { targetMap: "reserve", art: "mission-field" },
      "landmark-forest": { targetMap: "forest", art: "dark-forest" },
      "landmark-river": { targetMap: "river", art: "river-dock" },
    };
    for (const [id, w] of Object.entries(want)) {
      const lm = TOWN_LANDMARKS.find((l) => l.id === id)!;
      expect(lm, id).toBeDefined();
      expect(lm.targetMap, id).toBe(w.targetMap);
      expect(lm.art, id).toBe(w.art);
    }
  });

  it("the school stands at the end of the lane", () => {
    const school = TOWN_LANDMARKS.find((l) => l.id === "landmark-school")!;
    expect(school).toBeDefined();
    expect(school.targetMap).toBe("school");
    expect(school.art).toBe("schoolhouse");
    // the north end of the neighborhood, fronting Chapel Way
    expect(school.y).toBe(0);
    expect(pathSet.has(key(school.x, school.y + school.h))).toBe(true);
  });
});

describe("v285 reshape — his town carries over (the migration)", () => {
  const oldBuildingFor = (old: (typeof OLD_LOTS)[number]): PlacedBuilding => ({
    id: `b-${old.id}`,
    type: (old.preset ?? (old.allowed === "SHOP" ? "shop" : old.allowed[0])) as PlacedBuilding["type"],
    x: old.x,
    y: old.y,
    level: 3,
    townLotId: old.id,
    accumulated: 777,
    workers: 2,
  });

  it("a building on every old lot lands on its lot's new tiles, otherwise untouched", () => {
    const before = OLD_LOTS.map(oldBuildingFor);
    const map: MapState = {
      buildings: before,
      decorations: [],
      roads: [
        { id: "town-path-0-2", x: 0, y: 2 },   // still a path tile in the new town
        { id: "town-path-2-0", x: 2, y: 0 },   // a stale spur — gone in the new town
        { id: "player-road-1", x: 7, y: 22 },  // his own road — not the lane's business
      ],
    };
    const after = ensureTownNeighborhood(map);
    expect(after.buildings.length).toBe(before.length);
    for (const old of OLD_LOTS) {
      const lot = TOWN_LOTS.find((l) => l.id === old.id)!;
      const b = after.buildings.find((bb) => bb.id === `b-${old.id}`)!;
      expect(b, old.id).toBeDefined();
      expect(b.x, old.id).toBe(lot.x);
      expect(b.y, old.id).toBe(lot.y);
      // everything but placement is byte-identical
      expect(b.type, old.id).toBe(before.find((bb) => bb.id === b.id)!.type);
      expect(b.level, old.id).toBe(3);
      expect(b.accumulated, old.id).toBe(777);
      expect(b.workers, old.id).toBe(2);
      expect(b.townLotId, old.id).toBe(old.id);
    }
    // the streets re-seed to exactly the new lane. The town map is
    // lots-only: the ensurer has always cleaned stray non-path roads
    // out of a town save (its step 1), so the stale spur AND the stray
    // player road both go — the lane itself is what carries over.
    const roadIds = after.roads.map((r) => r.id).sort();
    const wantIds = townPathRoads().map((r) => r.id).sort();
    expect(roadIds).toEqual(wantIds);
    expect(after.roads.some((r) => r.id === "town-path-2-0")).toBe(false);
    expect(after.roads.some((r) => r.id === "player-road-1")).toBe(false);
  });

  it("a free-placed building the lots don't govern is left exactly where it stands", () => {
    const gear: PlacedBuilding = { id: "gear-1", type: "armory", x: 4, y: 20, level: 2 };
    const after = ensureTownNeighborhood({ buildings: [gear], decorations: [], roads: [] });
    const b = after.buildings.find((bb) => bb.id === "gear-1")!;
    expect(b).toBeDefined();
    expect(b.x).toBe(4);
    expect(b.y).toBe(20);
    expect(b.level).toBe(2);
    expect(b.townLotId).toBeUndefined();
  });

  it("an empty town stays empty (no phantom buildings appear)", () => {
    const after = ensureTownNeighborhood({ buildings: [], decorations: [], roads: [] });
    expect(after.buildings).toEqual([]);
    expect(after.roads.map((r) => r.id).sort()).toEqual(townPathRoads().map((r) => r.id).sort());
  });

  it("the lot-snap step still stands in ensureTownNeighborhood", () => {
    const src = read("lib/hometown.ts");
    const start = src.indexOf("export function ensureTownNeighborhood");
    const slice = src.slice(start, start + 12000);
    expect(slice).toContain("snap its building along");
    expect(slice).toContain("x: lot.x, y: lot.y");
  });
});

describe("v285 dress — the drawing's construction rules, in the story renderer", () => {
  // The story renderer's own geometry, re-derived from its formulas
  // (components/paper-building-art.tsx drawStory): the canvas is 100
  // units wide, the ground line is the canvas foot, and every part's
  // rect follows the same expressions the painter uses.
  const COLS = 100;
  const model = (cfg: (typeof PAPER_STORY_CONFIGS)[string], rows: number) => {
    const ground = rows - 1.2;
    const bodyW = cfg.w ?? 88;
    const bodyX = (COLS - bodyW) / 2;
    const bodyH = rows * (cfg.bodyHFrac ?? 0.5);
    const bodyY = ground - bodyH;
    const gable = cfg.roofStyle !== "flat";
    const roofH = gable ? bodyW * 0.22 : Math.max(4.5, rows * 0.05);
    const roof = gable
      ? { apex: { x: 50, y: bodyY - roofH }, left: { x: bodyX - 3, y: bodyY + 1.5 }, right: { x: bodyX + bodyW + 3, y: bodyY + 1.5 } }
      : null;
    const chimney = cfg.chimney
      ? gable
        ? { x: bodyX + bodyW * 0.78, y: bodyY - roofH * 0.55, w: 8, h: bodyH * 0.34 + roofH * 0.55 }
        : { x: bodyX + bodyW * 0.78, y: bodyY - roofH - bodyH * 0.22, w: 8, h: bodyH * 0.22 + 1.2 }
      : null;
    const doorW = cfg.doorWide ? 26 : 17;
    const doorAt = cfg.doorAt ?? (cfg.display ? "right" : "center");
    const doorCx = doorAt === "right" ? bodyX + bodyW - 6 - doorW / 2 : COLS / 2;
    const windows: Array<{ x: number; y: number; w: number; h: number }> = [];
    if (cfg.upperWin) {
      [0, 1].forEach((i) => {
        windows.push({ x: 50 - 15 + i * 19 - 5.6, y: bodyY + bodyH * 0.1, w: 11.2, h: bodyH * 0.3 });
      });
    }
    if (!cfg.display) {
      const winW = 15;
      const winH = bodyH * 0.3;
      const winY = bodyY + bodyH * 0.3;
      windows.push({ x: bodyX + bodyW * 0.06, y: winY, w: winW, h: winH });
      windows.push({ x: bodyX + bodyW * 0.94 - winW, y: winY, w: winW, h: winH });
    } else {
      const dispW = doorAt === "right" ? bodyW * 0.56 : bodyW * 0.66;
      const dispX = doorAt === "right" ? bodyX + bodyW * 0.05 : 50 - dispW / 2;
      windows.push({ x: dispX, y: bodyY + bodyH * 0.18, w: dispW, h: bodyH * 0.46 });
    }
    return { ground, bodyX, bodyY, bodyW, bodyH, roof, roofH, chimney, doorCx, doorW, windows };
  };
  /** The roofline's y at a given x on the right slope (apex → right corner). */
  const rooflineAt = (m: ReturnType<typeof model>, x: number) => {
    const r = m.roof!;
    return r.apex.y + ((x - r.apex.x) / (r.right.x - r.apex.x)) * (r.right.y - r.apex.y);
  };

  it("every story type's windows sit inside its walls", () => {
    for (const [type, cfg] of Object.entries(PAPER_STORY_CONFIGS)) {
      const m = model(cfg, 60);
      for (const w of m.windows) {
        expect(w.x, type).toBeGreaterThanOrEqual(m.bodyX - 0.01);
        expect(w.x + w.w, type).toBeLessThanOrEqual(m.bodyX + m.bodyW + 0.01);
        expect(w.y, type).toBeGreaterThanOrEqual(m.bodyY - 0.01);
        expect(w.y + w.h, type).toBeLessThanOrEqual(m.bodyY + m.bodyH + 0.01);
      }
    }
  });

  it("every chimney is seated: it pierces the roofline and its base lands in the wall", () => {
    let checked = 0;
    for (const [type, cfg] of Object.entries(PAPER_STORY_CONFIGS)) {
      if (!cfg.chimney) continue;
      checked++;
      const m = model(cfg, 60);
      const ch = m.chimney!;
      if (m.roof) {
        // gabled: the stack rises behind the roof — its top stands
        // above the slope at its x…
        expect(ch.y, type).toBeLessThan(rooflineAt(m, ch.x + ch.w / 2));
        // …and its base ends BELOW the roofline — merged into the
        // roof, continuing into the wall beneath (never floating)
        expect(ch.y + ch.h, type).toBeGreaterThan(rooflineAt(m, ch.x + ch.w / 2));
        expect(ch.y + ch.h, type).toBeGreaterThan(m.bodyY);
        expect(ch.y + ch.h, type).toBeLessThanOrEqual(m.ground);
      } else {
        // flat: the stack stands ON the slab — top above the slab,
        // base sunk INTO it (the slab spans bodyY-roofH .. bodyY)
        const slabTop = m.bodyY - m.roofH;
        expect(ch.y, type).toBeLessThan(slabTop);
        expect(ch.y + ch.h, type).toBeGreaterThan(slabTop);
        expect(ch.y + ch.h, type).toBeLessThan(m.bodyY);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("every story door stands on the ground line", () => {
    for (const cfg of Object.values(PAPER_STORY_CONFIGS)) {
      const m = model(cfg, 60);
      // paperDoor draws from (ground - h) to ground: the door's foot IS
      // the ground line, the same line the wall's base sits on.
      expect(m.bodyY + m.bodyH).toBeCloseTo(m.ground, 5);
    }
  });
});

describe("v285 dress — renderer wiring (source pins)", () => {
  const art = read("components/paper-building-art.tsx");
  const town = read("app/hometown.tsx");

  const storySpan = art.slice(
    art.indexOf("function drawStory("),
    art.indexOf("function drawStoryFront(")
  );
  const specialSpan = art.slice(
    art.indexOf("function drawSpecial("),
    art.indexOf("export const PaperBuildingArt")
  );

  it("story buildings stand on a backing sheet, a two-layer roof and a foundation", () => {
    expect(storySpan).toContain("paperSheet(");
    expect(storySpan).toContain("roofUnderlay");
    expect(storySpan).toContain("foundationCourse(");
    // the sheet is drawn before the building it backs
    expect(storySpan.indexOf("paperSheet(")).toBeLessThan(storySpan.indexOf("p.ellipse(50, ground"));
  });

  it("towers and special scenes get the same ground treatment", () => {
    const towerStart = art.indexOf("function drawTowerBody(");
    expect(art.slice(towerStart, towerStart + 1600)).toContain("foundationCourse(");
    expect(specialSpan).toContain("paperSheet(");
    expect(specialSpan).toContain("foundationCourse(");
    expect(specialSpan).toContain("doorLightPool(");
    expect(specialSpan).toContain("pathStrip(");
    // sheet before the scene switch, foundation after it
    expect(specialSpan.indexOf("paperSheet(")).toBeLessThan(specialSpan.indexOf("switch (type)"));
    expect(specialSpan.indexOf("foundationCourse(")).toBeGreaterThan(specialSpan.indexOf("switch (type)"));
  });

  it("the door's light pools on the ground at night, and the path strip meets the street", () => {
    expect(storySpan).toContain("if (night) doorLightPool(c, doorCx, ground);");
    expect(storySpan).toContain("pathStrip(c, doorCx, ground);");
  });

  it("the schoolhouse gate is drawn", () => {
    expect(art).toContain('case "schoolhouse":');
  });

  it("the map wears the horizon, the lamps and the dusk long shadows", () => {
    // v291 re-base: the horizon strip retired with the old grid —
    // the Wide Street wears the same horizon dress at its head
    // (StreetSkyline, components/street-places-art, from the same
    // HORIZON_DRESS). The lamps and dusk shadows still pin the town
    // screen's own source (they dress the other maps' grids).
    // RE-BASED (v343): the sky is DRAWN by the stage renderer
    // itself now — a per-phase sky field (STREET_SKY) over
    // HORIZON_DRESS hills, era-tinted, stretching through the
    // frame's elastic top band; the separate StreetSkyline piece
    // retired into components/wide-street.tsx.
    expect(town).toContain("StreetWorldView");
    const stage = read("components/wide-street.tsx");
    expect(stage).toContain("STREET_SKY");
    expect(stage).toContain("HORIZON_DRESS[phase]");
    expect(town).toContain("lampForTile(");
    expect(town).toContain('dayPhase === "dusk"');
    expect(town).toContain("longShadow");
  });

  it("the horizon dresses all four phases, each its own", () => {
    const phases = ["dawn", "day", "dusk", "night"] as const;
    for (const ph of phases) expect(HORIZON_DRESS[ph], ph).toBeDefined();
    const dresses = new Set(phases.map((ph) => JSON.stringify(HORIZON_DRESS[ph])));
    expect(dresses.size).toBe(4);
    // windows glow in the warm and dark phases, not in full day
    expect(HORIZON_DRESS.dusk.windowsLit).toBe(true);
    expect(HORIZON_DRESS.night.windowsLit).toBe(true);
    expect(HORIZON_DRESS.day.windowsLit).toBe(false);
  });
});
