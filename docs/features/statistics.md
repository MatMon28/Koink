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
| Expenses over time | The **expense chart** (`src/components/ExpenseChart.tsx`) over the chosen period. **Chart type**: *Bars* or *Line* (`koink_stats_chart_type`). **Resolution**: per day / week (Monday to Sunday) / month (`koink_stats_chart_res`). **Compare** (`koink_stats_chart_cmp`): *None*, *Period*, *Categories* or *Both* (see below). Type, resolution, Compare and the category chips live in the **settings popup** (the sliders button in the card header); the card itself only shows the read-out and the chart. **Categories** chips pick what is counted (only expenses; income and savings never count). Tap a bar or a point to read it (the line above shows the average per bucket otherwise). A **line is compressed so the whole period fits** the card; bars keep their natural width and scroll sideways, starting at the newest. The **expand button** next to the title opens the **large view** (zoom, landscape, swipe down to close). Collapsible (`koink_stats_chart_open`) |
| Where it went | categories sorted by total, with their share; blue bars are needs, peach are wants. **Collapsible** (`koink_stats_where_open`) |
| Month by month | each month with entries, newest first: net pill, income and spending bars. Tapping one opens the Month page on that month. Collapsible (`koink_stats_months_open`) |

Notes:

- The balance-trend chart is a hand-written SVG (no chart library): a 320 x 120 view box, points are focusable `role="button"` groups with an enlarged hit area.
- The balance trend starts at the first month that has entries, and counts everything before the period into its starting value.
- The weekly-review reminder opens this page ([../notifications.md](../notifications.md)).
- There is no bottom dock here: the button bar belongs to the Month page (`show` in `ActionDock.tsx`, `App.tsx`).
- The expense chart (`ExpenseChart.tsx`, drawn by `ChartPlot.tsx`) is plain HTML + one SVG; the natural slot width per resolution is `SLOT_PX` in `expenseSeries.ts`. `expenseSeries(txs, from, to, resolution, include)` returns every bucket of the span (empty ones too) and stops at 800 buckets. Entries of a deleted category are gathered under the *Other* chip.
- A custom period starting mid-month starts the balance trend from everything dated before the first day.

### Expenses over time: settings popup, compare, large view

- **Settings popup** (`ChartPopup.tsx`, opened by the sliders button in the card header and in the large view): *Chart type*, *Resolution*, *Compare*, *Compare with* (only while a period is compared) and the *Categories* chips. It is a small centred popup over a dimmed page (fade + rise in, fade out), closed by the scrim, the X, *Done*, Escape or Back. In the large view it is drawn inside the view (`inline`), so it turns with it.
- **Compare** is one field with four options (`Compare` in `expenseSeries.ts`; stored in `koink_stats_chart_cmp`, the old values `off` / `periods` are read as *None* / *Period*):
  - *None*: one series, the chosen categories (or all expenses) in the chosen period.
  - *Period*: the period against a second one: **Previous period**, **Same days last year** or **Other dates** (`koink_stats_chart_cfrom` / `koink_stats_chart_cto`); `comparisonPeriod()` does the dates. Slot *n* of the first is lined up with slot *n* of the second. The read-out lists both totals and a difference pill (`+ amount (+ percent)`).
  - *Categories*: one colour per category (`SERIES_COLORS`); the chips are multi-pick, the first chip becomes *Top 3* (nothing picked = the three biggest of the period).
  - *Both*: the same categories **and** the second period at once: every category is drawn twice in its own colour, the period solid and the second period dashed (lighter bars). No difference pill in this mode; the headline total counts the solid series only.
- **Line:** one polyline per series in a single stretched SVG (`preserveAspectRatio="none"`, `vector-effect: non-scaling-stroke`); dots are HTML so they stay round and appear when a slot is at least 12 px wide (or for the tapped one).
- **Axis labels** are thinned to what fits (`visibleLabels`): left to right, a label is kept only if it starts after the last kept one ended; with very narrow day slots only the months are kept (a year on a phone reads *1 Jan, 1 Mar, 1 May...*), zoomed in every day gets its number.
- **Reading a slot:** one transparent `role="slider"` layer over the chart (`ChartPlot`) reads a tap or a mouse hover (line) and the arrow keys / Home / End; the read-out above the chart (a live region) gives the date and every value. No per-slot buttons: that is what keeps 800 slots, zooming and the quarter turn light.
- **Large view** (`ChartLargeView.tsx`, `fixed inset-0`, `z-[80]`, portal into `document.body`, above the dock; shares every choice with the card, which stays underneath, inert):
  - **Zoom** from *Fit* (the whole period, `1x`) up to a slot of 56 px (`maxZoom`: at least 4x, at most 60x). Pinch (two fingers; the point between them stays put), Ctrl / trackpad-pinch or plain wheel over the chart, the **+ / -** buttons (they glide in 230 ms), keys `+`, `-`, `0`, the **Fit** button. Bars start zoomed to their natural width, lines fitted. Drag to move; the chart keeps gliding after a flick.
  - **Landscape:** the rotate button turns the view a quarter (`rotate(90deg)`, a CSS transform: no permission, same in browser, installed app and Android). The view's width and height swap (`100dvh` x `100dvw`), padding follows the safe areas, and the whole change is one 480 ms transition; the data that was in the middle of the chart stays in the middle, frame by frame; the plot stops re-measuring while it animates and measures once at the end. If the phone itself is turned sideways the button disappears (the view already has the room) and the turn is cleared. In landscape the hint line is hidden.
  - **Close:** the X, Escape, Back, or a **swipe down** on the title bar or on the chart (read in the view's own axes, so "down" is the way the text reads, also when turned). The view follows the finger, fades, and either sinks away (past 96 px, or a flick) or springs back. It opens by rising and fading in and closes by sinking and fading out.
  - The read-out is capped at about a third of the height and scrolls; the settings popup scrolls on its own.
- The component takes `txs`, the period (`fromDate`, `toDate`), the categories that have spending (`period.byCategory`) and the set of known category ids from `StatsView.tsx`. Comparison is not part of the period selector at the top: the page cards above the chart still describe the chosen period only.

## Basic mode

In [Basic mode](basic-mode.md) the page is deliberately small: periods **1 / 3 / 6 / 12 months** (no Custom; a stored Custom counts as 6 months), **Income** and **Spent** as plain **totals** of the period (no averages), **Balance trend**, **Where it went** (one colour, no needs / wants legend) and **Month by month**. The Needs / Wants / Savings shares, the Saved / Kept / Per day cards and the *Expenses over time* chart are not shown. Everything is counted from `txs` (no savings entries).
