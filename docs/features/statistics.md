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
| Expenses over time | **Expense chart**: bars of spending per **day / week (Monday to Sunday) / month** (*Resolution*, `koink_stats_chart_res`) over the chosen period. **Categories** chips pick what is counted: *All expenses*, or one or more categories (only expenses; income and savings never count). Tap a bar to read its period and amount (the line above shows the average per bucket otherwise). Many bars scroll sideways, starting at the newest. Collapsible (`koink_stats_chart_open`) |
| Where it went | categories sorted by total, with their share; blue bars are needs, peach are wants. **Collapsible** (`koink_stats_where_open`) |
| Month by month | each month with entries, newest first: net pill, income and spending bars. Tapping one opens the Month page on that month. Collapsible (`koink_stats_months_open`) |

Notes:

- The balance-trend chart is a hand-written SVG (no chart library): a 320 x 120 view box, points are focusable `role="button"` groups with an enlarged hit area.
- The balance trend starts at the first month that has entries, and counts everything before the period into its starting value.
- The weekly-review reminder opens this page ([../notifications.md](../notifications.md)).
- The bottom dock is shown here too (always visible on every page, `hasDock` in `App.tsx`).
- The expense chart is plain HTML (a flex row of buttons) so it can scroll sideways at any width; slot widths per resolution are `SLOT_PX` in `expenseSeries.ts`. `expenseSeries(txs, from, to, resolution, include)` returns every bucket of the span (empty ones too) and stops at 800 buckets. Entries of a deleted category are gathered under the *Other* chip.
- A custom period starting mid-month starts the balance trend from everything dated before the first day.
