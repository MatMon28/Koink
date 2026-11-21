import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PigIcon } from '../lib/pig';
import { Modal } from '../components/Modal';
import { AmountStepper, ConfirmDialog, SectionLabel, seg, textInput } from '../components/ui';
import { goalSaved, monthsBack, monthTotals, totalsByMonth } from '../lib/calc';
import { allExpenseCategories, expenseCategory, INCOME_SOURCES, isCategoryHidden, visibleExpenseCategories } from '../lib/categories';
import { addMonths, currentMonth, defaultDateFor, formatDay, formatMonth, ordinal } from '../lib/dates';
import { percent, round2 } from '../lib/format';
import { useApp, useSheet } from '../lib/store';
import type { Sheet } from '../lib/types';
import { Banner, ChoiceGrid, SaveRow } from './shared';
import { t } from '../lib/i18n';

/* ---------- Recurring item ---------- */

export function RecurringEditSheet() {
  const { isOpen, sheet, seq } = useSheet('recurringEdit');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={sheet?.id ? t('Edit recurring item') : t('New recurring item')} maxWidth="max-w-md">
      {sheet && <RecurringForm key={seq} sheet={sheet} />}
    </Modal>
  );
}

/** Frequencies offered as buttons. Any other number is one stepper away. */
const MONTH_CHOICES: [number, string][] = [[1, 'Monthly'], [3, 'Quarterly'], [6, 'Every 6 months'], [12, 'Yearly']];
const WEEK_CHOICES: [number, string][] = [[1, 'Weekly'], [2, 'Every 2 weeks'], [4, 'Every 4 weeks']];

