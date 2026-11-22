# Design system

> **Scope:** colour tokens, the three modes, the six style presets, the borrowed class names, motion classes.
>
> **Read when:** you style a new component or touch `src/index.css` / `src/styles/presets.css`.
>
> **Related:** [features/themes.md](features/themes.md), [features/ultra-minimal.md](features/ultra-minimal.md), [motion.md](motion.md), [brand.md](brand.md)

The look is the Kakcal design system, reused so the two apps are siblings. `src/index.css` holds the base tokens, the animation classes and the Ultra minimal helpers; `src/styles/presets.css` is the reference app's preset stylesheet, kept verbatim; `src/styles/intro.css` is the launch animation.

## Tokens

Set on `:root` and overridden per mode with `[data-theme]` on `<html>`:

| Variable | Use |
| --- | --- |
| `--bg` | page |
| `--surface` | cards, pills, sheets |
| `--inset` | fields and rows inside a card |
| `--border`, `--hover` | hairlines, hover fill |
| `--text`, `--muted` | ink |
| `--on-text` | ink on a solid `--text` fill (selected segment, toast) |

Modes: `light` (warm oat), `lite-dark` (soft slate), `dark` (deep charcoal).

Tailwind colour tokens from `@theme` (usable as `bg-intake`, `text-intake-ink`, ...): `intake`, `activity` and `weight` each have a fill, `-ink`, `-accent` and `-soft`; `nutrient` has a fill and `-ink`.

## The borrowed names

The presets style elements by the reference app's hooks. They are kept so `presets.css` applies unchanged. **Do not rename them**; use this map:

