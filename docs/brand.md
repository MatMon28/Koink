# Brand: icon, wordmark, launch animations, generated files

> **Scope:** the Koink artwork, its light and dark versions, where each copy lives, how it is generated, and the rename from Koins.
>
> **Read when:** you touch `src/brand/art.js`, `src/components/Brand.tsx`, `scripts/render-brand.mjs`, or anything under `public/brand/`.
>
> **Related:** [launch-intro.md](launch-intro.md) (the animations), [android.md](android.md), [pwa.md](pwa.md), [design-system.md](design-system.md)

## One source

**`src/brand/art.js`** holds all of it: the geometry of the K, the pig and its coin, the outlines of "ink", the two palettes, and the launch animations. The app imports it (`Brand.tsx`, `lib/intro.ts`) and so does the script that writes the static files. It is plain JavaScript so Node can import it without a build. Nothing else in the repository contains the artwork: change a number there, run `npm run brand`, and every copy follows.

The geometry is in the coordinate space of the 1024 x 1024 icon and was measured from the three reference images (sub-pixel edge fits). Rendered at 1024 px, the icon differs from the reference icon in fewer than 400 pixels of a million.

| Part | How it is drawn |
| --- | --- |
| **K** | stem (rounded rectangle) + arm + leg. Arm and leg are slanted bars cut level with the top and the baseline, the blunt corner rounded wide (82), the sharp one tight (47) |
| **Pig** | head (circle outline), two ears (lines from the head to a tip), two eyes, a snout (ellipse outline) with two nostrils |
| **Coin** | a ring above the head, between the ears |
| **Halo** | the pig's outline drawn 81 wide in the background colour, under the pig: it clears the K where the pig sits on its leg. The coin is layered between halo and pig, so a coin moving down disappears *into* the head |
| **"ink"** | outlines of Nunito ExtraBold (SIL Open Font License), stored as one path, so no font is needed. Extracted once with opentype.js at 160.5 px |

## Light and dark versions

| | Background | Ink | Coin |
| --- | --- | --- | --- |
| **Light** | `#F9F3E6` | `#0B0F1E` | `#F59F00` |
| **Dark** | `#070A14` | `#F9F3E6` | `#FFC53D` |

`PALETTE` in `art.js`. Every asset exists in both:

| Asset | Light / dark in the app | Standalone files |
| --- | --- | --- |
| **Icon** | `AppIcon` (Settings footer) shows the light tile in the light theme and the dark tile in the two dark themes, through the CSS variables `--kk-tile`, `--kk-tile-ink`, `--kk-coin` (`src/index.css`) | `public/brand/koink-icon-light.svg`, `-dark.svg`, and a 512 px PNG of each. `public/favicon.svg` is one file with both: it follows the browser's colour scheme |
| **Wordmark** | `Wordmark` (header): K, the pig as the "o" with its coin above, "ink". It has no plate; its ink is the theme's text colour and its coin is `--kk-coin`, so it is the light version on light themes and the dark one on dark themes | `public/brand/koink-wordmark-light.svg`, `-dark.svg` |
| **Launch animations** | the overlay uses the app's background with the light ink on light themes and the dark ink on dark themes | `public/brand/koink-intro-<id>-light.svg`, `-dark.svg` (five animations, self-playing) |

**`public/brand/index.html`** is a sheet that shows all of them (`/brand/` on the website). Tap an animation to play it again.

Two details copied from the references on purpose: the wordmark's pig has slightly lighter lines than the icon's (x 0.885), and its ears are closed triangles whose base shows inside the head (`closedEars`).

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
| `public/icons/maskable-512.png` | 512 | full-bleed, logo centred inside the 80 % safe zone |
| `public/icons/apple-touch-icon.png` | 180 | full-bleed (iOS rounds the corners itself) |
| `android/.../mipmap-*/ic_launcher.png`, `ic_launcher_round.png` | 48-192 | legacy icons: rounded tile, disc |
| `android/.../mipmap-*/ic_launcher_foreground.png` | 108-432 | adaptive-icon foreground: the logo at 78 %, inside the 66 dp safe circle. The background layer is the colour `ic_launcher_background` (`#F9F3E6`) |
| `android/.../mipmap-*/ic_launcher_monochrome.png` | 108-432 | the logo as one colour: Android 13+ themed icons, the launcher's own way of following dark mode |
| `android/.../drawable-*dpi/ic_stat_koink.png` | 24-96 | notification icon, see below |

The Android part is skipped when `android/` does not exist. The script overwrites files in place; commit the results.

## Notification icon

Android draws a notification's small icon from its **alpha channel only** and tints it, so `ic_stat_koink.png` is the whole logo (K, pig, coin) in white on a transparent background, in five densities. `monoLogoSvg()` builds it:

- there is no background colour to paint the halo with, so the K is really cut away around the pig (an SVG mask);
- the pig's lines are 35 % heavier (`thicken: 1.35`) and the coin moves up to keep its gap, so the face survives at 24 dp;
- the logo fills the canvas (scale 1.5).

It is a PNG rather than a vector drawable because the cut-out needs a mask. The Local Notifications plugin finds it by name (`smallIcon: "ic_stat_koink"` in `capacitor.config.json`), so `res/raw/keep.xml` protects it; the tint is `iconColor` `#286540`. At 72 px and up it reads as K, pig face and coin; at 24 px (mdpi, rare today) the face is only a texture.

## Colours that appear outside CSS

`#EFE9DD` (default page background, also the fallback launch colour) is repeated in `index.html` (`theme-color`), `src/lib/themes.ts` and `src/styles/intro.css` (fallbacks), `public/manifest.webmanifest`, `capacitor.config.json` (`android.backgroundColor`), `android/app/src/main/res/values/colors.xml` and `LaunchBackground.java`. The icon tile `#F9F3E6` is in `art.js` and `android/app/src/main/res/values/ic_launcher_background.xml`. Change them together.

## Rename: Koins -> Koink

The app was called Koins. Everything carries the new name: wordmark, title, manifest, Android app name and id (`com.koink.app`), package name, backup file (`koink_backup_<date>.json`), project archive, notification channels and icon, storage keys, cache names. The Android id could change freely because no build had been released.

Two shims keep an existing browser journal working, and are the only places the old name still appears:

- `migrateLegacyStorage()` (`src/lib/storage.ts`, called first thing in `lib/earlyStart.ts`) moves every `koins_*` key in `localStorage` to `koink_*`, once. The inline script of `index.html` also reads `koins_boot` as a fallback for that first launch.
- The offline worker deletes caches named `koins-shell-*` when it activates.

## Logo click animation

`wordmarkMarkup({ ink, coin, animated })` can add the `kk-*` classes; `Brand.tsx` turns it on for the header wordmark, whose click animation lives at the end of `src/index.css` (see [motion.md](motion.md#logo-animation)). The generated brand files (`npm run brand`) are unchanged.
