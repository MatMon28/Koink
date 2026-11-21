# Feature: Transactions page

> **Scope:** the full ledger: search, filter, entries grouped by day.
>
> **Read when:** you change `src/pages/TransactionsView.tsx`.
>
> **Related:** [entries.md](entries.md), [../data-model.md](../data-model.md)

| Block | Behaviour |
| --- | --- |
| Search field | matches the title, the long note, the account name, the category / source / goal name, and the amount as typed with two decimals (`12.50`). Clear button inside the field |
| Filter | All / Expenses / Income / Savings. Remembered as `koink_tx_filter` |
| Summary line | number of matching entries, and their income and expense totals |
| Layout switch | **List** (one card, day headings inside, the default), **2 days** (two day cards next to each other, two columns on every screen) or **Days** (one card per day in a sideways scroller). Remembered as `koink_tx_view` |
| Day cards | newest day first: "Today", "Yesterday" or the date; a pill with the day's net (`income - expenses`; savings are not counted); one row per entry |
| Row | icon, **category first, the title right below it** (a note icon when the entry has a long note; an entry without a title shows the category only), account, a one-line preview of the long note, signed amount (green `+` income, lilac savings, plain `-` expenses; the original amount in grey when it was paid in another currency). Tapping the text opens the edit sheet |
| Delete | the **bin** at the end of every row deletes at once; a toast offers **Undo** |
| Show older days | 14 day groups are shown at a time |

Empty states: "No entries yet" for an empty journal; "Nothing matches" with a **Show everything** button when a search or filter hides everything.

The list is all months, not the month browsed on the other pages.

### Days side by side

`TransactionsView.tsx`, `view === 'days'`: a horizontal scroller (`snap-x`, `no-scrollbar`, `data-no-swipe`). On a phone a card is 85 % of the width, so the next day peeks in and a finger swipe moves from day to day; the page-to-page swipe is switched off over the scroller (`data-no-swipe`), the header pill still changes page. From 480 px a card is 22 rem wide; from 768 px two arrow buttons scroll by about one card. "Older days" is the last item of the scroller. The bottom dock is available here, so entries can be added without leaving the page.

### Two days next to each other

`view === 'pair'` (button **2 days**): a plain two-column grid (`grid-cols-2`), newest day on the left and the day before on the right, then the next two, and so on; *Show older days* adds 14 more days (an even number, so the pairs stay whole). Because half a phone screen is narrow, the row inside these cards is the **narrow** variant of `EntryRow`: no icon, category / title / account stacked, the amount under the text, a smaller bin. Everything else (tap to edit, bin to delete with Undo, the day's net pill) is the same. The page-to-page swipe works as usual here (nothing scrolls sideways).

Everywhere an entry is listed with its category (this page, the Income and Savings cards of the Month page) the category is the first line and the title the second; inside an expense category card of the Month page the card itself is the category, so the title stays first.
