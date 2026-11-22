import { addMonths } from './dates';
import type { Tx } from './types';

/**
 * Personal inflation: how much more (or less) the same life costs you than it did before, worked out from your
 * own expenses. Two figures, both for the last N *completed* months compared with an earlier window of N months
 * (the same months a year ago, or the N months right before):
 *
 *   spending  the change of what you spent in total;
 *   prices    the change of the price of things you bought in BOTH windows (same category and same title),
 *             each item priced at the quantity bought now: sum(price now x times now) / sum(price before x times now) - 1.
 *             Quantity changes cannot show up in it, so it is the closer one to a price index.
 *
 * Expenses in `excluded` (one-offs: a holiday, a repair) count in neither. Pure functions, no state: StatsView's
 * card (src/components/PersonalInflation.tsx) holds the choices. Months are 'YYYY-MM', amounts are the journal's.
 */

export type InflationBase = 'year' | 'previous';
export type InflationWindow = 3 | 6 | 12;

export interface InflationOptions {
  txs: Tx[];
  /** Ids of the expenses left out of the calculation. */
  excluded: ReadonlySet<string>;
  months: InflationWindow;
  base: InflationBase;
  /** The current month ('YYYY-MM'): the windows end the month before it. */
  currentMonth: string;
  /** Only this expense category, or every one. */
  categoryId?: string;
  /** Category name to ignore as a "title": an entry without a title is saved under its category's name. */
  categoryName?: (id: string) => string | undefined;
}

export interface RepeatItem {
  categoryId: string;
  title: string;
  /** How many times it was bought in the recent / earlier window. */
  countNow: number;
  countBefore: number;
  /** Average price of one purchase in each window. */
  priceNow: number;
  priceBefore: number;
  /** priceNow / priceBefore - 1, as a fraction (0.05 = +5 %). */
  change: number;
}

export interface Inflation {
  /** The two windows as month ranges, inclusive. */
  now: { from: string; to: string };
  before: { from: string; to: string };
  spentNow: number;
  spentBefore: number;
  /** Fractions (0.05 = +5 %); null when the earlier window has nothing to compare with. */
  spending: number | null;
  prices: number | null;
  /** The repeat purchases behind `prices`, the ones that moved the most money first. */
  items: RepeatItem[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The windows for a given last month: N months ending there, and the earlier N months. */
export function inflationWindows(last: string, months: number, base: InflationBase) {
  const now = { from: addMonths(last, -(months - 1)), to: last };
  const shift = base === 'year' ? 12 : months;
  const before = { from: addMonths(now.from, -shift), to: addMonths(now.to, -shift) };
  return { now, before };
}

const inRange = (date: string, range: { from: string; to: string }) => {
  const month = date.slice(0, 7);
  return month >= range.from && month <= range.to;
};

/** The expenses that take part: right category, not excluded. */
function counted(opts: Pick<InflationOptions, 'txs' | 'excluded' | 'categoryId'>): Tx[] {
  return opts.txs.filter((tx) => tx.kind === 'expense' && !opts.excluded.has(tx.id) && (!opts.categoryId || tx.categoryId === opts.categoryId));
}

/** The expenses of both windows of an option set, excluded ones included (to list them for the user to include or leave out). */
export function inflationCandidates(opts: Omit<InflationOptions, 'excluded'>): Tx[] {
  const { now, before } = inflationWindows(addMonths(opts.currentMonth, -1), opts.months, opts.base);
  return opts.txs
    .filter((tx) => tx.kind === 'expense' && (!opts.categoryId || tx.categoryId === opts.categoryId) && (inRange(tx.date, now) || inRange(tx.date, before)))
    .sort((a, b) => b.amount - a.amount);
}

const titleOf = (tx: Tx, opts: Pick<InflationOptions, 'categoryName'>): string | null => {
  const title = tx.note.trim().toLowerCase();
  if (!title) return null;
  const own = opts.categoryName?.(tx.categoryId);
  return own && own.trim().toLowerCase() === title ? null : title;
};

export function personalInflation(opts: InflationOptions, last: string = addMonths(opts.currentMonth, -1)): Inflation {
  const { now, before } = inflationWindows(last, opts.months, opts.base);
  const rows = counted(opts);
  const inNow = rows.filter((tx) => inRange(tx.date, now));
  const inBefore = rows.filter((tx) => inRange(tx.date, before));
  const spentNow = round2(inNow.reduce((sum, tx) => sum + tx.amount, 0));
  const spentBefore = round2(inBefore.reduce((sum, tx) => sum + tx.amount, 0));
  const spending = spentBefore > 0 ? spentNow / spentBefore - 1 : null;

  // Repeat purchases: the same title in the same category, bought in both windows.
  type Bucket = { categoryId: string; title: string; sum: number; count: number };
  const group = (list: Tx[]) => {
    const map = new Map<string, Bucket>();
    for (const tx of list) {
      const title = titleOf(tx, opts);
      if (!title) continue;
      const key = `${tx.categoryId}|${title}`;
      const entry = map.get(key) ?? { categoryId: tx.categoryId, title, sum: 0, count: 0 };
      entry.sum += tx.amount;
      entry.count += 1;
      map.set(key, entry);
    }
    return map;
  };
  const recent = group(inNow);
  const earlier = group(inBefore);
  const items: RepeatItem[] = [];
  let basketNow = 0;
  let basketBefore = 0;
  for (const [key, a] of recent) {
    const b = earlier.get(key);
    if (!b) continue;
    const priceNow = a.sum / a.count;
    const priceBefore = b.sum / b.count;
    basketNow += priceNow * a.count;
    basketBefore += priceBefore * a.count;
    items.push({ categoryId: a.categoryId, title: a.title, countNow: a.count, countBefore: b.count, priceNow: round2(priceNow), priceBefore: round2(priceBefore), change: priceNow / priceBefore - 1 });
  }
  items.sort((x, y) => Math.abs((y.priceNow - y.priceBefore) * y.countNow) - Math.abs((x.priceNow - x.priceBefore) * x.countNow));
  const prices = basketBefore > 0 ? basketNow / basketBefore - 1 : null;
  return { now, before, spentNow, spentBefore, spending, prices, items };
}

/** The figure of each of the last `count` completed months (oldest first): each is the window ending in that month. */
export function inflationTrend(opts: InflationOptions, count = 12): { month: string; spending: number | null; prices: number | null }[] {
  const out: { month: string; spending: number | null; prices: number | null }[] = [];
  for (let back = count - 1; back >= 0; back--) {
    const last = addMonths(opts.currentMonth, -1 - back);
    const r = personalInflation(opts, last);
    out.push({ month: last, spending: r.spending, prices: r.prices });
  }
  return out;
}
