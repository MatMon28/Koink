# Creating and applying `changes.patch`

> **Scope:** how the patch handed back with a round of work is made and applied.
>
> **Read when:** you receive a `changes.patch` or have to produce one.
>
> **Related:** [prepare-apps.md](prepare-apps.md)

`changes.patch` is `git diff --binary` between the repository at the commit **`826fadf`** (the head of `main` when this round started) and the working copy after the *Latest round* (see the root [README.md](../README.md)). It contains source, CSS, Android resources and documentation only: no `node_modules/`, `dist/`, `package.json` or lock file change, and it does not contain itself.

```sh
git apply --check changes.patch   # dry run
git apply --index changes.patch   # apply and stage (new files included)
# the repository has moved on since 826fadf:
git apply --3way changes.patch
```

To make the next one: commit or stash nothing, edit, `git add -A`, then `git diff --cached --binary > changes.patch` and unstage with `git reset`. Keep the docs of every changed file in the same patch (rule in [README.md](README.md#keeping-the-docs-current)).

## What the Latest round changed

- New files: `android/app/src/main/res/drawable/widget_tray_card_ring.xml`, `android/app/src/main/res/drawable/widget_tray_pill_ring.xml`, `android/app/src/main/res/layout/widget_spacer.xml`, `src/components/ChartLargeView.tsx`, `src/components/ChartPlot.tsx`, `src/components/ChartPopup.tsx`, `src/lib/usePresence.ts`, `docs/changes-patch.md` is rewritten.
- Edited: `README.md`, `android/app/src/main/java/com/koink/app/KoinkWidgetProvider.java`, `android/app/src/main/res/layout/widget_button.xml`, `android/app/src/main/res/layout/widget_button_single.xml`, `android/app/src/main/res/layout/widget_buttons.xml`, `android/app/src/main/res/layout/widget_row.xml`, `docs/design-system.md`, `docs/features/entries.md`, `docs/features/statistics.md`, `docs/features/widgets.md`, `docs/file-map/android-native.md`, `docs/file-map/components.md`, `docs/file-map/lib.md`, `docs/gestures.md`, `docs/known-gaps.md`, `docs/motion.md`, `src/components/ExpenseChart.tsx`, `src/components/PageSwiper.tsx`, `src/components/WidgetButtons.tsx`, `src/components/WidgetStrip.tsx`, `src/components/ui.tsx`, `src/index.css`, `src/lib/expenseSeries.ts`, `src/lib/i18n.it.ts`, `src/lib/widgets.ts`, `src/sheets/TxSheet.tsx`.
