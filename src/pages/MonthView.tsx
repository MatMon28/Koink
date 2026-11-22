import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Banknote, CalendarDays, Gift, ChartPie, Columns2, LayoutList, ListTree, PenLine, Plus, Receipt, Repeat, Sparkles, Tag, Target, Wallet, X, type LucideIcon } from 'lucide-react';
import { PigIcon } from '../lib/pig';
import { EmptyRow, FoldCard, Headline, HeroPair, NoteCard, Pills, ShareCard, TxRow, type PillItem } from '../components/cards';
import { MonthNavigator } from '../components/MonthNavigator';
import { WidgetStrip } from '../components/WidgetStrip';
import { RecurringRow } from '../components/RecurringRow';
import { Bar, ConfirmDialog } from '../components/ui';
import { budgetSummary, goalSaved, monthTotals, recurringSlots, ruleShares, slotEntry } from '../lib/calc';
import { allExpenseCategories, categoryMeta, isCategoryHidden } from '../lib/categories';
import { elapsedDays, formatDay, todayStr } from '../lib/dates';
import { giftCardBalance, giftCardExpired } from '../lib/giftcards';
import { percent, round2 } from '../lib/format';
import { t } from '../lib/i18n';
import { useApp } from '../lib/store';
import type { Bucket } from '../lib/types';
import { endOnTouch } from '../lib/interrupt';
import { usePersistentState } from '../lib/usePersistentState';

type Layout = 'compact' | 'normal' | 'expanded';
const TRACKERS = ['income', 'savings', 'recurring', 'giftcards'] as const;
type TrackerId = (typeof TRACKERS)[number];

/** A card of the category grid: one category, or (`ids` of several) the entries whose category no longer exists. */
interface CategoryCard {
  id: string;
  ids: string[];
  name: string;
  icon: LucideIcon;
  bucket: Bucket;
  /** Entries of a deleted category: no budget, no add button. */
  orphan?: boolean;
}

const prefersReducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function MonthView() {
  const { data, basic, txs, selectedMonth, money, moneyFit, openSheet, eraseAll, updateSettings, setActiveTab } = useApp();
  // Basic mode: income and expenses only (`txs` has no savings entries), no budgets, one list of categories.
  const totals = useMemo(() => monthTotals(txs, selectedMonth), [txs, selectedMonth]);
  const shares = ruleShares(totals);
  const budget = budgetSummary(data.profile, totals);
  const rule = data.profile.rule;
  const [confirmFresh, setConfirmFresh] = useState(false);

  // The cards: every category that is not hidden, a hidden one only while it has entries this month,
  // and one "Other" card for entries whose own category was deleted (so the cards still add up).
  const cards = useMemo(() => {
    const known = allExpenseCategories();
    const list: CategoryCard[] = known
      .filter((c) => !isCategoryHidden(c.id) || (totals.byCategory[c.id]?.count ?? 0) > 0)
      .map((c) => ({ id: c.id, ids: [c.id], name: c.name, icon: c.icon, bucket: c.bucket }));
    const orphans = Object.keys(totals.byCategory).filter((id) => !known.some((c) => c.id === id));
    if (orphans.length) list.push({ id: '_other', ids: orphans, name: 'Other', icon: Tag, bucket: 'wants', orphan: true });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals, data.categories, data.settings.hiddenCategories]);
  const categoryIds = cards.map((c) => c.id);
  // The Gift cards tracker appears once there is a card, or when its button is switched on (Settings).
  const showGiftCards = !basic && (data.giftCards.length > 0 || data.settings.quickAdd.giftcard);

  // The needs / wants / savings split can be tucked away in Settings > Appearance.
  const hideSplit = data.settings.hideSplit || basic;
  // Spending in the user's own expense types gets a fourth card (named after the type when there is one).
  const ownTypeNames = data.categoryTypes
    .filter((ty) => cards.some((c) => c.bucket === ty.id && c.ids.some((id) => (totals.byCategory[id]?.total ?? 0) > 0)))
    .map((ty) => ty.name);
  const showOther = totals.other > 0;

  // Card expansion and the chosen layout are remembered independently.
  const [chosenLayout, setLayout] = usePersistentState<Layout>('koink_month_layout', 'normal');
  // Ultra minimal always shows the compact overview; the chosen layout comes back when it is switched off.
  // Basic mode has five categories to show: always the Normal layout, and no layout switch.
  const layout: Layout = data.settings.ultraMinimal ? 'compact' : basic ? 'normal' : chosenLayout;
  const [openSlots, setOpenSlots] = usePersistentState<string[]>('koink_month_open', []);
  const [openTrackers, setOpenTrackers] = usePersistentState<TrackerId[]>('koink_month_trackers_open', ['recurring']);
  const compact = layout === 'compact';

  // Changing the month slides the content sideways (forward in time = from the right).
  const panel = useRef<HTMLDivElement>(null);
  const shown = useRef(selectedMonth);
  useLayoutEffect(() => {
    if (shown.current === selectedMonth) return;
    const forward = selectedMonth > shown.current;
    shown.current = selectedMonth;
    const el = panel.current;
    if (!el || prefersReducedMotion() || typeof el.animate !== 'function') return;
    endOnTouch( // the next touch ends the slide at once
      el.animate(
        [
          { opacity: 0.3, transform: `translate3d(${forward ? 24 : -24}px, 0, 0)` },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        ],
        { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      ),
    );
  }, [selectedMonth]);

  // In Expanded everything is open; closing one card switches to Normal and keeps the others open.
  const toggleSlot = (id: string) => {
    if (layout === 'expanded') {
      setLayout('normal');
      setOpenSlots(categoryIds.filter((x) => x !== id));
      setOpenTrackers([...TRACKERS]);
      return;
    }
    setOpenSlots((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleTracker = (id: TrackerId) => {
    if (layout === 'expanded') {
      setLayout('normal');
      setOpenSlots([...categoryIds]);
      setOpenTrackers(TRACKERS.filter((x) => x !== id));
      return;
    }
    setOpenTrackers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const chooseLayout = (next: Layout) => {
    if (next === 'compact') {
      setOpenSlots([]);
      setOpenTrackers([]);
    }
    setLayout(next);
  };

  const layouts: { id: Layout; label: string; icon: ReactNode }[] = [
    { id: 'compact', label: 'Compact', icon: <Columns2 size={13} /> },
    { id: 'normal', label: 'Normal', icon: <LayoutList size={13} /> },
    { id: 'expanded', label: 'Expanded', icon: <ListTree size={13} /> },
  ];

  const days = elapsedDays(selectedMonth);
  const perDay = days > 0 ? totals.spent / days : 0;
  const gridClass = `grid items-start ${compact ? 'grid-cols-2 gap-2.5 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 gap-3.5'}`;
  const cellClass = (open: boolean) => (compact && open ? 'col-span-2 md:col-span-1' : undefined);
  const muted = (text: string, empty = false) => <span className={`text-xs font-medium text-[var(--muted)] truncate ${empty ? 'um-hide' : ''}`}>{t(text)}</span>;

  /* ---------- Expense categories ---------- */
  const categoryCards = cards.map((category) => {
    const open = layout === 'expanded' || openSlots.includes(category.id);
    const entries = category.ids.map((id) => totals.byCategory[id]);
    const total = round2(entries.reduce((sum, entry) => sum + (entry?.total ?? 0), 0));
    const count = entries.reduce((sum, entry) => sum + (entry?.count ?? 0), 0);
    const limit = category.orphan || basic ? 0 : data.profile.budgets[category.id] ?? 0;
    const left = limit - total;
    const items = totals.items.filter((tx) => tx.kind === 'expense' && category.ids.includes(tx.categoryId));
    const Icon = category.icon;
    const add = () => openSheet({ type: 'tx', kind: 'expense', categoryId: category.orphan ? undefined : category.id });
    const share = percent(total, totals.spent);

    // Grey on purpose (see Pills in cards.tsx): the colours belong to Needs / Wants / Savings.
    const pills: PillItem[] = [
      { tone: 'neutral', icon: Receipt, text: String(count), label: count === 1 ? 'entry' : 'entries', title: `${count} ${count === 1 ? 'entry' : 'entries'} this month` },
      { tone: 'neutral', icon: ChartPie, text: `${share}%`, label: 'of spending', title: `${share}% of this month's spending` },
    ];
    // The budget pill does not exist in Basic mode.
    if (!basic) {
      pills.push(
        limit > 0
          ? left >= 0
            ? { tone: 'neutral', icon: Wallet, text: moneyFit(left, 6), label: 'left', title: `${money(left)} of the ${money(limit)} budget left` }
            : { tone: 'alert', icon: Wallet, text: moneyFit(left, 6), label: 'over', title: `${money(-left)} over the ${money(limit)} budget` }
          : { tone: 'neutral', icon: Wallet, text: '–', label: 'no budget', title: 'No budget set' },
      );
    }

    return (
      <div key={category.id} className={cellClass(open)}>
        <FoldCard
          variant="slot"
          id={category.id}
          icon={<Icon size={compact ? 15 : 16} strokeWidth={2.2} />}
          title={category.name}
          headline={<Headline text={moneyFit(total, compact ? 7 : 11)} compact={compact} />}
          summary={count > 0 ? <Pills items={pills} stretch labels={!compact} /> : muted('Nothing yet', true)}
          onAdd={add}
          addLabel={t('Add expense: {name}', { name: category.name })}
          open={open}
          onToggle={() => toggleSlot(category.id)}
          compact={compact}
        >
          {limit > 0 && (
            <button
              type="button"
              onClick={() => openSheet({ type: 'budget', categoryId: category.id })}
              className="w-full py-2.5 text-left space-y-1.5 group"
              aria-label={t('Budget for {name}: {v} of {v2}. Change', { name: category.name, v: money(total), v2: money(limit) })}
            >
              <span className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                <span className="font-bold text-[var(--muted)] group-hover:text-[var(--text)]">{t('Budget')}</span>
                <span className="font-extrabold text-[var(--text)]">{money(total)} <span className="font-semibold text-[var(--muted)]">{t('of')} {money(limit)}</span></span>
              </span>
              <Bar
                value={total}
                max={limit}
                track="kc-water-track bg-[var(--inset)]"
                fill={left < 0 ? 'bg-activity-accent' : category.bucket === 'needs' ? 'kc-water-fill bg-[#1A4670]' : 'kc-water-fill bg-[#7D4E14]'}
              />
            </button>
          )}
          {items.length === 0
            ? <EmptyRow text={t('Nothing yet')} action={t('Add')} onAdd={add} />
            : items.map((tx) => <TxRow key={tx.id} tx={tx} compact={compact} />)}
        </FoldCard>
      </div>
    );
  });

  /* ---------- Trackers: income, savings, recurring ---------- */
  const incomeItems = totals.items.filter((tx) => tx.kind === 'income');
  const savingItems = totals.items.filter((tx) => tx.kind === 'saving');
  // Only what belongs to this month: monthly items and the ones whose turn it is (every 3 months...).
  const monthRecurring = recurringSlots(data.recurring, selectedMonth, totals.items);
  const logged = monthRecurring.filter((slot) => slotEntry(totals.items, slot));
  const due = monthRecurring.filter((slot) => !slotEntry(totals.items, slot));
  const dueTotal = due.filter((slot) => slot.item.kind === 'expense').reduce((sum, slot) => sum + slot.item.amount, 0);

  const trackerCard = (id: TrackerId) => {
    const open = layout === 'expanded' || openTrackers.includes(id);
    const shared = { variant: 'tracker' as const, id, palette: id, open, onToggle: () => toggleTracker(id), compact };

    if (id === 'income') {
      const add = () => openSheet({ type: 'tx', kind: 'income' });
      const sources = [...new Set(incomeItems.map((tx) => categoryMeta('income', tx.categoryId, data.goals).name))];
      return (
        <FoldCard
          {...shared}
          icon={<Banknote size={compact ? 15 : 16} strokeWidth={2.2} />}
          title={t('Income')}
          headline={<Headline text={moneyFit(totals.income, compact ? 7 : 11)} compact={compact} />}
          summary={muted(incomeItems.length ? sources.join(' · ') : 'Nothing yet', incomeItems.length === 0)}
          onAdd={add}
          addLabel={t('Add income')}
        >
          {incomeItems.length === 0
            ? <EmptyRow text={t('Nothing yet')} action={t('Add')} onAdd={add} />
            : incomeItems.map((tx) => <TxRow key={tx.id} tx={tx} compact={compact} category={categoryMeta('income', tx.categoryId, data.goals).name} />)}
        </FoldCard>
      );
    }

    if (id === 'savings') {
      const add = () => openSheet(data.goals.length ? { type: 'tx', kind: 'saving' } : { type: 'goal' });
      return (
        <FoldCard
          {...shared}
          icon={<PigIcon size={compact ? 15 : 16} strokeWidth={2.2} />}
          title={t('Savings')}
          headline={<Headline text={moneyFit(totals.saved, compact ? 7 : 11)} compact={compact} />}
          summary={muted(data.goals.length ? `${data.goals.length} ${data.goals.length === 1 ? 'goal' : 'goals'}` : 'No goals yet')}
          onAdd={add}
          addLabel={data.goals.length ? t('Move money to savings') : t('New savings goal')}
        >
          {data.goals.length === 0 && <EmptyRow text={t('No goals yet')} action={t('New goal')} onAdd={add} />}
          {data.goals.map((goal) => {
            const saved = goalSaved(data.txs, goal);
            return (
              <div key={goal.id} className="py-2.5 flex items-center gap-2">
                <button type="button" onClick={() => openSheet({ type: 'goal', id: goal.id })} className="min-w-0 flex-1 text-left space-y-1.5 group" aria-label={t('Edit goal {name}', { name: goal.name })}>
                  <span className="flex items-center justify-between gap-2 text-xs tabular-nums">
                    <span className="font-bold text-[var(--text)] truncate group-hover:opacity-80">{goal.name}</span>
                    <span className="font-extrabold text-[var(--text)] shrink-0">
                      {money(saved)}
                      {goal.target > 0 && <span className="font-semibold text-[var(--muted)]"> {t('of')} {money(goal.target)}</span>}
                    </span>
                  </span>
                  <Bar value={saved} max={goal.target || saved || 1} track="kc-water-track bg-[var(--inset)]" fill="kc-water-fill bg-[var(--muted)]" />
                </button>
                <button
                  type="button"
                  onClick={() => openSheet({ type: 'tx', kind: 'saving', categoryId: goal.id })}
                  className="pressable w-8 h-8 shrink-0 rounded-full text-[var(--text)] hover:bg-[var(--inset)] flex items-center justify-center"
                  aria-label={t('Add to {name}', { name: goal.name })}
                  title={t('Add to {name}', { name: goal.name })}
                >
                  <Plus size={15} strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
          {savingItems.map((tx) => (
            <TxRow key={tx.id} tx={tx} compact={compact} category={categoryMeta('saving', tx.categoryId, data.goals).name} sub={`${tx.date.slice(8, 10)}/${tx.date.slice(5, 7)}`} />
          ))}
        </FoldCard>
      );
    }

    if (id === 'giftcards') {
      const add = () => openSheet({ type: 'giftCard' });
      const day = todayStr();
      const rows = data.giftCards.map((card) => ({ card, left: giftCardBalance(data.txs, card), expired: giftCardExpired(card, day) }));
      const usable = rows.filter((row) => !row.expired);
      const totalLeft = round2(usable.reduce((sum, row) => sum + row.left, 0));
      return (
        <FoldCard
          {...shared}
          icon={<Gift size={compact ? 15 : 16} strokeWidth={2.2} />}
          title={t('Gift cards')}
          headline={<Headline text={moneyFit(totalLeft, compact ? 7 : 11)} compact={compact} />}
          summary={muted(rows.length === 0 ? 'None yet' : `${usable.length} ${usable.length === 1 ? 'card' : 'cards'} left to use`, rows.length === 0)}
          onAdd={add}
          addLabel={t('New gift card')}
        >
          {rows.length === 0 && <EmptyRow text={t('Vouchers and gift cards')} action={t('New')} onAdd={add} />}
          {rows.map(({ card, left, expired }) => (
            <div key={card.id} className="py-2.5 flex items-center gap-2">
              <button type="button" onClick={() => openSheet({ type: 'giftCard', id: card.id })} className="min-w-0 flex-1 text-left space-y-1.5 group" aria-label={t('Edit gift card {name}', { name: card.name })}>
                <span className="flex items-center justify-between gap-2 text-xs tabular-nums">
                  <span className="font-bold text-[var(--text)] truncate group-hover:opacity-80">{card.name}</span>
                  <span className="font-extrabold text-[var(--text)] shrink-0">
                    {money(left, { cents: true })}
                    <span className="font-semibold text-[var(--muted)]"> {t('of')} {money(card.initial, { cents: true })}</span>
                  </span>
                </span>
                <Bar value={left} max={card.initial || 1} track="kc-water-track bg-[var(--inset)]" fill="kc-water-fill bg-[var(--muted)]" />
                {(expired || card.expires) && (
                  <span className="block text-[11px] font-semibold text-[var(--muted)]">{expired ? t('Expired') : t('Valid until')} {card.expires && formatDay(card.expires)}</span>
                )}
              </button>
              {left > 0 && !expired && (
                <button
                  type="button"
                  onClick={() => openSheet({ type: 'tx', kind: 'expense', giftCardId: card.id })}
                  className="pressable w-8 h-8 shrink-0 rounded-full text-[var(--text)] hover:bg-[var(--inset)] flex items-center justify-center"
                  aria-label={t('Spend from {name}', { name: card.name })}
                  title={t('Spend from {name}', { name: card.name })}
                >
                  <Receipt size={15} strokeWidth={2.4} />
                </button>
              )}
            </div>
          ))}
        </FoldCard>
      );
    }

    const add = () => openSheet({ type: 'recurringEdit' });
    return (
      <FoldCard
        {...shared}
        icon={<Repeat size={compact ? 15 : 16} strokeWidth={2.2} />}
        title={t('Recurring')}
        headline={<Headline text={`${logged.length}/${monthRecurring.length}`} compact={compact} unit={t('logged')} />}
        summary={muted(
          data.recurring.length === 0 ? 'Nothing set up' : due.length === 0 ? 'All done' : dueTotal > 0 ? `${money(dueTotal)} still due` : `${due.length} to come`,
        )}
        onAdd={add}
        addLabel={t('New recurring item')}
      >
        {data.recurring.length === 0 && <EmptyRow text={t('Rent, salary, subscriptions')} action={t('New')} onAdd={add} />}
        {monthRecurring.map((slot) => (
          <RecurringRow key={`${slot.item.id}${slot.date ?? ''}`} item={slot.item} date={slot.date} month={selectedMonth} monthItems={totals.items} />
        ))}
      </FoldCard>
    );
  };

  return (
    <div className="um-stack space-y-3.5">
      {/* The calendar (month row) is always the first thing on the page, above every note and card. */}
      <MonthNavigator />

      {data.settings.sampleData && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 pl-3.5 pr-1.5 py-1.5">
          <Sparkles size={15} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-xs font-medium text-[var(--muted)]">
            <span className="font-extrabold text-[var(--text)]">{t('Sample data.')}</span><span className="max-[374px]:hidden"> {t('Look around.')}</span>
          </p>
          <button
            type="button"
            onClick={() => setConfirmFresh(true)}
            className="pressable shrink-0 rounded-full bg-[var(--text)] text-[var(--on-text)] px-3 py-1.5 text-[11px] font-extrabold"
          >
            {t('Start fresh')}
          </button>
          <button
            type="button"
            onClick={() => updateSettings({ sampleData: false })}
            className="pressable shrink-0 size-8 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)] flex items-center justify-center"
            aria-label={t('Keep the sample data and hide this note')}
            title={t('Keep the sample data')}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {data.txs.length === 0 && !data.settings.sampleData && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/60 px-3.5 py-2.5">
          <PenLine size={15} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-xs font-medium text-[var(--muted)]">
            <span className="font-extrabold text-[var(--text)]">{t('An empty journal.')}</span> {t('Log your first income or expense with the bar at the bottom.')}
          </p>
        </div>
      )}

      <WidgetStrip />

      <div ref={panel} className="um-stack space-y-3.5">
        <HeroPair inLabel={t('Income')} outLabel={t('Spent')} inAmount={totals.income} outAmount={totals.spent} pillTitle={t('Income minus spending')} />

        <div className="space-y-3">
          <div className={`grid gap-2.5 sm:gap-3.5 ${basic ? 'grid-cols-2' : 'grid-cols-3'}`}>
            <NoteCard tone="needs" icon={Wallet} label={t('Left')} value={moneyFit(totals.left, 7)} title={t('Income minus spending and savings')} />
            <NoteCard tone="wants" icon={CalendarDays} label={t('Per day')} value={moneyFit(perDay, 7)} title={t('Average spending per day ({days} {v})', { days, v: days === 1 ? t('day') : t('days') })} />
            {!basic && (
            <NoteCard
              tone="savings"
              icon={Target}
              label={t('Budget')}
              value={budget.budget > 0 ? `${percent(budget.spent, budget.budget)}%` : '–'}
              unit={budget.budget > 0 ? t('used') : undefined}
              hint={budget.budget > 0 ? (budget.scope === 'overall' ? t('Overall monthly budget') : t('Budgeted categories')) : undefined}
              title={
                budget.budget === 0
                  ? t('No budgets set')
                  : budget.scope === 'overall'
                    ? t('{v} of the {v2} overall monthly budget (everything you spent)', { v: money(budget.spent), v2: money(budget.budget) })
                    : t('{v} of {v2} in budgeted categories. Unbudgeted spending of {v3} is not counted. Tap to see it.', { v: money(budget.spent), v2: money(budget.budget), v3: money(budget.unbudgeted) })
              }
              onClick={budget.budget > 0 && budget.scope === 'categories' && budget.unbudgeted > 0 && !data.settings.hideBudgets ? () => setActiveTab('budgets') : undefined}
            />
            )}
          </div>
          {!hideSplit && (
            <div className="space-y-1.5">
            <div className={`grid gap-2.5 sm:gap-3.5 ${showOther ? 'grid-cols-2 min-[480px]:grid-cols-4' : 'grid-cols-3'}`}>
              <ShareCard
                tone="needs"
                label={t('Needs')}
                amount={totals.needs}
                share={shares.needs}
                target={shares.ofIncome ? rule.needs : undefined}
                status={shares.ofIncome && shares.needs > rule.needs ? 'over' : undefined}
                shareTitle={shares.ofIncome ? t('of income') : t('of what went out')}
              />
              <ShareCard
                tone="wants"
                label={t('Wants')}
                amount={totals.wants}
                share={shares.wants}
                target={shares.ofIncome ? rule.wants : undefined}
                status={shares.ofIncome && shares.wants > rule.wants ? 'over' : undefined}
                shareTitle={shares.ofIncome ? t('of income') : t('of what went out')}
              />
              {showOther && (
                <ShareCard
                  tone="wants"
                  label={ownTypeNames.length === 1 ? ownTypeNames[0] : t('Other types')}
                  amount={totals.other}
                  share={shares.other}
                  shareTitle={shares.ofIncome ? t('of income') : t('of what went out')}
                />
              )}
              <ShareCard
                tone="savings"
                label={t('Savings')}
                amount={totals.saved}
                share={shares.savings}
                target={shares.ofIncome ? rule.savings : undefined}
                status={shares.ofIncome && totals.saved > 0 && shares.savings >= rule.savings ? 'ok' : undefined}
                shareTitle={shares.ofIncome ? t('of income') : t('of what went out')}
              />
            </div>
            </div>
          )}
        </div>

        <div className={`um-hide flex flex-wrap items-center justify-center gap-2 px-1 ${basic ? 'hidden' : ''}`}>
          <div role="group" aria-label={t('Card layout')} className="inline-flex items-center gap-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] p-1">
            {layouts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => chooseLayout(item.id)}
                aria-pressed={layout === item.id}
                className={`pressable inline-flex min-h-7 items-center justify-center gap-1 rounded-full px-2.5 text-[11px] font-extrabold ${
                  layout === item.id
                    ? 'bg-[var(--text)] text-[var(--on-text)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]'
                }`}
              >
                {item.icon}
                <span>{t(item.label)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={gridClass}>{categoryCards}</div>

        <div className={gridClass}>
          {TRACKERS.filter((id) => (!basic || id === 'income') && (id !== 'giftcards' || showGiftCards)).map((id) => (
            <div key={id} className={cellClass(layout === 'expanded' || openTrackers.includes(id))}>
              {trackerCard(id)}
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmFresh}
        title={t('Start with an empty journal?')}
        message={basic ? t('The sample entries are removed. Your theme and currency stay.') : t('The sample entries, goals, budgets and recurring items are removed. Your theme and currency stay.')}
        confirmLabel={t('Start fresh')}
        onCancel={() => setConfirmFresh(false)}
        onConfirm={() => {
          setConfirmFresh(false);
          eraseAll();
        }}
      />
    </div>
  );
}
