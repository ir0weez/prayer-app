import { describe, expect, it } from "vitest";

import {
  STOCK_CAP_BY_LEVEL,
  STOCK_DRAIN_WINDOW_MINUTES,
  applyRestockBox,
  applyStockDrain,
  neediestStockedBuilding,
  restockBoxUnits,
  stockDrainedOver,
} from "../hometown";
import {
  RESTOCK_BOX_BONUS_COINS,
  advanceRestockArrival,
  createWorkAssignment,
  type VillagerWorkState,
} from "../villager-work";

type B = { id: string; x: number; y: number; type: string; level?: number };
const b = (id: string, x: number, y: number, type: string, level = 1): B => ({ id, x, y, type, level });

describe("restock box math", () => {
  it("one box is 20% of cap at every level", () => {
    for (const cap of Object.values(STOCK_CAP_BY_LEVEL)) {
      expect(restockBoxUnits(cap)).toBe(Math.round(cap * 0.2));
    }
    expect(restockBoxUnits(40)).toBe(8);
    expect(restockBoxUnits(160)).toBe(32);
  });

  it("five boxes fill a building from empty, exactly, at every level", () => {
    for (const cap of Object.values(STOCK_CAP_BY_LEVEL)) {
      let stock = 0;
      for (let i = 0; i < 5; i++) stock = applyRestockBox(stock, cap);
      expect(stock).toBe(cap);
    }
  });

  it("a box delivered near full clamps at capacity", () => {
    expect(applyRestockBox(39, 40)).toBe(40);
    expect(applyRestockBox(40, 40)).toBe(40);
  });
});

describe("daily stock drain (depletion to midnight)", () => {
  it("the window is 06:00 to 24:00 — 1080 minutes", () => {
    expect(STOCK_DRAIN_WINDOW_MINUTES).toBe(18 * 60);
  });

  it("a full building drains to empty across the whole window", () => {
    for (const cap of Object.values(STOCK_CAP_BY_LEVEL)) {
      expect(stockDrainedOver(cap, STOCK_DRAIN_WINDOW_MINUTES)).toBeCloseTo(cap);
      expect(applyStockDrain(cap, cap, STOCK_DRAIN_WINDOW_MINUTES)).toBeCloseTo(0);
    }
  });

  it("half the window drains half the stock, whatever the level", () => {
    expect(applyStockDrain(160, 160, STOCK_DRAIN_WINDOW_MINUTES / 2)).toBeCloseTo(80);
    expect(applyStockDrain(40, 40, STOCK_DRAIN_WINDOW_MINUTES / 2)).toBeCloseTo(20);
    // Drain is proportional to cap, not to current stock: a half-full
    // building still loses cap/2 over half a day — and clamps at zero.
    expect(applyStockDrain(20, 40, STOCK_DRAIN_WINDOW_MINUTES / 2)).toBeCloseTo(0);
  });

  it("drain never takes stock below zero, even over many days", () => {
    expect(applyStockDrain(10, 40, STOCK_DRAIN_WINDOW_MINUTES * 30)).toBe(0);
    expect(applyStockDrain(0, 40, 60)).toBe(0);
  });

  it("an hour of drain on a level-3 shop is cap/18", () => {
    expect(stockDrainedOver(160, 60)).toBeCloseTo(160 / 18);
  });
});

describe("neediestStockedBuilding", () => {
  const town: B[] = [
    b("church", 5, 5, "church"),
    b("diner", 6, 5, "diner"), // L1 cap 40
    b("bakery", 12, 5, "bakery"), // L1 cap 40
    b("shop", 5, 12, "shop", 3), // L3 cap 160
    b("farm", 1, 1, "farm"), // not a stocked type
  ];

  it("picks the lowest stock ratio with room for a box", () => {
    const stock = { diner: 30, bakery: 4, shop: 150 };
    const pick = neediestStockedBuilding(town, stock, { x: 5, y: 5 });
    expect(pick?.id).toBe("bakery"); // 10% beats diner 75%; shop has no room for a box
  });

  it("skips buildings without room for a full box", () => {
    const stock = { diner: 39, bakery: 40, shop: 160 };
    expect(neediestStockedBuilding(town, stock, { x: 5, y: 5 })).toBeNull();
  });

  it("breaks ratio ties by nearest to the origin (the church)", () => {
    const stock = { diner: 20, bakery: 20, shop: 80 }; // all at 50%
    const pick = neediestStockedBuilding(town, stock, { x: 5, y: 5 });
    expect(pick?.id).toBe("diner"); // 1 tile away vs bakery's 7
  });

  it("ignores non-stocked buildings entirely", () => {
    const stock = { farm: 0 };
    expect(neediestStockedBuilding([b("farm", 1, 1, "farm")], stock)).toBeNull();
  });

  it("untracked buildings start at half cap and are eligible", () => {
    const pick = neediestStockedBuilding(town, {}, { x: 5, y: 5 });
    expect(pick).not.toBeNull();
    expect(pick?.type).not.toBe("church");
  });
});

