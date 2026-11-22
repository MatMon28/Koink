import { useMemo, useState } from 'react';
import { ICON } from '../lib/icons';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { allExpenseCategories, expenseCategory } from '../lib/categories';
import { currentMonth, formatDay, formatMonth } from '../lib/dates';
import { inflationCandidates, inflationTrend, personalInflation, type InflationBase, type InflationOptions, type InflationWindow } from '../lib/inflation';
import { t } from '../lib/i18n';
import { useApp } from '../lib/store';
import { usePersistentState } from '../lib/usePersistentState';

/**
 * Statistics > Personal inflation (Full mode). How much more (or less) your own life costs than before, for every
 * expense or one category: your prices (things you bought in both periods, same title) and your spending (the
 * total). Expenses can be left out (a holiday, a repair): the choice is `settings.inflationExcluded`, so it is in
 * the backup. The maths is `src/lib/inflation.ts`.
 */

type Metric = 'prices' | 'spending';

const WINDOWS: InflationWindow[] = [3, 6, 12];
const BASES: { id: InflationBase; label: string }[] = [
  { id: 'year', label: 'vs a year ago' },
  { id: 'previous', label: 'vs the period before' },
];

const chip = (on: boolean) =>
  `pressable shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-extrabold ${
    on ? 'border-[var(--text)] bg-[var(--text)] text-[var(--on-text)]' : 'border-[var(--border)] bg-[var(--inset)] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
  }`;

/** More expensive is red, cheaper is green. */
const tone = (value: number | null) => (value == null || Math.abs(value) < 0.0005 ? 'text-[var(--text)]' : value > 0 ? 'text-activity-accent' : 'text-intake-accent');

