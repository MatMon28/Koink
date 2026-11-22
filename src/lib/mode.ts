import type { Mode } from './types';

/**
 * Basic mode, readable from the plain functions in lib/ (the same trick as `syncCategories` and `syncTabs`).
 * The store calls `syncMode()` while it renders; components read `basic` from `useApp()`.
 */
let basicNow = false;

export function syncMode(basic: boolean): void {
  basicNow = basic;
}

export const isBasic = (): boolean => basicNow;

export const normalizeMode = (value: unknown): Mode => (value === 'basic' ? 'basic' : 'full');

/**
 * The guided tour (`?tour=1`) embeds a live copy of the journal that has to show every page and sheet, so it
 * always runs in Full mode, whatever the journal says, and never shows the mode chooser.
 */
export function inTourEmbed(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('tour') === '1';
  } catch {
    return false;
  }
}
