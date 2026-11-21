import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { pushBackLayer } from '../lib/back';
import { getDockTarget } from '../lib/dock';
import { SPRING } from '../lib/spring';
import { releaseSpeed, trackSample, type Sample } from '../lib/velocity';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
  /** Id of the dock button that opens this sheet: on close the sheet is sucked into it. */
  dockId?: string;
}

/* Drag-to-close and exit timing. docs/gestures.md and docs/motion.md list these. */
/** Releasing the sheet this far down closes it... */
const DISMISS_PX = 56;
/** ...and so does a downward flick this fast, once it has travelled a little. */
const FLICK_SPEED = 0.3; // px per ms
const FLICK_MIN_PX = 10;
/** The exit is short on purpose: into the dock button, or dropping away; shorter still after a swipe. */
const EXIT_MS = { dock: 130, drop: 110, dockSwiped: 90, dropSwiped: 80 };
const PULSE_MS = 180;
/** A swipe-close the owner refused (it asked a question instead) springs back after this. */
const REFUSED_CLOSE_MS = 140;
/** For this long after a swipe-close, a tap whose click the browser drops is sent again. */
const TAP_RESCUE_MS = 900;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Open sheets, bottom to top. Only the top one answers Escape. */
const stack: symbol[] = [];
let lockCount = 0;

/** Exit animations still on screen. Each entry ends its animation and unmounts its sheet at once. */
const activeExits = new Set<() => void>();
let tapRescueUntil = 0;
let guardsInstalled = false;

/**
 * Two document-level guards, installed once:
 *
 * 1. Skip the exit. Any new press, key or wheel ends every closing animation at once, so an
 *    animation can never be in the way of the next action.
 * 2. Tap rescue. After a drag on a `touch-action: none` handle, Chromium (and so the Android
 *    WebView) can swallow the click of the next taps: pointer events arrive, `click` never does,
 *    which feels like a dead moment after a swipe-close. For a short while after one, a quick tap
 *    whose `click` does not arrive within 80 ms is re-sent as a click on the same element.
 */
function installInputGuards(): void {
  if (guardsInstalled || typeof document === 'undefined') return;
  guardsInstalled = true;

  const skip = () => {
    if (activeExits.size) Array.from(activeExits).forEach((end) => end());
  };
  (['pointerdown', 'touchstart', 'keydown', 'wheel'] as const).forEach((type) =>
    document.addEventListener(type, skip, { capture: true, passive: true }));

  let down: { target: EventTarget | null; x: number; y: number; time: number } | null = null;
  document.addEventListener('pointerdown', (event) => {
    down = { target: event.target, x: event.clientX, y: event.clientY, time: performance.now() };
  }, true);
  document.addEventListener('pointerup', (event) => {
    const start = down;
    down = null;
    const now = performance.now();
    if (!start || now > tapRescueUntil || event.pointerType === 'mouse' || start.target !== event.target) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12 || now - start.time > 700) return;
    const target = event.target as Element;
    let clicked = false;
    const sawClick = () => {
      clicked = true;
    };
    document.addEventListener('click', sawClick, true);
    window.setTimeout(() => {
      document.removeEventListener('click', sawClick, true);
      if (clicked || !target.isConnected || target.closest('[inert], :disabled')) return;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true, clientX: event.clientX, clientY: event.clientY, view: window }));
    }, 80);
  }, true);
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet on phones, centred dialog from the sm breakpoint. It can be dragged down by its
 * handle or header, closes with Escape, Back or a tap on the scrim, follows the on-screen keyboard,
 * and leaves with a short animation that never blocks the page behind it.
 */