export function PersonalInflation() {
  const { data, money, updateSettings } = useApp();
  const [open, setOpen] = usePersistentState('koink_inflation_open', true);
  const [months, setMonths] = usePersistentState<InflationWindow>('koink_inflation_months', 12);
  const [base, setBase] = usePersistentState<InflationBase>('koink_inflation_base', 'year');
  const [metric, setMetric] = useState<Metric>('prices');
  const [categoryId, setCategoryId] = useState('');
  const [picking, setPicking] = useState(false);

  const locale = data.settings.language === 'it' ? 'it-IT' : 'en-US';
  const pct = (value: number | null) => (value == null ? '–' : `${(value * 100).toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: 'exceptZero' })}%`);

  const excluded = useMemo(() => new Set(data.settings.inflationExcluded), [data.settings.inflationExcluded]);
  const nameOf = (id: string) => expenseCategory(id)?.name;

  // Categories that have expenses (hidden ones too: their entries still count).
  const categories = useMemo(() => {
    const used = new Set(data.txs.filter((tx) => tx.kind === 'expense').map((tx) => tx.categoryId));
    return allExpenseCategories().filter((c) => used.has(c.id));
  }, [data.txs]);
  const scope = categories.some((c) => c.id === categoryId) ? categoryId : '';

  const opts: InflationOptions = useMemo(
    () => ({ txs: data.txs, excluded, months, base, currentMonth: currentMonth(), categoryId: scope || undefined, categoryName: nameOf }),
    [data.txs, excluded, months, base, scope],
  );
  const result = useMemo(() => personalInflation(opts), [opts]);
  const trend = useMemo(() => inflationTrend(opts, 12), [opts]);
  const candidates = useMemo(() => (picking ? inflationCandidates(opts).slice(0, 60) : []), [picking, opts]);

  const headline = result[metric] ?? result.spending;
  const peak = Math.max(0.05, ...trend.map((point) => Math.abs(point[metric] ?? 0)));
  const hasTrend = trend.some((point) => point[metric] != null);
  const rangeLabel = (r: { from: string; to: string }) => `${formatMonth(r.from, 'short')} – ${formatMonth(r.to, 'short')}`;

  const toggle = (id: string) => {
    const next = new Set(excluded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateSettings({ inflationExcluded: [...next] });
  };

  const tile = (id: Metric, label: string, value: number | null, sub: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={metric === id}
      onClick={() => setMetric(id)}
      className={`pressable min-w-0 rounded-2xl border p-3 text-left ${metric === id ? 'border-[var(--text)] bg-[var(--inset)]' : 'border-[var(--border)] hover:bg-[var(--inset)]'}`}
    >
      <span className="block truncate text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <span className={`block text-2xl font-extrabold tabular-nums ${tone(value)}`}>{pct(value)}</span>
      <span className="block truncate text-[11px] font-bold text-[var(--muted)]">{sub}</span>
    </button>
  );

  const enough = result.spending != null;

  return (
    <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 text-left">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">
          <TrendingUp size={ICON.md} className="text-[var(--muted)]" aria-hidden="true" />
          {t('Personal inflation')}
        </h3>
        <span className="flex items-center gap-2 tabular-nums">
          <span className={`text-xs font-extrabold ${tone(headline)}`}>{enough ? pct(headline) : '–'}</span>
          <ChevronDown size={ICON.md} className={`text-[var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      <div className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <div className="space-y-3.5 pt-3.5">
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('Period')}>
              {WINDOWS.map((n) => (
                <button key={n} type="button" aria-pressed={months === n} onClick={() => setMonths(n)} className={chip(months === n)}>{t('{n} mo', { n })}</button>
              ))}
              <span className="w-px self-stretch bg-[var(--border)]" aria-hidden="true" />
              {BASES.map((item) => (
                <button key={item.id} type="button" aria-pressed={base === item.id} onClick={() => setBase(item.id)} className={chip(base === item.id)}>{t(item.label)}</button>
              ))}
            </div>

            <div data-scroll-fade="x" className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="group" aria-label={t('Category')}>
              <button type="button" aria-pressed={scope === ''} onClick={() => setCategoryId('')} className={chip(scope === '')}>{t('All expenses')}</button>
              {categories.map((c) => (
                <button key={c.id} type="button" aria-pressed={scope === c.id} onClick={() => setCategoryId(c.id)} className={chip(scope === c.id)}>{t(c.name)}</button>
              ))}
            </div>

            {!enough ? (
              <p className="rounded-2xl bg-[var(--inset)] p-3 text-xs font-bold text-[var(--muted)]">
                {t('Not enough history yet: there are no expenses between {from} and {to} to compare with.', { from: formatMonth(result.before.from, 'short'), to: formatMonth(result.before.to, 'short') })}
              </p>
            ) : (
              <>
                <p className="text-[11px] font-bold text-[var(--muted)]">
                  {rangeLabel(result.now)} {t('compared with')} {rangeLabel(result.before)}
                </p>
                <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={t('Measure')}>
                  {tile('prices', t('Your prices'), result.prices, result.items.length > 0 ? t('{n} items bought both times', { n: result.items.length }) : t('No item bought in both periods'))}
                  {tile('spending', t('Your spending'), result.spending, `${money(result.spentNow)} ${t('vs')} ${money(result.spentBefore)}`)}
                </div>
                <p className="text-[11px] font-medium text-[var(--muted)]">
                  {metric === 'prices'
                    ? t('The change in what the same things cost you: items with the same title in the same category, priced at how often you bought them lately.')
                    : t('The change in how much you spent in total. It also moves when you simply buy more or less.')}
                </p>

                {hasTrend && (
                  <div>
                    <h4 className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Month by month')}</h4>
                    <div data-scroll-fade="x" className="no-scrollbar overflow-x-auto">
                      <div className="flex h-28 min-w-[18rem] items-stretch gap-1" role="list" aria-label={t('Personal inflation by month')}>
                        {trend.map((point) => {
                          const value = point[metric];
                          const height = value == null ? 0 : Math.max(3, (Math.abs(value) / peak) * 50);
                          return (
                            <div key={point.month} role="listitem" title={`${formatMonth(point.month, 'short')}: ${pct(value)}`} className="flex min-w-0 flex-1 flex-col">
                              <div className="flex flex-1 items-end justify-center">{value != null && value > 0 && <span className="w-full max-w-5 rounded-t-md bg-activity" style={{ height: `${height}%` }} />}</div>
                              <div className="flex flex-1 items-start justify-center border-t border-[var(--border)]">{value != null && value < 0 && <span className="w-full max-w-5 rounded-b-md bg-intake" style={{ height: `${height}%` }} />}</div>
                              <span className="pt-1 text-center text-[10px] font-bold text-[var(--muted)]">{formatMonth(point.month, 'short', false)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {metric === 'prices' && result.items.length > 0 && (
                  <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--inset)]">
                    {result.items.slice(0, 5).map((item) => (
                      <li key={`${item.categoryId}|${item.title}`} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-extrabold capitalize text-[var(--text)]">{item.title}</span>
                          <span className="block truncate text-[11px] font-bold text-[var(--muted)] tabular-nums">{t(nameOf(item.categoryId) ?? '')} · {money(item.priceBefore, { cents: true })} → {money(item.priceNow, { cents: true })}</span>
                        </span>
                        <span className={`shrink-0 text-xs font-extrabold tabular-nums ${tone(item.change)}`}>{pct(item.change)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            <div className="rounded-2xl border border-[var(--border)]">
              <button type="button" onClick={() => setPicking(!picking)} aria-expanded={picking} className="pressable flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left">
                <span className="text-xs font-extrabold text-[var(--text)]">{t('Leave expenses out')}</span>
                <span className="flex items-center gap-2 text-[11px] font-extrabold text-[var(--muted)]">
                  {excluded.size > 0 ? t('{n} left out', { n: excluded.size }) : t('None')}
                  <ChevronDown size={ICON.sm} className={`transition-transform ${picking ? 'rotate-180' : ''}`} aria-hidden="true" />
                </span>
              </button>
              <div className="accordion-grid" data-open={picking} inert={!picking}>
                <div className="accordion-inner">
                  <div className="space-y-2 px-3 pb-3">
                    <p className="text-[11px] font-medium text-[var(--muted)]">{t('One-offs (a holiday, a repair) distort the figure. Tap an expense to leave it out of the calculation; the biggest of both periods are listed.')}</p>
                    {candidates.length === 0 ? (
                      <p className="text-[11px] font-bold text-[var(--muted)]">{t('No expenses in these periods.')}</p>
                    ) : (
                      <ul data-scroll-fade="y" className="max-h-64 divide-y divide-[var(--border)] overflow-y-auto overscroll-contain rounded-xl border border-[var(--border)] bg-[var(--inset)]" aria-label={t('Expenses')}>
                        {candidates.map((tx) => {
                          const off = excluded.has(tx.id);
                          return (
                            <li key={tx.id}>
                              <button type="button" role="checkbox" aria-checked={off} onClick={() => toggle(tx.id)} className="pressable flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[var(--hover)]">
                                <span className={`min-w-0 ${off ? 'opacity-50' : ''}`}>
                                  <span className={`block truncate text-xs font-extrabold text-[var(--text)] ${off ? 'line-through' : ''}`}>{tx.note || t(nameOf(tx.categoryId) ?? '')}</span>
                                  <span className="block truncate text-[11px] font-bold text-[var(--muted)]">{t(nameOf(tx.categoryId) ?? '')} · {formatDay(tx.date, false)}</span>
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                  <span className={`text-xs font-extrabold tabular-nums text-[var(--text)] ${off ? 'line-through opacity-50' : ''}`}>{money(tx.amount, { cents: true })}</span>
                                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-extrabold ${off ? 'border-[var(--text)] bg-[var(--text)] text-[var(--on-text)]' : 'border-[var(--border)] text-[var(--muted)]'}`}>{off ? t('Left out') : t('Counted')}</span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {excluded.size > 0 && (
                      <button type="button" onClick={() => updateSettings({ inflationExcluded: [] })} className="pressable text-[11px] font-extrabold text-[var(--muted)] hover:text-[var(--text)]">
                        {t('Count all expenses again')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
