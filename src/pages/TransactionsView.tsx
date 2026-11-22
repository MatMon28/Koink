import { useMemo, useState } from 'react';
import { Columns2, List, Repeat, Search, SlidersHorizontal, StickyNote, Trash2, X } from 'lucide-react';
import { categoryMeta } from '../lib/categories';
import { formatDay, formatMonth, monthOf } from '../lib/dates';
import { formatMoney, round2 } from '../lib/format';
import { KeyIcon, textInput } from '../components/ui';
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
/**
 * One long list with day headings inside one card per month ('list'), or two day cards next to each other,
 * two columns on every screen ('pair'). Months are always told apart by a heading.
 */
type View = 'list' | 'pair';
const VIEWS: { id: View; label: string; icon: typeof List; hint: string }[] = [
  { id: 'list', label: 'List', icon: List, hint: 'One list, newest first' },
  { id: 'pair', label: '2 days', icon: Columns2, hint: 'Two days next to each other' },
];
const PAGE = 14;

/** The extra filters behind the filter button. Empty = no restriction. */
interface Extra {
  /** `kind|categoryId` keys. */
  cats: string[];
  accounts: string[];
  from: string;
  to: string;
  min: string;
  max: string;
}
const NO_EXTRA: Extra = { cats: [], accounts: [], from: '', to: '', min: '', max: '' };
const catKey = (tx: Tx) => `${tx.kind}|${tx.categoryId}`;
const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

interface Group {
  date: string;
  items: Tx[];
  net: number;
}

/** The day groups of one month (the ones shown so far) and the month's figures over all matching entries. */
interface MonthBlock {
  month: string;
  groups: Group[];
  net: number;
  count: number;
}

/**
 * One entry: tap the text to edit it, tap the bin to delete it (an Undo shows at the bottom). The category
 * comes first and the title sits right below it. `narrow` is the row inside a two-column day card: no
 * icon, the amount under the text, so everything fits half a phone screen.
 */
