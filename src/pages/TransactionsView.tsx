import { useMemo, useState } from 'react';
import { Repeat, Search, X } from 'lucide-react';
import { categoryMeta } from '../lib/categories';
import { formatDay } from '../lib/dates';
import { round2 } from '../lib/format';
import { useApp } from '../lib/store';
import type { Kind, Tx } from '../lib/types';
import { usePersistentState } from '../lib/usePersistentState';

type Filter = 'all' | Kind;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'saving', label: 'Savings' },
];
const PAGE = 14;

export function TransactionsView() {
  const { data, money, openSheet } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = usePersistentState<Filter>('koink_tx_filter', 'all');
  const [limit, setLimit] = useState(PAGE);
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => data.txs.filter((tx) => {
    if (filter !== 'all' && tx.kind !== filter) return false;
    if (!q) return true;
    return (
      tx.note.toLowerCase().includes(q) ||
      categoryMeta(tx.kind, tx.categoryId, data.goals).name.toLowerCase().includes(q) ||
      tx.amount.toFixed(2).includes(q)
    );
  }), [data.txs, data.goals, filter, q]);

  const groups = useMemo(() => {
    const out: { date: string; items: Tx[]; net: number }[] = [];
    for (const tx of filtered) {
      let group = out[out.length - 1];
      if (!group || group.date !== tx.date) {
        group = { date: tx.date, items: [], net: 0 };
        out.push(group);
      }
      group.items.push(tx);
      if (tx.kind === 'income') group.net += tx.amount;
      else if (tx.kind === 'expense') group.net -= tx.amount;
    }
    return out;
  }, [filtered]);

  const sums = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    for (const tx of filtered) {
      if (tx.kind === 'income') inSum += tx.amount;
      else if (tx.kind === 'expense') outSum += tx.amount;
    }
    return { in: round2(inSum), out: round2(outSum) };
  }, [filtered]);

  const visible = groups.slice(0, limit);

  return (
    <div className="um-stack space-y-3.5">
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setLimit(PAGE);
          }}
          placeholder="Search notes, categories, amounts"
          aria-label="Search entries"
          enterKeyHint="search"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-full pl-11 pr-11 py-2.5 text-sm font-bold text-[var(--text)] placeholder:text-[var(--muted)]/70 placeholder:font-medium focus:outline-none focus:border-[var(--muted)] transition-colors [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="pressable absolute right-1.5 top-1/2 -translate-y-1/2 size-8 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)] flex items-center justify-center"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex justify-center">
        <div role="group" aria-label="Show" className="inline-flex w-fit max-w-full items-center justify-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => {
                setFilter(item.id);
                setLimit(PAGE);
              }}
              className={`pressable px-3.5 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap ${
                filter === item.id
                  ? 'bg-[var(--text)] text-[var(--on-text)]'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <p className="px-1 text-center text-xs font-bold tabular-nums text-[var(--muted)]" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        {sums.in > 0 && <> · in {money(sums.in)}</>}
        {sums.out > 0 && <> · out {money(sums.out)}</>}
      </p>

      {groups.length === 0 ? (
        <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl px-5 py-8 text-center">
          <p className="text-sm font-extrabold text-[var(--text)]">{data.txs.length === 0 ? 'No entries yet' : 'Nothing matches'}</p>
          <p className="kc-section-empty mt-1 text-xs font-medium text-[var(--muted)]">
            {data.txs.length === 0 ? 'Use the buttons at the bottom to log your first expense or income.' : 'Try another word, or show all kinds of entries.'}
          </p>
          {data.txs.length > 0 && (query || filter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setFilter('all');
              }}
              className="pressable mt-4 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] px-4 py-2 text-xs font-extrabold text-[var(--text)]"
            >
              Show everything
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
          {visible.map((group) => (
            <section key={group.date} className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden">
              <div className="px-4 pt-3.5 pb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-[var(--text)]">{formatDay(group.date)}</h3>
                {Math.abs(group.net) >= 0.005 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold tabular-nums ${group.net > 0 ? 'bg-intake text-intake-ink' : 'bg-activity text-activity-ink'}`}>
                    {money(group.net, { cents: true, sign: true })}
                  </span>
                )}
              </div>
              <div className="px-1.5 pb-1.5">
                {group.items.map((tx) => {
                  const meta = categoryMeta(tx.kind, tx.categoryId, data.goals);
                  const Icon = meta.icon;
                  const amount = money(tx.amount, { cents: true });
                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => openSheet({ type: 'tx', kind: tx.kind, editId: tx.id })}
                      className="pressable pressable-soft w-full flex items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left hover:bg-[var(--inset)]"
                    >
                      <span className="kc-meal-icon size-9 rounded-full flex items-center justify-center shrink-0 text-[var(--text)]">
                        <Icon size={16} strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate block">{tx.note || meta.name}</span>
                        <span className="um-hide text-[11px] font-medium text-[var(--muted)] flex items-center gap-1">
                          {tx.recurringId && <Repeat size={10} strokeWidth={2.6} aria-label="Recurring" />}
                          <span className="truncate">{meta.name}</span>
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-xs sm:text-sm font-extrabold tabular-nums ${
                          tx.kind === 'income'
                            ? 'text-[var(--intake-on-surface)]'
                            : tx.kind === 'saving'
                              ? 'text-[var(--weight-on-surface)]'
                              : 'text-[var(--text)]'
                        }`}
                      >
                        {tx.kind === 'income' ? `+${amount}` : tx.kind === 'expense' ? `-${amount}` : amount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {groups.length > limit && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setLimit((n) => n + PAGE)}
            className="pressable rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] px-4 py-2 text-xs font-extrabold text-[var(--text)]"
          >
            Show older days
          </button>
        </div>
      )}
    </div>
  );
}
