# Feature: backup, restore, sample journal, delete all

> **Scope:** the data tools in Settings and the first-run sample data.
>
> **Read when:** you change `exportData` / `importData` / `eraseAll` / `loadSample` in `src/lib/store.tsx`, `saveTextFile` in `src/lib/platform.ts`, or `src/lib/demo.ts`.
>
> **Related:** [../data-model.md](../data-model.md) (format and keys), [settings.md](settings.md), [../android.md](../android.md)

The journal exists only on the device. A backup file is the only way to move it or to survive cleared site data.

| Action | Where | What happens |
| --- | --- | --- |
| **Save backup** | Settings > Your data | `exportData()` -> `saveTextFile('koink_backup_<date>.json', ...)`. Browser / PWA: a download. Android app: the file is written to the app cache and handed to the share sheet (save to Files, Drive, send to yourself) |
| **Restore backup** | Settings > Your data | file picker -> `importData()`: the file is validated and cleaned, then **replaces** the whole journal. A file that is not a journal leaves everything as it was and says so |
| **Load the sample journal** | Settings > Your data | replaces the journal with sample data (asks first when there are entries); theme and currency are kept |
| **Start fresh** | note at the top of the Month page, while the sample data is in use | confirmation, then an empty journal |
| **Delete all data** | bottom of Settings | two confirmations, then `eraseAll()`: entries, goals, recurring items, budgets, name and rule are removed; theme, currency, dock and reminder choices stay |

## Sample journal (`src/lib/demo.ts`)

A new visitor (nothing stored) gets six months of entries ending today, three goals, seven recurring items and eight category budgets, so every page has something to show. It is generated with a seeded pseudo-random generator, so it is the same on every visit and its dates follow the current date. `settings.sampleData` is true while it is in use and shows the note on the Month page; it becomes false on Start fresh, on dismissing the note, on restore and on delete.

## Notes

- Restoring merges nothing: it is a full replacement. Save a backup first if in doubt.
- A backup includes settings, so a restore also brings back the theme, currency, Ultra minimal and reminder choices of the file (on a new device the notification permission still has to be given).
- View preferences (open cards, filters) are not part of a backup.
- The website, an installed PWA and the Android app each keep their own storage; backups are how data moves between them.
