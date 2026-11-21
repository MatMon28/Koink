# Feature: Month page

> **Scope:** the first page: one month at a glance, and the place where most entries are added and edited.
>
> **Read when:** you change `src/pages/MonthView.tsx` or the cards in `src/components/cards.tsx`.
>
> **Related:** [entries.md](entries.md), [recurring.md](recurring.md), [savings-goals.md](savings-goals.md), [../data-model.md](../data-model.md) (how the figures are computed)

Top to bottom:

| Block | Component | What it shows |
| --- | --- | --- |
| Month row | `MonthNavigator` | **first block of the page, above every note and card.** Arrows, a pill that opens a year grid (dots mark months with entries), **Now** when not on the current month; swipeable |
| Sample note | inline in `MonthView` | only while `settings.sampleData` is true: **Start fresh** (confirm, then `eraseAll()`) or dismiss (keeps the data) |
| Empty note | inline | only when the journal has no entries at all |
| Income / Spent | `HeroPair` -> `HeroCard` | the two totals, bars scaled against each other, and the balance pill (`income - spent`) on whichever side is larger |
| Needs / Wants / Savings | `ShareCard` x3 (x4 with a card for your own expense types, *Other types* or the type's name, in a month that has such spending: [categories.md](categories.md#types-besides-needs-and-wants)) | amount, its share of income and the target from the budget rule (`10% / 30%`); a warning triangle when needs or wants pass their target, a check when savings reach theirs. Without income, shares are of everything that went out and no target is shown |
| Left / Per day / Budget | `NoteCard` x3 | `income - spent - saved`; spending divided by the days elapsed; share of the budgeted amount already used |
| Layout switch | inline | Compact / Normal / Expanded |
| Category cards | `FoldCard` (`variant="slot"`) x8 | one per expense category |
| Widgets | `WidgetStrip` | only when *Show them on the Month page* is on ([widgets.md](widgets.md)); between the month row and the hero cards |
| Tracker cards | `FoldCard` (`variant="tracker"`) x3, x4 with gift cards | Income, Savings, Recurring, and **Gift cards** once a card exists or its button is on ([gift-cards.md](gift-cards.md)) |

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

## Changes: gift cards, widgets, blur and pill fixes

- **Gift cards tracker** (fourth tracker, pastel pink): total left, one row per card, spend and add buttons. See [gift-cards.md](gift-cards.md).
- **Widget strip** above the cards when switched on. See [widgets.md](widgets.md).
- **Category-card pills no longer clip** (Compact layout, narrow phones): the three pills (entries, share, budget left) used to shrink with `min-w-0` + `truncate` until a long figure such as `-€1,234` showed as `-€...` and the entry count as a cut-off glyph. In `Pills` (`cards.tsx`) with `stretch` the row now wraps (`flex-wrap`), each pill keeps its full text (`whitespace-nowrap`, `max-w-full`) and the third pill drops to a second line when it does not fit.
- **Blurred hero cards fixed**: on Android the Income / Spent cards could appear smeared under the header. Every `backdrop-filter` in the header area is gone (the header surface, the floating page pill, and in *Aurora* the pill and header buttons); the floating pill is now 92 % solid instead of a 76 % glass; `.kc-header-surface *` and the hero cards (`.kc-crisp`) can never filter; the header's faded-out background layer is `visibility: hidden` (not just transparent) and no longer a `will-change` layer. Reproduced only from the screenshot, not on a device: if it ever returns, look first for a `backdrop-filter` / `filter` / `will-change` on anything that overlaps the hero cards.
- **Savings uses the Koink pig** (`PigIcon`, [../brand.md](../brand.md#the-pig-icon)).

## Behaviour notes

- Changing the month slides the content sideways (forward in time comes from the right).
- A changed total replays a short settle-in (`anim-value`).
- Figures in cards go through `moneyFit`, which shortens very large amounts instead of clipping them; in Compact the headline's type size also steps down with its length.
- The whole card header toggles on click; the chevron is the real `<button aria-expanded>` for keyboards and screen readers.

## Changes in this version

- **Order of the hero block**: the yellow cards (**Left**, **Per day**, **Budget**) now sit directly under Income / Spent; the **Needs / Wants / Savings** split comes after them.
- **Hide the split**: Settings > Appearance > *Hide needs, wants and savings* (`settings.hideSplit`). The old *Hide* button and *Show...* pill on this page are gone. Ultra minimal hides the label row. A journal that had the old localStorage choice (`koink_month_split_hidden`) is migrated on first load.
- **Category pills** are neutral grey with an icon and, outside Compact, a word: *receipt* `3 entries`, *pie* `42% of spending`, *wallet* `€40 left` (red `over` when the budget is exceeded). They used to be blue, orange and purple, the colours of Needs / Wants / Savings, which made them look related. Only the red "over budget" pill keeps a colour. (`Pills` / `PillItem` in `cards.tsx`.)
- **Category cards** come from the live list (`categories.ts`): hidden categories only show while they have entries this month, and entries of a *deleted* custom category are gathered in an **Other** card so the cards still add up. See [categories.md](categories.md).

## Card styles swapped

`NoteCard` (Left, Per day, Budget; also Days left / Safe per day / Unplanned on Budgets and Saved / Kept / Per day on Statistics) now wears the pastel, tall card the shares used to have (`kc-macro-*` colours, `tone` prop: `needs` blue, `wants` amber, `savings` purple). `ShareCard` (Needs, Wants, Savings) now wears the small yellow note card (`bg-nutrient`) with its share line under the amount. Both live in `src/components/cards.tsx`; the status icons (target reached / over) stay on the share cards.
