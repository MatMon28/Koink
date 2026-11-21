# Feature: Budgets page

> **Scope:** monthly budgets per category, plus the management lists for savings goals and recurring items. The page can be hidden.
>
> **Read when:** you change `src/pages/BudgetsView.tsx` or `BudgetSheet` in `src/sheets/EditSheets.tsx`.
>
> **Related:** [savings-goals.md](savings-goals.md), [recurring.md](recurring.md), [month.md](month.md)

The page follows the month chosen in the month row (shared with the Month page).

| Block | What it shows |
| --- | --- |
| Budget / Spent | `HeroPair`: the sum of all category budgets and the spending **in budgeted categories**; the pill is what is left (or over) |
| Days left | days remaining in the month, today included |
| Safe / day | budget left divided by days left (a dash without budgets or for a past month) |
| Unplanned | spending in categories that have no budget |
| Needs, Wants, your own types | one card per type (your own only once it has a category); a row per category: name, a green "left" or pink "over" pill, amount, percent of budget, bar. "Set a budget" when there is none. Tap a row to open the budget sheet |
| Savings goals | every goal with its progress; tap to edit, `+` on the right to move money to it, `+` in the title to create one |
| Recurring | every recurring item (the management list), with its frequency; in a month an item is not due its row says *Next Mar* instead of *Log*; `+` in the title to create one ([recurring.md](recurring.md)) |

## Budget sheet (`BudgetSheet`)

Opened from a row here or from the budget bar inside a category card. A banner shows what was spent in the browsed month and what would be left with the amount being typed.

- Amount stepper in steps of 10, chips `+10 / +50 / +100`.
- **Use recent average**: the category's average over the three full months before the current one, rounded up to the next 10.
- **No budget**: sets it to 0, which removes the budget.
- Save calls `setBudget(categoryId, amount)`; budgets live in `profile.budgets`.

A budget is one monthly figure per category: it applies to every month, past ones included. There is no per-month budget history.

## Hiding the page

**Settings > Appearance > Hide the Budgets page** (`settings.hideBudgets`). The page leaves the page pill and the swipe rail (`tabOrder()` in `src/lib/tabs.ts`, kept in step by `syncTabs` in the store); if it was open, the Month page shows instead, and anything that asks for it (a *Budgets* widget button, a reminder, a `?open=budgets` link) lands on the Month page (`activeTab` in `store.tsx`). Budgets themselves are kept, and the category budget bars on the Month page still work. Switch it off to bring the page back.

## Categories on this page

- There is **no Accounts card here any more**: accounts live in the Profile ([accounts.md](accounts.md)).
- Needs / Wants / own-type cards list the live category list (hidden categories only while they carry spending or a budget). **Manage expense categories** under the grid opens the category manager: [categories.md](categories.md).
- The budget sheet starts with the number pad open.
