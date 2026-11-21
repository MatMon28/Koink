# Feature: Widgets

> **Scope:** three shortcut widgets (one button, several buttons, one button per expense type), drawn on the Android home screen and, optionally, at the top of the Month page.
>
> **Read when:** you change `src/lib/widgets.ts`, `src/lib/widgetBridge.ts`, `src/lib/useWidgets.ts`, `src/sheets/WidgetsSettings.tsx`, `src/components/WidgetButtons.tsx`, `src/components/WidgetStrip.tsx` or `android/.../KoinkWidgetProvider.java`.
>
> **Related:** [settings.md](settings.md), [gift-cards.md](gift-cards.md), [../android.md](../android.md), [../data-model.md](../data-model.md). The structure follows the widgets of [Kakcal](https://github.com/MatMon28/Kakcalculator) (`docs/widgets.md` there): native `AppWidgetProvider` + `RemoteViews`, nothing but RemoteViews-safe classes in the layouts.

## Look and shape

- **Coherent with the app:** a button is a round pastel button with a small icon (17 px in the app, 18 dp on Android; the lone button's icon is 20) and **no text**: the name is only the tooltip / screen-reader label (`title` + `aria-label` in the app, `setContentDescription` on Android). Same family as the bottom dock. The tray behind several buttons is the dock's surface: border, soft shadow, `--surface` colour.
- **The shape follows the number of buttons** (`widgetShape`, `widgetColumns`, `widgetRows` in `src/lib/widgets.ts`; mirrored in `KoinkWidgetProvider.build`):

| Buttons | Shape | Rows |
| --- | --- | --- |
| 1 | a lone circle, no tray | 1 |
| 2 to 4 | a pill (fully rounded tray) | 1 row |
| 5 to 6 | a rounded card | 2 rows of 3 |
| 7 to 8 (up to 12 for the category list) | a rounded card | rows of 4 |

  A short last row is centred, never padded.
- **Single button:** the lone circle is **48** px / dp (it was 56), its icon 20.
- **Multi and category widgets:** the tray is **semitransparent** (the theme surface at `TRAY_ALPHA` = 0.72, its border ring lighter; on Android `setImageAlpha` on a hollow ring drawable plus a solid fill, so nothing is painted twice) and **as wide as the widget**. The buttons keep their size (circle 40) but share the tray's width evenly: **the wider the widget is made, the more space between the buttons** (in the app: `stretch` on `WidgetFace`, used by the Month-page strip; on Android: `layout_weight` tiles in `widget_row.xml`). A short last row is centred on the same grid with half-width spacers (`widget_spacer.xml`, `addSpacers` in `KoinkWidgetProvider.java`).
- **Theme:** the bridge hands the native side the app's current `--surface`, `--border` and `--text` (`readTheme()` in `widgetBridge.ts`, converted to `#rrggbb`), so the tray matches Light, Soft dark and Dark. It is re-sent when the theme, style, mono colour or language changes. The button names are sent already translated (they are only the accessibility description, nothing is drawn).

## The three widgets

| Widget | Launcher name | Default size | What the user decides |
| --- | --- | --- | --- |
| **Single button** | Koink: Button | 1 x 1 | which one action the button does |
| **Multiple buttons** | Koink: Buttons | 4 x 1 (two rows from five buttons, see *Look and shape*) | which buttons (up to 6), in tap order |
| **Expense types** | Koink: Expense types | 4 x 2 | which expense categories (up to 8); none chosen = the first 8 visible categories. A tap opens *Add expense* with that category already chosen |

A button is an **action key** (`src/lib/widgets.ts`): `expense`, `income`, `saving`, `recurring`, `quick`, `giftcard`, `budgets`, `stats`, or `cat:<expense category id>`. Built-in and own categories both work; deleting a category removes it from the widgets (the single button falls back to *Expense*).

## Where it is configured

Settings > **Widgets** is a collapsible section (`WidgetsSettings`, no popup): a live preview and a chip picker per widget, and the switch **Show them on the Month page**. The choices are `settings.widgets` (stored in the journal, so they are in the backup).

## In the app (browser, PWA, Android)

With the switch on, `WidgetStrip` shows the same three widgets above the cards on the Month page (hidden in Ultra minimal). `WidgetFace` / `WidgetTile` (`src/components/WidgetButtons.tsx`) draw them, and the sheet's preview uses the same components. Pressing a tile runs `useRunWidgetAction()` (`src/lib/useWidgets.ts`), which opens the matching sheet or page.

## On the Android home screen

1. `useWidgetSync()` (mounted in the shell) turns `settings.widgets` into JSON with `buildNativeWidgets()` (`src/lib/widgetBridge.ts`): for every button its label, colours, an **icon as a base64 PNG** and a link. The icons are the app's own Lucide icons and the Koink pig, drawn once into a canvas, so Android needs no icon files and always matches the app. The call is debounced (700 ms) and only happens in the native app.
2. `syncWidgets(json)` (`platform.ts`) calls the plugin method `KoinkDevice.setWidgets`, which stores the JSON (SharedPreferences `koink_widgets`) and redraws every placed widget (`KoinkWidgetProvider.save`).
3. `KoinkWidgetProvider` (`Single`, `Multi`, `Categories` are its three receivers) builds `RemoteViews` from `widget_buttons.xml` (tray: `widget_tray_pill.xml` or `widget_tray_card.xml`, tinted with the theme) > `widget_row.xml` > `widget_button.xml` (or `widget_button_single.xml` for the lone circle). Each tile is a white circle tinted with `setColorFilter`, the small icon bitmap and the name; its click starts the app with `koink://widget?a=<action>`.
4. `AndroidManifest.xml` has an intent filter for `koink://widget` on `MainActivity`. The web app reads the link (`App.getLaunchUrl()` on a cold start, the `appUrlOpen` event when it is already running) in `useWidgetSync()` and runs the action.

Until the app has been opened once after the widget was placed, the widget shows "Open Koink once to set this widget up" (tapping it opens the app).

## Rules

- Hex colours only in `widgets.ts`: the widget cannot read CSS variables.
- A widget layout may only use `LinearLayout`, `FrameLayout`, `ImageView`, `TextView` and the like (a plain `<View>` makes the launcher refuse the widget: see Kakcal's `docs/widgets.md`).
- To add an action: add it to `FIXED` and `KEY_PATTERN` in `widgets.ts`, handle it in `useRunWidgetAction`.

## Not verified

The Android widgets were written without an Android SDK (like the rest of `android/`): not compiled and not run on a device. The web side (strip, sheet, settings) compiles and builds. See [../known-gaps.md](../known-gaps.md).
