import { Banknote, Briefcase, Car, Coins, Gift, HeartPulse, House, Laptop, ShoppingBag, ShoppingBasket, Ticket, UtensilsCrossed, Zap, type LucideIcon } from 'lucide-react';
import { PigIcon } from './pig';
import { iconFor } from './icons';
import type { Bucket, CustomCategory, Goal, Kind } from './types';

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  bucket: Bucket;
}

/** Needs first, then wants: the order of the cards on the Month page. */
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'housing', name: 'Housing', icon: House, bucket: 'needs' },
  { id: 'groceries', name: 'Groceries', icon: ShoppingBasket, bucket: 'needs' },
  { id: 'transport', name: 'Transport', icon: Car, bucket: 'needs' },
  { id: 'bills', name: 'Bills', icon: Zap, bucket: 'needs' },
  { id: 'health', name: 'Health', icon: HeartPulse, bucket: 'needs' },
  { id: 'eating_out', name: 'Eating out', icon: UtensilsCrossed, bucket: 'wants' },
  { id: 'fun', name: 'Fun', icon: Ticket, bucket: 'wants' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, bucket: 'wants' },
];

export interface IncomeSource {
  id: string;
  name: string;
  icon: LucideIcon;
}

export const INCOME_SOURCES: IncomeSource[] = [
  { id: 'salary', name: 'Salary', icon: Briefcase },
  { id: 'freelance', name: 'Freelance', icon: Laptop },
  { id: 'gift', name: 'Gift', icon: Gift },
  { id: 'other', name: 'Other', icon: Coins },
];

export const BUCKET_LABEL: Record<Bucket, string> = { needs: 'Needs', wants: 'Wants' };

/*
 * The expense categories in use = the built-in list above + the user's own (`AppData.categories`).
 * The store pushes the user's part in with `syncCategories()` whenever it changes, so the pure
 * helpers in lib/ (`bucketOf` in calc.ts) and every page see the same list without passing it around.
 */
let expenseById = new Map(EXPENSE_CATEGORIES.map((c) => [c.id, c]));
let everyCategory: ExpenseCategory[] = EXPENSE_CATEGORIES;
let shownCategories: ExpenseCategory[] = EXPENSE_CATEGORIES;
let hiddenIds = new Set<string>();
const incomeById = new Map(INCOME_SOURCES.map((c) => [c.id, c]));

export function syncCategories(custom: CustomCategory[], hidden: string[]): void {
  const own: ExpenseCategory[] = custom.map((c) => ({ id: c.id, name: c.name, icon: iconFor(c.icon), bucket: c.bucket }));
  // Needs first, then wants: the order of the cards on the Month page (the sort is stable).
  everyCategory = [...EXPENSE_CATEGORIES, ...own].sort((a, b) => (a.bucket === b.bucket ? 0 : a.bucket === 'needs' ? -1 : 1));
  expenseById = new Map(everyCategory.map((c) => [c.id, c]));
  hiddenIds = new Set(hidden);
  shownCategories = everyCategory.filter((c) => !hiddenIds.has(c.id));
}

/** Every expense category, hidden ones included: for looking an entry's category up. */
export const allExpenseCategories = () => everyCategory;
/** The categories offered in pickers and shown on the Month page. */
export const visibleExpenseCategories = () => shownCategories;
export const isCategoryHidden = (id: string) => hiddenIds.has(id);
export const isBuiltInCategory = (id: string) => EXPENSE_CATEGORIES.some((c) => c.id === id);

export const expenseCategory = (id: string) => expenseById.get(id);
export const bucketOf = (id: string): Bucket => expenseById.get(id)?.bucket ?? 'wants';

/** Name and icon of whatever an entry points at (category, income source or goal). */
export function categoryMeta(kind: Kind, id: string, goals: Goal[]): { name: string; icon: LucideIcon } {
  if (kind === 'expense') {
    const c = expenseById.get(id);
    return { name: c?.name ?? 'Other', icon: c?.icon ?? ShoppingBag };
  }
  if (kind === 'income') {
    const c = incomeById.get(id);
    return { name: c?.name ?? 'Income', icon: c?.icon ?? Banknote };
  }
  return { name: goals.find((g) => g.id === id)?.name ?? 'Savings', icon: PigIcon };
}

export const KIND_LABEL: Record<Kind, string> = { expense: 'Expense', income: 'Income', saving: 'Savings' };
