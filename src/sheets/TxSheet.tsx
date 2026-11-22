import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ChevronDown, Gift, Plus, RefreshCw } from 'lucide-react';
import { PigIcon } from '../lib/pig';
import { Modal } from '../components/Modal';
import { AmountDisplay, NumPad, SaveBeforeCloseDialog, SectionLabel, textInput, useAmountBuffer } from '../components/ui';
import { accountBalance, goalSaved } from '../lib/calc';
import { allExpenseCategories, categoryMeta, INCOME_SOURCES, isCategoryHidden, visibleExpenseCategories } from '../lib/categories';
import { addDays, defaultDateFor, formatDay, formatMonth, monthOf, todayStr } from '../lib/dates';
import { giftCardBalance, giftCardCover, giftCardExpired } from '../lib/giftcards';
import { currencyDecimals, currencySymbol, formatRate, percent, round2 } from '../lib/format';
import { iconFor } from '../lib/icons';
import { useApp, useSheet } from '../lib/store';
import type { Bucket, Kind, Sheet } from '../lib/types';
import { Banner, BucketPicker, ChoiceGrid, CurrencyGrid, IconPicker, SaveRow, type Choice } from './shared';
import { t } from '../lib/i18n';
import { TitleField } from './TitleField';

const TITLES: Record<Kind, { add: string; edit: string; save: string }> = {
  expense: { add: 'Add expense', edit: 'Edit expense', save: 'Add expense' },
  income: { add: 'Add income', edit: 'Edit income', save: 'Add income' },
  saving: { add: 'Move to savings', edit: 'Edit savings entry', save: 'Move to savings' },
};

