import { useMemo, useState } from 'react';
import { ICON } from '../lib/icons';
import { Minus, Plus, RotateCcw, Wallet } from 'lucide-react';
import { Modal } from '../components/Modal';
import { AmountStepper, SectionLabel, textInput } from '../components/ui';
import { accountBalance } from '../lib/calc';
import { t } from '../lib/i18n';
import { round2 } from '../lib/format';
import { countedAmount } from '../lib/giftcards';
import { useApp, useSheet } from '../lib/store';
import type { BudgetRule } from '../lib/types';
import { ProfileAccounts } from './ProfileAccounts';
import { Banner, SaveRow } from './shared';

const RULE_ROWS: { key: keyof BudgetRule; label: string; hint: string; tone: string }[] = [
  { key: 'needs', label: 'Needs', hint: 'Housing, groceries, transport, bills, health', tone: 'bg-needs text-needs-ink' },
  { key: 'wants', label: 'Wants', hint: 'Eating out, fun, shopping', tone: 'bg-wants text-wants-ink' },
  { key: 'savings', label: 'Savings', hint: 'Money moved to your goals', tone: 'bg-weight text-weight-ink' },
];

export function ProfileSheet() {
  const { isOpen, seq } = useSheet('profile');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={t('Profile')} dockCenter maxWidth="max-w-md">
      <ProfileForm key={seq} />
    </Modal>
  );
}

function ProfileForm() {
  const { data, basic, txs, money, symbol, updateProfile, closeSheet } = useApp();
  const [name, setName] = useState(data.profile.name);
  const [rule, setRule] = useState<BudgetRule>(data.profile.rule);
  const [monthlyBudget, setMonthlyBudget] = useState(data.profile.monthlyBudget);

  // What is in all the accounts together: the profile's headline now that balances live in accounts.
  const totalInAccounts = useMemo(() => round2(data.accounts.reduce((sum, account) => sum + accountBalance(data.txs, account), 0)), [data.accounts, data.txs]);

  // Basic mode has one account and no account list: the banner shows the balance of the whole journal
  // (what was in the accounts at the start, plus every income, minus every expense).
  const balance = useMemo(
    () => round2(data.accounts.reduce((sum, account) => sum + account.opening, 0) + txs.reduce((sum, tx) => sum + (tx.kind === 'income' ? tx.amount : tx.kind === 'expense' ? -countedAmount(tx) : 0), 0)),
    [data.accounts, txs],
  );

  const total = rule.needs + rule.wants + rule.savings;
  const isDefault = rule.needs === 50 && rule.wants === 30 && rule.savings === 20;
  const step = (key: keyof BudgetRule, delta: number) =>
    setRule((prev) => ({ ...prev, [key]: Math.min(100, Math.max(0, prev[key] + delta)) }));

  const stepButton =
    'pressable size-9 shrink-0 rounded-xl bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center disabled:opacity-35';

  return (
    <div className="space-y-4">
      <Banner
        tone="saving"
        icon={Wallet}
        label={name.trim() ? t("{name}'s money", { name: name.trim() }) : basic ? t('Balance') : t('Money in accounts')}
        value={money(basic ? balance : totalInAccounts)}
        sub={basic ? t('Income minus expenses') : data.accounts.length ? t(data.accounts.length === 1 ? '{n} account' : '{n} accounts', { n: data.accounts.length }) : t('No accounts yet')}
      />

      <div>
        <SectionLabel htmlFor="profile-name">{t('Name')}</SectionLabel>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('Optional')}
          maxLength={30}
          autoComplete="given-name"
          className={`${textInput}`}
        />
      </div>

      {!basic && <ProfileAccounts />}

      {!basic && (
      <div>
        <SectionLabel>{t('Monthly budget')}</SectionLabel>
        <AmountStepper value={monthlyBudget} onChange={setMonthlyBudget} unit={symbol} step={50} min={0} ariaLabel={t('Monthly budget')} chips={[500, 1000, 2000]} />
        <p className="mt-1.5 text-[11px] font-medium text-[var(--muted)]">
          {t('One generic budget for all your spending each month, on top of the category budgets. Leave it at 0 to budget by category only.')}
        </p>
      </div>
      )}

      {!basic && (
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Budget rule')}</span>
          <button
            type="button"
            onClick={() => setRule({ needs: 50, wants: 30, savings: 20 })}
            disabled={isDefault}
            className="pressable px-2.5 py-1 rounded-xl text-[11px] font-extrabold border bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)] inline-flex items-center gap-1 disabled:opacity-40"
          >
            <RotateCcw size={ICON.mark} strokeWidth={2.5} aria-hidden="true" />
            50 / 30 / 20
          </button>
        </div>
        <div className="space-y-1.5">
          {RULE_ROWS.map((row) => (
            <div key={row.key} className="flex items-center gap-2.5 rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2.5">
              <span className={`shrink-0 w-12 py-1.5 rounded-xl text-center text-xs font-extrabold tabular-nums ${row.tone}`}>{rule[row.key]}%</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold text-[var(--text)]">{t(row.label)}</span>
                <span className="block text-[11px] font-medium text-[var(--muted)] truncate">{t(row.hint)}</span>
              </span>
              <button type="button" onClick={() => step(row.key, -5)} disabled={rule[row.key] <= 0} className={stepButton} aria-label={t('{label}: minus 5 points', { label: row.label })}>
                <Minus size={ICON.md} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => step(row.key, 5)} disabled={rule[row.key] >= 100} className={stepButton} aria-label={t('{label}: plus 5 points', { label: row.label })}>
                <Plus size={ICON.md} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <p className={`mt-2 text-[11px] font-bold tabular-nums ${total === 100 ? 'text-[var(--muted)]' : 'text-[var(--text-warn)]'}`} aria-live="polite">
          {total === 100 ? t('Shares of your income. They add up to 100%.') : t('The three shares add up to {total}%. {v} points to reach 100%.', { total, v: total < 100 ? t('Add {v}', { v: 100 - total }) : t('Take off {v}', { v: total - 100 }) })}
        </p>
      </div>
      )}

      <SaveRow
        tone="neutral"
        disabled={!basic && total !== 100}
        onSave={() => {
          updateProfile({ name: name.trim(), rule, monthlyBudget });
          closeSheet();
        }}
        label={t('Save profile')}
      />
    </div>
  );
}
