// ─────────────────────────────────────────────────────────────────────────────
// v292 — the v291 hometown-open crash: root cause + the hardening.
//
// Jonathan, Oct 27 16:31, on v291: "The app just crashes when I
// press hometown." The cause was NOT the economy, the migration, or
// the street derivation — every one of those runs clean over a
// fixture shaped like his real save (first describe below; the same
// paths were also driven over his actual Oct-24 backup during the
// diagnosis and none threw). The cause was render-level: the new
// treeline art (components/street-places-art, PaperTree) returned a
// raw lowercase <g> element — a string element type with no native
// view config in React Native — instead of react-native-svg's G
// component, the way every other SVG file in this app does. The
// Dark Forest treeline renders unconditionally as the street's
// first place, so the first street paint threw fatally and the app
// died on open.
//
// Pins:
//  (a) HIS-SAVE-SHAPED OPEN PATH — two level-3 diners (the anchor
//      NOT the first in the array), retired producers holding
//      waiting coins, legacy records missing newer fields, 8
//      cottages, 117 people: parse → accrue → migrate → derive →
//      path to every door → cottage dealing → income/XP — nothing
//      throws, and the migration is exact + idempotent on this
//      shape.
//  (b) THE <g> REGRESSION — the art file imports G and renders <G>;
//      no raw <g> element ever returns. (Render hazards in this
//      codebase are source-pinned; there is no device renderer in
//      the suite.)
//  (c) THE FALLBACK — the migration in the load commit is wrapped
//      so a throw leaves the town exactly as loaded (coins unmoved)
//      and stands the street down; the street derivation is a
//      guarded attempt; the street subtree renders inside
//      StreetErrorBoundary, whose catch reports and unmounts; with
//      the street down the render's else branch (the pre-Part-2
//      town) takes over. The boundary's own contract is exercised
//      directly.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  accrueAwayIncome,
  cafeAnchorDiner,
  cottageResidents,
  dailyIncomeForTown,
  dailyXPForTown,
  parseTown,
  presenceMultiplierFor,
  type AwayAccrualInputs,
  type PlacedBuilding,
  type TownState,
} from "@/lib/hometown";
import {
  defaultWideStreetState,
  deriveStreetWorld,
  planStreetWalk,
  settleWideStreetMigration,
  streetPlaceAt,
  streetPlaceByBuildingId,
} from "@/lib/wide-street";
import { StreetErrorBoundary } from "@/components/street-error-boundary";

const NOW = Date.parse("2026-10-27T23:31:00.000Z");
const NOW_ISO = new Date(NOW).toISOString();
const HOUR_AGO = new Date(NOW - 60 * 60000).toISOString();

type RawBuilding = Partial<PlacedBuilding> & { id: string; type: PlacedBuilding["type"] };

function b(over: RawBuilding): Record<string, unknown> {
  return {
    x: 0,
    y: 0,
    level: 3,
    lastTick: HOUR_AGO,
    accumulated: 0,
    ...over,
  };
}

/**
 * A town shaped like Jonathan's real save (structure mirrored from
 * his Oct-24 backup, values synthesized): 43 town buildings — his
 * exact type multiset — including TWO level-3 diners (the s6 diner
 * is the anchor: north-most by (y, x)), retired producers holding
 * waiting coins, one legacy record with no `accumulated` field at
 * all (his pawn-house), one with no `lastTick`, plus his other maps.
 */
