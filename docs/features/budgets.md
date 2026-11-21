# Feature: Budgets page

> **Scope:** monthly budgets per category, plus the management lists for savings goals and recurring items.
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
| Needs, Wants | one card per bucket; a row per category: name, a green "left" or pink "over" pill, amount, percent of budget, bar. "Set a budget" when there is none. Tap a row to open the budget sheet |
| Savings goals | every goal with its progress; tap to edit, `+` on the right to move money to it, `+` in the title to create one |
| Recurring | the same checklist as on the Month page; `+` in the title to create one |

## Budget sheet (`BudgetSheet`)

Opened from a row here or from the budget bar inside a category card. A banner shows what was spent in the browsed month and what would be left with the amount being typed.

- Amount stepper in steps of 10, chips `+10 / +50 / +100`.
- **Use recent average**: the category's average over the three full months before the current one, rounded up to the next 10.
- **No budget**: sets it to 0, which removes the budget.
- Save calls `setBudget(categoryId, amount)`; budgets live in `profile.budgets`.

A budget is one monthly figure per category: it applies to every month, past ones included. There is no per-month budget history.
