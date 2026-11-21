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
