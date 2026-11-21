import { useEffect, useMemo, useRef, useState } from 'react';
import { ChartColumn, ChevronDown, Maximize2, SlidersHorizontal, Tag } from 'lucide-react';
import { ChartLargeView } from './ChartLargeView';
import { ChartPlot, type ChartType, type PlotLine } from './ChartPlot';
import { ChartPopup } from './ChartPopup';
import { textInput } from './ui';
import { addDays, formatMonth, monthOf, todayStr } from '../lib/dates';
import {
  bucketTitle,
  comparesCategories,
  comparesPeriods,
  comparisonPeriod,
  expenseSeries,
  normalizeCompare,
  SERIES_COLORS,
  SLOT_PX,
  type Compare,
  type CompareBase,
  type Resolution,
  type SeriesPoint,
} from '../lib/expenseSeries';
import { round2 } from '../lib/format';
import { t } from '../lib/i18n';
import { useApp } from '../lib/store';
import type { Tx } from '../lib/types';
import { usePersistentState } from '../lib/usePersistentState';

const RESOLUTIONS: { id: Resolution; label: string }[] = [
  { id: 'day', label: 'Per day' },
  { id: 'week', label: 'Per week' },
  { id: 'month', label: 'Per month' },
];
const TYPES: { id: ChartType; label: string }[] = [
  { id: 'bars', label: 'Bars' },
  { id: 'line', label: 'Line' },
];
/** The Compare field: nothing, the period against a second one, categories side by side, or both at once. */
const COMPARES: { id: Compare; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'period', label: 'Period' },
  { id: 'categories', label: 'Categories' },
  { id: 'both', label: 'Both' },
];
const BASES: { id: CompareBase; label: string }[] = [
  { id: 'prev', label: 'Previous period' },
  { id: 'year', label: 'Same days last year' },
  { id: 'custom', label: 'Other dates' },
];
/** How many categories are drawn when none is picked in a category comparison. */
const DEFAULT_CATEGORIES = 3;
const FIRST_COLOR = 'var(--activity-on-surface)';

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

const fieldLabel = 'block mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]';

/** A pill switch across the whole width of its field: chart type, resolution, compare. */
function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (id: T) => void }) {
  return (
    <div role="group" aria-label={label} className="flex w-full items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--inset)] p-1">
      {options.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
          className={`pressable min-w-0 flex-1 truncate rounded-full px-2 py-1.5 text-[11px] font-extrabold whitespace-nowrap ${
            value === item.id ? 'bg-[var(--text)] text-[var(--on-text)]' : 'text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
          }`}
        >
          {t(item.label)}
        </button>
      ))}
    </div>
  );
}

/**
 * The Statistics page's "Expenses over time" card: a calm card with the chart, what it reads, and two small
 * buttons: the settings (a popup: chart type, resolution, Compare, categories) and the full view.
 *
 * In the card a line is compressed so the whole period fits; bars keep their natural width and scroll. The
 * full view (`ChartLargeView`) zooms, turns sideways and closes with a swipe down. Plain HTML + one stretched
 * SVG (no library); the chart itself is `ChartPlot`.
 */
