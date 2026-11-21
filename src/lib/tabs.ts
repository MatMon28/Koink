import type { ActiveTab } from './types';

/** Every page, left to right. The pill in the header and the page swipe both follow this order. */
const ALL_TABS: ActiveTab[] = ['month', 'transactions', 'budgets', 'stats'];

let hideBudgets = false;

/** The store calls this whenever Settings > Appearance > *Hide the Budgets page* changes. */
export function syncTabs(budgetsHidden: boolean): void {
  hideBudgets = budgetsHidden;
}

/** The pages that can be reached right now, left to right (Budgets drops out when it is hidden). */
export const tabOrder = (): ActiveTab[] => (hideBudgets ? ALL_TABS.filter((tab) => tab !== 'budgets') : ALL_TABS);

/** The page `step` places to the right (+1) or left (-1) of `tab`, or null at either end. */
export function neighbourTab(tab: ActiveTab, step: 1 | -1): ActiveTab | null {
  const order = tabOrder();
  return order[order.indexOf(tab) + step] ?? null;
}
