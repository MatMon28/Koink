import { useState } from 'react';
import { Gift, Receipt } from 'lucide-react';
import { Modal } from '../components/Modal';
import { AmountStepper, ConfirmDialog, SectionLabel, textInput } from '../components/ui';
import { categoryMeta } from '../lib/categories';
import { formatDay, todayStr } from '../lib/dates';
import { giftCardBalance, giftCardEntries, giftCardExpired } from '../lib/giftcards';
import { useApp, useSheet } from '../lib/store';
import type { Sheet } from '../lib/types';
import { Banner, SaveRow } from './shared';
import { t } from '../lib/i18n';

/** Add, edit or delete a gift card; for an existing one, also what has been spent from it. */
export function GiftCardSheet() {
  const { isOpen, sheet, seq } = useSheet('giftCard');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={sheet?.id ? t('Edit gift card') : t('New gift card')} subtitle={t('A voucher you can pay expenses with')} dockId={sheet?.id ? undefined : 'giftcard'} maxWidth="max-w-md">
      {sheet && <GiftCardForm key={seq} sheet={sheet} />}
    </Modal>
  );
}

function GiftCardForm({ sheet }: { sheet: Extract<Sheet, { type: 'giftCard' }> }) {
  const { data, symbol, money, saveGiftCard, removeGiftCard, closeSheet, openSheet, showToast } = useApp();
  const [original] = useState(() => (sheet.id ? data.giftCards.find((g) => g.id === sheet.id) : undefined));
  const entries = original ? giftCardEntries(data.txs, original) : [];
  const left = original ? giftCardBalance(data.txs, original) : 0;
  const spent = original ? Math.max(0, original.initial - left) : 0;

  const [name, setName] = useState(original?.name ?? '');
  const [initial, setInitial] = useState(original?.initial ?? 0);
  const [expires, setExpires] = useState(original?.expires ?? '');
  const [note, setNote] = useState(original?.note ?? '');
  const [confirm, setConfirm] = useState(false);

  const valid = name.trim().length > 0 && initial > 0;
  const shownLeft = original ? Math.max(0, initial - spent) : initial;
  const expired = giftCardExpired({ id: '', name: '', initial, expires: expires || undefined }, todayStr());

  const save = () => {
    if (!valid) return;
    saveGiftCard({ id: original?.id, name, initial, expires: expires || undefined, note });
    closeSheet();
    showToast(t('{v} · {v2} left', { v: name.trim(), v2: money(shownLeft, { cents: true }) }));
  };

  return (
    <div className="space-y-4">
      <Banner tone="gift" icon={Gift} label={name.trim() || 'Gift card'} value={money(shownLeft, { cents: true })} sub={original ? t('of {v} · {v2}', { v: money(initial, { cents: true }), v2: expired ? t('expired') : t('left') }) : t('Value')} />

      <div>
        <SectionLabel htmlFor="gift-name">{t('Name')}</SectionLabel>
        <input
          id="gift-name"
          type="text"
          value={name}
          autoFocus={!original}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('Bookshop, Amazon, Spa voucher')}
          maxLength={40}
          autoComplete="off"
          className={`${textInput} text-sm`}
        />
      </div>

      <div>
        <SectionLabel>{original ? t('Value when added') : t('Value')}</SectionLabel>
        <AmountStepper value={initial} onChange={setInitial} unit={symbol} step={5} ariaLabel={t('Value of the gift card')} startOpen={!original} chips={[10, 25, 50]} />
        {original && spent > 0 && (
          <p className="mt-1.5 text-[11px] font-medium text-[var(--muted)]">{money(spent, { cents: true })} {t('has been spent from it so far; the balance above follows the value you set.')}</p>
        )}
      </div>

      <div>
        <SectionLabel htmlFor="gift-expires">{t('Valid until')} <span className="normal-case tracking-normal font-bold opacity-70">{t('· optional')}</span></SectionLabel>
        <div className="flex items-center gap-1.5">
          <input
            id="gift-expires"
            type="date"
            value={expires}
            onChange={(event) => setExpires(event.target.value)}
            className="min-w-0 flex-1 bg-[var(--inset)] border border-[var(--border)] rounded-xl px-2.5 py-2.5 text-sm font-bold text-[var(--text)] tabular-nums focus:outline-none focus:border-[var(--muted)]"
          />
          {expires && (
            <button type="button" onClick={() => setExpires('')} className="pressable px-3 py-2.5 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-xs font-extrabold text-[var(--muted)]">
              {t('No limit')}
            </button>
          )}
        </div>
      </div>

      <div>
        <SectionLabel htmlFor="gift-note">{t('Note')} <span className="normal-case tracking-normal font-bold opacity-70">{t('· code, shop, anything')}</span></SectionLabel>
        <textarea
          id="gift-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('Card number, where it can be used...')}
          maxLength={500}
          rows={2}
          className={`${textInput} text-sm font-medium resize-none leading-snug`}
        />
      </div>

      {original && (
        <div>
          <SectionLabel>{t('Spent from this card')}</SectionLabel>
          {entries.length === 0 ? (
            <p className="text-xs font-medium text-[var(--muted)]">{t('Nothing yet. When you add an expense, choose')} <b>{t('Pay with a gift card')}</b> {t('and the amount comes off this card.')}</p>
          ) : (
            <ul className="divide-y divide-[var(--border)] bg-[var(--inset)] border border-[var(--border)] rounded-2xl overflow-hidden">
              {entries.map((tx) => (
                <li key={tx.id}>
                  <button type="button" onClick={() => openSheet({ type: 'tx', kind: 'expense', editId: tx.id })} className="pressable w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[var(--hover)]">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-extrabold text-[var(--text)]">{tx.note || categoryMeta('expense', tx.categoryId, []).name}</span>
                      <span className="block text-[11px] font-medium text-[var(--muted)]">{formatDay(tx.date)}</span>
                    </span>
                    <span className="text-xs font-extrabold tabular-nums text-[#7A2727] shrink-0">-{money(tx.giftCard?.amount ?? 0, { cents: true })}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {left > 0 && (
            <button
              type="button"
              onClick={() => openSheet({ type: 'tx', kind: 'expense', giftCardId: original.id })}
              className="pressable mt-2 w-full py-2.5 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-xs font-extrabold text-[var(--text)] inline-flex items-center justify-center gap-1.5"
            >
              <Receipt size={14} aria-hidden="true" />
              {t('Spend from this card')}
            </button>
          )}
        </div>
      )}

      <SaveRow
        tone="gift"
        disabled={!valid}
        onSave={save}
        label={original ? t('Save changes') : t('Add gift card')}
        onDelete={original ? () => setConfirm(true) : undefined}
        deleteLabel={t('Delete this gift card')}
      />

      <ConfirmDialog
        open={confirm}
        title={t('Delete {v}?', { v: original?.name ?? 'this gift card' })}
        message={t('The entries paid with it stay in your journal; they just count as paid the normal way again.')}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          if (original) removeGiftCard(original.id);
          closeSheet();
        }}
      />
    </div>
  );
}
