import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface DockAction {
  id: string;
  icon: ReactNode;
  label: string;
  tone: string;
  onClick: () => void;
}

/** Scroll travel (px) before the bar slides away / comes back. Coming back is deliberately cheaper. */
const HIDE_AFTER_DOWN = 14;
const SHOW_AFTER_UP = 7;
/** Near the top of the page the bar is always visible. */
const ALWAYS_SHOWN_ABOVE = 48;

/** Hides the dock while the page is scrolled down and brings it back after a small scroll up. */
function useHideOnScroll(): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const scroller = document.scrollingElement ?? document.documentElement;
    const read = () => Math.max(0, window.scrollY || scroller.scrollTop || 0);
    let lastY = read();
    let travel = 0; // signed distance since the direction last changed
    let state = false;
    const apply = (next: boolean) => {
      if (next === state) return;
      state = next;
      setHidden(next);
    };
    const onScroll = () => {
      if (document.documentElement.classList.contains('kc-sheet-open')) return;
      const y = read();
      const maxY = Math.max(0, scroller.scrollHeight - window.innerHeight);
      const delta = y - lastY;
      lastY = y;
      // Rubber-banding past the ends is not a user scroll.
      if (!delta || y > maxY + 1) return;
      travel = Math.sign(travel) === Math.sign(delta) ? travel + delta : delta;
      if (y < ALWAYS_SHOWN_ABOVE) { apply(false); return; }
      if (travel >= HIDE_AFTER_DOWN) apply(true);
      else if (travel <= -SHOW_AFTER_UP) apply(false);
    };
    // A sheet always reveals the bar again: it is where the sheet goes when it closes.
    const reveal = () => { lastY = read(); travel = 0; apply(false); };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('kc:overlay-open', reveal);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('kc:overlay-open', reveal);
    };
  }, []);

  return hidden;
}

export function ActionDock({ label, actions }: { label: string; actions: DockAction[] }) {
  const hidden = useHideOnScroll();
  if (!actions.length) return null;

  return createPortal(
    <div
      className="kc-dock-wrap fixed bottom-[max(0.875rem,calc(env(safe-area-inset-bottom)+0.375rem))] sm:bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.375rem))] left-[env(safe-area-inset-left)] right-[env(safe-area-inset-right)] z-30 pointer-events-none flex justify-center px-3"
      data-hidden={hidden ? 'true' : undefined}
    >
      <div
        role="group"
        aria-label={label}
        data-dock
        className="kc-dock anim-dock pointer-events-auto bg-[var(--surface)] border border-[var(--border)] shadow-lg shadow-black/10 rounded-full p-1.5 flex items-center gap-1 sm:gap-1.5 max-w-full overflow-x-auto no-scrollbar"
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            data-dock-action={action.id}
            onClick={action.onClick}
            title={action.label}
            aria-label={action.label}
            tabIndex={hidden ? -1 : undefined}
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
