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
| `Recurring` | Recurring item: `id`, `name`, `amount`, `kind` (`expense` / `income`), `categoryId`, `day` (1-28), `every` (months between due dates, 1 = monthly) and `start` (`YYYY-MM` anchor). [features/recurring.md](features/recurring.md) |
| `CategoryType` | Your own expense type besides Needs and Wants: `id` (`ty_...`), `name`. `CustomCategory.bucket` is `needs`, `wants` or one of these ids (`Bucket` is a string). [features/categories.md](features/categories.md) |
| `Profile` | `name`, `rule` (`needs` / `wants` / `savings` percentages), `budgets` (category id -> monthly amount). |
| `Settings` | `mode` (`basic` / `full`) and `modeChosen` ([features/basic-mode.md](features/basic-mode.md)), `language` (`en` / `it`, first launch: the browser's), `inflationExcluded` (ids of the expenses left out of Statistics > Personal inflation, [features/statistics.md](features/statistics.md#personal-inflation-full-mode)), `hideSplit`, `hideBudgets` (hides the Budgets page), `theme`, `themeStyle`, `monoHue`, `ultraMinimal`, `currency` (any code of `CURRENCIES`), `hiddenCategories`, `rates` + `ratesDate` ([features/currencies.md](features/currencies.md)), `quickAdd` (which dock buttons show), `notifications`, `sampleData`. |
| `NotificationSettings` | The four reminders: `logDay`, `recurring`, `monthStart` (`{ enabled, time }`, time as `HH:MM`) and `weeklyReview` (the same plus `weekday`, 1 = Sunday ... 7 = Saturday). [notifications.md](notifications.md) |
| `OpenTarget` | What can be opened from outside: `expense`, `income`, `recurring`, `stats`, `budgets` (reminders, shortcuts, `?open=`). |
| `AppData` | `{ txs, goals, recurring, accounts, giftCards, categories, categoryTypes, profile, settings }`: the whole journal. |
| `Sheet` | Which sheet is open and with what (`tx`, `recurring`, `recurringEdit`, `goal`, `account`, `categories`, `budget`, `quick`, `profile`, `settings`). |

`categoryId` means an expense category for expenses, an income source for income, and a goal id for savings. `categoryMeta(kind, id, goals)` in `categories.ts` resolves any of them to a name and icon.

## Added: gift cards and widgets

- `GiftCard { id, name, initial, expires?, note? }` in `AppData.giftCards`; `Tx.giftCard?: { id, amount }` (expenses only). Balance = `initial` - sum of `giftCard.amount` of the entries that point at the card (`src/lib/giftcards.ts`). See [features/gift-cards.md](features/gift-cards.md).
- `Settings.widgets: { single: string; multi: string[]; categories: string[]; showInApp: boolean }` with action keys (`expense`, `income`, `saving`, `recurring`, `quick`, `giftcard`, `budgets`, `stats`, `cat:<id>`). Cleaned by `normalizeWidgets` (`src/lib/widgets.ts`) on load and import. See [features/widgets.md](features/widgets.md).
- `QuickAddKey` gains `giftcard`; `OpenTarget` gains `giftcard`; `Sheet` gains `giftCard` and `widgets`, and `tx` accepts `giftCardId`.
- Older journals and backups load without these fields: no cards, default widget buttons, gift card button off.

## What is stored

Everything is `localStorage`, on the device, never sent anywhere.

| Key | Content |
| --- | --- |
| `koink_journal_v1` | The whole `AppData` as JSON. Written after every change (`store.tsx`). The constant is `STORAGE_KEY` in `storage.ts`. |
| `koink_month_layout`, `koink_month_open`, `koink_month_trackers_open` | Month page: layout, open category cards, open tracker cards. |
| `koink_last_backup` | Epoch ms of the last backup file saved from this device (outside the journal; shown in Settings > Your data). `recordBackup()` in `storage.ts`. |
| `koink_tx_filter` | Transactions page filter. |
| `koink_stats_range`, `koink_stats_from`, `koink_stats_to`, `koink_stats_trend_open`, `koink_stats_months_open`, `koink_stats_where_open`, `koink_stats_chart_open`, `koink_stats_chart_res`, `koink_stats_chart_type`, `koink_stats_chart_cmp`, `koink_stats_chart_base`, `koink_stats_chart_cfrom`, `koink_stats_chart_cto` | Statistics page: period (1 / 3 / 6 / 12 / custom, with its two dates), open sections, expense-chart resolution, type (bars / line), comparison (off / periods / categories), the second period's kind and its two dates. |
| `koink_tx_filter_open` | Transactions page: whether the filter panel is open. |
| `koink_budgets_open_<id>` | Budgets page: whether a card (`bucket_<bucket>`, `goals`, `recurring`) is open. |
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

## Changes of this round (types)

- `Profile.monthlyBudget: number` (0 = off): the generic monthly budget. Missing in older backups = 0. `budgetSummary` returns `{ budget, spent, left, generic, scope ('overall' | 'categories'), categoryBudget, unbudgeted, unbudgetedCategories: { id, total }[], unplanned (= unbudgeted, old name) }`: `scope` says what `spent` covers ([features/budgets.md](features/budgets.md#what-the-headline-figure-covers)).
- `Recurring.unit?: 'month' | 'week'` and `Recurring.anchor?: string` (`YYYY-MM-DD`, weekly items only). `every` counts months or weeks depending on `unit`. Missing = monthly, so older backups load unchanged.
- `logRecurring(item, month, date?)`: `date` is the due date of one weekly occurrence.

## Mode (Basic / Full)

`Settings.mode` is `'basic' | 'full'` and `Settings.modeChosen` is false until the first-launch chooser is answered. Journals and backups without them load as `full` + chosen. The store derives `basic` (also false inside the guided tour) and `txs` (all entries, or without `saving` ones in Basic) for the screens; `data` itself is never filtered. See [features/basic-mode.md](features/basic-mode.md). New journals also start with `hiddenCategories` = `DEFAULT_HIDDEN_CATEGORIES` (Transport, Bills, Eating out, Shopping).
