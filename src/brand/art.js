/*
 * Koink brand artwork: the single source for the icon, the wordmark and the launch animations.
 *
 * Plain JavaScript on purpose: the app imports it (Brand.tsx, lib/intro.ts) and so do the Node
 * scripts that write the static files (scripts/render-brand.mjs). Nothing here touches the DOM.
 *
 * All geometry is in the coordinate space of the 1024 x 1024 icon and was measured from the
 * reference artwork (docs/brand.md). Change a number here, run `npm run brand`, and every copy
 * of the logo follows.
 */

/** The two versions of every asset. `bg` is the tile / page colour the version is meant for. */
export const PALETTE = {
  light: { bg: '#F9F3E6', ink: '#0B0F1E', coin: '#F59F00' },
  dark: { bg: '#070A14', ink: '#F9F3E6', coin: '#FFC53D' },
};

export const ICON_SIZE = 1024;
/** Corner radius of the icon's tile. */
export const TILE_RADIUS = 240;
/** Bounding box of the logo inside the icon canvas (K + pig, the coin lies inside it). */
export const LOGO_BOX = { x: 246.5, y: 224.5, width: 579, height: 567.6 };

const n = (value) => String(Math.round(value * 100) / 100);

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

/* ---------- The K ---------- */

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

/* ---------- The pig and its coin ---------- */

const AX = 682.6; // the pig's axis of symmetry
const HEAD = { cx: AX, cy: 646, r: 129.7, stroke: 26 };
const EAR_LEFT = [[569, 583.4], [577.3, 459.7], [635.6, 525.1]];
const EAR_RIGHT = EAR_LEFT.map(([x, y]) => [2 * AX - x, y]);
const EYE = { dx: 48.6, cy: 622, r: 16 };
const SNOUT = { cx: AX, cy: 694.6, rx: 56.75, ry: 40.5, stroke: 22.6 };
const NOSTRIL = { dx: 22.75, r: 10.3 };
const COIN = { cx: AX, cy: 447, r: 39, stroke: 24 };
/** Clear space kept around the pig where it sits on the K (stroke width of the halo shapes). */
const HALO_STROKE = 81;

const line = (points) => `M${points.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}`;

/**
 * The logo as SVG groups in icon coordinates, back to front: K, halo, coin, pig. The halo is the
 * pig's outline drawn wide in the background colour: it clears the K around the pig, and the coin
 * sits between halo and pig so that a coin moving down disappears into the head.
 *
 * `ink`, `bg` and `coin` are any CSS colours (also `var(...)`). With `animated`, every part
 * carries a `kk-*` class for the launch animations and the head outline can be drawn on.
 * `thicken` scales the pig's line weights; `closedEars` draws the ears as closed triangles.
 */
