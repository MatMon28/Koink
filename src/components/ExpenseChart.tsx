import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChartColumn, ChevronDown, Maximize2, Minimize2, Tag } from 'lucide-react';
import { textInput } from './ui';
import { useBackLayer } from '../lib/back';
import { addDays, formatMonth, monthOf, todayStr } from '../lib/dates';
import {
  axisLabel,
  bucketTitle,
  comparisonPeriod,
  expenseSeries,
  SERIES_COLORS,
  SLOT_PX,
  type CompareBase,
  type Resolution,
  type SeriesPoint,
} from '../lib/expenseSeries';
import { round2 } from '../lib/format';
import { t } from '../lib/i18n';
import { useApp } from '../lib/store';
import type { Tx } from '../lib/types';
import { usePersistentState } from '../lib/usePersistentState';

type ChartType = 'bars' | 'line';
/** What the chart compares: nothing, the chosen period with a second one, or several categories side by side. */
type Compare = 'off' | 'periods' | 'categories';

const RESOLUTIONS: { id: Resolution; label: string }[] = [
  { id: 'day', label: 'Per day' },
  { id: 'week', label: 'Per week' },
  { id: 'month', label: 'Per month' },
];
const TYPES: { id: ChartType; label: string }[] = [
  { id: 'bars', label: 'Bars' },
  { id: 'line', label: 'Line' },
];
const COMPARES: { id: Compare; label: string }[] = [
  { id: 'off', label: 'No comparison' },
  { id: 'periods', label: 'Periods' },
  { id: 'categories', label: 'Categories' },
];
const BASES: { id: CompareBase; label: string }[] = [
  { id: 'prev', label: 'Previous period' },
  { id: 'year', label: 'Same days last year' },
  { id: 'custom', label: 'Other dates' },
];
/** How many categories are drawn when none is picked in the category comparison. */
const DEFAULT_CATEGORIES = 3;
const FIRST_COLOR = 'var(--activity-on-surface)';

interface Line {
  key: string;
  label: string;
  color: string;
  points: SeriesPoint[];
  total: number;
  dashed?: boolean;
}

export interface ChartCategory {
  category: { id: string; name: string; icon: typeof Tag };
  total: number;
}

interface Props {
  txs: Tx[];
  fromDate: string;
  toDate: string;
  /** The categories with spending in the period, biggest first. */
  categories: ChartCategory[];
  /** Ids of the categories that exist; any other id is gathered under `_other`. */
  knownIds: Set<string>;
}

/** "Mar 2025", "Jan – Mar 2025" for whole months, otherwise "5 Mar 2025 – 20 Mar 2025". */
function periodLabel(from: string, to: string): string {
  const wholeMonths = from.slice(8, 10) === '01' && addDays(to, 1).slice(8, 10) === '01';
  if (!wholeMonths) return `${bucketTitle(from, 'day')} – ${bucketTitle(to, 'day')}`;
  if (monthOf(from) === monthOf(to)) return formatMonth(monthOf(from));
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  return `${formatMonth(monthOf(from), 'short', !sameYear)} – ${formatMonth(monthOf(to), 'short')}`;
}

const chip = (on: boolean) =>
  `pressable inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-extrabold border ${
    on ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]' : 'bg-[var(--inset)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--hover)]'
  }`;

/** A small pill switch used for chart type, resolution and comparison. */
function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (id: T) => void }) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full items-center gap-1 p-1 bg-[var(--inset)] border border-[var(--border)] rounded-full">
      {options.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
          className={`pressable px-3 py-1.5 rounded-full text-[11px] font-extrabold whitespace-nowrap ${
            value === item.id ? 'bg-[var(--text)] text-[var(--on-text)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
          }`}
        >
          {t(item.label)}
        </button>
      ))}
    </div>
  );
}

/**
 * The Statistics page's "Expenses over time" card: bars or a line per day / week / month, optionally comparing
 * two periods or several categories, and it can open full screen. Plain HTML + one stretched SVG (no library).
 */
