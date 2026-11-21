import { bucketOf } from './categories';
import { addMonths, monthOf } from './dates';
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

export function budgetSummary(profile: Profile, totals: MonthTotals) {
  let budget = 0;
  let spent = 0;
  for (const [id, amount] of Object.entries(profile.budgets)) {
    if (!(amount > 0)) continue;
    budget += amount;
    spent += totals.byCategory[id]?.total ?? 0;
  }
  return { budget: round2(budget), spent: round2(spent), left: round2(budget - spent) };
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

/**
 * Is a recurring item due in `month`? Monthly items (every = 1) are due every month. Others are due
 * every `every` months counted from their `start` month (every 3 from March: Mar, Jun, Sep, Dec) and
 * not before it.
 */
export function recurringDue(item: Recurring, month: string): boolean {
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

/** The next month (this one included) in which a recurring item is due. */
export function nextDueMonth(item: Recurring, from: string): string {
  if (item.every <= 1) return from;
  const diff = monthIndex(from) - monthIndex(item.start);
  if (diff <= 0) return item.start;
  return addMonths(item.start, Math.ceil(diff / item.every) * item.every);
}
