import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Columns3, List, Repeat, Search, StickyNote, Trash2, X } from 'lucide-react';
import { categoryMeta } from '../lib/categories';
import { formatDay } from '../lib/dates';
import { formatMoney, round2 } from '../lib/format';
import { KeyIcon } from '../components/ui';
import { useApp } from '../lib/store';
import type { Kind, Tx } from '../lib/types';
import { usePersistentState } from '../lib/usePersistentState';
import { t } from '../lib/i18n';

type Filter = 'all' | Kind;
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'expense', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'saving', label: 'Savings' },
];
/** One long list with day headings, or one card per day side by side. */
type View = 'list' | 'days';
const VIEWS: { id: View; label: string; icon: typeof List }[] = [
  { id: 'list', label: 'List', icon: List },
  { id: 'days', label: 'Days', icon: Columns3 },
];
const PAGE = 14;

interface Group {
  date: string;
  items: Tx[];
  net: number;
}

/** One entry: tap the text to edit it, tap the bin to delete it (an Undo shows at the bottom). */
function EntryRow({ tx }: { tx: Tx }) {
  const { data, money, openSheet, removeTx } = useApp();
  const meta = categoryMeta(tx.kind, tx.categoryId, data.goals);
  const Icon = meta.icon;
  const account = tx.accountId ? data.accounts.find((a) => a.id === tx.accountId) : undefined;
  const amount = money(tx.amount, { cents: true });
  const title = tx.note || meta.name;
  return (
    <div className="flex items-center rounded-2xl hover:bg-[var(--inset)] transition-colors">
      <button
        type="button"
        onClick={() => openSheet({ type: 'tx', kind: tx.kind, editId: tx.id })}
        className="pressable pressable-soft min-w-0 flex-1 flex items-center gap-2.5 rounded-2xl pl-2.5 pr-1 py-2 text-left"
      >
        <span className="kc-meal-icon size-9 rounded-full flex items-center justify-center shrink-0 text-[var(--text)]">
          <Icon size={16} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate flex items-center gap-1">
            <span className="truncate">{t(title)}</span>
            {tx.details && <StickyNote size={11} strokeWidth={2.4} className="shrink-0 text-[var(--muted)]" aria-label={t('Has a note')} />}
          </span>
          <span className="um-hide text-[11px] font-medium text-[var(--muted)] flex items-center gap-1 min-w-0">
            {tx.recurringId && <Repeat size={10} strokeWidth={2.6} aria-label={t('Recurring')} className="shrink-0" />}
            <span className="truncate">{meta.name}</span>
            {account && (
              <>
                <span aria-hidden="true">·</span>
                <KeyIcon name={account.icon} size={10} strokeWidth={2.6} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{account.name}</span>
              </>
            )}
          </span>
          {tx.details && <span className="um-hide block truncate text-[11px] italic text-[var(--muted)]/90">{tx.details}</span>}
        </span>
        <span className="shrink-0 text-right tabular-nums">
          <span
            className={`block text-xs sm:text-sm font-extrabold ${
              tx.kind === 'income' ? 'text-[var(--intake-on-surface)]' : tx.kind === 'saving' ? 'text-[var(--weight-on-surface)]' : 'text-[var(--text)]'
            }`}
          >
            {tx.kind === 'income' ? `+${amount}` : tx.kind === 'expense' ? `-${amount}` : amount}
          </span>
          {tx.foreign && (
            <span className="um-hide block text-[10px] font-bold text-[var(--muted)]">{formatMoney(tx.foreign.amount, tx.foreign.currency, { cents: true })}</span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={() => removeTx(tx.id)}
        className="pressable mr-1 size-9 shrink-0 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center"
        title={t('Delete')}
        aria-label={t('Delete {title}', { title })}
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function DayNet({ net }: { net: number }) {
  const { money } = useApp();
  if (Math.abs(net) < 0.005) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold tabular-nums ${net > 0 ? 'bg-intake text-intake-ink' : 'bg-activity text-activity-ink'}`}>
      {money(net, { cents: true, sign: true })}
    </span>
  );
}

export function TransactionsView() {
  const { data, money } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = usePersistentState<Filter>('koink_tx_filter', 'all');
  const [view, setView] = usePersistentState<View>('koink_tx_view', 'list');
  const [limit, setLimit] = useState(PAGE);
  const rail = useRef<HTMLDivElement>(null);
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => data.txs.filter((tx) => {
    if (filter !== 'all' && tx.kind !== filter) return false;
    if (!q) return true;
    const account = tx.accountId ? data.accounts.find((a) => a.id === tx.accountId)?.name ?? '' : '';
    return (
      tx.note.toLowerCase().includes(q) ||
      (tx.details ?? '').toLowerCase().includes(q) ||
      account.toLowerCase().includes(q) ||
      categoryMeta(tx.kind, tx.categoryId, data.goals).name.toLowerCase().includes(q) ||
      tx.amount.toFixed(2).includes(q)
    );
    // data.categories: the names searched come from the category list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data.txs, data.goals, data.accounts, data.categories, filter, q]);

  const groups = useMemo(() => {
    const out: Group[] = [];
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
  const more = () => setLimit((n) => n + PAGE);

  /** Days view on a computer: the arrows move the rail by about one card. */
  const nudge = (direction: 1 | -1) => {
    const el = rail.current;
    if (el) el.scrollBy({ left: direction * Math.max(280, el.clientWidth * 0.8), behavior: 'smooth' });
  };

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
          placeholder={t('Search titles, notes, categories, amounts')}
          aria-label={t('Search entries')}
          enterKeyHint="search"
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-full pl-11 pr-11 py-2.5 text-sm font-bold text-[var(--text)] placeholder:text-[var(--muted)]/70 placeholder:font-medium focus:outline-none focus:border-[var(--muted)] transition-colors [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t('Clear search')}
            className="pressable absolute right-1.5 top-1/2 -translate-y-1/2 size-8 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)] flex items-center justify-center"
          >
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <div role="group" aria-label={t('Show')} className="inline-flex w-fit max-w-full items-center justify-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full">
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
              {t(item.label)}
            </button>
          ))}
        </div>
        <div role="group" aria-label={t('Layout')} className="um-hide inline-flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full">
          {VIEWS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={view === item.id}
                onClick={() => setView(item.id)}
                title={item.id === 'list' ? t('One list, newest first') : t('Each day in its own card, side by side')}
                className={`pressable inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap ${
                  view === item.id
                    ? 'bg-[var(--text)] text-[var(--on-text)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]'
                }`}
              >
                <Icon size={14} aria-hidden="true" />
                {t(item.label)}
              </button>
            );
          })}
        </div>
      </div>

      <p className="px-1 text-center text-xs font-bold tabular-nums text-[var(--muted)]" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? t('entry') : t('entries')}
        {sums.in > 0 && <> {t('· in')} {money(sums.in)}</>}
        {sums.out > 0 && <> {t('· out')} {money(sums.out)}</>}
      </p>

      {groups.length === 0 ? (
        <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl px-5 py-8 text-center">
          <p className="text-sm font-extrabold text-[var(--text)]">{data.txs.length === 0 ? t('No entries yet') : t('Nothing matches')}</p>
          <p className="kc-section-empty mt-1 text-xs font-medium text-[var(--muted)]">
            {data.txs.length === 0 ? t('Use the buttons at the bottom to log your first expense or income.') : t('Try another word, or show all kinds of entries.')}
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
              {t('Show everything')}
            </button>
          )}
        </div>
      ) : view === 'list' ? (
        <section className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden pb-1.5">
          {visible.map((group) => (
            <div key={group.date}>
              <div className="px-4 pt-3.5 pb-1.5 flex items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-[var(--text)]">{formatDay(group.date)}</h3>
                <DayNet net={group.net} />
              </div>
              <div className="px-1.5">
                {group.items.map((tx) => <EntryRow key={tx.id} tx={tx} />)}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <div className="relative">
          {/* Days side by side. A sideways scroller: on a phone one card (and a peek of the next) fits, swipe to move; the page swipe leaves it alone. */}
          <div
            ref={rail}
            data-no-swipe
            tabIndex={0}
            aria-label={t('Days, side by side. Scroll sideways.')}
            className="no-scrollbar -mx-3.5 sm:-mx-6 px-3.5 sm:px-6 flex items-start gap-3 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scroll-px-3.5 sm:scroll-px-6 pb-1 focus:outline-none"
          >
            {visible.map((group) => (
              <section
                key={group.date}
                className="kc-themed-card snap-start shrink-0 w-[85%] min-[480px]:w-[22rem] bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden"
              >
                <div className="px-4 pt-3.5 pb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-[var(--text)] truncate">{formatDay(group.date)}</h3>
                  <DayNet net={group.net} />
                </div>
                <div className="px-1.5 pb-1.5">
                  {group.items.map((tx) => <EntryRow key={tx.id} tx={tx} />)}
                </div>
              </section>
            ))}
            {groups.length > limit && (
              <div className="snap-start shrink-0 w-40 self-stretch flex items-center justify-center pr-3.5">
                <button
                  type="button"
                  onClick={more}
                  className="pressable rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] px-4 py-2 text-xs font-extrabold text-[var(--text)]"
                >
                  {t('Older days')}
                </button>
              </div>
            )}
          </div>
          {visible.length > 1 && (
            <div className="hidden md:flex items-center justify-center gap-2 mt-2.5">
              <button type="button" onClick={() => nudge(-1)} aria-label={t('Scroll to newer days')} className="pressable size-9 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center">
                <ChevronLeft size={17} />
              </button>
              <button type="button" onClick={() => nudge(1)} aria-label={t('Scroll to older days')} className="pressable size-9 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center">
                <ChevronRight size={17} />
              </button>
            </div>
          )}
        </div>
      )}

      {view === 'list' && groups.length > limit && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={more}
            className="pressable rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] px-4 py-2 text-xs font-extrabold text-[var(--text)]"
          >
            {t('Show older days')}
          </button>
        </div>
      )}
    </div>
  );
}
