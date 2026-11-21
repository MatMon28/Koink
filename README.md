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
| **Transactions page** (search, filter, list or days side by side, quick delete) | `src/pages/TransactionsView.tsx` | [features/transactions.md](docs/features/transactions.md) |
| **Budgets page** (category budgets, goals, recurring lists, accounts card) | `src/pages/BudgetsView.tsx`, `src/sheets/EditSheets.tsx` | [features/budgets.md](docs/features/budgets.md) |
| **Statistics page** (averages, balance trend, breakdown) | `src/pages/StatsView.tsx` | [features/statistics.md](docs/features/statistics.md) |
| **Add / edit an entry** (number pad, title + long note, account, currency), "Log again" | `src/sheets/TxSheet.tsx`, `src/sheets/QuickSheet.tsx`, `src/sheets/shared.tsx`, `NumPad` / `AmountStepper` in `src/components/ui.tsx` | [features/entries.md](docs/features/entries.md) |
| **Widgets** (single button, multiple buttons, expense-type buttons; Android home screen + Month-page strip) | `src/lib/widgets.ts`, `src/lib/widgetBridge.ts`, `src/lib/useWidgets.ts`, `src/sheets/WidgetsSheet.tsx`, `src/components/WidgetButtons.tsx`, `src/components/WidgetStrip.tsx`, `android/app/src/main/java/com/koink/app/KoinkWidgetProvider.java` | [features/widgets.md](docs/features/widgets.md) |
| **Gift cards** (add a card, pay an expense with it, tracker on the Month page, optional bottom-bar button) | `src/lib/giftcards.ts`, `src/sheets/GiftCardSheet.tsx`, `src/sheets/TxSheet.tsx` (*Pay with a gift card*), `src/pages/MonthView.tsx` (tracker) | [features/gift-cards.md](docs/features/gift-cards.md) |
| **Accounts** (balance per account) | `src/sheets/AccountSheet.tsx`, `accountBalance` in `src/lib/calc.ts`, accounts card in `src/pages/BudgetsView.tsx` | [features/accounts.md](docs/features/accounts.md) |
| **Expense categories** (own, hide, delete) | `src/lib/categories.ts`, `src/lib/icons.ts`, `src/sheets/CategoriesSheet.tsx` | [features/categories.md](docs/features/categories.md) |
| **Currencies and exchange rates** (per-entry currency) | `src/lib/format.ts`, `src/sheets/TxSheet.tsx`, `src/sheets/SettingsSheet.tsx` | [features/currencies.md](docs/features/currencies.md) |
| **Recurring items** | `src/sheets/EditSheets.tsx`, `src/sheets/QuickSheet.tsx`, `src/components/RecurringRow.tsx` | [features/recurring.md](docs/features/recurring.md) |
| **Savings goals** | `src/sheets/EditSheets.tsx` (`GoalSheet`), `src/lib/calc.ts` (`goalSaved`) | [features/savings-goals.md](docs/features/savings-goals.md) |
| **Profile and the budget rule** (50 / 30 / 20) | `src/sheets/ProfileSheet.tsx` | [features/profile.md](docs/features/profile.md) |
| **Settings** (currency, bottom bar, install card, gestures list) | `src/sheets/SettingsSheet.tsx`, `src/components/InstallApp.tsx` | [features/settings.md](docs/features/settings.md) |
| **Backup, restore, sample data, delete all** | `src/lib/store.tsx`, `src/lib/platform.ts` (`saveTextFile`), `src/lib/demo.ts` | [features/backup.md](docs/features/backup.md) |
| **Themes and style presets** | `src/lib/themes.ts`, `src/index.css`, `src/styles/presets.css` | [features/themes.md](docs/features/themes.md), [design-system.md](docs/design-system.md) |
| **Smooth sheet drag / header scroll, logo click animation** | `src/components/Modal.tsx`, `src/components/Header.tsx`, end of `src/index.css` | [motion.md](docs/motion.md#smoothness-fixes-sheet-drag-scrolling) |
| **Swipes, Back button, drag-to-close** | `src/components/PageSwiper.tsx`, `src/lib/back.ts`, `src/components/Modal.tsx`, `src/components/MonthNavigator.tsx`, `src/lib/velocity.ts` | [gestures.md](docs/gestures.md) |
| **Reminder notifications** | `src/lib/reminders.ts` (plan), `src/lib/notifications.ts` (delivery), `src/lib/useReminders.ts`, `src/sheets/NotificationSettings.tsx` | [notifications.md](docs/notifications.md) |
| **Ultra minimal mode** | `um-*` classes at the end of `src/index.css`, `src/components/cards.tsx`, `Tabs.tsx`, `MonthNavigator.tsx` | [features/ultra-minimal.md](docs/features/ultra-minimal.md) |
| **Launch animations, first paint, Android launch-screen colour** | `src/brand/art.js` (`INTRO_ANIMATIONS`), `src/lib/intro.ts`, `src/styles/intro.css`, `src/lib/earlyStart.ts`, inline script in `index.html`; Android: `LaunchBackground.java`, `values/splash_themes.xml`, `scripts/generate-splash-themes.mjs` | [launch-intro.md](docs/launch-intro.md) |
| **Animation timing, springs, sheet exit** | `src/lib/spring.ts`, `src/components/Modal.tsx`, `src/index.css` | [motion.md](docs/motion.md) |
| **Unsaved-input question** | `src/sheets/TxSheet.tsx` (`FormGuard`), `SaveBeforeCloseDialog` in `src/components/ui.tsx` | [features/entries.md](docs/features/entries.md) |
| **PWA**: manifest, offline worker, install prompt, shortcuts | `public/manifest.webmanifest`, `scripts/offline-worker.template.js`, `vite.config.ts`, `src/lib/pwa.ts`, `index.html` | [pwa.md](docs/pwa.md) |
| **Android app**: Capacitor config, native project and its Java, back button, file sharing | `capacitor.config.json`, `android/` (Java in `android/app/src/main/java/com/koink/app/`), `src/lib/platform.ts`, `src/lib/back.ts`, `scripts/prepare-android.mjs` | [android.md](docs/android.md) |
| **Build, host or release either app** | `package.json`, `scripts/` | [prepare-apps.md](docs/prepare-apps.md) |
| **Project archive** (the "Download project" card in Settings) | `scripts/package-project.mjs`, `src/components/ProjectDownload.tsx`, `public/downloads/` | [prepare-apps.md](docs/prepare-apps.md#3-the-project-archive) |
| **Logo, icon, wordmark** (light and dark), generated icon files, notification icon, the **pig icon** (`PigIcon`) | `src/brand/art.js` (the one source), `src/lib/pig.ts`, `src/components/Brand.tsx`, `scripts/render-brand.mjs`, `public/brand/` | [brand.md](docs/brand.md) |
| **State, actions, what is stored** | `src/lib/store.tsx`, `src/lib/types.ts`, `src/lib/storage.ts` | [data-model.md](docs/data-model.md) |
| **Money maths** (totals, shares, budgets, formatting) | `src/lib/calc.ts`, `src/lib/format.ts`, `src/lib/dates.ts` | [data-model.md](docs/data-model.md) |
| **Categories and income sources** | `src/lib/categories.ts` | [data-model.md](docs/data-model.md) |
| **Header, page pill, bottom dock, sheets, toasts** | `src/components/Header.tsx`, `Tabs.tsx`, `ActionDock.tsx`, `Modal.tsx`, `ui.tsx` | [architecture.md](docs/architecture.md) |
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
src/lib/              state, maths, dates, themes, platform bridges, widgets, gift cards (no JSX except store.tsx)
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

## Latest round: widgets, gift cards, pig icon, visual fixes

- **Widgets:** a single button (the user picks the action), a multiple-button widget (the user picks the buttons) and an expense-type widget (one button per category, a tap opens Add expense with it chosen). Android home screen plus an optional strip on the Month page. [docs/features/widgets.md](docs/features/widgets.md)
- **Gift cards:** add cards, mark an expense as paid with one (the amount comes off the card), a Gift cards tracker on the Month page, and an optional gift card button in the bottom bar. [docs/features/gift-cards.md](docs/features/gift-cards.md)
- **Pig icon:** Savings now uses the logo's pig (`PigIcon`, `src/lib/pig.ts`) instead of Lucide's piggy bank. [docs/brand.md](docs/brand.md#the-pig-icon)
- **Fixes and field polish:** blurred hero cards under the header, clipped pills on the category cards, clearer amount field and account fields. [docs/features/month.md](docs/features/month.md)

## What was verified

The website and PWA were exercised in headless Chromium (entry flows, the page rail, sheets, Back, launch animation, Ultra minimal, reminders with a stubbed clock and permission, install prompt, offline reload). The Android project was generated and synced but **not compiled or run on a device**: there was no Android SDK where it was written, so its three Java files, the launch-screen colour and background reminders on Android are untested. Details and the device checklist: [docs/verification.md](docs/verification.md), [docs/known-gaps.md](docs/known-gaps.md).
