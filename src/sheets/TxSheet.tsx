import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { PiggyBank, Plus } from 'lucide-react';
import { Modal } from '../components/Modal';
import { AmountStepper, SaveBeforeCloseDialog, SectionLabel, textInput } from '../components/ui';
import { goalSaved } from '../lib/calc';
import { categoryMeta, EXPENSE_CATEGORIES, INCOME_SOURCES } from '../lib/categories';
import { addDays, defaultDateFor, formatDay, formatMonth, monthOf, todayStr } from '../lib/dates';
import { percent, round2 } from '../lib/format';
import { useApp, useSheet } from '../lib/store';
import type { Kind, Sheet } from '../lib/types';
import { Banner, ChoiceGrid, SaveRow, type Choice } from './shared';

const TITLES: Record<Kind, { add: string; edit: string; save: string }> = {
  expense: { add: 'Add expense', edit: 'Edit expense', save: 'Add expense' },
  income: { add: 'Add income', edit: 'Edit income', save: 'Add income' },
  saving: { add: 'Move to savings', edit: 'Edit savings entry', save: 'Move to savings' },
};

const CHIPS: Record<Kind, number[]> = {
  expense: [5, 10, 20, 50],
  income: [50, 100, 500, 1000],
  saving: [10, 50, 100, 500],
};

/** What the form reports to its sheet, so a dismissal can ask before unsaved input is lost. */
interface FormGuard {
  dirty: boolean;
  valid: boolean;
  save: () => void;
}

export function TxSheet() {
  const { isOpen, sheet, seq } = useSheet('tx');
  const { closeSheet } = useApp();
  const kind = sheet?.kind ?? 'expense';
  const guardRef = useRef<FormGuard | null>(null);
  const [asking, setAsking] = useState<{ canSave: boolean } | null>(null);

  // Scrim, swipe down, X, Escape and Back all end up here.
  const requestClose = () => {
    const guard = guardRef.current;
    if (isOpen && guard?.dirty) setAsking({ canSave: guard.valid });
    else closeSheet();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={requestClose}
        title={sheet?.editId ? TITLES[kind].edit : TITLES[kind].add}
        dockId={sheet?.editId ? undefined : kind}
        maxWidth="max-w-md"
      >
        {sheet && <TxForm key={seq} sheet={sheet} guardRef={guardRef} />}
      </Modal>
      <SaveBeforeCloseDialog
        open={asking !== null}
        canSave={asking?.canSave ?? false}
        onSave={() => {
          setAsking(null);
          guardRef.current?.save();
        }}
        onDiscard={() => {
          setAsking(null);
          closeSheet();
        }}
        onKeep={() => setAsking(null)}
      />
    </>
  );
}

