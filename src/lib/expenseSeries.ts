import { addDays, addMonths, formatMonth, MONTH_SHORT, monthOf, weekStart } from './dates';
import { round2 } from './format';
import { t } from './i18n';
import type { Tx } from './types';

/** How finely the expense chart on the Statistics page splits time. */
export type Resolution = 'day' | 'week' | 'month';

export interface SeriesPoint {
  /** First day of the bucket: the day, the Monday of the week, or the first of the month. */
  start: string;
  total: number;
  count: number;
}

/** Hard stop for the number of bars (a custom period of many years at day resolution). */
export const MAX_POINTS = 800;

const bucketStart = (date: string, resolution: Resolution): string =>
  resolution === 'day' ? date : resolution === 'week' ? weekStart(date) : `${monthOf(date)}-01`;

const nextBucket = (start: string, resolution: Resolution): string =>
  resolution === 'day' ? addDays(start, 1) : resolution === 'week' ? addDays(start, 7) : `${addMonths(monthOf(start), 1)}-01`;

/**
 * Expenses (only expenses: income and savings are not spending) summed per day, week or month between
 * `from` and `to` (both included). `include` picks the entries that count (all, or the chosen categories).
 * Every bucket in the span is returned, empty ones too, so gaps show as gaps.
 */
export function expenseSeries(txs: Tx[], from: string, to: string, resolution: Resolution, include: (tx: Tx) => boolean = () => true): SeriesPoint[] {
  if (from > to) return [];
  const sums = new Map<string, { total: number; count: number }>();
  for (const tx of txs) {
    if (tx.kind !== 'expense' || tx.date < from || tx.date > to || !include(tx)) continue;
    const key = bucketStart(tx.date, resolution);
    const hit = sums.get(key) ?? { total: 0, count: 0 };
    hit.total += tx.amount;
    hit.count += 1;
    sums.set(key, hit);
  }
  const points: SeriesPoint[] = [];
  for (let start = bucketStart(from, resolution); start <= to && points.length < MAX_POINTS; start = nextBucket(start, resolution)) {
    const hit = sums.get(start);
    points.push({ start, total: round2(hit?.total ?? 0), count: hit?.count ?? 0 });
  }
  return points;
}

/** Width of one bar slot in pixels: the chart scrolls sideways when the bars do not fit. */
export const SLOT_PX: Record<Resolution, number> = { day: 16, week: 38, month: 46 };

/** The short label under a bar, or '' when it would crowd its neighbours. */
export function axisLabel(start: string, resolution: Resolution): string {
  const day = Number(start.slice(8, 10));
  const month = t(MONTH_SHORT[Number(start.slice(5, 7)) - 1]);
  if (resolution === 'month') return formatMonth(monthOf(start), 'short', false);
  if (resolution === 'week') return `${day} ${month}`;
  // Days: the 1st carries the month, the 8th, 15th and 22nd are plain numbers.
  if (day === 1) return `${day} ${month}`;
  return day === 8 || day === 15 || day === 22 ? String(day) : '';
}

/** The full name of a bucket for the line above the chart. */
export function bucketTitle(start: string, resolution: Resolution): string {
  const month = t(MONTH_SHORT[Number(start.slice(5, 7)) - 1]);
  const day = Number(start.slice(8, 10));
  if (resolution === 'month') return formatMonth(monthOf(start));
  if (resolution === 'week') {
    const end = addDays(start, 6);
    const endMonth = t(MONTH_SHORT[Number(end.slice(5, 7)) - 1]);
    return `${day} ${month} – ${Number(end.slice(8, 10))} ${endMonth} ${end.slice(0, 4)}`;
  }
  return `${day} ${month} ${start.slice(0, 4)}`;
}