const CONFIRM_TONE: Record<Kind, string> = {
  expense: 'bg-activity text-activity-ink',
  income: 'bg-intake text-intake-ink',
  saving: 'bg-weight text-weight-ink',
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
        // A swipe down on a form with unsaved input asks first instead of flying away.
        canClose={() => !guardRef.current?.dirty}
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

/** Position of each category in the order it was last used (0 = most recent), for one kind of entry. */
function recencyRank(txs: { kind: Kind; categoryId: string }[], kind: Kind): Map<string, number> {
  const rank = new Map<string, number>();
  for (const tx of txs) if (tx.kind === kind && !rank.has(tx.categoryId)) rank.set(tx.categoryId, rank.size);
  return rank;
}

/** The form has three screens: the amount on a number pad, the other details, and a few small side trips. */
type Step = 'amount' | 'rate' | 'details' | 'category';

function TxForm({ sheet, guardRef }: { sheet: Extract<Sheet, { type: 'tx' }>; guardRef: RefObject<FormGuard | null> }) {
  const { data, basic, selectedMonth, money, currency: mainCurrency, rateFor, addTx, updateTx, removeTx, saveCategory, closeSheet, openSheet } = useApp();
  // The entry as it was when the sheet opened; the form no longer depends on the ledger after that.
  const [original] = useState(() => (sheet.editId ? data.txs.find((tx) => tx.id === sheet.editId) : undefined));
  const kind = original?.kind ?? sheet.kind;

  // Added in this sheet: a category made on the spot is offered at once, ahead of the list.
  const [fresh, setFresh] = useState<Choice[]>([]);
  const choices: Choice[] = useMemo(() => {
    // Most recently used first (the ledger is sorted newest first); never used ones keep their usual order after.
    const rank = recencyRank(data.txs, kind);
    const byRecent = (list: Choice[]) => list.map((choice, index) => ({ choice, index })).sort((a, b) => (rank.get(a.choice.id) ?? Infinity) - (rank.get(b.choice.id) ?? Infinity) || a.index - b.index).map((x) => x.choice);
    if (kind === 'expense') {
      const notFresh = (c: { id: string }) => !fresh.some((f) => f.id === c.id);
      const list: Choice[] = byRecent(visibleExpenseCategories().filter(notFresh));
      // Hidden categories can still be picked here: they come after the visible ones (the most recently used first).
      list.push(...byRecent(allExpenseCategories().filter((c) => isCategoryHidden(c.id) && notFresh(c))));
      // An entry in a category that was hidden since keeps showing it, so editing never loses it.
      if (original && !list.some((c) => c.id === original.categoryId) && isCategoryHidden(original.categoryId)) {
        const hidden = categoryMeta('expense', original.categoryId, data.goals);
        list.push({ id: original.categoryId, name: hidden.name, icon: hidden.icon });
      }
      return [...[...fresh].reverse(), ...list];
    }
    if (kind === 'income') return byRecent(INCOME_SOURCES);
    return byRecent(data.goals.map((goal) => ({ id: goal.id, name: goal.name, icon: PigIcon })));
  }, [kind, data.txs, data.goals, original, fresh]);

  // A new entry starts on the category used last for this kind of entry.
  // Did the user (or the button that opened the sheet) pick the category? Only then do the title suggestions narrow to it.
  const [categoryChosen, setCategoryChosen] = useState(Boolean(original || sheet.categoryId));
  const [categoryId, setCategoryIdState] = useState(() => {
    if (original) return original.categoryId;
    if (sheet.categoryId) return sheet.categoryId;
    const last = data.txs.find((tx) => tx.kind === kind && !tx.recurringId && choices.some((c) => c.id === tx.categoryId));
    return last?.categoryId ?? choices[0]?.id ?? '';
  });
  const setCategoryId = (id: string) => {
    setCategoryIdState(id);
    setCategoryChosen(true);
  };

  // The amount as it was paid, in `currency`; `rate` turns one unit of it into the journal's currency.
  const [currency, setCurrency] = useState(original?.foreign?.currency ?? mainCurrency);
  const [rate, setRate] = useState(original?.foreign?.rate ?? 1);
  const [amount, setAmount] = useState(original?.foreign?.amount ?? original?.amount ?? 0);
  const [title, setTitle] = useState(original?.note ?? '');
  const [details, setDetails] = useState(original?.details ?? '');
  const [date, setDate] = useState(original?.date ?? defaultDateFor(selectedMonth));
  const [accountId, setAccountId] = useState(() => {
    if (original) return original.accountId ?? '';
    const last = data.txs.find((tx) => tx.accountId && data.accounts.some((a) => a.id === tx.accountId));
    return last?.accountId ?? data.accounts[0]?.id ?? '';
  });
  // Gift card that pays (part of) an expense; '' = none. Only offered for expenses.
  const [giftCardId, setGiftCardId] = useState(() => original?.giftCard?.id ?? (kind === 'expense' ? sheet.giftCardId ?? '' : ''));
  const [step, setStep] = useState<Step>(original ? 'details' : 'amount');
  const [pickingCurrency, setPickingCurrency] = useState(false);

  const foreign = currency !== mainCurrency;
  const converted = round2(amount * (foreign ? rate : 1));
  const meta = categoryMeta(kind, categoryId, data.goals);
  const month = monthOf(date);
  const today = todayStr();
  const yesterday = addDays(today, -1);

  // What the month (or the goal) looks like with this entry counted in.
  const banner = useMemo(() => {
    const others = data.txs.filter((tx) => tx.id !== original?.id && tx.kind === kind);
    if (kind === 'saving') {
      const goal = data.goals.find((g) => g.id === categoryId);
      const saved = round2((goal ? goalSaved(others, goal) : 0) + converted);
      return {
        label: goal?.name ?? 'Savings',
        value: money(saved),
        sub: goal && goal.target > 0 ? `${percent(saved, goal.target)}% of ${money(goal.target)}` : undefined,
      };
    }
    const inMonth = others.filter((tx) => monthOf(tx.date) === month);
    const monthName = formatMonth(month, 'long', false);
    if (kind === 'income') {
      const total = round2(inMonth.reduce((sum, tx) => sum + tx.amount, 0) + converted);
      return { label: `Income · ${monthName}`, value: money(total), sub: undefined };
    }
    const total = round2(inMonth.filter((tx) => tx.categoryId === categoryId).reduce((sum, tx) => sum + tx.amount, 0) + converted);
    const limit = data.profile.budgets[categoryId] ?? 0;
    const left = round2(limit - total);
    return {
      label: `${meta.name} · ${monthName}`,
      value: money(total),
      // Basic mode has no budgets: no line about them.
      sub: basic ? undefined : limit > 0 ? (left >= 0 ? `${money(left)} left of ${money(limit)}` : `${money(-left)} over ${money(limit)}`) : 'No budget set',
    };
  }, [data.txs, data.goals, data.profile.budgets, basic, original?.id, kind, categoryId, converted, month, meta.name, money]);

  // Recent titles for the Title field's list: the ones used in the chosen category once the user picked one,
  // otherwise those of every category (most recent first; the field shows a few of them and filters as you type).
  const recent = useMemo(() => {
    const seen = new Map<string, number>();
    for (const tx of data.txs) {
      if (tx.kind !== kind || tx.recurringId || !tx.note.trim()) continue;
      if (categoryChosen && tx.categoryId !== categoryId) continue;
      if (!seen.has(tx.note)) seen.set(tx.note, tx.amount);
      if (seen.size >= 30) break;
    }
    return [...seen.entries()];
  }, [data.txs, kind, categoryId, categoryChosen]);

  // Gift cards: those with something left on them (the one this entry already used stays listed). What the
  // entry itself used is added back first, so editing never double counts it.
  const cardOptions = useMemo(() => {
    if (kind !== 'expense') return [];
    const day = todayStr();
    return data.giftCards
      .map((card) => ({ card, left: giftCardBalance(data.txs, card, original?.id) }))
      .filter(({ card, left }) => card.id === giftCardId || (left > 0 && !giftCardExpired(card, day)));
  }, [kind, data.giftCards, data.txs, original?.id, giftCardId]);
  const chosenCard = cardOptions.find((option) => option.card.id === giftCardId);
  const cardCover = chosenCard ? giftCardCover(chosenCard.left, converted) : 0;

  const account = data.accounts.find((a) => a.id === accountId);
  const accountAfter = account
    ? round2(accountBalance(data.txs.filter((tx) => tx.id !== original?.id), account) + (kind === 'income' ? converted : -(converted - cardCover)))
    : 0;

  const valid = converted > 0 && !!categoryId && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const save = () => {
    if (!valid) return;
    const entry = {
      kind,
      categoryId,
      amount: converted,
      note: title.trim() || meta.name,
      details: details.trim() || undefined,
      accountId: accountId || undefined,
      foreign: foreign ? { amount: round2(amount), currency, rate } : undefined,
      giftCard: kind === 'expense' && chosenCard && cardCover > 0 ? { id: chosenCard.card.id, amount: cardCover } : undefined,
      date,
    };
    if (original) updateTx(original.id, entry);
    else addTx(entry);
    closeSheet();
  };

  // Unsaved input: anything typed into a new entry, or any change to an existing one.
  const dirty = original
    ? converted !== original.amount || title.trim() !== original.note || details.trim() !== (original.details ?? '') ||
      categoryId !== original.categoryId || date !== original.date || (accountId || undefined) !== original.accountId ||
      (foreign ? currency : undefined) !== original.foreign?.currency || giftCardId !== (original.giftCard?.id ?? '')
    : amount > 0 || title.trim() !== '' || details.trim() !== '';
  useEffect(() => {
    guardRef.current = { dirty, valid, save };
  });

  const chooseCurrency = (code: string) => {
    setCurrency(code);
    setRate(code === mainCurrency ? 1 : rateFor(code));
    setAmount((value) => Number(value.toFixed(currencyDecimals(code))));
    setPickingCurrency(false);
  };

  if (kind === 'saving' && choices.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-[var(--text)]">{t('Savings go towards a goal. Create one first, then move money to it.')}</p>
        <button
          type="button"
          onClick={() => openSheet({ type: 'goal' })}
          className="pressable pressable-soft w-full py-3 bg-weight hover:brightness-95 text-weight-ink font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={18} strokeWidth={2.5} />
          {t('New savings goal')}
        </button>
      </div>
    );
  }

  /* ---------- Screen 1: the amount ---------- */
  if (step === 'amount') {
    return (
      <AmountStep
        kind={kind}
        amount={amount}
        onAmount={setAmount}
        currency={currency}
        picking={pickingCurrency}
        onPicking={setPickingCurrency}
        onCurrency={chooseCurrency}
        rate={foreign ? rate : 1}
        converted={converted}
        onConfirm={() => {
          setPickingCurrency(false);
          setStep('details');
        }}
      />
    );
  }

  /* ---------- Side trip: the exchange rate ---------- */
  if (step === 'rate') {
    return (
      <RateStep
        currency={currency}
        mainCurrency={mainCurrency}
        rate={rate}
        amount={amount}
        onRate={setRate}
        onReset={() => setRate(rateFor(currency))}
        onDone={() => setStep('details')}
      />
    );
  }

  /* ---------- Side trip: a new category ---------- */
  if (step === 'category') {
    return (
      <NewCategoryStep
        onCancel={() => setStep('details')}
        onCreate={(name, icon, bucket) => {
          const id = saveCategory({ name, icon, bucket });
          setFresh((list) => [...list, { id, name: name.trim(), icon: iconFor(icon) }]);
          setCategoryId(id);
          setStep('details');
        }}
      />
    );
  }

  /* ---------- Screen 2: everything else ---------- */
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
      {t(label)}
    </button>
  );
  const sectionName = kind === 'expense' ? 'Category' : kind === 'income' ? 'Source' : 'Goal';
  const pill = 'pressable px-3 py-2 rounded-xl text-xs font-extrabold border max-w-full truncate';

  return (
    <div className="space-y-4">
      <Banner tone={kind} icon={meta.icon} label={t(banner.label)} value={banner.value} sub={banner.sub ? t(banner.sub) : undefined} />

      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          {dateChip(today, 'Today')}
          {dateChip(yesterday, 'Yesterday')}
          <input
            id="tx-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value || date)}
            aria-label={t('Date: {v}', { v: formatDay(date, false) })}
            className="min-w-0 flex-1 bg-[var(--inset)] border border-[var(--border)] rounded-xl px-2.5 py-[0.4375rem] text-xs font-bold text-[var(--text)] tabular-nums focus:outline-none focus:border-[var(--muted)]"
          />
        </div>
      </div>

      <div>
        <SectionLabel htmlFor="tx-title">{t('Title')}</SectionLabel>
        <TitleField
          value={title}
          onChange={setTitle}
          placeholder={t('A few words, e.g. {name}', { name: meta.name })}
          suggestions={recent}
          format={(v) => money(v, { cents: true })}
        />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-1.5">
        <button
          type="button"
          onClick={() => setStep('amount')}
          className="pressable w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-[var(--hover)]"
          aria-label={t('Change the amount')}
        >
          <span className="min-w-0">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Amount')}</span>
            <AmountDisplay text={amount ? amount.toFixed(currencyDecimals(currency)) : ''} unit={currencySymbol(currency)} className="text-2xl" />
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--muted)] shrink-0">
            {currency}
            <span className="rounded-full bg-[var(--surface)] border border-[var(--border)] px-2 py-0.5 text-[11px]">{t('Change')}</span>
          </span>
        </button>
        {foreign && (
          <button
            type="button"
            onClick={() => setStep('rate')}
            className="pressable w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-[var(--muted)] hover:bg-[var(--hover)] tabular-nums"
            aria-label={t('Change the exchange rate')}
          >
            <span className="min-w-0 truncate">
              = <span className="text-[var(--text)] font-extrabold">{money(converted, { cents: true })}</span> {t('at 1')} {currency} = {formatRate(rate)} {mainCurrency}
            </span>
            <RefreshCw size={13} aria-hidden="true" className="shrink-0" />
          </button>
        )}
      </div>

      <div>
        <ChoiceGrid
          choices={choices}
          value={categoryId}
          onChange={setCategoryId}
          label={sectionName}
          columns={kind === 'saving' ? (choices.length > 3 ? 3 : (Math.max(2, choices.length) as 2 | 3)) : 4}
          collapsible
          extra={kind === 'expense' ? { label: 'New', icon: Plus, onClick: () => setStep('category') } : undefined}
        />
      </div>

      {/* Basic mode has one account: nothing to pick (an entry keeps the account it already has). */}
      {data.accounts.length > 0 && !basic && (
        <div>
          <SectionLabel>{t('Account')}</SectionLabel>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('Account')}>
            <button type="button" role="radio" aria-checked={accountId === ''} onClick={() => setAccountId('')} className={`${pill} ${accountId === '' ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]' : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'}`}>
              {t('None')}
            </button>
            {data.accounts.map((a) => {
              const Icon = iconFor(a.icon);
              const active = a.id === accountId;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAccountId(a.id)}
                  className={`${pill} inline-flex items-center gap-1.5 ${active ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]' : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] border-[var(--border)]'}`}
                >
                  <Icon size={14} aria-hidden="true" />
                  <span className="truncate">{a.name}</span>
                </button>
              );
            })}
          </div>
          {account && converted > 0 && (
            <p className="mt-1.5 text-[11px] font-bold text-[var(--muted)] tabular-nums">
              {account.name} {t('afterwards:')} <span className={accountAfter < 0 ? 'text-[#A3312F]' : 'text-[var(--text)]'}>{money(accountAfter, { cents: true })}</span>
            </p>
          )}
        </div>
      )}

      {cardOptions.length > 0 && !basic && (
        <div>
          <SectionLabel>{t('Pay with a gift card')}</SectionLabel>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('Gift card')}>
            <button type="button" role="radio" aria-checked={giftCardId === ''} onClick={() => setGiftCardId('')} className={`${pill} ${giftCardId === '' ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]' : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'}`}>
              {t('No')}
            </button>
            {cardOptions.map(({ card, left }) => {
              const active = card.id === giftCardId;
              return (
                <button
                  key={card.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setGiftCardId(card.id)}
                  className={`${pill} inline-flex items-center gap-1.5 tabular-nums ${active ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]' : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] border-[var(--border)]'}`}
                >
                  <Gift size={14} aria-hidden="true" />
                  <span className="truncate">{card.name}</span>
                  <span className="opacity-70">{money(left, { cents: true })}</span>
                </button>
              );
            })}
          </div>
          {chosenCard && (
            <p className="mt-1.5 text-[11px] font-bold text-[var(--muted)] tabular-nums">
              {converted > 0 ? (
                <>
                  {t('The card pays')} <span className="text-[var(--text)]">{money(cardCover, { cents: true })}</span>, {money(round2(chosenCard.left - cardCover), { cents: true })} {t('left on it')}
                  {converted - cardCover > 0 && <> {t('· the other')} <span className="text-[var(--text)]">{money(round2(converted - cardCover), { cents: true })}</span> {t('is paid the normal way')}</>}.
                </>
              ) : (
                <>{money(chosenCard.left, { cents: true })} {t('left on')} {chosenCard.card.name}.</>
              )}
            </p>
          )}
        </div>
      )}

      <div>
        <SectionLabel htmlFor="tx-details">{t('Note')} <span className="normal-case tracking-normal font-bold opacity-70">{t('· optional, as long as you like')}</span></SectionLabel>
        <textarea
          id="tx-details"
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder={t('Why, with whom, what exactly...')}
          maxLength={1000}
          rows={3}
          className={`${textInput} text-sm font-medium resize-none leading-snug`}
        />
      </div>

      <SaveRow
        tone={kind}
        disabled={!valid}
        onSave={save}
        label={<>{original ? t('Save changes') : TITLES[kind].save}{converted > 0 && ` · ${money(converted, { cents: true })}`}</>}
        onDelete={original ? () => {
          closeSheet();
          removeTx(original.id);
        } : undefined}
        deleteLabel={t('Delete this entry')}
      />
    </div>
  );
}

