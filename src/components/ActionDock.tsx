import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../lib/i18n';

export interface DockAction {
  id: string;
  icon: ReactNode;
  label: string;
  tone: string;
  onClick: () => void;
}

/**
 * The bar of add buttons (expense, income...). It is pinned to the bottom of the screen and always
 * visible: it no longer slides away while the page scrolls, so adding an entry never needs a scroll.
 */
export function ActionDock({ label, actions }: { label: string; actions: DockAction[] }) {
  if (!actions.length) return null;

  return createPortal(
    <div
      className="kc-dock-wrap fixed bottom-[max(0.875rem,calc(env(safe-area-inset-bottom)+0.375rem))] sm:bottom-[max(1.5rem,calc(env(safe-area-inset-bottom)+0.375rem))] left-[env(safe-area-inset-left)] right-[env(safe-area-inset-right)] z-30 pointer-events-none flex justify-center px-3"
    >
      <div
        role="group"
        aria-label={t(label)}
        data-dock
        className="kc-dock anim-dock pointer-events-auto bg-[var(--surface)] border border-[var(--border)] shadow-lg shadow-black/10 rounded-full p-1.5 flex items-center gap-1 sm:gap-1.5 max-w-full overflow-x-auto no-scrollbar"
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            data-dock-action={action.id}
            onClick={action.onClick}
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
