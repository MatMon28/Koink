# Feature: adding and editing entries

> **Scope:** the entry sheet (expense, income, savings), "Log again", toasts and Undo.
>
> **Read when:** you change `src/sheets/TxSheet.tsx`, `QuickSheet` in `src/sheets/QuickSheet.tsx`, or `addTx` / `updateTx` / `removeTx` in `src/lib/store.tsx`.
>
> **Related:** [recurring.md](recurring.md), [savings-goals.md](savings-goals.md), [month.md](month.md)

> **Gift cards (added):** for an expense, *Pay with a gift card* sits between Account and Title. Details: [gift-cards.md](gift-cards.md). The amount field on the second screen now has a visible **Change** chip next to the currency (it used to be a bare pencil icon).

## Ways in

| From | Opens |
| --- | --- |
| Bottom dock (green, pink, lilac buttons) on the **Month page** (pinned, never hides on scroll; not on the other pages) | Add income / Add expense / Move to savings |
| `+` on a category card | Add expense with that category chosen |
| `+` on a goal | Move to savings with that goal chosen |
| Any entry row (Month, Transactions) | the same sheet in edit mode |
| Home-screen shortcut (`?add=expense`, `?add=income`) | the add sheet at launch ([../pwa.md](../pwa.md)) |
| The daily reminder notification | Add expense ([../notifications.md](../notifications.md)) |

All of them call `openSheet({ type: 'tx', kind, categoryId?, editId? })`.

## The sheet (`TxSheet` -> `TxForm`)

A new entry is two screens, so the phone's keyboard never covers the sheet while the amount is typed.

**Screen 1, the amount.** A big figure and a **number pad** (`NumPad`, `useAmountBuffer` in `ui.tsx`: digits, decimal point, backspace; a long press on backspace clears). On a computer the physical keyboard types into the open pad (digits, `.`/`,`, Backspace, Enter). The **currency chip** (top right, `EUR` ...) swaps the pad for the list of all currencies: the entry can be paid in another one. The **Confirm amount** button (coloured by kind) goes on to screen 2. An existing entry opens straight on screen 2; tapping its amount comes back to the pad.

**Screen 2, everything else:**

1. **Banner**: what the month (or goal) will look like with this entry counted in.
2. **Date**: Today, Yesterday, or any date. It comes *before* the amount.
3. **Amount** (tap to change). For a foreign amount a second line shows `= converted at 1 USD = 0.92 EUR`; tapping it opens the **rate screen** (pad again, "Use the current rate" resets it). See [currencies.md](currencies.md).
4. **Category / Source / Goal**: **one row** of icon tiles, the most recently used first (4 per row; 3 goals), and a **Show all · N** button that opens the others, again most recent first (never used ones keep the usual order after). A tile chosen in the open list takes the last place of the row when it is folded. Hidden categories are not offered (an entry already in one keeps it). For expenses the **New** tile, inside the open list, makes a category on the spot (name, icon, need or want; [categories.md](categories.md)); a category made there goes first. A new entry starts on the category used last, which is the first tile.
5. **Account** (only when accounts exist): **None** or one of them, starting on the last one used; a line shows what the account will hold afterwards ([accounts.md](accounts.md)).
6. **Title**: the *short* description, optional (the category name is used when empty). This field used to be called "Note"; it is stored in `Tx.note`. Chips under it offer the last four titles used in this category. Max 60 characters.
7. **Note**: the *long* text, optional, up to 1000 characters, stored in `Tx.details`. Shown as a small note icon and a one-line preview in the lists.
8. **Save** (disabled until the amount is above zero). In edit mode a delete button sits beside it. The save row is **always visible**: it sticks to the bottom of the sheet (`SaveRow`, `.kc-sticky-footer`), so a long form never needs a scroll to confirm. The same goes for the *Confirm amount* key of the number pad (screen 1, `NumPad stickyConfirm`) and *Use this rate*, and for every other sheet's save row (recurring, goal, budget, account, gift card, profile).

Moving to savings with no goals shows a prompt to create one first.

Other values (budgets, goal targets, recurring amounts, balances, the day of the month) use `AmountStepper`, whose figure is a button that opens the same number pad under it: no field ever raises the keyboard. `startOpen` shows the pad at once.

### Unsaved input

Dismissing the sheet (scrim, swipe down, X, Escape, Back; a swipe down springs back first, `canClose` in `Modal.tsx`) with something typed, or with an existing entry changed, opens **Save this entry?** (`SaveBeforeCloseDialog` in `ui.tsx`) instead of closing: **Save**, then **Keep editing** (left) and **Don't save** (right, in red). Both are translated (*Non salvare*). Without an amount there is nothing to save, so only the last two are offered. Dismissing the question itself keeps editing. An untouched form closes at once. The form reports `{ dirty, valid, save }` to its sheet through a ref (`FormGuard` in `TxSheet.tsx`).

## Log again (`QuickSheet`)

The lightning button in the dock. Lists up to ten entries that were logged by hand **more than once** with the same kind, category and note, most frequent first, with the most recent amount (`frequentEntries` in `calc.ts`). One tap logs it again, dated today, and the sheet stays open for the next one.

## Toasts and Undo (`ToastHost` in `ui.tsx`)

Adding an entry shows `note - amount - day` with **Undo** (removes it). Deleting shows "Deleted ..." with **Undo** (puts it back). Toasts with an action stay 5.2 s, others 2.8 s; a new toast replaces the current one. Editing has no toast.

## Rules in the store

- Amounts are rounded to two decimals and are always positive; `kind` carries the direction. `Tx.amount` is always in the journal's currency; a foreign payment keeps what was paid in `Tx.foreign`.
- `txs` is kept sorted newest day first, then newest created first (`sortTxs`).
- Ids are generated locally (`uid()`); there is nothing to sync.
