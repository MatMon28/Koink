# Feature: savings goals

> **Scope:** goals, moving money to them, and how savings are counted.
>
> **Read when:** you change `GoalSheet` in `src/sheets/EditSheets.tsx`, the Savings cards, or `goalSaved` in `src/lib/calc.ts`.
>
> **Related:** [entries.md](entries.md), [budgets.md](budgets.md), [profile.md](profile.md)

A goal is a name and a target (`0` = an open-ended pot). Money "moved to savings" is an entry of kind `saving` whose `categoryId` is the goal's id.

## How savings are counted

- Savings are **not spending**: they do not appear in Spent, in budgets or in "Where it went".
- They are a share of income on the Needs / Wants / Savings cards, compared with the rule's savings target.
- They reduce **Left** (`income - spent - saved`) but not the balance pill or the balance trend (`income - spent`): the money is still yours.
- A goal's progress is everything ever moved to it, all months (`goalSaved`).

## Where it shows

| Place | What |
| --- | --- |
| Dock, lilac button | Move to savings (or the new-goal sheet when there are no goals) |
| Month page, Savings card | month total; each goal with a bar and `+`; the month's saving entries |
| Budgets page, Savings goals card | each goal with percent / "Reached" / "Open", a bar, `+` to add money, title `+` to create |

## Goal sheet (`GoalSheet`)

Name and target (stepper in steps of 50, chips `+100 +500 +1000`). When editing: a banner with what is saved so far and what is left to go, a **Move money to this goal** button (switches to the entry sheet), and delete with confirmation.

Deleting a goal keeps the money already moved: those entries stay in the journal as savings and show under the generic name "Savings".

There is no "withdraw" entry. To take money back out, edit or delete the saving entry.
