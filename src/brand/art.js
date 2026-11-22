/*
 * Koink brand artwork: the single source for the icon, the wordmark, the launch animations and the
 * logo-press animations.
 *
 * Plain JavaScript on purpose: the app imports it (Brand.tsx, lib/intro.ts) and so do the Node
 * scripts that write the static files (scripts/render-brand.mjs). Nothing here touches the DOM.
 *
 * The logo is the pig with a gold coin on its head; the coin carries the K (a K cut out of the
 * coin). The pig is drawn in head-centred units (the head's centre is 0,0, one unit is one unit
 * of the earlier 1024 px artwork); the icon and the wordmark place it with one transform each.
 * Change a number here, run `npm run brand`, and every copy of the logo follows. See docs/brand.md.
 */

/** The two versions of every asset. `bg` is the tile / page colour the version is meant for. */
export const PALETTE = {
  light: { bg: '#F9F3E6', ink: '#0B0F1E', coin: '#F59F00' },
  dark: { bg: '#070A14', ink: '#F9F3E6', coin: '#FFC53D' },
};

export const ICON_SIZE = 1024;
/** Corner radius of the icon's tile. */
export const TILE_RADIUS = 240;
/** Height of the pig with its coin in the icon (px of the 1024 tile). */
export const ICON_LOGO_HEIGHT = 800;

const n = (value) => String(Math.round(value * 100) / 100);
const r4 = (value) => String(Math.round(value * 10000) / 10000);

/** Closed path through `points`; a point with `r` gets a round corner of that radius. */
function roundedPolygon(points) {
  const unit = (x, y) => {
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  };
  const parts = points.map((p, i) => {
    const command = i ? 'L' : 'M';
    if (!p.r) return `${command}${n(p.x)} ${n(p.y)}`;
    const prev = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];
    const u1 = unit(prev.x - p.x, prev.y - p.y);
    const u2 = unit(next.x - p.x, next.y - p.y);
    const distance = p.r / Math.tan(Math.acos(u1.x * u2.x + u1.y * u2.y) / 2);
    const sweep = u1.x * u2.y - u1.y * u2.x < 0 ? 1 : 0;
    return `${command}${n(p.x + u1.x * distance)} ${n(p.y + u1.y * distance)}A${p.r} ${p.r} 0 0 ${sweep} ${n(p.x + u2.x * distance)} ${n(p.y + u2.y * distance)}`;
  });
  return `${parts.join('')}Z`;
}

/* ---------- The K (it lives on the coin) ---------- */

const TOP = 224.5;
const BASELINE = 792.1;
const STEM = { x: 246.5, y: TOP, width: 121.7, height: BASELINE - TOP, r: 54 };
// The four slanted edges as x = a + b * y.
const ARM_UPPER = { a: 822.334, b: -0.95777 };
const ARM_LOWER = { a: 972.922, b: -0.97546 };
const LEG_LOWER = { a: -136.09, b: 0.95033 };
const LEG_UPPER = { a: 23.855, b: 0.93733 };
const on = (edge, y) => ({ x: edge.a + edge.b * y, y });

// Arm and leg are cut level with the top and the baseline; the blunt corner is rounded wide, the
// sharp one tight. Both shapes run on into the stem, so the three parts read as one letter.
const ARM = roundedPolygon([on(ARM_UPPER, 530), { ...on(ARM_UPPER, TOP), r: 82 }, { ...on(ARM_LOWER, TOP), r: 47 }, on(ARM_LOWER, 530)]);
const LEG = roundedPolygon([on(LEG_LOWER, 500), { ...on(LEG_LOWER, BASELINE), r: 82 }, { ...on(LEG_UPPER, BASELINE), r: 47 }, on(LEG_UPPER, 470)]);
/** Centre and height of the K above (its box is 246.5 .. 692.13 wide), to place it at any size. */
const K_BOX = { cx: (STEM.x + 692.13) / 2, cy: (TOP + BASELINE) / 2, h: BASELINE - TOP };

/** The K, `height` tall, centred on (cx, cy). */
const kShape = (cx, cy, height, fill, cls = '') => {
  const scale = Math.round((height / K_BOX.h) * 1000) / 1000;
  return (
    `<g${cls} transform="translate(${n(cx)} ${n(cy)}) scale(${scale}) translate(${-n(K_BOX.cx)} ${-n(K_BOX.cy)})" fill="${fill}">` +
    `<rect x="${STEM.x}" y="${STEM.y}" width="${STEM.width}" height="${n(STEM.height)}" rx="${STEM.r}"/><path d="${ARM}"/><path d="${LEG}"/></g>`
  );
};

/* ---------- The pig and its coin (head-centred units) ---------- */

const AX = 682.6; // the pig's axis in the earlier 1024 px artwork
const HY = 646; // and its head centre
const r2 = (v) => Math.round(v * 100) / 100;
const HEAD = { r: 129.7, stroke: 26 };
const EAR_LEFT = [[569, 583.4], [577.3, 459.7], [635.6, 525.1]].map(([x, y]) => [r2(x - AX), r2(y - HY)]);
const EAR_RIGHT = EAR_LEFT.map(([x, y]) => [-x, y]);
const EYE = { dx: 48.6, cy: 622 - HY, r: 16 };
const SNOUT = { cy: 694.6 - HY, rx: 56.75, ry: 40.5, stroke: 22.6 };
const NOSTRIL = { dx: 22.75, r: 10.3 };
/** The coin: a solid disc above the head, with the K cut out of it (the K is painted in the background colour). */
const COIN = { cy: 447 - HY - 20, r: 62, k: 70 };
/** Top and bottom of the logo (coin top, head bottom) with a little air. */
const LOGO_TOP = COIN.cy - COIN.r - 8;
const LOGO_BOTTOM = HEAD.r + HEAD.stroke / 2;

const line = (points, close) => `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}${close ? 'Z' : ''}`;

/** The pig and the coin are separate parts so that the animations can move them apart. */
function pigParts({ ink, bg, coin, thicken = 1, closedEars = false, animated = false, withK = true, coinHole = false }) {
  const m = (name) => (animated ? ` class="kk-m kk-${name}"` : '');
  const clear = bg === 'none'; // no background colour to paint over: masks do the covering instead
  const sw = HEAD.stroke * thicken;
  // Heavier lines would close the gap between the coin and the head: the coin moves up to keep it.
  const coinY = COIN.cy - Math.max(0, thicken - 1) * 25;
  const stroke = `fill="${clear ? 'none' : bg}" stroke="${ink}" stroke-width="${n(sw)}" stroke-linejoin="round" stroke-linecap="round"`;
  const cut = 'url(#kk-head-cut)';
  const defs =
    (clear
      ? `<mask id="kk-head-cut" maskUnits="userSpaceOnUse" x="-700" y="-1100" width="1400" height="1700"><rect x="-700" y="-1100" width="1400" height="1700" fill="#fff"/><circle r="${HEAD.r}" fill="#000"/></mask>`
      : '') +
    (coinHole && withK
      ? `<mask id="kk-coin-k" maskUnits="userSpaceOnUse" x="-100" y="${n(coinY - 100)}" width="200" height="200"><rect x="-100" y="${n(coinY - 100)}" width="200" height="200" fill="#fff"/>${kShape(0, coinY, COIN.k, '#000')}</mask>`
      : '');
  const disc = `<circle cx="0" cy="${n(coinY)}" r="${COIN.r}" fill="${coin}"${coinHole && withK ? ' mask="url(#kk-coin-k)"' : ''}/>`;
  const coinPart =
    `<g${m('coin')}><g${m('coinx')}>` +
    (animated ? `<circle${m('ring')} cx="0" cy="${n(coinY)}" r="${COIN.r}" fill="none" stroke="${coin}" stroke-width="10" opacity="0"/>` : '') +
    `<g${m('coinin')}>${disc}${withK && !coinHole ? `<g${m('ck')}>${kShape(0, coinY, COIN.k, bg === 'none' ? 'none' : bg)}</g>` : ''}</g></g></g>`;
  const ears =
    `<path${m('ear kk-earl')} pathLength="100" d="${line(EAR_LEFT, closedEars)}" ${stroke}/>` +
    `<path${m('ear kk-earr')} pathLength="100" d="${line(EAR_RIGHT, closedEars)}" ${stroke}/>`;
  const eyeR = n(EYE.r * thicken);
  const nostrilR = n(NOSTRIL.r * thicken);
  const pig =
    `<g${m('pig')}>${clear ? `<g mask="${cut}">${ears}</g>` : ears}` +
    `<circle${m('headfill')} r="${HEAD.r}" fill="${clear ? 'none' : bg}"/>` +
    `<circle${m('headline')} pathLength="100" r="${HEAD.r}" fill="none" stroke="${ink}" stroke-width="${n(sw)}"/>` +
    `<g${m('eyes')}><circle${m('eye kk-eyel')} cx="${-EYE.dx}" cy="${EYE.cy}" r="${eyeR}" fill="${ink}"/><circle${m('eye kk-eyer')} cx="${EYE.dx}" cy="${EYE.cy}" r="${eyeR}" fill="${ink}"/></g>` +
    `<g${m('snout')}><ellipse${m('snouter')} pathLength="100" cx="0" cy="${n(SNOUT.cy)}" rx="${SNOUT.rx}" ry="${SNOUT.ry}" fill="none" stroke="${ink}" stroke-width="${n(SNOUT.stroke * thicken)}"/>` +
    `<circle${m('nostril')} cx="${-NOSTRIL.dx}" cy="${n(SNOUT.cy)}" r="${nostrilR}" fill="${ink}"/><circle${m('nostril')} cx="${NOSTRIL.dx}" cy="${n(SNOUT.cy)}" r="${nostrilR}" fill="${ink}"/></g></g>`;
  return { defs, coin: clear ? `<g mask="${cut}">${coinPart}</g>` : coinPart, pig, coinY, top: coinY - COIN.r - 8, bottom: HEAD.r + sw / 2 };
}

