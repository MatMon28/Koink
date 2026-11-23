# Feature: Budgets page

> **Scope:** monthly budgets per category, plus the management lists for savings goals and recurring items. The page can be hidden.
>
> **Read when:** you change `src/pages/BudgetsView.tsx`, `budgetSummary` in `src/lib/calc.ts` or `BudgetSheet` / `MonthlyBudgetSheet` in `src/sheets/BudgetSheets.tsx`.
>
> **Related:** [savings-goals.md](savings-goals.md), [recurring.md](recurring.md), [month.md](month.md)

The page follows the month chosen in the month row (shared with the Month page).

## From the top

| Block | What it shows |
| --- | --- |
| Budget / Spent | `HeroPair`. **Budget** is the monthly budget when one is set, otherwise the sum of the category budgets. **Spent** is everything spent when a monthly budget is set, otherwise the spending in budgeted categories (`budgetSummary()`). The pill is what is left (or over) |
| Days left | days remaining in the month, today included |
| Safe / day | budget left divided by days left (a dash without budgets or for a past month) |
| Unbudgeted | spending in categories that have no budget (`budgetSummary().unbudgeted`, independent of the monthly budget) |
| **Monthly budget button** | One full-width button: *Set the monthly budget* (or *Monthly budget* once set), a line saying it is at least the sum of the category budgets (or, when not set, that it *is* that sum), the effective budget and an arrow. Opens `MonthlyBudgetSheet` |
| Needs, Wants, your own types | one card per type (your own only once it has a category), see below |
| Savings goals | every goal with its progress; tap to edit, `+` on a goal row moves money to it. Under the title: what is saved (and the targets). `+` in the header creates a goal |
| Recurring | the management list ([recurring.md](recurring.md)); under the title the number of items; `+` in the header creates one |

The old *The figures above cover* block (scope label, unbudgeted chips) and the *Set one monthly budget for everything* line are gone. `budgetSummary` still returns `scope`, `categoryBudget`, `unbudgetedCategories` (used by the Month page's Budget card).

## The monthly budget

- `profile.monthlyBudget`; **0 = not set**, and then the budget is the sum of all category budgets.
- **It can never be smaller than that sum.** `MonthlyBudgetSheet` shows the floor, disables Save (*Too low*) below it and offers *Use the sum* / *Remove it*; the store enforces it as well: `updateProfile` clamps a monthly budget to the sum, and `setBudget` raises an existing monthly budget when category budgets grow past it (the category pop-up warns when that will happen). `budgetSummary` also takes the larger of the two, for journals saved before this rule.
- The Profile sheet's *Monthly budget* field still exists and is clamped the same way.
- It is set only from this page (button) and the Profile; there is no longer a per-page hint line.

## Type cards (Needs, Wants, your own types)

Every card on the page has the same header: the title with a line under it (for a type: the **sum of its category budgets**, or *No budget yet*), at the right the **fold arrow** and, next to it, the **+ button**. Folded or open is remembered per card (`koink_budgets_open_<id>`: `bucket_<bucket>`, `goals`, `recurring`); the + works while folded. The component is `SectionCard` in `BudgetsView.tsx`.

- **+** opens `BudgetSheet` for that type (`{ type: 'budget', bucket }`).
- An open card lists the categories of the type **that have a budget** (a hidden category too, once it has one); with none it says to press +. Each is one tappable field:
  - top row: icon and name at the left; at the right the **budget**, then an arrow (it says the field can be tapped to change the budget);
  - second row: `spent / budget` at the left, the **percentage** of the budget spent at the right;
  - then a **thin bar** (`h-1`). Past 100 % the bar is full, in the alert colour, and a line *Over budget by X* with a warning icon appears.
- Spending in a category without a budget is not listed here: it is the *Unbudgeted* figure.
- *Manage expense categories* is no longer on this page; categories are managed in Settings ([categories.md](categories.md)).

## Budget pop-up (`BudgetSheet`, `src/sheets/BudgetSheets.tsx`)

Opened by a type card's + (`bucket`), by a category field (`categoryId`, which also fixes the type) and by the Month page's budget bar (`categoryId`). Same pad as *Add expense / Add income*:

1. the amount in a rounded box (with a line under it: what is left or over, or what was spent this month), then the **number pad** (`NumPad` with `hideConfirm`: its own confirm button is not shown, Enter still saves);
2. below the pad the **category choice** (`ChoiceGrid`: the categories of the type, one row with a "..." tile, and *New*, which opens the category manager); choosing one loads its current budget;
3. small chips *Use recent average* (the category's average over the three full months before this one, rounded up to 10) and *No budget* (sets 0, which removes the budget);
4. the **Save** button (`SaveRow`), disabled until a category is chosen.

`setBudget(categoryId, amount)`; budgets live in `profile.budgets`. A budget is one monthly figure per category and applies to every month, past ones included.

## Hiding the page

**Settings > Appearance > Hide the Budgets page** (`settings.hideBudgets`). The page leaves the page pill and the swipe rail (`tabOrder()` in `src/lib/tabs.ts`, kept in step by `syncTabs` in the store); if it was open, the Month page shows instead, and anything that asks for it (a *Budgets* widget button, a reminder, a `?open=budgets` link) lands on the Month page (`activeTab` in `store.tsx`). Budgets themselves are kept, and the category budget bars on the Month page still work. Switch it off to bring the page back.

## Basic mode

[Basic mode](basic-mode.md) has no budgets anywhere: no Budgets page (a stored Budgets tab opens Month), no Budget card, no budget row or pill on the category cards, no budget line in the entry sheet, no monthly budget in the Profile. Budgets stay in the data and return in Full.
