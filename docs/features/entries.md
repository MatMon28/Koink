# Feature: adding and editing entries

> **Scope:** the entry sheet (expense, income, savings), "Log again", toasts and Undo.
>
> **Read when:** you change `src/sheets/TxSheet.tsx`, `QuickSheet` in `src/sheets/QuickSheet.tsx`, or `addTx` / `updateTx` / `removeTx` in `src/lib/store.tsx`.
>
> **Related:** [recurring.md](recurring.md), [savings-goals.md](savings-goals.md), [month.md](month.md)

## Ways in

| From | Opens |
| --- | --- |
| Bottom dock (green, pink, lilac buttons) | Add income / Add expense / Move to savings |
| `+` on a category card | Add expense with that category chosen |
| `+` on a goal | Move to savings with that goal chosen |
| Any entry row (Month, Transactions) | the same sheet in edit mode |
| Home-screen shortcut (`?add=expense`, `?add=income`) | the add sheet at launch ([../pwa.md](../pwa.md)) |
| The daily reminder notification | Add expense ([../notifications.md](../notifications.md)) |

All of them call `openSheet({ type: 'tx', kind, categoryId?, editId? })`.

## The sheet (`TxSheet` -> `TxForm`)

1. **Banner**: what the month (or goal) will look like with this entry counted in: the category's total and budget left, the month's income, or the goal's progress. It updates as you type.
2. **Amount**: stepper with hold-to-repeat and quick chips (expense `+5 +10 +20 +50`, income `+50 +100 +500 +1000`, savings `+10 +50 +100 +500`). Accepts a comma as the decimal sign, at most two decimals. On a device with a mouse the field is focused when a new entry opens.
3. **Category / Source / Goal**: icon tiles. A new entry starts on the one used last for that kind.
4. **Note**: optional (the category name is used when empty). Chips under it offer the last four notes used in this category; tapping one fills the note and, if the amount is still empty, its last amount. Enter saves.
5. **Date**: Today, Yesterday, or any date. A new entry defaults to today, or to a day inside the month being browsed when that is not the current month.
6. **Save** (disabled until the amount is above zero). In edit mode a delete button sits beside it.

Moving to savings with no goals shows a prompt to create one first.

### Unsaved input

Dismissing the sheet (scrim, swipe down, X, Escape, Back) with something typed, or with an existing entry changed, opens **Save this entry?** (`SaveBeforeCloseDialog` in `ui.tsx`) instead of closing: **Save**, **Don't save**, **Keep editing**. Without an amount there is nothing to save, so only the last two are offered. Dismissing the question itself keeps editing. An untouched form closes at once. The form reports `{ dirty, valid, save }` to its sheet through a ref (`FormGuard` in `TxSheet.tsx`).

## Log again (`QuickSheet`)

The lightning button in the dock. Lists up to ten entries that were logged by hand **more than once** with the same kind, category and note, most frequent first, with the most recent amount (`frequentEntries` in `calc.ts`). One tap logs it again, dated today, and the sheet stays open for the next one.

## Toasts and Undo (`ToastHost` in `ui.tsx`)

Adding an entry shows `note - amount - day` with **Undo** (removes it). Deleting shows "Deleted ..." with **Undo** (puts it back). Toasts with an action stay 5.2 s, others 2.8 s; a new toast replaces the current one. Editing has no toast.

## Rules in the store

- Amounts are rounded to two decimals and are always positive; `kind` carries the direction.
- `txs` is kept sorted newest day first, then newest created first (`sortTxs`).
- Ids are generated locally (`uid()`); there is nothing to sync.
