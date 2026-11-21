# File map: `src/pages/`

> **Scope:** the four pages.
>
> **Read when:** you need to know which file renders a page and what it depends on.
>
> **Related:** the feature documents linked in each row

| File | Page | Reads from the store | Main pieces | Feature doc |
| --- | --- | --- | --- | --- |
| `MonthView.tsx` | Month | `data`, `selectedMonth`, `money`, `moneyFit`, `openSheet`, `eraseAll`, `updateSettings` | `MonthNavigator`, `HeroPair`, `ShareCard`, `NoteCard`, `FoldCard` (8 categories + 3 trackers), `RecurringRow`, `ConfirmDialog` | [../features/month.md](../features/month.md) |
| `TransactionsView.tsx` | Transactions | `data`, `money`, `openSheet` | kind chips above the search field, filter button + panel (category, account, dates, amounts), List / 2 days layout switch **above the search field**, a heading per month (`MonthHeading`, one card per month in List), local `EntryRow` (category first, title below; `narrow` variant for the two-column view; quick delete) | [../features/transactions.md](../features/transactions.md) |
| `BudgetsView.tsx` | Budgets | `data`, `selectedMonth`, `money`, `moneyFit`, `openSheet` | `MonthNavigator`, `HeroPair`, `NoteCard`, local collapsible `SectionCard` (Needs / Wants / own-type cards, goals, recurring; no Accounts card), generic monthly budget line, `Bar`, `RecurringRow` | [../features/budgets.md](../features/budgets.md) |
| `StatsView.tsx` | Statistics | `data`, `money`, `moneyFit`, `setSelectedMonth`, `setActiveTab` | `HeroPair` (average or total), `ShareCard`, `NoteCard`, inline SVG balance line chart, `ExpenseChart` (bars / line, period and category comparison, full view), custom period fields, `Bar` | [../features/statistics.md](../features/statistics.md) |

Shared habits:

- Totals are derived in `useMemo` from `data.txs` with `src/lib/calc.ts`; nothing computed is stored.
- View preferences use `usePersistentState` (keys in [../data-model.md](../data-model.md#what-is-stored)).
- Pages never open a `Modal` themselves, except confirmation dialogs; they call `openSheet()`.
- Pages are rendered by `PageSwiper` through `renderPage()` (`App.tsx`), keyed by page id. On touch devices the neighbours of the current page are also mounted, hidden and `inert`, so a page must not have side effects that assume it is visible. A page reached by swipe keeps the state it had while it waited; a page left for a non-neighbour is unmounted.
- Labels use `um-sr`, hints `um-hide` ([../features/ultra-minimal.md](../features/ultra-minimal.md)).