/** Where the pig and coin go in the 1024 tile: centred, `ICON_LOGO_HEIGHT * scale` tall. */
function iconTransform(scale = 1) {
  const s = (ICON_LOGO_HEIGHT * scale) / (LOGO_BOTTOM - LOGO_TOP);
  const cy = (LOGO_TOP + LOGO_BOTTOM) / 2;
  return `translate(512 512) scale(${n(s)}) translate(0 ${n(-cy)})`;
}

/**
 * The logo as SVG groups in icon coordinates: the pig with its coin. `ink`, `bg` and `coin` are any
 * CSS colours (also `var(...)`). With `animated`, every part carries a `kk-*` class for the launch
 * animations. `bg` is the colour of the tile; with 'none' the logo works on any colour.
 */
export function logoMarkup({ ink, bg, coin, animated = false, thicken = 1, closedEars = false, withK = true, scale = 1, coinHole = false }) {
  const p = pigParts({ ink, bg, coin, thicken, closedEars, animated, withK, coinHole });
  const body = `${p.defs}${p.coin}${p.pig}`;
  return `<g transform="${iconTransform(scale)}">${animated ? `<g class="kk-m kk-all">${body}</g>` : body}</g>`;
}

/** The app icon: a tile in the version's background colour with the logo on it. */
export function iconSvg(mode, { tile = 'rounded', scale = 1, colors } = {}) {
  const c = colors ?? PALETTE[mode];
  const plate =
    tile === 'square' ? `<rect width="1024" height="1024" fill="${c.bg}"/>`
    : tile === 'circle' ? `<circle cx="512" cy="512" r="512" fill="${c.bg}"/>`
    : tile === 'rounded' ? `<rect width="1024" height="1024" rx="${TILE_RADIUS}" fill="${c.bg}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${plate}${logoMarkup({ ...c, scale })}</svg>`;
}

/**
 * The logo as one colour on a transparent background, for places that only use the alpha channel
 * (Android notification icon, themed launcher icon). The K is really cut out of the coin (a mask),
 * because there is no background colour to paint it with. `thicken` makes the pig's lines heavier
 * so they survive at 24 dp; `scale` is relative to the icon (1 = the icon's size).
 */
export function monoLogoSvg({ color = '#FFFFFF', scale = 1, thicken = 1, canvas = 1024 } = {}) {
  const art = logoMarkup({ ink: color, bg: 'none', coin: color, thicken, scale, coinHole: true });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${canvas}" height="${canvas}">${art}</svg>`;
}

/* ---------- Wordmark ---------- */

/** "k" + the pig + "ink", outlines of Nunito Black (SIL Open Font License), so no font is needed. */
const WORD = {
  W: 426,
  H: 158,
  vbY: 0,
  cx: 145.59,
  cy: 105.95,
  s: 0.312,
  k: "M27.18 151.36L27.18 151.36Q20.82 151.36 17.34 147.88Q13.87 144.4 13.87 137.75L13.87 137.75L13.87 55.61Q13.87 48.96 17.34 45.48Q20.82 42 27.18 42L27.18 42Q33.68 42 37.24 45.48Q40.79 48.96 40.79 55.61L40.79 55.61L40.79 105.53L41.09 105.53L59.55 83.14Q63.33 78.61 66.58 76.41Q69.83 74.22 75.43 74.22Q81.03 74.22 84.05 76.94Q87.08 79.66 87.23 83.75Q87.38 87.83 83.9 91.92L83.9 91.92L67.71 110.97L86.32 134.27Q89.65 138.5 89.04 142.51Q88.44 146.52 85.18 148.94Q81.93 151.36 76.94 151.36L76.94 151.36Q70.89 151.36 67.26 149.17Q63.63 146.97 60 142.29L60 142.29L41.09 118.99L40.79 118.99L40.79 137.75Q40.79 151.36 27.18 151.36",
  i: "M218.63 151.36L218.63 151.36Q212.28 151.36 208.8 147.58Q205.32 143.8 205.32 136.69L205.32 136.69L205.32 88.89Q205.32 81.78 208.8 78Q212.28 74.22 218.63 74.22L218.63 74.22Q225.13 74.22 228.69 78Q232.24 81.78 232.24 88.89L232.24 88.89L232.24 136.69Q232.24 143.8 228.76 147.58Q225.28 151.36 218.63 151.36M218.63 63.48L218.63 63.48Q211.52 63.48 207.66 60.15Q203.8 56.82 203.8 50.47L203.8 50.47Q203.8 44.27 207.66 40.94Q211.52 37.61 218.63 37.61L218.63 37.61Q226.04 37.61 229.82 40.94Q233.6 44.27 233.6 50.47L233.6 50.47Q233.6 56.82 229.82 60.15Q226.04 63.48 218.63 63.48",
  n: "M261.13 151.36L261.13 151.36Q254.78 151.36 251.3 147.88Q247.82 144.4 247.82 137.75L247.82 137.75L247.82 87.68Q247.82 81.18 251.23 77.7Q254.63 74.22 260.98 74.22Q267.33 74.22 270.66 77.7L270.66 77.7Q273.54 80.72 273.99 85.87L273.99 85.87Q277.32 80.72 282.76 77.7L282.76 77.7Q289.42 73.92 298.04 73.92L298.04 73.92Q306.96 73.92 312.71 77.32Q318.46 80.72 321.33 87.91Q324.21 95.09 324.21 105.98L324.21 105.98L324.21 137.75Q324.21 144.4 320.73 147.88Q317.25 151.36 310.75 151.36Q304.24 151.36 300.76 147.88Q297.28 144.4 297.28 137.75L297.28 137.75L297.28 107.04Q297.28 100.24 294.94 97.36Q292.59 94.49 288.06 94.49L288.06 94.49Q282.01 94.49 278.38 98.34Q274.75 102.2 274.75 108.71L274.75 108.71L274.75 137.75Q274.75 151.36 261.13 151.36",
  k2: "M352.8 151.36L352.8 151.36Q346.44 151.36 342.96 147.88Q339.49 144.4 339.49 137.75L339.49 137.75L339.49 55.61Q339.49 48.96 342.96 45.48Q346.44 42 352.8 42L352.8 42Q359.3 42 362.86 45.48Q366.41 48.96 366.41 55.61L366.41 55.61L366.41 105.53L366.71 105.53L385.17 83.14Q388.95 78.61 392.2 76.41Q395.45 74.22 401.05 74.22Q406.65 74.22 409.67 76.94Q412.7 79.66 412.85 83.75Q413 87.83 409.52 91.92L409.52 91.92L393.33 110.97L411.94 134.27Q415.27 138.5 414.66 142.51Q414.06 146.52 410.8 148.94Q407.55 151.36 402.56 151.36L402.56 151.36Q396.51 151.36 392.88 149.17Q389.25 146.97 385.62 142.29L385.62 142.29L366.71 118.99L366.41 118.99L366.41 137.75Q366.41 151.36 352.8 151.36",
};

