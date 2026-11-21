# Feature: Budgets page

> **Scope:** monthly budgets per category, plus the management lists for savings goals and recurring items. The page can be hidden.
>
> **Read when:** you change `src/pages/BudgetsView.tsx`, `budgetSummary` in `src/lib/calc.ts` or `BudgetSheet` in `src/sheets/EditSheets.tsx`.
>
> **Related:** [savings-goals.md](savings-goals.md), [recurring.md](recurring.md), [month.md](month.md)

The page follows the month chosen in the month row (shared with the Month page).

| Block | What it shows |
| --- | --- |
| Budget / Spent | `HeroPair`. **With a monthly budget set in the Profile** (below) it is that one amount against **everything spent**; otherwise the sum of all category budgets against the spending **in budgeted categories**. The pill is what is left (or over). A line under it shows the monthly budget (tap: opens the Profile) or invites you to set one |
| Days left | days remaining in the month, today included |
| Safe / day | budget left divided by days left (a dash without budgets or for a past month) |
| Unbudgeted | spending in categories that have no budget (`budgetSummary().unbudgeted`, formerly `unplanned`; independent of the generic budget) |
| Needs, Wants, your own types | one card per type (your own only once it has a category); a row per category: name, a green "left" or pink "over" pill, amount, percent of budget, bar. "Set a budget" when there is none. Tap a row to open the budget sheet |
| Savings goals | every goal with its progress; tap to edit, `+` on the right to move money to it, `+` in the title to create one |
| Recurring | every recurring item (the management list), with its frequency (a weekly item has one row per due date in the month); in a month an item is not due its row says *Next Mar* instead of *Log*; `+` in the title to create one ([recurring.md](recurring.md)) |

## What the headline figure covers

The Budget / Spent pair, the *used* percentage and *Safe / day* measure one of two things, and the page says which (the block under the pair, `BudgetsView`):

| `summary.scope` | Label | Budget | Spent |
| --- | --- | --- | --- |
| `overall` | **Overall monthly budget** | the generic monthly budget (Profile) | everything spent in the month |
| `categories` | **Budgeted categories** | the sum of the category budgets | spending in categories that **have** a budget only |

Spending in categories without a budget is **not** in the percentage in `categories` mode, so the block shows **Unbudgeted spending: X** (always in that mode; in `overall` mode only when there are category budgets, marked *already counted in Spent*) and, below it, up to four chips *Category, amount, Set budget* (`summary.unbudgetedCategories`, biggest first) that open the budget sheet of that category. More than four: *+N more below* (the cards below show *Set a budget* on every such row). The Month page's Budget card has the same label as a small line under the percentage (*Overall monthly budget* / *Budgeted categories*); when unbudgeted spending exists it is a button to the Budgets page (unless that page is hidden). `NoteCard` takes the `hint` and `onClick` props for this.

## Generic monthly budget

**Profile > Monthly budget** (`profile.monthlyBudget`, 0 = off, step 50, chips +500 / +1000 / +2000) is one budget for all spending, on top of the category budgets, which keep working in the cards and category bars. `budgetSummary(profile, totals)` in `calc.ts` switches the Budget figure of this page and the Budget card of the Month page to it. Safe / day uses it too.

## Collapsing the cards

Every card (Needs, Wants, your own types, Savings goals, Recurring) folds shut with a tap on its header or chevron; the **+** of goals / recurring keeps working while folded. Open or closed is remembered per card as `koink_budgets_open_<id>` (`bucket_<bucket>`, `goals`, `recurring`). Folded cards still show their total in the header. The component is `SectionCard` in `BudgetsView.tsx`.

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
