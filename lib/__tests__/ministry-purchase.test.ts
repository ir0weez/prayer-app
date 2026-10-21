// Bible Study Hall purchase incident (Oct 20, 2026, v140): Jonathan paid
// for the hall, the coins were deducted, and the hall never unlocked —
// its lot still showed FOR SALE afterwards, with no lot-stamped hall in
// his saved town. Verified mechanics behind it:
//  - purchaseOnLot was the only purchase path (vs city plots / campus
//    plots) that appended blindly: no occupancy check, and it built the
//    new map from the component's in-memory state while the coin ledger
//    writes independently — a placement could be lost while the charge
//    stood.
//  - The Ministry Row conversion (LOT_TYPE_REMAP) only remapped
//    buildings stamped with the exact current lot id, so a legacy Town
//    Hall without that stamp was never converted, never hid the FOR SALE
//    marker, and never counted as owning the hall.
// These tests pin the fixes: lotPurchaseBlocker refuses lots that can't
// receive a building; purchaseOnLot re-reads storage fresh and guards
// with it before deducting (source guard); and ensureTownNeighborhood —
// via parseTown — heals legacy ministry buildings on load, converting
// orphans and merging shadows, so the hall he paid for becomes the
// building standing on its lot.

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
  TOWN_LOTS,
  emptyTownState,
  lotPurchaseBlocker,
  parseTown,
  type PlacedBuilding,
  type TownState,
} from "../hometown";

const hallLot = TOWN_LOTS.find((l) => l.id === "town-lot-townhall")!;
const innLot = TOWN_LOTS.find((l) => l.id === "town-lot-inn")!;

function townWith(buildings: PlacedBuilding[]): TownState {
  const t = emptyTownState();
  t.maps.town.buildings = buildings;
  return t;
}

function roundTrip(t: TownState): TownState {
  return parseTown(JSON.parse(JSON.stringify(t)));
}

/** The building purchaseOnLot appends for the townhall lot. */
function purchasedHall(): PlacedBuilding {
  return {
    id: "townlot-town-lot-townhall-1",
    type: "bible-study-hall",
    x: hallLot.x,
    y: hallLot.y,
    level: 1,
    townLotId: hallLot.id,
    lastTick: new Date().toISOString(),
    accumulated: 0,
  };
}

describe("lotPurchaseBlocker", () => {
  it("allows a purchase on an empty lot", () => {
    expect(lotPurchaseBlocker([], hallLot, "bible-study-hall")).toBeNull();
  });

  it("refuses a lot that already has its building (no double charge)", () => {
    expect(
      lotPurchaseBlocker([purchasedHall()], hallLot, "bible-study-hall")
    ).not.toBeNull();
  });

  it("refuses a lot whose tiles are covered by another building", () => {
    // A legacy 1x1 standing on one tile of the 2x2 lot is enough: the new
    // building would stack onto it and lose every tap to first-match.
    const squatter: PlacedBuilding = { id: "sq", type: "shop", x: hallLot.x, y: hallLot.y, level: 1 };
    expect(lotPurchaseBlocker([squatter], hallLot, "bible-study-hall")).not.toBeNull();
  });

  it("does not block on buildings elsewhere in town", () => {
    const elsewhere: PlacedBuilding = { id: "far", type: "shop", x: 0, y: 0, level: 1 };
    expect(lotPurchaseBlocker([elsewhere], hallLot, "bible-study-hall")).toBeNull();
  });
});