export function logoMarkup({ ink, bg, coin, animated = false, thicken = 1, closedEars = false }) {
  const cls = (name) => (animated ? ` class="${name}"` : '');
  const stroke = HEAD.stroke * thicken;
  // Heavier lines would close the gap between the coin and the head: the coin moves up to keep it.
  const coinY = COIN.cy - Math.max(0, thicken - 1) * (COIN.stroke + HEAD.stroke) / 2;
  const ear = (points) => line(points) + (closedEars ? 'Z' : '');
  const face =
    `<g${cls('kk-eyes')} fill="${ink}" stroke="none">` +
    `<circle${cls('kk-eye-l')} cx="${n(AX - EYE.dx)}" cy="${EYE.cy}" r="${n(EYE.r * thicken)}"/>` +
    `<circle${cls('kk-eye-r')} cx="${n(AX + EYE.dx)}" cy="${EYE.cy}" r="${n(EYE.r * thicken)}"/></g>` +
    `<g${cls('kk-snout')}><ellipse cx="${SNOUT.cx}" cy="${SNOUT.cy}" rx="${SNOUT.rx}" ry="${SNOUT.ry}" stroke-width="${n(SNOUT.stroke * thicken)}"/>` +
    `<g fill="${ink}" stroke="none"><circle cx="${n(AX - NOSTRIL.dx)}" cy="${SNOUT.cy}" r="${n(NOSTRIL.r * thicken)}"/><circle cx="${n(AX + NOSTRIL.dx)}" cy="${SNOUT.cy}" r="${n(NOSTRIL.r * thicken)}"/></g></g>`;
  return (
    `<g${cls('kk-k')} fill="${ink}"><rect${cls('kk-stem')} x="${STEM.x}" y="${STEM.y}" width="${STEM.width}" height="${n(STEM.height)}" rx="${STEM.r}"/>` +
    `<path${cls('kk-arm')} d="${ARM}"/><path${cls('kk-leg')} d="${LEG}"/></g>` +
    (bg === 'none' ? '' :
      `<g${cls('kk-halo')} fill="${bg}" stroke="${bg}" stroke-width="${HALO_STROKE}" stroke-linejoin="round" stroke-linecap="round">` +
      `<path d="${line(EAR_LEFT)}"/><path d="${line(EAR_RIGHT)}"/><circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}"/></g>`) +
    `<g${cls('kk-coin-a')}><g${cls('kk-coin-b')}><circle cx="${COIN.cx}" cy="${n(coinY)}" r="${COIN.r}" fill="none" stroke="${coin}" stroke-width="${n(COIN.stroke * thicken)}"/></g></g>` +
    `<g${cls('kk-pig')} fill="${bg}" stroke="${ink}" stroke-width="${n(stroke)}" stroke-linejoin="round" stroke-linecap="round">` +
    `<path${cls('kk-ear-l')} d="${ear(EAR_LEFT)}"/><path${cls('kk-ear-r')} d="${ear(EAR_RIGHT)}"/>` +
    (animated ? `<circle class="kk-head-fill" cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}" stroke="none"/>` : '') +
    `<circle${cls('kk-head')} cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}"${animated ? ' fill="none" pathLength="100"' : ''}/>` +
    `<g${cls('kk-face')}>${face}</g></g>`
  );
}

/** The app icon: a tile in the version's background colour with the logo on it. */
export function iconSvg(mode, { tile = 'rounded', scale = 1, colors } = {}) {
  const c = colors ?? PALETTE[mode];
  const plate =
    tile === 'square' ? `<rect width="1024" height="1024" fill="${c.bg}"/>`
    : tile === 'circle' ? `<circle cx="512" cy="512" r="512" fill="${c.bg}"/>`
    : tile === 'rounded' ? `<rect width="1024" height="1024" rx="${TILE_RADIUS}" fill="${c.bg}"/>`
    : '';
  const centre = { x: LOGO_BOX.x + LOGO_BOX.width / 2, y: LOGO_BOX.y + LOGO_BOX.height / 2 };
  // At scale 1 the logo keeps the place it has in the reference tile; scaled, it is centred.
  const place = scale === 1 ? '' : ` transform="translate(512 512) scale(${scale}) translate(${n(-centre.x)} ${n(-centre.y)})"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${plate}<g${place}>${logoMarkup(c)}</g></svg>`;
}

/**
 * The logo as one colour on a transparent background, for places that only use the alpha channel
 * (Android notification icon, themed launcher icon). The K is really cut away around the pig
 * (a mask), because there is no background colour to paint the halo with. `thicken` makes the
 * pig's lines heavier so they survive at 24 dp.
 */
export function monoLogoSvg({ color = '#FFFFFF', scale = 1, thicken = 1, canvas = 1024 } = {}) {
  const centre = { x: LOGO_BOX.x + LOGO_BOX.width / 2, y: LOGO_BOX.y + LOGO_BOX.height / 2 };
  const halo = HALO_STROKE + (thicken - 1) * HEAD.stroke;
  const cut =
    `<mask id="kk-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024"><rect width="1024" height="1024" fill="#fff"/>` +
    `<g fill="#000" stroke="#000" stroke-width="${n(halo)}" stroke-linejoin="round" stroke-linecap="round"><path d="${line(EAR_LEFT)}"/><path d="${line(EAR_RIGHT)}"/><circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}"/></g></mask>`;
  const art = logoMarkup({ ink: color, bg: 'none', coin: color, thicken });
  // logoMarkup starts with the K group: that group alone gets the mask.
  const masked = art.replace('<g fill=', '<g mask="url(#kk-cut)" fill=');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas} ${canvas}"><defs>${cut}</defs>` +
    `<g transform="translate(${canvas / 2} ${canvas / 2}) scale(${scale}) translate(${n(-centre.x)} ${n(-centre.y)})">${masked}</g></svg>`
  );
}

