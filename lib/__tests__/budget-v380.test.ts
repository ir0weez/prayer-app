import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createRecurringExpense,
  editExpense,
  materializeRecurringExpenses,
  normalizeRecurringExpenses,
  type MonthlyExpenseRecord,
} from "../budget-data";

// v380 "Hold to edit" — the Budget bill editor. Pins: the row's
// hold opens the Add sheet in Edit mode prefilled (tap still
// toggles paid), and the lib's editExpense applies edits through
// the record layer — in place for a one-off, forward-only for a
// series, detach-forward when recurrence is switched off.

/** The load pipeline loadExpenses runs, minus AsyncStorage. */
const load = (stored: MonthlyExpenseRecord[], month: Date): MonthlyExpenseRecord[] =>
  materializeRecurringExpenses(
    normalizeRecurringExpenses(JSON.parse(JSON.stringify(stored)) as MonthlyExpenseRecord[]),
    month,
    12,
  );

/** Jan–Jun 2026 of a day-15 "Rent" series; Jan and Mar marked paid. */
const seriesFixture = (): MonthlyExpenseRecord[] => {
  const template = createRecurringExpense("rent", "Rent", 1200, 15, new Date(2026, 0, 1));
  const expenses = materializeRecurringExpenses([template], new Date(2026, 0, 1), 6);
  return expenses.map((expense) =>
    expense.dueDate === "2026-01-15" || expense.dueDate === "2026-03-15"
      ? { ...expense, isPaid: true }
      : expense,
  );
};

const byDueDate = (expenses: MonthlyExpenseRecord[], dueDate: string) =>
  expenses.find((expense) => expense.dueDate === dueDate);

describe("v380 bill editor — screen wiring", () => {
  const screen = readFileSync(join(__dirname, "../../app/budget-tracker.tsx"), "utf8");

  it("hold opens the editor; tap still toggles paid", () => {
    expect(screen).toContain("onLongPress={() => openEditSheet(expense)}");
    expect(screen).toContain("onPress={() => toggleExpensePaid(expense.id)}");
  });

  it("the editor is the Add sheet in Edit mode, prefilled from the bill", () => {
    expect(screen).toContain("editingExpense ? 'Edit bill' : 'Add a bill'");
    expect(screen).toContain("editingExpense ? 'Save' : 'Add bill'");
    expect(screen).toContain("setFormName(expense.name)");
    expect(screen).toContain("setFormAmount(String(expense.amount))");
    expect(screen).toContain("setSelectedDay(expense.day)");
    expect(screen).toContain("setIsRecurring(!!expense.isRecurring)");
  });

  it("saving an edit goes through the lib, never screen-local mutation", () => {
    expect(screen).toContain("editExpense(expenses, editingExpense.id");
  });

  it("create and delete flows are untouched", () => {
    expect(screen).toContain("createRecurringExpense(id, formName.trim(), amount, selectedDay, currentMonth)");
    expect(screen).toContain("deleteRecurringSeries(expenses, expense.recurrenceId ?? expense.id)");
    expect(screen).toContain("saveExpenses(removeExpense(expenses, expense.id))");
  });
});

describe("v380 editExpense — one-off bills", () => {
  const oneOff: MonthlyExpenseRecord = {
    id: "phone",
    day: 15,
    name: "Phone",
    amount: 80,
    isPaid: true,
    dueDate: "2026-10-15",
    isRecurring: false,
  };

  it("updates name, amount and due day in place, and never unpays", () => {
    const [edited] = editExpense([oneOff], "phone", {
      name: "Phone bill",
      amount: 95.5,
      day: 20,
      isRecurring: false,
    });
    expect(edited).toEqual({ ...oneOff, name: "Phone bill", amount: 95.5, day: 20, dueDate: "2026-10-20" });
  });

  it("clamps the due day the way the create path does", () => {
    const february = { ...oneOff, dueDate: "2026-02-10", day: 10 };
    const [edited] = editExpense([february], "phone", {
      name: "Phone",
      amount: 80,
      day: 31,
      isRecurring: false,
    });
    expect(edited.dueDate).toBe("2026-02-28");
    expect(edited.day).toBe(28);
  });

  it("persists through a save/load round-trip", () => {
    const edited = editExpense([oneOff], "phone", {
      name: "Phone bill",
      amount: 95.5,
      day: 20,
      isRecurring: false,
    });
    const reloaded = load(edited, new Date(2026, 9, 1));
    expect(byDueDate(reloaded, "2026-10-20")).toEqual(
      expect.objectContaining({ name: "Phone bill", amount: 95.5, isPaid: true }),
    );
  });

  it("returns the list unchanged for an unknown id", () => {
    const expenses = [oneOff];
    expect(editExpense(expenses, "nope", { name: "X", amount: 1, day: 1, isRecurring: false })).toBe(expenses);
  });

  it("switching a one-off to recurring makes it the series root", () => {
    const [edited] = editExpense([oneOff], "phone", {
      name: "Phone",
      amount: 80,
      day: 15,
      isRecurring: true,
    });
    expect(edited.isRecurring).toBe(true);
    expect(edited.recurrenceId).toBe("phone");
    const reloaded = load([edited], new Date(2026, 9, 1));
    expect(byDueDate(reloaded, "2026-11-15")).toEqual(expect.objectContaining({ name: "Phone", amount: 80 }));
    expect(byDueDate(reloaded, "2026-12-15")).toEqual(expect.objectContaining({ name: "Phone", amount: 80 }));
  });
});