function hisSaveTown(): TownState {
  const townBuildings: Array<Record<string, unknown>> = [
    // the pawn-house: the legacy record with NO accumulated field
    { id: "b-pawn", type: "pawn-house", x: 6, y: 0, level: 3, lastTick: HOUR_AGO, townLotId: "town-lot-pawn" },
    b({ id: "b-shop-1", type: "shop", x: 0, y: 0, accumulated: 40, workers: 3, townLotId: "town-lot-n1" }),
    b({ id: "b-farm", type: "farm", x: 8, y: 0, accumulated: 0, workers: 3, townLotId: "town-lot-farm" }),
    b({ id: "b-shop-2", type: "shop", x: 2, y: 3, accumulated: 0 }),
    b({ id: "b-barber", type: "barbershop", x: 4, y: 3, accumulated: 12.5 }),
    b({ id: "b-taco-1", type: "taco-stand", x: 6, y: 3, accumulated: 0 }),
    b({ id: "b-taco-2", type: "taco-stand", x: 8, y: 3, accumulated: 0 }),
    b({ id: "b-church", type: "church", x: 0, y: 6, accumulated: 10 }),
    b({ id: "b-pizza-1", type: "pizza-place", x: 2, y: 6, accumulated: 0 }),
    b({ id: "b-pizza-2", type: "pizza-place", x: 4, y: 6, accumulated: 0 }),
    b({ id: "b-clothes", type: "clothes-shop", x: 6, y: 6, accumulated: 0 }),
    b({ id: "b-bank", type: "bank", x: 8, y: 6, accumulated: 0 }),
    b({ id: "b-toolshop", type: "toolshop", x: 0, y: 9, accumulated: 0 }),
    b({ id: "b-garden", type: "community-garden", x: 2, y: 9, accumulated: 0 }),
    b({ id: "b-weaponsmith", type: "weaponsmith", x: 4, y: 9, accumulated: 0 }),
    b({ id: "b-armory", type: "armory", x: 6, y: 9, accumulated: 0 }),
    b({ id: "b-burger", type: "burger-joint", x: 8, y: 9, accumulated: 0 }),
    b({ id: "b-sushi", type: "sushi-bar", x: 0, y: 12, accumulated: 0 }),
    b({ id: "b-fountain", type: "fountain-plaza", x: 2, y: 12, accumulated: 0 }),
    b({ id: "b-banquet", type: "banquet-table", x: 4, y: 15, accumulated: 0 }),
    // the TWO diners — s13 first in the array, s6 the anchor (y 6 < y 12)
    b({ id: "townlot-town-lot-s13-1792422634623", type: "diner", x: 4, y: 12, level: 3, accumulated: 25, townLotId: "town-lot-s13" }),
    b({ id: "townlot-town-lot-s6-1792422652080", type: "diner", x: 0, y: 6, level: 3, accumulated: 5, townLotId: "town-lot-s6" }),
    b({ id: "b-hospital", type: "hospital", x: 6, y: 12, accumulated: 0 }),
    b({ id: "b-amphitheater", type: "amphitheater", x: 8, y: 12, accumulated: 0 }),
    // a legacy record with NO lastTick (fresh-placed long ago)
    { id: "b-fasting-house", type: "fasting-house", x: 0, y: 15, level: 3, accumulated: 0 },
    b({ id: "b-carpenter", type: "carpenter", x: 2, y: 15, accumulated: 0 }),
    b({ id: "b-pottery", type: "pottery", x: 6, y: 15, accumulated: 0 }),
    b({ id: "b-music-hall", type: "music-hall", x: 8, y: 15, accumulated: 0 }),
    b({ id: "b-tailor", type: "tailor", x: 0, y: 18, accumulated: 0 }),
    b({ id: "b-bible-study", type: "bible-study-hall", x: 2, y: 18, accumulated: 0 }),
    b({ id: "b-observatory", type: "observatory", x: 4, y: 18, accumulated: 0 }),
    b({ id: "b-gym", type: "gym", x: 6, y: 18, accumulated: 0 }),
    b({ id: "b-apothecary", type: "apothecary", x: 8, y: 18, accumulated: 0 }),
    b({ id: "b-outreach", type: "outreach-center", x: 0, y: 21, accumulated: 0 }),
    b({ id: "b-bookstore", type: "bookstore", x: 2, y: 21, accumulated: 0 }),
    // his 8 villager cottages
    ...Array.from({ length: 8 }, (_, i) =>
      b({ id: `b-cottage-${i}`, type: "villager-cottage", x: (i % 4) * 2, y: 24 + Math.floor(i / 4) * 3, accumulated: 0 })
    ),
  ];
  const raw = {
    maps: {
      town: { buildings: townBuildings, roads: [], decorations: [] },
      city: {
        buildings: [
          b({ id: "c-bank-tower", type: "bank-tower", x: 0, y: 0, accumulated: 7 }),
          b({ id: "c-manna", type: "manna-house", x: 2, y: 0, accumulated: 0 }),
          b({ id: "c-feast", type: "feast-hall", x: 4, y: 0, accumulated: 0 }),
          b({ id: "c-amphi", type: "amphitheater", x: 6, y: 0, accumulated: 0 }),
        ],
        roads: [],
        decorations: [],
      },
      school: {
        buildings: [
          b({ id: "s-classroom", type: "classroom", x: 0, y: 0, accumulated: 0 }),
          b({ id: "s-office", type: "main-office", x: 2, y: 0, accumulated: 0 }),
          b({ id: "s-bell", type: "bell-tower", x: 4, y: 0, accumulated: 0 }),
          b({ id: "s-library", type: "library", x: 6, y: 0, accumulated: 0 }),
        ],
        roads: [],
        decorations: [],
      },
      mall: { buildings: [], roads: [], decorations: [] },
      well: { buildings: [], roads: [], decorations: [] },
      reserve: { buildings: [], roads: [], decorations: [] },
      forest: { buildings: [], roads: [], decorations: [] },
      river: { buildings: [], roads: [], decorations: [] },
    },
    lastIncomeDate: "2026-10-26",
  };
  return parseTown(raw);
}