/** View box of the wordmark: the pig is the "o", its coin stands above it. */
export const WORDMARK_BOX = { x: 0, y: WORD.vbY, width: WORD.W, height: WORD.H };

const WORD_PIG = `translate(${n(WORD.cx)} ${n(WORD.cy)}) scale(${r4(WORD.s)})`;
/** The pig of the wordmark has slightly lighter lines, ears drawn as closed triangles, and no K on its coin. */
const WORD_LOOK = { thicken: 0.885, closedEars: true, withK: false };

/**
 * The wordmark's shapes. Nothing needs a background colour, so it works on any colour. With
 * `animated` the pig and its coin carry the `kk-*` classes, which is how the header logo plays its
 * press animation (`PRESS_ANIMATIONS`).
 */
export function wordmarkMarkup({ ink, coin, animated = false }) {
  const p = pigParts({ ink, bg: 'none', coin, animated, ...WORD_LOOK });
  const body = `${p.defs}${p.coin}${p.pig}`;
  return (
    `<path fill="${ink}" d="${WORD.k}"/><g transform="${WORD_PIG}">${animated ? `<g class="kk-m kk-body">${body}</g>` : body}</g>` +
    `<path fill="${ink}" d="${WORD.i}"/><path fill="${ink}" d="${WORD.n}"/><path fill="${ink}" d="${WORD.k2}"/>`
  );
}

export function wordmarkSvg(mode, { background = false } = {}) {
  const c = PALETTE[mode];
  const b = WORDMARK_BOX;
  const pad = 30;
  const plate = background ? `<rect x="${b.x - pad}" y="${b.y - pad}" width="${b.width + 2 * pad}" height="${b.height + 2 * pad}" fill="${c.bg}"/>` : '';
  const box = background ? `${b.x - pad} ${b.y - pad} ${b.width + 2 * pad} ${b.height + 2 * pad}` : `${b.x} ${b.y} ${b.width} ${b.height}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${plate}${wordmarkMarkup({ ink: c.ink, coin: c.coin })}</svg>`;
}

/* ---------- Animations ---------- */

/** `@name` in the keyframe names below becomes `<prefix>-name`, so no two animations share a keyframe name. */
const prefixed = (css, prefix) => css.replaceAll('@keyframes', '§KF').replaceAll('@', `${prefix}-`).replaceAll('§KF', '@keyframes ');
/** Every moving part is its own transform box and turns about its own centre unless a rule says otherwise. */
const PART = '& .kk-m{transform-box:fill-box;transform-origin:50% 50%}';
const compact = (css) => css.replace(/\n/g, '');

/**
 * Launch animations. Every one ends on the untouched icon. `duration` is how long it plays in the
 * app (and in `public/brand`'s files, which play at the speed the app uses); the CSS reads it as
 * `--intro-ms` and its keyframes are in percent, so `duration` is the only number to change. The
 * first one is the signature animation and plays on the very first launch.
 */
