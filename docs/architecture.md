# Architecture

> **Scope:** how the app is put together: start-up, shell, state, sheets, and where web, PWA and Android differ.
>
> **Read when:** you are new to the code, or a change touches more than one area.
>
> **Related:** [data-model.md](data-model.md), [design-system.md](design-system.md), [motion.md](motion.md), [file-map/README.md](file-map/README.md)

## Stack

React 19 + TypeScript, built by Vite 7, styled with Tailwind CSS v4 utilities over CSS variables. Icons are `lucide-react`. Fonts are bundled from `@fontsource` (no network fonts). Capacitor 8 wraps the same build for Android (with its app, filesystem, share and local-notifications plugins). There is no router, no backend and no global state library. `framer-motion` and `react-router-dom` are in `package.json` from the project template but are not imported.

## Start-up

Before anything else, an inline script in `index.html` paints the saved colours ([launch-intro.md](launch-intro.md)). Then `src/main.tsx`, in import order:

1. the three stylesheets (`index.css`, `styles/presets.css`, `styles/intro.css`);
2. `lib/earlyStart.ts`, a side-effect module that runs **before the app's modules are evaluated**: `migrateLegacyStorage()` (keys from before the rename), `applyStoredTheme()` (theme and Ultra minimal on `<html>`), `applyMotionTokens()` (spring curves as CSS variables), `startLaunchIntro()` (the launch animation);
3. `App` and the rest, then `initBackHandling()` ([gestures.md](gestures.md)), `initInstallPrompt()` and `registerOfflineWorker()` ([pwa.md](pwa.md));
4. the first render, one painted frame after the launch animation started.

## Shell (`src/App.tsx`)

```
<AppProvider>                      state + actions (src/lib/store.tsx)
  <Header/>                        profile button, wordmark, settings button, page pill (Tabs)
  <main>
    <PageSwiper renderPage>        the pages on one rail: the current one, plus hidden neighbours on touch devices
      MonthView | TransactionsView | BudgetsView | StatsView
  <QuickAddBar/>                   the bottom dock (ActionDock); on the Month page only (`show`), never hides on scroll
  <TxSheet/> <QuickSheet/> ...     every sheet is always mounted and shows itself when its type is open
  <ToastHost/>
```

There are four pages (`ActiveTab` = `month | transactions | budgets | stats`); the order lives in `src/lib/tabs.ts`. The current page and the browsed month are plain state in the provider, not URLs.

`Shell` also holds three small things that are not visual: `openTarget()` (the one way in for a tapped reminder, a home-screen shortcut or `?open=`), `useReminders()` ([notifications.md](notifications.md)) and `useReportAppReady()` (tells the launch animation the first screen is painted).

## State (`src/lib/store.tsx`)

`useApp()` returns everything a component may need:

- `data`: the whole journal (`AppData`: `txs`, `goals`, `recurring`, `profile`, `settings`). Saved to `localStorage` after every change.
- Navigation: `activeTab`, `setActiveTab`, `selectedMonth`, `setSelectedMonth`.
- Sheets: `sheet`, `openSheet`, `closeSheet`, `sheetSeq`.
- Actions: `addTx`, `updateTx`, `removeTx`, `saveGoal`, `removeGoal`, `saveRecurring`, `removeRecurring`, `logRecurring`, `setBudget`, `updateProfile`, `updateSettings`, `eraseAll`, `loadSample`, `exportData`, `importData`.
- Formatting in the chosen currency: `money`, `moneyFit`, `symbol`.
- Toasts: `toast`, `showToast`, `dismissToast`.

Pages never keep totals in state: they derive them with the pure functions of `src/lib/calc.ts` inside `useMemo`. View preferences (open cards, layout, filters) use `usePersistentState` with their own small keys.

## Sheets

One sheet is open at a time: `sheet` is a tagged union (`Sheet` in `src/lib/types.ts`). Each sheet component calls `useSheet('itsType')`, which also keeps the last value while the closing animation plays. The form inside is keyed by `sheetSeq`, so every opening starts fresh. `Modal.tsx` supplies the frame: bottom sheet on phones, centred dialog from 640 px, focus trap, Escape, scrim tap, drag-to-close, Back, keyboard-aware placement, and the "sucked into the dock button" exit that never blocks the page ([motion.md](motion.md)). `ConfirmDialog` and `SaveBeforeCloseDialog` are second `Modal`s stacked on top. A sheet may refuse to close: the entry sheet passes its own `onClose`, which asks first when there is unsaved input.

## Web, PWA, Android: the differences

| | Browser tab | Installed PWA | Android app |
| --- | --- | --- | --- |
| Files come from | the host | the offline worker's cache | the APK (`https://localhost/`) |
| Offline worker | registered | registered | not built, not registered |
| Back closes sheets | yes (history sentinel) | yes | yes (`@capacitor/app`) |
| Back returns to Month | no | yes | yes, then backgrounds the app |
| Save backup | download | download | share sheet (`@capacitor/filesystem` + `@capacitor/share`) |
| Reminders | timers, only while open | timers, only while open | system alarms, also when closed (`@capacitor/local-notifications`) |
| Install card in Settings | shown | says "installed" | hidden |
| System-bar icon colour | browser | browser | follows the theme (`SystemBars`) |
| Launch colour before the page | first paint from `koink_boot` | the same | also the system launch screen, window and WebView (`KoinkDevice`) |

All platform checks go through `src/lib/platform.ts` (`isNativeApp`, `isStandaloneApp`, `isAppShell`). No other file asks Capacitor where it is running.
