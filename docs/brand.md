# Brand: icon, wordmark, animations, generated files

> **Scope:** the Koink artwork, its light and dark versions, where each copy lives, how it is generated, the launch and logo-press animations, and the rename from Koins.
>
> **Read when:** you touch `src/brand/art.js`, `src/components/Brand.tsx`, `scripts/render-brand.mjs`, or anything under `public/brand/`.
>
> **Related:** [launch-intro.md](launch-intro.md) (the launch animations), [motion.md](motion.md#logo-animation) (logo press), [android.md](android.md), [pwa.md](pwa.md), [design-system.md](design-system.md)

## One source

**`src/brand/art.js`** holds all of it: the geometry of the pig, its coin and the K on the coin, the outlines of the letters, the two palettes, the five launch animations, the loader and wordmark animations, and the five logo-press animations. The app imports it (`Brand.tsx`, `Header.tsx`, `lib/intro.ts`) and so does the script that writes the static files. It is plain JavaScript so Node can import it without a build. Nothing else in the repository contains the artwork: change a number there, run `npm run brand`, and every copy follows.

## The logo

**A pig with a gold coin on its head, and the K cut out of the coin.** The pig is the one the app always had (round outlined head, two triangle ears, two eyes, a snout with two nostrils); what changed is the coin and the K. The coin is a solid gold disc (it used to be a ring) and the K is no longer a big letter behind the pig: it is carved out of the coin, so the pig stands alone on the tile and the coin carries the initial.

The pig is drawn in **head-centred units** (the head's centre is 0,0; one unit is one unit of the earlier 1024 px artwork). The icon places it with one transform (`iconTransform()`: pig and coin together are `ICON_LOGO_HEIGHT` = 800 px tall, centred on the 1024 tile), the wordmark with another.

| Part | How it is drawn |
| --- | --- |
| **Pig** | head (circle outline, 26 wide), two ears (open triangles; closed in the wordmark), two eyes, a snout (ellipse outline) with two nostrils. Measured from the earlier reference artwork |
| **Coin** | a disc of radius 62 above the head, 14 units clear of it (`COIN`), filled with the palette's coin colour |
| **K** | the earlier K (stem + arm + leg, same rounded corners), 70 units tall and centred on the coin, painted in the background colour so that it reads as a hole. For one-colour icons it is a real hole (mask) |
| **Head fill** | the head is filled with the background colour, so ears and coin never show through it. Without a background (`bg: 'none'`: the wordmark, the one-colour icons) two masks do the same job: the ears are cut away inside the head, and a coin that falls into the head disappears behind its outline |
| **Letters** | "k" and "ink" are outlines of Nunito Black (SIL Open Font License) stored as paths, so no font is needed. The pig is the "o", with the coin standing above it. The wordmark's pig has slightly lighter lines (x 0.885), closed ears and no K on its coin (the K would be too small to read) |

## Light and dark versions

| | Background | Ink | Coin |
| --- | --- | --- | --- |
| **Light** | `#F9F3E6` | `#0B0F1E` | `#F59F00` |
| **Dark** | `#070A14` | `#F9F3E6` | `#FFC53D` |

`PALETTE` in `art.js`. Every asset exists in both:

| Asset | Light / dark in the app | Standalone files |
| --- | --- | --- |
| **Icon** | `AppIcon` (Settings footer) shows the light tile in the light theme and the dark tile in the two dark themes, through the CSS variables `--kk-tile`, `--kk-tile-ink`, `--kk-coin` (`src/index.css`) | `public/brand/koink-icon-light.svg`, `-dark.svg`, and a 512 px PNG of each. `public/favicon.svg` is one file with both: it follows the browser's colour scheme |
| **Wordmark** | `Wordmark` (header): k, the pig as the "o" with its coin above, "ink". It has no plate; its ink is the theme's text colour and its coin is `--kk-coin`, so it is the light version on light themes and the dark one on dark themes | `public/brand/koink-wordmark-light.svg`, `-dark.svg` |
| **Launch animations** | the overlay uses the app's background with the light ink on light themes and the dark ink on dark themes | `public/brand/koink-intro-<id>-light.svg`, `-dark.svg` (five animations, self-playing, at the speed they were designed at) |
| **Logo-press animations** | the header wordmark, in the colours above | `public/brand/koink-press-<id>-light.svg`, `-dark.svg` (five) |
| **Design assets** (not used by the app yet) | | `koink-loader-spin-loop-*.svg` (loops: the coin spins and bobs, the pig blinks; a loading indicator), `koink-wordmark-animation-*.svg` (the wordmark builds itself) |

**`public/brand/index.html`** is a sheet that shows all of them (`/brand/` on the website). Tap an animation to play it again.

## Animations

- **Launch animations** (`INTRO_ANIMATIONS`): coin drop, draw-on, pop & toss, mint, peek-a-boo. Designed 1.8-2.4 s long, played by the app **twice as fast** (0.90-1.20 s, as long as the five they replace: 0.82-1.25 s). Details, rules and how to add one: [launch-intro.md](launch-intro.md).
- **Logo press** (`PRESS_ANIMATIONS`): what happens when the header wordmark is tapped, five of them (*oink*, *keypress*, *wink & flip*, *happy hop*, *turnabout*), 1.0-1.2 s. [motion.md](motion.md#logo-animation).
- Every animation ends on the exact static logo (the intro on the icon, the press on the wordmark) and is written as CSS keyframes in percent on the `kk-*` parts of the logo; `duration` is the only number to change.

## The pig icon

`PigIcon` (`src/lib/pig.ts`, a Lucide-compatible icon made with `createLucideIcon`) is the logo's pig simplified for 24 px line use: the same round head, two open triangle ears, two dot eyes and outlined snout with two nostrils, mapped from the logo's coordinates (`HEAD`, `EAR_LEFT`, `EYE`, `SNOUT`, `NOSTRIL` in the earlier 1024 px artwork; the formula is in the file's comment). It replaces Lucide's `PiggyBank` for Savings everywhere (share card, Savings tracker, Statistics, bottom bar, goals, categories) and is the icon stored as `piggy` in `ICON_CHOICES`. The pig of the logo did not change shape, so `pig.ts` did not change. If the pig in `art.js` changes shape, update the numbers in `pig.ts`.

## Generated files

```sh
npm i --no-save sharp     # once; sharp is not a project dependency
npm run brand             # node scripts/render-brand.mjs
```

| Output | Size | Notes |
| --- | --- | --- |
| `public/favicon.svg` | vector | both versions, switched by `prefers-color-scheme` |
| `public/brand/*` | vector + two PNGs | the files listed above and the sheet |
| `public/icons/icon-192.png`, `icon-512.png` | 192, 512 | light tile with rounded corners |
| `public/icons/maskable-512.png` | 512 | full-bleed, logo at 90 % (its farthest point is 0.35 of the canvas from the centre, inside the 0.40 safe circle) |
| `public/icons/apple-touch-icon.png` | 180 | full-bleed (iOS rounds the corners itself) |
| `android/.../mipmap-*/ic_launcher.png`, `ic_launcher_round.png` | 48-192 | legacy icons: rounded tile, disc |
| `android/.../mipmap-*/ic_launcher_foreground.png` | 108-432 | adaptive-icon foreground: the logo at 76 %, inside the 66 dp safe circle (farthest point 0.297 of the canvas, the circle is 0.306). The background layer is the colour `ic_launcher_background` (`#F9F3E6`) |
| `android/.../mipmap-*/ic_launcher_monochrome.png` | 108-432 | the logo as one colour (the K is a hole in the coin): Android 13+ themed icons, the launcher's own way of following dark mode |
| `android/.../drawable-*dpi/ic_stat_koink.png` | 24-96 | notification icon, see below |

The Android part is skipped when `android/` does not exist. The script overwrites files in place; commit the results.

## Notification icon

Android draws a notification's small icon from its **alpha channel only** and tints it, so `ic_stat_koink.png` is the whole logo (pig and coin) in white on a transparent background, in five densities. `monoLogoSvg()` builds it:

- there is no background colour to paint the K with, so the K is really cut out of the coin (an SVG mask), and the head is hollow;
- the pig's lines are 35 % heavier (`thicken: 1.35`) and the coin moves up to keep its gap, so the face survives at 24 dp;
- the logo is 115 % of the icon's size, which fills the canvas.

It is a PNG rather than a vector drawable because the cut-outs need a mask. The Local Notifications plugin finds it by name (`smallIcon: "ic_stat_koink"` in `capacitor.config.json`), so `res/raw/keep.xml` protects it; the tint is `iconColor` `#286540`. At 72 px and up it reads as pig face and coin with its K; at 24 px (mdpi, rare today) the face is only a texture.

## Colours that appear outside CSS

`#EFE9DD` (default page background, also the fallback launch colour) is repeated in `index.html` (`theme-color`), `src/lib/themes.ts` and `src/styles/intro.css` (fallbacks), `public/manifest.webmanifest`, `capacitor.config.json` (`android.backgroundColor`), `android/app/src/main/res/values/colors.xml` and `LaunchBackground.java`. The icon tile `#F9F3E6` is in `art.js` and `android/app/src/main/res/values/ic_launcher_background.xml`. Change them together.

## Rename: Koins -> Koink

The app was called Koins. Everything carries the new name: wordmark, title, manifest, Android app name and id (`com.koink.app`), package name, backup file (`koink_backup_<date>.json`), project archive, notification channels and icon, storage keys, cache names. The Android id could change freely because no build had been released.

Two shims keep an existing browser journal working, and are the only places the old name still appears:

- `migrateLegacyStorage()` (`src/lib/storage.ts`, called first thing in `lib/earlyStart.ts`) moves every `koins_*` key in `localStorage` to `koink_*`, once. The inline script of `index.html` also reads `koins_boot` as a fallback for that first launch.
- The offline worker deletes caches named `koins-shell-*` when it activates.

## Logo press animations

`wordmarkMarkup({ ink, coin, animated })` adds the `kk-*` classes (and one `kk-body` group around the pig and its coin); `Brand.tsx` turns it on for the header wordmark and puts the rules of `PRESS_ANIMATIONS` (`pressCss()`) in a `<style>` inside that SVG, each scoped to `.kc-logo-btn[data-press="<id>"]`. `Header.tsx` sets that attribute on tap. See [motion.md](motion.md#logo-animation). The generated brand files (`npm run brand`) contain the same animations as self-playing files (`koink-press-*.svg`).