/* ---------- Wordmark ---------- */

/** "ink": outlines of Nunito ExtraBold (SIL Open Font License), so no font is needed to draw it. */
const INK_LETTERS = 'M290 180.9Q284.1 180.9 280.9 177.4Q277.8 174 277.8 167.7L277.8 112.8Q277.8 106.4 280.9 103Q284.1 99.5 290 99.5Q295.8 99.5 298.9 103Q302 106.4 302 112.8L302 167.7Q302 174 299 177.4Q295.9 180.9 290 180.9M290 86.3Q283.3 86.3 279.7 83.2Q276 80.1 276 74.3Q276 68.4 279.7 65.2Q283.3 62.1 290 62.1Q296.7 62.1 300.3 65.2Q303.8 68.4 303.8 74.3Q303.8 80.1 300.3 83.2Q296.7 86.3 290 86.3M333 181Q327.1 181 324 177.8Q320.8 174.6 320.8 168.7L320.8 111.7Q320.8 105.8 324 102.6Q327.1 99.5 332.7 99.5Q338.5 99.5 341.5 102.6Q344.6 105.8 344.6 111.7L344.6 112.4Q348.1 106.7 353.9 103.4Q361.1 99.2 370.4 99.2Q379.9 99.2 386 102.8Q392.1 106.4 395.1 113.7Q398.2 121 398.2 132.3L398.2 168.7Q398.2 174.6 395.1 177.8Q391.9 181 386 181Q380.2 181 377.1 177.8Q373.9 174.6 373.9 168.7L373.9 133.4Q373.9 125.2 371 121.6Q368 118 361.9 118Q354.2 118 349.6 122.8Q345.1 127.6 345.1 135.6L345.1 168.7Q345.1 181 333 181M428.5 181Q422.6 181 419.5 177.8Q416.3 174.6 416.3 168.7L416.3 77.4Q416.3 71.3 419.5 68.1Q422.6 65 428.5 65Q434.3 65 437.4 68.1Q440.6 71.3 440.6 77.4L440.6 133.4L440.9 133.4L464.1 107.5Q467.7 103.5 470.6 101.5Q473.6 99.5 478.6 99.5Q483.6 99.5 486.2 102.1Q488.9 104.6 488.9 108.3Q489 111.9 485.8 115.6L465.3 138.5L488.5 165.3Q491.6 169 491.2 172.7Q490.8 176.4 487.9 178.7Q485 181 480.5 181Q475.1 181 471.8 179Q468.5 176.9 465.1 172.5L440.9 145.6L440.6 145.6L440.6 168.7Q440.6 181 428.5 181';

/** View box of the wordmark: K, the pig as the "o" with its coin above, then "ink". */
export const WORDMARK_BOX = { x: 51, y: 40, width: 448, height: 150 };

/**
 * The wordmark's shapes. Nothing overlaps, so it has no background parts and works on any colour.
 * As in the reference wordmark, its pig has slightly lighter lines than the icon's and ears drawn
 * as closed triangles (their base shows inside the head). With `animated` the parts carry the `kk-*`
 * classes, which is how the header logo plays its click animation (index.css, `.is-oinking`).
 */