describe("restock route state machine", () => {
  const CHURCH = "church-b";
  const SHOP = "diner-b";

  function freshState(): VillagerWorkState {
    const a = createWorkAssignment({
      personId: "p1",
      personName: "Ruth",
      kind: "restock",
      nowMs: 1_000_000,
    });
    return { assignments: [a] };
  }

  it("a new restock assignment starts heading to the church, counters at zero", () => {
    const a = freshState().assignments[0];
    expect(a.restockLeg).toBe("to-church");
    expect(a.boxesDelivered).toBe(0);
    expect(a.bonusCoins).toBe(0);
    expect(a.status).toBe("en-route");
  });

  it("church arrival with a target picks up a box and heads out", () => {
    const { state, event } = advanceRestockArrival(freshState(), {
      personId: "p1",
      arrivedBuildingId: CHURCH,
      churchBuildingId: CHURCH,
      nextTargetId: SHOP,
    });
    expect(event).toBe("picked-up");
    const a = state.assignments[0];
    expect(a.status).toBe("working");
    expect(a.restockLeg).toBe("to-deliver");
    expect(a.restockTargetId).toBe(SHOP);
  });

  it("church arrival with no target waits at the church (idempotent)", () => {
    const first = advanceRestockArrival(freshState(), {
      personId: "p1",
      arrivedBuildingId: CHURCH,
      churchBuildingId: CHURCH,
      nextTargetId: null,
    });
    expect(first.event).toBe("waiting");
    expect(first.state.assignments[0].status).toBe("working");
    const second = advanceRestockArrival(first.state, {
      personId: "p1",
      arrivedBuildingId: CHURCH,
      churchBuildingId: CHURCH,
      nextTargetId: null,
    });
    expect(second.event).toBe("waiting");
    expect(second.state).toBe(first.state); // same reference — caller skips saving
  });

  it("delivery banks the box bonus and loops back to the church", () => {
    const picked = advanceRestockArrival(freshState(), {
      personId: "p1",
      arrivedBuildingId: CHURCH,
      churchBuildingId: CHURCH,
      nextTargetId: SHOP,
    }).state;
    const { state, event } = advanceRestockArrival(picked, {
      personId: "p1",
      arrivedBuildingId: SHOP,
      churchBuildingId: CHURCH,
      nextTargetId: null,
    });
    expect(event).toBe("delivered");
    const a = state.assignments[0];
    expect(a.boxesDelivered).toBe(1);
    expect(a.bonusCoins).toBe(RESTOCK_BOX_BONUS_COINS);
    expect(a.restockLeg).toBe("to-church");
    expect(a.restockTargetId).toBeUndefined();
  });

  it("arrivals at the wrong building change nothing", () => {
    const st = freshState();
    const { state, event } = advanceRestockArrival(st, {
      personId: "p1",
      arrivedBuildingId: "somewhere-else",
      churchBuildingId: CHURCH,
      nextTargetId: SHOP,
    });
    expect(event).toBeNull();
    expect(state).toBe(st);
  });

  it("a full route loop fills a shop in five boxes, then the worker waits", () => {
    const cap = 40; // L1 diner
    let stock = 0;
    let st = freshState();
    const buildings = [b(SHOP, 8, 5, "diner")];
    for (let round = 0; round < 5; round++) {
      const target = neediestStockedBuilding(buildings, { [SHOP]: stock }, { x: 5, y: 5 });
      expect(target?.id).toBe(SHOP);
      const picked = advanceRestockArrival(st, {
        personId: "p1",
        arrivedBuildingId: CHURCH,
        churchBuildingId: CHURCH,
        nextTargetId: target!.id,
      });
      expect(picked.event).toBe("picked-up");
      const delivered = advanceRestockArrival(picked.state, {
        personId: "p1",
        arrivedBuildingId: SHOP,
        churchBuildingId: CHURCH,
        nextTargetId: null,
      });
      expect(delivered.event).toBe("delivered");
      st = delivered.state;
      stock = applyRestockBox(stock, cap);
    }
    expect(stock).toBe(cap);
    expect(st.assignments[0].boxesDelivered).toBe(5);
    expect(st.assignments[0].bonusCoins).toBe(5 * RESTOCK_BOX_BONUS_COINS);
    expect(neediestStockedBuilding(buildings, { [SHOP]: stock })).toBeNull();
    const waiting = advanceRestockArrival(st, {
      personId: "p1",
      arrivedBuildingId: CHURCH,
      churchBuildingId: CHURCH,
      nextTargetId: null,
    });
    expect(waiting.event).toBe("waiting");
  });

  it("does not touch other work kinds or done assignments", () => {
    const other = createWorkAssignment({
      personId: "p2",
      personName: "Boaz",
      kind: "work-farm",
      nowMs: 1_000_000,
    });
    const st: VillagerWorkState = { assignments: [other] };
    const { state, event } = advanceRestockArrival(st, {
      personId: "p2",
      arrivedBuildingId: CHURCH,
      churchBuildingId: CHURCH,
      nextTargetId: SHOP,
    });
    expect(event).toBeNull();
    expect(state).toBe(st);
  });
});