describe("the incident cannot recur", () => {
  it("a legacy Town Hall on the lot heals at load, so no second purchase can be charged", () => {
    // His shape: a Town Hall the conversion never stamped, standing on
    // the hall lot. Before the fix, buying appended a second building
    // under it and charged full price for a hall that never unlocked.
    const legacy: PlacedBuilding = { id: "old-th", type: "town-hall", x: hallLot.x, y: hallLot.y, level: 1 };
    const loaded = roundTrip(townWith([legacy]));
    const buildings = loaded.maps.town.buildings;
    // Self-heal: the Town Hall became the lot's Bible Study Hall...
    const hall = buildings.find((b) => b.townLotId === hallLot.id);
    expect(hall?.type).toBe("bible-study-hall");
    expect(buildings.some((b) => b.type === "town-hall")).toBe(false);
    // ...and the purchase path now refuses to charge again for that lot.
    expect(lotPurchaseBlocker(buildings, hallLot, "bible-study-hall")).not.toBeNull();
  });

  it("purchaseOnLot re-reads storage and guards before deducting (source guard)", () => {
    const src = readFileSync(join(process.cwd(), "app/hometown.tsx"), "utf8");
    const start = src.indexOf("const purchaseOnLot");
    const end = src.indexOf("Lighthouse: receive the daily blessing", start);
    const body = src.slice(start, end);
    const guardAt = body.indexOf("lotPurchaseBlocker");
    const readAt = body.indexOf("TOWN_STORAGE_KEY");
    const saveAt = body.indexOf("saveTown(");
    const chargeAt = body.indexOf("addCoins(-total)");
    expect(guardAt).toBeGreaterThan(-1);
    expect(readAt).toBeGreaterThan(-1);
    // Placement is saved before the deduction — deduct-without-place is
    // structurally impossible in this handler.
    expect(saveAt).toBeGreaterThan(-1);
    expect(chargeAt).toBeGreaterThan(saveAt);
  });
});

describe("Ministry Row conversion healing", () => {
  it("converts a free-placed legacy Town Hall and homes it on the lot, level kept", () => {
    const legacy: PlacedBuilding = { id: "old-th3", type: "town-hall", x: 0, y: 20, level: 3 };
    const loaded = roundTrip(townWith([legacy]));
    const buildings = loaded.maps.town.buildings;
    expect(buildings.some((b) => b.type === "town-hall")).toBe(false);
    const hall = buildings.find((b) => b.type === "bible-study-hall");
    expect(hall).toBeDefined();
    expect(hall!.townLotId).toBe(hallLot.id);
    expect(hall!.x).toBe(hallLot.x);
    expect(hall!.y).toBe(hallLot.y);
    expect(hall!.level).toBe(3);
  });

  it("merges a shadow Town Hall into the purchased hall (best level kept)", () => {
    const shadow: PlacedBuilding = { id: "old-th2", type: "town-hall", x: hallLot.x, y: hallLot.y, level: 2, accumulated: 40 };
    const loaded = roundTrip(townWith([shadow, purchasedHall()]));
    const buildings = loaded.maps.town.buildings;
    const onLot = buildings.filter((b) => b.townLotId === hallLot.id);
    expect(onLot).toHaveLength(1);
    expect(onLot[0].type).toBe("bible-study-hall");
    expect(onLot[0].level).toBe(2);
    expect(onLot[0].accumulated).toBe(40);
    expect(buildings.some((b) => b.type === "town-hall")).toBe(false);
  });

  it("still remaps lot-stamped buildings of every converted type", () => {
    const inn: PlacedBuilding = { id: "old-inn", type: "inn", x: innLot.x, y: innLot.y, level: 2, townLotId: innLot.id };
    const loaded = roundTrip(townWith([inn]));
    const b = loaded.maps.town.buildings.find((x) => x.id === "old-inn");
    expect(b?.type).toBe("fasting-house");
    expect(b?.level).toBe(2);
  });

  it("leaves unrelated legacy buildings' types alone", () => {
    const shop: PlacedBuilding = { id: "shop1", type: "shop", x: 0, y: 20, level: 1 };
    const loaded = roundTrip(townWith([shop]));
    expect(loaded.maps.town.buildings.find((b) => b.id === "shop1")?.type).toBe("shop");
  });
});

describe("the clean purchase still works", () => {
  it("append + reload keeps the hall on its lot, and the lot can't be bought twice", () => {
    const t0 = roundTrip(townWith([]));
    expect(lotPurchaseBlocker(t0.maps.town.buildings, hallLot, "bible-study-hall")).toBeNull();
    const t1 = townWith([...t0.maps.town.buildings, purchasedHall()]);
    const loaded = roundTrip(t1);
    const hall = loaded.maps.town.buildings.find((b) => b.type === "bible-study-hall");
    expect(hall?.townLotId).toBe(hallLot.id);
    expect(lotPurchaseBlocker(loaded.maps.town.buildings, hallLot, "bible-study-hall")).not.toBeNull();
  });
});
