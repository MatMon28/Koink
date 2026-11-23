import { useMemo, type ReactNode } from 'react';
import { ICON } from '../lib/icons';
import { ChevronDown, ChevronRight, CircleHelp, Hourglass, Plus, ShieldCheck, Target, TriangleAlert } from 'lucide-react';
import { HeroPair, NoteCard } from '../components/cards';
import { MonthNavigator } from '../components/MonthNavigator';
import { RecurringRow } from '../components/RecurringRow';
import { Bar } from '../components/ui';
import { budgetSummary, goalSaved, monthTotals, recurringSlots } from '../lib/calc';
import { allBuckets, allExpenseCategories, bucketLabel } from '../lib/categories';
import { currentMonth, daysInMonth, elapsedDays } from '../lib/dates';
import { percent, round2 } from '../lib/format';
import { useApp } from '../lib/store';
import { usePersistentState } from '../lib/usePersistentState';
import type { Bucket } from '../lib/types';
import { t } from '../lib/i18n';

// Track and fill follow the pill colours of the active style (blue for needs, peach for wants).
const BUCKET_BAR: Record<string, { track: string; fill: string; dot: string }> = {
  needs: { track: 'bg-[var(--pill-c-bg,var(--color-needs))]', fill: 'bg-[var(--pill-c-text,var(--color-needs-ink))]', dot: 'bg-needs border-needs-ink/30' },
  wants: { track: 'bg-[var(--pill-p-bg,var(--color-wants))]', fill: 'bg-[var(--pill-p-text,var(--color-wants-ink))]', dot: 'bg-wants border-wants-ink/30' },
  // The user's own types.
  other: { track: 'bg-intake', fill: 'bg-intake-ink', dot: 'bg-intake border-intake-ink/30' },
};

/**
 * A card of the Budgets page that folds shut: tap the header (or the chevron). Open or closed is
 * remembered per card (`koink_budgets_open_<id>`). Every card has the same header: the title with a line under it
 * (`subtitle`: the budget of the type, what is saved...), at the right the fold arrow and, next to it, the + button
 * (`onAdd`), which stays usable while the card is folded.
 */