function TxForm({ sheet, guardRef }: { sheet: Extract<Sheet, { type: 'tx' }>; guardRef: RefObject<FormGuard | null> }) {
  const { data, selectedMonth, money, symbol, addTx, updateTx, removeTx, closeSheet, openSheet } = useApp();
  // The entry as it was when the sheet opened; the form no longer depends on the ledger after that.
  const [original] = useState(() => (sheet.editId ? data.txs.find((tx) => tx.id === sheet.editId) : undefined));
  const kind = original?.kind ?? sheet.kind;

  const choices: Choice[] = useMemo(() => {
    if (kind === 'expense') return EXPENSE_CATEGORIES;
    if (kind === 'income') return INCOME_SOURCES;
    return data.goals.map((goal) => ({ id: goal.id, name: goal.name, icon: PiggyBank }));
  }, [kind, data.goals]);

  // A new entry starts on the category used last for this kind of entry.
  const [categoryId, setCategoryId] = useState(() => {
    if (original) return original.categoryId;
    if (sheet.categoryId) return sheet.categoryId;
    const last = data.txs.find((tx) => tx.kind === kind && !tx.recurringId && choices.some((c) => c.id === tx.categoryId));
    return last?.categoryId ?? choices[0]?.id ?? '';
  });
  const [amount, setAmount] = useState(original?.amount ?? 0);
  const [note, setNote] = useState(original?.note ?? '');
  const [date, setDate] = useState(original?.date ?? defaultDateFor(selectedMonth));

  const meta = categoryMeta(kind, categoryId, data.goals);
  const month = monthOf(date);
  const today = todayStr();
  const yesterday = addDays(today, -1);

  // What the month (or the goal) looks like with this entry counted in.
  const banner = useMemo(() => {
    const others = data.txs.filter((tx) => tx.id !== original?.id && tx.kind === kind);
    if (kind === 'saving') {
      const goal = data.goals.find((g) => g.id === categoryId);
      const saved = round2((goal ? goalSaved(others, goal) : 0) + amount);
      return {
        label: goal?.name ?? 'Savings',
        value: money(saved),
        sub: goal && goal.target > 0 ? `${percent(saved, goal.target)}% of ${money(goal.target)}` : undefined,
      };
    }
    const inMonth = others.filter((tx) => monthOf(tx.date) === month);
    const monthName = formatMonth(month, 'long', false);
    if (kind === 'income') {
      const total = round2(inMonth.reduce((sum, tx) => sum + tx.amount, 0) + amount);
      return { label: `Income · ${monthName}`, value: money(total), sub: undefined };
    }
    const total = round2(inMonth.filter((tx) => tx.categoryId === categoryId).reduce((sum, tx) => sum + tx.amount, 0) + amount);
    const limit = data.profile.budgets[categoryId] ?? 0;
    const left = round2(limit - total);
    return {
      label: `${meta.name} · ${monthName}`,
      value: money(total),
      sub: limit > 0 ? (left >= 0 ? `${money(left)} left of ${money(limit)}` : `${money(-left)} over ${money(limit)}`) : 'No budget set',
    };
  }, [data.txs, data.goals, data.profile.budgets, original?.id, kind, categoryId, amount, month, meta.name, money]);

  // The notes used most recently for this category: one tap fills the note (and the amount when it is still empty).
  const recent = useMemo(() => {
    const seen = new Map<string, number>();
    for (const tx of data.txs) {
      if (tx.kind !== kind || tx.categoryId !== categoryId || tx.recurringId || !tx.note.trim()) continue;
      if (!seen.has(tx.note)) seen.set(tx.note, tx.amount);
      if (seen.size >= 4) break;
    }
    return [...seen.entries()];
  }, [data.txs, kind, categoryId]);

  const valid = amount > 0 && !!categoryId && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const save = () => {
    if (!valid) return;
    const entry = { kind, categoryId, amount: round2(amount), note: note.trim() || meta.name, date };
    if (original) updateTx(original.id, entry);
    else addTx(entry);
    closeSheet();
  };

  // Unsaved input: anything typed into a new entry, or any change to an existing one.
  const dirty = original
    ? round2(amount) !== original.amount || note.trim() !== original.note || categoryId !== original.categoryId || date !== original.date
    : amount > 0 || note.trim() !== '';
  useEffect(() => {
    guardRef.current = { dirty, valid, save };
  });

  if (kind === 'saving' && choices.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-[var(--text)]">Savings go towards a goal. Create one first, then move money to it.</p>
        <button
          type="button"
          onClick={() => openSheet({ type: 'goal' })}
          className="pressable pressable-soft w-full py-3 bg-weight hover:brightness-95 text-weight-ink font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={18} strokeWidth={2.5} />
          New savings goal
        </button>
      </div>
    );
  }

  const dateChip = (value: string, label: string) => (
    <button
      type="button"
      aria-pressed={date === value}
      onClick={() => setDate(value)}
      className={`pressable px-3 py-2 rounded-xl text-xs font-extrabold border ${
        date === value
          ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
          : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <Banner tone={kind} icon={meta.icon} label={banner.label} value={banner.value} sub={banner.sub} />

      <AmountStepper
        value={amount}
        onChange={setAmount}
        unit={symbol}
        ariaLabel="Amount"
        autoFocus={!original && window.matchMedia?.('(pointer: fine)').matches}
        chips={CHIPS[kind]}
      />

      <div>
        <SectionLabel>{kind === 'expense' ? 'Category' : kind === 'income' ? 'Source' : 'Goal'}</SectionLabel>
        <ChoiceGrid
          choices={choices}
          value={categoryId}
          onChange={setCategoryId}
          label={kind === 'expense' ? 'Category' : kind === 'income' ? 'Source' : 'Goal'}
          columns={kind === 'saving' ? (choices.length > 3 ? 2 : (Math.max(2, choices.length) as 2 | 3)) : 4}
        />
      </div>

      <div>
        <SectionLabel htmlFor="tx-note">Note</SectionLabel>
        <input
          id="tx-note"
          type="text"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={meta.name}
          maxLength={60}
          autoComplete="off"
          enterKeyHint="done"
          onKeyDown={(event) => {
            if (event.key === 'Enter') save();
          }}
          className={`${textInput} text-sm`}
        />
        {recent.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {recent.map(([text, lastAmount]) => (
              <button
                key={text}
                type="button"
                onClick={() => {
                  setNote(text);
                  if (amount === 0) setAmount(lastAmount);
                }}
                className="pressable max-w-full truncate px-2.5 py-1.5 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[11px] font-bold text-[var(--muted)] hover:text-[var(--text)] tabular-nums"
                title={`${text}, last time ${money(lastAmount, { cents: true })}`}
              >
                {text} <span className="opacity-70">{money(lastAmount, { cents: true })}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionLabel htmlFor="tx-date">Date</SectionLabel>
        <div className="flex flex-wrap items-center gap-1.5">
          {dateChip(today, 'Today')}
          {dateChip(yesterday, 'Yesterday')}
          <input
            id="tx-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value || date)}
            aria-label={`Date: ${formatDay(date, false)}`}
            className="min-w-0 flex-1 bg-[var(--inset)] border border-[var(--border)] rounded-xl px-2.5 py-[0.4375rem] text-xs font-bold text-[var(--text)] tabular-nums focus:outline-none focus:border-[var(--muted)]"
          />
        </div>
      </div>

      <SaveRow
        tone={kind}
        disabled={!valid}
        onSave={save}
        label={<>{original ? 'Save changes' : TITLES[kind].save}{amount > 0 && ` · ${money(amount, { cents: true })}`}</>}
        onDelete={original ? () => {
          closeSheet();
          removeTx(original.id);
        } : undefined}
        deleteLabel="Delete this entry"
      />
    </div>
  );
}
