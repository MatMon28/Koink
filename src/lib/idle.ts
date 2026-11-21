/**
 * Runs `task` when the browser is idle, with a deadline so it can never starve. For work the first
 * screen does not need (rescheduling reminders). Returns a cancel function, usable as an effect
 * clean-up. WebViews without requestIdleCallback get a short timer.
 */
export function whenIdle(task: () => void, timeoutMs = 2500): () => void {
  const w = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(task, { timeout: timeoutMs });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(task, 250);
  return () => window.clearTimeout(id);
}
