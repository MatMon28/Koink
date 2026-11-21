import { useEffect, useState } from 'react';

/**
 * Lets a layer animate in and out with plain CSS transitions. `mounted` says whether to render it at all,
 * `shown` is the state the transitions aim at: it turns true two frames after mounting (so the first frame
 * is painted in the "hidden" state and the layer really animates in) and false as soon as `open` ends,
 * after which the layer stays mounted for `exitMs` so the exit can play out.
 *
 *   const { mounted, shown } = usePresence(open, 260);
 *   if (!mounted) return null;
 *   <div style={{ opacity: shown ? 1 : 0, transition: 'opacity 260ms' }} />
 *
 * With `prefers-reduced-motion` there is no exit delay.
 */
export function usePresence(open: boolean, exitMs: number): { mounted: boolean; shown: boolean } {
  const [mounted, setMounted] = useState(open);
  const [armed, setArmed] = useState(false);

  // Adjusted while rendering (the documented way to derive state from props): no extra effect pass.
  if (open && !mounted) setMounted(true);
  if (!open && armed) setArmed(false);

  useEffect(() => {
    if (open) {
      // Two frames: the first paints the hidden state, the second starts the transition.
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setArmed(true));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setMounted(false), reduced ? 0 : exitMs);
    return () => window.clearTimeout(timer);
  }, [open, exitMs]);

  return { mounted, shown: open && armed };
}
