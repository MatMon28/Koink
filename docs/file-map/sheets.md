# File map: `src/sheets/`

> **Scope:** every bottom sheet and the helpers they share.
>
> **Read when:** you change a form, or add a sheet.
>
> **Related:** [../architecture.md](../architecture.md#sheets), [components.md](components.md) (`Modal`, `ui.tsx`)

| File | Exports | Sheet type(s) | Role | Feature doc |
| --- | --- | --- | --- | --- |
| `TxSheet.tsx` | `TxSheet` | `tx` | Add or edit an entry in two screens: amount on a number pad (with currency chip), then banner, category tiles (+ New), account, title, long note, date, save / delete; side screens for the exchange rate and a new category. Asks before unsaved input is dismissed (`FormGuard`, `SaveBeforeCloseDialog`) | [../features/entries.md](../features/entries.md) |
| `QuickSheet.tsx` | `QuickSheet`, `RecurringSheet` | `quick`, `recurring` | "Log again" list of frequent entries; this month's recurring checklist | [../features/entries.md](../features/entries.md), [../features/recurring.md](../features/recurring.md) |
| `EditSheets.tsx` | `RecurringEditSheet`, `GoalSheet`, `BudgetSheet` | `recurringEdit`, `goal`, `budget` | Create / edit / delete a recurring item; create / edit / delete a goal; set a category budget | [../features/recurring.md](../features/recurring.md), [../features/savings-goals.md](../features/savings-goals.md), [../features/budgets.md](../features/budgets.md) |
| `AccountSheet.tsx` | `AccountSheet` | `account` | Create / edit / delete an account and set its balance today | [../features/accounts.md](../features/accounts.md) |
| `CategoriesSheet.tsx` | `CategoriesSheet` | `categories` | Manage expense categories: create, edit, hide / show, delete | [../features/categories.md](../features/categories.md) |
| `shared.tsx` | `ChoiceGrid`, `Banner`, `SaveRow`, `CurrencyGrid`, `IconPicker` | (helpers) | Shared pieces of the forms | |
| `ProfileSheet.tsx` | `ProfileSheet` | `profile` | Balance banner, name, the needs / wants / savings rule | [../features/profile.md](../features/profile.md) |
| `SettingsSheet.tsx` | `SettingsSheet` | `settings` | Currency, appearance (with the Ultra minimal switch), dock buttons, notifications, install card, gestures list, data tools, project download, delete all | [../features/settings.md](../features/settings.md) |
| `NotificationSettings.tsx` | `NotificationSettings` | (inside Settings) | The Notifications group: a switch row per reminder with its time (and weekday), permission banner, test button | [../notifications.md](../notifications.md) |
| `shared.tsx` | `ChoiceGrid`, `Choice`, `Banner`, `BannerTone`, `SaveRow` | | Icon-tile picker (a radio group); pastel summary banner at the top of a sheet; the closing row with the wide save button and optional delete | |

## The pattern every sheet follows

```tsx
export function GoalSheet() {
  const { isOpen, sheet, seq } = useSheet('goal');   // stays filled while the exit animation plays
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title="...">
      {sheet && <GoalForm key={seq} sheet={sheet} />} {/* key = fresh form state on every open */}
    </Modal>
  );
}
```

- The inner form reads what it edits **once**, into `useState`, when it mounts; it does not follow later changes to the journal.
- Sheets that the dock opens pass `dockId` (`income`, `expense`, `saving`, `recurring`, `quick`) so they fly back into their button when closed.
- Destructive actions use `ConfirmDialog`, except deleting an entry, which is immediate with Undo.
- A sheet may pass its own `onClose` to `Modal` and refuse to close (the entry sheet does, to ask about unsaved input). `Modal` and Back both cope with a refusal.

To add a sheet: extend the `Sheet` union in `src/lib/types.ts`, write the component as above, mount it in `Shell` (`src/App.tsx`), open it with `openSheet({ type: 'yours' })`.