export const INTRO_ANIMATIONS = [
  {
    id: "coin-drop",
    name: "Coin drop",
    duration: 950,
    designMs: 1900,
    desc: "Inspired by the old “coin-oink”: the K coin hops, spins, drops into the pig’s head, the pig oinks, and a fresh coin pops back on top.",
    css: `
& .kk-pig{transform-origin:50% 100%}& .kk-earl{transform-origin:78% 88%}& .kk-earr{transform-origin:22% 88%}
&  .kk-all{animation:ki1-all var(--intro-ms) linear both;}& .kk-coin{animation:ki1-coin var(--intro-ms) linear both;}& .kk-coinin{animation:ki1-spin var(--intro-ms) linear both;}& .kk-pig{animation:ki1-pig var(--intro-ms) linear both;}& .kk-snout{animation:ki1-snout var(--intro-ms) linear both;}& .kk-eyes{animation:ki1-eyes var(--intro-ms) linear both;}& .kk-earl{animation:ki1-el var(--intro-ms) linear both;}& .kk-earr{animation:ki1-er var(--intro-ms) linear both;}
@keyframes  ki1-all{0%{opacity:0;transform:scale(.9);animation-timing-function:cubic-bezier(.22,1,.36,1);}14%{opacity:1;transform:scale(1);}100%{opacity:1;transform:scale(1);}}
@keyframes  ki1-coin{0%{opacity:1;transform:translateY(0);}16%{opacity:1;transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}30%{opacity:1;transform:translateY(-150px);}36%{opacity:1;transform:translateY(-150px);animation-timing-function:cubic-bezier(.55,0,.9,.5);}54%{opacity:1;transform:translateY(214px);}55%{opacity:0;transform:translateY(214px);}78%{opacity:0;transform:translateY(0);}79%{opacity:1;transform:translateY(0);}100%{opacity:1;transform:translateY(0);}}
@keyframes  ki1-spin{0%{transform:scale(1);}16%{transform:scaleX(1);animation-timing-function:ease-in-out;}21%{transform:scaleX(.08);animation-timing-function:ease-in-out;}26%{transform:scaleX(1);animation-timing-function:ease-in-out;}31%{transform:scaleX(.08);animation-timing-function:ease-in-out;}36%{transform:scaleX(1);}78%{transform:scale(.2);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}90%{transform:scale(1.14);}95%{transform:scale(.97);}100%{transform:scale(1);}}
@keyframes  ki1-pig{0%{transform:scale(1,1);}54%{transform:scale(1,1);animation-timing-function:cubic-bezier(.2,.7,.3,1);}58%{transform:scale(1.07,.88);animation-timing-function:ease-in-out;}65%{transform:scale(.96,1.06);animation-timing-function:ease-in-out;}73%{transform:scale(1.01,.99);}80%{transform:scale(1,1);}100%{transform:scale(1,1);}}
@keyframes  ki1-snout{0%{transform:scale(1);}62%{transform:scale(1);animation-timing-function:ease-in-out;}68%{transform:scale(1.32);animation-timing-function:ease-in-out;}74%{transform:scale(.93);}80%{transform:scale(1);}100%{transform:scale(1);}}
@keyframes  ki1-eyes{0%{transform:scaleY(1);}60%{transform:scaleY(1);}64%{transform:scaleY(.12);}71%{transform:scaleY(.12);}76%{transform:scaleY(1);}100%{transform:scaleY(1);}}
@keyframes  ki1-el{0%{transform:rotate(0deg);}58%{transform:rotate(0deg);animation-timing-function:ease-in-out;}65%{transform:rotate(-15deg);animation-timing-function:ease-in-out;}73%{transform:rotate(6deg);}81%{transform:rotate(0deg);}100%{transform:rotate(0deg);}}
@keyframes  ki1-er{0%{transform:rotate(0deg);}58%{transform:rotate(0deg);animation-timing-function:ease-in-out;}65%{transform:rotate(15deg);animation-timing-function:ease-in-out;}73%{transform:rotate(-6deg);}81%{transform:rotate(0deg);}100%{transform:rotate(0deg);}}`,
  },
  {
    id: "draw-on",
    name: "Draw-on",
    duration: 1050,
    designMs: 2100,
    desc: "Inspired by the old “sketch”: the head is drawn round, the ears and snout are sketched, the eyes pop open, and the K is stamped onto the coin.",
    css: `
& .kk-pig{transform-origin:50% 100%}& .kk-earl{transform-origin:78% 88%}& .kk-earr{transform-origin:22% 88%}& .kk-headline{transform:rotate(-90deg);stroke-dasharray:100}& .kk-ear,& .kk-snouter{stroke-dasharray:100}
& .kk-headfill{animation:ki2-hf var(--intro-ms) linear both;}& .kk-headline{animation:ki2-hl var(--intro-ms) linear both;}& .kk-earl{animation:ki2-dl var(--intro-ms) linear both;}& .kk-earr{animation:ki2-dr var(--intro-ms) linear both;}& .kk-eyel{animation:ki2-e1 var(--intro-ms) linear both;}& .kk-eyer{animation:ki2-e2 var(--intro-ms) linear both;}& .kk-snouter{animation:ki2-sn var(--intro-ms) linear both;}& .kk-nostril{animation:ki2-nos var(--intro-ms) linear both;}& .kk-coinin{animation:ki2-coin var(--intro-ms) linear both;}& .kk-ck{animation:ki2-ck var(--intro-ms) linear both;}& .kk-pig{animation:ki2-bob var(--intro-ms) linear both;}
@keyframes  ki2-hf{0%{opacity:0;}8%{opacity:0;}22%{opacity:1;}100%{opacity:1;}}
@keyframes  ki2-hl{0%{stroke-dashoffset:100;opacity:0;}4%{stroke-dashoffset:100;opacity:1;animation-timing-function:cubic-bezier(.22,1,.36,1);}36%{stroke-dashoffset:0;opacity:1;}100%{stroke-dashoffset:0;opacity:1;}}
@keyframes  ki2-dl{0%{stroke-dashoffset:100;opacity:0;}30%{stroke-dashoffset:100;opacity:0;}31%{stroke-dashoffset:100;opacity:1;animation-timing-function:cubic-bezier(.22,1,.36,1);}46%{stroke-dashoffset:0;opacity:1;}100%{stroke-dashoffset:0;opacity:1;}}
@keyframes  ki2-dr{0%{stroke-dashoffset:100;opacity:0;}33%{stroke-dashoffset:100;opacity:0;}34%{stroke-dashoffset:100;opacity:1;animation-timing-function:cubic-bezier(.22,1,.36,1);}49%{stroke-dashoffset:0;opacity:1;}100%{stroke-dashoffset:0;opacity:1;}}
@keyframes  ki2-e1{0%{transform:scale(0);}47%{transform:scale(0);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}55%{transform:scale(1);}100%{transform:scale(1);}}
@keyframes  ki2-e2{0%{transform:scale(0);}50%{transform:scale(0);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}58%{transform:scale(1);}100%{transform:scale(1);}}
@keyframes  ki2-sn{0%{stroke-dashoffset:100;opacity:0;}52%{stroke-dashoffset:100;opacity:0;}53%{stroke-dashoffset:100;opacity:1;animation-timing-function:cubic-bezier(.22,1,.36,1);}66%{stroke-dashoffset:0;opacity:1;}100%{stroke-dashoffset:0;opacity:1;}}
@keyframes  ki2-nos{0%{transform:scale(0);}63%{transform:scale(0);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}70%{transform:scale(1);}100%{transform:scale(1);}}
@keyframes  ki2-coin{0%{transform:scale(0) rotate(-180deg);}68%{transform:scale(0) rotate(-180deg);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}85%{transform:scale(1.12) rotate(4deg);}91%{transform:scale(.97) rotate(0deg);}95%{transform:scale(1) rotate(0deg);}100%{transform:scale(1) rotate(0deg);}}
@keyframes  ki2-ck{0%{opacity:0;transform:scale(2.4);}82%{opacity:0;transform:scale(2.4);}83%{opacity:1;transform:scale(2.4);animation-timing-function:cubic-bezier(.2,.7,.3,1);}91%{opacity:1;transform:scale(.86);animation-timing-function:ease-in-out;}96%{opacity:1;transform:scale(1.05);}100%{opacity:1;transform:scale(1);}}
@keyframes  ki2-bob{0%{transform:scale(1);}88%{transform:scale(1);animation-timing-function:ease-in-out;}92%{transform:scale(1.03,.97);animation-timing-function:ease-in-out;}97%{transform:scale(.99,1.01);}100%{transform:scale(1);}}`,
  },
  {
    id: "pop-toss",
    name: "Pop & toss",
    duration: 900,
    designMs: 1800,
    desc: "Inspired by the old “pop-toss”: the pig pops up from the bottom edge and tosses the coin in an arc; the K coin lands back on its head.",
    css: `
& .kk-pig{transform-origin:50% 100%}& .kk-earl{transform-origin:78% 88%}& .kk-earr{transform-origin:22% 88%}
& .kk-pig{animation:ki3-pig var(--intro-ms) linear both;}& .kk-coin{animation:ki3-coin var(--intro-ms) linear both;}& .kk-coinx{animation:ki3-cx var(--intro-ms) linear both;}& .kk-coinin{animation:ki3-spin var(--intro-ms) linear both;}& .kk-snout{animation:ki3-snout var(--intro-ms) linear both;}& .kk-eyes{animation:ki3-eyes var(--intro-ms) linear both;}
@keyframes  ki3-pig{0%{transform:translateY(560px) scale(1,1);}8%{transform:translateY(560px) scale(.9,1.14);animation-timing-function:cubic-bezier(.2,.7,.3,1);}24%{transform:translateY(-34px) scale(.92,1.12);animation-timing-function:ease-in-out;}32%{transform:translateY(0) scale(1.1,.88);animation-timing-function:ease-in-out;}40%{transform:translateY(0) scale(.97,1.04);}48%{transform:translateY(0) scale(1,1);}100%{transform:translateY(0) scale(1,1);}}
@keyframes  ki3-coin{0%{opacity:0;transform:translateY(214px);}38%{opacity:0;transform:translateY(214px);}39%{opacity:1;transform:translateY(214px);animation-timing-function:cubic-bezier(.2,.7,.3,1);}56%{opacity:1;transform:translateY(-110px);animation-timing-function:cubic-bezier(.55,0,.9,.5);}74%{opacity:1;transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}80%{opacity:1;transform:translateY(-26px);animation-timing-function:cubic-bezier(.55,0,.9,.5);}86%{opacity:1;transform:translateY(0);}100%{opacity:1;transform:translateY(0);}}
@keyframes  ki3-cx{0%{transform:translateX(0);}39%{transform:translateX(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}58%{transform:translateX(64px);animation-timing-function:ease-in-out;}76%{transform:translateX(0);}100%{transform:translateX(0);}}
@keyframes  ki3-spin{0%{transform:scaleX(1);}40%{transform:scaleX(1);animation-timing-function:ease-in-out;}46%{transform:scaleX(.1);animation-timing-function:ease-in-out;}52%{transform:scaleX(1);animation-timing-function:ease-in-out;}58%{transform:scaleX(.1);animation-timing-function:ease-in-out;}64%{transform:scaleX(1);animation-timing-function:ease-in-out;}69%{transform:scaleX(.1);animation-timing-function:ease-in-out;}74%{transform:scaleX(1);}100%{transform:scaleX(1);}}
@keyframes  ki3-snout{0%{transform:scale(1);}34%{transform:scale(1);animation-timing-function:ease-in-out;}40%{transform:scale(1.32);animation-timing-function:ease-in-out;}47%{transform:scale(.94);}53%{transform:scale(1);}100%{transform:scale(1);}}
@keyframes  ki3-eyes{0%{transform:scaleY(1);}36%{transform:scaleY(1);}40%{transform:scaleY(.15);}46%{transform:scaleY(.15);}52%{transform:scaleY(1);}100%{transform:scaleY(1);}}`,
  },
  {
    id: "mint",
    name: "Mint",
    duration: 1100,
    designMs: 2200,
    desc: "New: a coin is minted big in the middle, the K is struck onto it with a shock ring, then it shrinks away and the pig rises up beneath it.",
    css: `
& .kk-pig{transform-origin:50% 100%}& .kk-earl{transform-origin:78% 88%}& .kk-earr{transform-origin:22% 88%}
& .kk-coin{animation:ki4-coin var(--intro-ms) linear both;}& .kk-coinin{animation:ki4-cin var(--intro-ms) linear both;}& .kk-ck{animation:ki4-ck var(--intro-ms) linear both;}& .kk-ring{animation:ki4-ring var(--intro-ms) linear both;}& .kk-pig{animation:ki4-pig var(--intro-ms) linear both;}
@keyframes  ki4-cin{0%{transform:scale(0);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}12%{transform:scale(3.4);}40%{transform:scale(3.4);animation-timing-function:cubic-bezier(.22,1,.36,1);}64%{transform:scale(1);}100%{transform:scale(1);}}
@keyframes  ki4-coin{0%{transform:translateY(219px);}40%{transform:translateY(219px);animation-timing-function:cubic-bezier(.22,1,.36,1);}64%{transform:translateY(0);}100%{transform:translateY(0);}}
@keyframes  ki4-ck{0%{opacity:0;transform:scale(2.6);}13%{opacity:0;transform:scale(2.6);}14%{opacity:1;transform:scale(2.6);animation-timing-function:cubic-bezier(.2,.7,.3,1);}22%{opacity:1;transform:scale(.88);animation-timing-function:ease-in-out;}28%{opacity:1;transform:scale(1.04);}32%{opacity:1;transform:scale(1);}100%{opacity:1;transform:scale(1);}}
@keyframes  ki4-ring{0%{opacity:0;transform:scale(3.4);}21%{opacity:0;transform:scale(3.4);}22%{opacity:0.55;transform:scale(3.4);animation-timing-function:cubic-bezier(.2,.7,.3,1);}42%{opacity:0;transform:scale(5.6);}100%{opacity:0;transform:scale(5.6);}}
@keyframes  ki4-pig{0%{opacity:0;transform:scale(.55);}42%{opacity:0;transform:scale(.55);}43%{opacity:1;transform:scale(.55);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}66%{opacity:1;transform:scale(1);animation-timing-function:ease-in-out;}72%{opacity:1;transform:scale(1.04,.96);animation-timing-function:ease-in-out;}80%{opacity:1;transform:scale(.99,1.01);}86%{opacity:1;transform:scale(1);}100%{opacity:1;transform:scale(1);}}`,
  },
  {
    id: "peek",
    name: "Peek-a-boo",
    duration: 1200,
    designMs: 2400,
    desc: "New: the pig rises from the bottom edge, looks left and right, blinks and wiggles its ears; then the K coin falls onto its head with a bounce.",
    css: `
& .kk-pig{transform-origin:50% 100%}& .kk-earl{transform-origin:78% 88%}& .kk-earr{transform-origin:22% 88%}
& .kk-pig{animation:ki5-pig var(--intro-ms) linear both;}& .kk-eyes{animation:ki5-eyes var(--intro-ms) linear both;}& .kk-earl{animation:ki5-el var(--intro-ms) linear both;}& .kk-earr{animation:ki5-er var(--intro-ms) linear both;}& .kk-coin{animation:ki5-coin var(--intro-ms) linear both;}& .kk-coinin{animation:ki5-spin var(--intro-ms) linear both;}
@keyframes  ki5-pig{0%{transform:translateY(560px) scale(1,1);}5%{transform:translateY(560px) scale(1,1);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}26%{transform:translateY(0) scale(1,1);}70%{transform:translateY(0) scale(1,1);animation-timing-function:cubic-bezier(.2,.7,.3,1);}73%{transform:translateY(0) scale(1.05,.93);animation-timing-function:ease-in-out;}80%{transform:translateY(0) scale(.98,1.03);}86%{transform:translateY(0) scale(1,1);}100%{transform:translateY(0) scale(1,1);}}
@keyframes  ki5-eyes{0%{transform:translate(0,0) scaleY(1);}28%{transform:translate(0,0) scaleY(1);animation-timing-function:ease-in-out;}34%{transform:translate(-18px,0) scaleY(1);}41%{transform:translate(-18px,0) scaleY(1);animation-timing-function:ease-in-out;}48%{transform:translate(18px,0) scaleY(1);}54%{transform:translate(18px,0) scaleY(1);animation-timing-function:ease-in-out;}59%{transform:translate(0,0) scaleY(1);}62%{transform:translate(0,0) scaleY(.1);}66%{transform:translate(0,0) scaleY(1);}100%{transform:translate(0,0) scaleY(1);}}
@keyframes  ki5-el{0%{transform:rotate(0deg);}55%{transform:rotate(0deg);animation-timing-function:ease-in-out;}60%{transform:rotate(-14deg);animation-timing-function:ease-in-out;}65%{transform:rotate(8deg);animation-timing-function:ease-in-out;}70%{transform:rotate(0deg);}100%{transform:rotate(0deg);}}
@keyframes  ki5-er{0%{transform:rotate(0deg);}58%{transform:rotate(0deg);animation-timing-function:ease-in-out;}63%{transform:rotate(14deg);animation-timing-function:ease-in-out;}68%{transform:rotate(-8deg);animation-timing-function:ease-in-out;}73%{transform:rotate(0deg);}100%{transform:rotate(0deg);}}
@keyframes  ki5-coin{0%{opacity:0;transform:translateY(-460px);}50%{opacity:0;transform:translateY(-460px);}51%{opacity:1;transform:translateY(-460px);animation-timing-function:cubic-bezier(.55,0,.9,.5);}70%{opacity:1;transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}77%{opacity:1;transform:translateY(-34px);animation-timing-function:cubic-bezier(.55,0,.9,.5);}83%{opacity:1;transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}88%{opacity:1;transform:translateY(-8px);animation-timing-function:cubic-bezier(.55,0,.9,.5);}92%{opacity:1;transform:translateY(0);}100%{opacity:1;transform:translateY(0);}}
@keyframes  ki5-spin{0%{transform:scaleX(1);}51%{transform:scaleX(1);animation-timing-function:ease-in-out;}57%{transform:scaleX(.1);animation-timing-function:ease-in-out;}63%{transform:scaleX(1);animation-timing-function:ease-in-out;}68%{transform:scaleX(.1);animation-timing-function:ease-in-out;}72%{transform:scaleX(1);}100%{transform:scaleX(1);}}`,
  },
];

