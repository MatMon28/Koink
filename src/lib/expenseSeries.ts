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

/**
 * The short label under a bar, or '' for a slot that has none. Days: the 1st carries the month, the 8th, 15th
 * and 22nd are plain numbers; with `dense` (zoomed in) every day has its number. Whether a label really fits
 * is decided by `visibleLabels`, which drops the ones that would collide.
 */
export function axisLabel(start: string, resolution: Resolution, dense = false): string {
  const day = Number(start.slice(8, 10));
  const month = t(MONTH_SHORT[Number(start.slice(5, 7)) - 1]);
  if (resolution === 'month') return formatMonth(monthOf(start), 'short', false);
  if (resolution === 'week') return `${day} ${month}`;
  if (day === 1) return `${day} ${month}`;
  if (dense) return String(day);
  return day === 8 || day === 15 || day === 22 ? String(day) : '';
}

/** Rough width of an axis label in px (9.5 px bold digits and letters), plus a gap. */
const labelWidth = (label: string): number => label.length * 5.6 + 10;

/**
 * Which axis labels to draw: walking left to right, a label is kept when it starts after the previous kept
 * one has ended, so a compressed chart (a whole year on a phone) shows a few readable labels, not a smear.
 * `slotPx` is the width of one slot; the result lists `{ index, text }`.
 */
export function visibleLabels(points: SeriesPoint[], resolution: Resolution, slotPx: number): { index: number; text: string }[] {
  const dense = resolution === 'day' && slotPx >= 22;
  // A year of days squeezed into a phone: only the months (the labels that carry a month name) are worth a place.
  const monthsOnly = resolution === 'day' && slotPx < 10;
  const kept: { index: number; text: string }[] = [];
  let edge = -Infinity; // right end (px) of the last kept label, which is centred on its slot
  points.forEach((point, index) => {
    const text = axisLabel(point.start, resolution, dense);
    if (!text || (monthsOnly && !text.includes(' '))) return;
    const width = labelWidth(text);
    const centre = (index + 0.5) * slotPx;
    if (centre - width / 2 < edge) return;
    kept.push({ index, text });
    edge = centre + width / 2;
  });
  return kept;
}

/* ---------- Compare: none, period, categories or both ---------- */

/** What the chart compares: nothing, the period with a second one, several categories, or both at once. */
export type Compare = 'none' | 'period' | 'categories' | 'both';

export const COMPARE_IDS: readonly Compare[] = ['none', 'period', 'categories', 'both'];

/** Reads a stored value; the first version of the chart stored `off` and `periods`. */
export function normalizeCompare(value: unknown): Compare {
  if (value === 'off') return 'none';
  if (value === 'periods') return 'period';
  return COMPARE_IDS.includes(value as Compare) ? (value as Compare) : 'none';
}

export const comparesPeriods = (compare: Compare): boolean => compare === 'period' || compare === 'both';
export const comparesCategories = (compare: Compare): boolean => compare === 'categories' || compare === 'both';

/* ---------- Zoom (full view) ---------- */

/** Narrowest a slot may get when zoomed in all the way, in px: one bar is then easy to hit. */
export const ZOOM_SLOT_PX = 56;
export const ZOOM_MIN = 1;
export const ZOOM_FLOOR_MAX = 4;
export const ZOOM_CEILING = 60;

/** How far the chart can be zoomed in: always 4x at least, more when there are many slots, never absurd. */
export function maxZoom(slots: number, viewWidth: number): number {
  if (viewWidth <= 0) return ZOOM_FLOOR_MAX;
  return Math.min(ZOOM_CEILING, Math.max(ZOOM_FLOOR_MAX, (slots * ZOOM_SLOT_PX) / viewWidth));
}

export const clampZoom = (zoom: number, max: number): number => Math.min(max, Math.max(ZOOM_MIN, zoom));

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
