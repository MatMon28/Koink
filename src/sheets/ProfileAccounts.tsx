import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { SectionLabel, textInput } from '../components/ui';
import { accountBalance } from '../lib/calc';
import { round2 } from '../lib/format';
import { t } from '../lib/i18n';
import { iconFor, ICON } from '../lib/icons';
import { useApp } from '../lib/store';
import type { Account } from '../lib/types';

/** "12,50", "12.5", "-3" or "" as a number; null when it is not one. */
function parseBalance(text: string): number | null {
  const clean = text.trim().replace(/\s/g, '').replace(',', '.');
  if (clean === '' || clean === '-' || clean === '.') return null;
  const n = Number(clean);
  return Number.isFinite(n) ? round2(n) : null;
}

/** The text a balance starts as in its field: no trailing zeros, a dot for decimals. */
const asText = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

const balanceInput =
  `${textInput} !min-h-9 !px-2.5 min-w-0 text-right font-extrabold tabular-nums`;

/**
 * The balance of one account as a field: type what is really in it and leave the field (or press Enter).
 * The account's opening balance is derived from it, so later entries keep moving it from there.
 */
function BalanceField({ account }: { account: Account }) {
  const { data, saveAccount, symbol } = useApp();
  const current = accountBalance(data.txs, account);
  const [text, setText] = useState(asText(current));
  const [focused, setFocused] = useState(false);

  const shown = focused ? text : asText(current);
  const commit = () => {
    setFocused(false);
    const value = parseBalance(text);
    if (value === null || value === current) return;
    // opening = what is wanted today - what the account's entries add up to
    saveAccount({ id: account.id, name: account.name, icon: account.icon, opening: round2(value - (current - account.opening)) });
  };

  return (
    <label className="relative block w-32 shrink-0">
      <span className="sr-only">{t('Balance of {name}', { name: account.name })}</span>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--muted)]">{symbol}</span>
      <input
        type="text"
        inputMode="decimal"
        value={shown}
        onFocus={(event) => {
          setText(asText(current));
          setFocused(true);
          event.currentTarget.select();
        }}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        className={`${balanceInput} pl-6`}
      />
    </label>
  );
}

/** Several accounts, each with the money in it, in the profile. Edits apply at once (there is no save button for them). */
export function ProfileAccounts() {
  const { data, openSheet, saveAccount, showToast } = useApp();
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [adding, setAdding] = useState(false);

  const add = () => {
    if (!name.trim()) return;
    saveAccount({ name, icon: 'bank', opening: parseBalance(balance) ?? 0 });
    showToast(t('Account added'));
    setName('');
    setBalance('');
    setAdding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <SectionLabel>{t('Accounts')}</SectionLabel>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="pressable -mt-2 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)] inline-flex items-center gap-1"
          >
            <Plus size={ICON.mark} strokeWidth={2.5} aria-hidden="true" />
            {t('New account')}
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {data.accounts.length === 0 && !adding && (
          <p className="rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2.5 text-xs font-medium text-[var(--muted)]">
            {t('No accounts yet. Add your current account, cash, a card... and say how much is in each.')}
          </p>
        )}
        {data.accounts.map((account) => {
          const Icon = iconFor(account.icon);
          return (
            <div key={account.id} className="flex items-center gap-2 rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2">
              <span className="size-8 shrink-0 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-[var(--text)]">
                <Icon size={ICON.md} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-extrabold text-[var(--text)]">{account.name}</span>
              <BalanceField key={`${account.id}:${account.opening}`} account={account} />
              <button
                type="button"
                onClick={() => openSheet({ type: 'account', id: account.id })}
                className="pressable size-8 shrink-0 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] flex items-center justify-center"
                aria-label={t('Edit {name}', { name: account.name })}
                title={t('Rename, change icon or delete')}
              >
                <Pencil size={ICON.sm} aria-hidden="true" />
              </button>
            </div>
          );
        })}

        {adding && (
          <div className="space-y-2 rounded-2xl bg-[var(--inset)] border border-[var(--border)] p-3">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('Current account, Cash, Credit card')}
              aria-label={t('Account name')}
              maxLength={40}
              autoFocus
              autoComplete="off"
              className={`${textInput}`}
            />
            <div className="flex items-center gap-2">
              <label className="relative block min-w-0 flex-1">
                <span className="sr-only">{t('Money in it now')}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={balance}
                  onChange={(event) => setBalance(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') add();
                  }}
                  placeholder={t('Money in it now')}
                  className={`${textInput} text-right`}
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setName('');
                  setBalance('');
                }}
                className="pressable px-3 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-xs font-extrabold text-[var(--muted)]"
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                disabled={!name.trim()}
                onClick={add}
                className="pressable px-3.5 py-2.5 rounded-xl bg-intake text-intake-ink text-xs font-extrabold disabled:opacity-40"
              >
                {t('Add')}
              </button>
            </div>
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] font-medium text-[var(--muted)]">
        {t('Type what is really in each account. From then on, every entry you put in it moves the balance.')}
      </p>
    </div>
  );
}
