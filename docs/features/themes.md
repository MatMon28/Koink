# Feature: themes and style presets

> **Scope:** what the user can choose, and the code path from a tap in Settings to the colours on screen.
>
> **Read when:** you add a mode, a preset or a Mono colour, or debug a colour that does not follow the theme.
>
> **Related:** [../design-system.md](../design-system.md) (tokens and class names), [settings.md](settings.md)

## Choices

| Setting | Values | Stored in |
| --- | --- | --- |
| Theme (mode) | `light`, `lite-dark` ("Soft dark"), `dark` | `settings.theme` |
| Style | `classic`, `angular`, `aurora`, `pop`, `playful`, `minimal`, `mono` | `settings.themeStyle` |
| Mono colour | ten hues (slate, emerald, cobalt, crimson, amber, violet, teal, rose, indigo, olive) | `settings.monoHue` |

Every style works in every mode: 7 x 3 combinations. **Ultra minimal** is a separate switch that combines with all of them ([ultra-minimal.md](ultra-minimal.md)).

| Style | Character |
| --- | --- |
| Classic | warm oat surfaces, pastel cards (the default) |
| Angular | chamfered corners (clip-paths), Chakra Petch, orange accent |
| Aurora | glass cards on a gradient, mint and coral |
| Pop | neo-brutalist: thick outlines, hard offset shadows |
| Playful | bubbly, saturated pastels |
| Minimal | hairline borders, slate and blue |
| Mono | a single hue, tonal |

## Code path

1. Settings calls `updateSettings({ theme })` / `{ themeStyle }` / `{ monoHue }`.
2. An effect in `store.tsx` calls `applyThemeAttributes(theme, style, hue)` (`themes.ts`), which sets `data-theme` and `data-style` on `<html>`, writes the Mono variables inline (or removes them), and updates `<meta name="theme-color">` from the computed `--bg`. The same effect then calls `syncSystemBars(theme)` and `syncLaunchBackground(bg)` (`platform.ts`): the Android status bar and the colour of the next launch ([../launch-intro.md](../launch-intro.md)).
3. CSS does the rest: `[data-theme]` blocks in `index.css` for Classic, `html[data-style=...][data-theme=...]` blocks in `presets.css` for the presets.
4. At start-up `applyStoredTheme()` (called from `lib/earlyStart.ts`) does step 2 from the saved journal before the app is even evaluated. Earlier still, an inline script in `index.html` paints the saved background from the small `koink_boot` key that step 2 keeps up to date, so there is no flash of the default theme at all ([../launch-intro.md](../launch-intro.md)).

## Extending

- **A Mono colour:** one line in `MONO_HUES` (`themes.ts`).
- **A preset:** add its id to `ThemeStyle` (`types.ts`) and `THEME_STYLES` + `STYLE_PRESETS` (`themes.ts`), then a block of variables per mode in `presets.css` modelled on an existing preset.
- **A new component that should follow presets:** give it an existing hook class (`.kc-themed-card` for a card) instead of writing preset rules. The map is in [../design-system.md](../design-system.md#the-borrowed-names).

Preset rules use `!important` and match Tailwind radius classes in a few places (Angular turns `.rounded-2xl` / `.rounded-3xl` into chamfers), so check a new component in Angular and Pop.
