# Feature: settings

> **Scope:** the sheet behind the cog: currency, appearance (with Ultra minimal), dock buttons, notifications, install card, gestures list, data tools.
>
> **Read when:** you change `src/sheets/SettingsSheet.tsx`, `src/sheets/NotificationSettings.tsx`, `src/components/InstallApp.tsx` or `src/components/ProjectDownload.tsx`.
>
> **Related:** [themes.md](themes.md), [ultra-minimal.md](ultra-minimal.md), [../notifications.md](../notifications.md), [backup.md](backup.md), [../pwa.md](../pwa.md), [../gestures.md](../gestures.md)

Every control applies at once (`updateSettings()`); there is no save button.

| Section | Controls |
| --- | --- |
| Currency | EUR, USD, GBP, CHF, JPY. Changes the symbol and formatting only; amounts are not converted |
| Appearance (collapsible, open) | Theme: Light / Soft dark / Dark. Style: Classic or one of six presets, each with its swatches. With Mono, ten colours to choose from. See [themes.md](themes.md). Last in the group: the **Ultra minimal** switch, see [ultra-minimal.md](ultra-minimal.md) |
| Buttons in the bottom bar | a switch per dock button: Income, Expense, Recurring, Log again, Savings (`settings.quickAdd`). With all off, the dock disappears |
| Notifications (collapsible) | four opt-in reminders with their times, permission banner, test button. See [../notifications.md](../notifications.md) |
| Install app | state-dependent card: install button, manual instructions, or "installed". Hidden in the Android app. See [../pwa.md](../pwa.md#install-card) |
| Gestures (collapsible) | a short reference list (`GESTURES` constant). Keep it in step with [../gestures.md](../gestures.md) |
| Your data (collapsible) | Save backup, Restore backup, Load the sample journal. See [backup.md](backup.md) |
| Project files | a card with **Download project (.zip)**: source, Android project, PWA files and documentation in one archive (`ProjectDownload.tsx`). Hidden in the Android app. See [../prepare-apps.md](../prepare-apps.md#3-the-project-archive) |
| Footer | app icon and name |
| Delete all data | small, muted red, centred; two confirmations. See [backup.md](backup.md) |

Shared controls used here, all from `src/components/ui.tsx`: `seg()` (segmented buttons), `Switch`, `Collapsible`, `SectionLabel`, `ConfirmDialog`.

The switches are `role="switch"` buttons with `aria-checked`; segmented choices use `aria-pressed`.

> **Added:** a **Widgets** row (opens `WidgetsSheet`, [widgets.md](widgets.md)) above Notifications, and a **Gift card** switch in *Buttons in the bottom bar* (off by default, [gift-cards.md](gift-cards.md)).

## Currency, rates, categories (this version)

- **Currency** is a grid of ~40 currencies (`CurrencyGrid` in `sheets/shared.tsx`), the journal's own. **Update exchange rates** fetches current rates; until then approximate built-in ones are used. Details: [currencies.md](currencies.md).
- **Expense categories** opens the category manager ([categories.md](categories.md)).
- The gestures list gained "Tap the logo".
