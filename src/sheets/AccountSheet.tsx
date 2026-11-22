import { useState } from 'react';
import { Modal } from '../components/Modal';
import { AmountStepper, ConfirmDialog, SectionLabel, seg, textInput } from '../components/ui';
import { accountBalance } from '../lib/calc';
import { round2 } from '../lib/format';
import { iconFor } from '../lib/icons';
import { useApp, useSheet } from '../lib/store';
import type { Sheet } from '../lib/types';
import { Banner, IconPicker, SaveRow } from './shared';
import { t } from '../lib/i18n';

/** Create, rename or delete an account, and tell the app what it holds today. */
export function AccountSheet() {
  const { isOpen, sheet, seq } = useSheet('account');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={sheet?.id ? t('Edit account') : t('New account')} subtitle={t('Cash, a bank account, a card...')} maxWidth="max-w-md">
      {sheet && <AccountForm key={seq} sheet={sheet} />}
    </Modal>
  );
}

function AccountForm({ sheet }: { sheet: Extract<Sheet, { type: 'account' }> }) {
  const { data, symbol, money, saveAccount, removeAccount, closeSheet, showToast } = useApp();
  const [original] = useState(() => (sheet.id ? data.accounts.find((a) => a.id === sheet.id) : undefined));
  // What the entries of this account add up to: "balance today" is typed, the starting balance follows from it.
  const entriesNet = original ? round2(accountBalance(data.txs, original) - original.opening) : 0;
  const today = original ? accountBalance(data.txs, original) : 0;

  const [name, setName] = useState(original?.name ?? '');
  const [icon, setIcon] = useState(original?.icon ?? 'bank');
  const [amount, setAmount] = useState(Math.abs(today));
  const [negative, setNegative] = useState(today < 0);
  const [confirm, setConfirm] = useState(false);

  const balance = negative ? -amount : amount;
  const valid = name.trim().length > 0;
  const Icon = iconFor(icon);

  const save = () => {
    if (!valid) return;
    saveAccount({ id: original?.id, name, icon, opening: round2(balance - entriesNet) });
    closeSheet();
    showToast(`${name.trim()} · ${money(balance)}`);
  };

  return (
    <div className="space-y-4">
      <Banner tone="needs" icon={Icon} label={name.trim() || t('Account')} value={money(balance, { cents: true })} sub={original ? t('{length} entries', { length: data.txs.filter((tx) => tx.accountId === original.id).length }) : undefined} />

      <div>
        <SectionLabel htmlFor="account-name">{t('Account name')}</SectionLabel>
        <input
          id="account-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('Current account, Cash, Credit card')}
          maxLength={40}
          autoComplete="off"
          autoFocus={!original}
          aria-required="true"
          aria-invalid={!original && name.length > 0 && !valid}
          className={`${textInput}`}
        />
      </div>

      <IconPicker value={icon} onChange={setIcon} />

      <div>
        <SectionLabel>{original ? t('Balance today') : t('Opening balance')}</SectionLabel>
        <AmountStepper value={amount} onChange={setAmount} unit={symbol} step={10} ariaLabel={t('Balance')} startOpen={!original} chips={[50, 100, 500]} />
        <div className="flex gap-1.5 mt-2" role="group" aria-label={t('Sign of the balance')}>
          <button type="button" aria-pressed={!negative} onClick={() => setNegative(false)} className={seg(!negative)}>{t('In credit')}</button>
          <button type="button" aria-pressed={negative} onClick={() => setNegative(true)} className={seg(negative)}>{t('Overdrawn')}</button>
        </div>
        <p className="mt-1.5 text-[11px] font-medium text-[var(--muted)]">
          {t('From now on every entry you put in this account moves the balance. Entries without an account do not count here.')}
        </p>
      </div>

      {!valid && (
        <p className="-mb-2 text-center text-[11px] font-bold text-[var(--muted)]" role="status">{t('Give the account a name to')} {original ? t('save it') : t('add it')}.</p>
      )}

      <SaveRow
        tone="neutral"
        disabled={!valid}
        onSave={save}
        label={original ? t('Save changes') : t('Add account')}
        onDelete={original ? () => setConfirm(true) : undefined}
        deleteLabel={t('Delete this account')}
      />

      <ConfirmDialog
        open={confirm}
        title={t('Delete {v}?', { v: original?.name ?? 'this account' })}
        message={t('Its entries stay in your journal; they just no longer belong to an account.')}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          if (original) removeAccount(original.id);
          closeSheet();
        }}
      />
    </div>
  );
}
