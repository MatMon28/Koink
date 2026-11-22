# Feature: adding and editing entries

> **Scope:** the entry sheet (expense, income, savings), "Log again", toasts and Undo.
>
> **Read when:** you change `src/sheets/TxSheet.tsx`, `QuickSheet` in `src/sheets/QuickSheet.tsx`, or `addTx` / `updateTx` / `removeTx` in `src/lib/store.tsx`.
>
> **Related:** [recurring.md](recurring.md), [savings-goals.md](savings-goals.md), [month.md](month.md)

> **Newest round:** hidden categories can be picked, the category row is three tiles plus a "..." tile, the Title field sits below the date and offers a short list of recent titles when focused (details in *The sheet* below). New file `src/sheets/TitleField.tsx`.

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
2. **Date**: Today, Yesterday, or any date. It has **no caption** (the chips and the date field say what it is; the date input keeps an `aria-label`).
3. **Title**, right **below the date**: the *short* description, optional (the category name is used when empty). It is stored in `Tx.note` (the field used to be called "Note"). Max 60 characters. Nothing sits under it until it is focused; then a **short list of recent titles** (at most 5, each with the amount last paid) opens right below it (`TitleField.tsx`). Typing narrows the list to the titles that contain the text; a tap fills the field and closes the list. **Until the user picks a category** (or the sheet was opened for one: a category card's `+`, a widget, an edit) the list holds the recent titles of *every* category; **once a category is picked** it holds only the titles used in that category. There are no suggestion chips under the field any more.
4. **Amount** (tap to change), after the title. For a foreign amount a second line shows `= converted at 1 USD = 0.92 EUR`; tapping it opens the **rate screen** (pad again, "Use the current rate" resets it). See [currencies.md](currencies.md).
5. **Category / Source / Goal** (**no caption**: the tiles are self-explanatory; the grid keeps its `aria-label`): **one row of four tiles**: the **three most recently used** choices and a fourth tile with **"..."** (and `+N`, the number of others). The "..." tile **replaces the old arrow button** under the grid: pressing it opens the rest, most recent first (never used ones keep the usual order after), plus the **New** tile; pressing it again (*Less*) folds them. A tile chosen in the open list takes the last choice place of the row when it is folded. For goals the row is two goals and the "..." tile. **Hidden categories can be picked too**: for an expense, the list is the visible categories first and the hidden ones after them (most recently used first within each group); choosing one does not show it again anywhere else. For expenses the **New** tile, inside the open list, makes a category on the spot (name, icon, need or want; [categories.md](categories.md)); a category made there goes first. A new entry starts on the category used last, which is the first tile.
6. **Account** (only when accounts exist): **None** or one of them, starting on the last one used; a line shows what the account will hold afterwards ([accounts.md](accounts.md)).
7. **Note**: the *long* text, optional, up to 1000 characters, stored in `Tx.details`. Shown as a small note icon and a one-line preview in the lists.
8. **Save** (disabled until the amount is above zero). In edit mode a delete button sits beside it. The save row is **always visible**: it sticks to the bottom of the sheet (`SaveRow`, `.kc-sticky-footer`), so a long form never needs a scroll to confirm. The save row's background is **transparent** (only the button is solid; the form scrolls visibly behind it). The number pad pages are different: *Confirm amount* (screen 1) and *Use this rate* are plain content under the keys and float above nothing (`NumPad` has no sticky option any more); and for every other sheet's save row (recurring, goal, budget, account, gift card, profile).

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
