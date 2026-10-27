import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getBudgetDaysLate,
  getBudgetNextDue,
  type MonthlyExpenseRecord,
} from "../budget-data";
import { deriveBudgetMaterial, BUDGET_LATE_RED, BUDGET_PAID_GREEN } from "../budget-material";
import { hexContrast } from "../skin-themes";

// v286 "Budget, To the Approved Blend" — pins for the next-due rule,
// the days-late derivation, the derived Material family, and the
// screen's structure (the audit map's landmines: storage untouched,
// formatting kept in the screen, no pinned mockup hexes).

const bill = (partial: Partial<MonthlyExpenseRecord>): MonthlyExpenseRecord => ({
  id: "b1",
  day: 15,
  name: "Bill",
  amount: 100,
  isPaid: false,
  dueDate: "2026-10-15",
  ...partial,
});

describe("v286 next-due rule", () => {
  const october = new Date(2026, 9, 1);
  const today = new Date(2026, 9, 20); // Oct 20, 2026 local

  it("picks the earliest unpaid bill due today or later in the viewed month", () => {
    const expenses = [
      bill({ id: "past", dueDate: "2026-10-05", day: 5 }),
      bill({ id: "soon", dueDate: "2026-10-28", day: 28 }),
      bill({ id: "later", dueDate: "2026-10-30", day: 30 }),
    ];
    expect(getBudgetNextDue(expenses, october, today)?.id).toBe("soon");
  });

  it("a bill due exactly today counts", () => {
    const expenses = [bill({ id: "today", dueDate: "2026-10-20", day: 20 })];
    expect(getBudgetNextDue(expenses, october, today)?.id).toBe("today");
  });

  it("falls back to the earliest unpaid bill when all are past", () => {
    const expenses = [
      bill({ id: "later-past", dueDate: "2026-10-10", day: 10 }),
      bill({ id: "earliest-past", dueDate: "2026-10-02", day: 2 }),
    ];
    expect(getBudgetNextDue(expenses, october, today)?.id).toBe("earliest-past");
  });

  it("skips paid bills and bills outside the viewed month", () => {
    const expenses = [
      bill({ id: "paid", dueDate: "2026-10-25", day: 25, isPaid: true }),
      bill({ id: "november", dueDate: "2026-11-25", day: 25 }),
      bill({ id: "real", dueDate: "2026-10-26", day: 26 }),
    ];
    expect(getBudgetNextDue(expenses, october, today)?.id).toBe("real");
  });

  it("returns null when nothing in the month is unpaid", () => {
    const expenses = [bill({ id: "paid", isPaid: true })];
    expect(getBudgetNextDue(expenses, october, today)).toBeNull();
    expect(getBudgetNextDue([], october, today)).toBeNull();
  });
});

describe("v286 days-late derivation", () => {
  const today = new Date(2026, 9, 27); // Oct 27, 2026 local

  it("counts whole days past due", () => {
    expect(getBudgetDaysLate(bill({ dueDate: "2026-10-24" }), today)).toBe(3);
    expect(getBudgetDaysLate(bill({ dueDate: "2026-10-26" }), today)).toBe(1);
  });

  it("is 0 when due today or later, and survives a malformed date", () => {
    expect(getBudgetDaysLate(bill({ dueDate: "2026-10-27" }), today)).toBe(0);
    expect(getBudgetDaysLate(bill({ dueDate: "2026-11-02" }), today)).toBe(0);
    expect(getBudgetDaysLate(bill({ dueDate: "" }), today)).toBe(0);
  });
});

describe("v286 budget material derivation", () => {
  const palettes = [
    { background: "#171126", surface: "#20183D", foreground: "#EDEAF6", muted: "#A79FC4", border: "#2C2150" },
    { background: "#FAF7FF", surface: "#FFFFFF", foreground: "#1D1533", muted: "#5E5680", border: "#DDD5F5" },
  ];

  it("keeps every ink at or above the 4.5:1 floor on its own surface", () => {
    for (const tokens of palettes) {
      const bm = deriveBudgetMaterial("#7C3AED", tokens);
      expect(hexContrast(bm.ink, bm.card)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(bm.inkSoft, bm.card)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(bm.tonalInk, bm.tonal)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(bm.heroInk, bm.hero)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(bm.heroInkSoft, bm.hero)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(bm.lateInk, bm.card)).toBeGreaterThanOrEqual(4.5);
      expect(hexContrast(bm.deep, bm.card)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("follows the seed: a different seed yields a different hero and tonal", () => {
    const tokens = palettes[0];
    const violet = deriveBudgetMaterial("#7C3AED", tokens);
    const green = deriveBudgetMaterial("#16A34A", tokens);
    expect(violet.hero).not.toBe(green.hero);
    expect(violet.tonal).not.toBe(green.tonal);
    expect(violet.seed).toBe("#7C3AED");
  });

  it("the meaning constants never follow the seed", () => {
    const bm = deriveBudgetMaterial("#16A34A", palettes[0]);
    expect(bm.paidGreen).toBe(BUDGET_PAID_GREEN);
    expect(BUDGET_PAID_GREEN).toBe("#22C55E");
    expect(BUDGET_LATE_RED).toBe("#EF4444");
  });
});

describe("v286 budget screen structure", () => {
  const screen = readFileSync(join(__dirname, "../../app/budget-tracker.tsx"), "utf8");

  it("wears the approved blend: hero, mini strip, sections, prominent toggle", () => {
    expect(screen).toContain("LEFT TO PAY");
    expect(screen).toContain("NEXT DUE");
    expect(screen).toContain("STILL TO PAY");
    expect(screen).toContain("↻ Repeats monthly");
    expect(screen).toContain("↻ MONTHLY");
    expect(screen).toContain("useBudgetMaterial");
  });

  it("keeps the engine and the data contract byte-identical", () => {
    expect(screen).toContain("const BUDGET_STORAGE_KEY = 'monthlyBudgetExpenses'");
    expect(screen).toContain("createRecurringExpense");
    expect(screen).toContain("materializeRecurringExpenses");
    expect(screen).toContain("deleteRecurringSeries");
    expect(screen).toContain("syncBudgetReminderNotifications");
  });

  it("totals come from the lib's string-prefix helper, not screen date parsing", () => {
    expect(screen).toContain("getBudgetMonthTotals");
    expect(screen).not.toContain("new Date(exp.dueDate)");
    expect(screen).not.toContain("getExpensesForDay");
  });

  it("carries no pinned mockup hexes and keeps the skin wired", () => {
    for (const hex of ["#2A1E52", "#8B7CF6", "#171126", "#20183D", "#33255F", "#3FA46A"]) {
      expect(screen).not.toContain(hex);
    }
    expect(screen).toContain("useSkin");
    expect(screen).toContain("isSkinned");
  });
});
