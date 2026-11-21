import { useEffect } from 'react';
import { INTRO_ANIMATIONS, introArt } from '../brand/art.js';

/*
 * Launch animation (plain DOM, no React). `earlyStart.ts` calls `startLaunchIntro()` from main.tsx
 * before the app modules are evaluated, so the animation is the first thing on screen and the app
 * mounts underneath it.
 *
 * Rules: the animation always plays to its last frame (the Koink logo). The overlay leaves only when
 * BOTH the animation has finished (plus a short hold) AND the app has reported that its first
 * screen is painted. A tap skips it. See docs/launch-intro.md.
 */

/** The animations themselves (art, keyframes, lengths) are in src/brand/art.js. `?intro=1..5` picks one. */
export type IntroAnimation = (typeof INTRO_ANIMATIONS)[number];

/** The finished icon stays this long before the overlay fades. */
const HOLD_MS = 120;
/** Fade-out after a full run, and the quicker one after a tap. Mirrored in intro.css. */
const FADE_MS = 200;
const SKIP_FADE_MS = 120;
/** Safety net: the overlay never stays longer than this after the animation, ready or not. */
const MAX_EXTRA_WAIT_MS = 3000;

export const INTRO_LAST_KEY = 'koink_intro_last';

type Phase = 'idle' | 'playing' | 'leaving' | 'done';

let phase: Phase = 'idle';
let overlay: HTMLElement | null = null;
let animationFinished = false;
let appReady = false;
const endListeners = new Set<() => void>();

const query = () => new URLSearchParams(window.location.search);

/** No animation inside the tour phone (`?tour=1`), with `?intro=0`, or when the device asks for reduced motion. */
export function shouldShowIntro(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  const q = query();
  if (q.get('intro') === '0' || q.get('tour') === '1') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The very first launch plays the signature animation (the coin goes in and the pig oinks). After
 * that: random, but never the animation of the previous launch, so it changes every time.
 * `?intro=1` to `?intro=5` forces one (for review).
 */
export function pickIntroAnimation(): IntroAnimation {
  const forced = Number(query().get('intro'));
  if (Number.isInteger(forced) && forced >= 1 && forced <= INTRO_ANIMATIONS.length) return INTRO_ANIMATIONS[forced - 1];
  let last = -1;
  let first = false;
  try {
    const stored = window.localStorage.getItem(INTRO_LAST_KEY);
    if (stored === null) first = true;
    else if (Number.isInteger(Number(stored))) last = Number(stored);
  } catch {
    /* storage unavailable: a plain random pick is fine */
  }
  const choices = INTRO_ANIMATIONS.map((_, index) => index).filter((index) => index !== last);
  const next = first ? 0 : choices[Math.floor(Math.random() * choices.length)];
  try {
    window.localStorage.setItem(INTRO_LAST_KEY, String(next));
  } catch {
    /* ignore */
  }
  return INTRO_ANIMATIONS[next];
}

function finish(): void {
  phase = 'done';
  overlay?.remove();
  overlay = null;
  endListeners.forEach((listener) => listener());
  endListeners.clear();
}

function leave(skipped: boolean): void {
  if (phase !== 'playing' || !overlay) return;
  phase = 'leaving';
  overlay.setAttribute('data-leaving', 'true');
  overlay.setAttribute('data-fast', String(skipped));
  window.setTimeout(finish, skipped ? SKIP_FADE_MS : FADE_MS);
}

function maybeLeave(): void {
  if (animationFinished && appReady) leave(false);
}

/**
 * Paints the launch animation now. Only the first call does anything. Returns false when it is
 * not shown.
 */
export function startLaunchIntro(): boolean {
  if (phase !== 'idle') return phase === 'playing' || phase === 'leaving';
  if (!shouldShowIntro()) {
    phase = 'done';
    return false;
  }

  const animation = pickIntroAnimation();
  phase = 'playing';
  overlay = document.createElement('div');
  overlay.className = 'kc-intro';
  overlay.setAttribute('data-intro', animation.id);
  overlay.setAttribute('data-leaving', 'false');
  overlay.setAttribute('data-fast', 'false');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.setProperty('--intro-ms', `${animation.duration}ms`);
  // The art brings its own keyframes, scoped to the overlay so no other copy of the logo moves.
  overlay.innerHTML = `<div class="kc-intro__art">${introArt(animation, '.kc-intro')}</div>`;
  // Tap to skip: the app is mounting underneath anyway.
  overlay.addEventListener('pointerdown', () => leave(true));
  document.body.appendChild(overlay);

  // The CSS animations start with the first painted frame, so the clock for "finished" starts there.
  requestAnimationFrame(() => {
    window.setTimeout(() => {
      animationFinished = true;
      maybeLeave();
    }, animation.duration + HOLD_MS);
  });
  // Hidden tabs pause requestAnimationFrame; this timer still ends the intro.
  window.setTimeout(() => leave(false), animation.duration + HOLD_MS + MAX_EXTRA_WAIT_MS);
  return true;
}

/** The app calls this once its first screen is committed, its fonts are loaded and frames are painted. */
export function markAppReady(): void {
  appReady = true;
  maybeLeave();
}

/** Runs `listener` once the overlay is gone (at once when it already is, or never showed). */
export function onLaunchIntroEnd(listener: () => void): () => void {
  if (phase === 'done' || phase === 'idle') {
    listener();
    return () => undefined;
  }
  endListeners.add(listener);
  return () => {
    endListeners.delete(listener);
  };
}

/**
 * Resolves right after the browser has painted a frame, so the animation's first frame is on
 * screen before the heavy first React render starts. Falls back to a timer in hidden tabs.
 */
export function afterFirstPaint(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      resolve();
    };
    requestAnimationFrame(() => window.setTimeout(go, 0));
    window.setTimeout(go, 150);
  });
}

/**
 * Reports "loading has finished" to the launch animation: the first screen is committed and laid
 * out, the fonts it asked for are loaded, and two frames have been painted with them.
 */
export function useReportAppReady(): void {
  useEffect(() => {
    let alive = true;
    let frame = 0;
    const finishUp = () => {
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (alive) markAppReady();
        });
      });
    };
    // One frame first: layout is what starts the font downloads that document.fonts.ready waits for.
    frame = requestAnimationFrame(() => {
      const fonts = document.fonts?.ready;
      if (fonts) void fonts.then(finishUp, finishUp);
      else finishUp();
    });
    // Timers keep running in a hidden tab, where frames do not.
    const fallback = window.setTimeout(markAppReady, 1500);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  }, []);
}
