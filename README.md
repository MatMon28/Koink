# Koink

A local-first journal for income, expenses, budgets and savings, built with React 19, TypeScript, Vite and Tailwind CSS v4. One codebase ships three ways: a website, an installable offline **PWA**, and an **Android app** (Capacitor shell in `android/`). There is no account and no backend; the journal lives in the browser's `localStorage`. The look (warm oat palette, pastel cards, pill navigation, bottom dock, bottom sheets, six style presets) follows the [Kakcal](https://github.com/MatMon28/Kakcalculator) design system, and so do its habits: a launch animation, pages that swipe on one rail, opt-in reminder notifications, an Ultra minimal mode, sheets that never get in the way.

> **Renamed:** the app was called *Koins*. It is **Koink** everywhere now (name, logo, Android id `com.koink.app`, storage keys, file names). A journal saved in a browser under the old name is moved over on first launch: [docs/brand.md](docs/brand.md#rename-koins---koink).

## Quick start

```sh
npm ci
npm run dev                 # browser preview with hot reload
npm run build               # dist/: website + PWA (manifest, icons, offline worker)
npm run package             # public/downloads/koink-project.zip: the whole project, downloadable from Settings
npm run brand               # every icon, wordmark and animation file from src/brand/art.js (needs: npm i --no-save sharp)
npm run android:prepare     # Android build of the web app, synced into android/
npm run android:open        # open android/ in Android Studio
```

Node.js 22+ is required; Android also needs JDK 21 and Android SDK 36. Full steps for both apps: **[docs/prepare-apps.md](docs/prepare-apps.md)**.

## Legend for LLMs (and people in a hurry)

**Read this table only.** Find the one row that matches the task, open the files in the second column, and read the third column's document only if the code is not enough. Do not read `docs/` end to end, and never read `src/styles/presets.css` (1,400 lines of generated-style theme rules) unless the task is a style preset.

| Task | Source files | Document |
| --- | --- | --- |
| **Month page** (hero cards, needs / wants / savings, category cards, layouts) | `src/pages/MonthView.tsx`, `src/components/cards.tsx` | [features/month.md](docs/features/month.md) |
| **Transactions page** (kind chips above the search, the layout switch at the right of the entries recap, filter panel, month sections, list / 2 days, category first and title below, quick delete) | `src/pages/TransactionsView.tsx` | [features/transactions.md](docs/features/transactions.md) |
| **Budgets page** (collapsible cards, category budgets per type, goals, recurring list; hiding the page) | `src/pages/BudgetsView.tsx`, `src/sheets/EditSheets.tsx`, `src/lib/tabs.ts`, `budgetSummary` in `src/lib/calc.ts` (what the headline figure covers, unbudgeted spending), `NoteCard` in `src/components/cards.tsx` | [features/budgets.md](docs/features/budgets.md) |
| **Statistics page** (1 month / 3 / 6 / 12 / custom period, averages, expense chart with line, comparison and full view, balance trend, breakdown) | `src/pages/StatsView.tsx`, `src/components/ExpenseChart.tsx` (the *Expenses over time* card), `src/lib/expenseSeries.ts` | [features/statistics.md](docs/features/statistics.md) |
| **Add / edit an entry** (number pad, title + long note, account, currency), "Log again" | `src/sheets/TxSheet.tsx`, `src/sheets/QuickSheet.tsx`, `src/sheets/shared.tsx`, `NumPad` / `AmountStepper` in `src/components/ui.tsx` | [features/entries.md](docs/features/entries.md) |
| **Widgets** (single button, multiple buttons, expense-type buttons; Android home screen + Month-page strip) | `src/lib/widgets.ts`, `src/lib/widgetBridge.ts`, `src/lib/useWidgets.ts`, `src/sheets/WidgetsSettings.tsx`, `src/components/WidgetButtons.tsx`, `src/components/WidgetStrip.tsx`, `android/app/src/main/java/com/koink/app/KoinkWidgetProvider.java` | [features/widgets.md](docs/features/widgets.md) |
| **Gift cards** (add a card, pay an expense with it, tracker on the Month page, optional bottom-bar button) | `src/lib/giftcards.ts`, `src/sheets/GiftCardPickerSheet.tsx` (what the gift card button opens), `src/sheets/GiftCardSheet.tsx`, `src/sheets/TxSheet.tsx` (*Pay with a gift card*), `src/pages/MonthView.tsx` (tracker) | [features/gift-cards.md](docs/features/gift-cards.md) |
| **Accounts** (balance per account, edited in the Profile only) | `src/sheets/ProfileAccounts.tsx`, `src/sheets/AccountSheet.tsx`, `accountBalance` in `src/lib/calc.ts` | [features/accounts.md](docs/features/accounts.md) |
| **Language** (English / Italian, `t()`, the Italian dictionary) | `src/lib/i18n.ts`, `src/lib/i18n.it.ts`, `src/sheets/SettingsSheet.tsx` | [features/language.md](docs/features/language.md) |
| **Expense categories** (own, hide, delete, own types besides needs / wants, the expandable field in Settings) | `src/lib/categories.ts`, `src/lib/icons.ts`, `src/sheets/CategoriesSheet.tsx`, `BucketPicker` in `src/sheets/shared.tsx` | [features/categories.md](docs/features/categories.md) |
| **Currencies and exchange rates** (per-entry currency, rates from Frankfurter, the currency lock) | `src/lib/format.ts`, `src/lib/journal.ts` (`currencyLocked`), `refreshRates` and `updateSettings` in `src/lib/store.tsx`, `src/sheets/TxSheet.tsx`, `src/sheets/SettingsSheet.tsx` | [features/currencies.md](docs/features/currencies.md) |
| **Recurring items** (every N months or every N weeks) | `src/sheets/EditSheets.tsx`, `src/sheets/QuickSheet.tsx`, `src/components/RecurringRow.tsx`, `recurringDue`, `recurringSlots` in `src/lib/calc.ts` | [features/recurring.md](docs/features/recurring.md) |
| **Savings goals** | `src/sheets/EditSheets.tsx` (`GoalSheet`), `src/lib/calc.ts` (`goalSaved`) | [features/savings-goals.md](docs/features/savings-goals.md) |
| **Profile, the generic monthly budget and the budget rule** (50 / 30 / 20), accounts with their balances | `src/sheets/ProfileSheet.tsx`, `src/sheets/ProfileAccounts.tsx` | [features/profile.md](docs/features/profile.md) |
| **Settings** (language, appearance, currency, bottom bar, widgets, install card) | `src/sheets/SettingsSheet.tsx`, `src/components/InstallApp.tsx` | [features/settings.md](docs/features/settings.md) |
| **Backup, restore (with preview), save status and the "not saved" banner, sample data, delete all** | `src/lib/store.tsx`, `src/lib/storage.ts` (`writeJournal`, save state, last backup), `src/lib/journal.ts` (`summarizeJournal`), `src/lib/useBackup.ts`, `src/sheets/RestoreDialog.tsx`, `src/components/StorageBanner.tsx`, `src/components/DataStatus.tsx`, `src/lib/platform.ts` (`saveTextFile`), `src/lib/demo.ts` | [features/backup.md](docs/features/backup.md) |
| **Excel export** (a readable spreadsheet, not a backup) | `src/lib/excel.ts` (loaded on demand), `saveBlobFile` in `src/lib/platform.ts`, the *Export to Excel* button in `src/sheets/SettingsSheet.tsx` | [features/excel-export.md](docs/features/excel-export.md) |
| **Themes and style presets** | `src/lib/themes.ts`, `src/index.css`, `src/styles/presets.css` | [features/themes.md](docs/features/themes.md), [design-system.md](docs/design-system.md) |
| **Smooth sheet drag / header scroll, logo click animation** | `src/components/Modal.tsx`, `src/components/Header.tsx`, end of `src/index.css` | [motion.md](docs/motion.md#smoothness-fixes-sheet-drag-scrolling) |
| **Swipes, Back button, drag-to-close, "a new touch ends the animation"** | `src/components/PageSwiper.tsx`, `src/lib/interrupt.ts`, `src/lib/pillTab.ts`, `src/lib/back.ts`, `src/components/Modal.tsx`, `src/components/MonthNavigator.tsx`, `src/lib/velocity.ts` | [gestures.md](docs/gestures.md) |
| **Reminder notifications** | `src/lib/reminders.ts` (plan), `src/lib/notifications.ts` (delivery), `src/lib/useReminders.ts`, `src/sheets/NotificationSettings.tsx` | [notifications.md](docs/notifications.md) |
| **Ultra minimal mode** | `um-*` classes at the end of `src/index.css`, `src/components/cards.tsx`, `Tabs.tsx`, `MonthNavigator.tsx` | [features/ultra-minimal.md](docs/features/ultra-minimal.md) |
| **Launch animations, first paint, Android launch-screen colour** | `src/brand/art.js` (`INTRO_ANIMATIONS`), `src/lib/intro.ts`, `src/styles/intro.css`, `src/lib/earlyStart.ts`, inline script in `index.html`; Android: `LaunchBackground.java`, `values/splash_themes.xml`, `scripts/generate-splash-themes.mjs` | [launch-intro.md](docs/launch-intro.md) |
| **Animation timing, springs, sheet exit** | `src/lib/spring.ts`, `src/components/Modal.tsx`, `src/index.css` | [motion.md](docs/motion.md) |
| **Unsaved-input question** | `src/sheets/TxSheet.tsx` (`FormGuard`), `SaveBeforeCloseDialog` in `src/components/ui.tsx` | [features/entries.md](docs/features/entries.md) |
| **PWA**: manifest, offline worker, install prompt, shortcuts | `public/manifest.webmanifest`, `scripts/offline-worker.template.js`, `vite.config.ts`, `src/lib/pwa.ts`, `index.html` | [pwa.md](docs/pwa.md) |
| **Android app**: Capacitor config, native project and its Java, back button, file sharing | `capacitor.config.json`, `android/` (Java in `android/app/src/main/java/com/koink/app/`), `src/lib/platform.ts`, `src/lib/back.ts`, `scripts/prepare-android.mjs` | [android.md](docs/android.md) |
| **Hand work back as a patch** (`changes.patch`) | `docs/changes-patch.md` | [changes-patch.md](docs/changes-patch.md) |
| **Build, host or release either app** | `package.json`, `scripts/` | [prepare-apps.md](docs/prepare-apps.md) |
| **Project archive** (the "Download project" card in Settings) | `scripts/package-project.mjs`, `src/components/ProjectDownload.tsx`, `public/downloads/` | [prepare-apps.md](docs/prepare-apps.md#3-the-project-archive) |
| **Logo, icon, wordmark** (light and dark), generated icon files, notification icon, the **pig icon** (`PigIcon`) | `src/brand/art.js` (the one source), `src/lib/pig.ts`, `src/components/Brand.tsx`, `scripts/render-brand.mjs`, `public/brand/` | [brand.md](docs/brand.md) |
| **State, actions, what is stored** | `src/lib/store.tsx`, `src/lib/types.ts`, `src/lib/storage.ts` | [data-model.md](docs/data-model.md) |
| **Money maths** (totals, shares, budgets, formatting) | `src/lib/calc.ts`, `src/lib/format.ts`, `src/lib/dates.ts` | [data-model.md](docs/data-model.md) |
| **Categories and income sources** | `src/lib/categories.ts` | [data-model.md](docs/data-model.md) |
| **Header, page pill, bottom dock (Month page only), sheets, toasts** | `src/components/Header.tsx`, `Tabs.tsx`, `ActionDock.tsx`, `Modal.tsx`, `ui.tsx`, `src/lib/pillTab.ts`, `src/lib/dock.ts`, `src/lib/interrupt.ts` | [architecture.md](docs/architecture.md) |
| **Shared inputs** (amount stepper, switch, confirm dialog) | `src/components/ui.tsx` | [file-map/components.md](docs/file-map/components.md) |
| **How the whole thing fits together** | `src/App.tsx`, `src/main.tsx` | [architecture.md](docs/architecture.md) |
| **Which file does X?** | | [file-map/README.md](docs/file-map/README.md) |
| **How to test, what was and was not verified** | | [verification.md](docs/verification.md), [known-gaps.md](docs/known-gaps.md) |

### Layout of the repository

```
index.html            entry page + PWA tags
src/main.tsx          start-up (theme, launch animation, Back handling, install prompt, offline worker)
src/App.tsx           shell: header, page swiper, pages, dock, sheets
src/pages/            the four pages
src/sheets/           every bottom sheet (entry, accounts, categories, goals, budgets, settings...)
src/components/       shared UI (cards, modal, header, dock, inputs)
src/lib/              state, maths, dates, expense chart series, themes, platform bridges, widgets, gift cards (no JSX except store.tsx)
src/brand/art.js      all Koink artwork: logo, wordmark, launch animations (plain JS, shared with scripts/)
src/styles/           presets.css (the six style presets), intro.css (launch animation)
public/               favicon, manifest, PWA icons, brand/ (brand sheet, light and dark assets), downloads/ (the project archive)
scripts/              offline-worker template, brand renderer, launch-screen style generator, Android prepare script, project packer
android/              Capacitor Android project
docs/                 documentation (index: docs/README.md)
```

### Rules that save tokens

1. State and every action come from one hook: `useApp()` in `src/lib/store.tsx`. Start there for any behaviour change.
2. Colours are CSS variables (`--bg`, `--surface`, `--text`, ...) plus the Tailwind tokens `intake` (money in), `activity` (money out), `weight` (savings), `nutrient` (yellow note cards). The names are inherited from the reference app on purpose: see [design-system.md](docs/design-system.md) before renaming anything.
3. Every sheet is a `<Modal>`; every sheet is opened with `openSheet({ type: ... })`. The list of types is the `Sheet` union in `src/lib/types.ts`.
4. After adding, renaming or deleting a file, update its row in `docs/file-map/` and, if it is a feature, the matching `docs/features/*.md` (rule and table in [docs/README.md](docs/README.md#keeping-the-docs-current)).

## Latest round: button bar on Month only, interrupting touches, sticky confirm, one row of categories

Inspired by [Kakcal](https://github.com/MatMon28/Kakcalculator) (its `docs/motion.md` and `docs/gestures.md`).

- **Gesture animations end on the next touch.** The page rail (slide-in after the pill or Back, the spring back of a cancelled swipe, and the last stretch of a committed swipe), the month slide, the dock's pulse and its entrance all stop at once when a new finger or key arrives; a committed swipe lands the new page immediately, and the new touch is already for that page. New `src/lib/interrupt.ts` (`endOnTouch`), used by `PageSwiper.tsx`, `MonthView.tsx`, `Modal.tsx`, `ActionDock.tsx`. [docs/motion.md](docs/motion.md#ending-an-animation-early), [docs/gestures.md](docs/gestures.md)
- **Savings button, closing.** The *New savings goal* sheet that the savings button opens (when there is no goal yet) was the one sheet without a `dockId`, so it dropped away while income, expense, recurring, log again and gift cards shrink into their button. It now shrinks into the pig button too. [docs/features/savings-goals.md](docs/features/savings-goals.md)
- **The button bar exists on the Month page only.** On Transactions, Budgets and Statistics it is gone, and the pages get the normal bottom padding. It enters from the side the page came from and leaves towards the side the page went (`--kc-swipe-dir`, 130 / 110 ms, bounce spring), Kakcal's dock animation; with a swipe it starts the moment the swipe is committed (like the header pill). `ActionDock` has a `show` prop and an in / out / gone phase. Sheets opened on another page just drop away (no button to shrink into). [docs/motion.md](docs/motion.md), [docs/features/month.md](docs/features/month.md)
- **The confirm button is always visible.** The save row of every sheet (entry, recurring, goal, budget, account, gift card, profile) and the *Confirm amount* / *Use this rate* key of the number pad stick to the bottom of the sheet's scroll area (`.kc-sticky-footer`). [docs/features/entries.md](docs/features/entries.md)
- **Add expense: one row of categories.** The sheet shows only the 4 most recently used categories; a *Show all · N* button opens the rest, also most recent first, plus the *New* tile. A choice made in the open list stays visible when it is folded. The same `ChoiceGrid` (`collapsible`) serves income sources, goals and the recurring sheet. [docs/features/entries.md](docs/features/entries.md), [docs/features/categories.md](docs/features/categories.md)
- **Date above the amount** in the entry sheet, and in the same spirit in the sheets that have both: the recurring sheet (*Repeats* and its date / day now come before the amount) and the gift card sheet (*Valid until* before the value). [docs/features/recurring.md](docs/features/recurring.md), [docs/features/gift-cards.md](docs/features/gift-cards.md)
- **`changes.patch`:** how it was made and how to apply it: [docs/changes-patch.md](docs/changes-patch.md). Not tested in a real browser (see [docs/known-gaps.md](docs/known-gaps.md)).

## Previous round: transactions switch, instant page pill, sheets sucked into the bar

- **Transactions:** the **List / 2 days** switch now sits at the **right end of the entries recap** line ("12 entries · in … · out …") and shows **icons only** (no text; the names stay as tooltip and screen-reader label). [docs/features/transactions.md](docs/features/transactions.md)
- **Page pill:** when a swipe changes the page, the coloured pill now moves **the moment the swipe is committed**; it used to wait until the page had finished sliding (about 170 ms later). New `src/lib/pillTab.ts`, used by `Tabs.tsx` and `PageSwiper.tsx`. [docs/gestures.md](docs/gestures.md), [docs/motion.md](docs/motion.md)
- **Profile and Settings** close by being **sucked into the middle of the button bar** (the whole dock, which pulses a little), like the sheets that dock buttons open. New `getDockCenterTarget()` in `src/lib/dock.ts` and the `dockCenter` prop of `Modal`. Without a dock on screen they drop away as before. [docs/motion.md](docs/motion.md)
- **Excel export:** checked, nothing to build: it was already complete (Settings > *Your data*, next to *Save backup* / *Restore backup*). A workbook made from the sample journal opens with its five sheets. [docs/features/excel-export.md](docs/features/excel-export.md)

## Previous round: data safety, budget scope, Excel export

- **Currency lock:** the journal's currency can no longer be switched once the journal holds amounts (entries, budgets, goal targets, opening balances...). Amounts are bare numbers, so a switch would have relabelled them (100 EUR shown as 100 USD) without converting. Settings explains this and how to start in another currency; `updateSettings` also refuses it as a safety net. The untouched sample journal is exempt. [docs/features/currencies.md](docs/features/currencies.md)
- **Restore with a preview:** choosing a backup file now only validates it. A dialog shows entries, date range, currency, accounts, goals and budgets of the file next to the current journal, says *This will replace your current journal*, and offers to save a copy of the current one first. Nothing changes until *Replace journal*. [docs/features/backup.md](docs/features/backup.md)
- **Failed saves are visible:** if the browser refuses to store the journal (full, blocked, private mode) a banner stays on every page (*Changes aren't being saved on this device*) with *Export a backup now* and *Try again*; closing the tab asks first. *Your data* in Settings shows the save status and the date of the last backup file. [docs/features/backup.md](docs/features/backup.md)
- **Budget scope:** the Budgets page says what the headline figure covers (*Budgeted categories* or *Overall monthly budget*), shows *Unbudgeted spending: X* and one-tap *Set budget* chips for the categories behind it. The Month page's Budget card carries the same label and opens the Budgets page. [docs/features/budgets.md](docs/features/budgets.md)
- **Export to Excel:** Settings > Your data > *Export to Excel* writes a readable `.xlsx` (Summary, Transactions, Budgets, Goals, Accounts, Gift cards). It is for reading and sharing, not a backup. Adds the `write-excel-file` dependency, loaded only when the button is used. [docs/features/excel-export.md](docs/features/excel-export.md)

## Previous round: month sections, no day cards, comparable expense chart

- **Transactions:** the sideways **Day cards** layout is **removed** completely (List and 2 days stay; a saved *Day cards* choice becomes List). **Months are told apart** while scrolling: a card (List) or a heading line (2 days) per month with the month, its entry count and net. The **layout switch** moved **above the search bar**. [docs/features/transactions.md](docs/features/transactions.md)
- **Statistics, Expenses over time** (now its own component, `src/components/ExpenseChart.tsx`): **Bars or Line**; **compare periods** (previous period, same days last year, or two other dates) and **compare categories** (one colour each, top 3 by default); an **expand button** opens the chart **full screen**. [docs/features/statistics.md](docs/features/statistics.md)

## Previous round: filters, collapsible cards, stats periods and chart, weekly recurring, monthly budget

- **Unsaved-input question:** *Don't save* is now on the right (Keep editing on the left). [docs/features/entries.md](docs/features/entries.md)
- **Transactions:** the All / Expenses / Income / Savings chips sit **above the search bar**; next to the search bar a **filter icon** opens a panel (category, account, dates, amounts). The sideways *Days* layout was called **Day cards** here (removed in the newest round). [docs/features/transactions.md](docs/features/transactions.md)
- **Budgets:** every card (needs, wants, own types, goals, recurring) **collapses**, remembered per card. [docs/features/budgets.md](docs/features/budgets.md)
- **Monthly budget:** one **generic monthly budget** in the Profile, used as the Budget figure on the Budgets and Month pages. [docs/features/budgets.md](docs/features/budgets.md#generic-monthly-budget), [docs/features/profile.md](docs/features/profile.md)
- **Statistics:** new **1 month** and **Custom** (from / to dates) periods; a new **Expenses over time** chart (all expenses or picked categories, per day / week / month); **Where it went** collapses. [docs/features/statistics.md](docs/features/statistics.md)
- **Month page:** the "Needs · Wants · Savings" caption above the three cards is gone. [docs/features/month.md](docs/features/month.md)
- **Recurring items** can repeat every N **weeks** (each due date is its own checklist line); the *Every 2 months* quick button is removed. [docs/features/recurring.md](docs/features/recurring.md)

## Previous round: Frankfurter rates, text-free widgets, expense types, recurring every N months, always-visible dock

- **Exchange rates** now come from [Frankfurter](https://frankfurter.dev) (ECB rates, free, no key) instead of open.er-api.com; currencies it does not list keep the built-in approximate rate. [docs/features/currencies.md](docs/features/currencies.md)
- **Widgets:** the buttons have no text any more, only the round icon (the name stays as tooltip / accessibility label), in the app and on Android. [docs/features/widgets.md](docs/features/widgets.md)
- **Expense categories** are an expandable field in Settings (groups per type that fold open and shut), and you can add **your own types** next to Needs and Wants. [docs/features/categories.md](docs/features/categories.md)
- **Budgets:** the Accounts card is gone (accounts live in the Profile), and **Settings > Appearance > Hide the Budgets page** removes the page from the pill and the swipe. [docs/features/budgets.md](docs/features/budgets.md)
- **Recurring items** can repeat every 1, 2, 3, 6, 12 (or any number of) months, counted from a first month; they only show on the checklist in the months they are due. [docs/features/recurring.md](docs/features/recurring.md)
- **Bottom buttons** (add expense / income...) are pinned and never hide on scroll (since the *Latest round* they only exist on the Month page), and the month **calendar** is the first thing on the Month page. [docs/features/month.md](docs/features/month.md)
- **Entries in lists:** the category is the first line and the title sits right below it. [docs/features/transactions.md](docs/features/transactions.md)
- **Transactions:** a new **2 days** layout shows two days next to each other. [docs/features/transactions.md](docs/features/transactions.md)

## Previous round: language, collapsible settings, accounts in the profile, rounder widgets

- **Language:** Settings starts with an English / Italiano choice. Every visible text goes through `t()` (`src/lib/i18n.ts`), the Italian texts live in `src/lib/i18n.it.ts`; numbers and month names follow. [docs/features/language.md](docs/features/language.md)
- **Settings:** order is Language, Appearance (now with *Hide needs, wants and savings*), Currency, Buttons in the bottom bar, Widgets (all collapsible), then notifications, install, data. No more Gestures list; *Delete all data* is as big as the other fields. [docs/features/settings.md](docs/features/settings.md)
- **Widgets:** a collapsible section of Settings instead of a popup; smaller icons in round pastel buttons like the bottom dock; the shape follows the number of buttons (circle, pill, card); on Android the tray uses the app's theme colours. [docs/features/widgets.md](docs/features/widgets.md)
- **Gift card button:** opens a list of the cards already added, tap one to spend it; adding a new card is one tap away. [docs/features/gift-cards.md](docs/features/gift-cards.md)
- **Month page:** Left / Per day / Budget wear the pastel card style, Needs / Wants / Savings the small note style (they used to be the other way round). The Bills category has a paper-with-lines icon instead of a lightning bolt. [docs/features/month.md](docs/features/month.md)
- **Profile:** several accounts, each with the money in it typed straight into a field; this replaces the old balance banner. [docs/features/accounts.md](docs/features/accounts.md)

## Previous round: widgets, gift cards, pig icon, visual fixes

- **Widgets:** a single button (the user picks the action), a multiple-button widget (the user picks the buttons) and an expense-type widget (one button per category, a tap opens Add expense with it chosen). Android home screen plus an optional strip on the Month page. [docs/features/widgets.md](docs/features/widgets.md)
- **Gift cards:** add cards, mark an expense as paid with one (the amount comes off the card), a Gift cards tracker on the Month page, and an optional gift card button in the bottom bar. [docs/features/gift-cards.md](docs/features/gift-cards.md)
- **Pig icon:** Savings now uses the logo's pig (`PigIcon`, `src/lib/pig.ts`) instead of Lucide's piggy bank. [docs/brand.md](docs/brand.md#the-pig-icon)
- **Fixes and field polish:** blurred hero cards under the header, clipped pills on the category cards, clearer amount field and account fields. [docs/features/month.md](docs/features/month.md)

## What was verified

The website and PWA were exercised in headless Chromium (entry flows, the page rail, sheets, Back, launch animation, Ultra minimal, reminders with a stubbed clock and permission, install prompt, offline reload). The Android project was generated and synced but **not compiled or run on a device**: there was no Android SDK where it was written, so its three Java files, the launch-screen colour and background reminders on Android are untested. Details and the device checklist: [docs/verification.md](docs/verification.md), [docs/known-gaps.md](docs/known-gaps.md).
