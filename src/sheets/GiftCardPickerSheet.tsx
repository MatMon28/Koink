import { ChevronRight, Gift, Plus } from 'lucide-react';
import { Bar } from '../components/ui';
import { Modal } from '../components/Modal';
import { formatDay, todayStr } from '../lib/dates';
import { giftCardBalance, giftCardExpired } from '../lib/giftcards';
import { t } from '../lib/i18n';
import { useApp, useSheet } from '../lib/store';
import { Banner } from './shared';

/**
 * What the gift card button opens: the cards that were already added, to pick one and spend it. Tapping a card
 * goes straight to Add expense with that card chosen to pay. Adding a new card is one tap away (and the cards
 * stay editable from the Gift cards tracker on the Month page).
 */
export function GiftCardPickerSheet() {
  const { isOpen } = useSheet('giftCards');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={t('Gift cards')} subtitle={t('Pick one to spend')} dockId="giftcard" maxWidth="max-w-md">
      {isOpen && <Picker />}
    </Modal>
  );
}

function Picker() {
  const { data, money, openSheet } = useApp();
  const day = todayStr();
  const rows = data.giftCards.map((card) => ({ card, left: giftCardBalance(data.txs, card), expired: giftCardExpired(card, day) }));
  const usable = rows.filter((row) => row.left > 0 && !row.expired);
  const others = rows.filter((row) => row.left <= 0 || row.expired);
  const totalLeft = usable.reduce((sum, row) => sum + row.left, 0);

  const addNew = (
    <button
      type="button"
      onClick={() => openSheet({ type: 'giftCard' })}
      className="pressable pressable-soft w-full flex items-center justify-center gap-2 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] px-4 py-3 text-sm font-extrabold text-[var(--text)]"
    >
      <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
      {t('Add a new gift card')}
    </button>
  );

  return (
    <div className="space-y-4">
      <Banner
        tone="gift"
        icon={Gift}
        label={t('Left to spend')}
        value={money(totalLeft, { cents: true })}
        sub={rows.length === 0 ? t('None yet') : t(usable.length === 1 ? '{n} card to use' : '{n} cards to use', { n: usable.length })}
      />

      {rows.length === 0 && (
        <p className="rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-4 py-3 text-xs font-medium text-[var(--muted)]">
          {t('You have not added any gift card yet. Add one, then spend it from here.')}
        </p>
      )}

      {usable.length > 0 && (
        <ul className="space-y-1.5" aria-label={t('Gift cards you can spend')}>
          {usable.map(({ card, left }) => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => openSheet({ type: 'tx', kind: 'expense', giftCardId: card.id })}
                className="pressable pressable-soft w-full flex items-center gap-3 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] px-3.5 py-3 text-left"
                aria-label={t('Spend from {name}', { name: card.name })}
              >
                <span className="size-9 shrink-0 rounded-full bg-[#FFD9E8] text-[#7A1F4B] flex items-center justify-center">
                  <Gift size={16} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="flex items-center justify-between gap-2 text-xs tabular-nums">
                    <span className="font-extrabold text-[var(--text)] truncate">{card.name}</span>
                    <span className="font-extrabold text-[var(--text)] shrink-0">
                      {money(left, { cents: true })}
                      <span className="font-semibold text-[var(--muted)]"> {t('of')} {money(card.initial, { cents: true })}</span>
                    </span>
                  </span>
                  <Bar value={left} max={card.initial || 1} track="kc-water-track bg-[var(--surface)]" fill="kc-water-fill bg-[var(--muted)]" />
                  {card.expires && <span className="block text-[11px] font-semibold text-[var(--muted)]">{t('Valid until')} {formatDay(card.expires)}</span>}
                </span>
                <ChevronRight size={16} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && usable.length === 0 && (
        <p className="rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-4 py-3 text-xs font-medium text-[var(--muted)]">
          {t('Every card is used up or expired.')}
        </p>
      )}

      {addNew}

      {others.length > 0 && (
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-2">{t('Used up or expired')}</span>
          <ul className="space-y-1.5">
            {others.map(({ card, expired }) => (
              <li key={card.id}>
                <button
                  type="button"
                  onClick={() => openSheet({ type: 'giftCard', id: card.id })}
                  className="pressable w-full flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-left text-xs opacity-70 hover:opacity-100"
                >
                  <span className="font-bold text-[var(--text)] truncate">{card.name}</span>
                  <span className="font-semibold text-[var(--muted)] shrink-0">{expired ? t('Expired') : t('Used up')}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
