import { Banknote, Briefcase, Car, Coins, FileText, Gift, HeartPulse, House, Laptop, ShoppingBag, ShoppingBasket, Ticket, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { t } from './i18n';
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
  { id: 'housing', get name() { return t('Housing'); }, icon: House, bucket: 'needs' },
  { id: 'groceries', get name() { return t('Groceries'); }, icon: ShoppingBasket, bucket: 'needs' },
  { id: 'transport', get name() { return t('Transport'); }, icon: Car, bucket: 'needs' },
  { id: 'bills', get name() { return t('Bills'); }, icon: FileText, bucket: 'needs' },
  { id: 'health', get name() { return t('Health'); }, icon: HeartPulse, bucket: 'needs' },
  { id: 'eating_out', get name() { return t('Eating out'); }, icon: UtensilsCrossed, bucket: 'wants' },
  { id: 'fun', get name() { return t('Fun'); }, icon: Ticket, bucket: 'wants' },
  { id: 'shopping', get name() { return t('Shopping'); }, icon: ShoppingBag, bucket: 'wants' },
];

export interface IncomeSource {
  id: string;
  name: string;
  icon: LucideIcon;
}

export const INCOME_SOURCES: IncomeSource[] = [
  { id: 'salary', get name() { return t('Salary'); }, icon: Briefcase },
  { id: 'freelance', get name() { return t('Freelance'); }, icon: Laptop },
  { id: 'gift', get name() { return t('Gift'); }, icon: Gift },
  { id: 'other', get name() { return t('Other'); }, icon: Coins },
];

/** Getters, so the text follows the language chosen in Settings. */
export const BUCKET_LABEL: Record<Bucket, string> = {
  get needs() { return t('Needs'); },
  get wants() { return t('Wants'); },
};

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
    return { name: c?.name ?? t('Other'), icon: c?.icon ?? ShoppingBag };
  }
  if (kind === 'income') {
    const c = incomeById.get(id);
    return { name: c?.name ?? t('Income'), icon: c?.icon ?? Banknote };
  }
  return { name: goals.find((g) => g.id === id)?.name ?? t('Savings'), icon: PigIcon };
}

export const KIND_LABEL: Record<Kind, string> = {
  get expense() { return t('Expense'); },
  get income() { return t('Income'); },
  get saving() { return t('Savings'); },
};
