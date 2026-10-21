// Town lot catalog rework (Oct 20, 2026, Jonathan's three complaints):
//  1. Gear shops (clothes/armor/weapon/tool) sat in the lot FOR SALE
//     catalog — they are gear-economy buildings, not lot purchases.
//     They are out of every lot catalog now; a gear shop already standing
//     keeps standing and keeps working.
//  2. The flexible-lot catalog was five restaurants and a shop. It now
//     also offers the Bookstore (revived from the retired mall — its art,
//     interior, and tap routing never left) and the Artisans' Row trades.
//  3. Duplicates stay purchasable (his pick), but every build row whose
//     type already stands in town carries an "In your town ×N" badge,
//     counted live from the town state when the sheet renders.
// Rows in the sheet lead with the building's real storybook art now,
// not food emoji.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
    clear: vi.fn(async () => {}),
  },
}));

import {
  BUILDINGS,
  GEAR_BUILDING_TYPES,
  TOWN_LOTS,
  TOWN_SHOP_TYPES,
  countBuildingsOfType,
  emptyTownState,
  lotPurchaseBlocker,
  parseTown,
  type PlacedBuilding,
  type TownState,
} from "../hometown";

function townWith(buildings: PlacedBuilding[]): TownState {
  const t = emptyTownState();
  t.maps.town.buildings = buildings;
  return t;
}

function roundTrip(t: TownState): TownState {
  return parseTown(JSON.parse(JSON.stringify(t)));
}

const lotById = (id: string) => TOWN_LOTS.find((l) => l.id === id)!;

