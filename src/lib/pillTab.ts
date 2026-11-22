import { useSyncExternalStore } from 'react';
import type { ActiveTab } from './types';

/*
 * Two things the page rail tells the rest of the app while pages are changing. Both are written by
 * `PageSwiper` only.
 *
 * 1. The COMMITTED page (`setPillTab` / `usePillTab`). The page a committed swipe is travelling to,
 *    known the moment the finger lets go (before the page has landed). `App` uses it to bring the
 *    bottom dock in or out at once. `null` = nothing is committed: the active page is the page.
 *
 * 2. The PILL POSITION (`setPillPos` / `getPillPos` / `subscribePillPos`). A continuous number in
 *    the page order: 0 = first page, 1.5 = half way between the second and the third page. While a
 *    finger drags the rail, while a committed swipe travels and while a cancelled one springs back,
 *    `PageSwiper` publishes it every frame, so the header pill (`Tabs.tsx`) moves and changes colour
 *    exactly with the pages. `null` = the rail is at rest, the pill follows the active page (and
 *    animates there on its own when the page was changed by tapping the pill).
 *
 *    It is a plain subscription, not a React hook: the pill is updated imperatively at 60 fps and
 *    must not re-render the header for every frame.
 */
let pending: ActiveTab | null = null;
const listeners = new Set<() => void>();

export function setPillTab(tab: ActiveTab | null): void {
  if (pending === tab) return;
  pending = tab;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const usePillTab = (): ActiveTab | null => useSyncExternalStore(subscribe, () => pending, () => null);

let position: number | null = null;
const positionListeners = new Set<() => void>();

/** Publishes where the rail is, in page-order units (`null`: at rest). */
export function setPillPos(pos: number | null): void {
  if (position === pos) return;
  position = pos;
  positionListeners.forEach((listener) => listener());
}

export const getPillPos = (): number | null => position;

export function subscribePillPos(listener: () => void): () => void {
  positionListeners.add(listener);
  return () => positionListeners.delete(listener);
}
