# Feature: recurring items

> **Scope:** recurring items (rent, salary, subscriptions, insurance, yearly fees) that are set up once and logged with one tap, every month or every N months.
>
> **Read when:** you change `RecurringEditSheet` in `src/sheets/EditSheets.tsx`, `RecurringSheet` in `src/sheets/QuickSheet.tsx`, `src/components/RecurringRow.tsx`, `recurringDue` / `recurringForMonth` / `nextDueMonth` in `src/lib/calc.ts`, or `logRecurring` in `src/lib/store.tsx`.
>
> **Related:** [entries.md](entries.md), [budgets.md](budgets.md)

A recurring item is a template: `name`, `amount`, `kind` (expense or income), `categoryId`, `day` (1-28), **`every`** (months between two due dates, 1 = monthly, up to 60) and **`start`** (`YYYY-MM`, the month the count starts from). **Nothing is logged automatically.** In every month it is due, the item appears as due until you log it.

## Frequency (every N months)

- `recurringDue(item, month)` (`calc.ts`): monthly items (`every` = 1) are due in every month; others are due when the months since `start` are a multiple of `every` (every 3 from March = Mar, Jun, Sep, Dec) and never before `start`.
- `recurringForMonth(items, month, monthItems)` is the checklist of a month: the items due, plus any already logged there. The **Month page card** and the **dock sheet** use it (banner counts too), so a yearly item only shows in its month.
- The **Budgets page** list shows every item (it is the management list). In a month the item is not due, the row shows **Next Mar** (`nextDueMonth`) instead of *Log*.
- Items saved before this existed load as monthly (`every: 1`, `start` = the current month); older backups load the same way.

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

Kind (Expense / Income), name, amount (each month / each time), category or source, day of the month, **Repeats** (Monthly, Every 2 months, Quarterly, Every 6 months, Yearly, or any number of months with the stepper; from 2 months up, a *First due in* month picker, defaulting to the month being browsed). Days stop at 28 so every month has the day. Delete asks for confirmation; entries already logged stay in the journal.

## Reminder

**Settings > Notifications > Recurring items** sends a notification on the day each item is due (`Rent is due today`), at the time you choose; items due the same day share one. Only **monthly** items get one: the alarm repeats every month and cannot skip, so items with a longer frequency have no reminder (`buildNotificationPlan` filters `every <= 1`). Tapping it opens the checklist on the current month. It is a reminder only: logging still takes your tap. See [../notifications.md](../notifications.md).

## Details

- "Logged this month" = an entry in that month with the item's `recurringId` (`recurringEntry` in `calc.ts`).
- Entries logged from a recurring item carry a small loop icon in lists, and are left out of "Log again" and of the recent-note chips.
- Deleting an item does not delete its entries; they simply keep an id that no longer matches anything.
- The list is kept sorted by day.
