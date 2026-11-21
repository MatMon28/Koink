# Feature: Statistics page

> **Scope:** averages and trends over the last 3, 6 or 12 months.
>
> **Read when:** you change `src/pages/StatsView.tsx`.
>
> **Related:** [../data-model.md](../data-model.md), [month.md](month.md)

The period always ends with the current month. Months without any entry are left out of the averages (the caption says how many months have entries).

| Block | What it shows |
| --- | --- |
| Period | 3 / 6 / 12 months. Remembered as `koink_stats_range` |
| Income / Spent | monthly **averages** (marked "/ month"), with the average balance pill |
| Needs / Wants / Savings | monthly averages, their share of average income, and the rule's targets |
| Saved | total moved to savings in the period |
| Kept | share of income that was not spent |
| Per day | spending divided by the days elapsed in the months with entries |
| Balance trend | line chart of the running balance (all income minus all expenses so far) at the end of each month. Tap, hover or focus a point to read it; the pill is the change over the period. Collapsible (`koink_stats_trend_open`) |
| Where it went | categories sorted by total, with their share; blue bars are needs, peach are wants |
| Month by month | each month with entries, newest first: net pill, income and spending bars. Tapping one opens the Month page on that month. Collapsible (`koink_stats_months_open`) |

Notes:

- The chart is a hand-written SVG (no chart library): a 320 x 120 view box, points are focusable `role="button"` groups with an enlarged hit area.
- The balance trend starts at the first month that has entries, and counts everything before the period into its starting value.
- The weekly-review reminder opens this page ([../notifications.md](../notifications.md)).
- The bottom dock is shown here too (always visible on every page, `hasDock` in `App.tsx`).
