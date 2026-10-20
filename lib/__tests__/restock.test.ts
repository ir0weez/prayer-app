import { describe, expect, it } from "vitest";

import {
  STOCKED_INCOME_MULT,
  STOCK_CAP_BY_LEVEL,
  anchoredStockAt,
  applyRestockBox,
  currentStockForBuilding,
  endOfLocalDayMs,
  isStockedToday,
  localDateStr,
  neediestStockedBuilding,
  restockBoxUnits,
  stockMultiplierFor,
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

describe("anchored stock drain (empties at midnight, from whenever filled)", () => {
  // Local-time instants on an arbitrary day.
  const at = (h: number, min = 0, dayOffset = 0) => {
    const d = new Date(2026, 9, 20 + dayOffset, h, min, 0, 0);
    return d.getTime();
  };

  it("endOfLocalDayMs is the coming 24:00 of the same local day", () => {
    expect(endOfLocalDayMs(at(9))).toBe(at(0, 0, 1));
    expect(endOfLocalDayMs(at(23, 59))).toBe(at(0, 0, 1));
    expect(endOfLocalDayMs(at(0))).toBe(at(0, 0, 1));
  });

  it("filled at 20:00 is empty at 24:00 the same night", () => {
    expect(anchoredStockAt(160, at(20), at(0, 0, 1))).toBe(0); // next 00:00
    expect(anchoredStockAt(160, at(20), at(23, 59))).toBeGreaterThan(0);
  });

  it("filled at 09:00 is also empty at 24:00 — later fills just drain faster", () => {
    expect(anchoredStockAt(160, at(9), at(0, 0, 1))).toBe(0);
    // Same instant (21:00): the 09:00 fill has been draining for 12 hours,
    // the 20:00 fill for one — but both stand empty at 24:00.
    expect(anchoredStockAt(160, at(9), at(21))).toBeLessThan(anchoredStockAt(160, at(20), at(21)));
  });

  it("the drain is linear: the midpoint of the remaining day holds half", () => {
    // 09:00 fill: midpoint of 09:00→24:00 is 16:30.
    expect(anchoredStockAt(160, at(9), at(16, 30))).toBeCloseTo(80);
    // 20:00 fill: midpoint of 20:00→24:00 is 22:00.
    expect(anchoredStockAt(160, at(20), at(22))).toBeCloseTo(80);
    // A partial fill drains proportionally from its own level.
    expect(anchoredStockAt(40, at(9), at(16, 30))).toBeCloseTo(20);
  });

  it("at/before the anchor the full anchored level stands; empty stays empty", () => {
    expect(anchoredStockAt(160, at(9), at(9))).toBe(160);
    expect(anchoredStockAt(160, at(9), at(8))).toBe(160); // clock skew guard
    expect(anchoredStockAt(0, at(9), at(12))).toBe(0);
  });

  it("a fill after midnight anchors to the NEXT midnight", () => {
    const fill = at(0, 30, 1); // 00:30 on the next day
    expect(anchoredStockAt(160, fill, at(0, 0, 1))).toBe(160);
    expect(anchoredStockAt(160, fill, at(12, 15, 1))).toBeCloseTo(80); // midpoint 00:30→24:00
    expect(anchoredStockAt(160, fill, at(0, 0, 2))).toBe(0);
  });

  it("re-anchoring mid-drain at the current level changes nothing", () => {
    const t = at(14);
    const cur = anchoredStockAt(160, at(9), t);
    expect(anchoredStockAt(cur, t, at(20))).toBeCloseTo(anchoredStockAt(160, at(9), at(20)));
    expect(anchoredStockAt(cur, t, at(0, 0, 1))).toBe(0);
  });

  it("currentStockForBuilding follows the anchor when one exists", () => {
    const anchors = { diner: { stock: 160, atMs: at(9) } };
    const stored = { diner: 160 };
    expect(currentStockForBuilding(stored, anchors, "diner", 3, at(16, 30))).toBeCloseTo(80);
    expect(currentStockForBuilding(stored, anchors, "diner", 3, at(0, 0, 1))).toBe(0);
  });

  it("currentStockForBuilding without an anchor stands at the stored level (old saves)", () => {
    const stored = { diner: 33 };
    expect(currentStockForBuilding(stored, {}, "diner", 3, at(18))).toBe(33);
    expect(currentStockForBuilding(stored, undefined, "diner", 3, at(18))).toBe(33);
    // Untracked buildings still seed at half cap.
    expect(currentStockForBuilding({}, {}, "diner", 1, at(18))).toBe(20);
  });
});

describe("stocked switch (bonus is on/off, not a ramp)", () => {
  const at = (h: number, dayOffset = 0) => new Date(2026, 9, 20 + dayOffset, h, 0, 0, 0).getTime();
  const today = localDateStr(new Date(at(12)));
  const yesterday = localDateStr(new Date(at(12, -1)));

  it("99% stocked earns no bonus; 100% turns the switch on", () => {
    // The switch is the persisted stocked-date, set when a delivery (or a
    // materialization) sees the level reach cap — levels alone never pay.
    expect(stockMultiplierFor(isStockedToday({}, "diner", at(12)))).toBe(1);
    expect(stockMultiplierFor(isStockedToday({ diner: yesterday }, "diner", at(12)))).toBe(1);
    expect(stockMultiplierFor(isStockedToday({ diner: today }, "diner", at(12)))).toBe(STOCKED_INCOME_MULT);
    expect(STOCKED_INCOME_MULT).toBe(1.5);
  });

  it("once on, the switch stays on while the level drains the same day", () => {
    const anchors = { diner: { stock: 160, atMs: at(9) } };
    const stockedDates = { diner: today };
    // By 21:00 the level has drained to 20% of the 09:00 fill...
    const level = currentStockForBuilding({ diner: 160 }, anchors, "diner", 3, at(21));
    expect(level / 160).toBeCloseTo(0.2);
    // ...but the bonus is still on.
    expect(isStockedToday(stockedDates, "diner", at(21))).toBe(true);
    expect(stockMultiplierFor(isStockedToday(stockedDates, "diner", at(21)))).toBe(1.5);
  });

  it("the switch turns off the next day (and the stock is empty)", () => {
    const stockedDates = { diner: today };
    expect(isStockedToday(stockedDates, "diner", at(0, 1))).toBe(false);
    expect(stockMultiplierFor(isStockedToday(stockedDates, "diner", at(9, 1)))).toBe(1);
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
