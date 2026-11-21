# File map: `src/components/`

> **Scope:** every shared component and what it exports.
>
> **Read when:** you need a building block or want to change one used on several screens.
>
> **Related:** [../design-system.md](../design-system.md), [pages.md](pages.md), [sheets.md](sheets.md)

| File | Exports | Role |
| --- | --- | --- |
| `Header.tsx` | `Header` | Sticky header: profile button, wordmark (tap = Month page / scroll to top), settings button, and the page pill below. Scroll handler (one write per frame, opacity and transform only, no blur) folds the name row away in the first 48 px and hides / reveals the pill by scroll direction. Tapping the logo adds `.is-oinking` for 1.3 s: the pig takes its coin (CSS at the end of `index.css`) |
| `Tabs.tsx` | `Tabs` | The page pill. `NAV_META` = label, icon and the active pastel of each page; the order comes from `tabOrder()` (`lib/tabs.ts`; Budgets drops out when hidden in Settings). Only the active page shows its label (none do in Ultra minimal) |
| `ActionDock.tsx` | `ActionDock`, `DockAction` | The floating bottom bar, rendered in a portal. **Always visible**: pinned to the bottom on every page (Statistics too), it no longer hides while the page scrolls |
| `WidgetButtons.tsx` | `WidgetTile`, `WidgetFace` | One round widget button (small icon, **no text**, dock style) and a whole widget face whose shape follows the number of buttons (circle, pill, card). Used by the widget strip and the Settings previews | [../features/widgets.md](../features/widgets.md) |
| `ExpenseChart.tsx` | `ExpenseChart`, `ChartCategory` | The Statistics page's *Expenses over time* card: bars or line, compare periods or categories, full-screen view; uses `expenseSeries.ts`, `useBackLayer` | [../features/statistics.md](../features/statistics.md) |
| `WidgetStrip.tsx` | `WidgetStrip` | The three widgets at the top of the Month page, when `settings.widgets.showInApp` is on | [../features/widgets.md](../features/widgets.md) |
| `Modal.tsx` | `Modal` | Frame of every sheet: portal, scrim, focus trap, Escape, scroll lock (`kc-sheet-open` on `<html>`), Back layer, drag-to-close (thresholds at the top of the file; one write per frame, the scrim fades with the drag, the exit starts before the owner's re-render, `canClose` lets a form ask first), frame sized from `visualViewport` so it sits above the keyboard, exit animation into the dock button named by `dockId`. While closing it is `inert`; the next press ends the exit; a tap after a swipe-close is rescued. See [../motion.md](../motion.md) |
| `PageSwiper.tsx` | `PageSwiper` | The pages on one rail. Takes `renderPage(tab)`; renders the current page and, keyed by page id, the neighbours that are pre-mounted hidden (touch devices) or riding along during a swipe. Also the directional slide-in for page changes made any other way. All thresholds are constants at the top. See [../gestures.md](../gestures.md) |
| `MonthNavigator.tsx` | `MonthNavigator` | Month row: arrows, pill + year-grid popover, "Now"; swipeable; marked `data-no-swipe` so it keeps its gesture; the popover is a Back layer; icon-only pill in Ultra minimal |
| `cards.tsx` | `HeroCard`, `HeroPair`, `ShareCard`, `NoteCard`, `Pills`, `PillItem`, `FoldCard`, `Headline`, `EmptyRow`, `TxRow` | The card kit. `HeroPair` = Income / Spent style pair with balance pill. `ShareCard` = Needs / Wants / Savings. `NoteCard` = small yellow card (needs an `icon`). `FoldCard` = collapsible card used for categories (`variant="slot"`) and trackers (`variant="tracker"`, with its own palette in Classic). `TxRow` = an entry line with edit / delete. `Pills` = neutral grey figures with an icon (and a word) so they are not mistaken for Needs / Wants / Savings. Labels carry `um-sr` and icons `um-only` for Ultra minimal |
| `RecurringRow.tsx` | `RecurringRow` | One recurring item for a month: edit on tap, frequency in the sub-line, Log / Done button, or *Next Mar* in a month it is not due |
| `ui.tsx` | `seg`, `textInput`, `SectionLabel`, `KeyIcon`, `NumPad`, `AmountDisplay`, `useAmountBuffer`, `AmountStepper`, `Switch`, `Collapsible`, `ConfirmDialog`, `SaveBeforeCloseDialog`, `Bar`, `ToastHost` | Form and utility kit. `NumPad` = on-screen 3x4 keys + confirm button (also answers the physical keyboard); `useAmountBuffer` keeps the typed text; `AmountStepper` = minus / figure / plus with hold-to-repeat and optional chips, the figure opens a number pad (no native keyboard). `SaveBeforeCloseDialog` = the Save / Don't save / Keep editing question. `Bar` = progress bar. `ToastHost` = the one toast line with Undo |
| `InstallApp.tsx` | `InstallApp` | "Install app" card of Settings; text and button depend on `useInstallState()`; renders nothing in the Android app |
| `ProjectDownload.tsx` | `ProjectDownload` | "Project files" card of Settings: a download link to `downloads/koink-project.zip`; renders nothing in the Android app |
| `Brand.tsx` | `Wordmark`, `AppIcon` | The wordmark (theme-coloured, class `koink-wordmark`) and the app icon (light or dark tile with the theme), both built from `src/brand/art.js`. See [../brand.md](../brand.md) |

## Patterns worth knowing

- **Hook classes** (`kc-hero-intake`, `data-meal-slot`, `kc-themed-card`...) are how the style presets find elements. Keep them when you restyle; the map is in [../design-system.md](../design-system.md#the-borrowed-names).
- **Portals:** `ActionDock` and `Modal` render into `document.body`, so they are outside the swiped page and above it.
- **Animations** use the Web Animations API (`element.animate`) for anything driven by a gesture, CSS classes for entrances; both respect `prefers-reduced-motion`. Curves come from `SPRING` (`lib/spring.ts`), release speeds from `lib/velocity.ts`.
- **Ultra minimal:** mark labels `um-sr`, their stand-in icons `um-only`, hints `um-hide` ([../features/ultra-minimal.md](../features/ultra-minimal.md)).
- `getDockTarget()` (where a closing sheet flies to) lives in `src/lib/dock.ts`, not here, because component files may only export components.
