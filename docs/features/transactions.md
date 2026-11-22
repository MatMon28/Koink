# Feature: Transactions page

> **Scope:** the full ledger: layout switch, search, filter, entries grouped by month and day.
>
> **Read when:** you change `src/pages/TransactionsView.tsx`.
>
> **Related:** [entries.md](entries.md), [../data-model.md](../data-model.md)

| Block | Behaviour |
| --- | --- |
| Kind chips | **All / Expenses / Income / Savings**, centred **above the search bar**. Remembered as `koink_tx_filter`. Changing the kind clears the category picks of the filter panel |
| Layout switch | the **view type** sits at the **right end of the entries recap line** (below the search bar, hidden in Ultra minimal) as two **icon-only** round buttons, no text (the name is the tooltip and the accessible label): **List** (the default) or **2 days**. Remembered as `koink_tx_view`; a value saved by the removed *Day cards* layout (`days`) falls back to **List** |
| Search field | matches the title, the long note, the account name, the category / source / goal name, and the amount as typed with two decimals (`12.50`). Clear button inside the field |
| Filter button | the round **filter icon next to the search bar** opens a panel (open state remembered as `koink_tx_filter_open`): **Category** chips (multi-pick; only categories that carry entries of the kind shown), **Account** chips (plus *No account*), **From / To** dates and **Amount from / to**. All of it combines with the kind chips and the search text. A badge on the icon says how many groups are on; *Clear filters* resets the panel. The panel is not remembered between visits (only whether it is open) |
| Summary line (recap) | number of matching entries, and their income and expense totals, left-aligned; the layout switch sits at its right end |
| Month sections | entries are split by month, newest first, and **two months are never mixed**: in **List** every month is its own card that starts with a tinted heading (month and year, number of entries, the month's net pill); in **2 days** every month has a heading line (name, rule, count, net pill) above its own grid of day cards. The month's count and net cover every matching entry of that month, not only the days loaded so far. Under it, each day has "Today", "Yesterday" or the date and a pill with the day's net (`income - expenses`; savings are not counted) |
| Row | icon, **category first, the title right below it** (a note icon when the entry has a long note; an entry without a title shows the category only), account, a one-line preview of the long note, signed amount (green `+` income, lilac savings, plain `-` expenses; the original amount in grey when it was paid in another currency). Tapping the text opens the edit sheet |
| Delete | the **bin** at the end of every row deletes at once; a toast offers **Undo** |
| Show older days | 14 day groups are shown at a time |

Empty states: "No entries yet" for an empty journal; "Nothing matches" with a **Show everything** button when a search or filter hides everything.

The list is all months, not the month browsed on the other pages.

### Two days next to each other

`view === 'pair'` (button **2 days**): a plain two-column grid (`grid-cols-2`) per month, newest day on the left and the day before on the right, then the next two, and so on; a month with an odd number of days ends with a half-empty row, and the next month starts a new grid under its own heading. *Show older days* adds 14 more days. Because half a phone screen is narrow, the row inside these cards is the **narrow** variant of `EntryRow`: no icon, category / title / account stacked, the amount under the text, a smaller bin. Everything else (tap to edit, bin to delete with Undo, the day's net pill) is the same. The page-to-page swipe works as usual here (nothing scrolls sideways).

### Removed: Day cards

The sideways scroller layout (*Day cards*, `view === 'days'`, with its arrows, snap scrolling and *Older days* item) is gone together with its texts. Nothing scrolls sideways on this page any more.

Everywhere an entry is listed with its category (this page, the Income and Savings cards of the Month page) the category is the first line and the title the second; inside an expense category card of the Month page the card itself is the category, so the title stays first.

## Basic mode

In [Basic mode](basic-mode.md) the chips are All / Expenses / Income (a stored *Savings* filter counts as All), rows never name an account, and the filter panel has no Account block. The list comes from `txs` (savings entries stay in the journal but are not listed).