function SectionCard({ id, title, subtitle, children, onAdd, addLabel }: { id: string; title: ReactNode; subtitle?: ReactNode; children: ReactNode; onAdd?: () => void; addLabel?: string }) {
  const [open, setOpen] = usePersistentState(`koink_budgets_open_${id}`, true);
  return (
    <section className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 min-h-8">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="min-w-0 flex-1 flex items-center justify-between gap-2 text-left">
          <span className="min-w-0">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">{title}</h3>
            {subtitle && <span className="block text-xs font-bold tabular-nums text-[var(--muted)] mt-0.5 truncate">{subtitle}</span>}
          </span>
          <ChevronDown size={ICON.md} className={`shrink-0 text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={addLabel}
            title={addLabel}
            className="pressable size-8 shrink-0 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] flex items-center justify-center"
          >
            <Plus size={ICON.md} strokeWidth={2.5} aria-hidden="true" />
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
  const unbudgeted = summary.unbudgeted;
  const safePerDay = summary.budget > 0 && daysLeft > 0 ? Math.max(0, summary.left) / daysLeft : null;

  // What the Savings goals card says under its title: everything moved to goals, and the targets.
  const goalsSaved = round2(data.goals.reduce((sum, goal) => sum + goalSaved(data.txs, goal), 0));
  const goalsTarget = round2(data.goals.reduce((sum, goal) => sum + (goal.target > 0 ? goal.target : 0), 0));

  const bucketCard = (bucket: Bucket) => {
    // A card lists the categories of its type that have a budget (a hidden category too, once it has one). The + sets
    // a budget for another one. Spending in a category without a budget is the Unbudgeted figure above.
    const all = allExpenseCategories().filter((c) => c.bucket === bucket);
    const categories = all.filter((c) => (data.profile.budgets[c.id] ?? 0) > 0);
    const limit = round2(categories.reduce((sum, c) => sum + (data.profile.budgets[c.id] ?? 0), 0));
    const tone = BUCKET_BAR[bucket] ?? BUCKET_BAR.other;
    // Needs and wants always have a card; one of your own types only once it holds a category.
    if (all.length === 0 && bucket !== 'needs' && bucket !== 'wants') return null;
    return (
      <SectionCard
        key={bucket}
        id={`bucket_${bucket}`}
        title={<><span className={`size-2.5 rounded-full border ${tone.dot}`} aria-hidden="true" />{bucketLabel(bucket)}</>}
        subtitle={limit > 0 ? money(limit) : t('No budget yet')}
        onAdd={() => openSheet({ type: 'budget', bucket })}
        addLabel={t('Set a budget for {name}', { name: bucketLabel(bucket) })}
      >
        {categories.length === 0 ? (
          <p className="um-hide kc-section-empty text-xs font-medium text-[var(--muted)] pb-1">{t('Press + to set the budget of a category.')}</p>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => {
              const Icon = category.icon;
              const total = totals.byCategory[category.id]?.total ?? 0;
              const budget = data.profile.budgets[category.id] ?? 0;
              const over = total > budget;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => openSheet({ type: 'budget', categoryId: category.id })}
                  className="pressable pressable-soft w-full text-left p-3 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] space-y-2 group"
                  aria-label={t('{name}: {v}{v2}. Change budget', { name: category.name, v: money(total), v2: t(' of {v}', { v: money(budget) }) })}
                >
                  {/* name at the left; the budget and an arrow (tap to change it) at the right */}
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon size={ICON.md} strokeWidth={2.5} className="kc-meal-icon shrink-0 text-[var(--text)]" aria-hidden="true" />
                      <span className="text-xs sm:text-sm font-extrabold text-[var(--text)] truncate">{category.name}</span>
                    </span>
                    <span className="flex items-center gap-1 tabular-nums shrink-0">
                      <span className="text-xs sm:text-sm font-extrabold text-[var(--text)]">{money(budget)}</span>
                      <ChevronRight size={ICON.md} className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                    </span>
                  </span>
                  {/* spent / budget at the left, the percentage at the right */}
                  <span className="flex items-center justify-between text-[11px] tabular-nums">
                    <span className="font-extrabold text-[var(--text)]">{money(total, { cents: true })} <span className="font-bold text-[var(--muted)]">/ {money(budget)}</span></span>
                    <span className={`font-extrabold ${over ? 'text-[var(--text-warn)]' : 'text-[var(--muted)]'}`}>{percent(total, budget)}%</span>
                  </span>
                  {/* a thin bar: full (and a warning) once more than the budget was spent */}
                  <Bar value={total} max={budget} className="h-1" track={over ? 'bg-activity' : tone.track} fill={over ? 'bg-activity-accent' : tone.fill} />
                  {over && (
                    <span role="alert" className="flex items-center gap-1.5 text-[11px] font-extrabold text-[var(--text-warn)]">
                      <TriangleAlert size={ICON.sm} className="shrink-0" aria-hidden="true" />
                      {t('Over budget by {v}', { v: money(total - budget) })}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>
    );
  };

  return (
    <div className="um-stack space-y-3.5">
      <MonthNavigator />

      <HeroPair inIcon={Target} inLabel={t('Budget')} outLabel={t('Spent')} inAmount={summary.budget} outAmount={summary.spent} pillTitle={summary.generic ? t('Overall monthly budget minus everything spent') : t('Budgeted categories: budget minus spending in those categories (unbudgeted spending is not included)')} />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <NoteCard tone="needs" icon={Hourglass} label={t('Days left')} value={String(Math.max(0, daysLeft))} title={t('Days left in this month, today included')} />
        <NoteCard tone="wants" icon={ShieldCheck} label={t('Safe / day')} value={safePerDay === null ? '–' : money(safePerDay)} title={t('Budget left divided by the days left')} />
        <NoteCard tone="savings" icon={CircleHelp} label={t('Unbudgeted')} value={moneyFit(unbudgeted, 7)} title={t('Unbudgeted spending: spending in categories without a budget')} />
      </div>

      {/* The monthly budget: its own button. Not set = the sum of the category budgets; never below that sum. */}
      <button
        type="button"
        onClick={() => openSheet({ type: 'monthlyBudget' })}
        className="pressable pressable-soft w-full flex items-center justify-between gap-3 rounded-2xl bg-[var(--surface)] hover:bg-[var(--inset)] border border-[var(--border)] px-3.5 py-3 text-left"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span className="size-8 rounded-full bg-[var(--inset)] flex items-center justify-center shrink-0"><Target size={ICON.md} aria-hidden="true" className="text-[var(--text)]" /></span>
          <span className="min-w-0">
            <span className="block text-xs font-extrabold text-[var(--text)]">{data.profile.monthlyBudget > 0 ? t('Monthly budget') : t('Set the monthly budget')}</span>
            <span className="block text-[11px] font-medium text-[var(--muted)] truncate">
              {data.profile.monthlyBudget > 0 ? t('At least the sum of the category budgets: {v}', { v: money(summary.categoryBudget) }) : t('Not set: the sum of the category budgets, {v}', { v: money(summary.categoryBudget) })}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-1 tabular-nums shrink-0">
          <span className="text-sm font-extrabold text-[var(--text)]">{money(summary.budget)}</span>
          <ChevronRight size={ICON.md} className="text-[var(--muted)]" aria-hidden="true" />
        </span>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
        {allBuckets().map((b) => bucketCard(b.id))}

        <SectionCard
          id="goals"
          title={<><span className="size-2.5 rounded-full border bg-weight border-weight-ink/30" aria-hidden="true" />{t('Savings goals')}</>}
          subtitle={data.goals.length === 0 ? t('No goals yet') : goalsTarget > 0 ? `${money(goalsSaved)} ${t('of')} ${money(goalsTarget)}` : money(goalsSaved)}
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
                      <Bar value={saved} max={goal.target || saved || 1} track="bg-[var(--pill-f-bg,var(--color-weight))]" fill="bg-[var(--pill-f-text,var(--color-weight-ink))]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openSheet({ type: 'tx', kind: 'saving', categoryId: goal.id })}
                      aria-label={t('Add money to {name}', { name: goal.name })}
                      title={t('Add money to {name}', { name: goal.name })}
                      className="pressable w-11 shrink-0 rounded-2xl bg-weight hover:brightness-95 text-weight-ink flex items-center justify-center"
                    >
                      <Plus size={ICON.lg} strokeWidth={2.5} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          id="recurring"
          title={<><span className="size-2.5 rounded-full border bg-needs border-needs-ink/30" aria-hidden="true" />{t('Recurring')}</>}
          subtitle={data.recurring.length === 0 ? t('Nothing set up yet') : t('{n} items', { n: data.recurring.length })}
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
    </div>
  );
}
