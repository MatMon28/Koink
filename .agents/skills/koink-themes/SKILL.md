---
name: koink-themes
description: >-
  Use when creating or editing Koink theme styles, CSS tokens, presets, or
  launch splash colours across the 7 styles and 3 modes.
---

# Koink Themes Workflow

1. Read `docs/design-system.md` and `docs/features/themes.md` first.
2. Preserve `@import "tailwindcss";` as the first line of `src/index.css` and keep `src/styles/presets.css` and `src/styles/intro.css` load order intact.
3. Follow the style requirements:
   - Define `light`, `lite-dark`, and `dark` blocks with an opaque `#rrggbb` `--bg` hex.
   - Keep `src/styles/presets.css` selectors aligned with the borrowed `.kc-*` / `[data-*]` hooks in `docs/design-system.md#the-borrowed-names`.
   - Check Angular (`.rounded-2xl` / `.rounded-3xl` chamfers), Pop (thick outlines and offset shadows), and Aurora (translucent glass / reduced transparency).
   - For Mono hues, update `MONO_HUES` in `src/lib/themes.ts`.
4. If `--bg` or the Mono palette changes for any theme/mode:
   - Run `npm run android:splash` (`node scripts/generate-splash-themes.mjs`).
   - Verify `koink_boot` / early paint in `index.html` and `src/lib/earlyStart.ts` (`docs/launch-intro.md`).
5. Verify with `npm run build` and `npx eslint src` (plus `npm run android:prepare` if Android assets changed).
