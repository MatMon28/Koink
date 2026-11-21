import { useMemo, type ReactNode } from 'react';
import { ChevronRight, CircleHelp, Hourglass, ListChecks, Plus, ShieldCheck, Target } from 'lucide-react';
import { HeroPair, NoteCard } from '../components/cards';
import { MonthNavigator } from '../components/MonthNavigator';
import { RecurringRow } from '../components/RecurringRow';
import { Bar } from '../components/ui';
import { accountBalance, budgetSummary, goalSaved, monthTotals } from '../lib/calc';
import { allExpenseCategories, BUCKET_LABEL, isCategoryHidden } from '../lib/categories';
import { currentMonth, daysInMonth, elapsedDays } from '../lib/dates';
import { percent, round2 } from '../lib/format';
import { iconFor } from '../lib/icons';
import { useApp } from '../lib/store';
import type { Bucket } from '../lib/types';

// Track and fill follow the pill colours of the active style (blue for needs, peach for wants).
const BUCKET_BAR: Record<Bucket, { track: string; fill: string; dot: string }> = {
  needs: { track: 'bg-[var(--pill-c-bg,#CFE7FE)]', fill: 'bg-[var(--pill-c-text,#1A4670)]', dot: 'bg-[#CFE7FE] border-[#1A4670]/30' },
  wants: { track: 'bg-[var(--pill-p-bg,#FAE0B4)]', fill: 'bg-[var(--pill-p-text,#7D4E14)]', dot: 'bg-[#FAE0B4] border-[#7D4E14]/30' },
};

function SectionCard({ title, aside, children, onAdd, addLabel }: { title: ReactNode; aside?: ReactNode; children: ReactNode; onAdd?: () => void; addLabel?: string }) {
  return (
    <section className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3 min-h-8">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-[var(--text)]">{title}</h3>
        <span className="flex items-center gap-2">
          {aside}
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              aria-label={addLabel}
              title={addLabel}
              className="pressable size-8 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] flex items-center justify-center"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          )}
        </span>
      </div>
      {children}
    </section>
  );
}

