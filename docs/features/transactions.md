# Feature: Transactions page

> **Scope:** the full ledger: search, filter, entries grouped by day.
>
> **Read when:** you change `src/pages/TransactionsView.tsx`.
>
> **Related:** [entries.md](entries.md), [../data-model.md](../data-model.md)

| Block | Behaviour |
| --- | --- |
| Search field | matches the note, the category / source / goal name, and the amount as typed with two decimals (`12.50`). Clear button inside the field |
| Filter | All / Expenses / Income / Savings. Remembered as `koink_tx_filter` |
| Summary line | number of matching entries, and their income and expense totals |
| Day cards | newest day first: "Today", "Yesterday" or the date; a pill with the day's net (`income - expenses`; savings are not counted); one row per entry |
| Row | icon, note, category (a small loop marks an entry logged from a recurring item), signed amount: green `+` for income, lilac for savings, plain `-` for expenses. Tapping it opens the edit sheet |
| Show older days | 14 day groups are shown at a time |

Empty states: "No entries yet" for an empty journal; "Nothing matches" with a **Show everything** button when a search or filter hides everything.

The list is all months, not the month browsed on the other pages. Day cards are in two columns from 768 px. The bottom dock is available here, so entries can be added without leaving the page.
