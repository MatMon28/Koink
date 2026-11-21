import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CalendarRange, ChartColumn, ChartPie, ChevronDown, ChevronRight, HandCoins, LineChart, Tag } from 'lucide-react';
import { PigIcon } from '../lib/pig';
import { HeroPair, NoteCard, ShareCard } from '../components/cards';
import { Bar, textInput } from '../components/ui';
import { monthsBack, ruleShares, totalsByMonth } from '../lib/calc';
import { allExpenseCategories } from '../lib/categories';
import { addDays, addMonths, currentMonth, daysBetween, daysInMonth, elapsedDays, formatDay, formatMonth, monthOf, todayStr } from '../lib/dates';
import { axisLabel, bucketTitle, expenseSeries, SLOT_PX, type Resolution } from '../lib/expenseSeries';
import { percent, round2 } from '../lib/format';
import { useApp } from '../lib/store';
import { usePersistentState } from '../lib/usePersistentState';
import { t } from '../lib/i18n';

/** 1 = this month, 3 / 6 / 12 = that many months ending now, custom = a first and a last day. */
type RangeKey = '1' | '3' | '6' | '12' | 'custom';
const RANGES: { id: RangeKey; label: string }[] = [
  { id: '1', label: '1 month' },
  { id: '3', label: '3 months' },
  { id: '6', label: '6 months' },
  { id: '12', label: '12 months' },
  { id: 'custom', label: 'Custom' },
];
const RESOLUTIONS: { id: Resolution; label: string }[] = [
  { id: 'day', label: 'Per day' },
  { id: 'week', label: 'Per week' },
  { id: 'month', label: 'Per month' },
];
/** The longest custom period: five years of months. */
const MAX_CUSTOM_MONTHS = 60;

const W_SVG = 320;
const H_SVG = 120;

