# Feature: Month page

> **Scope:** the first page: one month at a glance, and the place where most entries are added and edited.
>
> **Read when:** you change `src/pages/MonthView.tsx` or the cards in `src/components/cards.tsx`.
>
> **Related:** [entries.md](entries.md), [recurring.md](recurring.md), [savings-goals.md](savings-goals.md), [../data-model.md](../data-model.md) (how the figures are computed)

Top to bottom:

| Block | Component | What it shows |
| --- | --- | --- |
| Sample note | inline in `MonthView` | only while `settings.sampleData` is true: **Start fresh** (confirm, then `eraseAll()`) or dismiss (keeps the data) |
| Empty note | inline | only when the journal has no entries at all |
| Month row | `MonthNavigator` | arrows, a pill that opens a year grid (dots mark months with entries), **Now** when not on the current month; swipeable |
| Income / Spent | `HeroPair` -> `HeroCard` | the two totals, bars scaled against each other, and the balance pill (`income - spent`) on whichever side is larger |
| Needs / Wants / Savings | `ShareCard` x3 | amount, its share of income and the target from the budget rule (`10% / 30%`); a warning triangle when needs or wants pass their target, a check when savings reach theirs. Without income, shares are of everything that went out and no target is shown |
| Left / Per day / Budget | `NoteCard` x3 | `income - spent - saved`; spending divided by the days elapsed; share of the budgeted amount already used |
| Layout switch | inline | Compact / Normal / Expanded |
| Category cards | `FoldCard` (`variant="slot"`) x8 | one per expense category |
| Tracker cards | `FoldCard` (`variant="tracker"`) x3 | Income, Savings, Recurring |

## Category card

Header: icon, name, `+` (opens Add expense with that category chosen), chevron. Under it the month's total and three numeric pills: number of entries, share of the month's spending, budget left (red pill when over, a dash when the category has no budget). Open, it lists:

- a budget row with a bar, when a budget is set (tap = budget sheet);
- each entry (`TxRow`): note, day, amount; tap the text or the pencil to edit, the bin to delete (with Undo in the toast).

## Tracker cards

- **Income:** the month's income and its sources; entries inside.
- **Savings:** the month's savings; inside, every goal with its all-time progress bar and a `+`, then the month's saving entries. With no goals, `+` opens the new-goal sheet.
- **Recurring:** `logged / total` and what is still due; inside, the checklist ([recurring.md](recurring.md)).

In the Classic style these three keep their own pastel (green, lilac, blue); in the presets they take the preset's card look.

## Layouts

| Layout | Behaviour |
| --- | --- |
| Normal | one card per row (two from 768 px); each card opens on its own |
| Compact | two per row (three from 768 px), name hidden, pills under the figure; choosing it closes every card; an opened card spans the row on phones |
| Expanded | everything open; closing one card switches to Normal and keeps the others open |

With **Ultra minimal** on, the page is always Compact, the layout switch is hidden and labels become icons ([ultra-minimal.md](ultra-minimal.md)).

Remembered in `localStorage`: `koink_month_layout`, `koink_month_open`, `koink_month_trackers_open` (Recurring starts open).

## Behaviour notes

- Changing the month slides the content sideways (forward in time comes from the right).
- A changed total replays a short settle-in (`anim-value`).
- Figures in cards go through `moneyFit`, which shortens very large amounts instead of clipping them; in Compact the headline's type size also steps down with its length.
- The whole card header toggles on click; the chevron is the real `<button aria-expanded>` for keyboards and screen readers.