/** Designed as a loading indicator (it loops). A design asset, not used by the app yet. */
export const LOADER_ANIMATION = {
  id: "spin-loop",
  name: "Coin spin (loader)",
  duration: 1700,
  loop: true,
  desc: "New, loops: the K coin spins and bobs above the pig, which blinks and nods. Use it as a loading indicator in the app.",
  css: `
& .kk-pig{transform-origin:50% 100%}& .kk-earl{transform-origin:78% 88%}& .kk-earr{transform-origin:22% 88%}
& .kk-coin{animation:kl-bob var(--intro-ms) linear both;animation-iteration-count:infinite;}& .kk-coinin{animation:kl-spin var(--intro-ms) linear both;animation-iteration-count:infinite;}& .kk-pig{animation:kl-nod var(--intro-ms) linear both;animation-iteration-count:infinite;}& .kk-eyes{animation:kl-blink var(--intro-ms) linear both;animation-iteration-count:infinite;}
@keyframes  kl-bob{0%{transform:translateY(0);}25%{transform:translateY(-26px);animation-timing-function:ease-in-out;}50%{transform:translateY(0);animation-timing-function:ease-in-out;}75%{transform:translateY(-26px);animation-timing-function:ease-in-out;}100%{transform:translateY(0);}}
@keyframes  kl-spin{0%{transform:scaleX(1);}12%{transform:scaleX(.06);animation-timing-function:ease-in-out;}25%{transform:scaleX(-1);animation-timing-function:ease-in-out;}37%{transform:scaleX(-.06);animation-timing-function:ease-in-out;}50%{transform:scaleX(1);}100%{transform:scaleX(1);}}
@keyframes  kl-nod{0%{transform:scale(1,1);}48%{transform:scale(1,1);animation-timing-function:ease-in-out;}52%{transform:scale(1.03,.96);animation-timing-function:ease-in-out;}58%{transform:scale(1,1);}100%{transform:scale(1,1);}}
@keyframes  kl-blink{0%{transform:scaleY(1);}78%{transform:scaleY(1);}82%{transform:scaleY(.1);}87%{transform:scaleY(1);}100%{transform:scaleY(1);}}`,
};

