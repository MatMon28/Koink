# Feature: settings

> **Scope:** the sheet behind the cog: language, appearance (with Ultra minimal and the hide-split switch), currency, dock buttons, widgets, notifications, install card, data tools.
>
> **Read when:** you change `src/sheets/SettingsSheet.tsx`, `src/sheets/NotificationSettings.tsx`, `src/components/InstallApp.tsx`, `src/components/InstallGuide.tsx` or `src/components/ProjectDownload.tsx`.
>
> **Related:** [themes.md](themes.md), [ultra-minimal.md](ultra-minimal.md), [../notifications.md](../notifications.md), [backup.md](backup.md), [../pwa.md](../pwa.md), [../gestures.md](../gestures.md)

Every control applies at once (`updateSettings()`); there is no save button.

| Section | Controls |
| --- | --- |
| **Language** (first, always visible) | English / Italiano, a two-button segment (`settings.language`). See [language.md](language.md) |
| Appearance (collapsible, open) | Theme: Light / Soft dark / Dark. Style: Classic or one of six presets, each with its swatches. With Mono, ten colours to choose from. See [themes.md](themes.md). Then three switches: **Ultra minimal** ([ultra-minimal.md](ultra-minimal.md)), **Hide needs, wants and savings** (`settings.hideSplit`, takes the three cards off the Month page; it used to be a *Hide* button on that page) and **Hide the Budgets page** (`settings.hideBudgets`, see [budgets.md](budgets.md#hiding-the-page)) |
| Currency (collapsible) | the currency grid, or, once the journal holds amounts, a **locked** panel with the reason and the way to start in another currency; *Update exchange rates*. Amounts are never converted. [currencies.md](currencies.md) |
| Expense categories (collapsible) | an **expandable field** holding the whole category manager inline (`CategoriesBody`): one fold-open group per type (Needs, Wants, your own types), *New category* and *New type*. No popup. [categories.md](categories.md) |
| Buttons in the bottom bar (collapsible) | a switch per dock button: Income, Expense, Recurring, Log again, Savings, Gift cards (`settings.quickAdd`). With all off, the dock disappears |
| Widgets (collapsible) | `WidgetsSettings.tsx`: previews and pickers for the three widgets, the Month-page switch. **No popup**: everything is inside the section. See [widgets.md](widgets.md) |
| Notifications (collapsible) | four opt-in reminders with their times, permission banner, test button. See [../notifications.md](../notifications.md) |
| Install app | state-dependent card: one-tap **Install Koink** button when supported, a **How to install** button (or **Other devices** when installed) that opens `InstallGuide.tsx`, and a **Guided tour** button in the browser. Hidden in the Android app. See [../pwa.md](../pwa.md#install-card) |
| Your data (collapsible) | `DataStatus` (saved on this device? last backup file), Save backup, Restore backup (opens the preview dialog), **Export to Excel**, Load the sample journal. See [backup.md](backup.md), [excel-export.md](excel-export.md) |
| Project files | a card with **Download project (.zip)**. Hidden in the Android app. See [../prepare-apps.md](../prepare-apps.md#3-the-project-archive) |
| Footer | app icon and name |
| Delete all data | a full-width row, as big as the other fields (muted red); two confirmations. See [backup.md](backup.md) |

The **Gestures** list was removed from Settings; [../gestures.md](../gestures.md) is now the only place that lists them.

Shared controls used here, all from `src/components/ui.tsx`: `seg()` (segmented buttons), `Switch`, `Collapsible`, `SectionLabel`, `ConfirmDialog`.

The switches are `role="switch"` buttons with `aria-checked`; segmented choices use `aria-pressed`.

> **Added:** the **Widgets** collapsible ([widgets.md](widgets.md)) above Notifications, and a **Gift cards** switch in *Buttons in the bottom bar* (off by default, [gift-cards.md](gift-cards.md)).

## Currency, rates, categories (this version)

- **Currency** is a grid of ~40 currencies (`CurrencyGrid` in `sheets/shared.tsx`), the journal's own. **Update exchange rates** fetches current rates from Frankfurter ([currencies.md](currencies.md)); until then approximate built-in ones are used. Details: [currencies.md](currencies.md).
- **Expense categories** expands in place into the category manager ([categories.md](categories.md)); it is the same body as the sheet opened from the Budgets page.

## Mode (Basic / Full)

**Mode** sits right under Language: two cards, Basic and Full (`ModeSetting` in `src/components/ModeChooser.tsx`), applied at once; the same choice is asked on the first launch. In [Basic mode](basic-mode.md) Settings drops *Hide needs, wants and savings*, *Hide the Budgets page*, *Buttons in the bottom bar* and *Widgets*, and the texts that mention budgets, goals or accounts use a Basic wording.

## Switch rows and order (UI / UX fixes round)

Every switch row (Ultra minimal, hide needs / wants / savings, hide Budgets, the bottom-bar buttons, the reminders) is the shared `ToggleRow` of `src/components/ui.tsx`. *Delete all data* comes before the brand footer and uses `--text-warn`, so it reads on the dark themes.
