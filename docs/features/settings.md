# Feature: settings

> **Scope:** the sheet behind the cog: language, appearance (with Ultra minimal and the hide-split switch), currency, dock buttons, widgets, notifications, install card, data tools.
>
> **Read when:** you change `src/sheets/SettingsSheet.tsx`, `src/sheets/NotificationSettings.tsx`, `src/components/InstallApp.tsx` or `src/components/ProjectDownload.tsx`.
>
> **Related:** [themes.md](themes.md), [ultra-minimal.md](ultra-minimal.md), [../notifications.md](../notifications.md), [backup.md](backup.md), [../pwa.md](../pwa.md), [../gestures.md](../gestures.md)

Every control applies at once (`updateSettings()`); there is no save button.

| Section | Controls |
| --- | --- |
| **Language** (first, always visible) | English / Italiano, a two-button segment (`settings.language`). See [language.md](language.md) |
| Appearance (collapsible, open) | Theme: Light / Soft dark / Dark. Style: Classic or one of six presets, each with its swatches. With Mono, ten colours to choose from. See [themes.md](themes.md). Then two switches: **Ultra minimal** ([ultra-minimal.md](ultra-minimal.md)) and **Hide needs, wants and savings** (`settings.hideSplit`, takes the three cards off the Month page; it used to be a *Hide* button on that page) |
| Currency (collapsible) | the currency grid, *Update exchange rates*. Changes the symbol and formatting only; amounts are not converted. [currencies.md](currencies.md) |
| Expense categories | a row that opens the category manager ([categories.md](categories.md)) |
| Buttons in the bottom bar (collapsible) | a switch per dock button: Income, Expense, Recurring, Log again, Savings, Gift cards (`settings.quickAdd`). With all off, the dock disappears |
| Widgets (collapsible) | `WidgetsSettings.tsx`: previews and pickers for the three widgets, the Month-page switch. **No popup**: everything is inside the section. See [widgets.md](widgets.md) |
| Notifications (collapsible) | four opt-in reminders with their times, permission banner, test button. See [../notifications.md](../notifications.md) |
| Install app | state-dependent card: install button, manual instructions, or "installed". Hidden in the Android app. See [../pwa.md](../pwa.md#install-card) |
| Your data (collapsible) | Save backup, Restore backup, Load the sample journal. See [backup.md](backup.md) |
| Project files | a card with **Download project (.zip)**. Hidden in the Android app. See [../prepare-apps.md](../prepare-apps.md#3-the-project-archive) |
| Footer | app icon and name |
| Delete all data | a full-width row, as big as the other fields (muted red); two confirmations. See [backup.md](backup.md) |

The **Gestures** list was removed from Settings; [../gestures.md](../gestures.md) is now the only place that lists them.

Shared controls used here, all from `src/components/ui.tsx`: `seg()` (segmented buttons), `Switch`, `Collapsible`, `SectionLabel`, `ConfirmDialog`.

The switches are `role="switch"` buttons with `aria-checked`; segmented choices use `aria-pressed`.

> **Added:** the **Widgets** collapsible ([widgets.md](widgets.md)) above Notifications, and a **Gift cards** switch in *Buttons in the bottom bar* (off by default, [gift-cards.md](gift-cards.md)).

## Currency, rates, categories (this version)

- **Currency** is a grid of ~40 currencies (`CurrencyGrid` in `sheets/shared.tsx`), the journal's own. **Update exchange rates** fetches current rates; until then approximate built-in ones are used. Details: [currencies.md](currencies.md).
- **Expense categories** opens the category manager ([categories.md](categories.md)).
