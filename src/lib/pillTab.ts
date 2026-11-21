import { useSyncExternalStore } from 'react';
import type { ActiveTab } from './types';

/**
 * The page the header pill should already show. A committed page swipe takes about 170 ms to finish
 * its travel and only then changes the real active page (`setActiveTab`); the pill used to wait for
 * that, so its colour moved late. `PageSwiper` sets this the moment the swipe is committed and clears
 * it when the page has changed (or the swipe was cancelled); `Tabs` shows `pillTab ?? activeTab`.
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
