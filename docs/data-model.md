# Data model, storage and money maths

> **Scope:** the types, what is written to the device, the backup format, categories, and how every figure is calculated.
>
> **Read when:** you add a field, a stored key, a category or a calculation.
>
> **Related:** [architecture.md](architecture.md), [features/backup.md](features/backup.md)

## Types (`src/lib/types.ts`)

| Type | Meaning |
| --- | --- |
| `Tx` | One entry: `id`, `kind` (`expense` / `income` / `saving`), positive `amount`, `categoryId`, `note`, `date` (`YYYY-MM-DD`, local), optional `recurringId`, `ts` (creation order). Also: `note` = the short **Title**, `details` = the long **Note**, `accountId`, `foreign` (`{ amount, currency, rate }` when paid in another currency; `amount` is already converted). |
| `Account` | `id`, `name`, `icon`, `opening` balance. [features/accounts.md](features/accounts.md) |
| `CustomCategory` | Your own expense category: `id`, `name`, `icon`, `bucket`. [features/categories.md](features/categories.md) |
| `Goal` | Savings goal: `id`, `name`, `target` (0 = open-ended). |
| `Recurring` | Monthly item: `id`, `name`, `amount`, `kind` (`expense` / `income`), `categoryId`, `day` (1-28). |
| `Profile` | `name`, `rule` (`needs` / `wants` / `savings` percentages), `budgets` (category id -> monthly amount). |
| `Settings` | `theme`, `themeStyle`, `monoHue`, `ultraMinimal`, `currency` (any code of `CURRENCIES`), `hiddenCategories`, `rates` + `ratesDate` ([features/currencies.md](features/currencies.md)), `quickAdd` (which dock buttons show), `notifications`, `sampleData`. |
| `NotificationSettings` | The four reminders: `logDay`, `recurring`, `monthStart` (`{ enabled, time }`, time as `HH:MM`) and `weeklyReview` (the same plus `weekday`, 1 = Sunday ... 7 = Saturday). [notifications.md](notifications.md) |
| `OpenTarget` | What can be opened from outside: `expense`, `income`, `recurring`, `stats`, `budgets` (reminders, shortcuts, `?open=`). |
| `AppData` | `{ txs, goals, recurring, accounts, categories, profile, settings }`: the whole journal. |
| `Sheet` | Which sheet is open and with what (`tx`, `recurring`, `recurringEdit`, `goal`, `account`, `categories`, `budget`, `quick`, `profile`, `settings`). |

`categoryId` means an expense category for expenses, an income source for income, and a goal id for savings. `categoryMeta(kind, id, goals)` in `categories.ts` resolves any of them to a name and icon.

## What is stored

Everything is `localStorage`, on the device, never sent anywhere.

| Key | Content |
| --- | --- |
| `koink_journal_v1` | The whole `AppData` as JSON. Written after every change (`store.tsx`). The constant is `STORAGE_KEY` in `storage.ts`. |
| `koink_month_layout`, `koink_month_open`, `koink_month_trackers_open` | Month page: layout, open category cards, open tracker cards. |
| `koink_tx_filter` | Transactions page filter. |
| `koink_stats_range`, `koink_stats_trend_open`, `koink_stats_months_open` | Statistics page: range and open sections. |
| `koink_boot` | `{ theme, style, bg, ultra }`: the few values the inline script of `index.html` needs to paint the first frame in the saved colours. Rewritten by `themes.ts` on every theme change; safe to delete. [launch-intro.md](launch-intro.md) |
| `koink_intro_last` | Index of the launch animation played last, so the next launch picks another. |

Keys written before the rename (`koins_*`) are moved to these names once, at start-up (`migrateLegacyStorage()` in `storage.ts`).

Loading goes through `sanitize()` in `store.tsx`: anything malformed is dropped or defaulted, so a damaged value or an old backup cannot crash the app. With nothing stored, the app starts with the sample journal (`demo.ts`) and `settings.sampleData = true`.

Settings added later (`ultraMinimal`, `notifications`) default to off when a journal or backup does not have them. Changing the shape: add the field with a default in `sanitize()`. Only bump the key (`_v2`) for a change old data cannot be read into.

## Backup format

`exportData()` writes `{ "app": "koink", "version": 1, ...AppData }`, pretty-printed, to `koink_backup_<date>.json`. `importData()` accepts any JSON with a `txs` array, passes it through `sanitize()`, replaces the journal and clears `sampleData`.

## Categories (`src/lib/categories.ts`)

- **Needs:** `housing`, `groceries`, `transport`, `bills`, `health`.
- **Wants:** `eating_out`, `fun`, `shopping`.
- **Income sources:** `salary`, `freelance`, `gift`, `other`.

The lists are fixed in code; ids are what is stored, so rename labels freely but never ids. Adding a category = one line in `EXPENSE_CATEGORIES` (with its bucket).

## Calculations (`src/lib/calc.ts`)

All functions are pure. For one month (`monthTotals`):

| Figure | Definition |
| --- | --- |
| `income` | sum of income entries |
| `needs`, `wants` | sum of expenses by the bucket of their category |
| `spent` | `needs + wants` (money moved to savings is **not** spent) |
| `saved` | sum of saving entries |
| `net` | `income - spent` (the balance pill on the hero cards) |
| `left` | `income - spent - saved` (the yellow "Left" card) |
| `byCategory` | total and count per expense category |

Other functions: `ruleShares` (needs / wants / savings as % of income, or of everything that went out when no income was logged), `budgetSummary` (budget, spent and left over the categories that have a budget), `goalSaved` (all-time savings to one goal), `recurringEntry` (the entry that logged a recurring item in a month), `frequentEntries` (entries logged more than once, for "Log again"), `totalsByMonth` / `monthsBack` (Statistics).

## Formatting and dates

- `format.ts`: `formatMoney` (Intl currency, whole units unless `cents`), `formatMoneyFit` (switches to a compact form such as `€1.2M` when the full figure would not fit a card), `round2` (every stored amount has at most two decimals), `CURRENCIES` (EUR, USD, GBP, CHF, JPY; yen has no decimals).
- `dates.ts`: days and months are **local** strings (`YYYY-MM-DD`, `YYYY-MM`), never UTC timestamps, so an entry logged late in the evening stays on its day. Month and weekday names are English constants, not `Intl`.

Changing the currency changes the symbol only: amounts are not converted.
