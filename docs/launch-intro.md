# Launch animation and first paint

> **Scope:** the five launch animations, how one is picked, when the overlay appears and leaves, the URL switches, and how every surface before the animation gets the same background colour, on the web and on Android.
>
> **Read when:** you touch `src/lib/intro.ts`, `src/lib/earlyStart.ts`, `src/styles/intro.css`, the animations in `src/brand/art.js`, the inline script of `index.html`, or `LaunchBackground.java` / `splash_themes.xml`.
>
> **Related:** [brand.md](brand.md), [motion.md](motion.md), [android.md](android.md), [known-gaps.md](known-gaps.md)

When the app opens it plays one short animation that ends on the Koink logo, then fades to the app, which has been mounting underneath.

| `?intro=` | Id | What happens | Length |
| --- | --- | --- | --- |
| 1 | `coin-oink` | **the signature one.** The logo settles in; the coin hops, turns **once**, drops into the pig; the pig gulps, jumps and oinks (snout, ears, eyes); the next coin pops into place | 1250 ms |
| 2 | `sketch` | the K is laid down stroke by stroke, the pig's head is drawn round, ears and face pop in, the coin drops on | 1000 ms |
| 3 | `roll-in` | the pig rolls in from the right, bumps the K, and the coin lands on its head | 1050 ms |
| 4 | `pop-toss` | the K lands like a pressed key, the pig pops up, the coin is tossed over in an arc | 980 ms |
| 5 | `hop-wink` | the calm one: the logo settles in, the coin hops, the pig winks | 820 ms |

Only `coin-oink` turns the coin, and exactly once: one full turn about its vertical axis, drawn as `scaleX` 1 -> 0 -> -1 -> 0 -> 1 with sine easing (`k1-turn`), while the coin is at the top of its hop.

## Rules

- **The first launch plays `coin-oink`**; after that the pick is random but never the animation of the previous launch (`pickIntroAnimation()`, remembered in `localStorage` key `koink_intro_last`).
- **Starts as early as possible.** `main.tsx` imports `lib/earlyStart.ts` *before* `App`; ES modules run in import order, so legacy storage is migrated, the saved theme goes on `<html>`, the spring curves are published and `startLaunchIntro()` puts the overlay on screen before the app's modules are evaluated and before React exists. `main.tsx` then awaits `afterFirstPaint()` (one frame, 150 ms fallback for hidden tabs) before the first render.
- **Runs to the end.** The overlay leaves only when **both** the animation has played to its last frame plus a 120 ms hold (`HOLD_MS`) **and** the app has reported that it is ready: first screen committed, fonts loaded, two frames painted (`useReportAppReady()` in `App.tsx` -> `markAppReady()`). If the app is slower, the finished logo waits for it, at most 3 s (`MAX_EXTRA_WAIT_MS`). It then fades in 200 ms (`FADE_MS`).
- **Tap to skip.** A tap fades it in 120 ms (`SKIP_FADE_MS`). The overlay keeps taking taps while it fades, so the skipping tap never presses something underneath.
- **Light and dark versions.** The overlay's background is the app's own `--bg`. On the light theme the logo is the light version (ink `#0B0F1E`, coin `#F59F00`), on the two dark themes the dark version (ink `#F9F3E6`, coin `#FFC53D`): `--kk-tile-ink` and `--kk-coin` in `index.css`.
- **Not shown** with `?intro=0` or when the device asks for reduced motion (`shouldShowIntro()`).

## Files

| File | Role |
| --- | --- |
| `src/brand/art.js` | `INTRO_ANIMATIONS` (id, length, keyframes), `introArt()` (the inline SVG for the app), `introSvg()` (the standalone files) |
| `src/lib/intro.ts` | the picker, the overlay (plain DOM, no React), timing, skip, `afterFirstPaint`, `useReportAppReady` |
| `src/styles/intro.css` | the overlay only: position, background, fade |
| `src/lib/earlyStart.ts` | side-effect module: migration, theme, motion tokens, `startLaunchIntro()` |
| `public/brand/koink-intro-*.svg` | every animation as a self-playing file, light and dark ([brand.md](brand.md)) |

**How an animation is written.** The art is the logo's SVG with a class on every part: `kk-logo` (everything), `kk-k` > `kk-stem`, `kk-arm`, `kk-leg`; `kk-halo`; `kk-coin-a` > `kk-coin-b` (two nested groups, so the coin can move and turn independently); `kk-pig` > `kk-ear-l`, `kk-ear-r`, `kk-head-fill`, `kk-head`, `kk-face` > `kk-eyes` (`kk-eye-l`, `kk-eye-r`), `kk-snout`. An animation is a block of CSS in `INTRO_ANIMATIONS` whose selectors start with `&`; `introCss()` replaces `&` with a scope (`.kc-intro` in the app, `svg` in a file), so the rules can never reach another copy of the logo. Lengths are `var(--intro-ms)` and keyframes are in percent, so `duration` is the only number to change. Transform origins are in icon coordinates (`ORIGINS`). The halo and the pig always get the same keyframes, or the clear ring would come apart from the pig.

To add one: an entry in `INTRO_ANIMATIONS` that ends on the untouched logo, a row above, then `npm run brand` for the standalone files.

## One background colour, from the tap on the icon to the app

Every surface that shows before the animation is a plain colour equal to the app's current `--bg`, and the animation's own background is that colour too. Nothing changes colour until the app fades in.

| Order | Surface | How it gets the colour |
| --- | --- | --- |
| 1 | **Android system launch screen** | a style whose `windowSplashScreenBackground` is the colour, with a transparent icon (`drawable/splash_blank.xml`), so it is colour only. A style cannot be made at run time, so `values/splash_themes.xml` holds one per possible background (`Splash_<hex>`, 48 of them) and `LaunchBackground.java` activates the right one with `setSplashScreenTheme` |
| 2 | **Activity window, WebView** | `MainActivity.onCreate` sets both from the saved colour before the page loads |
| 3 | **First paint of the page** | the inline script of `index.html` reads the small `koink_boot` key (`{ theme, style, bg, ultra }`) and sets the attributes and the page background before the stylesheet and the bundle arrive |
| 4 | **Launch animation** | `.kc-intro { background: var(--bg) }` |
| 5 | **The app** | fades in under the overlay |

Steps 3 to 5 are the same in a browser and in the installed PWA.

**How the colour reaches Android.** Whenever the theme, style or Mono colour changes (and at start), `applyThemeAttributes()` returns the computed `--bg`; the theme effect in `store.tsx` passes it to `syncLaunchBackground()` (`platform.ts`), which calls the app's own plugin, `KoinkDevice.setLaunchBackground({ color })`. `LaunchBackground.save` stores it in the `launch_background` SharedPreferences and switches the launch-screen style. It takes effect from the next cold start.

**Limits.** `setSplashScreenTheme` exists from Android 13. On Android 12 and older the system launch screen stays the default oat (`#EFE9DD`) whatever the theme; window and WebView still follow. The first launch after installing has no stored colour yet and uses the default. See [known-gaps.md](known-gaps.md).

**Keeping the styles complete.** `npm run android:splash` (`scripts/generate-splash-themes.mjs`) reads every `--bg` from `src/index.css` and `src/styles/presets.css` and computes the thirty Mono backgrounds with the app's own `getMonoVariables()`. Run it after changing any of those; `npm run android:prepare` fails if the file is out of date. A background with no matching style simply leaves the launch screen on its previous colour.

After the bundle runs, `applyThemeAttributes()` removes the inline page background again: from then on the CSS rules decide.