/** The wordmark builds itself: letters pop up, the pig grows in as the "o", the coin drops on its head. A design asset. */
export const WORDMARK_ANIMATION = {
  id: "word-oink",
  name: "Wordmark: coin drop",
  duration: 2400,
  desc: "The letters pop up, the pig grows in as the “o”, then the K coin drops on its head and the pig squashes.",
  css: `
& .kk-l{animation:kw-l calc(var(--intro-ms)*.34) both;animation-delay:calc(var(--intro-ms)*var(--s))}& .kk-pigw{animation:kw-pg calc(var(--intro-ms)*.4) linear both;animation-delay:calc(var(--intro-ms)*.14);transform-origin:50% 100%}& .kk-coin{animation:kw-cn calc(var(--intro-ms)*.46) linear both;animation-delay:calc(var(--intro-ms)*.5)}& .kk-pig{animation:kw-sq calc(var(--intro-ms)*.22) linear both;animation-delay:calc(var(--intro-ms)*.69);transform-origin:50% 100%}& .kk-coinin{animation:kw-cs calc(var(--intro-ms)*.46) linear both;animation-delay:calc(var(--intro-ms)*.5)}
@keyframes  kw-l{0%{opacity:0;transform:translateY(46px) scale(.9);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}100%{opacity:1;transform:translateY(0) scale(1);}}
@keyframes  kw-pg{0%{opacity:0;transform:scale(.4);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}100%{opacity:1;transform:scale(1);}}
@keyframes  kw-cn{0%{opacity:0;transform:translateY(-330px);}1%{opacity:1;transform:translateY(-330px);animation-timing-function:cubic-bezier(.55,0,.9,.5);}62%{opacity:1;transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}78%{opacity:1;transform:translateY(-42px);animation-timing-function:cubic-bezier(.55,0,.9,.5);}90%{opacity:1;transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}95%{opacity:1;transform:translateY(-9px);animation-timing-function:cubic-bezier(.55,0,.9,.5);}100%{opacity:1;transform:translateY(0);}}
@keyframes  kw-cs{0%{transform:scaleX(1);}14%{transform:scaleX(.08);animation-timing-function:ease-in-out;}28%{transform:scaleX(1);animation-timing-function:ease-in-out;}42%{transform:scaleX(.08);animation-timing-function:ease-in-out;}56%{transform:scaleX(1);}100%{transform:scaleX(1);}}
@keyframes  kw-sq{0%{transform:scale(1,1);}30%{transform:scale(1.07,.88);animation-timing-function:ease-in-out;}62%{transform:scale(.97,1.05);animation-timing-function:ease-in-out;}100%{transform:scale(1,1);}}`,
};

/**
 * Logo press: what happens when the wordmark in the header is tapped. Only the pig and its coin move,
 * the letters stay put. One is picked at random (never the same twice in a row), `?press=1..5` forces one.
 */
