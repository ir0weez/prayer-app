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

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
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

  for (const expense of result) {
    const recurrenceKey = getRecurrenceKey(expense);
    if (!recurrenceKey || recurringTemplates.has(recurrenceKey)) continue;
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