/* ---------- Screen 1 ---------- */

function AmountStep({ kind, amount, onAmount, currency, picking, onPicking, onCurrency, rate, converted, onConfirm }: {
  kind: Kind;
  amount: number;
  onAmount: (value: number) => void;
  currency: string;
  picking: boolean;
  onPicking: (value: boolean) => void;
  onCurrency: (code: string) => void;
  rate: number;
  converted: number;
  onConfirm: () => void;
}) {
  const { money, currency: mainCurrency } = useApp();
  const { text, press } = useAmountBuffer(amount, onAmount, { decimals: currencyDecimals(currency) });
  const foreign = currency !== mainCurrency;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('How much?')}</span>
        <button
          type="button"
          onClick={() => onPicking(!picking)}
          aria-expanded={picking}
          className="pressable inline-flex items-center gap-1.5 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] pl-3 pr-2.5 py-1.5 text-xs font-extrabold text-[var(--text)]"
          title={t('Pay in another currency')}
        >
          {currency}
          <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${picking ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="rounded-3xl bg-[var(--inset)] border border-[var(--border)] px-4 py-5 text-center min-h-[7.25rem] flex flex-col items-center justify-center gap-1">
        <AmountDisplay text={t(text)} unit={currencySymbol(currency)} className="text-5xl max-w-full overflow-hidden" />
        <span className="text-xs font-bold text-[var(--muted)] tabular-nums min-h-4">
          {foreign && amount > 0 ? `≈ ${money(converted, { cents: true })} · 1 ${currency} = ${formatRate(rate)} ${mainCurrency}` : foreign ? t('Paid in {currency}, counted in {mainCurrency}', { currency, mainCurrency }) : ''}
        </span>
      </div>

      {picking ? (
        <CurrencyGrid value={currency} onChange={onCurrency} label={t('Currency of this entry')} />
      ) : (
        <NumPad
          onPress={press}
          onConfirm={onConfirm}
          confirmDisabled={converted <= 0}
          confirmClass={CONFIRM_TONE[kind]}
          confirmLabel={t('Confirm amount')}
          decimal={currencyDecimals(currency) > 0}
        />
      )}
    </div>
  );
}

