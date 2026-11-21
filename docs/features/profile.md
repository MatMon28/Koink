# Feature: profile and the budget rule

> **Scope:** the sheet behind the person icon: name, all-time balance, and the needs / wants / savings rule.
>
> **Read when:** you change `src/sheets/ProfileSheet.tsx`, `src/sheets/ProfileAccounts.tsx` or how `profile.rule` is used.
>
> **Related:** [month.md](month.md), [statistics.md](statistics.md), [../data-model.md](../data-model.md)

| Block | Behaviour |
| --- | --- |
| Banner | all-time balance (every income minus every expense), the number of entries and the first month with one. Titled with the name when one is set |
| Name | optional, up to 30 characters; used only in that banner |
| Monthly budget | one generic monthly budget for all spending (`profile.monthlyBudget`, 0 = off): amount field with steps of 50 and chips. It becomes the Budget figure on the Budgets and Month pages: [budgets.md](budgets.md#generic-monthly-budget). Sits between the accounts and the rule |
| Budget rule | three rows: Needs, Wants, Savings, each with `-` / `+` in steps of 5 points. A reset button restores 50 / 30 / 20 |
| Save | disabled until the three shares add up to exactly 100; the line under the rows says how many points to add or take off |

## What the rule does

The rule is the target shown after the slash on the Needs / Wants / Savings cards (`10% / 30%`) on the Month and Statistics pages. On the Month page it also decides the corner marks: a warning when needs or wants exceed their share of income, a check when savings reach theirs.

Which bucket a category belongs to is fixed in `src/lib/categories.ts`. The rule does **not** create budgets: category budgets are set separately on the Budgets page.

Stored in `profile.name`, `profile.rule` and `profile.monthlyBudget`, saved with `updateProfile()`.

> **Changed:** the banner shows the total of the accounts (not the all-time balance of the entries) and the **Accounts** block sits between the name and the budget rule. Several accounts, each with the money in it: see [accounts.md](accounts.md#in-the-profile-changed).
