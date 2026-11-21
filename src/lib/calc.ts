import { bucketOf } from './categories';
import { addDays, addMonths, daysInMonth, monthOf } from './dates';
import { round2 } from './format';
import { accountShare } from './giftcards';
import type { Account, Goal, Profile, Recurring, Tx } from './types';

export interface MonthTotals {
  month: string;
  income: number;
  /** Needs + wants + the user's own types. Money moved to savings is not "spent". */
  spent: number;
  saved: number;
  needs: number;
  wants: number;
  /** Spending in the user's own expense types (neither needs nor wants). */
  other: number;
  /** Income minus spending (money moved to savings is still yours). */
  net: number;
  /** Income minus spending minus savings: what has no job yet. */
  left: number;
  count: number;
  byCategory: Record<string, { total: number; count: number }>;
  items: Tx[];
}

export function sortTxs(txs: Tx[]): Tx[] {
  return [...txs].sort((a, b) => (a.date === b.date ? b.ts - a.ts : a.date < b.date ? 1 : -1));
}

export function totalsOf(month: string, items: Tx[]): MonthTotals {
  let income = 0;
  let saved = 0;
  let needs = 0;
  let wants = 0;
  let other = 0;
  const byCategory: MonthTotals['byCategory'] = {};
  for (const tx of items) {
    if (tx.kind === 'income') income += tx.amount;
    else if (tx.kind === 'saving') saved += tx.amount;
    else {
      const bucket = bucketOf(tx.categoryId);
      if (bucket === 'needs') needs += tx.amount;
      else if (bucket === 'wants') wants += tx.amount;
      else other += tx.amount;
      const entry = (byCategory[tx.categoryId] ??= { total: 0, count: 0 });
      entry.total += tx.amount;
      entry.count += 1;
    }
  }
  for (const entry of Object.values(byCategory)) entry.total = round2(entry.total);
  const spent = round2(needs + wants + other);
  income = round2(income);
  saved = round2(saved);
  return {
    month,
    income,
    spent,
    saved,
    needs: round2(needs),
    wants: round2(wants),
    other: round2(other),
    net: round2(income - spent),
    left: round2(income - spent - saved),
    count: items.length,
    byCategory,
    items,
  };
}

export const monthTotals = (txs: Tx[], month: string) =>
  totalsOf(month, txs.filter((tx) => monthOf(tx.date) === month));

/** Totals of every month in `months`, in one pass over the ledger. */
export function totalsByMonth(txs: Tx[], months: string[]): MonthTotals[] {
  const groups = new Map<string, Tx[]>(months.map((m) => [m, []]));
  for (const tx of txs) groups.get(monthOf(tx.date))?.push(tx);
  return months.map((m) => totalsOf(m, groups.get(m) ?? []));
}

/** The last `count` months ending at `end`, oldest first. */
export const monthsBack = (end: string, count: number) =>
  Array.from({ length: count }, (_, i) => addMonths(end, i - (count - 1)));

/** Share of income (or of everything that left the account when no income was logged). */
export function ruleShares(t: Pick<MonthTotals, 'income' | 'needs' | 'wants' | 'saved'> & { other?: number }) {
  const other = t.other ?? 0;
  const base = t.income > 0 ? t.income : t.needs + t.wants + other + t.saved;
  const share = (v: number) => (base > 0 ? Math.round((v / base) * 100) : 0);
  return { needs: share(t.needs), wants: share(t.wants), other: share(other), savings: share(t.saved), ofIncome: t.income > 0 };
}

/** An expense category with spending in the month but no budget (see `budgetSummary().unbudgetedCategories`). */
export interface UnbudgetedCategory {
  id: string;
  total: number;
}