export function ExpenseChart({ txs, fromDate, toDate, categories, knownIds }: Props) {
  const { money } = useApp();
  const [open, setOpen] = usePersistentState('koink_stats_chart_open', true);
  const [resolution, setResolution] = usePersistentState<Resolution>('koink_stats_chart_res', 'week');
  const [type, setType] = usePersistentState<ChartType>('koink_stats_chart_type', 'bars');
  const [compare, setCompare] = usePersistentState<Compare>('koink_stats_chart_cmp', 'off');
  const [base, setBase] = usePersistentState<CompareBase>('koink_stats_chart_base', 'prev');
  const [otherFrom, setOtherFrom] = usePersistentState('koink_stats_chart_cfrom', addDays(todayStr(), -59));
  const [otherTo, setOtherTo] = usePersistentState('koink_stats_chart_cto', addDays(todayStr(), -30));
  const [pickedCategories, setPickedCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useBackLayer(expanded, () => setExpanded(false));
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setExpanded(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const picked = pickedCategories.filter((id) => categories.some((row) => row.category.id === id));
  const idOf = (tx: Tx) => (knownIds.has(tx.categoryId) ? tx.categoryId : '_other');
  const nameOf = (id: string) => t(categories.find((row) => row.category.id === id)?.category.name ?? 'Other');
  const second = useMemo(() => comparisonPeriod(fromDate, toDate, base, { from: otherFrom, to: otherTo }), [fromDate, toDate, base, otherFrom, otherTo]);

  const lines: Line[] = useMemo(() => {
    const sum = (points: SeriesPoint[]) => round2(points.reduce((acc, p) => acc + p.total, 0));
    const make = (key: string, label: string, color: string, points: SeriesPoint[], dashed = false): Line => ({ key, label, color, points, total: sum(points), dashed });
    const filter = picked.length === 0 ? undefined : (tx: Tx) => picked.includes(idOf(tx));
    const names = picked.length === 0 ? t('All expenses') : picked.map(nameOf).join(', ');
    if (compare === 'categories') {
      const ids = picked.length > 0 ? picked : categories.slice(0, DEFAULT_CATEGORIES).map((row) => row.category.id);
      return ids.map((id, index) => make(id, nameOf(id), SERIES_COLORS[index % SERIES_COLORS.length], expenseSeries(txs, fromDate, toDate, resolution, (tx) => idOf(tx) === id)));
    }
    const main = make('a', compare === 'periods' ? periodLabel(fromDate, toDate) : names, FIRST_COLOR, expenseSeries(txs, fromDate, toDate, resolution, filter));
    if (compare !== 'periods') return [main];
    return [main, make('b', periodLabel(second.from, second.to), SERIES_COLORS[1], expenseSeries(txs, second.from, second.to, resolution, filter), true)];
    // `picked`, `idOf` and `nameOf` derive from the props and pickedCategories
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, fromDate, toDate, resolution, compare, pickedCategories, categories, knownIds, second]);

  const slots = Math.max(0, ...lines.map((line) => line.points.length));
  const peak = Math.max(0, ...lines.flatMap((line) => line.points.map((p) => p.total)));
  const everyTotal = round2(lines.reduce((acc, line) => acc + line.total, 0));
  const active = selected !== null && selected < slots ? selected : null;
  const count = lines.length;
  const slotPx = SLOT_PX[resolution] * (count > 1 ? Math.max(1, count * 0.7) : 1);
  const labelPoints = lines.reduce<SeriesPoint[]>((best, line) => (line.points.length > best.length ? line.points : best), []);
  const headTotal = compare === 'periods' ? lines[0]?.total ?? 0 : everyTotal;
  const empty = slots === 0 || everyTotal === 0;

  // The newest bars are the ones that matter: start scrolled to the right.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [slots, resolution, open, type, expanded, count]);

  const pickCategory = (id: string) => {
    setPickedCategories(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
    setSelected(null);
  };
  const resetSelection = () => setSelected(null);
  const y = (value: number) => 96 - (peak > 0 ? (value / peak) * 92 : 0);

  // What the read-out under the controls shows: the totals (or the average), or the tapped slot, one row per line.
  const average = lines[0] && lines[0].points.length > 0 ? lines[0].total / lines[0].points.length : 0;
  const rows = lines.map((line) => {
    const point = active !== null ? line.points[active] : undefined;
    return {
      line,
      sub: active !== null && compare === 'periods' ? (point ? bucketTitle(point.start, resolution) : '–') : undefined,
      value: active !== null ? point?.total ?? 0 : compare === 'off' ? average : line.total,
    };
  });
  const caption =
    active !== null
      ? compare === 'periods'
        ? t('Selected {v}', { v: t(resolution) })
        : bucketTitle(labelPoints[active].start, resolution)
      : compare === 'off'
        ? `${t('Average')} / ${t(resolution)}`
        : t('Total');
  const diff = compare === 'periods' && rows.length === 2 ? rows[0].value - rows[1].value : null;
  const diffPercent = diff !== null && rows[1].value > 0 ? Math.round((diff / rows[1].value) * 100) : null;

  const height = expanded ? 'h-[min(48vh,28rem)]' : 'h-32';
  const slotLabel = (index: number) =>
    `${bucketTitle(labelPoints[index].start, resolution)}: ${lines.map((line) => `${line.label} ${money(line.points[index]?.total ?? 0, { cents: true })}`).join(', ')}`;

  const body = (
    <div className="pt-3 space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Segmented label={t('Chart type')} value={type} options={TYPES} onChange={setType} />
        <Segmented label={t('Resolution')} value={resolution} options={RESOLUTIONS} onChange={(id) => { setResolution(id); resetSelection(); }} />
      </div>
      <div className="flex justify-center">
        <Segmented label={t('Compare')} value={compare} options={COMPARES} onChange={(id) => { setCompare(id); resetSelection(); }} />
      </div>

      {compare === 'periods' && (
        <div className="rounded-2xl bg-[var(--inset)] border border-[var(--border)] p-3 space-y-2.5">
          <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Compare with')}</span>
          <div className="flex flex-wrap gap-1.5">
            {BASES.map((item) => (
              <button key={item.id} type="button" aria-pressed={base === item.id} onClick={() => { setBase(item.id); resetSelection(); }} className={chip(base === item.id)}>
                {t(item.label)}
              </button>
            ))}
          </div>
          {base === 'custom' && (
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block min-w-0">
                <span className="block mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('From')}</span>
                <input type="date" value={otherFrom} max={otherTo || undefined} onChange={(event) => event.target.value && setOtherFrom(event.target.value)} className={`${textInput} text-sm`} />
              </label>
              <label className="block min-w-0">
                <span className="block mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('To')}</span>
                <input type="date" value={otherTo} min={otherFrom || undefined} onChange={(event) => event.target.value && setOtherTo(event.target.value)} className={`${textInput} text-sm`} />
              </label>
            </div>
          )}
          <p className="text-[11px] font-medium text-[var(--muted)]">
            {periodLabel(fromDate, toDate)} {t('vs')} {periodLabel(second.from, second.to)}
          </p>
        </div>
      )}

      {categories.length > 0 && (
        <div>
          <span className="block mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Categories')}</span>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={picked.length === 0} onClick={() => { setPickedCategories([]); resetSelection(); }} className={chip(picked.length === 0)}>
              {compare === 'categories' ? t('Top {n}', { n: DEFAULT_CATEGORIES }) : t('All expenses')}
            </button>
            {categories.map(({ category }) => {
              const Icon = category.icon;
              const on = picked.includes(category.id);
              const color = compare === 'categories' ? lines.find((line) => line.key === category.id)?.color : undefined;
              return (
                <button key={category.id} type="button" aria-pressed={on} onClick={() => pickCategory(category.id)} className={chip(on)}>
                  {color ? <span className="size-2 rounded-full shrink-0" style={{ background: color }} aria-hidden="true" /> : <Icon size={12} strokeWidth={2.4} aria-hidden="true" />}
                  {t(category.name)}
                </button>
              );
            })}
          </div>
          {compare === 'categories' && <p className="mt-1.5 px-1 text-[11px] font-medium text-[var(--muted)]">{t('Pick the categories to compare. None picked shows the biggest ones.')}</p>}
        </div>
      )}

      {empty ? (
        <p className="kc-section-empty text-xs font-medium text-[var(--muted)]">{t('No spending in this period.')}</p>
      ) : (
        <>
          <div className="space-y-1 px-1 text-xs font-bold tabular-nums" aria-live="polite">
            <div className="flex items-center justify-between gap-2 text-[var(--muted)]">
              <span className="truncate">{caption}</span>
              {diff !== null && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--inset)] border border-[var(--border)] text-[var(--text)] whitespace-nowrap">
                  {money(diff, { sign: true, cents: active !== null })}
                  {diffPercent !== null && ` (${diffPercent > 0 ? '+' : ''}${diffPercent}%)`}
                </span>
              )}
              {compare === 'off' && (
                <span className="text-[var(--activity-on-surface)] font-extrabold">{money(active !== null ? lines[0].points[active]?.total ?? 0 : average, { cents: active !== null })}</span>
              )}
            </div>
            {compare !== 'off' &&
              rows.map(({ line, sub, value }) => (
                <div key={line.key} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex items-center gap-1.5 text-[var(--text)]">
                    <span className="size-2.5 rounded-full shrink-0" style={{ background: line.color }} aria-hidden="true" />
                    <span className="truncate">{line.label}</span>
                    {sub && <span className="truncate font-medium text-[var(--muted)]">· {sub}</span>}
                  </span>
                  <span className="font-extrabold text-[var(--text)]">{money(value, { cents: active !== null })}</span>
                </div>
              ))}
          </div>

          {/* Bars or line: a plain flex row that scrolls sideways when there are too many slots to fit. */}
          <div ref={scroller} data-no-swipe className="no-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x touch-pan-y">
            <div style={{ minWidth: slots * slotPx }}>
              <div className={`relative ${height} border-b border-[var(--border)]`} role="group" aria-label={t('Expenses per {v}', { v: t(resolution) })}>
                {[0, 50].map((top) => (
                  <span key={top} className="absolute inset-x-0 border-t border-dashed border-[var(--border)] pointer-events-none" style={{ top: `${top}%` }} aria-hidden="true" />
                ))}

                {type === 'bars' ? (
                  <div className="absolute inset-0 flex items-end gap-[3px]">
                    {Array.from({ length: slots }, (_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelected(active === index ? null : index)}
                        aria-pressed={active === index}
                        aria-label={slotLabel(index)}
                        className="group h-full flex-1 min-w-0 flex items-end gap-px focus:outline-none"
                      >
                        {lines.map((line) => {
                          const value = line.points[index]?.total ?? 0;
                          const barHeight = peak > 0 ? Math.max(value > 0 ? 3 : 0, (value / peak) * 100) : 0;
                          const dim = active !== null && active !== index;
                          return (
                            <span
                              key={line.key}
                              className="block flex-1 min-w-0 rounded-t-md transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80"
                              style={{
                                height: `${barHeight}%`,
                                background: count === 1 && active === index ? 'var(--text)' : line.color,
                                opacity: dim ? 0.4 : line.dashed ? 0.75 : 1,
                              }}
                            />
                          );
                        })}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    {active !== null && (
                      <span className="absolute inset-y-0 w-px bg-[var(--muted)]/50 pointer-events-none" style={{ left: `${((active + 0.5) / slots) * 100}%` }} aria-hidden="true" />
                    )}
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible pointer-events-none" aria-hidden="true">
                      {lines.map((line) => (
                        <polyline
                          key={line.key}
                          points={line.points.map((p, i) => `${((i + 0.5) / slots) * 100},${y(p.total)}`).join(' ')}
                          fill="none"
                          stroke={line.color}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray={line.dashed ? '5 4' : undefined}
                          vectorEffect="non-scaling-stroke"
                        />
                      ))}
                    </svg>
                    {lines.flatMap((line) =>
                      line.points.map((p, i) =>
                        slots <= 45 || active === i ? (
                          <span
                            key={`${line.key}-${i}`}
                            className="absolute rounded-full border-2 pointer-events-none"
                            style={{
                              left: `${((i + 0.5) / slots) * 100}%`,
                              top: `${y(p.total)}%`,
                              width: active === i ? 11 : 7,
                              height: active === i ? 11 : 7,
                              transform: 'translate(-50%, -50%)',
                              background: line.color,
                              borderColor: 'var(--surface)',
                            }}
                            aria-hidden="true"
                          />
                        ) : null,
                      ),
                    )}
                    <div className="absolute inset-0 flex">
                      {Array.from({ length: slots }, (_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelected(active === index ? null : index)}
                          onMouseEnter={() => setSelected(index)}
                          aria-pressed={active === index}
                          aria-label={slotLabel(index)}
                          className="h-full flex-1 min-w-0 focus:outline-none"
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-[3px]" aria-hidden="true">
                {labelPoints.map((point) => (
                  <span key={point.start} className="relative h-5 flex-1 min-w-0">
                    <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap text-[9.5px] font-bold text-[var(--muted)]">{axisLabel(point.start, resolution)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="um-hide px-1 text-center text-[11px] font-medium text-[var(--muted)]">
            {t(type === 'bars' ? 'Tap a bar to read it' : 'Tap the line to read a point')}
            {' · '}{t('Max')} {money(peak)}
          </p>
        </>
      )}
    </div>
  );

  const expandLabel = expanded ? t('Close full view') : t('Open full view');

  return (
    <>
      <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-w-0 flex-1 flex items-center justify-between gap-2 text-left">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
              <ChartColumn size={16} className="text-[var(--muted)]" aria-hidden="true" />
              {t('Expenses over time')}
            </h3>
            <span className="flex items-center gap-2 tabular-nums">
              <span className="text-xs font-bold text-[var(--muted)]">{money(headTotal)}</span>
              <ChevronDown size={16} className={`text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label={expandLabel}
            title={expandLabel}
            className="pressable size-8 shrink-0 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)] flex items-center justify-center"
          >
            <Maximize2 size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="accordion-grid" data-open={open && !expanded} inert={!open || expanded}>
          <div className="accordion-inner">{!expanded && body}</div>
        </div>
      </div>

      {expanded &&
        createPortal(
          <div role="dialog" aria-modal="true" aria-label={t('Expenses over time')} className="fixed inset-0 z-[80] flex flex-col bg-[var(--bg)] text-[var(--text)]">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 pb-2.5 pt-[max(0.75rem,env(safe-area-inset-top))]">
              <h3 className="flex items-center gap-2 text-base font-extrabold">
                <ChartColumn size={18} className="text-[var(--muted)]" aria-hidden="true" />
                {t('Expenses over time')}
              </h3>
              <button type="button" onClick={() => setExpanded(false)} aria-label={expandLabel} title={expandLabel} className="pressable size-9 rounded-full bg-[var(--text)] text-[var(--on-text)] flex items-center justify-center">
                <Minimize2 size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="mx-auto w-full max-w-5xl">{body}</div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