function RecurringForm({ sheet }: { sheet: Extract<Sheet, { type: 'recurringEdit' }> }) {
  const { data, symbol, money, selectedMonth, saveRecurring, removeRecurring, closeSheet, showToast } = useApp();
  const [original] = useState(() => (sheet.id ? data.recurring.find((r) => r.id === sheet.id) : undefined));
  const [kind, setKind] = useState<'expense' | 'income'>(original?.kind ?? 'expense');
  const [name, setName] = useState(original?.name ?? '');
  const [amount, setAmount] = useState(original?.amount ?? 0);
  const [categoryId, setCategoryId] = useState(original?.categoryId ?? 'bills');
  const [day, setDay] = useState(original?.day ?? 1);
  const [every, setEvery] = useState(original?.every ?? 1);
  const [start, setStart] = useState(original?.start ?? selectedMonth);
  // Months or weeks. A weekly item counts from a first date, which also sets its weekday.
  const [unit, setUnit] = useState<'month' | 'week'>(original?.unit === 'week' && original.anchor ? 'week' : 'month');
  const [anchor, setAnchor] = useState(original?.anchor ?? defaultDateFor(selectedMonth));
  const [confirm, setConfirm] = useState(false);

  // Hidden categories are not offered, except the one this item already has.
  const choices = kind === 'expense' ? visibleExpenseCategories().concat(original && isCategoryHidden(original.categoryId) ? allExpenseCategories().filter((c) => c.id === original.categoryId) : []) : INCOME_SOURCES;
  const category = choices.some((c) => c.id === categoryId) ? categoryId : choices[0].id;
  const safeDay = Math.min(28, Math.max(1, Math.round(day) || 1));
  const weekly = unit === 'week';
  const safeEvery = Math.min(weekly ? 52 : 60, Math.max(1, Math.round(every) || 1));
  const valid = name.trim().length > 0 && amount > 0 && (!weekly || /^\d{4}-\d{2}-\d{2}$/.test(anchor));
  const choices2 = weekly ? WEEK_CHOICES : MONTH_CHOICES;

  const switchUnit = (next: 'month' | 'week') => {
    if (next === unit) return;
    setUnit(next);
    setEvery(1);
  };

  const save = () => {
    if (!valid) return;
    if (weekly) {
      // `day` (day of the month) only orders the list for a weekly item: the anchor's day is as good as any.
      saveRecurring({ id: original?.id, kind, name, amount, categoryId: category, day: Math.min(28, Number(anchor.slice(8, 10))), every: safeEvery, start: anchor.slice(0, 7), unit: 'week', anchor });
      closeSheet();
      showToast(safeEvery === 1 ? t('{v} · every week', { v: name.trim() }) : t('{v} · every {n} weeks', { v: name.trim(), n: safeEvery }));
      return;
    }
    saveRecurring({ id: original?.id, kind, name, amount, categoryId: category, day: safeDay, every: safeEvery, start });
    closeSheet();
    showToast(
      safeEvery === 1
        ? t('{v} · every month on the {v2}', { v: name.trim(), v2: ordinal(safeDay) })
        : t('{v} · every {n} months on the {v2}', { v: name.trim(), n: safeEvery, v2: ordinal(safeDay) }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5" role="group" aria-label={t('Kind')}>
        <button type="button" aria-pressed={kind === 'expense'} onClick={() => setKind('expense')} className={seg(kind === 'expense')}>{t('Expense')}</button>
        <button type="button" aria-pressed={kind === 'income'} onClick={() => setKind('income')} className={seg(kind === 'income')}>{t('Income')}</button>
      </div>

      <div>
        <SectionLabel htmlFor="rec-name">{t('Name')}</SectionLabel>
        <input
          id="rec-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={kind === 'expense' ? t('Rent, gym, phone plan') : t('Salary, pension')}
          maxLength={40}
          autoComplete="off"
          className={`${textInput} text-sm`}
        />
      </div>

      <div>
        <SectionLabel>{safeEvery === 1 && !weekly ? t('Amount each month') : t('Amount each time')}</SectionLabel>
        <AmountStepper value={amount} onChange={setAmount} unit={symbol} ariaLabel={safeEvery === 1 && !weekly ? t('Amount each month') : t('Amount each time')} startOpen={!original} chips={kind === 'expense' ? [5, 10, 50, 100] : [100, 500, 1000]} />
      </div>

      <div>
        <SectionLabel>{kind === 'expense' ? t('Category') : t('Source')}</SectionLabel>
        <ChoiceGrid choices={choices} value={category} onChange={setCategoryId} label={kind === 'expense' ? t('Category') : t('Source')} />
      </div>

      <div>
        <SectionLabel>{t('Repeats')}</SectionLabel>
        <div className="flex gap-1.5 mb-2" role="group" aria-label={t('Repeat in')}>
          <button type="button" aria-pressed={!weekly} onClick={() => switchUnit('month')} className={seg(!weekly)}>{t('Months')}</button>
          <button type="button" aria-pressed={weekly} onClick={() => switchUnit('week')} className={seg(weekly)}>{t('Weeks')}</button>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Repeats')}>
          {choices2.map(([count, label]) => (
            <button key={count} type="button" aria-pressed={safeEvery === count} onClick={() => setEvery(count)} className={`${seg(safeEvery === count)} flex-none px-3`}>
              {t(label)}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <AmountStepper
            value={every}
            onChange={setEvery}
            unit={weekly ? (safeEvery === 1 ? t('week') : t('weeks')) : safeEvery === 1 ? t('month') : t('months')}
            min={1}
            max={weekly ? 52 : 60}
            decimals={0}
            ariaLabel={weekly ? t('Every how many weeks') : t('Every how many months')}
          />
        </div>
      </div>

      {weekly ? (
        <div>
          <SectionLabel htmlFor="rec-anchor">{t('First due on')}</SectionLabel>
          <input id="rec-anchor" type="date" value={anchor} onChange={(event) => setAnchor(event.target.value)} className={`${textInput} text-sm`} />
          <p className="mt-1.5 text-[11px] font-medium text-[var(--muted)]">
            {/^\d{4}-\d{2}-\d{2}$/.test(anchor)
              ? safeEvery === 1
                ? t('Due every week, on the same weekday as {v}. Each due date is its own line on the checklist.', { v: formatDay(anchor, false) })
                : t('Due every {n} weeks, counted from {v}. Each due date is its own line on the checklist.', { n: safeEvery, v: formatDay(anchor, false) })
              : t('Pick the first date it is due.')}
          </p>
        </div>
      ) : (
        <>
          <div>
            <SectionLabel>{t('Day of the month')}</SectionLabel>
            <AmountStepper value={day} onChange={setDay} unit={t('day')} min={1} max={28} decimals={0} ariaLabel={t('Day of the month')} />
            <p className="mt-1.5 text-[11px] font-medium text-[var(--muted)]">{t('Days stop at the 28th so every month has one.')}</p>
          </div>
          {safeEvery > 1 && (
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-2 py-1.5">
              <button type="button" onClick={() => setStart(addMonths(start, -1))} className="pressable size-9 rounded-full hover:bg-[var(--hover)] flex items-center justify-center" aria-label={t('Earlier month')}>
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-0 text-center">
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('First due in')}</span>
                <span className="block text-sm font-extrabold text-[var(--text)]">{formatMonth(start)}</span>
              </span>
              <button type="button" onClick={() => setStart(addMonths(start, 1))} className="pressable size-9 rounded-full hover:bg-[var(--hover)] flex items-center justify-center" aria-label={t('Later month')}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
          <p className="-mt-2 text-[11px] font-medium text-[var(--muted)]">
            {safeEvery === 1 ? t('Due every month.') : t('Due every {n} months, counted from the month above. It only shows on the checklist in those months.', { n: safeEvery })}
          </p>
        </>
      )}

      <SaveRow
        tone={kind}
        disabled={!valid}
        onSave={save}
        label={<>{original ? t('Save changes') : t('Add recurring item')}{amount > 0 && ` · ${money(amount, { cents: true })}`}</>}
        onDelete={original ? () => setConfirm(true) : undefined}
        deleteLabel={t('Delete this recurring item')}
      />

      <ConfirmDialog
        open={confirm}
        title={t('Delete {v}?', { v: original?.name ?? 'this item' })}
        message={t('It will no longer be offered each month. Entries you already logged stay in your journal.')}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          if (original) removeRecurring(original.id);
          closeSheet();
        }}
      />
    </div>
  );
}

/* ---------- Savings goal ---------- */

export function GoalSheet() {
  const { isOpen, sheet, seq } = useSheet('goal');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={sheet?.id ? t('Edit savings goal') : t('New savings goal')} maxWidth="max-w-md">
      {sheet && <GoalForm key={seq} sheet={sheet} />}
    </Modal>
  );
}

function GoalForm({ sheet }: { sheet: Extract<Sheet, { type: 'goal' }> }) {
  const { data, symbol, money, saveGoal, removeGoal, closeSheet, openSheet } = useApp();
  const [original] = useState(() => (sheet.id ? data.goals.find((g) => g.id === sheet.id) : undefined));
  const [name, setName] = useState(original?.name ?? '');
  const [target, setTarget] = useState(original?.target ?? 0);
  const [confirm, setConfirm] = useState(false);
  const saved = original ? goalSaved(data.txs, original) : 0;
  const valid = name.trim().length > 0;

  const save = () => {
    if (!valid) return;
    saveGoal({ id: original?.id, name, target });
    closeSheet();
  };

  return (
    <div className="space-y-4">
      {original && (
        <Banner
          tone="saving"
          icon={PigIcon}
          label={t('Saved so far')}
          value={money(saved, { cents: true })}
          sub={target > 0 ? saved >= target ? t('Goal reached') : t('{v}% · {v2} to go', { v: percent(saved, target), v2: money(target - saved) }) : undefined}
        />
      )}

      <div>
        <SectionLabel htmlFor="goal-name">{t('Name')}</SectionLabel>
        <input
          id="goal-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('Emergency fund, trip, new bike')}
          maxLength={40}
          autoComplete="off"
          className={`${textInput} text-sm`}
        />
      </div>

      <div>
        <SectionLabel>{t('Target')}</SectionLabel>
        <AmountStepper value={target} onChange={setTarget} unit={symbol} step={50} ariaLabel={t('Target amount')} startOpen chips={[100, 500, 1000]} />
        <p className="mt-1.5 text-[11px] font-medium text-[var(--muted)]">{t('Leave it at 0 for an open-ended pot.')}</p>
      </div>

      {original && (
        <button
          type="button"
          onClick={() => openSheet({ type: 'tx', kind: 'saving', categoryId: original.id })}
          className="pressable pressable-soft w-full py-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] text-sm font-extrabold"
        >
          {t('Move money to this goal')}
        </button>
      )}

      <SaveRow
        tone="saving"
        disabled={!valid}
        onSave={save}
        label={original ? t('Save changes') : t('Create goal')}
        onDelete={original ? () => setConfirm(true) : undefined}
        deleteLabel={t('Delete this goal')}
      />

      <ConfirmDialog
        open={confirm}
        title={t('Delete {v}?', { v: original?.name ?? 'this goal' })}
        message={t('The goal is removed. Money you already moved to it stays in your journal as savings.')}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          if (original) removeGoal(original.id);
          closeSheet();
        }}
      />
    </div>
  );
}

/* ---------- Category budget ---------- */

export function BudgetSheet() {
  const { isOpen, sheet, seq } = useSheet('budget');
  const { closeSheet } = useApp();
  const category = sheet ? expenseCategory(sheet.categoryId) : undefined;
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={t('{v} budget', { v: category?.name ?? 'Category' })} subtitle={t('Per month')} maxWidth="max-w-md">
      {sheet && <BudgetForm key={seq} sheet={sheet} />}
    </Modal>
  );
}