export function wordmarkMarkup({ ink, coin, animated = false }) {
  const k = `<g transform="translate(8.94 19.44) scale(0.20374)" fill="${ink}"><rect x="${STEM.x}" y="${STEM.y}" width="${STEM.width}" height="${n(STEM.height)}" rx="${STEM.r}"/><path d="${ARM}"/><path d="${LEG}"/></g>`;
  const pig = logoMarkup({ ink, bg: 'none', coin, animated, thicken: 0.885, closedEars: true }).replace(/^<g[^>]*>.*?<\/g>/, ''); // without its K
  return `${k}<g transform="translate(-23.24 -89.45) scale(0.3462)">${pig}</g><path fill="${ink}" d="${INK_LETTERS}"/>`;
}

export function wordmarkSvg(mode, { background = false } = {}) {
  const c = PALETTE[mode];
  const b = WORDMARK_BOX;
  const plate = background ? `<rect x="${b.x - 30}" y="${b.y - 30}" width="${b.width + 60}" height="${b.height + 60}" fill="${c.bg}"/>` : '';
  const box = background ? `${b.x - 30} ${b.y - 30} ${b.width + 60} ${b.height + 60}` : `${b.x} ${b.y} ${b.width} ${b.height}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}">${plate}${wordmarkMarkup(c)}</svg>`;
}

/* ---------- Launch animations ---------- */

const RUN = 'var(--intro-ms) linear both';
// Easing shorthands used in the keyframes below.
const SOFT = 'cubic-bezier(.22,1,.36,1)';
const BOUNCE = 'cubic-bezier(.3,1.5,.5,1)';
const FALL = 'cubic-bezier(.55,0,.9,.5)';
const SINE_IN = 'cubic-bezier(.12,0,.39,0)';
const SINE_OUT = 'cubic-bezier(.61,1,.88,1)';
const tf = (curve) => `animation-timing-function:${curve};`;

/** Where each part turns and scales from, in icon coordinates. `&` is replaced by the scope. */
const ORIGINS = `
& .kk-logo{transform-origin:535px 508px}
& .kk-k{transform-origin:470px 508px}
& .kk-stem{transform-origin:307px ${TOP}px}
& .kk-arm,& .kk-leg{transform-origin:372px 510px}
& .kk-halo,& .kk-pig,& .kk-head-fill,& .kk-head{transform-origin:${AX}px ${HEAD.cy}px}
& .kk-ear-l{transform-origin:602px 554px}
& .kk-ear-r{transform-origin:${n(2 * AX - 602)}px 554px}
& .kk-eyes{transform-origin:${AX}px ${EYE.cy}px}
& .kk-eye-l{transform-origin:${n(AX - EYE.dx)}px ${EYE.cy}px}
& .kk-eye-r{transform-origin:${n(AX + EYE.dx)}px ${EYE.cy}px}
& .kk-snout,& .kk-face{transform-origin:${AX}px ${SNOUT.cy}px}
& .kk-coin-a,& .kk-coin-b{transform-origin:${AX}px ${COIN.cy}px}`;

/** The pig stands on this point when it squashes and jumps. */
const FEET = `transform-origin:${AX}px 789px;`;

const earFlick = (name, sign, steps) =>
  `@keyframes ${name}{${steps.map(([at, deg]) => `${at}{transform:rotate(${sign * deg}deg)}`).join('')}}`;

/**
 * Every animation ends on the untouched logo. `duration` is written once, here: the CSS reads it
 * as `--intro-ms`. The first one is the signature animation and plays on the very first launch.
 */
