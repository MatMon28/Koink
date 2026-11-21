import { bucketOf } from './categories';
import { addMonths, monthOf } from './dates';
import { round2 } from './format';
import type { Goal, Profile, Recurring, Tx } from './types';

export interface MonthTotals {
  month: string;
  income: number;
  /** Needs + wants. Money moved to savings is not "spent". */
  spent: number;
  saved: number;
  needs: number;
  wants: number;
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
  const byCategory: MonthTotals['byCategory'] = {};
  for (const tx of items) {
    if (tx.kind === 'income') income += tx.amount;
    else if (tx.kind === 'saving') saved += tx.amount;
    else {
      if (bucketOf(tx.categoryId) === 'needs') needs += tx.amount;
      else wants += tx.amount;
      const entry = (byCategory[tx.categoryId] ??= { total: 0, count: 0 });
      entry.total += tx.amount;
      entry.count += 1;
    }
  }
  for (const entry of Object.values(byCategory)) entry.total = round2(entry.total);
  const spent = round2(needs + wants);
  income = round2(income);
  saved = round2(saved);
  return {
    month,
    income,
    spent,
    saved,
    needs: round2(needs),
    wants: round2(wants),
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
export function ruleShares(t: Pick<MonthTotals, 'income' | 'needs' | 'wants' | 'saved'>) {
  const base = t.income > 0 ? t.income : t.needs + t.wants + t.saved;
  const share = (v: number) => (base > 0 ? Math.round((v / base) * 100) : 0);
  return { needs: share(t.needs), wants: share(t.wants), savings: share(t.saved), ofIncome: t.income > 0 };
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