/** The lot purchase modal's source slice in app/hometown.tsx. */
function lotModalSource(): string {
  const src = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");
  const start = src.indexOf("{/* Lot purchase modal");
  const end = src.indexOf("{/* Coin-fly overlay", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("gear shops are not lot purchases", () => {
  it("pins the gear-economy type list", () => {
    expect([...GEAR_BUILDING_TYPES].sort()).toEqual(
      ["armory", "clothes-shop", "toolshop", "weaponsmith"].sort()
    );
  });

  it("no gear type is in the flexible lot catalog", () => {
    for (const gear of GEAR_BUILDING_TYPES) {
      expect(TOWN_SHOP_TYPES).not.toContain(gear);
    }
  });

  it("no gear type appears in any town lot's types or preset", () => {
    for (const lot of TOWN_LOTS) {
      for (const gear of GEAR_BUILDING_TYPES) {
        expect(lot.allowedTypes).not.toContain(gear);
        expect(lot.presetType).not.toBe(gear);
      }
    }
  });

  it("the lot sheet offers no gear rows (source guard)", () => {
    const modal = lotModalSource();
    for (const gear of GEAR_BUILDING_TYPES) {
      expect(modal).not.toContain(`"${gear}"`);
    }
  });

  it("the re-pointed lots preset the buildings that replaced the gear shops", () => {
    expect(lotById("town-lot-s5").presetType).toBe("bookstore");
    expect(lotById("town-lot-s7").presetType).toBe("carpenter");
    expect(lotById("town-lot-s8").presetType).toBe("pottery");
    expect(lotById("town-lot-s9").presetType).toBe("tailor");
  });

  it("a gear shop already standing survives the catalog change untouched", () => {
    const armory: PlacedBuilding = {
      id: "arm1", type: "armory", x: 2, y: 6, level: 2, townLotId: "town-lot-s7",
    };
    const loaded = roundTrip(townWith([armory]));
    const b = loaded.maps.town.buildings.find((x) => x.id === "arm1");
    expect(b?.type).toBe("armory");
    expect(b?.level).toBe(2);
    expect(b?.townLotId).toBe("town-lot-s7");
  });
});

describe("the widened flexible catalog", () => {
  it("offers the original food, retail, and services", () => {
    for (const t of [
      "shop", "bakery", "market", "bank", "barbershop",
      "pizza-place", "burger-joint", "taco-stand", "sushi-bar", "diner",
    ] as const) {
      expect(TOWN_SHOP_TYPES).toContain(t);
    }
  });

  it("adds the Bookstore and the Artisans' Row trades", () => {
    for (const t of [
      "bookstore", "carpenter", "pottery", "tailor", "apothecary",
      "music-hall", "observatory",
    ] as const) {
      expect(TOWN_SHOP_TYPES).toContain(t);
    }
    expect(TOWN_SHOP_TYPES).toHaveLength(17);
  });

  it("every catalog type is actually buildable on the town map", () => {
    for (const t of TOWN_SHOP_TYPES) {
      expect(BUILDINGS[t].maps).toContain("town");
    }
  });

  it("the Bookstore reopened with its mall-era numbers", () => {
    expect(BUILDINGS["bookstore"].maps).toContain("town");
    expect(BUILDINGS["bookstore"].cost).toBe(1155);
    expect(BUILDINGS["bookstore"].incomePerDay).toBe(60);
  });

  it("the ministry-conversion types stay out of the catalog (load-heal safety)", () => {
    // inn / bathhouse / town-hall / post-office are LOT_TYPE_REMAP "from"
    // types: an orphan of one converts into its lot's ministry building
    // at load. Offering them on lots would let that heal steal a
    // legitimately purchased building, so they stay unlisted.
    for (const t of ["inn", "bathhouse", "town-hall", "post-office"] as const) {
      expect(TOWN_SHOP_TYPES).not.toContain(t);
    }
  });

  it("flexible lots across town share the widened catalog", () => {
    const flexible = TOWN_LOTS.filter((l) => l.allowedTypes === TOWN_SHOP_TYPES);
    expect(flexible.length).toBeGreaterThanOrEqual(15);
  });

  it("the sheet groups the new types (source guard)", () => {
    const modal = lotModalSource();
    expect(modal).toContain('"Crafts"');
    expect(modal).toContain('"Community"');
    for (const t of ["bookstore", "carpenter", "pottery", "tailor", "apothecary", "music-hall", "observatory"]) {
      expect(modal).toContain(`"${t}"`);
    }
  });
});

describe("owned counts — duplicates marked, never blocked", () => {
  const taco = (id: string, lotId: string, x: number, y: number): PlacedBuilding => ({
    id, type: "taco-stand", x, y, level: 1, townLotId: lotId,
  });
  const threeTacos: PlacedBuilding[] = [
    taco("t1", "town-lot-s11", 0, 12),
    taco("t2", "town-lot-s13", 4, 12),
    taco("t3", "town-lot-s15", 2, 14),
  ];

  it("counts 0, 1, and 3 standing", () => {
    expect(countBuildingsOfType([], "taco-stand")).toBe(0);
    expect(countBuildingsOfType(threeTacos.slice(0, 1), "taco-stand")).toBe(1);
    expect(countBuildingsOfType(threeTacos, "taco-stand")).toBe(3);
    expect(countBuildingsOfType(threeTacos, "sushi-bar")).toBe(0);
  });

  it("a fourth of a type may still be bought on a free lot", () => {
    const freeLot = lotById("town-lot-p1");
    expect(lotPurchaseBlocker(threeTacos, freeLot, "taco-stand")).toBeNull();
  });

  it("occupancy still rules: a built lot refuses any type", () => {
    const shoreLot = lotById("town-lot-s11");
    expect(lotPurchaseBlocker(threeTacos, shoreLot, "taco-stand")).not.toBeNull();
    expect(lotPurchaseBlocker(threeTacos, shoreLot, "bookstore")).not.toBeNull();
  });

  it("rows show the live count badge and the real building art (source guard)", () => {
    const modal = lotModalSource();
    expect(modal).toContain("countBuildingsOfType(map.buildings, type)");
    expect(modal).toContain("In your town ×{ownedCount}");
    expect(modal).toContain("<BuildingArt type={type}");
    // No emoji leads a row or the preset card anymore.
    expect(modal).not.toContain("{def.icon}");
  });
});
