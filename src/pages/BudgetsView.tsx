import { useMemo, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, CircleHelp, Hourglass, ListChecks, Plus, ShieldCheck, Target } from 'lucide-react';
import { HeroPair, NoteCard } from '../components/cards';
import { MonthNavigator } from '../components/MonthNavigator';
import { RecurringRow } from '../components/RecurringRow';
import { Bar } from '../components/ui';
import { budgetSummary, goalSaved, monthTotals, recurringSlots } from '../lib/calc';
import { allBuckets, allExpenseCategories, bucketLabel, isCategoryHidden } from '../lib/categories';
import { currentMonth, daysInMonth, elapsedDays } from '../lib/dates';
import { percent, round2 } from '../lib/format';
import { useApp } from '../lib/store';
import { usePersistentState } from '../lib/usePersistentState';
import type { Bucket } from '../lib/types';
import { t } from '../lib/i18n';

// Track and fill follow the pill colours of the active style (blue for needs, peach for wants).
const BUCKET_BAR: Record<string, { track: string; fill: string; dot: string }> = {
  needs: { track: 'bg-[var(--pill-c-bg,#CFE7FE)]', fill: 'bg-[var(--pill-c-text,#1A4670)]', dot: 'bg-[#CFE7FE] border-[#1A4670]/30' },
  wants: { track: 'bg-[var(--pill-p-bg,#FAE0B4)]', fill: 'bg-[var(--pill-p-text,#7D4E14)]', dot: 'bg-[#FAE0B4] border-[#7D4E14]/30' },
  // The user's own types.
  other: { track: 'bg-[#C9EFD3]', fill: 'bg-[#1A5632]', dot: 'bg-[#C9EFD3] border-[#1A5632]/30' },
};

/**
 * A card of the Budgets page that folds shut: tap the header (or the chevron). Open or closed is
 * remembered per card (`koink_budgets_open_<id>`). The + button stays usable while folded.
 */
