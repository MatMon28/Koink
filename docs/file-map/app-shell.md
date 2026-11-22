# File map: app shell

> **Scope:** the entry page, start-up, the shell component, the stylesheets and the brand artwork module.
>
> **Read when:** you change how the app starts or how the page is framed.
>
> **Related:** [../architecture.md](../architecture.md), [../design-system.md](../design-system.md), [../launch-intro.md](../launch-intro.md)

| File | Role |
| --- | --- |
| `index.html` | The single page. `<head>`: favicon, `theme-color`, description, the PWA tags between `pwa:start` / `pwa:end`, `viewport-fit=cover`, title, and an inline script that paints the saved colours from the `koink_boot` key before anything else loads (with `koins_boot`, the old name, as a fallback). `<body>`: `#root` and the module script. The `<script data-element-picker>` block after it was added by the preview tool and is not part of the app |
| `src/main.tsx` | Import order is the start-up order: stylesheets, `lib/earlyStart.ts` (storage migration, theme, motion tokens, launch animation), then `App`; `initBackHandling()`, `initInstallPrompt()`, `registerOfflineWorker()`; the first render waits one painted frame when the launch animation is showing |
| `src/App.tsx` | Landing selection + shell: an installed PWA (standalone), iOS Home Screen app, shortcut/notification launch (`?add=`, `?open=`, `?source=`) or the Android bundle always opens `AppProvider` + `Shell`; first-time browser visitors get `AppTour` (skipped with `?view=app`). Mounts `InstallGuideHost` in both modes, `useReportAppReady()`, and `TourBridge` (which drives the live journal for `AppTour`). `Shell` lays out header, `PageSwiper`, the dock and every sheet |
| `src/index.css` | Tailwind import; `@font-face` for the four bundled fonts; `@theme` colour tokens; the three modes; base rules; keyframes and animation classes; accordion; `.pressable`; scrollbars; header surface; the sheet frame (`.kc-sheet-viewport`); Koink' own preset hooks (`.kc-pill-alert`, `.kc-done`); `.kc-swipe-surface`; the Ultra minimal helpers (`um-*`) |
| `src/styles/presets.css` | The six style presets x three modes and the rules that apply them to the hook classes. Taken verbatim from the reference app. 1,400 lines: search it, do not read it |
| `src/styles/intro.css` | The launch animation's overlay: position, background, fade. The art and keyframes are in `src/brand/art.js`. See [../launch-intro.md](../launch-intro.md) |
| `src/brand/art.js` | **All Koink artwork**, plain JavaScript shared by the app and the scripts: palettes, the geometry of the pig, its coin and the K on the coin, `logoMarkup`, `iconSvg`, `monoLogoSvg`, `wordmarkMarkup`, `wordmarkSvg`, `INTRO_ANIMATIONS` (five launch animations), `LOADER_ANIMATION`, `WORDMARK_ANIMATION`, `PRESS_ANIMATIONS` (five logo-press animations), `introArt`, `introSvg`, `pressCss`, `pressSvg`. See [../brand.md](../brand.md) |

The current page and month are React state in `store.tsx`, not URLs. The URL parameters the app reads are `?view=app|tour`, `?tour=1` (embedded tour phone), `?add=`, `?open=` and `?source=` at launch (`takeLaunchAction` in `lib/pwa.ts`) and `?intro=` (`lib/intro.ts`). See [../web-preview.md](../web-preview.md).
