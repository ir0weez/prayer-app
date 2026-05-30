import { BudgetCategory, BudgetTransaction } from './prayercircle-data';

export function getTotalBudgeted(categories: BudgetCategory[] | undefined): number {
  if (!categories) return 0;
  return categories.reduce((sum, cat) => sum + cat.budgetedAmount, 0);
}

export function getTotalSpent(transactions: BudgetTransaction[] | undefined): number {
  if (!transactions) return 0;
  return transactions.reduce((sum, trans) => sum + trans.amount, 0);
}

export function getRemainingBudget(categories: BudgetCategory[] | undefined, transactions: BudgetTransaction[] | undefined): number {
  const budgeted = getTotalBudgeted(categories);
  const spent = getTotalSpent(transactions);
  return budgeted - spent;
}

export function getSpentByCategory(categoryId: string, transactions: BudgetTransaction[] | undefined): number {
  if (!transactions) return 0;
  return transactions
    .filter(t => t.categoryId === categoryId)
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getRemainingByCategory(category: BudgetCategory, transactions: BudgetTransaction[] | undefined): number {
  const spent = getSpentByCategory(category.id, transactions);
  return category.budgetedAmount - spent;
}

export function addTransaction(
  transactions: BudgetTransaction[] | undefined,
  categoryId: string,
  amount: number,
  description: string
): BudgetTransaction[] {
  const newTransaction: BudgetTransaction = {
    id: `trans_${Date.now()}`,
    categoryId,
    amount,
    description,
    date: new Date().toISOString().split('T')[0]
  };
  return [...(transactions || []), newTransaction];
}

export function addCategory(
  categories: BudgetCategory[] | undefined,
  name: string,
  budgetedAmount: number,
  color?: string
): BudgetCategory[] {
  const newCategory: BudgetCategory = {
    id: `cat_${Date.now()}`,
    name,
    budgetedAmount,
    color
  };
  return [...(categories || []), newCategory];
}
