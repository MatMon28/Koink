import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X } from 'lucide-react';
import { useBackLayer } from '../lib/back';
import { useChartTurned } from '../lib/chartTurn';
import { t } from '../lib/i18n';
import { usePresence } from '../lib/usePresence';
import { releaseSpeed, trackSample, type Sample } from '../lib/velocity';

const EXIT_MS = 190;
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
/** Finger travel that turns a touch into a drag (below it a tap stays a tap). */
const DRAG_START_PX = 6;
/** A swipe down closes the popup past this distance, or on a flick faster than FLICK_SPEED past FLICK_MIN_PX. */
const CLOSE_PX = 72;
const FLICK_SPEED = 0.4; // px per ms
const FLICK_MIN_PX = 20;
/** Controls that need their own touches: a drag that starts on them is not a close. */
const OWN_TOUCH = 'input, textarea, select, [contenteditable="true"]';

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
  /** When given, a Reset button sits next to Done. */
  onReset?: () => void;
  /** Reset has nothing to do while everything is at its default. */
  resetDisabled?: boolean;
  children: ReactNode;
}

interface Drag {
  id: number;
  /** Where the finger went down (screen px). */
  x: number;
  y: number;
  locked: boolean;
  samples: Sample[];
}

/**
 * A small centred popup over a dimmed page: the chart's settings. It fades and rises in, and fades out on
 * close (scrim tap, the X, Done, Escape, Back or a swipe down). It is not a bottom sheet on purpose: it has
 * to work on top of the full-screen chart (the sheets live below it) and in landscape.
 *
 * Swipe down: the popup follows the finger and closes past 72 px or on a flick, otherwise it springs back.
 * It starts on the grip and title row, on the dimmed area, and (when the popup does not scroll) anywhere on
 * the popup, so it never fights the popup's own scrolling. "Down" is read in the popup's own axes, so it
 * also works inside the full view when that is turned sideways.
 */
export function ChartPopup({ open, onClose, title, inline = false, onReset, resetDisabled = false, children }: Props) {
  const { mounted, shown } = usePresence(open, EXIT_MS);
  const turned = useChartTurned();
  useBackLayer(open, onClose);

  const panel = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const swallowClick = useRef(false);
  const latest = useRef({ turned, onClose });
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  /** Where a swipe-close let go, so the popup keeps sinking from there. */
  const [exitDy, setExitDy] = useState(0);
  /** The popup has more content than fits: the body scrolls, so only the grip row drags. */
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    latest.current = { turned, onClose };
  });

  // Every time it opens it starts at rest (adjusted while rendering).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDy(0);
      setExitDy(0);
      setDragging(false);
    }
  }

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

  // Does the content scroll? (It changes with the compare mode, so watch it.)
  useEffect(() => {
    const el = panel.current;
    const inner = content.current;
    if (!mounted || !el || !inner || typeof ResizeObserver === 'undefined') return;
    const measure = () => setScrollable(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [mounted]);

  /** A screen movement as the popup sees it: turned, "down" is to the left on the screen. */
  const downBy = (dx: number, dy2: number) => (latest.current.turned ? -dx : dy2);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = null;
    swallowClick.current = false;
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const target = event.target as HTMLElement;
    if (target.closest(OWN_TOUCH)) return;
    const inPanel = !!target.closest('[data-popup-panel]');
    // On a scrolling popup only the grip row drags (the body keeps its own scrolling).
    if (inPanel && scrollable && !target.closest('[data-popup-grip]')) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, locked: false, samples: [{ pos: downBy(event.clientX, event.clientY), at: event.timeStamp }] };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    const dx = event.clientX - d.x;
    const dyScreen = event.clientY - d.y;
    const down = downBy(dx, dyScreen);
    const across = latest.current.turned ? dyScreen : dx;
    if (!d.locked) {
      if (Math.abs(down) < DRAG_START_PX && Math.abs(across) < DRAG_START_PX) return;
      if (down <= 0 || Math.abs(across) > Math.abs(down)) {
        drag.current = null; // up or sideways: not a close
        return;
      }
      d.locked = true;
      swallowClick.current = true; // the drag must not also press what is under the finger
      setDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    trackSample(d.samples, downBy(event.clientX, event.clientY), event.timeStamp);
    setDy(Math.max(0, down));
  };

  const end = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== event.pointerId) return;
    drag.current = null;
    if (!d.locked) return;
    const cancelled = event.type === 'pointercancel';
    const down = Math.max(0, downBy(event.clientX - d.x, event.clientY - d.y));
    const speed = cancelled ? 0 : releaseSpeed(d.samples, event.timeStamp);
    setDragging(false);
    window.setTimeout(() => (swallowClick.current = false), 60);
    if (!cancelled && (down > CLOSE_PX || (speed > FLICK_SPEED && down > FLICK_MIN_PX))) {
      setExitDy(down); // keeps sinking from where the finger let go
      latest.current.onClose();
    } else {
      setDy(0); // springs back
    }
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  if (!mounted) return null;

  const progress = Math.min(1, dy / 320);
  const offset = shown ? dy : exitDy + 14;
  const panelTransition = dragging ? 'none' : `opacity ${EXIT_MS}ms ease-out, transform ${shown ? 300 : EXIT_MS}ms ${EASE}`;

  const node = (
    // data-no-swipe: the page behind must not swipe away while a finger moves in the popup;
    // data-no-close: the full view's swipe-down must not start here.
    <div
      data-no-swipe
      data-no-close
      className={`${inline ? 'absolute' : 'fixed'} inset-0 z-[90] flex items-center justify-center p-3`}
      style={{ pointerEvents: open ? 'auto' : 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
      onClickCapture={onClickCapture}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('Close')}
        onClick={onClose}
        className="absolute inset-0 touch-none bg-black/40"
        style={{ opacity: shown ? 1 - progress * 0.8 : 0, transition: dragging ? 'none' : `opacity ${EXIT_MS}ms ease-out` }}
      />
      <div
        ref={panel}
        data-popup-panel
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`kc-themed-card relative max-h-[92%] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text)] shadow-2xl shadow-black/25 ${scrollable ? 'touch-pan-y' : 'touch-none'}`}
        style={{
          opacity: shown ? 1 - progress * 0.5 : 0,
          transform: shown ? `translate3d(0, ${offset}px, 0) scale(1)` : `translate3d(0, ${offset}px, 0) scale(0.97)`,
          transition: panelTransition,
        }}
      >
        <div ref={content}>
          {/* Grip row: a swipe down on it always closes, even when the settings below scroll. */}
          <div data-popup-grip className="-mx-4 -mt-4 mb-1 touch-none px-4 pt-2.5">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-[var(--border)]" aria-hidden="true" />
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold">{title}</h3>
              <button type="button" onClick={onClose} aria-label={t('Close')} className="pressable flex size-8 items-center justify-center rounded-full bg-[var(--inset)] text-[var(--muted)] hover:text-[var(--text)]">
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
          {children}
          <div className="mt-4 flex items-stretch gap-2">
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                disabled={resetDisabled}
                className="pressable pressable-soft flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--inset)] px-4 py-3 text-sm font-extrabold text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-40"
              >
                <RotateCcw size={14} aria-hidden="true" />
                {t('Reset')}
              </button>
            )}
            <button type="button" onClick={onClose} className="kc-primary-btn pressable pressable-soft min-w-0 flex-1 rounded-2xl bg-[var(--text)] py-3 text-sm font-extrabold text-[var(--on-text)] hover:brightness-95">
              {t('Done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return inline ? node : createPortal(node, document.body);
}
