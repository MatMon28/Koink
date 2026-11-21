# Feature: accounts

> **Scope:** tracking how much money is in each place (current account, cash, card...).
>
> **Read when:** you change `src/sheets/ProfileAccounts.tsx`, `src/sheets/AccountSheet.tsx`, the Accounts card in `src/pages/BudgetsView.tsx`, `accountBalance` in `src/lib/calc.ts`, or the account row of `TxSheet.tsx`.
>
> **Related:** [entries.md](entries.md), [budgets.md](budgets.md), [../data-model.md](../data-model.md)

> **Gift cards:** an expense paid (partly) with a gift card only takes the rest out of the account (`accountShare`, [gift-cards.md](gift-cards.md)).
>
> **Account sheet fields:** the name field is *Account name*, focused on a new account and marked required; the amount is labelled **Opening balance** (new) or *Balance today* (existing); while the name is empty a hint says why the save button is disabled.

## Model

`AppData.accounts: Account[]` with `{ id, name, icon, opening }` (`icon` is a key of `ICON_CHOICES` in `src/lib/icons.ts`; `opening` may be negative). An entry points at one with `Tx.accountId`; without it the entry belongs to no account and counts nowhere here.

**Balance** = `opening` + income of the account - expenses of the account - money moved to savings from it (`accountBalance`). Accounts are *in addition to* everything else: Month, Budgets and Statistics totals do not change with them.

## Using them

- **Create**: the `+` on the Accounts card (Budgets page) opens `AccountSheet` (`{ type: 'account', id? }`): name, icon, and the balance **today** (with an *In credit / Overdrawn* switch). Because the balance is what you type, the starting balance is computed from it (`opening = typed balance - what the account's entries add up to`), so editing an old account to match your bank statement just works.
- **Log**: when at least one account exists the entry sheet shows an **Account** row (default: the last one used) and what the account will hold afterwards.
- **Delete**: its entries stay, they just lose the link (`removeAccount`).
- Sample data comes with three accounts (starting balances only).

Known limit: there are no transfers between accounts. Fix a balance by editing the account, or log the move as income / expense in the two accounts.

## In the profile (changed)

The Profile sheet no longer shows the all-time balance banner. Its place is taken by **Accounts** (`ProfileAccounts.tsx`): every account is a row with its icon, name and a **balance field**. Type what is really in the account and leave the field (or press Enter): the opening balance is recomputed (`opening = typed - what the entries add up to`, the same rule as `AccountSheet`), so later entries keep moving it. The pencil opens `AccountSheet` to rename, change the icon or delete. *Add account* opens an inline form (name + money in it now). The banner at the top now shows the **total of all accounts**. Edits to accounts apply at once; *Save profile* still saves the name and the budget rule.