function EntryRow({ tx, narrow = false }: { tx: Tx; narrow?: boolean }) {
  const { data, basic, money, openSheet, removeTx } = useApp();
  const meta = categoryMeta(tx.kind, tx.categoryId, data.goals);
  const Icon = meta.icon;
  // Basic mode has one account and never names it.
  const account = tx.accountId && !basic ? data.accounts.find((a) => a.id === tx.accountId) : undefined;
  const amount = money(tx.amount, { cents: true });
  const title = tx.note || meta.name;
  const noteMark = tx.details ? <StickyNote size={11} strokeWidth={2.4} className="shrink-0 text-[var(--muted)]" aria-label={t('Has a note')} /> : null;
  const amountText = tx.kind === 'income' ? `+${amount}` : tx.kind === 'expense' ? `-${amount}` : amount;
  const amountTone = tx.kind === 'income' ? 'text-[var(--intake-on-surface)]' : tx.kind === 'saving' ? 'text-[var(--weight-on-surface)]' : 'text-[var(--text)]';
  const foreign = tx.foreign ? formatMoney(tx.foreign.amount, tx.foreign.currency, { cents: true }) : null;
  return (
    <div className="flex items-center rounded-2xl hover:bg-[var(--inset)] transition-colors">
      <button
        type="button"
        onClick={() => openSheet({ type: 'tx', kind: tx.kind, editId: tx.id })}
        className={`pressable pressable-soft min-w-0 flex-1 flex rounded-2xl text-left ${narrow ? 'flex-col items-start gap-0.5 pl-2.5 pr-1 py-2' : 'items-center gap-2.5 pl-2.5 pr-1 py-2'}`}
      >
        {!narrow && (
          <span className="kc-meal-icon size-9 rounded-full flex items-center justify-center shrink-0 text-[var(--text)]">
            <Icon size={16} strokeWidth={2.2} />
          </span>
        )}
        <span className="min-w-0 w-full flex-1">
          {/* 1. the category */}
          <span className="text-xs sm:text-sm font-bold text-[var(--text)] truncate flex items-center gap-1">
            {tx.recurringId && <Repeat size={10} strokeWidth={2.6} aria-label={t('Recurring')} className="shrink-0 text-[var(--muted)]" />}
            <span className="truncate">{meta.name}</span>
            {!tx.note && noteMark}
          </span>
          {/* 2. the title, below the category */}
          {tx.note && (
            <span className="text-[11px] sm:text-xs font-semibold text-[var(--text)]/80 truncate flex items-center gap-1 min-w-0">
              <span className="truncate">{tx.note}</span>
              {noteMark}
            </span>
          )}
          {account && (
            <span className="um-hide text-[11px] font-medium text-[var(--muted)] flex items-center gap-1 min-w-0">
              <KeyIcon name={account.icon} size={10} strokeWidth={2.6} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{account.name}</span>
            </span>
          )}
          {tx.details && <span className="um-hide block truncate text-[11px] italic text-[var(--muted)]/90">{tx.details}</span>}
        </span>
        <span className={narrow ? 'tabular-nums' : 'shrink-0 text-right tabular-nums'}>
          <span className={`block text-xs sm:text-sm font-extrabold ${amountTone}`}>{amountText}</span>
          {foreign && <span className="um-hide block text-[10px] font-bold text-[var(--muted)]">{foreign}</span>}
        </span>
      </button>
      <button
        type="button"
        onClick={() => removeTx(tx.id)}
        className={`pressable shrink-0 rounded-full text-[var(--muted)] hover:text-[#8C2D32] hover:bg-[#F6D0D0] flex items-center justify-center ${narrow ? 'mr-0.5 size-8' : 'mr-1 size-9'}`}
        title={t('Delete')}
        aria-label={t('Delete {title}', { title })}
      >
        <Trash2 size={narrow ? 14 : 15} />
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

/**
 * The divider between two months: the month name with the month's entry count and net. `band` is the tinted
 * strip at the top of a month card (list view); without it, a line with the name (two-column view).
 */
function MonthHeading({ block, band }: { block: MonthBlock; band: boolean }) {
  const label = `${block.count} ${block.count === 1 ? t('entry') : t('entries')}`;
  return band ? (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-[var(--inset)] border-b border-[var(--border)]">
      <h2 className="min-w-0 truncate text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
        {formatMonth(block.month)} <span className="ml-1 normal-case tracking-normal font-bold text-[var(--muted)]">· {label}</span>
      </h2>
      <DayNet net={block.net} />
    </div>
  ) : (
    <div className="flex items-center gap-2.5 px-1 pt-1">
      <h2 className="shrink-0 text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">{formatMonth(block.month)}</h2>
      <span className="h-px min-w-4 flex-1 bg-[var(--border)]" aria-hidden="true" />
      <span className="shrink-0 text-[11px] font-bold text-[var(--muted)]">{label}</span>
      <DayNet net={block.net} />
    </div>
  );
}

export function TransactionsView() {
  const { data, basic, txs, money } = useApp();
  const [query, setQuery] = useState('');
  const [storedFilter, setFilter] = usePersistentState<Filter>('koink_tx_filter', 'all');
  // Basic mode has no Savings chip: a Savings filter chosen in Full mode counts as All.
  const filter: Filter = basic && storedFilter === 'saving' ? 'all' : storedFilter;
  const [storedView, setView] = usePersistentState<string>('koink_tx_view', 'list');
  const view: View = storedView === 'pair' ? 'pair' : 'list'; // the removed 'days' layout falls back to the list
  const [limit, setLimit] = useState(PAGE);
  const [panelOpen, setPanelOpen] = usePersistentState('koink_tx_filter_open', false);
  const [extra, setExtra] = useState<Extra>(NO_EXTRA);
  const q = query.trim().toLowerCase();
  const minAmount = parseFloat(extra.min.replace(',', '.'));
  const maxAmount = parseFloat(extra.max.replace(',', '.'));
  // How many of the extra filters are on (shown on the filter button).
  const activeExtra = [extra.cats.length > 0, extra.accounts.length > 0, !!extra.from || !!extra.to, !Number.isNaN(minAmount) || !Number.isNaN(maxAmount)].filter(Boolean).length;
  const patch = (next: Partial<Extra>) => {
    setExtra((prev) => ({ ...prev, ...next }));
    setLimit(PAGE);
  };

  // Categories offered in the panel: only the ones that carry entries of the kind being shown.
  const catOptions = useMemo(() => {
    const seen = new Map<string, { key: string; kind: Kind; name: string; icon: typeof List }>();
    for (const tx of txs) {
      if (filter !== 'all' && tx.kind !== filter) continue;
      const key = catKey(tx);
      if (seen.has(key)) continue;
      const meta = categoryMeta(tx.kind, tx.categoryId, data.goals);
      seen.set(key, { key, kind: tx.kind, name: meta.name, icon: meta.icon });
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
    // data.categories: names come from the category list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txs, data.goals, data.categories, filter]);

  const filtered = useMemo(() => txs.filter((tx) => {
    if (filter !== 'all' && tx.kind !== filter) return false;
    if (extra.cats.length > 0 && !extra.cats.includes(catKey(tx))) return false;
    if (extra.accounts.length > 0 && !extra.accounts.includes(tx.accountId ?? '_none')) return false;
    if (extra.from && tx.date < extra.from) return false;
    if (extra.to && tx.date > extra.to) return false;
    if (!Number.isNaN(minAmount) && tx.amount < minAmount) return false;
    if (!Number.isNaN(maxAmount) && tx.amount > maxAmount) return false;
    if (!q) return true;
    const account = tx.accountId && !basic ? data.accounts.find((a) => a.id === tx.accountId)?.name ?? '' : '';
    return (
      tx.note.toLowerCase().includes(q) ||
      (tx.details ?? '').toLowerCase().includes(q) ||
      account.toLowerCase().includes(q) ||
      categoryMeta(tx.kind, tx.categoryId, data.goals).name.toLowerCase().includes(q) ||
      tx.amount.toFixed(2).includes(q)
    );
    // data.categories: the names searched come from the category list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [txs, basic, data.goals, data.accounts, data.categories, filter, q, extra, minAmount, maxAmount]);

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

  // Day groups shown so far, collected per month (newest first) with the month's figures over everything that matches.
  const months = useMemo(() => {
    const out: MonthBlock[] = [];
    const byMonth = new Map<string, MonthBlock>();
    for (const group of groups) {
      const month = monthOf(group.date);
      let block = byMonth.get(month);
      if (!block) {
        block = { month, groups: [], net: 0, count: 0 };
        byMonth.set(month, block);
      }
      block.net += group.net;
      block.count += group.items.length;
    }
    for (const group of groups.slice(0, limit)) {
      const block = byMonth.get(monthOf(group.date));
      if (!block) continue;
      if (block.groups.length === 0) out.push(block);
      block.groups.push(group);
    }
    return out;
  }, [groups, limit]);
  const more = () => setLimit((n) => n + PAGE);

  return (
    <div className="um-stack space-y-3.5">
      {/* Kind filter: above the search bar */}
      <div className="flex justify-center">
        <div role="group" aria-label={t('Show')} className="inline-flex w-fit max-w-full items-center justify-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full">
          {FILTERS.filter((item) => !basic || item.id !== 'saving').map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={filter === item.id}
              onClick={() => {
                setFilter(item.id);
                setExtra((prev) => ({ ...prev, cats: [] })); // the category list changes with the kind
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
      </div>

      {/* Search bar with the filter button next to it */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
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
        <button
          type="button"
          onClick={() => setPanelOpen(!panelOpen)}
          aria-expanded={panelOpen}
          aria-label={t('Filters')}
          title={t('Filters')}
          className={`pressable relative size-11 shrink-0 rounded-full border flex items-center justify-center ${
            panelOpen || activeExtra > 0
              ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
              : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text)] hover:bg-[var(--inset)]'
          }`}
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          {activeExtra > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-[#F6D0D0] text-[#7A2727] text-[10px] font-extrabold flex items-center justify-center tabular-nums">{activeExtra}</span>
          )}
        </button>
      </div>

      {/* Filter panel: category, account, dates, amounts */}
      <div className="accordion-grid" data-open={panelOpen} inert={!panelOpen}>
        <div className="accordion-inner">
          <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-[var(--text)]">{t('Filters')}</h3>
              <button
                type="button"
                onClick={() => {
                  setExtra(NO_EXTRA);
                  setLimit(PAGE);
                }}
                disabled={activeExtra === 0}
                className="pressable px-2.5 py-1 rounded-lg text-[11px] font-extrabold border bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)] disabled:opacity-40"
              >
                {t('Clear filters')}
              </button>
            </div>

            {catOptions.length > 0 && (
              <div>
                <span className="block mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Category')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {catOptions.map((option) => {
                    const Icon = option.icon;
                    const on = extra.cats.includes(option.key);
                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => patch({ cats: toggle(extra.cats, option.key) })}
                        className={`pressable inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-extrabold border ${
                          on ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]' : 'bg-[var(--inset)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--hover)]'
                        }`}
                      >
                        <Icon size={12} strokeWidth={2.4} aria-hidden="true" />
                        {option.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {data.accounts.length > 0 && !basic && (
              <div>
                <span className="block mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Account')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {[...data.accounts.map((a) => ({ id: a.id, name: a.name, icon: a.icon })), { id: '_none', name: t('No account'), icon: '' }].map((account) => {
                    const on = extra.accounts.includes(account.id);
                    return (
                      <button
                        key={account.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => patch({ accounts: toggle(extra.accounts, account.id) })}
                        className={`pressable inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-extrabold border ${
                          on ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]' : 'bg-[var(--inset)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--hover)]'
                        }`}
                      >
                        {account.icon && <KeyIcon name={account.icon} size={12} strokeWidth={2.4} aria-hidden="true" />}
                        {account.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <label className="block min-w-0">
                <span className="block mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('From')}</span>
                <input type="date" value={extra.from} max={extra.to || undefined} onChange={(event) => patch({ from: event.target.value })} className={`${textInput} text-sm`} />
              </label>
              <label className="block min-w-0">
                <span className="block mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('To')}</span>
                <input type="date" value={extra.to} min={extra.from || undefined} onChange={(event) => patch({ to: event.target.value })} className={`${textInput} text-sm`} />
              </label>
              <label className="block min-w-0">
                <span className="block mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Amount from')}</span>
                <input type="number" inputMode="decimal" min={0} value={extra.min} onChange={(event) => patch({ min: event.target.value })} placeholder="0" className={`${textInput} text-sm`} />
              </label>
              <label className="block min-w-0">
                <span className="block mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Amount to')}</span>
                <input type="number" inputMode="decimal" min={0} value={extra.max} onChange={(event) => patch({ max: event.target.value })} placeholder="∞" className={`${textInput} text-sm`} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Entries recap, with the layout switch (icons only) at its right end */}
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="min-w-0 text-xs font-bold tabular-nums text-[var(--muted)]" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? t('entry') : t('entries')}
          {sums.in > 0 && <> {t('· in')} {money(sums.in)}</>}
          {sums.out > 0 && <> {t('· out')} {money(sums.out)}</>}
        </p>
        <div role="group" aria-label={t('Layout')} className="um-hide inline-flex shrink-0 items-center gap-0.5 p-0.5 bg-[var(--surface)] border border-[var(--border)] rounded-full">
          {VIEWS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={view === item.id}
                aria-label={t(item.label)}
                onClick={() => setView(item.id)}
                title={t(item.hint)}
                className={`pressable inline-flex size-7 items-center justify-center rounded-full ${
                  view === item.id
                    ? 'bg-[var(--text)] text-[var(--on-text)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]'
                }`}
              >
                <Icon size={14} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl px-5 py-8 text-center">
          <p className="text-sm font-extrabold text-[var(--text)]">{txs.length === 0 ? t('No entries yet') : t('Nothing matches')}</p>
          <p className="kc-section-empty mt-1 text-xs font-medium text-[var(--muted)]">
            {txs.length === 0 ? t('Use the buttons at the bottom to log your first expense or income.') : t('Try another word, or show all kinds of entries.')}
          </p>
          {txs.length > 0 && (query || filter !== 'all' || activeExtra > 0) && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setFilter('all');
                setExtra(NO_EXTRA);
              }}
              className="pressable mt-4 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] px-4 py-2 text-xs font-extrabold text-[var(--text)]"
            >
              {t('Show everything')}
            </button>
          )}
        </div>
      ) : view === 'list' ? (
        // One card per month, so two months are never mixed: a tinted month heading, then the days.
        <div className="space-y-4">
          {months.map((block) => (
            <section key={block.month} aria-label={formatMonth(block.month)} className="kc-themed-card bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden pb-1.5">
              <MonthHeading block={block} band />
              {block.groups.map((group) => (
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
          ))}
        </div>
      ) : (
        // Two days next to each other, on every screen size: newest on the left, the day before on the right.
        // Every month starts a new grid under its own heading, so the pairs never straddle two months.
        <div className="space-y-3">
          {months.map((block) => (
            <section key={block.month} aria-label={formatMonth(block.month)} className="space-y-2">
              <MonthHeading block={block} band={false} />
              <div className="grid grid-cols-2 items-start gap-2 sm:gap-3">
                {block.groups.map((group) => (
                  <section key={group.date} className="kc-themed-card min-w-0 bg-[var(--surface)] border border-[var(--border)] rounded-3xl overflow-hidden">
                    <div className="px-3 pt-3 pb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                      <h3 className="min-w-0 truncate text-xs sm:text-sm font-extrabold text-[var(--text)]">{formatDay(group.date)}</h3>
                      <DayNet net={group.net} />
                    </div>
                    <div className="px-1 pb-1.5">
                      {group.items.map((tx) => <EntryRow key={tx.id} tx={tx} narrow />)}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {groups.length > limit && (
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
