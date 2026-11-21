/*
 * "A new touch ends a running gesture animation at once." Kakcal's rule (docs/motion.md there:
 * "A new press cancels the settle"), kept in one place for the animations that have no owner able
 * to do it themselves (the month slide, the dock's pulse). The page rail (`PageSwiper.tsx`) and
 * the sheets (`Modal.tsx`) end their own animations in the same moments: pointerdown, touchstart,
 * keydown. See docs/motion.md ("Ending an animation early").
 */
const running = new Set<Animation>();
let installed = false;

/** Ends every registered animation: it jumps to its natural end state (these never use `fill`). */
export function endRunningAnimations(): void {
  if (!running.size) return;
  Array.from(running).forEach((animation) => animation.cancel());
  running.clear();
}

function install(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  (['pointerdown', 'touchstart', 'keydown'] as const).forEach((type) =>
    document.addEventListener(type, endRunningAnimations, { capture: true, passive: true }));
}

/**
 * Registers a Web Animation that must give way to the next touch. Only for animations whose end
 * state is the element's normal state (no `fill: forwards`): cancelling then equals finishing.
 */
export function endOnTouch<T extends Animation>(animation: T): T {
  install();
  running.add(animation);
  const forget = () => running.delete(animation);
  animation.addEventListener('finish', forget);
  animation.addEventListener('cancel', forget);
  return animation;
}