export const INTRO_ANIMATIONS = [
  {
    // The coin hops, turns once, drops into the pig, the pig oinks, and the next coin is ready.
    id: 'coin-oink',
    duration: 1250,
    css: `
& .kk-logo{animation:k1-in ${RUN}}
& .kk-coin-a{animation:k1-coin ${RUN}}
& .kk-coin-b{animation:k1-turn ${RUN}}
& .kk-halo,& .kk-pig{${FEET}animation:k1-oink ${RUN}}
& .kk-snout{animation:k1-snout ${RUN}}
& .kk-eyes{animation:k1-eyes ${RUN}}
& .kk-ear-l{animation:k1-ear-l ${RUN}}
& .kk-ear-r{animation:k1-ear-r ${RUN}}
@keyframes k1-in{0%{opacity:0;transform:scale(.84);${tf(SOFT)}}10%{opacity:1}18%,100%{opacity:1;transform:scale(1)}}
@keyframes k1-coin{0%,18%{opacity:1;transform:translateY(0) scale(1);${tf('cubic-bezier(.2,.7,.3,1)')}}30%{transform:translateY(-150px) scale(1);${tf('ease-in-out')}}38%{transform:translateY(-164px) scale(1);${tf('ease-in-out')}}46%{transform:translateY(-150px) scale(1);${tf(FALL)}}56%{opacity:1;transform:translateY(200px) scale(1)}57%{opacity:0;transform:translateY(200px) scale(1)}58%,80%{opacity:0;transform:translateY(0) scale(.2);${tf(BOUNCE)}}84%{opacity:1}92%,100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes k1-turn{0%,22%{transform:scaleX(1);${tf(SINE_IN)}}28%{transform:scaleX(0);${tf(SINE_OUT)}}34%{transform:scaleX(-1);${tf(SINE_IN)}}40%{transform:scaleX(0);${tf(SINE_OUT)}}46%,100%{transform:scaleX(1)}}
@keyframes k1-oink{0%,55%{transform:translateY(0) scale(1,1);${tf('ease-out')}}61%{transform:translateY(0) scale(1.06,.93);${tf('cubic-bezier(.3,0,.3,1)')}}69%{transform:translateY(-30px) scale(.96,1.05);${tf('cubic-bezier(.5,0,.7,.6)')}}77%{transform:translateY(0) scale(1.03,.97);${tf('ease-out')}}85%,100%{transform:translateY(0) scale(1,1)}}
@keyframes k1-snout{0%,60%{transform:scale(1);${tf(BOUNCE)}}68%{transform:scale(1.3);${tf('ease-in-out')}}75%{transform:scale(.93)}82%,100%{transform:scale(1)}}
@keyframes k1-eyes{0%,56%{transform:scaleY(1)}60%,70%{transform:scaleY(.12)}76%,100%{transform:scaleY(1)}}
${earFlick('k1-ear-l', -1, [['0%,58%', 0], ['66%', 17], ['74%', -7], ['82%,100%', 0]])}
${earFlick('k1-ear-r', 1, [['0%,58%', 0], ['66%', 17], ['74%', -7], ['82%,100%', 0]])}`,
  },
  {
    // The K is laid down stroke by stroke, the pig's head is drawn round, the coin drops on.
    id: 'sketch',
    duration: 1000,
    css: `
& .kk-stem{animation:k2-stem ${RUN}}
& .kk-arm{animation:k2-arm ${RUN}}
& .kk-leg{animation:k2-leg ${RUN}}
& .kk-halo,& .kk-head-fill{animation:k2-clear ${RUN}}
& .kk-head{stroke-dasharray:100 100;animation:k2-ring ${RUN}}
& .kk-ear-l{animation:k2-ear-l ${RUN}}
& .kk-ear-r{animation:k2-ear-r ${RUN}}
& .kk-eyes{animation:k2-eyes ${RUN}}
& .kk-snout{animation:k2-snout ${RUN}}
& .kk-coin-a{animation:k2-coin ${RUN}}
@keyframes k2-stem{0%{transform:scaleY(0);${tf(SOFT)}}20%,100%{transform:scaleY(1)}}
@keyframes k2-arm{0%,12%{transform:scale(0);${tf('cubic-bezier(.3,1.25,.5,1)')}}34%,100%{transform:scale(1)}}
@keyframes k2-leg{0%,22%{transform:scale(0);${tf('cubic-bezier(.3,1.25,.5,1)')}}44%,100%{transform:scale(1)}}
@keyframes k2-clear{0%,38%{transform:scale(0);${tf(SOFT)}}52%,100%{transform:scale(1)}}
@keyframes k2-ring{0%,38%{stroke-dashoffset:100;transform:rotate(-90deg);${tf('cubic-bezier(.4,0,.2,1)')}}64%,100%{stroke-dashoffset:0;transform:rotate(-90deg)}}
@keyframes k2-ear-l{0%,54%{transform:scale(0);${tf(BOUNCE)}}68%,100%{transform:scale(1)}}
@keyframes k2-ear-r{0%,58%{transform:scale(0);${tf(BOUNCE)}}72%,100%{transform:scale(1)}}
@keyframes k2-eyes{0%,60%{opacity:0;transform:scale(.3);${tf(BOUNCE)}}63%{opacity:1}73%,100%{opacity:1;transform:scale(1)}}
@keyframes k2-snout{0%,64%{opacity:0;transform:scale(.3);${tf(BOUNCE)}}67%{opacity:1}78%,100%{opacity:1;transform:scale(1)}}
@keyframes k2-coin{0%,70%{opacity:0;transform:translateY(-340px)}73%{opacity:1;transform:translateY(-340px);${tf(FALL)}}87%{transform:translateY(0);${tf('cubic-bezier(.2,.7,.4,1)')}}92%{transform:translateY(-24px);${tf('cubic-bezier(.5,0,.8,.5)')}}97%,100%{opacity:1;transform:translateY(0)}}`,
  },
  {
    // The pig rolls in from the right, bumps the K, and the coin lands on its head.
    id: 'roll-in',
    duration: 1050,
    css: `
& .kk-k{transform-origin:400px 792px;animation:k3-k ${RUN}}
& .kk-halo,& .kk-pig{animation:k3-roll ${RUN}}
& .kk-coin-a{animation:k3-coin ${RUN}}
@keyframes k3-k{0%{opacity:0;transform:translateX(-50px) rotate(0deg);${tf(SOFT)}}16%{opacity:1;transform:translateX(0) rotate(0deg)}57%{transform:translateX(0) rotate(0deg);${tf('ease-out')}}64%{transform:translateX(-14px) rotate(-2deg);${tf('ease-in-out')}}78%,100%{opacity:1;transform:translateX(0) rotate(0deg)}}
@keyframes k3-roll{0%{opacity:0;transform:translateX(640px) rotate(257deg);${tf('cubic-bezier(.3,.45,.35,1)')}}8%{opacity:1}58%{transform:translateX(-12px) rotate(-5deg);${tf('ease-in-out')}}68%{transform:translateX(5px) rotate(2deg);${tf('ease-in-out')}}78%,100%{opacity:1;transform:translateX(0) rotate(0deg)}}
@keyframes k3-coin{0%,66%{opacity:0;transform:translateY(-320px)}69%{opacity:1;transform:translateY(-320px);${tf(FALL)}}84%{transform:translateY(0);${tf('cubic-bezier(.2,.7,.4,1)')}}89%{transform:translateY(-22px);${tf('cubic-bezier(.5,0,.8,.5)')}}95%,100%{opacity:1;transform:translateY(0)}}`,
  },
  {
    // The K lands like a pressed key, the pig pops up, and the coin is tossed over in an arc.
    id: 'pop-toss',
    duration: 980,
    css: `
& .kk-k{animation:k4-k ${RUN}}
& .kk-halo,& .kk-pig{${FEET}animation:k4-pig ${RUN}}
& .kk-ear-l{animation:k4-ear-l ${RUN}}
& .kk-ear-r{animation:k4-ear-r ${RUN}}
& .kk-coin-a{animation:k4-coin-x ${RUN}}
& .kk-coin-b{animation:k4-coin-y ${RUN}}
@keyframes k4-k{0%{opacity:0;transform:scale(1.28);${tf('cubic-bezier(.5,0,.8,.4)')}}14%{opacity:1;transform:scale(.95);${tf(BOUNCE)}}30%,100%{opacity:1;transform:scale(1)}}
@keyframes k4-pig{0%,18%{opacity:0;transform:translateY(120px) scale(.2,.2)}20%{opacity:1;transform:translateY(120px) scale(.2,.2);${tf('cubic-bezier(.2,.8,.3,1)')}}40%{transform:translateY(-34px) scale(1.03,1.07);${tf('cubic-bezier(.5,0,.8,.5)')}}50%{transform:translateY(0) scale(1.05,.95);${tf('ease-out')}}60%,100%{opacity:1;transform:translateY(0) scale(1,1)}}
${earFlick('k4-ear-l', -1, [['0%,48%', 0], ['56%', 14], ['64%', -8], ['72%', 4], ['80%,100%', 0]])}
${earFlick('k4-ear-r', 1, [['0%,48%', 0], ['56%', 14], ['64%', -8], ['72%', 4], ['80%,100%', 0]])}
@keyframes k4-coin-x{0%,52%{opacity:0;transform:translateX(300px)}55%{opacity:1;transform:translateX(300px)}82%,100%{opacity:1;transform:translateX(0)}}
@keyframes k4-coin-y{0%,55%{transform:translateY(60px);${tf('cubic-bezier(.2,.6,.4,1)')}}68%{transform:translateY(-210px);${tf('cubic-bezier(.6,0,.8,.4)')}}82%{transform:translateY(0);${tf('cubic-bezier(.2,.7,.4,1)')}}88%{transform:translateY(-20px);${tf('cubic-bezier(.5,0,.8,.5)')}}94%,100%{transform:translateY(0)}}`,
  },
  {
    // The calm one: the logo settles in, the coin hops, the pig winks.
    id: 'hop-wink',
    duration: 820,
    css: `
& .kk-logo{animation:k5-in ${RUN}}
& .kk-coin-a{animation:k5-coin ${RUN}}
& .kk-eye-r{animation:k5-wink ${RUN}}
& .kk-halo,& .kk-pig{${FEET}animation:k5-nod ${RUN}}
@keyframes k5-in{0%{opacity:0;transform:scale(.9);${tf(SOFT)}}14%{opacity:1}26%,100%{opacity:1;transform:scale(1)}}
@keyframes k5-coin{0%,30%{transform:translateY(0);${tf('cubic-bezier(.2,.7,.3,1)')}}46%{transform:translateY(-88px);${tf('cubic-bezier(.6,0,.8,.4)')}}60%{transform:translateY(0);${tf('ease-out')}}68%{transform:translateY(-16px);${tf('ease-in')}}76%,100%{transform:translateY(0)}}
@keyframes k5-nod{0%,59%{transform:scale(1,1);${tf('ease-out')}}66%{transform:scale(1.035,.955);${tf('ease-in-out')}}80%,100%{transform:scale(1,1)}}
@keyframes k5-wink{0%,62%{transform:scaleY(1)}68%,80%{transform:scaleY(.1)}88%,100%{transform:scaleY(1)}}`,
  },
];

