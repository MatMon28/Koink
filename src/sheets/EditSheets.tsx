import { useMemo, useState } from 'react';
import {  } from 'lucide-react';
import { PigIcon } from '../lib/pig';
import { Modal } from '../components/Modal';
import { AmountStepper, ConfirmDialog, SectionLabel, seg, textInput } from '../components/ui';
import { goalSaved, monthsBack, monthTotals, totalsByMonth } from '../lib/calc';
import { allExpenseCategories, expenseCategory, INCOME_SOURCES, isCategoryHidden, visibleExpenseCategories } from '../lib/categories';
import { addMonths, currentMonth, formatMonth, ordinal } from '../lib/dates';
import { percent, round2 } from '../lib/format';
import { useApp, useSheet } from '../lib/store';
import type { Sheet } from '../lib/types';
import { Banner, ChoiceGrid, SaveRow } from './shared';

/* ---------- Recurring item ---------- */

export function RecurringEditSheet() {
  const { isOpen, sheet, seq } = useSheet('recurringEdit');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={sheet?.id ? 'Edit recurring item' : 'New recurring item'} maxWidth="max-w-md">
      {sheet && <RecurringForm key={seq} sheet={sheet} />}
    </Modal>
  );
}

function RecurringForm({ sheet }: { sheet: Extract<Sheet, { type: 'recurringEdit' }> }) {
  const { data, symbol, money, saveRecurring, removeRecurring, closeSheet, showToast } = useApp();
  const [original] = useState(() => (sheet.id ? data.recurring.find((r) => r.id === sheet.id) : undefined));
  const [kind, setKind] = useState<'expense' | 'income'>(original?.kind ?? 'expense');
  const [name, setName] = useState(original?.name ?? '');
  const [amount, setAmount] = useState(original?.amount ?? 0);
  const [categoryId, setCategoryId] = useState(original?.categoryId ?? 'bills');
  const [day, setDay] = useState(original?.day ?? 1);
  const [confirm, setConfirm] = useState(false);

  // Hidden categories are not offered, except the one this item already has.
  const choices = kind === 'expense' ? visibleExpenseCategories().concat(original && isCategoryHidden(original.categoryId) ? allExpenseCategories().filter((c) => c.id === original.categoryId) : []) : INCOME_SOURCES;
  const category = choices.some((c) => c.id === categoryId) ? categoryId : choices[0].id;
  const safeDay = Math.min(28, Math.max(1, Math.round(day) || 1));
  const valid = name.trim().length > 0 && amount > 0;

  const save = () => {
    if (!valid) return;
    saveRecurring({ id: original?.id, kind, name, amount, categoryId: category, day: safeDay });
    closeSheet();
    showToast(`${name.trim()} · every month on the ${ordinal(safeDay)}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5" role="group" aria-label="Kind">
        <button type="button" aria-pressed={kind === 'expense'} onClick={() => setKind('expense')} className={seg(kind === 'expense')}>Expense</button>
        <button type="button" aria-pressed={kind === 'income'} onClick={() => setKind('income')} className={seg(kind === 'income')}>Income</button>
      </div>

      <div>
        <SectionLabel htmlFor="rec-name">Name</SectionLabel>
        <input
          id="rec-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={kind === 'expense' ? 'Rent, gym, phone plan' : 'Salary, pension'}
          maxLength={40}
          autoComplete="off"
          className={`${textInput} text-sm`}
        />
      </div>

      <div>
        <SectionLabel>Amount each month</SectionLabel>
        <AmountStepper value={amount} onChange={setAmount} unit={symbol} ariaLabel="Amount each month" startOpen={!original} chips={kind === 'expense' ? [5, 10, 50, 100] : [100, 500, 1000]} />
      </div>

      <div>
        <SectionLabel>{kind === 'expense' ? 'Category' : 'Source'}</SectionLabel>
        <ChoiceGrid choices={choices} value={category} onChange={setCategoryId} label={kind === 'expense' ? 'Category' : 'Source'} />
      </div>

      <div>
        <SectionLabel>Day of the month</SectionLabel>
        <AmountStepper value={day} onChange={setDay} unit="day" min={1} max={28} decimals={0} ariaLabel="Day of the month" />
        <p className="mt-1.5 text-[11px] font-medium text-[var(--muted)]">Days stop at the 28th so every month has one.</p>
      </div>

      <SaveRow
        tone={kind}
        disabled={!valid}
        onSave={save}
        label={<>{original ? 'Save changes' : 'Add recurring item'}{amount > 0 && ` · ${money(amount, { cents: true })}`}</>}
        onDelete={original ? () => setConfirm(true) : undefined}
        deleteLabel="Delete this recurring item"
      />

      <ConfirmDialog
        open={confirm}
        title={`Delete ${original?.name ?? 'this item'}?`}
        message="It will no longer be offered each month. Entries you already logged stay in your journal."
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
    <Modal isOpen={isOpen} onClose={closeSheet} title={sheet?.id ? 'Edit savings goal' : 'New savings goal'} maxWidth="max-w-md">
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
          label="Saved so far"
          value={money(saved, { cents: true })}
          sub={target > 0 ? (saved >= target ? 'Goal reached' : `${percent(saved, target)}% · ${money(target - saved)} to go`) : undefined}
        />
      )}

      <div>
        <SectionLabel htmlFor="goal-name">Name</SectionLabel>
        <input
          id="goal-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Emergency fund, trip, new bike"
          maxLength={40}
          autoComplete="off"
          className={`${textInput} text-sm`}
        />
      </div>

      <div>
        <SectionLabel>Target</SectionLabel>
        <AmountStepper value={target} onChange={setTarget} unit={symbol} step={50} ariaLabel="Target amount" startOpen chips={[100, 500, 1000]} />
        <p className="mt-1.5 text-[11px] font-medium text-[var(--muted)]">Leave it at 0 for an open-ended pot.</p>
      </div>

      {original && (
        <button
          type="button"
          onClick={() => openSheet({ type: 'tx', kind: 'saving', categoryId: original.id })}
          className="pressable pressable-soft w-full py-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] text-sm font-extrabold"
        >
          Move money to this goal
        </button>
      )}

      <SaveRow
        tone="saving"
        disabled={!valid}
        onSave={save}
        label={original ? 'Save changes' : 'Create goal'}
        onDelete={original ? () => setConfirm(true) : undefined}
        deleteLabel="Delete this goal"
      />

      <ConfirmDialog
        open={confirm}
        title={`Delete ${original?.name ?? 'this goal'}?`}
        message="The goal is removed. Money you already moved to it stays in your journal as savings."
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
    <Modal isOpen={isOpen} onClose={closeSheet} title={`${category?.name ?? 'Category'} budget`} subtitle="Per month" maxWidth="max-w-md">
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
        tone={category.bucket}
        icon={category.icon}
        label={`Spent in ${formatMonth(selectedMonth, 'long', false)}`}
        value={money(spent, { cents: true })}
        sub={amount > 0 ? (left >= 0 ? `${money(left)} left` : `${money(-left)} over`) : 'No budget'}
      />

      <AmountStepper value={amount} onChange={setAmount} unit={symbol} step={10} ariaLabel="Monthly budget" startOpen chips={[10, 50, 100]} />

      <div className="flex flex-wrap gap-1.5">
        {average > 0 && (
          <button
            type="button"
            onClick={() => setAmount(Math.ceil(average / 10) * 10)}
            className="pressable px-3 py-2 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] tabular-nums"
          >
            Use recent average · {money(Math.ceil(average / 10) * 10)}
          </button>
        )}
        {amount > 0 && (
          <button
            type="button"
            onClick={() => setAmount(0)}
            className="pressable px-3 py-2 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)]"
          >
            No budget
          </button>
        )}
      </div>

      <SaveRow
        tone="neutral"
        onSave={() => {
          setBudget(category.id, amount);
          closeSheet();
        }}
        label={amount > 0 ? `Save · ${money(amount)} a month` : 'Save without a budget'}
      />
    </div>
  );
}
