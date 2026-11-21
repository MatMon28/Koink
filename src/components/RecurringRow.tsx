import { Check } from 'lucide-react';
import { isWeekly, nextDueDate, nextDueMonth, recurringDue, slotEntry } from '../lib/calc';
import { categoryMeta } from '../lib/categories';
import { formatDay, formatMonth, ordinal } from '../lib/dates';
import { useApp } from '../lib/store';
import type { Recurring, Tx } from '../lib/types';
import { t } from '../lib/i18n';

/**
 * One recurring item for a month: tap the text to edit it, tap the button to log it for that month
 * (or to take the logged entry back). A weekly item has one row per occurrence: `date` is that
 * occurrence; without a date a weekly item is not due this month and the row says when it is next.
 */
export function RecurringRow({ item, month, monthItems, date }: { item: Recurring; month: string; monthItems: Tx[]; date?: string }) {
  const { data, money, openSheet, logRecurring, removeTx } = useApp();
  const weekly = isWeekly(item);
  const entry = slotEntry(monthItems, { item, date });
  const due = weekly ? !!date : recurringDue(item, month);
  const when = weekly
    ? `${date ? formatDay(date, false) : t('Weekly')} · ${item.every > 1 ? t('every {n} weeks', { n: item.every }) : t('every week')}`
    : `${ordinal(item.day)}${item.every > 1 ? ` · ${t('every {n} months', { n: item.every })}` : ''}`;
  const nextLabel = weekly ? formatDay(nextDueDate(item, `${month}-01`), false) : `${formatMonth(nextDueMonth(item, month), 'short', nextDueMonth(item, month).slice(0, 4) !== month.slice(0, 4))}`;
  const meta = categoryMeta(item.kind, item.categoryId, data.goals);
  return (
    <div className="py-2.5 flex items-center justify-between gap-2">
      <button type="button" onClick={() => openSheet({ type: 'recurringEdit', id: item.id })} className="min-w-0 flex-1 text-left group" aria-label={t('Edit {name}', { name: item.name })}>
        <span className="text-xs sm:text-sm font-bold text-[var(--text)] group-hover:opacity-80 truncate block">{item.name}</span>
        <span className="text-[11px] font-medium tabular-nums text-[var(--muted)] truncate block">
          {when} · {meta.name}
        </span>
      </button>
      <span className="text-xs sm:text-sm font-extrabold tabular-nums text-[var(--text)] shrink-0">
        {item.kind === 'income' ? '+' : ''}{money(entry?.amount ?? item.amount, { cents: true })}
      </span>
      {entry ? (
        <button
          type="button"
          onClick={() => removeTx(entry.id)}
          className="kc-done pressable h-8 w-[4rem] shrink-0 rounded-full bg-[#C9EFD3] text-[#1A5632] text-[11px] font-extrabold inline-flex items-center justify-center gap-1"
          aria-label={t('{name} is logged for {v}. Remove the entry', { name: item.name, v: formatMonth(month) })}
          title={t('Logged. Tap to remove the entry')}
        >
          <Check size={13} strokeWidth={3} />
          {t('Done')}
        </button>
      ) : !due ? (
        <span
          className="h-8 shrink-0 rounded-full bg-[var(--inset)] text-[var(--muted)] px-3 text-[11px] font-extrabold inline-flex items-center justify-center whitespace-nowrap"
          title={t('Not due in {v}', { v: formatMonth(month) })}
        >
          {t('Next')} {nextLabel}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => logRecurring(item, month, date)}
          className="pressable h-8 w-[4rem] shrink-0 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] text-[11px] font-extrabold inline-flex items-center justify-center"
          aria-label={t('Log {name} for {v}', { name: item.name, v: formatMonth(month) })}
        >
          {t('Log')}
        </button>
      )}
    </div>
  );
}
