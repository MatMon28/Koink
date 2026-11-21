# Feature: Ultra minimal

> **Scope:** the Settings > Appearance switch that replaces labels with icons and tightens the pages.
>
> **Read when:** you add a label, a hint or a card to a page, or change how the mode is applied.
>
> **Related:** [themes.md](themes.md), [month.md](month.md), [../design-system.md](../design-system.md)

`settings.ultraMinimal` (off by default). It combines with every theme and style preset.

## What changes

| Place | Normal | Ultra minimal |
| --- | --- | --- |
| Page pill (header) | the active page shows icon + name | icons only; the active page is a filled circle |
| Month row | `November 2026` with a chevron; `Now` button | a calendar icon for the current month, `MM/YY` for any other; `Now` is an arrow |
| Income / Spent, Budget / Spent | a text label above the figure | an icon instead (banknote, receipt, target); tighter padding, centred figure |
| Needs / Wants / Savings | name, amount, `41% / 50%` | house / sparkles / piggy-bank icon, amount, `41%` (the target is dropped) |
| Yellow note cards | name above the value | an icon above the value |
| Month page layout | Compact / Normal / Expanded | always Compact; the switch is hidden. The layout chosen before comes back when the mode is switched off |
| Empty category cards | `Nothing yet` | nothing (the `€0` is enough) |
| Transactions rows | note, category under it | note only (the icon already shows the category) |
| Statistics | caption line, section titles, "Tap a month" hint | no caption or hint; an icon instead of each section title |
| Budgets | helper sentences in empty sections | removed |
| Vertical rhythm | 14-16 px between blocks | 10 px |

Sheets, the dock, toasts and Settings itself do not change. Nothing is removed for screen readers: every hidden label is still there (visually hidden), and cards keep their `aria-label`.

## How it is applied

1. The switch calls `updateSettings({ ultraMinimal })`.
2. An effect in `store.tsx` calls `applyUltraMinimal()` (`themes.ts`), which sets `data-ultra="true"` on `<html>` (and records it in the boot hint, so the first frame is already right: [../launch-intro.md](../launch-intro.md)).
3. CSS does most of the work through helper classes defined at the end of `src/index.css`:

| Class | In Ultra minimal |
| --- | --- |
| `um-only` | shown **only** then (the icon that stands in for a label) |
| `um-hide` | removed (hints, helper lines) |
| `um-sr` | kept for screen readers, taken off the screen (a label an icon replaces) |
| `um-tight` | card padding 12 px |
| `um-center` | figure centred |
| `um-stack` | 10 px between the children of a `space-y-*` stack |

4. Three things need the flag in JavaScript because they change structure, not just visibility: the page pill's active shape (`Tabs.tsx`), the month pill (`MonthNavigator.tsx`), and the forced Compact layout (`MonthView.tsx`). They read `data.settings.ultraMinimal`.

## Adding to a page

- A new **label** on a card: give the text `um-sr` and put an icon with `um-only` beside it (see `HeroCard`, `ShareCard`, `NoteCard` in `cards.tsx`; `NoteCard` requires an `icon`).
- A new **hint or helper sentence**: add `um-hide`.
- Do not branch on the setting in a component unless the layout itself has to change.
