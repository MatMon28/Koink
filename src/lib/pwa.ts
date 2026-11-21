import { useSyncExternalStore } from 'react';
import { isNativeApp, isStandaloneApp } from './platform';
import { isOpenTarget } from './reminders';
import type { OpenTarget } from './types';

/*
 * Everything the installable web app needs at run time: the offline worker, the install prompt
 * and the launch shortcuts. Nothing here runs inside the Android app. See docs/pwa.md.
 */

/** Registers the offline worker written by the build (production builds only). */
export function registerOfflineWorker(): void {
  if (!import.meta.env.PROD || isNativeApp() || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}offline-worker.js`).catch(() => undefined);
    } catch {
      /* A strictly sandboxed frame (an embedded preview) may not even read navigator.serviceWorker: the app runs without the worker. */
    }
  });
}

/* ---------- Install ---------- */

/**
 * hidden    = inside the Android app
 * available = the browser offered its install dialog (Chromium)
 * ios       = iPhone / iPad: installing is a manual Share > Add to Home Screen
 * manual    = any other browser: installing is in the browser's own menu, if it has it
 * installed = running from the home screen
 */
export type InstallState = 'hidden' | 'available' | 'ios' | 'manual' | 'installed';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
let started = false;
let snapshot: InstallState = 'manual';
const listeners = new Set<() => void>();

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function compute(): InstallState {
  if (isNativeApp()) return 'hidden';
  if (installed || isStandaloneApp()) return 'installed';
  if (deferred) return 'available';
  return isIos() ? 'ios' : 'manual';
}

function update(): void {
  const next = compute();
  if (next === snapshot) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

/**
 * `beforeinstallprompt` fires once and early, often long before Settings is opened, so it is
 * caught at start-up (main.tsx) and kept here. Nothing is stored and nothing is sent anywhere.
 */
export function initInstallPrompt(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // no browser banner: Settings offers the button
    deferred = event as BeforeInstallPromptEvent;
    update();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    update();
  });
  snapshot = compute();
}

/** Shows the browser's install dialog. Resolves to true when the user accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null; // a prompt event can be used once
  update();
  await event.prompt();
  const { outcome } = await event.userChoice;
  if (outcome === 'accepted') installed = true;
  update();
  return outcome === 'accepted';
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, () => snapshot, () => 'manual' as InstallState);
}

/* ---------- Launch shortcuts ---------- */

/**
 * A launch can ask for a screen: the manifest's home-screen shortcuts open `?add=expense` or
 * `?add=income`, and a notification tapped while the app was closed opens `?open=<target>`. The
 * request is read once and removed from the address, so a reload does not repeat it.
 */
export function takeLaunchAction(): OpenTarget | null {
  if (typeof window === 'undefined') return null;
  const url = new URL(window.location.href);
  const params = url.searchParams;
  if (!params.has('add') && !params.has('open') && !params.has('source')) return null;
  const add = params.get('add');
  const open = params.get('open');
  params.delete('add');
  params.delete('open');
  params.delete('source');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  if (add === 'expense' || add === 'income') return add;
  return isOpenTarget(open) ? open : null;
}
