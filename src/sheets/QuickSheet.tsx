import { useMemo } from 'react';
import { ICON } from '../lib/icons';
import { Plus, Repeat } from 'lucide-react';
import { Modal } from '../components/Modal';
import { RecurringRow } from '../components/RecurringRow';
import { frequentEntries, monthTotals, recurringSlots, slotEntry } from '../lib/calc';
import { categoryMeta } from '../lib/categories';
import { formatMonth, todayStr } from '../lib/dates';
import { useApp, useSheet } from '../lib/store';
import { Banner } from './shared';
import { t } from '../lib/i18n';

/** The entries you log again and again, one tap each (they are dated today). */
export function QuickSheet() {
  const { isOpen } = useSheet('quick');
  const { data, money, addTx, closeSheet } = useApp();
  const entries = useMemo(() => (isOpen ? frequentEntries(data.txs) : []), [isOpen, data.txs]);

  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={t('Log again')} subtitle={t('Your most frequent entries, dated today')} dockId="quick" maxWidth="max-w-md">
      {entries.length === 0 ? (
        <p className="text-sm font-medium text-[var(--muted)]">{t('Once you have logged the same thing twice, it shows up here for one-tap logging.')}</p>
      ) : (
        <div className="divide-y divide-[var(--border)] bg-[var(--inset)] border border-[var(--border)] rounded-2xl overflow-hidden">
          {entries.map((entry) => {
            const meta = categoryMeta(entry.kind, entry.categoryId, data.goals);
            const Icon = meta.icon;
            const amount = money(entry.amount, { cents: true });
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => addTx({ kind: entry.kind, categoryId: entry.categoryId, note: entry.note, amount: entry.amount, date: todayStr() })}
                className="pressable pressable-soft w-full px-3 py-2.5 flex items-center gap-2.5 text-left hover:bg-[var(--hover)]"
                aria-label={t('Log {note}, {amount}, today', { note: entry.note, amount })}
              >
                <span className="size-9 rounded-full flex items-center justify-center shrink-0 text-[var(--text)]">
                  <Icon size={ICON.md} strokeWidth={2.5} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate block">{entry.note}</span>
                  <span className="text-[11px] font-medium text-[var(--muted)] truncate block tabular-nums">{meta.name} · {entry.count}×</span>
                </span>
                <span className="text-xs sm:text-sm font-extrabold tabular-nums text-[var(--text)] shrink-0">
                  {entry.kind === 'income' ? '+' : ''}{amount}
                </span>
                <span className="size-8 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center shrink-0" aria-hidden="true">
                  <Plus size={ICON.md} strokeWidth={2.5} aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

/** This month's recurring items as a checklist. */
export function RecurringSheet() {
  const { isOpen } = useSheet('recurring');
  const { data, selectedMonth, money, openSheet, closeSheet } = useApp();
  const items = useMemo(() => (isOpen ? monthTotals(data.txs, selectedMonth).items : []), [isOpen, data.txs, selectedMonth]);
  // Only what belongs to this month: monthly items and the ones whose turn it is (every 3 months...).
  const list = recurringSlots(data.recurring, selectedMonth, items);
  const due = list.filter((slot) => !slotEntry(items, slot));
  const dueOut = due.filter((slot) => slot.item.kind === 'expense').reduce((sum, slot) => sum + slot.item.amount, 0);

  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={t('Recurring')} subtitle={formatMonth(selectedMonth)} dockId="recurring" maxWidth="max-w-md">
      <div className="space-y-4">
        {list.length > 0 && (
          <Banner
            tone="needs"
            icon={Repeat}
            label={due.length === 0 ? t('All logged') : t('{v} of {length} logged', { v: list.length - due.length, length: list.length })}
            value={money(dueOut, { cents: true })}
            sub={t('still due')}
          />
        )}
        {list.length === 0 ? (
          <p className="text-sm font-medium text-[var(--muted)]">{t('Rent, salary, subscriptions: set them up once, then log each month with one tap.')}</p>
        ) : (
          <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-2xl px-3">
            {list.map((slot) => (
              <RecurringRow key={`${slot.item.id}${slot.date ?? ''}`} item={slot.item} date={slot.date} month={selectedMonth} monthItems={items} />
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => openSheet({ type: 'recurringEdit' })}
          className="pressable pressable-soft w-full py-3 bg-needs hover:brightness-95 text-needs-ink font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={ICON.lg} strokeWidth={2.5} aria-hidden="true" />
          {t('New recurring item')}
        </button>
      </div>
    </Modal>
  );
}
