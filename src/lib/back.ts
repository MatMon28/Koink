import { useEffect, useRef } from 'react';
import { isNativeApp } from './platform';

/*
 * One place decides what Back does (Android button or back swipe, browser Back, iOS edge swipe).
 * Anything that can be dismissed registers a layer while it is open: sheets, the month picker and,
 * in an installed app, "not on the Month page". Back dismisses the top layer.
 *
 *  - Android app: Capacitor reports the button; with no layer left the app goes to the background.
 *    A layer that refuses to close simply stays on the stack.
 *  - Browser / PWA: while at least one layer is open, one extra history entry (the sentinel) sits on
 *    top of the page. Back pops it, which arrives here as `popstate`. With no layer left, Back is the
 *    browser's own again.
 *
 * See docs/gestures.md.
 */
interface Layer {
  dismiss: () => void;
}

const layers: Layer[] = [];
const SENTINEL = 'koinkLayer';

let useHistory = false;
/** The sentinel is the current history entry. */
let armed = false;
/** We called history.back() ourselves and its popstate has not arrived yet. */
let awaitingPop = false;
let scheduled = false;
let started = false;

/**
 * History is brought in line with the layers a moment later, never at once: a sheet that closes
 * while another opens (goal -> move money) leaves the stack at one layer, and nothing has to move.
 */
function schedule(): void {
  if (!useHistory || scheduled) return;
  scheduled = true;
  window.setTimeout(sync, 0);
}

function sync(): void {
  scheduled = false;
  if (awaitingPop) return; // the popstate handler syncs again
  const wanted = layers.length > 0;
  if (wanted && !armed) {
    window.history.pushState({ ...(window.history.state ?? {}), [SENTINEL]: true }, '');
    armed = true;
  } else if (!wanted && armed) {
    awaitingPop = true;
    window.history.back();
  }
}

/** How long a dismissed layer gets to unregister before it counts as "refused to close". */
const SETTLE_MS = 120;

function onPopState(): void {
  armed = false;
  if (awaitingPop) {
    // Our own clean-up after the last layer was closed from the page.
    awaitingPop = false;
    sync();
    return;
  }
  // The user went back: ask what is on top to close. It unregisters itself when it really does.
  // A layer may refuse (the entry sheet asks about unsaved input instead): it then stays on the
  // stack, and the later sync arms Back for it again.
  layers[layers.length - 1]?.dismiss();
  window.setTimeout(sync, SETTLE_MS);
}

/** Registers something Back should dismiss. Returns the function that unregisters it. */
export function pushBackLayer(dismiss: () => void): () => void {
  const layer: Layer = { dismiss };
  layers.push(layer);
  schedule();
  return () => {
    const index = layers.indexOf(layer);
    if (index < 0) return;
    layers.splice(index, 1);
    schedule();
  };
}

/** Asks the top layer to close. False when there was nothing to dismiss. */
export function handleBack(): boolean {
  const layer = layers[layers.length - 1];
  if (!layer) return false;
  layer.dismiss();
  return true;
}

/** Called once from main.tsx, before React renders. */
export function initBackHandling(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  if (isNativeApp()) {
    void import('@capacitor/app').then(({ App }) =>
      App.addListener('backButton', () => {
        // At the root, Back leaves the app in the background instead of destroying it.
        if (!handleBack()) void App.minimizeApp();
      }),
    );
    return;
  }

  useHistory = true;
  // A reload keeps the history state: if the sentinel is still the current entry, step off it.
  armed = !!(window.history.state && window.history.state[SENTINEL]);
  window.addEventListener('popstate', onPopState);
  schedule();
}

/** While `active`, Back calls `onBack` instead of leaving. */
export function useBackLayer(active: boolean, onBack: () => void): void {
  const latest = useRef(onBack);
  useEffect(() => {
    latest.current = onBack;
  });
  useEffect(() => {
    if (!active) return;
    return pushBackLayer(() => latest.current());
  }, [active]);
}