export const PRESS_ANIMATIONS = [
  {
    id: "oink",
    name: "Oink",
    duration: 1200,
    desc: "From the old logo click: the coin hops, turns once, drops into the pig and the pig oinks (squash, jump, blink, snout, ears); a fresh coin pops back.",
    css: `
& .kk-pig{transform-origin:50% 100%}& .kk-earl{transform-origin:78% 88%}& .kk-earr{transform-origin:22% 88%}& .kk-body{transform-origin:50% 100%}& .kk-coin{transform-origin:50% 50%}
& .kk-coin{animation:kp1-coin var(--intro-ms) linear both;}& .kk-coinin{animation:kp1-turn var(--intro-ms) linear both;}& .kk-pig{animation:kp1-oink var(--intro-ms) linear both;}& .kk-snout{animation:kp1-snout var(--intro-ms) linear both;}& .kk-eyes{animation:kp1-eyes var(--intro-ms) linear both;}& .kk-earl{animation:kp1-earl var(--intro-ms) linear both;}& .kk-earr{animation:kp1-earr var(--intro-ms) linear both;}
@keyframes  kp1-coin{0%{opacity:1;transform:translateY(0) scale(1);animation-timing-function:cubic-bezier(.2,.7,.3,1);}6%{opacity:1;transform:translateY(0) scale(1);animation-timing-function:cubic-bezier(.2,.7,.3,1);}22%{transform:translateY(-56px) scale(1);animation-timing-function:ease-in-out;}30%{transform:translateY(-62px) scale(1);animation-timing-function:cubic-bezier(.55,0,.9,.5);}50%{opacity:1;transform:translateY(201.48px) scale(.7);}51%{opacity:0;transform:translateY(201.48px) scale(.7);}52%{opacity:0;transform:translateY(0) scale(.2);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}78%{opacity:0;transform:translateY(0) scale(.2);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}82%{opacity:1;transform:translateY(0) scale(.6);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}92%{opacity:1;transform:translateY(0) scale(1.1);}100%{opacity:1;transform:translateY(0) scale(1);}}
@keyframes  kp1-turn{0%{transform:scaleX(1);animation-timing-function:cubic-bezier(.12,0,.39,0);}10%{transform:scaleX(1);animation-timing-function:cubic-bezier(.12,0,.39,0);}17%{transform:scaleX(0);animation-timing-function:cubic-bezier(.61,1,.88,1);}24%{transform:scaleX(-1);animation-timing-function:cubic-bezier(.12,0,.39,0);}31%{transform:scaleX(0);animation-timing-function:cubic-bezier(.61,1,.88,1);}38%{transform:scaleX(1);}100%{transform:scaleX(1);}}
@keyframes  kp1-oink{0%{transform:translateY(0) scale(1,1);animation-timing-function:cubic-bezier(.2,.7,.3,1);}48%{transform:translateY(0) scale(1,1);animation-timing-function:cubic-bezier(.2,.7,.3,1);}55%{transform:translateY(0) scale(1.07,.92);animation-timing-function:cubic-bezier(.3,0,.3,1);}64%{transform:translateY(-26px) scale(.96,1.06);animation-timing-function:cubic-bezier(.5,0,.7,.6);}73%{transform:translateY(0) scale(1.04,.96);animation-timing-function:cubic-bezier(.2,.7,.3,1);}82%{transform:translateY(0) scale(1,1);}100%{transform:translateY(0) scale(1,1);}}
@keyframes  kp1-snout{0%{transform:scale(1);}53%{transform:scale(1);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}62%{transform:scale(1.3);animation-timing-function:ease-in-out;}70%{transform:scale(.93);}78%{transform:scale(1);}100%{transform:scale(1);}}
@keyframes  kp1-eyes{0%{transform:scaleY(1);}50%{transform:scaleY(1);}54%{transform:scaleY(.12);}66%{transform:scaleY(.12);}72%{transform:scaleY(1);}100%{transform:scaleY(1);}}
@keyframes  kp1-earl{0%{transform:rotate(0);}52%{transform:rotate(0);}60%{transform:rotate(-17deg);}69%{transform:rotate(7deg);}78%{transform:rotate(0);}100%{transform:rotate(0);}}
@keyframes  kp1-earr{0%{transform:rotate(0);}52%{transform:rotate(0);}60%{transform:rotate(17deg);}69%{transform:rotate(-7deg);}78%{transform:rotate(0);}100%{transform:rotate(0);}}`,
  },
  {
    id: "keypress",
    name: "Key press",
    duration: 1100,
    desc: "New (the pig as a calculator key): it is pressed flat, the snout puffs, then it springs up and launches the coin, which spins and lands back on its head.",
    css: `
& .kk-pig{transform-origin:50% 100%}& .kk-earl{transform-origin:78% 88%}& .kk-earr{transform-origin:22% 88%}& .kk-body{transform-origin:50% 100%}& .kk-coin{transform-origin:50% 50%}
& .kk-pig{animation:kp2-pig var(--intro-ms) linear both;}& .kk-coin{animation:kp2-cs var(--intro-ms) linear both;}& .kk-coinx{animation:kp2-cx var(--intro-ms) linear both;}& .kk-coinin{animation:kp2-spin var(--intro-ms) linear both;}& .kk-snout{animation:kp2-snout var(--intro-ms) linear both;}& .kk-earl{animation:kp2-earl var(--intro-ms) linear both;}& .kk-earr{animation:kp2-earr var(--intro-ms) linear both;}
@keyframes  kp2-pig{0%{transform:translateY(0px) scale(1,1);animation-timing-function:cubic-bezier(.2,.7,.3,1);}14%{transform:translateY(0px) scale(1.14,0.74);animation-timing-function:linear;}30%{transform:translateY(0px) scale(1.14,0.74);animation-timing-function:cubic-bezier(.22,1,.36,1);}46%{transform:translateY(-26px) scale(0.9,1.16);animation-timing-function:cubic-bezier(.55,0,.9,.5);}62%{transform:translateY(0px) scale(1,1);animation-timing-function:cubic-bezier(.2,.7,.3,1);}67%{transform:translateY(0px) scale(1.07,0.92);animation-timing-function:ease-in-out;}78%{transform:translateY(0px) scale(0.99,1.02);animation-timing-function:cubic-bezier(.2,.7,.3,1);}100%{transform:translateY(0px) scale(1,1);}}@keyframes  kp2-cs{0%{transform:translateY(0px);animation-timing-function:cubic-bezier(.2,.7,.3,1);}14%{transform:translateY(70.72px);animation-timing-function:linear;}30%{transform:translateY(70.72px);animation-timing-function:cubic-bezier(.22,1,.36,1);}46%{transform:translateY(-69.52px);animation-timing-function:cubic-bezier(.55,0,.9,.5);}62%{transform:translateY(0px);animation-timing-function:cubic-bezier(.2,.7,.3,1);}67%{transform:translateY(21.76px);animation-timing-function:ease-in-out;}78%{transform:translateY(-5.44px);animation-timing-function:cubic-bezier(.2,.7,.3,1);}100%{transform:translateY(0px);}}
@keyframes  kp2-cx{0%{transform:translateY(0);animation-timing-function:cubic-bezier(.22,1,.36,1);}30%{transform:translateY(0);animation-timing-function:cubic-bezier(.22,1,.36,1);}48%{transform:translateY(-92px);animation-timing-function:cubic-bezier(.55,0,.9,.5);}66%{transform:translateY(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}74%{transform:translateY(-14px);animation-timing-function:cubic-bezier(.55,0,.9,.5);}81%{transform:translateY(0);}100%{transform:translateY(0);}}
@keyframes  kp2-spin{0%{transform:scaleX(1);}32%{transform:scaleX(1);animation-timing-function:ease-in-out;}40%{transform:scaleX(.06);animation-timing-function:ease-in-out;}48%{transform:scaleX(-1);animation-timing-function:ease-in-out;}56%{transform:scaleX(.06);animation-timing-function:ease-in-out;}64%{transform:scaleX(1);}100%{transform:scaleX(1);}}
@keyframes  kp2-snout{0%{transform:scale(1);}14%{transform:scale(1);animation-timing-function:ease-in-out;}24%{transform:scale(1.35);animation-timing-function:ease-in-out;}34%{transform:scale(1);animation-timing-function:ease-in-out;}44%{transform:scale(.92);animation-timing-function:ease-in-out;}54%{transform:scale(1.2);animation-timing-function:ease-in-out;}64%{transform:scale(1);}100%{transform:scale(1);}}
@keyframes  kp2-earl{0%{transform:rotate(0);}14%{transform:rotate(14deg);}46%{transform:rotate(-22deg);}62%{transform:rotate(8deg);}76%{transform:rotate(0);}100%{transform:rotate(0);}}
@keyframes  kp2-earr{0%{transform:rotate(0);}14%{transform:rotate(-14deg);}46%{transform:rotate(22deg);}62%{transform:rotate(-8deg);}76%{transform:rotate(0);}100%{transform:rotate(0);}}`,
  },
  {
    id: "wink-flip",
    name: "Wink & flip",
    duration: 1100,
    desc: "New: the pig tilts its head and winks while the coin flips twice in the air and lands with a little bounce.",
    css: `
& .kk-pig{transform-origin:50% 100%}& .kk-earl{transform-origin:78% 88%}& .kk-earr{transform-origin:22% 88%}& .kk-body{transform-origin:50% 100%}& .kk-coin{transform-origin:50% 50%}
& .kk-pig{animation:kp3-tilt var(--intro-ms) linear both;}& .kk-coin{animation:kp3-hop var(--intro-ms) linear both;}& .kk-coinin{animation:kp3-flip var(--intro-ms) linear both;}& .kk-eyel{animation:kp3-wink var(--intro-ms) linear both;}& .kk-earr{animation:kp3-ear var(--intro-ms) linear both;}& .kk-snout{animation:kp3-snout var(--intro-ms) linear both;}
@keyframes  kp3-tilt{0%{transform:rotate(0) translateY(0);animation-timing-function:ease-in-out;}20%{transform:rotate(-7deg) translateY(0);animation-timing-function:ease-in-out;}62%{transform:rotate(-7deg) translateY(0);animation-timing-function:ease-in-out;}78%{transform:rotate(3deg) translateY(0);animation-timing-function:ease-in-out;}90%{transform:rotate(-1deg) translateY(0);animation-timing-function:ease-in-out;}100%{transform:rotate(0) translateY(0);}}
@keyframes  kp3-hop{0%{transform:translateY(0) rotate(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}8%{transform:translateY(0) rotate(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}36%{transform:translateY(-84px) rotate(-8deg);animation-timing-function:ease-in-out;}46%{transform:translateY(-92px) rotate(-8deg);animation-timing-function:cubic-bezier(.55,0,.9,.5);}70%{transform:translateY(0) rotate(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}76%{transform:translateY(-14px) rotate(0);animation-timing-function:cubic-bezier(.55,0,.9,.5);}83%{transform:translateY(0) rotate(0);}100%{transform:translateY(0) rotate(0);}}
@keyframes  kp3-flip{0%{transform:scaleX(1);}10%{transform:scaleX(1);animation-timing-function:ease-in-out;}20%{transform:scaleX(.05);animation-timing-function:ease-in-out;}30%{transform:scaleX(-1);animation-timing-function:ease-in-out;}40%{transform:scaleX(-.05);animation-timing-function:ease-in-out;}50%{transform:scaleX(1);animation-timing-function:ease-in-out;}58%{transform:scaleX(.05);animation-timing-function:ease-in-out;}66%{transform:scaleX(-1);animation-timing-function:ease-in-out;}72%{transform:scaleX(-.05);animation-timing-function:ease-in-out;}78%{transform:scaleX(1);}100%{transform:scaleX(1);}}
@keyframes  kp3-wink{0%{transform:scaleY(1);}28%{transform:scaleY(1);}34%{transform:scaleY(.08);}60%{transform:scaleY(.08);}68%{transform:scaleY(1);}100%{transform:scaleY(1);}}
@keyframes  kp3-ear{0%{transform:rotate(0);}20%{transform:rotate(0);}32%{transform:rotate(18deg);}44%{transform:rotate(-6deg);}56%{transform:rotate(10deg);}70%{transform:rotate(0);}100%{transform:rotate(0);}}
@keyframes  kp3-snout{0%{transform:scale(1);}70%{transform:scale(1);animation-timing-function:cubic-bezier(.3,1.5,.5,1);}78%{transform:scale(1.25);animation-timing-function:ease-in-out;}88%{transform:scale(.96);}100%{transform:scale(1);}}`,
  },
  {
    id: "hop",
    name: "Happy hop",
    duration: 1000,
    desc: "New: the pig hops twice, ears flapping; the coin lags behind like a hat and wobbles on every landing.",
    css: `
& .kk-pig{transform-origin:50% 100%}& .kk-earl{transform-origin:78% 88%}& .kk-earr{transform-origin:22% 88%}& .kk-body{transform-origin:50% 100%}& .kk-coin{transform-origin:50% 50%}
& .kk-pig{animation:kp4-pig var(--intro-ms) linear both;}& .kk-coin{animation:kp4-cs var(--intro-ms) linear both;}& .kk-coinx{animation:kp4-cx var(--intro-ms) linear both;}& .kk-eyes{animation:kp4-eyes var(--intro-ms) linear both;}& .kk-earl{animation:kp4-earl var(--intro-ms) linear both;}& .kk-earr{animation:kp4-earr var(--intro-ms) linear both;}
@keyframes  kp4-pig{0%{transform:translateY(0px) scale(1,1);animation-timing-function:cubic-bezier(.2,.7,.3,1);}10%{transform:translateY(0px) scale(1.12,0.84);animation-timing-function:cubic-bezier(.2,.7,.3,1);}26%{transform:translateY(-64px) scale(0.94,1.1);animation-timing-function:ease-in-out;}40%{transform:translateY(0px) scale(1.1,0.88);animation-timing-function:cubic-bezier(.2,.7,.3,1);}48%{transform:translateY(0px) scale(1,1);animation-timing-function:cubic-bezier(.2,.7,.3,1);}60%{transform:translateY(-34px) scale(0.95,1.08);animation-timing-function:ease-in-out;}72%{transform:translateY(0px) scale(1.06,0.92);animation-timing-function:cubic-bezier(.2,.7,.3,1);}82%{transform:translateY(0px) scale(0.99,1.02);animation-timing-function:cubic-bezier(.2,.7,.3,1);}100%{transform:translateY(0px) scale(1,1);}}@keyframes  kp4-cs{0%{transform:translateY(0px);animation-timing-function:cubic-bezier(.2,.7,.3,1);}10%{transform:translateY(43.52px);animation-timing-function:cubic-bezier(.2,.7,.3,1);}26%{transform:translateY(-91.2px);animation-timing-function:ease-in-out;}40%{transform:translateY(32.64px);animation-timing-function:cubic-bezier(.2,.7,.3,1);}48%{transform:translateY(0px);animation-timing-function:cubic-bezier(.2,.7,.3,1);}60%{transform:translateY(-55.76px);animation-timing-function:ease-in-out;}72%{transform:translateY(21.76px);animation-timing-function:cubic-bezier(.2,.7,.3,1);}82%{transform:translateY(-5.44px);animation-timing-function:cubic-bezier(.2,.7,.3,1);}100%{transform:translateY(0px);}}
@keyframes  kp4-cx{0%{transform:translateY(0) rotate(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}12%{transform:translateY(8px) rotate(0);animation-timing-function:cubic-bezier(.2,.7,.3,1);}30%{transform:translateY(-18px) rotate(-12deg);animation-timing-function:ease-in-out;}44%{transform:translateY(10px) rotate(6deg);animation-timing-function:cubic-bezier(.2,.7,.3,1);}52%{transform:translateY(-8px) rotate(0);animation-timing-function:ease-in-out;}64%{transform:translateY(-14px) rotate(10deg);animation-timing-function:ease-in-out;}76%{transform:translateY(6px) rotate(-4deg);animation-timing-function:cubic-bezier(.2,.7,.3,1);}88%{transform:translateY(-3px) rotate(0);}100%{transform:translateY(0) rotate(0);}}
@keyframes  kp4-eyes{0%{transform:scaleY(1);}38%{transform:scaleY(1);}41%{transform:scaleY(.1);}47%{transform:scaleY(1);}70%{transform:scaleY(1);}73%{transform:scaleY(.1);}79%{transform:scaleY(1);}100%{transform:scaleY(1);}}
@keyframes  kp4-earl{0%{transform:rotate(0);}10%{transform:rotate(8deg);}26%{transform:rotate(-24deg);}40%{transform:rotate(10deg);}60%{transform:rotate(-24deg);}72%{transform:rotate(8deg);}86%{transform:rotate(0);}100%{transform:rotate(0);}}
@keyframes  kp4-earr{0%{transform:rotate(0);}10%{transform:rotate(-8deg);}26%{transform:rotate(24deg);}40%{transform:rotate(-10deg);}60%{transform:rotate(24deg);}72%{transform:rotate(-8deg);}86%{transform:rotate(0);}100%{transform:rotate(0);}}`,
  },
  {
    id: "turnabout",
    name: "Turnabout",
    duration: 1100,
    desc: "New: the pig and its coin spin around like a coin on the table (a full turn) with a small hop, then land with a squash.",
    css: `
& .kk-pig{transform-origin:50% 100%}& .kk-earl{transform-origin:78% 88%}& .kk-earr{transform-origin:22% 88%}& .kk-body{transform-origin:50% 100%}& .kk-coin{transform-origin:50% 50%}
& .kk-body{animation:kp5-turn var(--intro-ms) linear both;}& .kk-eyes{animation:kp5-eyes var(--intro-ms) linear both;}
@keyframes  kp5-turn{0%{transform:translateY(0) scale(1,1);animation-timing-function:cubic-bezier(.2,.7,.3,1);}8%{transform:translateY(0) scale(1.08,.92);animation-timing-function:cubic-bezier(.2,.7,.3,1);}22%{transform:translateY(-34px) scale(.5,1.06);animation-timing-function:ease-in-out;}36%{transform:translateY(-44px) scale(.04,1.08);animation-timing-function:ease-in-out;}50%{transform:translateY(-34px) scale(-.5,1.06);animation-timing-function:ease-in-out;}62%{transform:translateY(-14px) scale(-1,1);animation-timing-function:ease-in-out;}72%{transform:translateY(-34px) scale(-.5,1.06);animation-timing-function:ease-in-out;}82%{transform:translateY(-14px) scale(.04,1.06);animation-timing-function:ease-in-out;}90%{transform:translateY(0) scale(1.1,.88);animation-timing-function:ease-in-out;}96%{transform:translateY(0) scale(.98,1.03);animation-timing-function:cubic-bezier(.2,.7,.3,1);}100%{transform:translateY(0) scale(1,1);}}
@keyframes  kp5-eyes{0%{transform:scaleY(1);}86%{transform:scaleY(1);}91%{transform:scaleY(.1);}97%{transform:scaleY(1);}100%{transform:scaleY(1);}}`,
  },
];

