# Feature: backup, restore, sample journal, delete all

> **Scope:** the data tools in Settings and the first-run sample data.
>
> **Read when:** you change `exportData` / `previewBackup` / `restoreBackup` / `eraseAll` / `loadSample` in `src/lib/store.tsx`, the save status in `src/lib/storage.ts`, `RestoreDialog.tsx`, `StorageBanner.tsx`, `DataStatus.tsx`, `saveTextFile` in `src/lib/platform.ts`, or `src/lib/demo.ts`.
>
> **Related:** [../data-model.md](../data-model.md) (format and keys), [settings.md](settings.md), [../android.md](../android.md)

The journal exists only on the device. A backup file is the only way to move it or to survive cleared site data.

| Action | Where | What happens |
| --- | --- | --- |
| **Save backup** | Settings > Your data, the not-saved banner, the restore dialog | `useBackup().saveBackup()` -> `exportData()` -> `saveTextFile('koink_backup_<date>.json', ...)`; it also remembers the moment (*Last backup file*). Browser / PWA: a download. Android app: the file is written to the app cache and handed to the share sheet (save to Files, Drive, send to yourself) |
| **Restore backup** | Settings > Your data | file picker -> `previewBackup()` validates and cleans the file **without touching the journal** -> `RestoreDialog` -> only on *Replace journal* does `restoreBackup()` **replace** the whole journal. A file that is not a journal leaves everything as it was and says so (see below) |
| **Export to Excel** | Settings > Your data | a readable spreadsheet, **not a backup**: [excel-export.md](excel-export.md) |
| **Load the sample journal** | Settings > Your data | replaces the journal with sample data (asks first when there are entries); theme and currency are kept |
| **Start fresh** | note at the top of the Month page, while the sample data is in use | confirmation, then an empty journal |
| **Delete all data** | bottom of Settings | two confirmations, then `eraseAll()`: entries, goals, recurring items, budgets, name and rule are removed; theme, currency, dock and reminder choices stay |

## Restore preview (`src/sheets/RestoreDialog.tsx`)

`previewBackup(raw)` runs the same `sanitize()` as a restore and returns a `BackupPreview` (`src/lib/journal.ts`): the cleaned journal, a `JournalSummary` (entry count, first and last date, currency, account names, goals, recurring items, budgets, gift cards) and `skipped`, the number of entries in the file that were not valid. The dialog shows the file's figures next to the current journal's, in a *Now / Backup file* table, and:

- says **This will replace your current journal** (nothing is merged);
- warns when the file's currency differs from the journal's;
- mentions entries that were left out as invalid;
- offers **Save a copy of the current journal first** (the same backup file as *Save backup*); without that copy the confirm button reads *Replace anyway*;
- changes nothing on *Cancel*, on a swipe down or on Back.

`importData(raw)` (validate and replace in one go) still exists in the store but no screen uses it.

## Failed saves (`storage.ts`, `StorageBanner.tsx`, `DataStatus.tsx`)

The journal is written to `localStorage` in an effect after every change. `writeJournal()` in `storage.ts` does the write and never throws; it records the outcome in a tiny external store (`getSaveState()`: `ok`, `savedAt`, `reason` = `full` or `blocked`) read with `useSyncExternalStore`, so the pages do not re-render for it. When a write fails:

- **`StorageBanner`** (top of every page, sticky under the header, cannot be dismissed): *Changes aren't being saved on this device*, why, **Export a backup now** and **Try again** (`useStorageStatus().retry` writes the latest journal again). It disappears on the first successful write. While it is up, closing the tab asks for confirmation (`beforeunload`).
- **`DataStatus`** (Settings > Your data): *Saved on this device · <time>* or the failure with a *Retry* button, and *Last backup file: <time>* or *No backup file saved from this device yet*.

The last backup moment is stored apart from the journal (`koink_last_backup`, `recordBackup()` in `storage.ts`), so restoring or erasing never rewrites it. Reading the journal when storage is blocked still falls back to the sample journal.

## Sample journal (`src/lib/demo.ts`)

A new visitor (nothing stored) gets six months of entries ending today, three goals, seven recurring items and eight category budgets, so every page has something to show. It is generated with a seeded pseudo-random generator, so it is the same on every visit and its dates follow the current date. `settings.sampleData` is true while it is in use and shows the note on the Month page; it becomes false on Start fresh, on dismissing the note, on restore and on delete.

## Notes

- Restoring merges nothing: it is a full replacement, and the preview says so before anything happens.
- A backup includes settings, so a restore also brings back the theme, currency, Ultra minimal and reminder choices of the file (on a new device the notification permission still has to be given).
- View preferences (open cards, filters) are not part of a backup.
- The website, an installed PWA and the Android app each keep their own storage; backups are how data moves between them.
