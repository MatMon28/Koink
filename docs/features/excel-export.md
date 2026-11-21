# Feature: Export to Excel

> **Scope:** the readable spreadsheet of the journal (Settings > Your data > *Export to Excel*).
>
> **Read when:** you change `src/lib/excel.ts`, `saveBlobFile` in `src/lib/platform.ts` or the button in `src/sheets/SettingsSheet.tsx`.
>
> **Related:** [backup.md](backup.md) (the real backup), [settings.md](settings.md), [../data-model.md](../data-model.md)

The `.xlsx` is **for people**: to read, filter, print or send to an accountant. It is **not a backup**: nothing can be restored from it (the JSON file from *Save backup* is the only backup), and the file says so on its first sheet.

> **Status (checked):** complete. The button sits in Settings > *Your data*, in the backup block under *Save backup* / *Restore backup*, so no new code was needed. A workbook built from the sample journal (232 entries) is a valid `.xlsx` with the Summary, Transactions, Budgets, Goals and Accounts sheets.

## What is in it

| Sheet | Contents |
| --- | --- |
| **Summary** | title (with the profile name), export date, currency, number of entries, period; totals of all time (income, spent, moved to savings, income minus spending); a **By month** table, newest first |
| **Transactions** | one row per entry, newest first, header frozen: Date (a real Excel date), Type, Category, Title, Note, Account, then **Income / Spent / Saved** in separate columns (green / red / purple), *Paid in* and *Rate* for an entry paid in another currency, and the gift card used. Every second row is banded |
| **Budgets** | the month open in the app: a row per category with a budget or spending (budget, spent, left, % used), then **What the headline figure covers**: *Budgeted categories*, *Unbudgeted spending* and, when set, *Overall monthly budget* ([budgets.md](budgets.md#what-the-headline-figure-covers)) |
| **Goals** | target, saved, still to go, progress (only when there are goals) |
| **Accounts** | opening balance and balance now (only when there are accounts) |
| **Gift cards** | value, left, expiry (only when there are cards) |

Texts follow the language chosen in Settings. Money uses `#,##0.00` (no decimals for yen, won...) with negatives in red; the currency code is in each money column's header. Column widths fit the content; the Summary and Budgets sheets hide the grid lines.

## How it works

- `buildJournalWorkbook(data, month)` in `src/lib/excel.ts` builds the sheets with [`write-excel-file`](https://www.npmjs.com/package/write-excel-file) (`/universal`, which returns a `Blob`). Dates are written as UTC midnight so the day never shifts with the time zone.
- The file is **imported on demand** (`await import('../lib/excel')` in the button handler): the library (about 80 kB) is a separate chunk and not part of the first download. The offline worker still precaches it with the rest of the build.
- `saveBlobFile(name, blob)` in `platform.ts` hands the file over: a download in a browser or PWA; in the Android app the bytes are written to the app cache as base64 and passed to the share sheet (not run on a device, see [../known-gaps.md](../known-gaps.md)).
- File name: `koink_journal_<date>.xlsx`. Toasts: *Excel file saved to your downloads* / *handed to the app you chose* / *The Excel file could not be created*.
- Category names come from `categoryMeta` / `allExpenseCategories` (they need `syncCategories`, which the store runs), so a custom category appears under its own name and a deleted one under *Other*.