/** The pig's coin falls this far into the head in the press animations (wordmark units, before the pig's scale). */
export const PRESS_DROP = 201.48;

/** The style sheet of one launch animation, with every selector under `scope`. */
export function introCss(animation, scope) {
  return compact(`${PART}\n${animation.css}`).replaceAll('&', scope);
}

/** Inline SVG of the animated logo for the app: colours from `--kk-ink`, `--kk-bg`, `--kk-coin`. */
export function introArt(animation, scope) {
  const art = logoMarkup({ ink: 'var(--kk-ink)', bg: 'var(--kk-bg)', coin: 'var(--kk-coin)', animated: true });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true"><style>${introCss(animation, scope)}</style>` +
    `<defs><clipPath id="kk-tile-clip"><rect width="1024" height="1024" rx="${TILE_RADIUS}"/></clipPath></defs>` +
    `<g clip-path="url(#kk-tile-clip)"><rect width="1024" height="1024" fill="var(--kk-bg)"/>${art}</g></svg>`
  );
}

/** One launch (or loader) animation as a self-contained SVG file in the light or dark version (plays when opened). */
export function introSvg(animation, mode) {
  const c = PALETTE[mode];
  const art = logoMarkup({ ...c, animated: true });
  const ms = Math.round(animation.designMs ?? animation.duration);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><title>Koink ${animation.loop ? 'loader' : 'launch'} animation: ${animation.id} (${mode})</title>` +
    `<style>svg{--intro-ms:${ms}ms}${introCss(animation, 'svg')}</style>` +
    `<defs><clipPath id="kk-tile-clip"><rect width="1024" height="1024" rx="${TILE_RADIUS}"/></clipPath></defs>` +
    `<g clip-path="url(#kk-tile-clip)"><rect width="1024" height="1024" fill="${c.bg}"/>${art}</g></svg>`
  );
}

/** The wordmark animation as a file. */
export function wordmarkAnimationSvg(mode) {
  const c = PALETTE[mode];
  const a = WORDMARK_ANIMATION;
  const p = pigParts({ ink: c.ink, bg: c.bg, coin: c.coin, animated: true, ...WORD_LOOK });
  const letter = (d, delay) => `<path class="kk-m kk-l" style="--s:${delay}" d="${d}" fill="${c.ink}"/>`;
  const body =
    letter(WORD.k, '.02') +
    `<g transform="${WORD_PIG}"><g class="kk-m kk-pigw"><g class="kk-m kk-pigall">${p.pig}</g></g>${p.coin}</g>` +
    letter(WORD.i, '.2') + letter(WORD.n, '.26') + letter(WORD.k2, '.32');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${WORDMARK_BOX.x} ${WORDMARK_BOX.y} ${WORDMARK_BOX.width} ${WORDMARK_BOX.height}"><title>Koink wordmark animation (${mode})</title>` +
    `<style>svg{--intro-ms:${a.duration}ms}${introCss(a, 'svg')}</style>${body}</svg>`
  );
}

/** The style sheet of one press animation: every selector starts with `scope`. */
export function pressCss(animation, scope) {
  return compact(`${scope}{--intro-ms:${animation.duration}ms}\n${PART}\n${animation.css}`).replaceAll('&', scope);
}

/** One press animation as a self-playing file: the wordmark with room around it for the coin to fly. */
export function pressSvg(animation, mode) {
  const c = PALETTE[mode];
  const b = WORDMARK_BOX;
  const box = `${b.x - 30} ${b.y - 90} ${b.width + 60} ${b.height + 120}`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}"><title>Koink logo press: ${animation.id} (${mode})</title>` +
    `<style>${pressCss(animation, 'svg')}</style>${wordmarkMarkup({ ink: c.ink, coin: c.coin, animated: true })}</svg>`
  );
}
