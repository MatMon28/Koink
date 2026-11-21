# Feature: Statistics page

> **Scope:** totals, averages and trends for this month, the last 3 / 6 / 12 months, or a custom period; an expense chart.
>
> **Read when:** you change `src/pages/StatsView.tsx`.
>
> **Related:** [../data-model.md](../data-model.md), [month.md](month.md). The chart maths is in `src/lib/expenseSeries.ts`.

The 1 / 3 / 6 / 12 month periods always end with the current month. For 3 / 6 / 12 months the cards are **monthly averages** (months without any entry are left out; the caption says how many months have entries). **1 month** (this month) and **Custom** show **totals**, not averages.

| Block | What it shows |
| --- | --- |
| Period | **1 month** / 3 / 6 / 12 months / **Custom**. Remembered as `koink_stats_range`. *Custom* shows two date fields (**From / To**, remembered as `koink_stats_from` / `koink_stats_to`; swapped when reversed; at most 60 months). Only the entries inside those days count, the caption shows the days, and *Per day* divides by the days of the period up to today |
| Income / Spent | monthly **averages** (marked "/ month"), with the average balance pill |
| Needs / Wants / Savings | monthly averages, their share of average income, and the rule's targets |
| Saved | total moved to savings in the period |
| Kept | share of income that was not spent |
| Per day | spending divided by the days elapsed in the months with entries |
| Balance trend | line chart of the running balance (all income minus all expenses so far) at the end of each month. Tap, hover or focus a point to read it; the pill is the change over the period. Collapsible (`koink_stats_trend_open`) |
| Expenses over time | The **expense chart** (`src/components/ExpenseChart.tsx`) over the chosen period. **Chart type**: *Bars* or *Line* (`koink_stats_chart_type`). **Resolution**: per day / week (Monday to Sunday) / month (`koink_stats_chart_res`). **Compare** (`koink_stats_chart_cmp`): *No comparison*, *Periods* or *Categories* (see below). **Categories** chips pick what is counted (only expenses; income and savings never count). Tap a bar or a point to read it (the line above shows the average per bucket otherwise). Many slots scroll sideways, starting at the newest. The **expand button** next to the title opens the chart **full screen**. Collapsible (`koink_stats_chart_open`) |
| Where it went | categories sorted by total, with their share; blue bars are needs, peach are wants. **Collapsible** (`koink_stats_where_open`) |
| Month by month | each month with entries, newest first: net pill, income and spending bars. Tapping one opens the Month page on that month. Collapsible (`koink_stats_months_open`) |

Notes:

- The balance-trend chart is a hand-written SVG (no chart library): a 320 x 120 view box, points are focusable `role="button"` groups with an enlarged hit area.
- The balance trend starts at the first month that has entries, and counts everything before the period into its starting value.
- The weekly-review reminder opens this page ([../notifications.md](../notifications.md)).
- There is no bottom dock here: the button bar belongs to the Month page (`show` in `ActionDock.tsx`, `App.tsx`).
- The expense chart (now `ExpenseChart.tsx`) is plain HTML (a flex row of buttons) so it can scroll sideways at any width; slot widths per resolution are `SLOT_PX` in `expenseSeries.ts`. `expenseSeries(txs, from, to, resolution, include)` returns every bucket of the span (empty ones too) and stops at 800 buckets. Entries of a deleted category are gathered under the *Other* chip.
- A custom period starting mid-month starts the balance trend from everything dated before the first day.

### Expenses over time: comparison, line, full view

- **Line:** one polyline per series in a single stretched SVG (`preserveAspectRatio="none"`, `vector-effect: non-scaling-stroke`, so it fits any width); the dots are HTML so they stay round; with at most 45 slots every point has a dot, with more only the selected one. Hovering or tapping a column of the chart reads that slot (a cursor line marks it).
- **Compare > Periods:** the chosen period is drawn against a second one, which is **Previous period** (the same number of whole months right before, or the same number of days right before when the period is not whole months), **Same days last year**, or **Other dates** (two date fields, `koink_stats_chart_cfrom` / `koink_stats_chart_cto`, swapped when reversed). `comparisonPeriod()` in `expenseSeries.ts` does the dates. Slot *n* of the first period is lined up with slot *n* of the second (a period that is shorter simply ends earlier). Bars are drawn side by side per slot (the second one slightly lighter), lines are solid and dashed. The read-out lists both totals (or both values of the tapped slot, each with its own date) and a difference pill (`+ amount (+ percent)`). Chosen category chips filter both periods.
- **Compare > Categories:** one colour per category (`SERIES_COLORS`), bars side by side per slot or one line each. The chips are multi-pick; the first chip becomes **Top 3** (nothing picked = the three biggest categories of the period). The read-out lists every category's total or value for the tapped slot.
- **Full view:** the expand button opens a `fixed inset-0` layer (`z-[80]`, portal into `document.body`, above the dock) with the same controls and a taller chart (`min(48vh, 28rem)`) at up to `max-w-5xl`. Close it with the shrink button, Escape, or the Back button / gesture (`useBackLayer`, see [../gestures.md](../gestures.md)). The state (type, comparison, picks) is shared with the card on the page, which collapses while the full view is open.
- The component takes `txs`, the period (`fromDate`, `toDate`), the categories that have spending (`period.byCategory`) and the set of known category ids from `StatsView.tsx`. Comparison is not part of the period selector at the top: the page cards above the chart still describe the chosen period only.