function SectionCard({ id, title, aside, children, onAdd, addLabel }: { id: string; title: ReactNode; aside?: ReactNode; children: ReactNode; onAdd?: () => void; addLabel?: string }) {
  const [open, setOpen] = usePersistentState(`koink_budgets_open_${id}`, true);
  return (
    <section className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 min-h-8">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-w-0 flex-1 flex items-center justify-between gap-2 text-left">
          <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">{title}</h3>
          <span className="flex items-center gap-2">
            {aside}
            <ChevronDown size={16} className={`text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </span>
        </button>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={addLabel}
            title={addLabel}
            className="pressable size-8 shrink-0 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] flex items-center justify-center"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <div className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

export function BudgetsView() {
  const { data, selectedMonth, money, moneyFit, openSheet } = useApp();
  const totals = useMemo(() => monthTotals(data.txs, selectedMonth), [data.txs, selectedMonth]);
  const summary = budgetSummary(data.profile, totals);

  const isCurrent = selectedMonth === currentMonth();
  const daysLeft = daysInMonth(selectedMonth) - elapsedDays(selectedMonth) + (isCurrent ? 1 : 0);
  const unbudgeted = summary.unplanned;
  const safePerDay = summary.budget > 0 && daysLeft > 0 ? Math.max(0, summary.left) / daysLeft : null;

  const bucketCard = (bucket: Bucket) => {
    // Hidden categories stay here only while they still carry spending or a budget.
    const categories = allExpenseCategories().filter((c) => c.bucket === bucket && (!isCategoryHidden(c.id) || (totals.byCategory[c.id]?.total ?? 0) > 0 || (data.profile.budgets[c.id] ?? 0) > 0));
    const spent = round2(categories.reduce((sum, c) => sum + (totals.byCategory[c.id]?.total ?? 0), 0));
    const limit = round2(categories.reduce((sum, c) => sum + (data.profile.budgets[c.id] ?? 0), 0));
    const tone = BUCKET_BAR[bucket] ?? BUCKET_BAR.other;
    // Needs and wants always have a card; one of your own types only once it holds a category.
    if (categories.length === 0 && bucket !== 'needs' && bucket !== 'wants') return null;
    return (
      <SectionCard
        key={bucket}
        id={`bucket_${bucket}`}
        title={<><span className={`size-2.5 rounded-full border ${tone.dot}`} aria-hidden="true" />{bucketLabel(bucket)}</>}
        aside={<span className="text-xs font-bold tabular-nums text-[var(--muted)]">{money(spent)}{limit > 0 && ` of ${money(limit)}`}</span>}
      >
        <div className="space-y-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const total = totals.byCategory[category.id]?.total ?? 0;
            const budget = data.profile.budgets[category.id] ?? 0;
            const over = budget > 0 && total > budget;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => openSheet({ type: 'budget', categoryId: category.id })}
                className="pressable pressable-soft w-full text-left p-3 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] space-y-2 group"
                aria-label={t('{name}: {v}{v2}. Change budget', { name: category.name, v: money(total), v2: budget > 0 ? t(' of {v}', { v: money(budget) }) : t(', no budget') })}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0">
                    <Icon size={15} strokeWidth={2.2} className="kc-meal-icon shrink-0 text-[var(--text)]" />
                    <span className="text-xs sm:text-sm font-extrabold text-[var(--text)] truncate">{category.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5 tabular-nums shrink-0">
                    {budget > 0 ? (
                      <>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${over ? 'bg-activity text-activity-ink' : 'bg-intake text-intake-ink'}`}>
                          {over ? t('{v} over', { v: money(total - budget) }) : t('{v} left', { v: money(budget - total) })}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] font-bold text-[var(--muted)]">{t('Set a budget')}</span>
                    )}
                    <ChevronRight size={16} className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </span>
                <span className="flex items-center justify-between text-[11px] tabular-nums">
                  <span className="font-extrabold text-[var(--text)]">{money(total, { cents: true })}</span>
                  {budget > 0 && <span className="font-bold text-[var(--muted)]">{percent(total, budget)}{t('% of')} {money(budget)}</span>}
                </span>
                {budget > 0 && <Bar value={total} max={budget} track={over ? 'bg-activity' : tone.track} fill={over ? 'bg-activity-accent' : tone.fill} />}
              </button>
            );
          })}
        </div>
      </SectionCard>
    );
  };

  return (
    <div className="um-stack space-y-3.5">
      <MonthNavigator />

      <HeroPair inIcon={Target} inLabel={t('Budget')} outLabel={t('Spent')} inAmount={summary.budget} outAmount={summary.spent} pillTitle={summary.generic ? t('Monthly budget minus everything spent') : t('Budget minus spending in budgeted categories')} />

      <button
        type="button"
        onClick={() => openSheet({ type: 'profile' })}
        className="um-hide pressable pressable-soft mx-auto flex max-w-full items-center gap-2 rounded-full bg-[var(--surface)] hover:bg-[var(--inset)] border border-[var(--border)] px-3.5 py-1.5 text-[11px] font-extrabold text-[var(--text)]"
      >
        <Target size={13} aria-hidden="true" className="shrink-0 text-[var(--muted)]" />
        <span className="truncate">
          {summary.generic
            ? t('Monthly budget {v} (from your profile)', { v: money(data.profile.monthlyBudget) })
            : t('Set one monthly budget for everything')}
        </span>
        <ChevronRight size={13} aria-hidden="true" className="shrink-0 text-[var(--muted)]" />
      </button>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <NoteCard tone="needs" icon={Hourglass} label={t('Days left')} value={String(Math.max(0, daysLeft))} title={t('Days left in this month, today included')} />
        <NoteCard tone="wants" icon={ShieldCheck} label={t('Safe / day')} value={safePerDay === null ? '–' : money(safePerDay)} title={t('Budget left divided by the days left')} />
        <NoteCard tone="savings" icon={CircleHelp} label={t('Unplanned')} value={moneyFit(unbudgeted, 7)} title={t('Spending in categories without a budget')} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
        {allBuckets().map((b) => bucketCard(b.id))}

        <SectionCard
          id="goals"
          title={<><span className="size-2.5 rounded-full border bg-[#E2D6FF] border-[#49346F]/30" aria-hidden="true" />{t('Savings goals')}</>}
          onAdd={() => openSheet({ type: 'goal' })}
          addLabel={t('New savings goal')}
        >
          {data.goals.length === 0 ? (
            <p className="um-hide kc-section-empty text-xs font-medium text-[var(--muted)] pb-1">{t('Name something worth saving for and give it a target.')}</p>
          ) : (
            <div className="space-y-2">
              {data.goals.map((goal) => {
                const saved = goalSaved(data.txs, goal);
                const reached = goal.target > 0 && saved >= goal.target;
                return (
                  <div key={goal.id} className="flex items-stretch gap-2">
                    <button
                      type="button"
                      onClick={() => openSheet({ type: 'goal', id: goal.id })}
                      className="pressable pressable-soft min-w-0 flex-1 text-left p-3 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] space-y-2"
                      aria-label={t('Edit goal {name}', { name: goal.name })}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-extrabold text-[var(--text)] truncate">{goal.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums bg-weight text-weight-ink shrink-0">
                          {reached ? t('Reached') : goal.target > 0 ? `${percent(saved, goal.target)}%` : t('Open')}
                        </span>
                      </span>
                      <span className="flex items-center justify-between text-[11px] tabular-nums">
                        <span className="font-extrabold text-[var(--text)]">{money(saved)}</span>
                        {goal.target > 0 && <span className="font-bold text-[var(--muted)]">{t('of')} {money(goal.target)}</span>}
                      </span>
                      <Bar value={saved} max={goal.target || saved || 1} track="bg-[var(--pill-f-bg,#E2D6FF)]" fill="bg-[var(--pill-f-text,#49346F)]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openSheet({ type: 'tx', kind: 'saving', categoryId: goal.id })}
                      aria-label={t('Add money to {name}', { name: goal.name })}
                      title={t('Add money to {name}', { name: goal.name })}
                      className="pressable w-11 shrink-0 rounded-2xl bg-weight hover:brightness-95 text-weight-ink flex items-center justify-center"
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          id="recurring"
          title={<><span className="size-2.5 rounded-full border bg-[#CFE7FE] border-[#183B5E]/30" aria-hidden="true" />{t('Recurring')}</>}
          onAdd={() => openSheet({ type: 'recurringEdit' })}
          addLabel={t('New recurring item')}
        >
          {data.recurring.length === 0 ? (
            <p className="um-hide kc-section-empty text-xs font-medium text-[var(--muted)] pb-1">{t('Rent, salary, subscriptions: set them up once, then log each month with one tap.')}</p>
          ) : (
            <div className="divide-y divide-[var(--border)] -my-1.5">
              {recurringSlots(data.recurring, selectedMonth, totals.items, true).map((slot) => (
                <RecurringRow key={`${slot.item.id}${slot.date ?? ''}`} item={slot.item} date={slot.date} month={selectedMonth} monthItems={totals.items} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="um-hide flex justify-center">
        <button
          type="button"
          onClick={() => openSheet({ type: 'categories' })}
          className="pressable inline-flex items-center gap-2 rounded-full bg-[var(--surface)] hover:bg-[var(--inset)] border border-[var(--border)] px-4 py-2 text-xs font-extrabold text-[var(--text)]"
        >
          <ListChecks size={15} aria-hidden="true" />
          {t('Manage expense categories')}
        </button>
      </div>
    </div>
  );
}
