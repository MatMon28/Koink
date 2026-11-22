# Launch animation and first paint

> **Scope:** the five launch animations, how one is picked, when the overlay appears and leaves, the URL switches, and how every surface before the animation gets the same background colour, on the web and on Android.
>
> **Read when:** you touch `src/lib/intro.ts`, `src/lib/earlyStart.ts`, `src/styles/intro.css`, the animations in `src/brand/art.js`, the inline script of `index.html`, or `LaunchBackground.java` / `splash_themes.xml`.
>
> **Related:** [brand.md](brand.md), [motion.md](motion.md), [android.md](android.md), [known-gaps.md](known-gaps.md)

When the app opens it plays one short animation that ends on the Koink icon (the pig with its gold coin, the K on the coin), then fades to the app, which has been mounting underneath.

| `?intro=` | Id | What happens | Designed | In the app |
| --- | --- | --- | --- | --- |
| 1 | `coin-drop` | **the signature one.** The K coin hops, spins, drops into the pig's head; the pig squashes, jumps and oinks (snout, ears, eyes); a fresh coin pops back on top | 1900 ms | 950 ms |
| 2 | `draw-on` | the head is drawn round, the ears and snout are sketched, the eyes pop open, and the K is stamped onto the coin | 2100 ms | 1050 ms |
| 3 | `pop-toss` | the pig pops up from the bottom edge and tosses the coin in an arc; the K coin lands on its head | 1800 ms | 900 ms |
| 4 | `mint` | a coin is minted big in the middle, the K is struck onto it with a shock ring, then it shrinks away and the pig rises up beneath it | 2200 ms | 1100 ms |
| 5 | `peek` | the pig rises from the bottom edge, looks left and right, blinks and wiggles its ears; then the K coin falls onto its head with a bounce | 2400 ms | 1200 ms |

**Speed.** The animations were designed at 1.8-2.4 s; the app plays each at half that (`duration` in `INTRO_ANIMATIONS`, `designMs` is the designed length), so the five take 0.90-1.20 s, as long as the five they replace (0.82-1.25 s). The files in `public/brand/` play at the designed speed. The keyframes are in percent, so changing `duration` is all it takes to speed one up or down.

The same file also holds a sixth animation, the looping **loader** (`LOADER_ANIMATION`: the coin spins and bobs, the pig blinks), and the **wordmark** that builds itself (`WORDMARK_ANIMATION`). Neither is used by the app yet; they are in `public/brand/` ([brand.md](brand.md)).

## Rules

- **The first launch plays `coin-drop`**; after that the pick is random but never the animation of the previous launch (`pickIntroAnimation()`, remembered in `localStorage` key `koink_intro_last`).
- **Starts as early as possible.** `main.tsx` imports `lib/earlyStart.ts` *before* `App`; ES modules run in import order, so legacy storage is migrated, the saved theme goes on `<html>`, the spring curves are published and `startLaunchIntro()` puts the overlay on screen before the app's modules are evaluated and before React exists. `main.tsx` then awaits `afterFirstPaint()` (one frame, 150 ms fallback for hidden tabs) before the first render.
- **Runs to the end.** The overlay leaves only when **both** the animation has played to its last frame plus a 120 ms hold (`HOLD_MS`) **and** the app has reported that it is ready: first screen committed, fonts loaded, two frames painted (`useReportAppReady()` in `App.tsx` -> `markAppReady()`). If the app is slower, the finished logo waits for it, at most 3 s (`MAX_EXTRA_WAIT_MS`). It then fades in 200 ms (`FADE_MS`).
- **Tap to skip.** A tap fades it in 120 ms (`SKIP_FADE_MS`). The overlay keeps taking taps while it fades, so the skipping tap never presses something underneath.
- **Light and dark versions.** The overlay's background is the app's own `--bg`. On the light theme the logo is the light version (ink `#0B0F1E`, coin `#F59F00`), on the two dark themes the dark version (ink `#F9F3E6`, coin `#FFC53D`): `--kk-tile-ink` and `--kk-coin` in `index.css`.
- **Not shown** inside the tour's embedded phone (`?tour=1`), with `?intro=0`, or when the device asks for reduced motion (`shouldShowIntro()`).

## Files

| File | Role |
| --- | --- |
| `src/brand/art.js` | `INTRO_ANIMATIONS` (id, lengths, keyframes), `introArt()` (the inline SVG for the app), `introSvg()` (the standalone files) |
| `src/lib/intro.ts` | the picker, the overlay (plain DOM, no React), timing, skip, `afterFirstPaint`, `useReportAppReady` |
| `src/styles/intro.css` | the overlay only: position, background, fade |
| `src/lib/earlyStart.ts` | side-effect module: migration, theme, motion tokens, `startLaunchIntro()` |
| `public/brand/koink-intro-*.svg` | every animation as a self-playing file, light and dark ([brand.md](brand.md)) |

**How an animation is written.** The art is the logo's SVG with a class on every part (all prefixed `kk-`, and every moving part also has `kk-m`, which makes it its own transform box that turns about its own centre): `kk-all` (everything), `kk-coin` > `kk-coinx` > `kk-coinin` (three nested groups, so the coin can travel, move sideways and spin independently), `kk-ck` (the K on the coin), `kk-ring` (a shock ring, invisible at rest); `kk-pig` > `kk-ear` `kk-earl` / `kk-earr`, `kk-headfill`, `kk-headline`, `kk-eyes` > `kk-eye` `kk-eyel` / `kk-eyer`, `kk-snout` > `kk-snouter`, `kk-nostril`. Head, ears and snout outline carry `pathLength="100"`, so they can be drawn on with `stroke-dashoffset`. An animation is a block of CSS in `INTRO_ANIMATIONS` whose selectors start with `&`; `introCss()` replaces `&` with a scope (`.kc-intro` in the app, `svg` in a file), so the rules can never reach another copy of the logo. `@name` in a rule is a keyframe name that is prefixed to be unique (`ki1-name`). Lengths are `var(--intro-ms)` and keyframes are in percent, so `duration` is the only number to change. The art sits on the icon's 1024 tile (painted in the page colour, so it is invisible) and is clipped to it: parts that fly in from outside appear at the tile's edge.

To add one: an entry in `INTRO_ANIMATIONS` (`id`, `name`, `duration`, `designMs`, `desc`, `css`) that ends on the untouched icon, a row above, then `npm run brand` for the standalone files.

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