export function StatsView() {
  const { data, money, moneyFit, setSelectedMonth, setActiveTab } = useApp();
  const [range, setRange] = usePersistentState<RangeKey>('koink_stats_range', '6');
  const [customFrom, setCustomFrom] = usePersistentState('koink_stats_from', addDays(todayStr(), -29));
  const [customTo, setCustomTo] = usePersistentState('koink_stats_to', todayStr());
  const [trendOpen, setTrendOpen] = usePersistentState('koink_stats_trend_open', true);
  const [monthsOpen, setMonthsOpen] = usePersistentState('koink_stats_months_open', true);
  const [whereOpen, setWhereOpen] = usePersistentState('koink_stats_where_open', true);
  const [chartOpen, setChartOpen] = usePersistentState('koink_stats_chart_open', true);
  const [resolution, setResolution] = usePersistentState<Resolution>('koink_stats_chart_res', 'week');
  const [pickedCategories, setPickedCategories] = useState<string[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const [selectedBar, setSelectedBar] = useState<number | null>(null);

  const custom = range === 'custom';
  // Totals (not monthly averages) for one month and for a custom period; averages for 3 / 6 / 12 months.
  const averaged = range === '3' || range === '6' || range === '12';

  // The period as days: the chart and the custom filter work on these; the months below drive the rest.
  const { fromDate, toDate, months } = useMemo(() => {
    if (custom) {
      const [from, to] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
      const list: string[] = [];
      for (let m = monthOf(from); m <= monthOf(to) && list.length < MAX_CUSTOM_MONTHS; m = addMonths(m, 1)) list.push(m);
      return { fromDate: from, toDate: to, months: list };
    }
    const list = monthsBack(currentMonth(), Number(range));
    const last = list[list.length - 1];
    return { fromDate: `${list[0]}-01`, toDate: `${last}-${String(daysInMonth(last)).padStart(2, '0')}`, months: list };
  }, [range, custom, customFrom, customTo]);

  // A custom period only counts the entries inside its days (its first and last month are partly in).
  const scopedTxs = useMemo(() => (custom ? data.txs.filter((tx) => tx.date >= fromDate && tx.date <= toDate) : data.txs), [custom, data.txs, fromDate, toDate]);
  const list = useMemo(() => totalsByMonth(scopedTxs, months), [scopedTxs, months]);

  const period = useMemo(() => {
    const active = list.filter((m) => m.count > 0);
    const n = averaged ? Math.max(1, active.length) : 1;
    const sum = (fn: (m: (typeof list)[number]) => number) => active.reduce((acc, m) => acc + fn(m), 0);
    const income = sum((m) => m.income);
    const spent = sum((m) => m.spent);
    const saved = sum((m) => m.saved);
    // A custom period counts its own days (up to today); otherwise the days elapsed in the months with entries.
    const days = custom
      ? Math.max(1, daysBetween(fromDate, toDate < todayStr() ? toDate : todayStr()) + 1)
      : active.reduce((acc, m) => acc + elapsedDays(m.month), 0);
    const byCategory = allExpenseCategories().map((category) => ({
      category,
      total: round2(sum((m) => m.byCategory[category.id]?.total ?? 0)),
    })).filter((row) => row.total > 0).sort((a, b) => b.total - a.total);
    // Entries whose category was deleted since still count: they are gathered under "Other".
    const orphaned = round2(spent - byCategory.reduce((acc, row) => acc + row.total, 0));
    if (orphaned > 0) byCategory.push({ category: { id: '_other', name: 'Other', icon: Tag, bucket: 'wants' }, total: orphaned });
    return {
      activeCount: active.length,
      income,
      spent,
      saved,
      avgIncome: income / n,
      avgSpent: spent / n,
      avgNeeds: sum((m) => m.needs) / n,
      avgWants: sum((m) => m.wants) / n,
      avgSaved: saved / n,
      perDay: days > 0 ? spent / days : 0,
      byCategory,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, data.categories, averaged, custom, fromDate, toDate]);

  const shares = ruleShares({ income: period.avgIncome, needs: period.avgNeeds, wants: period.avgWants, saved: period.avgSaved });
  const shareTitle = shares.ofIncome ? 'of income' : 'of what went out';

  // Running balance (everything earned minus everything spent) at the end of each month of the range.
  const trend = useMemo(() => {
    if (data.txs.length === 0) return [];
    const first = monthOf(data.txs[data.txs.length - 1].date);
    const shown = months.filter((m) => m >= first);
    if (shown.length === 0) return [];
    // Everything before the period (a custom one can start mid-month) is the starting balance.
    const startDate = custom && fromDate > `${shown[0]}-01` ? fromDate : `${shown[0]}-01`;
    let balance = 0;
    for (const tx of data.txs) {
      if (tx.date >= startDate) continue;
      if (tx.kind === 'income') balance += tx.amount;
      else if (tx.kind === 'expense') balance -= tx.amount;
    }
    return shown.map((month) => {
      balance += list.find((m) => m.month === month)?.net ?? 0;
      return { month, value: round2(balance) };
    });
  }, [data.txs, months, list, custom, fromDate]);

  const values = trend.map((p) => p.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const pX = (index: number) => (trend.length > 1 ? 16 + (index * (W_SVG - 32)) / (trend.length - 1) : W_SVG / 2);
  const pY = (value: number) => (maxV === minV ? 60 : 98 - ((value - minV) / (maxV - minV)) * 76);
  const activeIndex = selectedPoint !== null && selectedPoint < trend.length ? selectedPoint : trend.length - 1;
  const activePoint = trend[activeIndex];
  const trendDelta = trend.length > 1 ? round2(trend[trend.length - 1].value - trend[0].value) : 0;
  const maxMonth = Math.max(...list.map((m) => Math.max(m.income, m.spent)), 1);
  const maxCategory = period.byCategory[0]?.total ?? 1;

  // Expense chart: all expenses, or only the picked categories, per day / week / month.
  const knownIds = useMemo(() => new Set(allExpenseCategories().map((c) => c.id)), [data.categories]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickable = period.byCategory.map((row) => row.category);
  const picked = pickedCategories.filter((id) => pickable.some((c) => c.id === id));
  const series = useMemo(
    () => expenseSeries(
      data.txs,
      fromDate,
      toDate,
      resolution,
      picked.length === 0 ? undefined : (tx) => picked.includes(knownIds.has(tx.categoryId) ? tx.categoryId : '_other'),
    ),
    // `picked` is derived from pickedCategories and the period
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.txs, fromDate, toDate, resolution, pickedCategories, knownIds, period.byCategory],
  );
  const seriesMax = Math.max(...series.map((p) => p.total), 0);
  const seriesTotal = round2(series.reduce((acc, p) => acc + p.total, 0));
  const seriesAvg = series.length > 0 ? seriesTotal / series.length : 0;
  const barIndex = selectedBar !== null && selectedBar < series.length ? selectedBar : null;
  const barsRef = useRef<HTMLDivElement>(null);
  const slot = SLOT_PX[resolution];
  // The newest bars are the ones that matter: start scrolled to the right.
  useEffect(() => {
    const el = barsRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [series.length, resolution, chartOpen]);

  const goToMonth = (month: string) => {
    setSelectedMonth(month);
    setActiveTab('month');
  };

  return (
    <div className="um-stack space-y-4">
      <div className="flex justify-center">
        <div role="group" aria-label={t('Period')} className="inline-flex w-fit max-w-full items-center justify-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={range === item.id}
              onClick={() => {
                setRange(item.id);
                setSelectedPoint(null);
              }}
              className={`pressable px-2.5 sm:px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold whitespace-nowrap ${
                range === item.id
                  ? 'bg-[var(--text)] text-[var(--on-text)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]'
              }`}
            >
              {t(item.label)}
            </button>
          ))}
        </div>
      </div>

      {custom && (
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block min-w-0">
            <span className="block mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('From')}</span>
            <input type="date" value={customFrom} max={customTo || undefined} onChange={(event) => event.target.value && setCustomFrom(event.target.value)} className={`${textInput} text-sm`} />
          </label>
          <label className="block min-w-0">
            <span className="block mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('To')}</span>
            <input type="date" value={customTo} min={customFrom || undefined} onChange={(event) => event.target.value && setCustomTo(event.target.value)} className={`${textInput} text-sm`} />
          </label>
        </div>
      )}

      <p className="um-hide px-1 text-center text-xs font-bold tabular-nums text-[var(--muted)]">
        {custom
          ? `${formatDay(fromDate, false)} ${fromDate.slice(0, 4)} – ${formatDay(toDate, false)} ${toDate.slice(0, 4)} · ${daysBetween(fromDate, toDate) + 1} ${t('days')}`
          : range === '1'
            ? formatMonth(months[0])
            : `${formatMonth(months[0], 'short')} – ${formatMonth(months[months.length - 1], 'short')} · ${period.activeCount}/${months.length} ${t('months with entries')}`}
      </p>

      <HeroPair
        inLabel={t('Income')}
        outLabel={t('Spent')}
        inAmount={Math.round(period.avgIncome)}
        outAmount={Math.round(period.avgSpent)}
        average={averaged}
        pillTitle={averaged ? t('Average income minus average spending, per month') : t('Income minus spending in this period')}
      />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <ShareCard tone="needs" label={t('Needs')} amount={period.avgNeeds} share={shares.needs} target={shares.ofIncome ? data.profile.rule.needs : undefined} shareTitle={shareTitle} />
        <ShareCard tone="wants" label={t('Wants')} amount={period.avgWants} share={shares.wants} target={shares.ofIncome ? data.profile.rule.wants : undefined} shareTitle={shareTitle} />
        <ShareCard tone="savings" label={t('Savings')} amount={period.avgSaved} share={shares.savings} target={shares.ofIncome ? data.profile.rule.savings : undefined} shareTitle={shareTitle} />
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <NoteCard tone="needs" icon={PigIcon} label={t('Saved')} value={moneyFit(period.saved, 7)} title={t('Moved to savings in this period')} />
        <NoteCard tone="wants" icon={HandCoins} label={t('Kept')} value={`${percent(period.income - period.spent, period.income)}%`} title={t('Share of income that was not spent')} />
        <NoteCard tone="savings" icon={CalendarDays} label={t('Per day')} value={moneyFit(period.perDay, 7)} title={t('Average spending per day')} />
      </div>

      {/* Expense chart: all expenses or only the picked categories, per day / week / month */}
      <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
        <button type="button" onClick={() => setChartOpen(!chartOpen)} aria-expanded={chartOpen} className="w-full flex items-center justify-between gap-2 text-left">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
            <ChartColumn size={16} className="text-[var(--muted)]" aria-hidden="true" />
            {t('Expenses over time')}
          </h3>
          <span className="flex items-center gap-2 tabular-nums">
            <span className="text-xs font-bold text-[var(--muted)]">{money(seriesTotal)}</span>
            <ChevronDown size={16} className={`text-[var(--muted)] transition-transform duration-200 ${chartOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>
        <div className="accordion-grid" data-open={chartOpen} inert={!chartOpen}>
          <div className="accordion-inner">
            <div className="pt-3 space-y-3">
              <div role="group" aria-label={t('Resolution')} className="flex justify-center">
                <div className="inline-flex items-center gap-1 p-1 bg-[var(--inset)] border border-[var(--border)] rounded-full">
                  {RESOLUTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={resolution === item.id}
                      onClick={() => {
                        setResolution(item.id);
                        setSelectedBar(null);
                      }}
                      className={`pressable px-3 py-1.5 rounded-full text-[11px] font-extrabold whitespace-nowrap ${
                        resolution === item.id ? 'bg-[var(--text)] text-[var(--on-text)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--hover)]'
                      }`}
                    >
                      {t(item.label)}
                    </button>
                  ))}
                </div>
              </div>

              {pickable.length > 0 && (
                <div>
                  <span className="block mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Categories')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      aria-pressed={picked.length === 0}
                      onClick={() => {
                        setPickedCategories([]);
                        setSelectedBar(null);
                      }}
                      className={`pressable px-2.5 py-1.5 rounded-full text-[11px] font-extrabold border ${
                        picked.length === 0 ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]' : 'bg-[var(--inset)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--hover)]'
                      }`}
                    >
                      {t('All expenses')}
                    </button>
                    {pickable.map((category) => {
                      const Icon = category.icon;
                      const on = picked.includes(category.id);
                      return (
                        <button
                          key={category.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => {
                            setPickedCategories(on ? picked.filter((id) => id !== category.id) : [...picked, category.id]);
                            setSelectedBar(null);
                          }}
                          className={`pressable inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-extrabold border ${
                            on ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]' : 'bg-[var(--inset)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--hover)]'
                          }`}
                        >
                          <Icon size={12} strokeWidth={2.4} aria-hidden="true" />
                          {t(category.name)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {series.length === 0 || seriesTotal === 0 ? (
                <p className="kc-section-empty text-xs font-medium text-[var(--muted)]">{t('No spending in this period.')}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2 text-xs font-bold tabular-nums px-1" aria-live="polite">
                    <span className="text-[var(--muted)]">
                      {barIndex !== null ? bucketTitle(series[barIndex].start, resolution) : `${t('Average')} / ${t(resolution)}`}
                    </span>
                    <span className="text-[var(--activity-on-surface)] font-extrabold">{money(barIndex !== null ? series[barIndex].total : seriesAvg, { cents: barIndex !== null })}</span>
                  </div>
                  {/* Bars: a plain flex row that scrolls sideways when there are too many to fit. */}
                  <div ref={barsRef} data-no-swipe className="no-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x touch-pan-y">
                    <div style={{ minWidth: series.length * slot }}>
                      <div className="flex items-end h-32 gap-[3px] border-b border-[var(--border)]" role="group" aria-label={t('Expenses per {v}', { v: t(resolution) })}>
                        {series.map((point, index) => {
                          const height = seriesMax > 0 ? Math.max(point.total > 0 ? 3 : 0, (point.total / seriesMax) * 100) : 0;
                          const on = barIndex === index;
                          return (
                            <button
                              key={point.start}
                              type="button"
                              onClick={() => setSelectedBar(on ? null : index)}
                              aria-pressed={on}
                              aria-label={`${bucketTitle(point.start, resolution)}: ${money(point.total, { cents: true })}`}
                              className="group h-full flex-1 min-w-0 flex items-end focus:outline-none"
                            >
                              <span
                                className={`block w-full rounded-t-md transition-colors ${on ? 'bg-[var(--text)]' : 'bg-activity-accent group-hover:opacity-80 group-focus-visible:opacity-80'}`}
                                style={{ height: `${height}%` }}
                              />
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-[3px]" aria-hidden="true">
                        {series.map((point) => (
                          <span key={point.start} className="relative h-5 flex-1 min-w-0">
                            <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap text-[9.5px] font-bold text-[var(--muted)]">{axisLabel(point.start, resolution)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="um-hide px-1 text-center text-[11px] font-medium text-[var(--muted)]">
                    {picked.length === 0 ? t('All expenses') : picked.map((id) => pickable.find((c) => c.id === id)?.name).filter(Boolean).map((name) => t(name as string)).join(', ')}
                    {' · '}{t('Tap a bar to read it')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Balance trend */}
        <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
          <button type="button" onClick={() => setTrendOpen(!trendOpen)} aria-expanded={trendOpen} className="w-full flex items-center justify-between gap-2 text-left">
            <span className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
              <span className="w-7 h-7 rounded-full bg-transparent text-[var(--weight-on-surface)] flex items-center justify-center shrink-0">
                <LineChart size={16} />
              </span>
              <span className="um-sr">{t('Balance trend')}</span>
            </span>
            <span className="flex items-center gap-2 tabular-nums">
              {trend.length > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-weight text-weight-ink">{money(trendDelta, { sign: true })}</span>
              )}
              <ChevronDown size={16} className={`text-[var(--muted)] transition-transform duration-200 ${trendOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
          <div className="accordion-grid" data-open={trendOpen} inert={!trendOpen}>
            <div className="accordion-inner">
              {trend.length === 0 ? (
                <p className="kc-section-empty pt-3 text-xs font-medium text-[var(--muted)]">{t('Your balance over time appears here once you have logged something.')}</p>
              ) : (
                <div className="pt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs font-bold tabular-nums px-1" aria-live="polite">
                    <span className="text-[var(--muted)]">{t('End of')} {formatMonth(activePoint.month)}</span>
                    <span className="text-[var(--weight-on-surface)] font-extrabold">{money(activePoint.value)}</span>
                  </div>
                  <svg viewBox={`0 0 ${W_SVG} ${H_SVG}`} className="w-full h-32 overflow-visible" role="group" aria-label={t('Balance at the end of each month')}>
                    {[22, 98].map((y) => (
                      <line key={y} x1={8} x2={W_SVG - 8} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
                    ))}
                    {trend.length > 1 && (
                      <>
                        <polyline points={trend.map((p, i) => `${pX(i)},${pY(p.value)}`).join(' ')} fill="none" stroke="var(--color-weight)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
                        <polyline points={trend.map((p, i) => `${pX(i)},${pY(p.value)}`).join(' ')} fill="none" stroke="var(--weight-on-surface)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    )}
                    {trend.map((p, i) => {
                      const selected = activeIndex === i;
                      return (
                        <g
                          key={p.month}
                          role="button"
                          aria-label={`${formatMonth(p.month)}: ${money(p.value)}`}
                          aria-pressed={selected}
                          tabIndex={trendOpen ? 0 : -1}
                          onClick={() => setSelectedPoint(i)}
                          onMouseEnter={() => setSelectedPoint(i)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              setSelectedPoint(i);
                            }
                          }}
                          className="cursor-pointer focus:outline-none [&:focus-visible>circle:last-child]:stroke-[3]"
                        >
                          <circle cx={pX(i)} cy={pY(p.value)} r="13" fill="transparent" />
                          <circle cx={pX(i)} cy={pY(p.value)} r={selected ? 5.5 : 4} fill="var(--color-weight)" stroke="var(--color-weight-ink)" strokeWidth={selected ? 2.2 : 1.6} />
                        </g>
                      );
                    })}
                    {trend.map((p, i) => (
                      <text key={p.month} x={pX(i)} y={H_SVG - 2} textAnchor="middle" fontSize="9.5" fontWeight={activeIndex === i ? 800 : 700} fill={activeIndex === i ? 'var(--text)' : 'var(--muted)'}>
                        {formatMonth(p.month, 'short', false)}
                      </text>
                    ))}
                  </svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Where it went */}
        <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
          <button type="button" onClick={() => setWhereOpen(!whereOpen)} aria-expanded={whereOpen} className="w-full flex items-center justify-between gap-2 text-left">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
              <ChartPie size={16} className="um-only text-[var(--muted)]" aria-hidden="true" />
              <span className="um-sr">{t('Where it went')}</span>
            </h3>
            <span className="flex items-center gap-2 tabular-nums">
              <span className="text-xs font-bold text-[var(--muted)]">{money(period.spent)}</span>
              <ChevronDown size={16} className={`text-[var(--muted)] transition-transform duration-200 ${whereOpen ? 'rotate-180' : ''}`} />
            </span>
          </button>
          <div className="accordion-grid" data-open={whereOpen} inert={!whereOpen}>
            <div className="accordion-inner">
          {period.byCategory.length === 0 ? (
            <p className="kc-section-empty pt-3 text-xs font-medium text-[var(--muted)]">{t('No spending in this period.')}</p>
          ) : (
            <div className="pt-3 space-y-3">
              {period.byCategory.map(({ category, total }) => {
                const Icon = category.icon;
                const needs = category.bucket === 'needs';
                return (
                  <div key={category.id}>
                    <div className="flex items-center justify-between gap-2 text-[11px] mb-1 tabular-nums">
                      <span className="flex items-center gap-1.5 min-w-0 font-bold text-[var(--text)]">
                        <Icon size={13} strokeWidth={2.2} className="shrink-0" />
                        <span className="truncate">{category.name}</span>
                      </span>
                      <span className="shrink-0">
                        <span className="font-extrabold text-[var(--text)]">{money(total)}</span>
                        <span className="font-bold text-[var(--muted)]"> · {percent(total, period.spent)}%</span>
                      </span>
                    </div>
                    <Bar
                      value={total}
                      max={maxCategory}
                      track={needs ? 'bg-[var(--pill-c-bg,#CFE7FE)]' : 'bg-[var(--pill-p-bg,#FAE0B4)]'}
                      fill={needs ? 'bg-[var(--pill-c-text,#1A4670)]' : 'bg-[var(--pill-p-text,#7D4E14)]'}
                    />
                  </div>
                );
              })}
              <p className="flex items-center gap-3 pt-0.5 text-[11px] font-bold text-[var(--muted)]">
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--pill-c-text,#1A4670)]" />{t('Needs')}</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--pill-p-text,#7D4E14)]" />{t('Wants')}</span>
              </p>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>

      {/* Month by month */}
      <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
        <button type="button" onClick={() => setMonthsOpen(!monthsOpen)} aria-expanded={monthsOpen} className="w-full flex items-center justify-between gap-2 text-left">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
            <CalendarRange size={16} className="um-only text-[var(--muted)]" aria-hidden="true" />
            <span className="um-sr">{t('Month by month')}</span>
          </h3>
          <span className="flex items-center gap-2">
            <span className="um-hide hidden sm:inline text-[11px] font-medium text-[var(--muted)]">{t('Tap a month to open it')}</span>
            <ChevronDown size={16} className={`text-[var(--muted)] transition-transform duration-200 ${monthsOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>
        <div className="accordion-grid" data-open={monthsOpen} inert={!monthsOpen}>
          <div className="accordion-inner">
            {period.activeCount === 0 && (
              <p className="kc-section-empty pt-3 text-xs font-medium text-[var(--muted)]">{t('No entries in this period.')}</p>
            )}
            <div className={period.activeCount === 0 ? 'hidden' : 'pt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5'}>
              {[...list].reverse().filter((m) => m.count > 0).map((m) => (
                <button
                  key={m.month}
                  type="button"
                  onClick={() => goToMonth(m.month)}
                  className="pressable pressable-soft w-full text-left p-3.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] space-y-2 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-extrabold text-[var(--text)]">{formatMonth(m.month)}</span>
                    <div className="flex items-center gap-2 tabular-nums">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${m.net > 0 ? 'bg-intake text-intake-ink' : 'bg-activity text-activity-ink'}`}>
                        {money(m.net, { sign: true })}
                      </span>
                      <ChevronRight size={16} className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-0.5 tabular-nums">
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-[var(--intake-on-surface)]">{t('Income')}</span>
                        <span className="font-extrabold text-[var(--text)]">{money(m.income)}</span>
                      </div>
                      <Bar value={m.income} max={maxMonth} track="bg-intake" fill="bg-intake-accent" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-[var(--activity-on-surface)]">{t('Spent')}</span>
                        <span className="font-extrabold text-[var(--text)]">{money(m.spent)}</span>
                      </div>
                      <Bar value={m.spent} max={maxMonth} track="bg-activity" fill="bg-activity-accent" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