/**
 * What the "Budget" figure of the Budgets and Month pages measures.
 *
 * - `scope: 'overall'`: the generic monthly budget (Profile) against EVERYTHING spent.
 * - `scope: 'categories'`: the sum of the category budgets against the spending in budgeted categories ONLY.
 *   Spending in categories without a budget is left out of `spent` on purpose; it is reported apart as
 *   `unbudgeted` / `unbudgetedCategories`, so the screens can say what the percentage does not cover.
 *
 * `unplanned` is the old name of `unbudgeted` (same number).
 */
export function budgetSummary(profile: Profile, totals: MonthTotals) {
  let categoryBudget = 0;
  let categorySpent = 0;
  for (const [id, amount] of Object.entries(profile.budgets)) {
    if (!(amount > 0)) continue;
    categoryBudget += amount;
    categorySpent += totals.byCategory[id]?.total ?? 0;
  }
  const generic = profile.monthlyBudget > 0;
  const budget = generic ? profile.monthlyBudget : categoryBudget;
  const spent = generic ? totals.spent : categorySpent;
  const unbudgetedCategories: UnbudgetedCategory[] = Object.entries(totals.byCategory)
    .filter(([id, entry]) => !(profile.budgets[id] > 0) && entry.total > 0)
    .map(([id, entry]) => ({ id, total: round2(entry.total) }))
    .sort((a, b) => b.total - a.total);
  const unbudgeted = round2(totals.spent - categorySpent);
  return {
    budget: round2(budget),
    spent: round2(spent),
    left: round2(budget - spent),
    generic,
    scope: (generic ? 'overall' : 'categories') as 'overall' | 'categories',
    categoryBudget: round2(categoryBudget),
    unbudgeted,
    unbudgetedCategories,
    unplanned: unbudgeted,
  };
}

/** Everything ever moved to a goal. */
export function goalSaved(txs: Tx[], goal: Goal): number {
  let sum = 0;
  for (const tx of txs) if (tx.kind === 'saving' && tx.categoryId === goal.id) sum += tx.amount;
  return round2(sum);
}

/** The entry that logged a recurring item in a month, if any. */
export const recurringEntry = (items: Tx[], recurring: Recurring) =>
  items.find((tx) => tx.recurringId === recurring.id);

export interface FrequentEntry {
  key: string;
  kind: Tx['kind'];
  categoryId: string;
  note: string;
  amount: number;
  count: number;
  lastDate: string;
}

/** The entries logged most often by hand (same kind, category and note), newest amount kept. */
export function frequentEntries(txs: Tx[], limit = 10): FrequentEntry[] {
  const map = new Map<string, FrequentEntry>();
  for (const tx of sortTxs(txs)) {
    if (tx.recurringId || !tx.note.trim()) continue;
    const key = `${tx.kind}|${tx.categoryId}|${tx.note.trim().toLowerCase()}`;
    const hit = map.get(key);
    if (hit) hit.count += 1;
    else map.set(key, { key, kind: tx.kind, categoryId: tx.categoryId, note: tx.note.trim(), amount: tx.amount, count: 1, lastDate: tx.date });
  }
  return [...map.values()]
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count || (a.lastDate < b.lastDate ? 1 : -1))
    .slice(0, limit);
}

/**
 * What an account holds: its starting balance, plus income that went into it, minus expenses and
 * money moved to savings that came out of it. Entries without an account do not count anywhere.
 */
export function accountBalance(txs: Tx[], account: Account): number {
  let balance = account.opening;
  for (const tx of txs) {
    if (tx.accountId !== account.id) continue;
    // An expense paid (partly) with a gift card only took the rest out of the account.
    balance += tx.kind === 'income' ? tx.amount : -accountShare(tx);
  }
  return round2(balance);
}

const monthIndex = (month: string) => Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;

/** A weekly item counts `every` weeks from its anchor date; everything else counts months. */
export const isWeekly = (item: Recurring): boolean => item.unit === 'week' && !!item.anchor;

const dayNumber = (date: string) => Math.round(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / 86400000);