| Name in the CSS | Meaning in Koink |
| --- | --- |
| `intake` (green), `.kc-hero-intake` | money in: Income card, income tones |
| `activity` / `burned` (pink), `.kc-hero-burned` | money out: Spent card, expense tones |
| `weight` (lilac) | savings |
| `nutrient` (yellow), `[data-nutrient="fiber"]` | the small note cards (Left, Per day, Budget...) |
| `.kc-macro-carbs` / `-protein` / `-fat` | Needs / Wants / Savings share cards |
| `[data-macro="carbs" / "protein" / "fat"]` | the three numeric pills on a category card |
| `[data-meal-slot]`, `.kc-meal-icon` | an expense category card and its icon |
| `[data-tracker]`, `.kc-tracker-icon` | Income / Savings / Recurring cards |
| `.kc-water-track`, `.kc-water-fill` | progress bars inside cards |
| `.kc-themed-card` | any other surface card |
| `.kc-dock`, `.kc-dock-btn` | bottom bar and its buttons (coloured by position, `nth-child`); `.anim-dock` enters, `.anim-dock-out` leaves |
| `.kc-sticky-footer` | the save row that ends an entry form (`SaveRow`): sticks to the bottom of the sheet's scroll area, **transparent background** (no band, no fade), touches pass through around the button. Number pads do not use it |
| `.kc-nav-pill`, `.kc-nav-tab`, `.kc-nav-tab-active`, `.kc-icon-btn`, `.kc-header-surface` | header pieces (the wordmark's own class is `koink-wordmark`: the presets' `.kc-wordmark` rule belongs to the reference app's wordmark and must not match ours) |
| `.kc-balance-badge`, `.kc-primary-btn`, `.kc-modal-banner`, `.kc-section-empty` | balance pill, save button, sheet banner, empty text |

Two hooks are Koink' own, defined at the end of `index.css`: `.kc-pill-alert` (over-budget pill) and `.kc-done` (logged recurring item).

## Style presets

`data-style` on `<html>`: `classic` (default; the plain tokens above) or `angular`, `aurora`, `pop`, `playful`, `minimal`, `mono`. Each preset x mode block in `presets.css` sets the same variables plus its own (`--card-radius`, `--card-border`, `--card-shadow`, `--clip-*`, `--dock-1`..`--dock-6`, `--pill-c-bg`...). `mono` gets its variables at run time from `getMonoVariables()` in `themes.ts` (one hue -> whole palette). Rules are written as `html[data-style]:not([data-style="classic"]) .hook { ... !important }`.

In Classic, tracker cards scope their own pastel palette with inline variables (`PALETTES` in `cards.tsx`); in the presets they inherit the preset's tokens.

## Motion (`index.css`)

| Class | Effect |
| --- | --- |
| `.pressable` | shrink to 0.9 while pressed, springy return; add `.pressable-soft` (0.985) for wide rows and cards |
| `.anim-page`, `.anim-dialog`, `.anim-pop`, `.anim-dock`, `.anim-toast`, `.anim-backdrop` | entrances |
| `.anim-value` | a changed number settles in (re-keyed span) |
| `.accordion-grid` + `.accordion-inner` + `data-open` | height animation with CSS grid; pair with `inert` when closed |
| `.kc-dock-wrap[data-hidden]` | dock slides away on scroll |
| `.kc-swipe-surface` | `touch-action: pan-y` for the page swipe |
| `.kc-sheet-viewport` | a sheet's frame, sized from `window.visualViewport` so it sits above the on-screen keyboard |
| `.kc-intro` (`intro.css`) | the launch animation overlay |

Easing variables: `--ease-soft` / `--dur-soft` and `--ease-bounce` / `--dur-bounce`. `index.css` declares cubic-bezier fallbacks; at start-up `src/lib/spring.ts` replaces them with real spring curves (`linear()`), and `--kc-swipe-dir` (1 or -1) tells the dock which side to enter from. Everything is disabled under `prefers-reduced-motion`; JS animations check the same media query. Details: [motion.md](motion.md).

## Ultra minimal helpers

`<html data-ultra="true">` switches a second, quieter look. Components mark what changes with `um-only`, `um-hide`, `um-sr`, `um-tight`, `um-center` and `um-stack` (end of `index.css`). The table and the rules for new components are in [features/ultra-minimal.md](features/ultra-minimal.md).

## Conventions

- **The full standard** (tokens to use instead of hex colours, type roles, control sizes, icon sizes and which icon means what, shared pieces, wording) is in [../guide to UI UX fixes.md](../guide%20to%20UI%20UX%20fixes.md), with the 28 places where the code does not follow it yet. New components follow its section 4.
- Text sizes: labels `text-[11px] font-extrabold uppercase tracking-wider` (`SectionLabel`, the only field label), figures `font-extrabold tabular-nums`. 
- Radii: `rounded-3xl` cards, `rounded-2xl` inner rows and buttons, `rounded-full` pills and icon buttons.
- Money in fixed-width cards uses `moneyFit` so it can never be clipped.
- Fonts: Plus Jakarta Sans (default), Space Grotesk and Chakra Petch (presets), declared in `index.css` with one latin `woff2` each. The wordmark needs no font: its letters are outlines ([brand.md](brand.md)).
- Brand colours by theme: `--kk-tile`, `--kk-tile-ink`, `--kk-coin` (`index.css`): the light version of the logo on the light theme, the dark one on the two dark themes.

## Border fade on scrolling fields

`src/lib/scrollFade.ts` (started once in `src/main.tsx`) and the `[data-scroll-fade]` block at the end of `src/index.css`. Put `data-scroll-fade="y"` (vertical) or `"x"` (horizontal) on any element that scrolls and nothing else is needed: the script measures it (a capture-phase scroll listener, a `ResizeObserver` per element, a `MutationObserver` for new content and new marked elements, one animation frame per batch) and sets `data-fading` plus `--fade-start` / `--fade-end` (`0px`, or `--fade-size`, 22px). The CSS mask then fades the content out at the edge that still has more beyond it, and nothing at an edge already reached; a field that does not overflow has no mask at all. Sheet bodies (`data-sheet-scroll`) use 14px, so the fade stays inside the sticky save row's padding and never dims the button. The mask also clips a shadow of the scrolling element itself (the bottom bar, the chart settings popup) while a fade is on; accepted. Marked: `Modal` body, `InstallGuide`, `ChartPopup`, `ChartLargeView` (category list, chart scroller), `ExpenseChart` scroller, `ActionDock`, `CurrencyGrid`, `ModeChooser`, the widget preview, and the chips and list of `PersonalInflation`. A new scrolling field should carry the attribute (rule in [README.md](README.md#keeping-the-docs-current)).

## Tokens added by the UI / UX fixes round

| Token (`index.css`) | Value | Use |
| --- | --- | --- |
| `--color-needs`, `-ink`, `-accent`, `-soft` | `#CFE7FE`, `#183B5E`, `#436B94`, `#E8F3FF` | blue: Needs, Recurring, the Statistics tab |
| `--color-wants`, `-ink`, `-accent`, `-soft` | `#FAE0B4`, `#7D4E14`, `#9B6E32`, `#FDF3E0` | amber: Wants, Log again |
| `--color-gift`, `-ink`, `-accent`, `-soft` | `#FFD9E8`, `#7A1F4B`, `#9C4C73`, `#FFEDF4` | rose: gift cards |
| `--color-danger`, `-ink`, `-hover` | `#F6D0D0`, `#7A2727`, `#F0BDBD` | solid destructive button, alert boxes |
| `--text-ok` | `#1F6B3F` light, `#8FD6A8` dark | positive text on a surface (next to `--text-warn`) |

A `.tsx` file uses these tokens, never their hex values. The shared controls (`Button`, `IconButton`, `chip`, `PillGroup` / `pillItem`, `DateField`, `ToggleRow`, `EmptyState`) and the icon scale `ICON` are listed in [file-map/components.md](file-map/components.md).
