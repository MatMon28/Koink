import { addDays, addMonths, daysBetween, daysInMonth, formatMonth, MONTH_SHORT, monthOf, weekStart } from './dates';
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

/** What the chart's second period is: the one right before, the same days a year earlier, or two chosen dates. */
export type CompareBase = 'prev' | 'year' | 'custom';

export interface Period {
  from: string;
  to: string;
}

const lastOfMonth = (month: string) => `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;

/** The same calendar day `n` months earlier (31 March - 1 month = 28 / 29 February). */
function shiftMonths(date: string, n: number): string {
  const month = addMonths(monthOf(date), n);
  const day = Math.min(Number(date.slice(8, 10)), daysInMonth(month));
  return `${month}-${String(day).padStart(2, '0')}`;
}

/**
 * The period to compare `from..to` with. `prev` is the span of the same length right before it: whole months
 * (3 months -> the 3 months before) when the period is whole months, otherwise the same number of days.
 * `year` is the same days one year earlier. `custom` is whatever the user typed (swapped when reversed).
 */
export function comparisonPeriod(from: string, to: string, base: CompareBase, custom: Period): Period {
  if (base === 'custom') return custom.from <= custom.to ? custom : { from: custom.to, to: custom.from };
  if (base === 'year') return { from: shiftMonths(from, -12), to: shiftMonths(to, -12) };
  const wholeMonths = from.slice(8, 10) === '01' && to === lastOfMonth(monthOf(to));
  if (wholeMonths) {
    const count = Math.round((Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7)) - (Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7)))) + 1);
    return { from: `${addMonths(monthOf(from), -count)}-01`, to: lastOfMonth(addMonths(monthOf(to), -count)) };
  }
  const length = daysBetween(from, to) + 1;
  return { from: addDays(from, -length), to: addDays(from, -1) };
}

/** Colours of the lines / bars when several categories are compared (readable on light and dark themes). */
export const SERIES_COLORS = ['#D9674E', '#3E86C8', '#5FA352', '#A56FC4', '#DDA11F', '#25A0A0', '#D45D96', '#7C8794'];
