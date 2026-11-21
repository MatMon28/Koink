import { useState } from 'react';
import { Modal } from '../components/Modal';
import { AmountStepper, ConfirmDialog, SectionLabel, seg, textInput } from '../components/ui';
import { accountBalance } from '../lib/calc';
import { round2 } from '../lib/format';
import { iconFor } from '../lib/icons';
import { useApp, useSheet } from '../lib/store';
import type { Sheet } from '../lib/types';
import { Banner, IconPicker, SaveRow } from './shared';

/** Create, rename or delete an account, and tell the app what it holds today. */
export function AccountSheet() {
  const { isOpen, sheet, seq } = useSheet('account');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={sheet?.id ? 'Edit account' : 'New account'} subtitle="Cash, a bank account, a card..." maxWidth="max-w-md">
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
      <Banner tone="needs" icon={Icon} label={name.trim() || 'Account'} value={money(balance, { cents: true })} sub={original ? `${data.txs.filter((tx) => tx.accountId === original.id).length} entries` : undefined} />

      <div>
        <SectionLabel htmlFor="account-name">Name</SectionLabel>
        <input
          id="account-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Current account, Cash, Credit card"
          maxLength={40}
          autoComplete="off"
          className={`${textInput} text-sm`}
        />
      </div>

      <IconPicker value={icon} onChange={setIcon} />

      <div>
        <SectionLabel>{original ? 'Balance today' : 'What is in it now'}</SectionLabel>
        <AmountStepper value={amount} onChange={setAmount} unit={symbol} step={10} ariaLabel="Balance" startOpen={!original} chips={[50, 100, 500]} />
        <div className="flex gap-1.5 mt-2" role="group" aria-label="Sign of the balance">
          <button type="button" aria-pressed={!negative} onClick={() => setNegative(false)} className={seg(!negative)}>In credit</button>
          <button type="button" aria-pressed={negative} onClick={() => setNegative(true)} className={seg(negative)}>Overdrawn</button>
        </div>
        <p className="mt-1.5 text-[11px] font-medium text-[var(--muted)]">
          From now on every entry you put in this account moves the balance. Entries without an account do not count here.
        </p>
      </div>

      <SaveRow
        tone="neutral"
        disabled={!valid}
        onSave={save}
        label={original ? 'Save changes' : 'Add account'}
        onDelete={original ? () => setConfirm(true) : undefined}
        deleteLabel="Delete this account"
      />

      <ConfirmDialog
        open={confirm}
        title={`Delete ${original?.name ?? 'this account'}?`}
        message="Its entries stay in your journal; they just no longer belong to an account."
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