function BudgetForm({ sheet }: { sheet: Extract<Sheet, { type: 'budget' }> }) {
  const { data, symbol, money, selectedMonth, setBudget, closeSheet } = useApp();
  const category = expenseCategory(sheet.categoryId) ?? allExpenseCategories()[0];
  const [amount, setAmount] = useState(data.profile.budgets[category.id] ?? 0);

  const spent = useMemo(() => monthTotals(data.txs, selectedMonth).byCategory[category.id]?.total ?? 0, [data.txs, selectedMonth, category.id]);

  // Average of the three full months before this one, as a starting point.
  const average = useMemo(() => {
    const months = monthsBack(addMonths(currentMonth(), -1), 3);
    const totals = totalsByMonth(data.txs, months).filter((m) => m.count > 0);
    if (totals.length === 0) return 0;
    return round2(totals.reduce((sum, m) => sum + (m.byCategory[category.id]?.total ?? 0), 0) / totals.length);
  }, [data.txs, category.id]);

  const left = round2(amount - spent);

  return (
    <div className="space-y-4">
      <Banner
        tone={category.bucket === 'needs' ? 'needs' : 'wants'}
        icon={category.icon}
        label={t('Spent in {v}', { v: formatMonth(selectedMonth, 'long', false) })}
        value={money(spent, { cents: true })}
        sub={amount > 0 ? left >= 0 ? t('{v} left', { v: money(left) }) : t('{v} over', { v: money(-left) }) : t('No budget')}
      />

      <AmountStepper value={amount} onChange={setAmount} unit={symbol} step={10} ariaLabel={t('Monthly budget')} startOpen chips={[10, 50, 100]} />

      <div className="flex flex-wrap gap-1.5">
        {average > 0 && (
          <button
            type="button"
            onClick={() => setAmount(Math.ceil(average / 10) * 10)}
            className="pressable px-3 py-2 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] tabular-nums"
          >
            {t('Use recent average ·')} {money(Math.ceil(average / 10) * 10)}
          </button>
        )}
        {amount > 0 && (
          <button
            type="button"
            onClick={() => setAmount(0)}
            className="pressable px-3 py-2 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)]"
          >
            {t('No budget')}
          </button>
        )}
      </div>

      <SaveRow
        tone="neutral"
        onSave={() => {
          setBudget(category.id, amount);
          closeSheet();
        }}
        label={amount > 0 ? t('Save · {v} a month', { v: money(amount) }) : t('Save without a budget')}
      />
    </div>
  );
}
