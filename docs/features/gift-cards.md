# Feature: Gift cards

> **Scope:** gift cards and vouchers: adding one, paying an expense with one (the amount comes off the card), and the Month-page field that tracks all of them.
>
> **Read when:** you change `src/lib/giftcards.ts`, `src/sheets/GiftCardPickerSheet.tsx`, `src/sheets/GiftCardSheet.tsx`, the *Pay with a gift card* block of `src/sheets/TxSheet.tsx` or the Gift cards tracker in `src/pages/MonthView.tsx`.
>
> **Related:** [entries.md](entries.md), [accounts.md](accounts.md), [month.md](month.md), [widgets.md](widgets.md), [../data-model.md](../data-model.md)

## Model

- `GiftCard { id, name, initial, expires?, note? }`, stored in `AppData.giftCards`. A card has **no stored balance**: what is left is `initial` minus every expense paid with it.
- An expense paid with a card carries `Tx.giftCard = { id, amount }`: how much of the entry the card covered (journal currency).
- By default the expense still counts in the month's spending, its category and its budget: the gift card is *how it was paid*, not a refund. Each card can change this (next section).
- `GiftCard.countAsIncome?`, `incomeDate?`, `countAsSpending?` (all optional; an older journal has none = value not income, payments counted as spending).

## Paying with a gift card

In *Add expense* / *Edit expense*, **Pay with a gift card** lists the cards that still have money and are not expired (the card an entry already used stays listed while editing). Choosing one shows what it pays and what is left. The card pays **the whole amount, or what is left on it**; the rest is paid the normal way (through the chosen account). Editing an entry adds its own use back first, so the balance never double counts it.

For accounts, only the part not covered by the card moved through the account (`accountShare` in `giftcards.ts`, used by `accountBalance`).

Deleting a gift card keeps the entries; they lose the link and count as paid the normal way again. Deleting an entry returns its amount to the card.

## What counts as income and spending (per card)

In the card's sheet, **How it counts** has two switches:

| Switch | Off (default for the first) | On |
| --- | --- | --- |
| **Count its value as income** (`countAsIncome`, with **Counts as income on** = `incomeDate`) | The card is not money you earned: nothing is added to income. | The card's value is added to income on that day. `giftCardIncomeTxs()` makes one income entry (`id` `gcin_<cardId>`, category *Gift*, title = the card's name, **never stored**); the store puts it in `txs`, so it shows in Transactions and the Month Income tracker and counts in every income total, balance trend and the Profile balance. Tapping it opens the card; it has the gift icon and no delete button. |
| **Count what I pay with it as spending** (`countAsSpending`, on by default) | The part of an expense the card paid (`Tx.giftCard.amount`) is left out of spending: month totals, Needs / Wants shares, category totals and budgets, *Expenses over time* and the balance trend. The entry stays in the lists with its full amount and the gift icon. | As before. |

`countedAmount(tx)` in `giftcards.ts` is the one function behind the spending side; `totalsOf` (`calc.ts`), `expenseSeries`, the balance trend (`StatsView`), the Profile balance and the Transactions page figures use it. The cards reach those plain functions through `syncGiftCards()` (like `syncCategories`), called by the store. **Basic mode** syncs no cards (gift cards do not exist there), so its totals are unchanged. Account balances are not affected by either switch (an account only ever moves for the part not paid by the card). The Excel export reads the stored entries, so it does not list the income made from a card's value and its totals do apply the spending switch.

## The gift icon

An expense with `Tx.giftCard` shows a small gift icon next to its category in the Transactions list (`EntryRow`) and in the entries of an open Month card (`TxRow` in `cards.tsx`, in the line with the day). The income entry made from a card's value shows it too.

## Where cards are managed

| Place | What |
| --- | --- |
| **Gift cards** tracker (Month page, under Recurring) | Total left on usable cards, one row per card with a bar and the date it is valid until, a receipt button (*Spend from this card* opens Add expense with the card chosen), `+` for a new card. Shown once a card exists or the gift card button is on |
| `GiftCardPickerSheet` | **What the gift card button opens** (dock button, widget button, launch target `giftcard`): the cards already added with what is left on each; tapping one opens *Add expense* with that card chosen to pay (`{ type: 'tx', kind: 'expense', giftCardId }`). *Add a new gift card* is the button under the list; used-up or expired cards are listed below, tapping one edits it. With no card yet it explains and offers the same button |
| `GiftCardSheet` | name, value, optional *Valid until*, note; for an existing card the list of entries paid with it |
| **Gift card button** (bottom bar) | Opt-in: Settings > Buttons in the bottom bar > **Gift card** (off by default). Opens the new-gift-card sheet |
| Widgets | `giftcard` is one of the widget actions ([widgets.md](widgets.md)) |

## Files

`src/lib/giftcards.ts` (maths and counting, no JSX), `src/sheets/GiftCardSheet.tsx`, `store.tsx` (`saveGiftCard`, `removeGiftCard`, sanitising of `giftCards` and `Tx.giftCard`), `TxSheet.tsx`, `MonthView.tsx`, `App.tsx` (dock button).

## The button (changed)

The dock button (label **Gift cards**) and the widget button used to open *New gift card*. They now open the picker above (`openSheet({ type: 'giftCards' })`); the sheet type `giftCard` (add / edit) is reached from the picker, from the *+* of the Gift cards tracker and from a card's row on the Month page.

## Order of the gift card sheet

*Name*, *Valid until* (the date), then the *Value*, then the note. The date comes before the amount, as in the entry sheet; the save row sticks to the bottom of the sheet. [entries.md](entries.md)
