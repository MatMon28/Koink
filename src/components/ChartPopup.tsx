import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useBackLayer } from '../lib/back';
import { t } from '../lib/i18n';
import { usePresence } from '../lib/usePresence';

const EXIT_MS = 190;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /**
   * Draw inside the parent instead of on the page. The full view needs this: it can be turned a quarter,
   * and a popup rendered in place turns with it (the parent is `position: absolute` / transformed, so
   * `absolute inset-0` covers exactly the full view).
   */
  inline?: boolean;
  children: ReactNode;
}

/**
 * A small centred popup over a dimmed page: the chart's settings. It fades and rises in, and fades out on
 * close (scrim tap, the X, Done, Escape or Back). It is not a bottom sheet on purpose: it has to work on top
 * of the full-screen chart (the sheets live below it) and in landscape.
 */
export function ChartPopup({ open, onClose, title, inline = false, children }: Props) {
  const { mounted, shown } = usePresence(open, EXIT_MS);
  useBackLayer(open, onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!mounted) return null;

  const node = (
    // data-no-swipe: the page behind must not swipe away while a finger moves in the popup;
    // data-no-close: the full view's swipe-down must not start here.
    <div data-no-swipe data-no-close className={`${inline ? 'absolute' : 'fixed'} inset-0 z-[90] flex items-center justify-center p-3`} style={{ pointerEvents: open ? 'auto' : 'none' }}>
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('Close')}
        onClick={onClose}
        className="absolute inset-0 touch-none bg-black/40"
        style={{ opacity: shown ? 1 : 0, transition: `opacity ${EXIT_MS}ms ease-out` }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="kc-themed-card relative max-h-[92%] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text)] shadow-2xl shadow-black/25"
        style={{
          opacity: shown ? 1 : 0,
          transform: shown ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(0, 14px, 0) scale(0.97)',
          transition: `opacity ${EXIT_MS}ms ease-out, transform ${shown ? 300 : EXIT_MS}ms ${EASE}`,
        }}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold">{title}</h3>
          <button type="button" onClick={onClose} aria-label={t('Close')} className="pressable flex size-8 items-center justify-center rounded-full bg-[var(--inset)] text-[var(--muted)] hover:text-[var(--text)]">
            <X size={15} aria-hidden="true" />
          </button>
        </div>
        {children}
        <button type="button" onClick={onClose} className="kc-primary-btn pressable pressable-soft mt-4 w-full rounded-2xl bg-[var(--text)] py-3 text-sm font-extrabold text-[var(--on-text)] hover:brightness-95">
          {t('Done')}
        </button>
      </div>
    </div>
  );

  return inline ? node : createPortal(node, document.body);
}
