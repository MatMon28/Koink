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

/*
 * Per-card choices (`GiftCard.countAsIncome`, `GiftCard.countAsSpending`). The store pushes the cards in with
 * `syncGiftCards()` whenever they change (like `syncCategories`), so the plain functions of lib/ (`totalsOf` in
 * calc.ts, `expenseSeries`) see them without passing them around. In Basic mode the store syncs no cards:
 * gift cards do not exist there, so nothing changes in its totals.
 */
let cardsById = new Map<string, GiftCard>();

export function syncGiftCards(cards: GiftCard[]): void {
  cardsById = new Map(cards.map((card) => [card.id, card]));
}

/** What an entry adds to spending: its amount, minus the part a gift card paid when that card is set not to count as spending. */
export function countedAmount(tx: Tx): number {
  if (tx.kind !== 'expense' || !tx.giftCard) return tx.amount;
  const card = cardsById.get(tx.giftCard.id);
  if (!card || card.countAsSpending !== false) return tx.amount;
  return round2(Math.max(0, tx.amount - tx.giftCard.amount));
}

/** Id prefix of the income entries made from gift cards (they are not stored: `giftCardIncomeTxs` builds them). */
export const GIFT_INCOME_PREFIX = 'gcin_';
export const isGiftCardIncome = (tx: Tx): boolean => tx.id.startsWith(GIFT_INCOME_PREFIX);
/** The gift card behind such an entry. */
export const giftCardOfIncome = (tx: Tx): string => tx.id.slice(GIFT_INCOME_PREFIX.length);

/** One income entry per card that counts its value as income, dated `incomeDate`. Added to the ledger by the store, never saved. */
export function giftCardIncomeTxs(cards: GiftCard[]): Tx[] {
  const out: Tx[] = [];
  for (const card of cards) {
    if (!card.countAsIncome || !card.incomeDate || !(card.initial > 0)) continue;
    out.push({ id: `${GIFT_INCOME_PREFIX}${card.id}`, kind: 'income', amount: card.initial, categoryId: 'gift', note: card.name, date: card.incomeDate, ts: 0 });
  }
  return out;
}
