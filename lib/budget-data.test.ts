import { describe, expect, it } from "vitest";
import {
  createRecurringExpense,
  getRecurringDueDate,
  materializeRecurringExpenses,
  deleteRecurringSeries,
  normalizeRecurringExpenses,
} from "./budget-data";

describe("budget recurrence helpers", () => {
  it("creates the selected month and future monthly occurrences", () => {
    const start = new Date(2026, 0, 1);
    const template = createRecurringExpense("rent", "Rent", 1200, 15, start);
    const expenses = materializeRecurringExpenses([template], start, 3);

    expect(expenses.map((expense) => expense.dueDate)).toEqual([
      "2026-01-15",
      "2026-02-15",
      "2026-03-15",
    ]);
    expect(new Set(expenses.map((expense) => expense.recurrenceId)).size).toBe(1);
  });

  it("does not duplicate existing occurrences or reset their paid state", () => {
    const start = new Date(2026, 0, 1);
    const template = createRecurringExpense("rent", "Rent", 1200, 15, start);
    const existing = { ...template, id: "rent-2026-02", dueDate: "2026-02-15", isPaid: true };
    const expenses = materializeRecurringExpenses([template, existing], start, 3);

    expect(expenses).toHaveLength(3);
    expect(expenses.find((expense) => expense.dueDate === "2026-02-15")?.isPaid).toBe(true);
  });

  it("leaves one-time expenses unchanged", () => {
    const oneTime = {
      id: "car-repair",
      day: 20,
      name: "Car repair",
      amount: 350,
      isPaid: false,
      dueDate: "2026-01-20",
      isRecurring: false,
    };

    expect(materializeRecurringExpenses([oneTime], new Date(2026, 0, 1), 12)).toEqual([oneTime]);
  });

  it("clamps a recurring bill to the last valid day in shorter months", () => {
    const template = { id: "insurance", name: "Insurance", amount: 80, day: 31, isPaid: false, dueDate: "", isRecurring: true };

    expect(getRecurringDueDate(template, new Date(2026, 1, 1))).toBe("2026-02-28");
    expect(getRecurringDueDate(template, new Date(2028, 1, 1))).toBe("2028-02-29");
  });

  it("deduplicates runaway recurring occurrences and preserves paid state", () => {
    const duplicateA = { id: "rent-2026-01-a", day: 1, name: "Rent", amount: 1200, isPaid: false, dueDate: "2026-01-01", isRecurring: true, recurrenceId: "rent" };
    const duplicateB = { ...duplicateA, id: "rent-2026-01-b", isPaid: true };
    const normalized = normalizeRecurringExpenses([duplicateA, duplicateB]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].isPaid).toBe(true);
    expect(materializeRecurringExpenses([...normalized, duplicateB], new Date(2026, 0, 1), 3)).toHaveLength(3);
  });

  it("deletes every occurrence in a recurring series without touching one-time expenses", () => {
    const recurring = createRecurringExpense("rent", "Rent", 1200, 1, new Date(2026, 0, 1));
    const occurrence = { ...recurring, id: "rent-2026-02", dueDate: "2026-02-01" };
    const oneTime = { id: "phone", day: 5, name: "Phone", amount: 80, isPaid: false, dueDate: "2026-01-05", isRecurring: false };

    expect(deleteRecurringSeries([recurring, occurrence, oneTime], "rent")).toEqual([oneTime]);
  });
});
