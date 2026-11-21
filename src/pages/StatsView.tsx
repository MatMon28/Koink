import { useMemo, useState } from 'react';
import { CalendarDays, CalendarRange, ChartPie, ChevronDown, ChevronRight, HandCoins, LineChart, PiggyBank } from 'lucide-react';
import { HeroPair, NoteCard, ShareCard } from '../components/cards';
import { Bar } from '../components/ui';
import { monthsBack, ruleShares, totalsByMonth } from '../lib/calc';
import { EXPENSE_CATEGORIES } from '../lib/categories';
import { currentMonth, elapsedDays, formatMonth, monthOf } from '../lib/dates';
import { percent, round2 } from '../lib/format';
import { useApp } from '../lib/store';
import { usePersistentState } from '../lib/usePersistentState';

type RangeKey = '3' | '6' | '12';
const RANGES: { id: RangeKey; label: string }[] = [
  { id: '3', label: '3 months' },
  { id: '6', label: '6 months' },
  { id: '12', label: '12 months' },
];

const W_SVG = 320;
const H_SVG = 120;

export function StatsView() {
  const { data, money, moneyFit, setSelectedMonth, setActiveTab } = useApp();
  const [range, setRange] = usePersistentState<RangeKey>('koink_stats_range', '6');
  const [trendOpen, setTrendOpen] = usePersistentState('koink_stats_trend_open', true);
  const [monthsOpen, setMonthsOpen] = usePersistentState('koink_stats_months_open', true);
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

  const months = useMemo(() => monthsBack(currentMonth(), Number(range)), [range]);
  const list = useMemo(() => totalsByMonth(data.txs, months), [data.txs, months]);

  const period = useMemo(() => {
    const active = list.filter((m) => m.count > 0);
    const n = Math.max(1, active.length);
    const sum = (fn: (m: (typeof list)[number]) => number) => active.reduce((acc, m) => acc + fn(m), 0);
    const income = sum((m) => m.income);
    const spent = sum((m) => m.spent);
    const saved = sum((m) => m.saved);
    const days = active.reduce((acc, m) => acc + elapsedDays(m.month), 0);
    const byCategory = EXPENSE_CATEGORIES.map((category) => ({
      category,
      total: round2(sum((m) => m.byCategory[category.id]?.total ?? 0)),
    })).filter((row) => row.total > 0).sort((a, b) => b.total - a.total);
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
  }, [list]);

  const shares = ruleShares({ income: period.avgIncome, needs: period.avgNeeds, wants: period.avgWants, saved: period.avgSaved });
  const shareTitle = shares.ofIncome ? 'of income' : 'of what went out';

  // Running balance (everything earned minus everything spent) at the end of each month of the range.
  const trend = useMemo(() => {
    if (data.txs.length === 0) return [];
    const first = monthOf(data.txs[data.txs.length - 1].date);
    const shown = months.filter((m) => m >= first);
    if (shown.length === 0) return [];
    let balance = 0;
    for (const tx of data.txs) {
      if (monthOf(tx.date) >= shown[0]) continue;
      if (tx.kind === 'income') balance += tx.amount;
      else if (tx.kind === 'expense') balance -= tx.amount;
    }
    return shown.map((month) => {
      balance += list.find((m) => m.month === month)?.net ?? 0;
      return { month, value: round2(balance) };
    });
  }, [data.txs, months, list]);

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

  const goToMonth = (month: string) => {
    setSelectedMonth(month);
    setActiveTab('month');
  };

  return (
    <div className="um-stack space-y-4">
      <div className="flex justify-center">
        <div role="group" aria-label="Period" className="inline-flex w-fit max-w-full items-center justify-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full">
          {RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={range === item.id}
              onClick={() => {
                setRange(item.id);
                setSelectedPoint(null);
              }}
              className={`pressable px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap ${
                range === item.id
                  ? 'bg-[var(--text)] text-[var(--on-text)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="um-hide px-1 text-center text-xs font-bold tabular-nums text-[var(--muted)]">
        {formatMonth(months[0], 'short')} – {formatMonth(months[months.length - 1], 'short')} · {period.activeCount}/{months.length} months with entries
      </p>

      <HeroPair inLabel="Income" outLabel="Spent" inAmount={Math.round(period.avgIncome)} outAmount={Math.round(period.avgSpent)} average pillTitle="Average income minus average spending, per month" />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <ShareCard tone="needs" label="Needs" amount={period.avgNeeds} share={shares.needs} target={shares.ofIncome ? data.profile.rule.needs : undefined} shareTitle={shareTitle} />
        <ShareCard tone="wants" label="Wants" amount={period.avgWants} share={shares.wants} target={shares.ofIncome ? data.profile.rule.wants : undefined} shareTitle={shareTitle} />
        <ShareCard tone="savings" label="Savings" amount={period.avgSaved} share={shares.savings} target={shares.ofIncome ? data.profile.rule.savings : undefined} shareTitle={shareTitle} />
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <NoteCard icon={PiggyBank} label="Saved" value={moneyFit(period.saved, 7)} title="Moved to savings in this period" />
        <NoteCard icon={HandCoins} label="Kept" value={`${percent(period.income - period.spent, period.income)}%`} title="Share of income that was not spent" />
        <NoteCard icon={CalendarDays} label="Per day" value={moneyFit(period.perDay, 7)} title="Average spending per day" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Balance trend */}
        <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
          <button type="button" onClick={() => setTrendOpen(!trendOpen)} aria-expanded={trendOpen} className="w-full flex items-center justify-between gap-2 text-left">
            <span className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
              <span className="w-7 h-7 rounded-full bg-transparent text-[var(--weight-on-surface)] flex items-center justify-center shrink-0">
                <LineChart size={16} />
              </span>
              <span className="um-sr">Balance trend</span>
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
                <p className="kc-section-empty pt-3 text-xs font-medium text-[var(--muted)]">Your balance over time appears here once you have logged something.</p>
              ) : (
                <div className="pt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs font-bold tabular-nums px-1" aria-live="polite">
                    <span className="text-[var(--muted)]">End of {formatMonth(activePoint.month)}</span>
                    <span className="text-[var(--weight-on-surface)] font-extrabold">{money(activePoint.value)}</span>
                  </div>
                  <svg viewBox={`0 0 ${W_SVG} ${H_SVG}`} className="w-full h-32 overflow-visible" role="group" aria-label="Balance at the end of each month">
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
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
              <ChartPie size={16} className="um-only text-[var(--muted)]" aria-hidden="true" />
              <span className="um-sr">Where it went</span>
            </h3>
            <span className="text-xs font-bold tabular-nums text-[var(--muted)]">{money(period.spent)}</span>
          </div>
          {period.byCategory.length === 0 ? (
            <p className="kc-section-empty pt-3 text-xs font-medium text-[var(--muted)]">No spending in this period.</p>
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
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--pill-c-text,#1A4670)]" />Needs</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[var(--pill-p-text,#7D4E14)]" />Wants</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Month by month */}
      <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
        <button type="button" onClick={() => setMonthsOpen(!monthsOpen)} aria-expanded={monthsOpen} className="w-full flex items-center justify-between gap-2 text-left">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
            <CalendarRange size={16} className="um-only text-[var(--muted)]" aria-hidden="true" />
            <span className="um-sr">Month by month</span>
          </h3>
          <span className="flex items-center gap-2">
            <span className="um-hide hidden sm:inline text-[11px] font-medium text-[var(--muted)]">Tap a month to open it</span>
            <ChevronDown size={16} className={`text-[var(--muted)] transition-transform duration-200 ${monthsOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>
        <div className="accordion-grid" data-open={monthsOpen} inert={!monthsOpen}>
          <div className="accordion-inner">
            {period.activeCount === 0 && (
              <p className="kc-section-empty pt-3 text-xs font-medium text-[var(--muted)]">No entries in this period.</p>
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
                        <span className="font-bold text-[var(--intake-on-surface)]">Income</span>
                        <span className="font-extrabold text-[var(--text)]">{money(m.income)}</span>
                      </div>
                      <Bar value={m.income} max={maxMonth} track="bg-intake" fill="bg-intake-accent" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-[var(--activity-on-surface)]">Spent</span>
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