export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-lg', dockId }: ModalProps) {
  const [mounted, setMounted] = useState(isOpen);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; startY: number; dy: number; samples: Sample[] }>({ id: -1, startY: 0, dy: 0, samples: [] });
  const offset = useRef(0);
  const swiped = useRef(false);
  const openRef = useRef(isOpen);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
    openRef.current = isOpen;
  });

  if (isOpen && !mounted) setMounted(true);

  // While open: lock the page behind it, answer Escape, keep Tab inside, follow the keyboard,
  // give focus back afterwards.
  useEffect(() => {
    if (!isOpen) return;
    installInputGuards();
    const token = Symbol('sheet');
    const previous = document.activeElement as HTMLElement | null;
    stack.push(token);
    lockCount += 1;
    document.documentElement.classList.add('kc-sheet-open');
    document.body.style.overflow = 'hidden';
    document.dispatchEvent(new Event('kc:overlay-open'));
    // Android Back / browser Back closes the sheet instead of leaving the app (docs/gestures.md).
    const releaseBack = pushBackLayer(() => onCloseRef.current());

    const dialog = dialogRef.current;
    swiped.current = false;
    if (dialog) {
      dialog.style.transform = '';
      offset.current = 0;
      if (!dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
    }

    // The sheet lives in the visual viewport: when the on-screen keyboard opens it sits just above
    // it, and the field being typed in is scrolled into view.
    const visual = window.visualViewport;
    let revealFrame = 0;
    const syncViewport = () => {
      const el = viewportRef.current;
      if (!visual || !el) return;
      el.style.setProperty('--sheet-top', `${visual.offsetTop}px`);
      el.style.setProperty('--sheet-left', `${visual.offsetLeft}px`);
      el.style.setProperty('--sheet-width', `${visual.width}px`);
      el.style.setProperty('--sheet-height', `${visual.height}px`);
    };
    const revealField = () => {
      const field = document.activeElement;
      const panel = dialogRef.current;
      if (stack[stack.length - 1] !== token || !panel || !(field instanceof HTMLElement) || !panel.contains(field)) return;
      if (!field.matches('input, textarea, select')) return;
      const scroller = field.closest<HTMLElement>('[data-sheet-scroll]');
      if (!scroller) return;
      const bounds = scroller.getBoundingClientRect();
      const box = field.getBoundingClientRect();
      if (box.top < bounds.top + 12) scroller.scrollTop += box.top - bounds.top - 12;
      else if (box.bottom > bounds.bottom - 12) scroller.scrollTop += box.bottom - bounds.bottom + 12;
    };
    const onViewportResize = () => {
      syncViewport();
      window.cancelAnimationFrame(revealFrame);
      revealFrame = window.requestAnimationFrame(revealField);
    };
    syncViewport();
    visual?.addEventListener('resize', onViewportResize);
    visual?.addEventListener('scroll', syncViewport);

    const onKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== token) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      visual?.removeEventListener('resize', onViewportResize);
      visual?.removeEventListener('scroll', syncViewport);
      window.cancelAnimationFrame(revealFrame);
      releaseBack();
      const index = stack.indexOf(token);
      if (index >= 0) stack.splice(index, 1);
      lockCount -= 1;
      if (lockCount === 0) {
        document.documentElement.classList.remove('kc-sheet-open');
        document.body.style.overflow = '';
      }
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [isOpen]);

  // Closing: shrink into the dock button that opened the sheet, or drop away. The page behind is
  // usable at once (the closing sheet takes no input) and the next press ends the animation.
  useLayoutEffect(() => {
    if (isOpen || !mounted) return;
    const dialog = dialogRef.current;
    const finish = () => {
      offset.current = 0;
      setMounted(false);
    };
    if (!dialog || prefersReducedMotion() || typeof dialog.animate !== 'function') {
      finish();
      return;
    }
    const rect = dialog.getBoundingClientRect();
    const target = getDockTarget(dockId);
    const to: Keyframe = target
      ? {
          // `rect` already includes how far the sheet was dragged, so the deltas start from there.
          transform: `translate3d(${target.x - (rect.left + rect.width / 2)}px, ${offset.current + target.y - (rect.top + rect.height / 2)}px, 0) scale(${Math.max(0.08, target.width / rect.width)})`,
          opacity: 0.2,
        }
      : { transform: `translate3d(0, ${offset.current + 48}px, 0) scale(0.97)`, opacity: 0 };
    const duration = target ? (swiped.current ? EXIT_MS.dockSwiped : EXIT_MS.dock) : swiped.current ? EXIT_MS.dropSwiped : EXIT_MS.drop;
    const options: KeyframeAnimationOptions = { duration, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' };
    if (swiped.current) tapRescueUntil = performance.now() + TAP_RESCUE_MS;
    let done = false;
    const anim = dialog.animate([to], options);
    const fade = backdropRef.current?.animate([{ opacity: 0 }], options);
    const end = () => {
      if (done) return;
      done = true;
      activeExits.delete(end);
      finish();
    };
    activeExits.add(end);
    anim.onfinish = () => {
      if (done) return;
      target?.pulse.animate?.(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }],
        { duration: PULSE_MS, easing: SPRING.bounce.easing },
      );
      end();
    };
    return () => {
      activeExits.delete(end);
      if (done) return;
      done = true;
      anim.cancel();
      fade?.cancel();
    };
  }, [isOpen, mounted, dockId]);

  if (!mounted) return null;

  const springBack = () => {
    const dialog = dialogRef.current;
    offset.current = 0;
    if (!dialog) return;
    dialog.style.transition = `transform ${SPRING.soft.duration}ms ${SPRING.soft.easing}`;
    dialog.style.transform = '';
  };

  const dragHandlers = {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
      drag.current = { id: event.pointerId, startY: event.clientY, dy: 0, samples: [{ pos: event.clientY, at: event.timeStamp }] };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      const dialog = dialogRef.current;
      if (d.id !== event.pointerId || !dialog) return;
      trackSample(d.samples, event.clientY, event.timeStamp);
      d.dy = Math.max(0, event.clientY - d.startY);
      offset.current = d.dy;
      dialog.style.transition = 'none';
      dialog.style.transform = `translate3d(0, ${d.dy}px, 0)`;
    },
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (d.id !== event.pointerId || !dialogRef.current) return;
      drag.current = { ...d, id: -1 };
      if (d.dy > DISMISS_PX || (d.dy > FLICK_MIN_PX && releaseSpeed(d.samples, event.timeStamp) > FLICK_SPEED)) {
        swiped.current = true;
        onClose();
        // The owner may refuse (unsaved changes): the sheet then goes back to rest.
        window.setTimeout(() => {
          if (!openRef.current) return;
          swiped.current = false;
          springBack();
        }, REFUSED_CLOSE_MS);
        return;
      }
      springBack();
    },
    onPointerCancel: () => {
      drag.current = { ...drag.current, id: -1 };
      springBack();
    },
  };

  return createPortal(
    <div
      ref={viewportRef}
      inert={!isOpen}
      className={`kc-sheet-viewport fixed z-50 flex items-end sm:items-center justify-center px-3 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] ${isOpen ? '' : 'pointer-events-none'}`}
    >
      <div ref={backdropRef} className="absolute inset-0 bg-black/45 anim-backdrop" aria-hidden="true" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? `${titleId}-description` : undefined}
        tabIndex={-1}
        className={`anim-dialog relative w-full ${maxWidth} max-h-full min-h-0 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-3xl shadow-2xl shadow-black/20 overflow-hidden focus:outline-none`}
      >
        <div className="shrink-0 touch-none flex justify-center pt-3 pb-2 sm:hidden" aria-hidden="true" {...dragHandlers}>
          <span className="h-1.5 w-11 rounded-full bg-[var(--border)]" />
        </div>
        <div className="px-5 py-3.5 sm:py-4 border-b border-[var(--border)] flex items-center justify-between gap-3 shrink-0 touch-none" {...dragHandlers}>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base sm:text-lg font-extrabold text-[var(--text)] tracking-tight break-words">
              {title}
            </h2>
            {subtitle && <p id={`${titleId}-description`} className="text-xs font-medium text-[var(--muted)] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="pressable w-10 h-10 shrink-0 rounded-full bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>
        <div data-sheet-scroll className="p-4 sm:p-5 overflow-y-auto overscroll-contain min-h-0 flex-1 text-[var(--text)]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