/* ---------- Side trip: rate ---------- */

function RateStep({ currency, mainCurrency, rate, amount, onRate, onReset, onDone }: {
  currency: string;
  mainCurrency: string;
  rate: number;
  amount: number;
  onRate: (value: number) => void;
  onReset: () => void;
  onDone: () => void;
}) {
  const { money } = useApp();
  const { text, press } = useAmountBuffer(rate, onRate, { decimals: 8 });
  return (
    <div className="space-y-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Exchange rate')}</p>
      <div className="rounded-3xl bg-[var(--inset)] border border-[var(--border)] px-4 py-4 text-center space-y-1">
        <span className="block text-xs font-bold text-[var(--muted)]">1 {currency} =</span>
        <AmountDisplay text={t(text)} unit={mainCurrency} className="text-4xl max-w-full overflow-hidden" />
        <span className="block text-xs font-bold text-[var(--muted)] tabular-nums">{money(round2(amount * rate), { cents: true })} {t('for')} {amount} {currency}</span>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="pressable inline-flex items-center gap-1.5 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] px-3 py-1.5 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)]"
      >
        <RefreshCw size={13} aria-hidden="true" />
        {t('Use the current rate')}
      </button>
      <NumPad onPress={press} onConfirm={onDone} confirmDisabled={rate <= 0} confirmLabel={t('Use this rate')} />
    </div>
  );
}