/** View box of the animated art: the logo centred, with room around it for parts that fly in. */
export const INTRO_BOX = { x: 156, y: 128, size: 760 };

/** The style sheet of one animation, with every selector under `scope`. */
export function introCss(animation, scope) {
  return (ORIGINS + animation.css).replaceAll('&', scope).replace(/\n/g, '');
}

/**
 * The animated art for the app: an inline SVG whose colours come from CSS variables
 * (`--kk-ink`, `--kk-bg`, `--kk-coin`) and whose rules only apply inside `scope`.
 */
export function introArt(animation, scope) {
  const art = logoMarkup({ ink: 'var(--kk-ink)', bg: 'var(--kk-bg)', coin: 'var(--kk-coin)', animated: true });
  const b = INTRO_BOX;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${b.x} ${b.y} ${b.size} ${b.size}" aria-hidden="true"><style>${introCss(animation, scope)}</style><g class="kk-logo">${art}</g></svg>`;
}

/** One animation as a self-contained SVG file in the light or dark version (plays when opened). */
export function introSvg(animation, mode) {
  const c = PALETTE[mode];
  const art = logoMarkup({ ...c, animated: true });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><title>Koink launch animation: ${animation.id} (${mode})</title>` +
    `<style>svg{--intro-ms:${animation.duration}ms}${introCss(animation, 'svg')}</style>` +
    `<rect width="1024" height="1024" fill="${c.bg}"/><g class="kk-logo">${art}</g></svg>`
  );
}
