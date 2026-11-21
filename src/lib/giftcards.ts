import type { GiftCard, Tx } from './types';
import { round2 } from './format';

/** How much of an entry a gift card paid (0 when it was not paid with one). */
export const giftCardPaid = (tx: Tx): number => (tx.giftCard ? tx.giftCard.amount : 0);

/** The entries paid (fully or partly) with this card, newest first as the ledger is. */
export const giftCardEntries = (txs: Tx[], card: GiftCard): Tx[] => txs.filter((tx) => tx.kind === 'expense' && tx.giftCard?.id === card.id);

/** What has been spent from the card so far. `ignoreId` leaves one entry out (the one being edited). */
export function giftCardSpent(txs: Tx[], card: GiftCard, ignoreId?: string): number {
  let spent = 0;
  for (const tx of txs) if (tx.id !== ignoreId && tx.kind === 'expense' && tx.giftCard?.id === card.id) spent += tx.giftCard.amount;
  return round2(spent);
}

/** What is left on the card (never below zero). */
export const giftCardBalance = (txs: Tx[], card: GiftCard, ignoreId?: string): number => round2(Math.max(0, card.initial - giftCardSpent(txs, card, ignoreId)));

/** True once the card's last day has passed. */
export const giftCardExpired = (card: GiftCard, today: string): boolean => !!card.expires && card.expires < today;

/** How much of an expense of `amount` a card can pay: all of it, or whatever is left on the card. */
export const giftCardCover = (balance: number, amount: number): number => round2(Math.max(0, Math.min(balance, amount)));

/** The part of an entry that went through its account (an expense paid with a gift card went through it only for the rest). */
export const accountShare = (tx: Tx): number => round2(tx.kind === 'expense' ? Math.max(0, tx.amount - giftCardPaid(tx)) : tx.amount);
