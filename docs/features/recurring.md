# Feature: recurring items

> **Scope:** monthly items (rent, salary, subscriptions) that are set up once and logged with one tap.
>
> **Read when:** you change `RecurringEditSheet` in `src/sheets/EditSheets.tsx`, `RecurringSheet` in `src/sheets/QuickSheet.tsx`, `src/components/RecurringRow.tsx`, or `logRecurring` in `src/lib/store.tsx`.
>
> **Related:** [entries.md](entries.md), [budgets.md](budgets.md)

A recurring item is a template: `name`, `amount`, `kind` (expense or income), `categoryId`, `day` (1-28). **Nothing is logged automatically.** Each month the item appears as due until you log it.

## Where it shows

| Place | What |
| --- | --- |
| Dock, blue button | `RecurringSheet`: the checklist for the browsed month, with a banner ("3 of 7 logged", amount still due) and **New recurring item** |
| Month page, Recurring card | the same checklist inside the card |
| Budgets page, Recurring card | the same checklist |

All three render `RecurringRow`:

- tap the text to edit the item;
- **Log** creates an entry in the browsed month on the item's day (`logRecurring`), linked by `recurringId`, with the usual Undo toast;
- **Done** (green) means it is logged; tapping it removes that entry again.

The row shows the logged entry's amount once logged, so an edited entry (a different electricity bill) is reflected.

## Editing (`RecurringEditSheet`)

Kind (Expense / Income), name, amount each month, category or source, day of the month. Days stop at 28 so every month has the day. Delete asks for confirmation; entries already logged stay in the journal.

## Reminder

**Settings > Notifications > Recurring items** sends a notification on the day each item is due (`Rent is due today`), at the time you choose; items due the same day share one. Tapping it opens the checklist on the current month. It is a reminder only: logging still takes your tap. See [../notifications.md](../notifications.md).

## Details

- "Logged this month" = an entry in that month with the item's `recurringId` (`recurringEntry` in `calc.ts`).
- Entries logged from a recurring item carry a small loop icon in lists, and are left out of "Log again" and of the recent-note chips.
- Deleting an item does not delete its entries; they simply keep an id that no longer matches anything.
- The list is kept sorted by day.
