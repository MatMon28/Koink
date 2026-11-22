# Feature: Widgets

> **Scope:** three shortcut widgets (one button, several buttons, one button per expense type), drawn on the Android home screen and, optionally, at the top of the Month page.
>
> **Read when:** you change `src/lib/widgets.ts`, `src/lib/widgetBridge.ts`, `src/lib/useWidgets.ts`, `src/sheets/WidgetsSettings.tsx`, `src/components/WidgetButtons.tsx`, `src/components/WidgetStrip.tsx` or `android/.../KoinkWidgetProvider.java`.
>
> **Newest round:** semitransparent tray, bigger icons, and a **button picked per single-button widget when it is placed** (Android) - see *Look and shape* and *The three widgets*.
>
> **Related:** [settings.md](settings.md), [gift-cards.md](gift-cards.md), [../android.md](../android.md), [../data-model.md](../data-model.md). The structure follows the widgets of [Kakcal](https://github.com/MatMon28/Kakcalculator) (`docs/widgets.md` there): native `AppWidgetProvider` + `RemoteViews`, nothing but RemoteViews-safe classes in the layouts.

## Look and shape

- **Coherent with the app:** a button is a round pastel button with a small icon (20 px in the app, 22 dp on Android; the lone button's icon is 24) and **no text**: the name is only the tooltip / screen-reader label (`title` + `aria-label` in the app, `setContentDescription` on Android). Same family as the bottom dock. The tray behind several buttons is a semitransparent surface (see below).
- **The shape follows the number of buttons** (`widgetShape`, `widgetColumns`, `widgetRows` in `src/lib/widgets.ts`; mirrored in `KoinkWidgetProvider.build`):

| Buttons | Shape | Rows |
| --- | --- | --- |
| 1 | a lone circle, no tray | 1 |
| 2 to 4 | a pill (fully rounded tray) | 1 row |
| 5 to 6 | a rounded card | 2 rows of 3 |
| 7 to 8 (up to 12 for the category list) | a rounded card | rows of 4 |

  A short last row is centred, never padded.
- **Icons** are a little bigger than before: **22** dp in a round button (was 18), **24** dp in the lone circle (was 20); in the app 20 px (was 17) and 24 px (was 20). The circles themselves keep their size (40 and 48).
- **Single button:** the lone circle is **48** px / dp, with no tray.
- **Multi and category widgets:** the tray behind the buttons is a **semitransparent surface**, not fully transparent any more: the app's `--surface` colour at about **70 %** (`TRAY_ALPHA` = 178 in `KoinkWidgetProvider.java`, tinting the white `widget_tray_bg.xml` with `setColorFilter`; in the app `.kc-widget-tray` in `index.css` with a faint border). The shape is a rounded rectangle whose large radius makes a one-row tray a pill and a taller one a card. The tray is **as wide as the widget** and the buttons (circle 40) share its width evenly: **the wider the widget is made, the more space between the buttons** (in the app: `stretch` on `WidgetFace`, used by the Month-page strip; on Android: `layout_weight` tiles in `widget_row.xml`). A short last row is centred on the same grid with half-width spacers (`widget_spacer.xml`, `addSpacers` in `KoinkWidgetProvider.java`).
- **Theme:** the bridge hands the native side the app's current `--surface`, `--border` and `--text` (`readTheme()` in `widgetBridge.ts`, converted to `#rrggbb`), so the tray colour follows Light, Soft dark and Dark. It is re-sent when the theme, style, mono colour or language changes. The button names are sent already translated (they are only the accessibility description, nothing is drawn).

## The three widgets

| Widget | Launcher name | Default size | What the user decides |
| --- | --- | --- | --- |
| **Single button** | Koink: Button | 1 x 1 | which one action or expense category **this widget** is: asked when the widget is placed (and again when it is reconfigured) |
| **Multiple buttons** | Koink: Buttons | 4 x 1 (two rows from five buttons, see *Look and shape*) | which buttons (up to 6), in tap order |
| **Expense types** | Koink: Expense types | 4 x 2 | which expense categories (up to 8); none chosen = the first 8 visible categories. A tap opens *Add expense* with that category already chosen |

A button is an **action key** (`src/lib/widgets.ts`): `expense`, `income`, `saving`, `recurring`, `quick`, `giftcard`, `budgets`, `stats`, or `cat:<expense category id>`. Built-in and own categories both work; deleting a category removes it from the widgets (the single button falls back to *Expense*).

### One button per single widget (Android)

Each *Koink: Button* widget has **its own button**: when it is added to the home screen, `KoinkWidgetConfigActivity` opens a list of every action and every visible expense category (name, round coloured icon exactly as the widget will draw it); the tap on one stores it for that widget id (`SharedPreferences` `koink_widget_picks`, key `w<id>`, removed in `onDeleted`) and draws it. So one widget can open *Add expense* in Food, another *Add income*, another the Statistics page. Backing out cancels the placement. The list comes from `catalog` in the JSON the app hands over (`buildNativeWidgets`; each button now also carries its action `key`), so the app has to have been opened once; otherwise the screen asks to open Koink and add the widget again. A widget whose pick no longer exists (a deleted or hidden category) shows the default below. On Android 9+ the widget can be reconfigured (`widgetFeatures="reconfigurable"`, long-press > settings).

The **default** is `settings.widgets.single` (Settings > Widgets > Single button): it is the Month-page strip's button, the in-app preview, and what an old single widget (placed before this round) or one with a missing pick shows.

## Where it is configured

Settings > **Widgets** is a collapsible section (`WidgetsSettings`, no popup): a live preview and a chip picker per widget, and the switch **Show them on the Month page**. The choices are `settings.widgets` (stored in the journal, so they are in the backup).

## In the app (browser, PWA, Android)

With the switch on, `WidgetStrip` shows the same three widgets above the cards on the Month page (hidden in Ultra minimal). `WidgetFace` / `WidgetTile` (`src/components/WidgetButtons.tsx`) draw them, and the sheet's preview uses the same components. Pressing a tile runs `useRunWidgetAction()` (`src/lib/useWidgets.ts`), which opens the matching sheet or page.

## On the Android home screen

1. `useWidgetSync()` (mounted in the shell) turns `settings.widgets` into JSON with `buildNativeWidgets()` (`src/lib/widgetBridge.ts`): for every button its label, colours, an **icon as a base64 PNG** and a link. The icons are the app's own Lucide icons and the Koink pig, drawn once into a canvas, so Android needs no icon files and always matches the app. The call is debounced (700 ms) and only happens in the native app.
2. `syncWidgets(json)` (`platform.ts`) calls the plugin method `KoinkDevice.setWidgets`, which stores the JSON (SharedPreferences `koink_widgets`) and redraws every placed widget (`KoinkWidgetProvider.save`).
3. `KoinkWidgetProvider` (`Single`, `Multi`, `Categories` are its three receivers) builds `RemoteViews` from `widget_buttons.xml` (a transparent tray: only a padded container for the rows) > `widget_row.xml` > `widget_button.xml` (or `widget_button_single.xml` for the lone circle). Each tile is a white circle tinted with `setColorFilter`, the small icon bitmap and the name; its click starts the app with `koink://widget?a=<action>`.
4. `AndroidManifest.xml` has an intent filter for `koink://widget` on `MainActivity`. The web app reads the link (`App.getLaunchUrl()` on a cold start, the `appUrlOpen` event when it is already running) in `useWidgetSync()` and runs the action.

Until the app has been opened once after the widget was placed, the widget shows "Open Koink once to set this widget up" (tapping it opens the app).

## Rules

- Hex colours only in `widgets.ts`: the widget cannot read CSS variables.
- A widget layout may only use `LinearLayout`, `FrameLayout`, `ImageView`, `TextView` and the like (a plain `<View>` makes the launcher refuse the widget: see Kakcal's `docs/widgets.md`).
- To add an action: add it to `FIXED` and `KEY_PATTERN` in `widgets.ts`, handle it in `useRunWidgetAction`.

## Not verified

The Android widgets were written without an Android SDK (like the rest of `android/`): not compiled and not run on a device. The web side (strip, sheet, settings) compiles and builds. See [../known-gaps.md](../known-gaps.md).

## Basic mode

[Basic mode](basic-mode.md) hides the Widgets section of Settings and the Month-page strip. Android home widgets keep the buttons chosen in Full; in Basic a button that needs a Full-only screen (savings, quick log, recurring, gift cards, budgets) opens the Month page (`useRunWidgetAction`).