/** The dates a weekly item is due on inside `month` (none for a monthly item). */
export function recurringDates(item: Recurring, month: string): string[] {
  if (!isWeekly(item) || !item.anchor) return [];
  const step = 7 * Math.max(1, item.every);
  const first = dayNumber(`${month}-01`);
  const last = first + daysInMonth(month) - 1;
  const anchor = dayNumber(item.anchor);
  if (last < anchor) return [];
  const out: string[] = [];
  for (let k = Math.max(0, Math.ceil((first - anchor) / step)); anchor + k * step <= last; k += 1) out.push(addDays(item.anchor, k * step));
  return out;
}

/**
 * Is a recurring item due in `month`? Monthly items (every = 1) are due every month. Others are due
 * every `every` months counted from their `start` month (every 3 from March: Mar, Jun, Sep, Dec) and
 * not before it. A weekly item is due in every month that holds at least one of its dates.
 */
export function recurringDue(item: Recurring, month: string): boolean {
  if (isWeekly(item)) return recurringDates(item, month).length > 0;
  if (item.every <= 1) return true;
  const diff = monthIndex(month) - monthIndex(item.start);
  return diff >= 0 && diff % item.every === 0;
}

/**
 * The recurring items that belong on the checklist of `month`: the ones due, plus any already logged
 * there (an entry stays visible even if the schedule was edited later).
 */
export const recurringForMonth = (items: Recurring[], month: string, monthItems: Tx[]): Recurring[] =>
  items.filter((r) => recurringDue(r, month) || !!recurringEntry(monthItems, r));

/** One row of a recurring checklist: an item, and for a weekly item the date of this occurrence. */
export interface RecurringSlot {
  item: Recurring;
  date?: string;
}

/** The entry that logged one slot: by month for a monthly item, by due date for a weekly one. */
export const slotEntry = (monthItems: Tx[], slot: RecurringSlot): Tx | undefined =>
  slot.date ? monthItems.find((tx) => tx.recurringId === slot.item.id && tx.date === slot.date) : recurringEntry(monthItems, slot.item);

/**
 * The checklist of a month, one slot per occurrence (a weekly item has several in a month). With
 * `includeAll` the items that are not due this month are kept as a slot without a date (the management
 * list on the Budgets page shows them with a "Next ..." label).
 */
export function recurringSlots(items: Recurring[], month: string, monthItems: Tx[], includeAll = false): RecurringSlot[] {
  const out: RecurringSlot[] = [];
  for (const item of items) {
    if (isWeekly(item)) {
      const dates = new Set(recurringDates(item, month));
      // An occurrence logged on another date (the entry was edited) stays on the list.
      for (const tx of monthItems) if (tx.recurringId === item.id) dates.add(tx.date);
      const sorted = [...dates].sort();
      if (sorted.length === 0) {
        if (includeAll) out.push({ item });
      } else {
        for (const date of sorted) out.push({ item, date });
      }
    } else if (includeAll || recurringDue(item, month) || recurringEntry(monthItems, item)) {
      out.push({ item });
    }
  }
  return out;
}

/** The next date (from `from`, inclusive) a weekly item is due. */
export function nextDueDate(item: Recurring, from: string): string {
  if (!item.anchor) return from;
  const step = 7 * Math.max(1, item.every);
  const diff = dayNumber(from) - dayNumber(item.anchor);
  if (diff <= 0) return item.anchor;
  return addDays(item.anchor, Math.ceil(diff / step) * step);
}

/** The next month (this one included) in which a recurring item is due. */
export function nextDueMonth(item: Recurring, from: string): string {
  if (isWeekly(item)) return monthOf(nextDueDate(item, `${from}-01`));
  if (item.every <= 1) return from;
  const diff = monthIndex(from) - monthIndex(item.start);
  if (diff <= 0) return item.start;
  return addMonths(item.start, Math.ceil(diff / item.every) * item.every);
}
