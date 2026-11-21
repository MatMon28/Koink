/*
 * Writes every static copy of the Koink brand from the one source, src/brand/art.js:
 *
 *   npm i --no-save sharp        (once; sharp is not a project dependency)
 *   npm run brand
 *
 *   public/favicon.svg                         follows the browser's light / dark scheme
 *   public/brand/koink-icon-{light,dark}.svg   + a 512 px PNG of each
 *   public/brand/koink-wordmark-{light,dark}.svg
 *   public/brand/koink-intro-<id>-{light,dark}.svg   the launch animations, self-playing
 *   public/brand/index.html                    a sheet that shows all of the above
 *   public/icons/*.png                         PWA icons (192, 512, maskable, apple-touch)
 *   android/.../mipmap-*                       launcher icons (legacy, round, adaptive foreground, monochrome)
 *   android/.../drawable-*dpi/ic_stat_koink.png   notification icon (white on transparent)
 *
 * See docs/brand.md.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { INTRO_ANIMATIONS, PALETTE, TILE_RADIUS, iconSvg, introSvg, logoMarkup, monoLogoSvg, wordmarkSvg } from '../src/brand/art.js';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('sharp is missing. Run:  npm i --no-save sharp');
  process.exit(1);
}

const root = fileURLToPath(new URL('../', import.meta.url));
const written = [];

async function text(file, content) {
  const out = path.join(root, file);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, content.endsWith('\n') ? content : `${content}\n`);
  written.push(file);
}

async function png(svg, size, file) {
  const out = path.join(root, file);
  await mkdir(path.dirname(out), { recursive: true });
  // Rendered large, then reduced: small icons keep clean edges.
  await writeFile(out, await sharp(Buffer.from(svg), { density: 72 * Math.max(1, (size * 4) / 1024) }).resize(size, size).png().toBuffer());
  written.push(file);
}

/* ---------- SVG ---------- */

// One file, both versions: the tile and its ink switch with the browser's colour scheme.
const { light, dark } = PALETTE;
await text(
  'public/favicon.svg',
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><title>Koink</title>` +
    `<style>svg{--t:${light.bg};--i:${light.ink};--c:${light.coin}}@media (prefers-color-scheme:dark){svg{--t:${dark.bg};--i:${dark.ink};--c:${dark.coin}}}</style>` +
    `<rect width="1024" height="1024" rx="${TILE_RADIUS}" fill="var(--t)"/>${logoMarkup({ ink: 'var(--i)', bg: 'var(--t)', coin: 'var(--c)' })}</svg>`,
);

for (const mode of ['light', 'dark']) {
  await text(`public/brand/koink-icon-${mode}.svg`, iconSvg(mode));
  await text(`public/brand/koink-wordmark-${mode}.svg`, wordmarkSvg(mode, { background: true }));
  for (const animation of INTRO_ANIMATIONS) await text(`public/brand/koink-intro-${animation.id}-${mode}.svg`, introSvg(animation, mode));
}

const figure = (src, caption, cls = '') => `<figure class="${cls}"><img src="${src}" alt="${caption}"><figcaption>${caption}</figcaption></figure>`;
await text(
  'public/brand/index.html',
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Koink brand sheet</title>
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<style>
  body { margin: 0; padding: 24px 16px 48px; background: #EFE9DD; color: #24201C; font: 500 15px/1.5 system-ui, sans-serif; }
  main { max-width: 880px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; margin: 32px 0 12px; color: #736B62; }
  p { margin: 0 0 8px; color: #736B62; }
  .row { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  figure { margin: 0; } figcaption { font-size: 12px; font-weight: 700; margin-top: 6px; color: #736B62; }
  img { display: block; width: 100%; height: auto; border-radius: 20px; }
  .wide { grid-column: span 2; } .play img { cursor: pointer; }
  button { font: inherit; font-weight: 800; border: 0; border-radius: 999px; padding: 8px 16px; background: #24201C; color: #EFE9DD; cursor: pointer; }
</style>
</head>
<body>
<main>
  <h1>Koink brand sheet</h1>
  <p>Every asset in its light and its dark version, generated from <code>src/brand/art.js</code> by <code>npm run brand</code>.</p>

  <h2>Icon</h2>
  <div class="row">${figure('koink-icon-light.svg', 'Icon, light')}${figure('koink-icon-dark.svg', 'Icon, dark')}</div>

  <h2>Wordmark</h2>
  <div class="row">${figure('koink-wordmark-light.svg', 'Wordmark, light', 'wide')}${figure('koink-wordmark-dark.svg', 'Wordmark, dark', 'wide')}</div>

  <h2>Launch animations</h2>
  <p>Tap one to play it again. <button type="button" id="all">Play all</button></p>
  <div class="row play">${INTRO_ANIMATIONS.flatMap((a, i) => ['light', 'dark'].map((mode) => figure(`koink-intro-${a.id}-${mode}.svg`, `${i + 1}. ${a.id}, ${mode} (${a.duration} ms)`))).join('')}</div>
</main>
<script>
  // An SVG image plays its animation when it loads: loading it again plays it again.
  var play = function (img) { img.src = img.src.split('?')[0] + '?' + Date.now(); };
  var images = document.querySelectorAll('.play img');
  images.forEach(function (img) { img.addEventListener('click', function () { play(img); }); });
  document.getElementById('all').addEventListener('click', function () { images.forEach(play); });
</script>
</body>
</html>`,
);

/* ---------- PNG: web ---------- */

await png(iconSvg('light'), 192, 'public/icons/icon-192.png');
await png(iconSvg('light'), 512, 'public/icons/icon-512.png');
// Maskable: full bleed, the logo centred inside the 80 % safe zone.
await png(iconSvg('light', { tile: 'square', scale: 0.98 }), 512, 'public/icons/maskable-512.png');
// iOS rounds the corners itself and does not want transparency: the reference tile as it is.
await png(iconSvg('light', { tile: 'square' }), 180, 'public/icons/apple-touch-icon.png');
await png(iconSvg('light'), 512, 'public/brand/koink-icon-light-512.png');
await png(iconSvg('dark'), 512, 'public/brand/koink-icon-dark-512.png');

/* ---------- PNG: Android (only when the native project exists) ---------- */

const res = 'android/app/src/main/res';
if (existsSync(path.join(root, res))) {
  const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [name, factor] of Object.entries(densities)) {
    await png(iconSvg('light'), 48 * factor, `${res}/mipmap-${name}/ic_launcher.png`);
    await png(iconSvg('light', { tile: 'circle', scale: 0.86 }), 48 * factor, `${res}/mipmap-${name}/ic_launcher_round.png`);
    // Adaptive icon layers: 108 dp canvas, the logo inside the 66 dp safe circle. The background
    // layer is the colour ic_launcher_background (values/). Monochrome is the Android 13+ themed icon.
    await png(iconSvg('light', { tile: 'none', scale: 0.78 }), 108 * factor, `${res}/mipmap-${name}/ic_launcher_foreground.png`);
    await png(monoLogoSvg({ scale: 0.78 }), 108 * factor, `${res}/mipmap-${name}/ic_launcher_monochrome.png`);
    // Notification icon: Android uses only the alpha channel and tints it. The whole logo, as
    // large as the 24 dp canvas allows, with heavier pig lines so the face survives at that size.
    await png(monoLogoSvg({ scale: 1.5, thicken: 1.35 }), 24 * factor, `${res}/drawable-${name}/ic_stat_koink.png`);
  }
} else {
  console.log('android/ not found: skipped the launcher and notification icons.');
}

console.log(`Wrote ${written.length} brand files.`);