function hisPeopleLights(count = 117): Array<{ personId: string; name: string }> {
  return Array.from({ length: count }, (_, i) => ({
    personId: `person-${1000 + i}`,
    name: `Person ${i}`,
  }));
}

function accrualInputs(): AwayAccrualInputs {
  return {
    gearCoinMult: 1,
    generosityMult: 0,
    houseCoinMult: 0,
    milestoneMult: 1,
    prestigeMult: 1,
    prayerMultValue: 1,
    prayedCount: 8,
    fellowshipBonus: 1,
    remembranceBonus: 1,
    gardenVisitBonus: 1,
    interiorBonuses: {},
    restInteriorMult: {},
    presenceCounts: null,
    economyScale: 1,
    nowMs: NOW,
    nowIso: NOW_ISO,
  };
}

describe("v292 (a) — the open path over a his-save-shaped town", () => {
  it("accrue → migrate → derive → path → cottages → income: nothing throws", () => {
    const town = hisSaveTown();
    expect(town.maps.town.buildings).toHaveLength(43);

    const accrued = accrueAwayIncome(town, accrualInputs()).town;
    const mig = settleWideStreetMigration(accrued, defaultWideStreetState());
    const world = deriveStreetWorld(mig.town.maps.town, { pendingRegister: mig.state.pendingRegister, weekLots: 1 });

    // the café hangs on the s6 diner (north-most), not the array-first s13
    expect(world.cafeBuildingId).toBe("townlot-town-lot-s6-1792422652080");

    // a route from the café door to EVERY place's door
    for (const p of world.places) {
      expect(planStreetWalk(world, world.cafe!.door, p.door), `route to ${p.kind}`).not.toBeNull();
    }
    // a place lookup over the whole grid + by every building id
    for (let x = 0; x < world.w; x++) {
      for (let y = 0; y < world.h; y++) streetPlaceAt(world, x, y);
    }
    for (const bb of mig.town.maps.town.buildings) streetPlaceByBuildingId(world, bb.id);

    // 117 people dealt into his 8 cottages; presence at the café door
    const lights = hisPeopleLights();
    let dealt = 0;
    for (const bb of mig.town.maps.town.buildings) {
      if (bb.type !== "villager-cottage") continue;
      dealt += cottageResidents(mig.town.maps.town.buildings, bb.id, lights).length;
    }
    expect(dealt).toBe(117);
    const anchor = cafeAnchorDiner(mig.town.maps.town)!;
    const mult = presenceMultiplierFor(
      { ...anchor, x: world.cafe!.door.x, y: world.cafe!.door.y },
      lights.map(() => ({ x: world.cafe!.door.x, y: world.cafe!.door.y })),
      3,
      true
    );
    expect(Number.isFinite(mult)).toBe(true);

    // the income aggregators over the migrated town stay finite
    expect(Number.isFinite(dailyIncomeForTown(mig.town, 1, 1, 1, 8, 1, 1, 1, NOW, 1))).toBe(true);
    expect(Number.isFinite(dailyXPForTown(mig.town, NOW))).toBe(true);
  });

  it("migration on his shape: exact to the anchor, sources zeroed, second settle a no-op", () => {
    const town = hisSaveTown();
    const before = town.maps.town.buildings.reduce((s, bb) => s + (bb.accumulated || 0), 0);
    const { town: out, state } = settleWideStreetMigration(town, defaultWideStreetState());
    const byId = new Map(out.maps.town.buildings.map((bb) => [bb.id, bb]));
    // 40 (shop) + 12.5 (barber) + 10 (church) + 25 (s13 diner) were
    // waiting at retired buildings; the anchor keeps its own 5 and
    // receives the rest — the town's waiting total is conserved.
    expect(byId.get("townlot-town-lot-s6-1792422652080")!.accumulated).toBe(5 + 40 + 12.5 + 10 + 25);
    const after = out.maps.town.buildings.reduce((s, bb) => s + (bb.accumulated || 0), 0);
    expect(after).toBe(before);
    for (const bb of out.maps.town.buildings) {
      if (bb.id !== "townlot-town-lot-s6-1792422652080") expect(bb.accumulated || 0).toBe(0);
    }
    const second = settleWideStreetMigration(out, state);
    expect(second.changed).toBe(false);
    // the legacy record that had no accumulated field survives untouched in kind
    expect(byId.get("b-pawn")!.type).toBe("pawn-house");
    // other maps are not the sweep's business
    expect(out.maps.city.buildings.find((bb) => bb.id === "c-bank-tower")!.accumulated).toBe(7);
  });
});

