export interface DockTarget {
  /** The element that gets a small "swallowed" pulse. */
  pulse: HTMLElement;
  x: number;
  y: number;
  width: number;
}

/**
 * Where a closing sheet is sucked into: the dock button that opened it when it exists, otherwise
 * `null` (the sheet then simply drops away).
 */
export function getDockTarget(id?: string): DockTarget | null {
  if (!id) return null;
  const button = document.querySelector<HTMLElement>(`[data-dock] [data-dock-action="${id}"]`);
  if (!button) return null;
  const r = button.getBoundingClientRect();
  if (!r.width) return null;
  return { pulse: button, x: r.left + r.width / 2, y: r.top + r.height / 2, width: r.width };
}

/**
 * The middle of the whole button bar: where the Profile and Settings sheets (which no dock button
 * opens) are sucked into when they close. The bar itself gets the small pulse. `null` when the bar
 * is not on screen (the sheet then drops away).
 */
export function getDockCenterTarget(): DockTarget | null {
  const bar = document.querySelector<HTMLElement>('[data-dock]');
  if (!bar) return null;
  const r = bar.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  // The bar is pinned to the bottom, but may be scrolled sideways or partly off screen on a tiny phone.
  const left = Math.max(r.left, 0);
  const right = Math.min(r.right, window.innerWidth);
  return { pulse: bar, x: (left + right) / 2, y: r.top + r.height / 2, width: 52 }; // the sheet shrinks to about one button's width, as if swallowed by the middle of the bar
}