/* ---------- Side trip: new category ---------- */

function NewCategoryStep({ onCancel, onCreate }: { onCancel: () => void; onCreate: (name: string, icon: string, bucket: Bucket) => void }) {
  const { basic } = useApp();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [bucket, setBucket] = useState<Bucket>('wants');
  const valid = name.trim().length > 0;
  return (
    <div className="space-y-4">
      <div>
        <SectionLabel htmlFor="new-category-name">{t('New category')}</SectionLabel>
        <input
          id="new-category-name"
          type="text"
          value={name}
          autoFocus
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && valid) onCreate(name, icon, bucket);
          }}
          placeholder={t('Pets, Gym, Gifts...')}
          maxLength={30}
          autoComplete="off"
          className={`${textInput} text-sm`}
        />
      </div>
      <IconPicker value={icon} onChange={setIcon} />
      {!basic && (
        <div>
          <SectionLabel>{t('Counts as')}</SectionLabel>
          <BucketPicker value={bucket} onChange={setBucket} />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="pressable py-3 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] text-sm font-extrabold">{t('Back')}</button>
        <button
          type="button"
          disabled={!valid}
          onClick={() => onCreate(name, icon, bucket)}
          className="kc-primary-btn pressable py-3 rounded-2xl bg-activity text-activity-ink font-extrabold text-sm disabled:opacity-40"
        >
          {t('Add category')}
        </button>
      </div>
    </div>
  );
}
