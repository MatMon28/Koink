import type { ActiveTab } from './types';

/** The pages, left to right. The pill in the header and the page swipe both follow this order. */
export const TAB_ORDER: ActiveTab[] = ['month', 'transactions', 'budgets', 'stats'];

/** The page `step` places to the right (+1) or left (-1) of `tab`, or null at either end. */
export function neighbourTab(tab: ActiveTab, step: 1 | -1): ActiveTab | null {
  return TAB_ORDER[TAB_ORDER.indexOf(tab) + step] ?? null;
}