export function BudgetsView() {
  const { data, selectedMonth, money, moneyFit, openSheet } = useApp();
  const totals = useMemo(() => monthTotals(data.txs, selectedMonth), [data.txs, selectedMonth]);
  const summary = budgetSummary(data.profile, totals);

  const isCurrent = selectedMonth === currentMonth();
  const daysLeft = daysInMonth(selectedMonth) - elapsedDays(selectedMonth) + (isCurrent ? 1 : 0);
  const unbudgeted = round2(totals.spent - summary.spent);
  const safePerDay = summary.budget > 0 && daysLeft > 0 ? Math.max(0, summary.left) / daysLeft : null;

  const accountTotal = round2(data.accounts.reduce((sum, account) => sum + accountBalance(data.txs, account), 0));

  const bucketCard = (bucket: Bucket) => {
    // Hidden categories stay here only while they still carry spending or a budget.
    const categories = allExpenseCategories().filter((c) => c.bucket === bucket && (!isCategoryHidden(c.id) || (totals.byCategory[c.id]?.total ?? 0) > 0 || (data.profile.budgets[c.id] ?? 0) > 0));
    const spent = round2(categories.reduce((sum, c) => sum + (totals.byCategory[c.id]?.total ?? 0), 0));
    const limit = round2(categories.reduce((sum, c) => sum + (data.profile.budgets[c.id] ?? 0), 0));
    const tone = BUCKET_BAR[bucket];
    return (
      <SectionCard
        key={bucket}
        title={<><span className={`size-2.5 rounded-full border ${tone.dot}`} aria-hidden="true" />{BUCKET_LABEL[bucket]}</>}
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
                aria-label={`${category.name}: ${money(total)}${budget > 0 ? ` of ${money(budget)}` : ', no budget'}. Change budget`}
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
                          {over ? `${money(total - budget)} over` : `${money(budget - total)} left`}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] font-bold text-[var(--muted)]">Set a budget</span>
                    )}
                    <ChevronRight size={16} className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </span>
                <span className="flex items-center justify-between text-[11px] tabular-nums">
                  <span className="font-extrabold text-[var(--text)]">{money(total, { cents: true })}</span>
                  {budget > 0 && <span className="font-bold text-[var(--muted)]">{percent(total, budget)}% of {money(budget)}</span>}
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

      <HeroPair inIcon={Target} inLabel="Budget" outLabel="Spent" inAmount={summary.budget} outAmount={summary.spent} pillTitle="Budget minus spending in budgeted categories" />

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5">
        <NoteCard icon={Hourglass} label="Days left" value={String(Math.max(0, daysLeft))} title="Days left in this month, today included" />
        <NoteCard icon={ShieldCheck} label="Safe / day" value={safePerDay === null ? '–' : money(safePerDay)} title="Budget left divided by the days left" />
        <NoteCard icon={CircleHelp} label="Unplanned" value={moneyFit(unbudgeted, 7)} title="Spending in categories without a budget" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
        <SectionCard
          title={<><span className="size-2.5 rounded-full border bg-[#E8F3FF] border-[#183B5E]/30" aria-hidden="true" />Accounts</>}
          aside={data.accounts.length > 1 ? <span className="text-xs font-bold tabular-nums text-[var(--muted)]">{money(accountTotal)} in total</span> : undefined}
          onAdd={() => openSheet({ type: 'account' })}
          addLabel="New account"
        >
          {data.accounts.length === 0 ? (
            <p className="um-hide kc-section-empty text-xs font-medium text-[var(--muted)] pb-1">Cash, a bank account, a card: add them to see what each holds. Pick one when you log an entry.</p>
          ) : (
            <div className="space-y-2">
              {data.accounts.map((account) => {
                const Icon = iconFor(account.icon);
                const balance = accountBalance(data.txs, account);
                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => openSheet({ type: 'account', id: account.id })}
                    className="pressable pressable-soft w-full text-left p-3 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] flex items-center gap-2.5 group"
                    aria-label={`${account.name}: ${money(balance, { cents: true })}. Edit`}
                  >
                    <Icon size={16} strokeWidth={2.2} className="kc-meal-icon shrink-0 text-[var(--text)]" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-xs sm:text-sm font-extrabold text-[var(--text)] truncate">{account.name}</span>
                    <span className={`text-xs sm:text-sm font-extrabold tabular-nums ${balance < 0 ? 'text-[#A3312F]' : 'text-[var(--text)]'}`}>{money(balance, { cents: true })}</span>
                    <ChevronRight size={16} className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        {bucketCard('needs')}
        {bucketCard('wants')}

        <SectionCard
          title={<><span className="size-2.5 rounded-full border bg-[#E2D6FF] border-[#49346F]/30" aria-hidden="true" />Savings goals</>}
          onAdd={() => openSheet({ type: 'goal' })}
          addLabel="New savings goal"
        >
          {data.goals.length === 0 ? (
            <p className="um-hide kc-section-empty text-xs font-medium text-[var(--muted)] pb-1">Name something worth saving for and give it a target.</p>
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
                      aria-label={`Edit goal ${goal.name}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-extrabold text-[var(--text)] truncate">{goal.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums bg-weight text-weight-ink shrink-0">
                          {reached ? 'Reached' : goal.target > 0 ? `${percent(saved, goal.target)}%` : 'Open'}
                        </span>
                      </span>
                      <span className="flex items-center justify-between text-[11px] tabular-nums">
                        <span className="font-extrabold text-[var(--text)]">{money(saved)}</span>
                        {goal.target > 0 && <span className="font-bold text-[var(--muted)]">of {money(goal.target)}</span>}
                      </span>
                      <Bar value={saved} max={goal.target || saved || 1} track="bg-[var(--pill-f-bg,#E2D6FF)]" fill="bg-[var(--pill-f-text,#49346F)]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openSheet({ type: 'tx', kind: 'saving', categoryId: goal.id })}
                      aria-label={`Add money to ${goal.name}`}
                      title={`Add money to ${goal.name}`}
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
          title={<><span className="size-2.5 rounded-full border bg-[#CFE7FE] border-[#183B5E]/30" aria-hidden="true" />Recurring</>}
          onAdd={() => openSheet({ type: 'recurringEdit' })}
          addLabel="New recurring item"
        >
          {data.recurring.length === 0 ? (
            <p className="um-hide kc-section-empty text-xs font-medium text-[var(--muted)] pb-1">Rent, salary, subscriptions: set them up once, then log each month with one tap.</p>
          ) : (
            <div className="divide-y divide-[var(--border)] -my-1.5">
              {data.recurring.map((item) => (
                <RecurringRow key={item.id} item={item} month={selectedMonth} monthItems={totals.items} />
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
          Manage expense categories
        </button>
      </div>
    </div>
  );
}