describe("v380 editExpense — recurring bills edit forward only", () => {
  it("applies the edits from the edited month forward; earlier months are untouched", () => {
    const expenses = seriesFixture();
    const januaryBefore = byDueDate(expenses, "2026-01-15");
    const edited = editExpense(expenses, "rent-2026-03", {
      name: "Rent + utils",
      amount: 1250,
      day: 15,
      isRecurring: true,
    });

    // History: same object back, byte for byte, paid state included.
    expect(byDueDate(edited, "2026-01-15")).toBe(januaryBefore);
    expect(byDueDate(edited, "2026-02-15")).toEqual(
      expect.objectContaining({ name: "Rent", amount: 1200, isPaid: false }),
    );
    // The edited month and every later month take the new values;
    // the edited (paid) occurrence stays paid.
    for (const dueDate of ["2026-03-15", "2026-04-15", "2026-05-15", "2026-06-15"]) {
      expect(byDueDate(edited, dueDate)).toEqual(
        expect.objectContaining({ name: "Rent + utils", amount: 1250 }),
      );
    }
    expect(byDueDate(edited, "2026-03-15")?.isPaid).toBe(true);
  });

  it("a reload after the edit shows the new values across the materialized window", () => {
    const edited = editExpense(seriesFixture(), "rent-2026-03", {
      name: "Rent + utils",
      amount: 1250,
      day: 15,
      isRecurring: true,
    });
    const reloaded = load(edited, new Date(2026, 2, 1));
    // Past the stored tail (Jun 2026), fresh materialization follows
    // the edited values — the old ones never resurrect.
    expect(byDueDate(reloaded, "2026-09-15")).toEqual(
      expect.objectContaining({ name: "Rent + utils", amount: 1250 }),
    );
    expect(byDueDate(reloaded, "2026-01-15")).toEqual(
      expect.objectContaining({ name: "Rent", amount: 1200, isPaid: true }),
    );
  });

  it("clamps a changed due day per month, the way create does", () => {
    const edited = editExpense(seriesFixture(), "rent-2026-02", {
      name: "Rent",
      amount: 1200,
      day: 31,
      isRecurring: true,
    });
    expect(byDueDate(edited, "2026-01-15")?.day).toBe(15);
    expect(byDueDate(edited, "2026-02-28")?.day).toBe(28);
    expect(byDueDate(edited, "2026-03-31")?.day).toBe(31);
    expect(byDueDate(edited, "2026-04-30")?.day).toBe(30);
  });
});

describe("v380 editExpense — recurring switched off detaches forward", () => {
  it("edited bill becomes a one-off, later months go, earlier months keep their values", () => {
    const edited = editExpense(seriesFixture(), "rent-2026-02", {
      name: "Rent (final)",
      amount: 900,
      day: 15,
      isRecurring: false,
    });

    const february = byDueDate(edited, "2026-02-15");
    expect(february).toEqual(expect.objectContaining({ name: "Rent (final)", amount: 900, isPaid: false }));
    expect(february?.isRecurring).toBe(false);
    expect(february).not.toHaveProperty("recurrenceId");

    const january = byDueDate(edited, "2026-01-15");
    expect(january).toEqual(expect.objectContaining({ name: "Rent", amount: 1200, isPaid: true }));
    expect(january?.isRecurring).toBe(false);
    expect(january).not.toHaveProperty("recurrenceId");

    expect(edited.filter((expense) => expense.dueDate > "2026-02-15")).toHaveLength(0);
  });

  it("the detached series never materializes again on reload", () => {
    const edited = editExpense(seriesFixture(), "rent-2026-02", {
      name: "Rent (final)",
      amount: 900,
      day: 15,
      isRecurring: false,
    });
    const reloaded = load(edited, new Date(2026, 0, 1));
    expect(reloaded).toHaveLength(2);
    expect(reloaded.some((expense) => expense.recurrenceId === "rent")).toBe(false);
  });
});
