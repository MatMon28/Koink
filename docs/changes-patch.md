# Creating and applying `changes.patch`

> **Scope:** how the patch handed back with a round of work is made and applied.
>
> **Read when:** you receive a `changes.patch` or have to produce one.
>
> **Related:** [prepare-apps.md](prepare-apps.md), [pwa-setup.md](pwa-setup.md)

`changes.patch` is `git diff --binary` between the repository at the commit **`cb7512a`** ("UI/UX fixes", the head of `main` when this round started) and the working copy after the *Latest round* (see the root [README.md](../README.md)): the UI / UX coherence audit. It adds one file, `guide to UI UX fixes.md`, and updates the documentation that points to it. **It changes no source file**: the fixes are the work that guide describes, and each of its eight steps can come back as its own patch. It contains no `node_modules/`, `dist/`, `package.json` or lock file change, it does not contain itself, and it deletes nothing.

```sh
git apply --check changes.patch   # dry run
git apply --index changes.patch   # apply and stage (new files included)
# the repository has moved on since cb7512a:
git apply --3way changes.patch
```

To make the next one: commit or stash nothing, edit, `git add -A`, then `git diff --cached --binary > changes.patch` and unstage with `git reset`. Keep the docs of every changed file in the same patch (rule in [README.md](README.md#keeping-the-docs-current)).

## What the Latest round changed (UI / UX fixes and interruptible animations)

This patch is `git diff --binary` against **`e90c431`** ("Removed tracking", the head of `main` when the round started). It changes code, so apply it on that commit (or with `--3way`).

- Edited code: `src/index.css`, `src/App.tsx`, `src/lib/{icons,i18n.it}.ts`, `src/components/{PageSwiper,Modal,ui,cards,Tabs,DataStatus,StorageBanner,MonthNavigator,InstallApp,ProjectDownload,RecurringRow,PersonalInflation,ExpenseChart}.tsx`, `src/pages/{MonthView,TransactionsView,StatsView,BudgetsView}.tsx`, `src/sheets/*.tsx` (hex to tokens, icon scale, shared controls, wording).
- Edited docs: `README.md`, `guide to UI UX fixes.md` (section 6), `docs/{design-system,gestures,motion,known-gaps,changes-patch}.md`, `docs/file-map/{components,lib}.md`, `docs/features/{transactions,settings,language}.md`.
- No new file, dependency, schema or binary change. No stored data changes (icon keys in `ICON_CHOICES` are untouched).
- Verification: `git apply --check changes.patch`, `npx tsc -b`, `npm run build`. `eslint` is not a dependency of the repository, so the guide's `npm run lint` step could not run.

## What the previous round changed (UI / UX coherence audit)

- New: `guide to UI UX fixes.md` (root; the file name has spaces, so quote it on a command line).
- Edited docs: `README.md`, `docs/README.md`, `docs/design-system.md`, `docs/known-gaps.md`, `docs/changes-patch.md`, `docs/file-map/config-scripts-public.md`.
- No code, dependency or binary change. Nothing to build or test: `git apply --check changes.patch` is the whole verification.

## What the previous round changed (hidden categories, "..." tile, titles, personal inflation, scroll fade, widgets)

- New: `src/sheets/TitleField.tsx`, `src/components/PersonalInflation.tsx`, `src/lib/inflation.ts`, `src/lib/scrollFade.ts`, `android/app/src/main/java/com/koink/app/KoinkWidgetConfigActivity.java`, `android/app/src/main/res/drawable/widget_tray_bg.xml`.
- Edited code: `src/main.tsx`, `src/index.css`, `src/components/{ActionDock,ChartLargeView,ChartPopup,ExpenseChart,InstallGuide,Modal,ModeChooser,WidgetButtons}.tsx`, `src/lib/{i18n.it,store,types,widgetBridge,widgets}.ts(x)`, `src/pages/StatsView.tsx`, `src/sheets/{TxSheet,WidgetsSettings,shared}.tsx`, `android/app/src/main/{AndroidManifest.xml,java/com/koink/app/KoinkWidgetProvider.java}`, `android/app/src/main/res/{layout/widget_button,layout/widget_button_single,layout/widget_buttons,values/strings,xml/widget_single_info}.xml`.
- Edited docs: `README.md`, `docs/{data-model,design-system,known-gaps,verification,changes-patch}.md`, `docs/file-map/{android-native,components,lib,sheets}.md`, `docs/features/{categories,entries,statistics,widgets}.md`.
- No dependency or binary change. The new setting `Settings.inflationExcluded` is optional in stored journals (older ones load with none).

## What the previous round changed (second swipe, chart reset, notifications, transparent widgets)

- New: `src/components/RotateScreenIcon.tsx`, `src/lib/chartTurn.ts`.
- Deleted: `android/app/src/main/res/drawable/widget_tray_{card,card_ring,pill,pill_ring}.xml`.
- Edited code: `src/components/{PageSwiper,ChartPopup,ChartLargeView,ExpenseChart,WidgetButtons}.tsx`, `src/lib/{i18n.it,notifications,reminders,useReminders,widgets}.ts`, `src/pages/{MonthView,StatsView}.tsx`, `src/sheets/{TxSheet,NotificationSettings}.tsx`, `android/app/src/main/java/com/koink/app/KoinkWidgetProvider.java`, `android/app/src/main/res/layout/widget_buttons.xml`.
- Edited docs: `README.md`, `docs/{gestures,notifications,known-gaps,verification,changes-patch}.md`, `docs/file-map/{components,lib}.md`, `docs/features/{statistics,month,entries,widgets}.md`.
- No dependency, schema or binary change.

## What the previous round changed (Basic mode)

- New: `src/lib/mode.ts`, `src/components/ModeChooser.tsx`, `docs/features/basic-mode.md`.
- Edited code: `src/App.tsx`, `src/components/{MonthNavigator,WidgetStrip}.tsx`, `src/lib/{categories,i18n.it,reminders,store,types,useReminders,useWidgets}.ts(x)`, `src/pages/{MonthView,StatsView,TransactionsView}.tsx`, `src/sheets/{CategoriesSheet,NotificationSettings,ProfileSheet,SettingsSheet,TxSheet}.tsx`.
- Edited docs: `README.md`, `docs/README.md`, `docs/data-model.md`, `docs/known-gaps.md`, `docs/notifications.md`, `docs/verification.md`, `docs/changes-patch.md`, `docs/file-map/{components,lib}.md`, `docs/features/{accounts,budgets,categories,month,profile,settings,statistics,transactions,widgets}.md`.
- No dependency, schema or binary change.

## What the previous round changed (new logo)


- Edited: `README.md`, `public/favicon.svg`, `scripts/render-brand.mjs`, `src/brand/art.js`, `src/components/Brand.tsx`, `src/components/Header.tsx`, `src/index.css`, and the docs `docs/README.md`, `docs/brand.md`, `docs/changes-patch.md`, `docs/file-map/{app-shell,components,config-scripts-public,lib}.md`, `docs/gestures.md`, `docs/known-gaps.md`, `docs/launch-intro.md`, `docs/motion.md`, `docs/verification.md`.
- Regenerated by `npm run brand` (binary and SVG): the icons under `public/icons/`, the Android `mipmap-*` and `drawable-*dpi/ic_stat_koink.png` files, `public/brand/*`.
- New in `public/brand/`: `koink-intro-{coin-drop,draw-on,mint,peek,pop-toss}-*`, `koink-loader-spin-loop-*`, `koink-wordmark-animation-*`, `koink-press-{hop,keypress,oink,turnabout,wink-flip}-*`. Removed: the eight old intro SVGs.
