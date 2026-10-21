// Paper rollout batch 1 (Jonathan's gate, 2026-10-21: "paper works
// much better. Theme it all to paper.") — the remaining restaurant
// interiors render as paper dioramas. These tests pin: a paper config
// for every cuisine that routes through app/restaurant-interior.tsx,
// the per-cuisine progression ladders (pieces, never recolors), the
// screen wiring per type (paper scene for pizza / burger / diner /
// sushi / upper-room / manna-house / generic, the long-table room
// for the two banquet types, the taco's own paper room untouched),
// and every behavior the rooms host — Serve the Table per type,
// Token Toss at the pizza place, the diner coffee flow.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { RESTAURANT_INTERIOR_TYPES } from "../restaurant-interior";
import {
  PAPER_CUISINES,
  banquetRoomRows,
  banquetSeatPairs,
  paperCuisineFor,
  paperKitchenFor,
  paperKitchenScore,
  paperRoomDressingFor,
  paperRoomScore,
  paperSignatureCount,
  pizzaPartyRows,
  restaurantBoothForTable,
  restaurantRoomRows,
} from "../paper-restaurant";

const readSrc = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const BOOTH_TYPES = ["pizza-place", "burger-joint", "sushi-bar", "diner", "upper-room", "manna-house"] as const;
const BANQUET_TYPES = ["feast-hall", "banquet-table"] as const;

