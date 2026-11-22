# Feature: Basic mode

> **Scope:** the Basic / Full mode: the first-launch chooser, the Settings switch, and what Basic hides on every screen.
>
> **Read when:** you add a screen, a card, a field or a setting (decide whether it exists in Basic), or touch `mode`, `modeChosen` or `basic`.
>
> **Related:** [month.md](month.md), [transactions.md](transactions.md), [statistics.md](statistics.md), [categories.md](categories.md), [settings.md](settings.md), [profile.md](profile.md), [ultra-minimal.md](ultra-minimal.md)

Basic is the same journal seen through a smaller app: **income and expenses only**. Nothing is deleted or converted when the mode changes; budgets, goals, accounts, recurring items and savings entries stay in the data and come back in Full.

## Choosing the mode

| When | How |
| --- | --- |
| First launch | `ModeChooser` (`src/components/ModeChooser.tsx`), a full-screen dialog with two cards, Basic and Full, mounted at the end of `Shell` (`App.tsx`). It shows while `settings.modeChosen` is false and stays until one is picked. |
| Later | Settings > **Mode** (right under Language), the same two cards (`ModeSetting`). Instant, no confirmation: it only changes what is shown. |

State: `settings.mode` (`'basic' | 'full'`, `types.ts`) and `settings.modeChosen`.

- A new journal starts `mode: 'full'`, `modeChosen: false`.
- A stored journal or backup **from before modes existed** loads as Full with `modeChosen: true` (nobody is asked about a journal they already use). A backup that carries `mode` keeps it.
- *Delete all data* keeps the mode; *Load the sample journal* keeps it too.
- The guided tour's embedded journal (`?tour=1`) always runs as Full and never shows the chooser (`inTourEmbed()` in `src/lib/mode.ts`), so the tour can still show every page.

## One flag

`useApp()` returns `basic` (`mode === 'basic'` and not in the tour) and `txs` (the entries the mode shows: in Basic, without `saving` entries; in Full, all). Screens ask `basic`; they never read `settings.mode` themselves (only the Settings switch does). Plain functions in `src/lib/` read it through `isBasic()` (`mode.ts`, pushed in by the store with `syncMode()`, like `syncCategories` and `syncTabs`).

Use `txs`, not `data.txs`, for anything a Basic user sees (totals, lists, statistics). Use `data.txs` for anything that must be complete (backup, Excel, account balances, the currency lock).

## What Basic shows

| Screen | In Basic |
| --- | --- |
| Pages | **Month, Transactions, Statistics.** Budgets is out of the page pill and the swipe order (`syncTabs(hideBudgets \|\| basic)`), and a stored Budgets tab opens Month. The *Hide the Budgets page* switch is hidden. |
| Button bar | Income and expense only. Recurring, Log again, Savings and Gift cards are off whatever *Buttons in the bottom bar* says (that section is hidden). |
| Month | Income / Spent, then **Left** and **Per day** (no Budget card), no Needs / Wants / Savings cards, no layout switch (always Normal; Ultra minimal still forces Compact), no widget strip. Category cards: entries and share pills, no budget pill or budget row. Only the **Income** tracker (no Savings, Recurring, Gift cards). |
| Transactions | chips All / Expenses / Income (no Savings, a saved Savings filter counts as All); no account on rows, no account filter or account search. |
| Statistics | Income and Spent (**totals** for the period, never averages), then **Balance trend**, **Where it went** (one colour, no needs / wants legend) and **Month by month**. Periods 1 / 3 / 6 / 12 months, no Custom. No Saved / Kept / Per day cards, no needs / wants / savings shares, no *Expenses over time* chart. |
| Entry sheet | no account picker (one account; an entry keeps the account it already has), no gift card, no budget line, no *Counts as* when creating a category. |
| Profile | name and a **Balance** banner (what was in the accounts at the start + income - expenses). No accounts, monthly budget or budget rule. |
| Settings | Mode, Appearance (without *Hide needs, wants and savings* and *Hide the Budgets page*), Currency, Expense categories (one flat list, no types), Notifications (no recurring reminder; the new-month note is about logging, not budgets), Your data, Delete all data. No *Buttons in the bottom bar*, no Widgets. Texts that mention budgets, goals or accounts have a Basic wording. |
| Reminders | the recurring reminder is not planned; the *New month* reminder opens Statistics instead of Budgets. |
| Widgets | the Month-page strip is hidden. Android home widgets keep the buttons chosen in Full; a button that needs a Full screen (savings, quick log, recurring, gift cards, budgets) lands on Month. |
| Launch links and notifications | `?open=recurring`, `?open=giftcard` and `budgets` land on Month. |

Not changed on purpose: Excel export and backups always hold the whole journal (the Excel sheets for budgets, goals and accounts are simply empty for a Basic-only journal).

## Default categories

The five default expense categories are **House, Food, Health, Fun, Others** ([categories.md](categories.md)); the other built-in ones (Transport, Bills, Eating out, Shopping) are hidden in a new journal and can be shown again in Settings > Expense categories. This applies to both modes.

## Adding something new

1. Decide if it exists in Basic. If not, hide it with `basic` from `useApp()` (JSX) or `isBasic()` (lib).
2. Feed anything a Basic user sees from `txs`.
3. Add the Italian text of a Basic-only wording to `src/lib/i18n.it.ts`.
4. Update the table above.
