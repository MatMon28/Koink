import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../lib/i18n';

export interface DockAction {
  id: string;
  icon: ReactNode;
  label: string;
  tone: string;
  onClick: () => void;
}

/** Safety net: the exit is dropped from the DOM after this long even if no animation event arrives. */
const EXIT_FALLBACK_MS = 220;

/**
 * The bar of add buttons (expense, income...). It belongs to the Month page: `show` is false on every
 * other page.
 *
 * Same idea as Kakcal's dock: it appears from the side the page came from and leaves towards the
 * side the page went (`--kc-swipe-dir`, set by `PageSwiper.tsx`: 1 = the new page is on the right),
 * in about 110-130 ms with the bounce spring. It is pinned to the bottom and never hides on
 * scroll, so adding an entry never needs a scroll. The exit is ended at once by the next touch.
 */
export function ActionDock({ label, actions, show = true }: { label: string; actions: DockAction[]; show?: boolean }) {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>(show ? 'in' : 'gone');
  const bar = useRef<HTMLDivElement>(null);

  // Follow `show` in the same render, so the first frame of the new state is already the right one.
  if (show && phase !== 'in') setPhase('in');
  if (!show && phase === 'in') setPhase('out');

  // Leaving: unmounted when the exit animation ends, or at once on the next touch or key press.
  useEffect(() => {
    if (phase !== 'out') return;
    const done = () => setPhase('gone');
    const timer = window.setTimeout(done, EXIT_FALLBACK_MS);
    (['pointerdown', 'touchstart', 'keydown'] as const).forEach((type) => document.addEventListener(type, done, { capture: true, passive: true }));
    return () => {
      window.clearTimeout(timer);
      (['pointerdown', 'touchstart', 'keydown'] as const).forEach((type) => document.removeEventListener(type, done, true));
    };
  }, [phase]);

  // Arriving: the next touch ends the entrance too (the bar is then simply in place).
  useEffect(() => {
    if (phase !== 'in') return;
    const settle = () => {
      const el = bar.current;
      if (!el || typeof el.getAnimations !== 'function') return;
      el.getAnimations({ subtree: true }).forEach((animation) => {
        if (typeof CSSAnimation !== 'undefined' && animation instanceof CSSAnimation) animation.cancel();
      });
    };
    document.addEventListener('pointerdown', settle, { capture: true, passive: true });
    return () => document.removeEventListener('pointerdown', settle, true);
  }, [phase]);

  if (!actions.length || phase === 'gone') return null;

  return createPortal(
    <div
      className="kc-dock-wrap fixed bottom-[max(0.875rem,calc(env(safe-area-inset-bottom)+0.375rem))] sm:bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.375rem))] left-[env(safe-area-inset-left)] right-[env(safe-area-inset-right)] z-30 pointer-events-none flex justify-center px-3"
    >
      <div
        ref={bar}
        role="group"
        aria-label={t(label)}
        data-dock
        data-scroll-fade="x"
        data-dock-phase={phase}
        onAnimationEnd={(event) => {
          if (phase === 'out' && event.target === event.currentTarget) setPhase('gone');
        }}
        className={`kc-dock ${phase === 'out' ? 'anim-dock-out' : 'anim-dock pointer-events-auto'} bg-[var(--surface)] border border-[var(--border)] shadow-lg shadow-black/10 rounded-full p-1.5 flex items-center gap-1 sm:gap-1.5 max-w-full overflow-x-auto no-scrollbar`}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            data-dock-action={action.id}
            onClick={action.onClick}
            tabIndex={phase === 'out' ? -1 : undefined}
            title={t(action.label)}
            aria-label={t(action.label)}
            className={`kc-dock-btn pressable size-12 min-[390px]:size-[3.25rem] shrink-0 rounded-full flex items-center justify-center [&_svg]:size-[22px] hover:brightness-95 ${action.tone}`}
          >
            {action.icon}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