export function ExpenseChart({ txs, fromDate, toDate, categories, knownIds }: Props) {
  const { money } = useApp();
  const [open, setOpen] = usePersistentState('koink_stats_chart_open', true);
  const [resolution, setResolution] = usePersistentState<Resolution>('koink_stats_chart_res', 'week');
  const [type, setType] = usePersistentState<ChartType>('koink_stats_chart_type', 'bars');
  const [storedCompare, setCompare] = usePersistentState<Compare>('koink_stats_chart_cmp', 'none');
  const [base, setBase] = usePersistentState<CompareBase>('koink_stats_chart_base', 'prev');
  const [otherFrom, setOtherFrom] = usePersistentState('koink_stats_chart_cfrom', addDays(todayStr(), -59));
  const [otherTo, setOtherTo] = usePersistentState('koink_stats_chart_cto', addDays(todayStr(), -30));
  const [pickedCategories, setPickedCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const compare = normalizeCompare(storedCompare); // the first version stored `off` / `periods`
  const periods = comparesPeriods(compare);
  const byCategory = comparesCategories(compare);

  const picked = pickedCategories.filter((id) => categories.some((row) => row.category.id === id));
  const idOf = (tx: Tx) => (knownIds.has(tx.categoryId) ? tx.categoryId : '_other');
  const nameOf = (id: string) => t(categories.find((row) => row.category.id === id)?.category.name ?? 'Other');
  const second = useMemo(() => comparisonPeriod(fromDate, toDate, base, { from: otherFrom, to: otherTo }), [fromDate, toDate, base, otherFrom, otherTo]);

  const lines: PlotLine[] = useMemo(() => {
    const sum = (points: SeriesPoint[]) => round2(points.reduce((acc, p) => acc + p.total, 0));
    const make = (key: string, label: string, color: string, points: SeriesPoint[], dashed = false): PlotLine => ({ key, label, color, points, total: sum(points), dashed });
    const filter = picked.length === 0 ? undefined : (tx: Tx) => picked.includes(idOf(tx));
    const names = picked.length === 0 ? t('All expenses') : picked.map(nameOf).join(', ');
    const here = periodLabel(fromDate, toDate);
    const there = periodLabel(second.from, second.to);
    if (byCategory) {
      // One colour per category; with a period comparison each category also gets its second period, dashed.
      const ids = picked.length > 0 ? picked : categories.slice(0, DEFAULT_CATEGORIES).map((row) => row.category.id);
      return ids.flatMap((id, index) => {
        const color = SERIES_COLORS[index % SERIES_COLORS.length];
        const only = (tx: Tx) => idOf(tx) === id;
        const first = make(id, periods ? `${nameOf(id)} · ${here}` : nameOf(id), color, expenseSeries(txs, fromDate, toDate, resolution, only));
        if (!periods) return [first];
        return [first, make(`${id}:b`, `${nameOf(id)} · ${there}`, color, expenseSeries(txs, second.from, second.to, resolution, only), true)];
      });
    }
    const main = make('a', periods ? here : names, FIRST_COLOR, expenseSeries(txs, fromDate, toDate, resolution, filter));
    if (!periods) return [main];
    return [main, make('b', there, SERIES_COLORS[1], expenseSeries(txs, second.from, second.to, resolution, filter), true)];
    // `picked`, `idOf` and `nameOf` derive from the props and pickedCategories
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, fromDate, toDate, resolution, byCategory, periods, pickedCategories, categories, knownIds, second]);

  const slots = Math.max(0, ...lines.map((line) => line.points.length));
  const peak = Math.max(0, ...lines.flatMap((line) => line.points.map((p) => p.total)));
  const everyTotal = round2(lines.reduce((acc, line) => acc + line.total, 0));
  const active = selected !== null && selected < slots ? selected : null;
  const count = lines.length;
  /** Width of the bars at their natural size: the card scrolls to it, the full view starts zoomed to it. */
  const naturalWidth = slots * SLOT_PX[resolution] * (count > 1 ? Math.max(1, count * 0.7) : 1);
  const labelPoints = lines.reduce<SeriesPoint[]>((best, line) => (line.points.length > best.length ? line.points : best), []);
  // The headline is what the period spent: the second period of a comparison is not added to it.
  const headTotal = round2(lines.filter((line) => !line.dashed).reduce((acc, line) => acc + line.total, 0));
  const empty = slots === 0 || everyTotal === 0;

  // In the card the newest bars are the ones that matter: start scrolled to the right.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [slots, resolution, open, type, count]);

  const pickCategory = (id: string) => {
    setPickedCategories(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
    setSelected(null);
  };
  const resetSelection = () => setSelected(null);

  // What the read-out above the chart shows: the totals (or the average), or the tapped slot, one row per line.
  const average = lines[0] && lines[0].points.length > 0 ? lines[0].total / lines[0].points.length : 0;
  const rows = lines.map((line) => {
    const point = active !== null ? line.points[active] : undefined;
    return {
      line,
      sub: active !== null && periods ? (point ? bucketTitle(point.start, resolution) : '–') : undefined,
      value: active !== null ? point?.total ?? 0 : compare === 'none' ? average : line.total,
    };
  });
  const caption =
    active !== null
      ? periods
        ? t('Selected {v}', { v: t(resolution) })
        : bucketTitle(labelPoints[active].start, resolution)
      : compare === 'none'
        ? `${t('Average')} / ${t(resolution)}`
        : t('Total');
  const diff = compare === 'period' && rows.length === 2 ? rows[0].value - rows[1].value : null;
  const diffPercent = diff !== null && rows[1].value > 0 ? Math.round((diff / rows[1].value) * 100) : null;

  const describe = (index: number) =>
    `${bucketTitle(labelPoints[index].start, resolution)}: ${lines.map((line) => `${line.label} ${money(line.points[index]?.total ?? 0, { cents: true })}`).join(', ')}`;

  const plot = {
    lines,
    slots: Math.max(1, slots),
    peak,
    type,
    resolution,
    labelPoints,
    active,
    onSelect: setSelected,
    describe,
  };

  const readout = empty ? (
    <p className="kc-section-empty text-xs font-medium text-[var(--muted)]">{t('No spending in this period.')}</p>
  ) : (
    <div className="space-y-1 px-1 text-xs font-bold tabular-nums" aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-[var(--muted)]">
        <span className="truncate">{caption}</span>
        {diff !== null && (
          <span className="whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--inset)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--text)]">
            {money(diff, { sign: true, cents: active !== null })}
            {diffPercent !== null && ` (${diffPercent > 0 ? '+' : ''}${diffPercent}%)`}
          </span>
        )}
        {compare === 'none' && <span className="font-extrabold text-[var(--activity-on-surface)]">{money(active !== null ? lines[0].points[active]?.total ?? 0 : average, { cents: active !== null })}</span>}
      </div>
      {compare !== 'none' &&
        rows.map(({ line, sub, value }) => (
          <div key={line.key} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-[var(--text)]">
              <span className={`size-2.5 shrink-0 rounded-full ${line.dashed ? 'opacity-60' : ''}`} style={{ background: line.color }} aria-hidden="true" />
              <span className="truncate">{line.label}</span>
              {sub && <span className="truncate font-medium text-[var(--muted)]">· {sub}</span>}
            </span>
            <span className="font-extrabold text-[var(--text)]">{money(value, { cents: active !== null })}</span>
          </div>
        ))}
    </div>
  );

  /** What the settings popup holds: everything that decides what the chart draws. */
  const settings = (
    <div className="space-y-4">
      <div>
        <span className={fieldLabel}>{t('Chart type')}</span>
        <Segmented label={t('Chart type')} value={type} options={TYPES} onChange={setType} />
      </div>
      <div>
        <span className={fieldLabel}>{t('Resolution')}</span>
        <Segmented label={t('Resolution')} value={resolution} options={RESOLUTIONS} onChange={(id) => { setResolution(id); resetSelection(); }} />
      </div>
      <div>
        <span className={fieldLabel}>{t('Compare')}</span>
        <Segmented label={t('Compare')} value={compare} options={COMPARES} onChange={(id) => { setCompare(id); resetSelection(); }} />
        <p className="mt-1.5 px-1 text-[11px] font-medium text-[var(--muted)]">
          {t(
            compare === 'none'
              ? 'One series: your expenses in the chosen period.'
              : compare === 'period'
                ? 'The period is drawn against a second one.'
                : compare === 'categories'
                  ? 'Several categories side by side.'
                  : 'Several categories, each against a second period (dashed).',
          )}
        </p>
      </div>

      {periods && (
        <div className="space-y-2.5 rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-3">
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
                <span className={fieldLabel}>{t('From')}</span>
                <input type="date" value={otherFrom} max={otherTo || undefined} onChange={(event) => event.target.value && setOtherFrom(event.target.value)} className={`${textInput} text-sm`} />
              </label>
              <label className="block min-w-0">
                <span className={fieldLabel}>{t('To')}</span>
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
          <span className={fieldLabel}>{t('Categories')}</span>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={picked.length === 0} onClick={() => { setPickedCategories([]); resetSelection(); }} className={chip(picked.length === 0)}>
              {byCategory ? t('Top {n}', { n: DEFAULT_CATEGORIES }) : t('All expenses')}
            </button>
            {categories.map(({ category }) => {
              const Icon = category.icon;
              const on = picked.includes(category.id);
              const color = byCategory ? lines.find((line) => line.key === category.id)?.color : undefined;
              return (
                <button key={category.id} type="button" aria-pressed={on} onClick={() => pickCategory(category.id)} className={chip(on)}>
                  {color ? <span className="size-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" /> : <Icon size={12} strokeWidth={2.4} aria-hidden="true" />}
                  {t(category.name)}
                </button>
              );
            })}
          </div>
          {byCategory && <p className="mt-1.5 px-1 text-[11px] font-medium text-[var(--muted)]">{t('Pick the categories to compare. None picked shows the biggest ones.')}</p>}
        </div>
      )}
    </div>
  );

  const popup = (inline: boolean) => (
    <ChartPopup open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('Chart settings')} inline={inline}>
      {settings}
    </ChartPopup>
  );

  const roundButton = 'pressable size-8 shrink-0 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)] flex items-center justify-center';
  const expandLabel = t('Open full view');

  return (
    <>
      <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-w-0 flex-1 flex items-center justify-between gap-2 text-left">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
              <ChartColumn size={16} className="text-[var(--muted)]" aria-hidden="true" />
              {t('Expenses over time')}
            </h3>
            <span className="flex items-center gap-2 tabular-nums">
              <span className="text-xs font-bold text-[var(--muted)]">{money(headTotal)}</span>
              <ChevronDown size={16} className={`text-[var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </span>
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label={t('Chart settings')} title={t('Chart settings')} className={roundButton}>
            <SlidersHorizontal size={15} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => setExpanded(true)} aria-label={expandLabel} title={expandLabel} className={roundButton}>
            <Maximize2 size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="accordion-grid" data-open={open} inert={!open || expanded}>
          <div className="accordion-inner">
            <div className="space-y-3 pt-3">
              {readout}
              {!empty && (
                <>
                  {/* A line is compressed to fit the whole period; bars keep their natural width and scroll. */}
                  <div ref={scroller} data-no-swipe className="no-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x touch-pan-y">
                    <div style={{ minWidth: type === 'bars' ? naturalWidth : undefined }}>
                      <ChartPlot {...plot} heightClass="h-32" />
                    </div>
                  </div>
                  <p className="um-hide px-1 text-center text-[11px] font-medium text-[var(--muted)]">
                    {t(type === 'bars' ? 'Tap a bar to read it' : 'Tap the line to read a point')}
                    {' · '}{t('Max')} {money(peak)}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {!expanded && popup(false)}
      <ChartLargeView
        open={expanded}
        onClose={() => setExpanded(false)}
        title={t('Expenses over time')}
        plot={plot}
        readout={readout}
        naturalWidth={naturalWidth}
        onOpenSettings={() => setSettingsOpen(true)}
        popup={expanded ? popup(true) : null}
      />
    </>
  );
}