describe("paper cuisine configs", () => {
  it("every restaurant type that routes through the screen has a paper config", () => {
    for (const type of RESTAURANT_INTERIOR_TYPES) {
      if (type === "taco-stand") continue; // the taco keeps its dedicated paper room
      expect(PAPER_CUISINES[type], type).toBeDefined();
      expect(paperCuisineFor(type).id).toBe(type);
    }
    // the taco is NOT in the parameterized set — its own room is the reference
    expect(PAPER_CUISINES["taco-stand"]).toBeUndefined();
  });

  it("booth types are booth scenes, the feast hall and Marriage Supper are banquet scenes", () => {
    for (const t of BOOTH_TYPES) expect(paperCuisineFor(t).scene).toBe("booth");
    for (const t of BANQUET_TYPES) expect(paperCuisineFor(t).scene).toBe("banquet");
    expect(paperCuisineFor("banquet-table").outdoor).toBe(true);
    expect(paperCuisineFor("feast-hall").outdoor).toBeFalsy();
  });

  it("each cuisine keeps its identity: signature, overhead, floor, food", () => {
    expect(paperCuisineFor("pizza-place").signature).toBe("pizza-oven");
    expect(paperCuisineFor("pizza-place").floorKind).toBe("confetti");
    expect(paperCuisineFor("burger-joint").signature).toBe("burger-counter");
    expect(paperCuisineFor("burger-joint").floorKind).toBe("white-tile");
    expect(paperCuisineFor("burger-joint").wall).toBe("#FFFFFF"); // the one LIGHT room
    expect(paperCuisineFor("sushi-bar").signature).toBe("sushi-counter");
    expect(paperCuisineFor("sushi-bar").overhead).toBe("lanterns");
    expect(paperCuisineFor("diner").signature).toBe("pie-case");
    expect(paperCuisineFor("diner").floorKind).toBe("checker-wood");
    expect(paperCuisineFor("diner").food).toBe("pie");
    expect(paperCuisineFor("upper-room").signature).toBe("communion");
    expect(paperCuisineFor("upper-room").candlelit).toBe(true);
    expect(paperCuisineFor("manna-house").signature).toBe("bread-oven");
    expect(paperCuisineFor("feast-hall").signature).toBe("goblet-shelf");
    expect(paperCuisineFor("banquet-table").signature).toBe("garland");
    expect(paperCuisineFor("banquet-table").overhead).toBe("stars");
  });

  it("unknown cuisines fall back to the generic candlelit room", () => {
    const g = paperCuisineFor("some-future-restaurant");
    expect(g.id).toBe("generic");
    expect(g.scene).toBe("booth");
    expect(g.signature).toBe("hearth");
  });

  it("every config carries a full cloth ladder and cushion ladder", () => {
    for (const cfg of [...Object.values(PAPER_CUISINES), paperCuisineFor("unknown")]) {
      expect(cfg.cloth.length, cfg.id).toBe(4);
      expect(cfg.cloth[0]).toBe("");
      expect(cfg.cushions.length, cfg.id).toBe(4);
      expect(cfg.wall).toMatch(/^#/);
      expect(cfg.floor).toMatch(/^#/);
    }
  });
});

describe("per-cuisine ladders only ever ADD pieces", () => {
  const allConfigs = () => [...Object.values(PAPER_CUISINES), paperCuisineFor("unknown")];

  it("the combined room score strictly climbs the (level, kitchen) diagonal for every cuisine", () => {
    for (const cfg of allConfigs()) {
      const total = (level: number, kitchenTier: number, lights: number, art: number) =>
        paperRoomScore(paperRoomDressingFor(cfg, level, lights, art)) +
        paperKitchenScore(paperKitchenFor(kitchenTier)) +
        paperSignatureCount(cfg, level, kitchenTier);
      const low = total(1, 0, 0, 0);
      const mid = total(2, 1, 1, 1);
      const high = total(3, 3, 3, 1);
      expect(mid, `${cfg.id} L1→L2`).toBeGreaterThan(low);
      expect(high, `${cfg.id} L2→L3`).toBeGreaterThan(mid);
    }
  });

  it("the kitchen ladder strictly climbs tier by tier", () => {
    const scores = [0, 1, 2, 3].map((t) => paperKitchenScore(paperKitchenFor(t)));
    expect(scores[1]).toBeGreaterThan(scores[0]);
    expect(scores[2]).toBeGreaterThan(scores[1]);
    expect(scores[3]).toBeGreaterThan(scores[2]);
    // structural steps, named: paneled → tiled front, steam, hanging, ready row
    expect(paperKitchenFor(0).front).toBe("planks");
    expect(paperKitchenFor(1).front).toBe("paneled");
    expect(paperKitchenFor(2).front).toBe("tiled");
    expect(paperKitchenFor(1).steam).toBe(true);
    expect(paperKitchenFor(2).hanging).toBe(true);
    expect(paperKitchenFor(3).readyRow).toBe(true);
  });

  it("level dressing never shrinks as level, lights or art tiers rise", () => {
    for (const cfg of allConfigs()) {
      const byLevel = [1, 2, 3].map((lv) => paperRoomScore(paperRoomDressingFor(cfg, lv, 0, 0)));
      expect(byLevel[1], cfg.id).toBeGreaterThan(byLevel[0]);
      expect(byLevel[2], cfg.id).toBeGreaterThan(byLevel[1]);
      const withLights = paperRoomScore(paperRoomDressingFor(cfg, 1, 3, 0));
      const noLights = paperRoomScore(paperRoomDressingFor(cfg, 1, 0, 0));
      expect(withLights, cfg.id).toBeGreaterThan(noLights);
      // wall art needs the wall-art furniture tier, as the drawn rooms did
      expect(paperRoomDressingFor(cfg, 2, 0, 0).wallArt).toBe(false);
      expect(paperRoomDressingFor(cfg, 2, 0, 1).wallArt).toBe(true);
      // chandeliers and sconces belong to candlelit rooms only
      if (!cfg.candlelit) {
        expect(paperRoomDressingFor(cfg, 3, 3, 1).chandelier).toBe(0);
        expect(paperRoomDressingFor(cfg, 3, 3, 1).sconces).toBe(false);
      }
    }
  });

  it("signature piece counts never shrink across level or kitchen tier", () => {
    for (const cfg of allConfigs()) {
      for (let lv = 1; lv <= 3; lv++) {
        for (let kt = 0; kt <= 3; kt++) {
          if (lv < 3) expect(paperSignatureCount(cfg, lv + 1, kt), cfg.id).toBeGreaterThanOrEqual(paperSignatureCount(cfg, lv, kt));
          if (kt < 3) expect(paperSignatureCount(cfg, lv, kt + 1), cfg.id).toBeGreaterThanOrEqual(paperSignatureCount(cfg, lv, kt));
        }
      }
    }
    // the diner's pie case: 2 → 3 → 4 pies by level, the drawn ladder
    expect(paperSignatureCount(paperCuisineFor("diner"), 1, 0)).toBe(2);
    expect(paperSignatureCount(paperCuisineFor("diner"), 2, 0)).toBe(3);
    expect(paperSignatureCount(paperCuisineFor("diner"), 3, 0)).toBe(4);
  });

  it("geometry: party rows, booth bands and banquet seats grow structurally", () => {
    expect(pizzaPartyRows({ stage: 0, arcade: 0, prize: 0 })).toBe(0);
    expect(pizzaPartyRows({ stage: 1, arcade: 0, prize: 0 })).toBe(17);
    expect(pizzaPartyRows({ stage: 1, arcade: 1, prize: 1 })).toBe(43);
    expect(restaurantRoomRows(50, 4)).toBeGreaterThan(restaurantRoomRows(50, 2));
    expect(restaurantBoothForTable(0, 50).side).toBe("left");
    expect(restaurantBoothForTable(1, 50).side).toBe("right");
    expect(restaurantBoothForTable(2, 50).band).toBe(1);
    expect(banquetSeatPairs(0)).toBe(1);
    expect(banquetSeatPairs(5)).toBe(3);
    expect(banquetRoomRows(9)).toBeGreaterThan(banquetRoomRows(2));
  });
});

describe("wiring — the restaurant screen renders paper for every type", () => {
  const screen = readSrc("app/restaurant-interior.tsx");
  const room = readSrc("components/paper-restaurant-room.tsx");
  const banquet = readSrc("components/paper-banquet-room.tsx");

  it("the branch is three-way: taco room, banquet room, restaurant room", () => {
    expect(screen).toContain('cuisine === "taco-stand" ? (');
    expect(screen).toContain("<PaperTacoRoom");
    expect(screen).toContain(") : isBanquet ? (");
    expect(screen).toContain("<PaperBanquetRoom");
    expect(screen).toContain("<PaperRestaurantRoom");
    expect(screen).toContain("config={paperCuisineFor(cuisine)}");
    // atmosphere + the gathering float wrap every branch, as before
    expect(screen).toContain("<InteriorAtmosphere");
    expect(screen).toContain("<BreakingBreadFloat />");
  });

  it("the banquet branch hands the room the RAW diner list (it slices evens/odds itself)", () => {
    expect(screen).toContain("diners={diners}");
    expect(banquet).toContain("diners.filter((_, i) => i % 2 === 0)");
    expect(banquet).toContain("diners.filter((_, i) => i % 2 === 1)");
    // drawn plates capped at ten, as the drawn BanquetTable capped them
    expect(banquet).toContain("plateCount");
    expect(banquet).toContain("Math.min(Math.max(pairs, 2), 10)");
  });

  it("the booth branch keeps the screen's exact diner distribution and table counts", () => {
    expect(screen).toContain("tableDiners={tableDiners}");
    expect(screen).toContain("diners.forEach((p, i) => tableDiners[i % tableCount].push(p))");
    expect(screen).toContain("bLevel >= 3 ? 4 : bLevel >= 2 ? 3 : 2");
    // the kit's seat slicing inside the room, identical to the cantina's
    expect(room).toContain("group.slice(0, pawnFirst ? 1 : 2)");
    expect(room).toContain("group.slice(2, 4)");
  });

  it("the drawn cuisine scene is gone from the screen (components stay in the repo)", () => {
    for (const gone of [
      "<DiningTable",
      "<BanquetTable",
      "CuisineSignature",
      "CuisineOverhead",
      "CuisineFloor",
      "CuisineWallDecor",
      "CuisineCenterpiece",
      "DinerCoffeeStation",
      "AnimatronicStage",
      "ArcadeCabinetRow",
      "PrizeCounter",
      "KitchenCounter",
      "BanquetDressing",
    ]) {
      expect(screen, gone).not.toContain(gone);
    }
  });

  it("pizza keeps its party features: tiers flow to the paper band, features stay functional", () => {
    expect(screen).toContain('pizzaTiers={cuisine === "pizza-place" ? { stageTier, arcadeTier, prizeTier } : undefined}');
    expect(room).toContain("paintPizzaPartyBand");
    expect(room).toContain("arcadeCabinetsForTier");
    expect(screen).toContain("PIZZA_FEATURES");
    expect(screen).toContain("setPizza(await loadPizzaFeatures(buildingId))");
    expect(screen).toContain("pizzaFeaturesBonusPct(pizza)");
  });

  it("the hero renders through the paper kit in both new rooms — clothes, hair, beard", () => {
    expect(room).toContain("PaperHeroFigure");
    expect(banquet).toContain("PaperHeroFigure");
    expect(room).toContain("PaperSeatedDiner");
    expect(banquet).toContain("PaperSeatedDiner");
    expect(room).toContain("loadCustomPawn");
    expect(banquet).toContain("loadCustomPawn");
  });

  it("the diner's coffee portrait lives in the paper room (decanters, both bands)", () => {
    expect(room).toContain('config.id === "diner"');
    expect(room).toContain("#7A4A21"); // regular band
    expect(room).toContain("#E67E22"); // decaf band
  });
});

describe("game hosting is preserved exactly", () => {
  const screen = readSrc("app/restaurant-interior.tsx");

  it("Serve the Table hosts per type, below the scene", () => {
    expect(screen).toContain('useMiniGameHost("serve"');
    expect(screen).toContain("<ServeGame");
    expect(screen).toContain("cuisine={cuisine}");
  });

  it("Token Toss stays at the pizza place, gated on the arcade tier", () => {
    expect(screen).toContain('useMiniGameHost("arcade"');
    expect(screen).toContain("<TokenTossGame");
    expect(screen).toContain("arcadeTier >= 1");
  });

  it("the diner coffee flow is wired through the lib, exactly as before", () => {
    expect(screen).toContain("recordCoffeePurchase()");
    expect(screen).toContain("grantCoffeeEnergy()");
    expect(screen).toContain("coffeesLeftToday");
    expect(screen).toContain("CoffeeSteamBurst");
  });
});
