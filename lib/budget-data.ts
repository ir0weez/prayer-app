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

/**
 * Materializes the requested number of future monthly occurrences for each recurring bill.
 * Existing occurrence records are left untouched so paid state and deletions remain local to that month.
 */
export function materializeRecurringExpenses(
  expenses: MonthlyExpenseRecord[],
  startMonth: Date,
  monthsAhead = 12,
): MonthlyExpenseRecord[] {
  const result = [...expenses];
  const recurringTemplates = expenses.filter((expense) => expense.isRecurring && !expense.recurrenceId);
  const recurringOccurrences = expenses.filter((expense) => expense.isRecurring && expense.recurrenceId);
  const templates = [...recurringTemplates, ...recurringOccurrences.filter((expense) =>
    !recurringTemplates.some((template) => template.recurrenceId === expense.recurrenceId),
  )];

  for (const template of templates) {
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

  return result.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
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
