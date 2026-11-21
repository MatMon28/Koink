# Feature: Gift cards

> **Scope:** gift cards and vouchers: adding one, paying an expense with one (the amount comes off the card), and the Month-page field that tracks all of them.
>
> **Read when:** you change `src/lib/giftcards.ts`, `src/sheets/GiftCardSheet.tsx`, the *Pay with a gift card* block of `src/sheets/TxSheet.tsx` or the Gift cards tracker in `src/pages/MonthView.tsx`.
>
> **Related:** [entries.md](entries.md), [accounts.md](accounts.md), [month.md](month.md), [widgets.md](widgets.md), [../data-model.md](../data-model.md)

## Model

- `GiftCard { id, name, initial, expires?, note? }`, stored in `AppData.giftCards`. A card has **no stored balance**: what is left is `initial` minus every expense paid with it.
- An expense paid with a card carries `Tx.giftCard = { id, amount }`: how much of the entry the card covered (journal currency).
- The expense still counts in the month's spending, its category and its budget: the gift card is *how it was paid*, not a refund.

## Paying with a gift card

In *Add expense* / *Edit expense*, **Pay with a gift card** lists the cards that still have money and are not expired (the card an entry already used stays listed while editing). Choosing one shows what it pays and what is left. The card pays **the whole amount, or what is left on it**; the rest is paid the normal way (through the chosen account). Editing an entry adds its own use back first, so the balance never double counts it.

For accounts, only the part not covered by the card moved through the account (`accountShare` in `giftcards.ts`, used by `accountBalance`).

Deleting a gift card keeps the entries; they lose the link and count as paid the normal way again. Deleting an entry returns its amount to the card.

## Where cards are managed

| Place | What |
| --- | --- |
| **Gift cards** tracker (Month page, under Recurring) | Total left on usable cards, one row per card with a bar and the date it is valid until, a receipt button (*Spend from this card* opens Add expense with the card chosen), `+` for a new card. Shown once a card exists or the gift card button is on |
| `GiftCardSheet` | name, value, optional *Valid until*, note; for an existing card the list of entries paid with it |
| **Gift card button** (bottom bar) | Opt-in: Settings > Buttons in the bottom bar > **Gift card** (off by default). Opens the new-gift-card sheet |
| Widgets | `giftcard` is one of the widget actions ([widgets.md](widgets.md)) |

## Files

`src/lib/giftcards.ts` (maths, no JSX), `src/sheets/GiftCardSheet.tsx`, `store.tsx` (`saveGiftCard`, `removeGiftCard`, sanitising of `giftCards` and `Tx.giftCard`), `TxSheet.tsx`, `MonthView.tsx`, `App.tsx` (dock button).