describe("v292 (b) — the <g> regression pin", () => {
  const art = readFileSync(join(process.cwd(), "components/street-places-art.tsx"), "utf8");

  it("PaperTree groups with react-native-svg's G, never a raw <g> element", () => {
    expect(art).toMatch(/import Svg, \{[^}]*\bG\b[^}]*\} from "react-native-svg"/);
    expect(art).toContain("<G>");
    expect(art).not.toMatch(/<g>/);
    expect(art).not.toMatch(/<\/g>/);
  });

  it("no raw lowercase SVG element types anywhere in the v291 street components", () => {
    for (const f of ["components/street-places-art.tsx", "components/wide-street.tsx", "components/street-villagers.tsx"]) {
      const src = readFileSync(join(process.cwd(), f), "utf8");
      expect(src, f).not.toMatch(/<(g|rect|circle|polygon|path|line|ellipse|defs|stop)[ />]/);
    }
  });
});

describe("v292 (c) — the fallback hardening", () => {
  const screen = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");

  it("the boundary contract: a catch reports once and renders nothing", () => {
    const onError = vi.fn();
    const boundary = new StreetErrorBoundary({ onError, children: null });
    expect(StreetErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true });
    boundary.componentDidCatch(new Error("boom"), { componentStack: "" });
    expect(onError).toHaveBeenCalledTimes(1);
    boundary.state = { failed: true };
    expect(boundary.render()).toBeNull();
    const healthy = new StreetErrorBoundary({ onError, children: "town" });
    expect(healthy.render()).toBe("town");
  });

  it("the screen wires the fallback: guarded migration, guarded derivation, boundary, stand-down", () => {
    // migration: the settle sits inside a try whose catch stands the street down
    expect(screen).toMatch(/try \{\s*\n\s*const mig = settleWideStreetMigration\(t, wideStreetOnLoad\);/);
    expect(screen).toMatch(/\} catch \{\s*\n\s*markStreetBroken\(\);/);
    // derivation: attempted inside a try, failure recorded, street nulled when broken
    expect(screen).toContain("const streetAttempt = useMemo(");
    expect(screen).toContain("const streetWorld = streetBroken ? null : streetAttempt.world;");
    // the street subtree renders inside the boundary, reporting to the same stand-down
    expect(screen).toContain("<StreetErrorBoundary onError={markStreetBroken}>");
    // the income tick's street derivation is guarded too
    expect(screen).toMatch(/try \{\s*\n\s*const tickStreet = deriveStreetWorld\(prev\.maps\.town\);/);
  });

  it("a poisoned record really does throw in derivation — and the guarded shape contains it", () => {
    const town = hisSaveTown();
    const poisoned = {
      ...town.maps.town,
      buildings: town.maps.town.buildings.map((bb) =>
        bb.id === "b-shop-1"
          ? new Proxy(bb, {
              get(target, prop, receiver) {
                if (prop === "type") throw new Error("poisoned record");
                return Reflect.get(target, prop, receiver);
              },
            })
          : bb
      ),
    };
    expect(() => deriveStreetWorld(poisoned as never)).toThrow("poisoned record");
    // the screen's guarded attempt, in miniature: catch → no street, coins unmoved
    let world = null;
    let failed = false;
    try {
      world = deriveStreetWorld(poisoned as never);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    expect(world).toBeNull();
    const anchor = town.maps.town.buildings.find((bb) => bb.id === "townlot-town-lot-s6-1792422652080")!;
    expect(anchor.accumulated).toBe(5);
  });
});
