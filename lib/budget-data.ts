export interface MonthlyExpenseRecord {
  id: string;
  day: number;
  name: string;
  amount: number;
  isPaid: boolean;
  dueDate: string;
  isRecurring?: boolean;
  recurrenceId?: string;
}

export interface MonthCursor {
  year: number;
  month: number;
}

export type BudgetMonthTotals = {
  totalDue: number;
  paid: number;
  remaining: number;
};

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Calculate the same month totals shown by the Budget Tracker. Date matching
 * uses the stored YYYY-MM-DD prefix so device timezone conversion cannot move
 * an expense into the adjacent month.
 */
export function getBudgetMonthTotals(
  expenses: MonthlyExpenseRecord[],
  month: Date,
): BudgetMonthTotals {
  const targetMonth = monthKey(month);
  const monthExpenses = normalizeRecurringExpenses(expenses).filter(
    (expense) => expense.dueDate.slice(0, 7) === targetMonth,
  );
  const totalDue = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const paid = monthExpenses
    .filter((expense) => expense.isPaid)
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    totalDue,
    paid,
    remaining: totalDue - paid,
  };
}

export function getRecurringDueDate(template: MonthlyExpenseRecord, month: Date): string {
  const day = Math.min(template.day, getDaysInMonth(month));
  return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function getRecurrenceKey(expense: MonthlyExpenseRecord): string | null {
  return expense.isRecurring ? (expense.recurrenceId ?? expense.id) : null;
}

/**
 * Removes duplicate recurring records while retaining a paid state if any duplicate
 * for the same series/month has already been paid. One-time expenses are untouched.
 */
export function normalizeRecurringExpenses(expenses: MonthlyExpenseRecord[]): MonthlyExpenseRecord[] {
  const result: MonthlyExpenseRecord[] = [];
  const recurringByKey = new Map<string, MonthlyExpenseRecord>();

  for (const expense of expenses) {
    const recurrenceKey = getRecurrenceKey(expense);
    if (!recurrenceKey) {
      result.push(expense);
      continue;
    }

    const occurrenceKey = `${recurrenceKey}::${expense.dueDate}`;
    const existing = recurringByKey.get(occurrenceKey);
    if (!existing) {
      recurringByKey.set(occurrenceKey, {
        ...expense,
        recurrenceId: recurrenceKey,
      });
      continue;
    }

    recurringByKey.set(occurrenceKey, {
      ...existing,
      isPaid: existing.isPaid || expense.isPaid,
      amount: existing.amount || expense.amount,
      name: existing.name || expense.name,
      day: existing.day || expense.day,
    });
  }

  return [...result, ...recurringByKey.values()].sort(
    (a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id),
  );
}

/**
 * Materializes one occurrence per recurring series/month. It is intentionally
 * idempotent: loading the tracker repeatedly cannot create additional bills.
 */
export function materializeRecurringExpenses(
  expenses: MonthlyExpenseRecord[],
  startMonth: Date,
  monthsAhead = 12,
): MonthlyExpenseRecord[] {
  const result = normalizeRecurringExpenses(expenses);
  const recurringTemplates = new Map<string, MonthlyExpenseRecord>();

  // v380: the LATEST occurrence of a series is its template (the
  // normalized list is sorted by dueDate, so later records overwrite
  // earlier ones). A bill edited from one month forward stores its
  // new values on the newest occurrences, so months materialized
  // after the stored window carry the edited values — a reload can
  // never resurrect the old ones — while earlier months keep their
  // historical values. Unedited series hold identical values on
  // every occurrence, so their materialization is unchanged.
  for (const expense of result) {
    const recurrenceKey = getRecurrenceKey(expense);
    if (!recurrenceKey) continue;
    recurringTemplates.set(recurrenceKey, { ...expense, recurrenceId: recurrenceKey });
  }

  for (const template of recurringTemplates.values()) {
    const recurrenceId = template.recurrenceId ?? template.id;
    for (let offset = 0; offset < monthsAhead; offset += 1) {
      const targetMonth = addMonths(startMonth, offset);
      const dueDate = getRecurringDueDate(template, targetMonth);
      const exists = result.some((expense) => expense.recurrenceId === recurrenceId && expense.dueDate === dueDate);
      if (exists) continue;

      result.push({
        ...template,
        id: `${recurrenceId}-${monthKey(targetMonth)}`,
        recurrenceId,
        dueDate,
        day: Number(dueDate.slice(-2)),
        isPaid: false,
      });
    }
  }

  return normalizeRecurringExpenses(result);
}

export function deleteRecurringSeries(
  expenses: MonthlyExpenseRecord[],
  recurrenceId: string,
): MonthlyExpenseRecord[] {
  return expenses.filter((expense) => getRecurrenceKey(expense) !== recurrenceId);
}

export function createRecurringExpense(
  id: string,
  name: string,
  amount: number,
  day: number,
  month: Date,
): MonthlyExpenseRecord {
  const dueDate = getRecurringDueDate({ id, name, amount, day, isPaid: false, dueDate: "", isRecurring: true }, month);
  return {
    id,
    day: Number(dueDate.slice(-2)),
    name,
    amount,
    isPaid: false,
    dueDate,
    isRecurring: true,
    recurrenceId: id,
  };
}

export function deleteExpense(
  expenses: MonthlyExpenseRecord[],
  expenseId: string,
): MonthlyExpenseRecord[] {
  return expenses.filter((expense) => expense.id !== expenseId);
}

export interface ExpenseEdits {
  name: string;
  amount: number;
  day: number;
  isRecurring: boolean;
}

/**
 * v380: one occurrence with the edited values applied inside its own
 * month — the due date is recomputed through getRecurringDueDate, so
 * a day that does not exist in that month clamps exactly the way the
 * create path clamps it. Paid state and identity ride along on the
 * spread: editing a paid bill never unpays it.
 */
function withEditedValues(expense: MonthlyExpenseRecord, edits: ExpenseEdits): MonthlyExpenseRecord {
  const [year, month] = expense.dueDate.split("-").map(Number);
  const monthDate = new Date(year, (month || 1) - 1, 1);
  const dueDate = getRecurringDueDate({ ...expense, day: edits.day }, monthDate);
  return {
    ...expense,
    name: edits.name,
    amount: edits.amount,
    day: Number(dueDate.slice(-2)),
    dueDate,
  };
}

/** v380: a record with its series membership removed, values untouched. */
function asOneOffRecord(expense: MonthlyExpenseRecord): MonthlyExpenseRecord {
  const oneOff = { ...expense, isRecurring: false };
  delete oneOff.recurrenceId;
  return oneOff;
}

/**
 * v380: the bill editor's save, applied through the record layer.
 *
 * - One-off, stays one-off: that occurrence alone takes the edits.
 * - One-off switched to recurring: the occurrence becomes the series
 *   root (recurrenceId = its own id, the createRecurringExpense
 *   shape); the caller materializes the following months.
 * - Recurring, stays recurring: the edits apply from the edited
 *   occurrence FORWARD — it and every later occurrence take the new
 *   name/amount/day, while earlier occurrences (paid history above
 *   all) are returned untouched, object for object.
 * - Recurring switched off: the series detaches forward. The edited
 *   occurrence becomes a one-off carrying the edited values, later
 *   occurrences are removed, and earlier occurrences keep their
 *   values as plain one-off history — with no record left carrying
 *   the series, the old bills can never materialize again.
 */
export function editExpense(
  expenses: MonthlyExpenseRecord[],
  expenseId: string,
  edits: ExpenseEdits,
): MonthlyExpenseRecord[] {
  const target = expenses.find((expense) => expense.id === expenseId);
  if (!target) return expenses;

  const targetKey = getRecurrenceKey(target);

  if (!targetKey && !edits.isRecurring) {
    return expenses.map((expense) =>
      expense.id === expenseId ? withEditedValues(expense, edits) : expense,
    );
  }

  if (!targetKey && edits.isRecurring) {
    return expenses.map((expense) =>
      expense.id === expenseId
        ? { ...withEditedValues(expense, edits), isRecurring: true, recurrenceId: expense.id }
        : expense,
    );
  }

  if (targetKey && edits.isRecurring) {
    return expenses.map((expense) => {
      if (getRecurrenceKey(expense) !== targetKey || expense.dueDate < target.dueDate) {
        return expense;
      }
      return withEditedValues(expense, edits);
    });
  }

  return expenses.flatMap((expense) => {
    if (getRecurrenceKey(expense) !== targetKey) return [expense];
    if (expense.dueDate > target.dueDate) return [];
    if (expense.id === expenseId) return [asOneOffRecord(withEditedValues(expense, edits))];
    return [asOneOffRecord(expense)];
  });
}

/** A local YYYY-MM-DD key for a Date (never a UTC conversion). */
export function budgetDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * v286: the NEXT DUE mini's record — the earliest unpaid bill in the
 * viewed month whose due date is today or later; if every unpaid bill
 * in the month is already past, the earliest unpaid one. Null when
 * nothing in the month is unpaid. Pure derivation over the stored
 * records; all date matching is string-prefix, like the month totals.
 */
export function getBudgetNextDue(
  expenses: MonthlyExpenseRecord[],
  month: Date,
  today: Date,
): MonthlyExpenseRecord | null {
  const targetMonth = monthKey(month);
  const todayKey = budgetDateKey(today);
  const unpaid = normalizeRecurringExpenses(expenses)
    .filter((expense) => expense.dueDate.slice(0, 7) === targetMonth && !expense.isPaid)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
  if (unpaid.length === 0) return null;
  return unpaid.find((expense) => expense.dueDate >= todayKey) ?? unpaid[0];
}

/**
 * v286: whole days a bill's due date sits before today (0 when due
 * today or later). Parsed from the stored Y/M/D parts and compared
 * in UTC so a device timezone can never shift the count.
 */
export function getBudgetDaysLate(expense: MonthlyExpenseRecord, today: Date): number {
  const [year, month, day] = expense.dueDate.split("-").map(Number);
  if (!year || !month || !day) return 0;
  const dueUtc = Date.UTC(year, month - 1, day);
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((todayUtc - dueUtc) / 86_400_000);
  return days > 0 ? days : 0;
}
