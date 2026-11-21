import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChartColumn, RotateCw, SlidersHorizontal, X, ZoomIn, ZoomOut } from 'lucide-react';
import { ChartPlot, type PlotProps } from './ChartPlot';
import { useBackLayer } from '../lib/back';
import { clampZoom, maxZoom, ZOOM_FLOOR_MAX, ZOOM_MIN } from '../lib/expenseSeries';
import { t } from '../lib/i18n';
import { usePresence } from '../lib/usePresence';
import { releaseSpeed, trackSample, type Sample } from '../lib/velocity';

/* Feel of the full view. docs/gestures.md and docs/motion.md list these. */
/** Slide-in / slide-out and the quarter turn use the same ease-out curve; the turn is a little slower. */
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SHOW_MS = 380;
const TURN_MS = 480;
const FADE_MS = 260;
/** How far the view rises from (and sinks to) when it opens or is closed with the button. */
const REST_OFFSET_PX = 56;
/** Finger travel that decides a drag is a pan, a close or a scroll-less tap. */
const DRAG_START_PX = 6;
/** A swipe down closes the view past this distance, or on a flick faster than FLICK_SPEED once past FLICK_MIN_PX. */
const CLOSE_PX = 96;
const FLICK_SPEED = 0.5; // px per ms
const FLICK_MIN_PX = 28;
/** After a pan, the chart keeps gliding: speed is multiplied by this every 16 ms until it is below STOP_SPEED. */
const GLIDE_DECAY = 0.94;
const STOP_SPEED = 0.02;
/** The zoom buttons glide to their value in this time (a wheel or pinch follows the fingers instead). */
const ZOOM_MS = 230;
/** One press of + / - multiplies the zoom by this. */
const ZOOM_STEP = 1.6;

const PAD = {
  top: 'max(0.5rem, env(safe-area-inset-top))',
  right: 'max(1rem, env(safe-area-inset-right))',
  bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
  left: 'max(1rem, env(safe-area-inset-left))',
};
/** Turned a quarter clockwise, the view's top is the screen's right edge, its right is the bottom... */
const PAD_TURNED = {
  top: 'max(0.5rem, env(safe-area-inset-right))',
  right: 'max(1rem, env(safe-area-inset-bottom))',
  bottom: 'max(0.75rem, env(safe-area-inset-left))',
  left: 'max(1rem, env(safe-area-inset-top))',
};

const isPortrait = (): boolean => window.innerHeight >= window.innerWidth;

type Mode = 'idle' | 'pending' | 'pan' | 'close' | 'pinch' | 'none';

interface Drag {
  mode: Mode;
  /** Where the first finger went down (screen px), and the scroll position then. */
  x: number;
  y: number;
  scroll: number;
  /** Positions along the view's own axes, for the release speed. */
  samples: Sample[];
  onPlot: boolean;
  moved: boolean;
  pinch: { distance: number; zoom: number } | null;
}

type Anchor = { kind: 'end' } | { kind: 'focal'; share: number; at: number };

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** The chart, exactly as the card shows it. */
  plot: Omit<PlotProps, 'rotated' | 'freeze' | 'heightClass'>;
  /** The line(s) above the chart: totals, the tapped slot, the difference. */
  readout: ReactNode;
  /** Width in px bars would have when scrolled at their natural size (the zoom bars start at). */
  naturalWidth: number;
  onOpenSettings: () => void;
  /** The settings popup, drawn inside the view so that it turns with it. */
  popup: ReactNode;
}

const iconButton = 'pressable flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--inset)] text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-35';

/**
 * The full-screen chart. Compared with the card on the Statistics page it can
 *  - zoom (pinch, Ctrl / trackpad wheel, the + / - buttons or keys) from "everything fits" up to a bar per
 *    56 px, keeping the point between the fingers still, and pan (drag, with a glide);
 *  - turn a quarter, so a phone held sideways shows far more of the period (a CSS rotation: it works the same
 *    in the browser, the installed app and Android, with no permission); the turn is animated, the data in
 *    the middle of the view stays in the middle;
 *  - be closed with a swipe down (the title bar or the chart; "down" is the way the text reads, also when
 *    turned), the button, Escape or Back.
 * It opens by rising and fading in and closes by sinking and fading out.
 */
export function ChartLargeView({ open, onClose, title, plot, readout, naturalWidth, onOpenSettings, popup }: Props) {
  const { mounted, shown } = usePresence(open, SHOW_MS);
  const [rotated, setRotated] = useState(false);
  const [portrait, setPortrait] = useState(isPortrait);
  const [turning, setTurning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [tick, setTick] = useState(0);
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitOffset, setExitOffset] = useState(REST_OFFSET_PX);
  /** How far this chart can be zoomed in (depends on the number of slots and the width of the view). */
  const [limit, setLimit] = useState(ZOOM_FLOOR_MAX);

  const backdrop = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const anchor = useRef<Anchor | null>(null);
  const centre = useRef(0.5);
  const drag = useRef<Drag>({ mode: 'idle', x: 0, y: 0, scroll: 0, samples: [], onPlot: false, moved: false, pinch: null });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const glide = useRef(0);
  const zoomAnimation = useRef(0);
  const swallowClick = useRef(false);
  const latest = useRef({ slots: plot.slots, turned: false, onClose });

  // The turn only means something while the screen is upright; a phone that is really held sideways has
  // the room already, and the view then just uses it.
  const turned = rotated && portrait;
  useEffect(() => {
    latest.current = { slots: plot.slots, turned, onClose };
  });

  useBackLayer(open, onClose);

  useEffect(() => {
    const onResize = () => setPortrait(isPortrait());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  if (!portrait && rotated) setRotated(false); // the phone itself is sideways now: nothing left to turn

  // Every time the view opens it starts upright, still and not dragged (adjusted while rendering).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRotated(false);
      setDy(0);
      setDragging(false);
      setExitOffset(REST_OFFSET_PX);
    }
  }

  /* ---------- Zoom ---------- */

  /** Zooms to `next`, keeping the point `at` px from the left of the view where it is. */
  const applyZoom = useCallback((next: number, at: number) => {
    const el = scroller.current;
    if (!el) return;
    const z = clampZoom(next, maxZoom(latest.current.slots, el.clientWidth));
    if (Math.abs(z - zoomRef.current) < 1e-4) return;
    // Two moves before a render: keep the share worked out first, only the finger position follows.
    if (anchor.current?.kind === 'focal') anchor.current.at = at;
    else anchor.current = { kind: 'focal', share: (el.scrollLeft + at) / el.scrollWidth, at };
    zoomRef.current = z;
    setZoom(z);
  }, []);

  const stopZoomAnimation = () => cancelAnimationFrame(zoomAnimation.current);

  const zoomTo = (target: number) => {
    const el = scroller.current;
    if (!el) return;
    stopZoomAnimation();
    const from = zoomRef.current;
    const to = clampZoom(target, maxZoom(latest.current.slots, el.clientWidth));
    if (Math.abs(to - from) < 1e-4) return;
    const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      applyZoom(to, el.clientWidth / 2);
      return;
    }
    const began = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - began) / ZOOM_MS);
      const eased = 1 - (1 - p) ** 3;
      applyZoom(from * (to / from) ** eased, el.clientWidth / 2); // geometric: every frame zooms by the same share
      if (p < 1) zoomAnimation.current = requestAnimationFrame(step);
    };
    zoomAnimation.current = requestAnimationFrame(step);
  };

  /** Where, along the view's own horizontal axis, a screen point is inside the scroller. */
  const along = (clientX: number, clientY: number): number => {
    const box = scroller.current?.getBoundingClientRect();
    if (!box) return 0;
    return latest.current.turned ? clientY - box.top : clientX - box.left;
  };

  // Put the chart where the last zoom (or a reset) says, before the browser paints.
  useLayoutEffect(() => {
    const el = scroller.current;
    const a = anchor.current;
    if (!el || !a) return;
    anchor.current = null;
    el.scrollLeft = a.kind === 'end' ? el.scrollWidth : a.share * el.scrollWidth - a.at;
  }, [zoom, tick]);

  // The zoom limit follows the width of the view (it changes with the turn and with the data).
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) setLimit(maxZoom(plot.slots, el.clientWidth));
  }, [mounted, plot.slots, turned, turning, portrait]);

  // New data or another kind of chart: back to where it starts (bars at their natural width, the line fitted), newest at the right.
  const dataKey = `${plot.type}|${plot.slots}|${plot.resolution}|${plot.lines.length}|${Math.round(naturalWidth)}`;
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!mounted || !el) return;
    stopZoomAnimation();
    const z = plot.type === 'bars' ? clampZoom(naturalWidth / Math.max(1, el.clientWidth), maxZoom(plot.slots, el.clientWidth)) : ZOOM_MIN;
    zoomRef.current = z;
    anchor.current = { kind: 'end' };
    setZoom(z);
    setTick((n) => n + 1);
    // dataKey carries everything that decides the start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, dataKey]);

  /* ---------- The turn ---------- */

  const toggleTurn = () => {
    const el = scroller.current;
    if (el) centre.current = (el.scrollLeft + el.clientWidth / 2) / Math.max(1, el.scrollWidth);
    setTurning(true);
    setRotated((value) => !value);
  };
  useEffect(() => {
    if (!turning) return;
    // While the view changes shape, keep the data that was in the middle in the middle, frame by frame.
    let frame = 0;
    const follow = () => {
      const el = scroller.current;
      if (el) el.scrollLeft = centre.current * el.scrollWidth - el.clientWidth / 2;
      frame = requestAnimationFrame(follow);
    };
    frame = requestAnimationFrame(follow);
    const end = window.setTimeout(() => setTurning(false), TURN_MS + 60);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(end);
    };
  }, [turning, turned]);

  /* ---------- Keys and wheel ---------- */

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if ((event.target as HTMLElement | null)?.closest('input, textarea, select')) return;
      if (event.key === 'Escape') latest.current.onClose();
      else if (event.key === '+' || event.key === '=') zoomTo(zoomRef.current * ZOOM_STEP);
      else if (event.key === '-' || event.key === '_') zoomTo(zoomRef.current / ZOOM_STEP);
      else if (event.key === '0') zoomTo(ZOOM_MIN);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // zoomTo only uses refs and stable callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The wheel zooms the chart (a trackpad pinch arrives as Ctrl + wheel) and never scrolls the page behind.
  useEffect(() => {
    const el = backdrop.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-no-close]')) return; // the readout and the popup scroll themselves
      event.preventDefault();
      if (!target.closest('[data-chart-pan]')) return;
      if (!event.ctrlKey && Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        if (scroller.current) scroller.current.scrollLeft += event.deltaX; // sideways wheel: pan
        return;
      }
      stopZoomAnimation();
      applyZoom(zoomRef.current * Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0015)), along(event.clientX, event.clientY));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // `along` and `applyZoom` only read refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  /* ---------- Fingers: pan, pinch, swipe down ---------- */

  /** A screen movement as the view sees it: turned, "right" is down the screen and "down" is to the left. */
  const toView = (dx: number, dy2: number) => (latest.current.turned ? { x: dy2, y: -dx } : { x: dx, y: dy2 });

  const stopGlide = () => cancelAnimationFrame(glide.current);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-no-close]') || (event.pointerType === 'mouse' && event.button !== 0)) return;
    swallowClick.current = false;
    stopGlide();
    stopZoomAnimation();
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const d = drag.current;
    if (pointers.current.size === 2 && target.closest('[data-chart-pan]')) {
      // Second finger on the chart: pinch. Whatever the first finger was doing stops.
      const [a, b] = [...pointers.current.values()];
      if (d.mode === 'close') {
        setDragging(false);
        setDy(0);
      }
      d.mode = 'pinch';
      d.moved = true;
      d.pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: zoomRef.current };
      return;
    }
    if (pointers.current.size > 1) {
      d.mode = 'none';
      return;
    }
    const view = toView(event.clientX, event.clientY);
    d.mode = 'pending';
    d.x = event.clientX;
    d.y = event.clientY;
    d.scroll = scroller.current?.scrollLeft ?? 0;
    d.samples = [{ pos: view.x, at: event.timeStamp }];
    d.onPlot = !!target.closest('[data-chart-pan]');
    d.moved = false;
    d.pinch = null;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (d.mode === 'pinch' && d.pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      applyZoom(d.pinch.zoom * (distance / d.pinch.distance), along((a.x + b.x) / 2, (a.y + b.y) / 2));
      return;
    }
    if (d.mode === 'idle' || d.mode === 'none') return;

    const move = toView(event.clientX - d.x, event.clientY - d.y);
    if (d.mode === 'pending') {
      if (Math.abs(move.x) < DRAG_START_PX && Math.abs(move.y) < DRAG_START_PX) return;
      if (d.onPlot && Math.abs(move.x) > Math.abs(move.y)) d.mode = 'pan';
      else if (move.y > 0 && Math.abs(move.y) >= Math.abs(move.x)) d.mode = 'close';
      else {
        d.mode = 'none'; // a drag upwards means nothing
        return;
      }
      d.moved = true;
      swallowClick.current = true;
      if (d.mode === 'close') setDragging(true);
    }

    const view = toView(event.clientX, event.clientY);
    trackSample(d.samples, d.mode === 'pan' ? view.x : view.y, event.timeStamp);
    if (d.mode === 'pan' && scroller.current) scroller.current.scrollLeft = d.scroll - move.x;
    else if (d.mode === 'close') setDy(Math.max(0, move.y));
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!pointers.current.delete(event.pointerId)) return;
    if (d.mode === 'pinch') {
      swallowClick.current = true;
      if (pointers.current.size < 2) d.mode = 'none'; // the finger left over does not pan
      if (pointers.current.size === 0) d.mode = 'idle';
      return;
    }
    const cancelled = event.type === 'pointercancel';
    if (d.mode === 'pan') {
      let speed = cancelled ? 0 : releaseSpeed(d.samples, event.timeStamp);
      const el = scroller.current;
      let last = performance.now();
      const run = (now: number) => {
        const dt = now - last;
        last = now;
        speed *= GLIDE_DECAY ** (dt / 16);
        if (!el || Math.abs(speed) < STOP_SPEED) return;
        el.scrollLeft -= speed * dt;
        glide.current = requestAnimationFrame(run);
      };
      if (Math.abs(speed) > STOP_SPEED) glide.current = requestAnimationFrame(run);
    } else if (d.mode === 'close') {
      const speed = cancelled ? 0 : releaseSpeed(d.samples, event.timeStamp);
      const move = toView(event.clientX - d.x, event.clientY - d.y);
      const far = move.y > CLOSE_PX || (speed > FLICK_SPEED && move.y > FLICK_MIN_PX);
      setDragging(false);
      if (far && !cancelled) {
        setExitOffset(stage.current?.clientHeight ?? 600); // keeps sinking from where the finger let go
        latest.current.onClose();
      } else {
        setDy(0); // springs back
      }
    }
    d.mode = pointers.current.size === 0 ? 'idle' : 'none';
    if (d.moved) window.setTimeout(() => (swallowClick.current = false), 60);
  };

  /** A drag is not a tap: the click that follows a pan, a pinch or a swipe must not press what is under the finger. */
  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(
    () => () => {
      cancelAnimationFrame(glide.current);
      cancelAnimationFrame(zoomAnimation.current);
    },
    [],
  );

  if (!mounted) return null;

  /* ---------- Look ---------- */

  const pad = turned ? PAD_TURNED : PAD;
  const progress = Math.min(1, dy / (window.innerHeight * 0.7));
  const offset = shown ? dy : exitOffset;
  const duration = turning ? TURN_MS : SHOW_MS;
  const transition = dragging
    ? 'none'
    : `transform ${duration}ms ${EASE}, width ${duration}ms ${EASE}, height ${duration}ms ${EASE}, padding ${duration}ms ${EASE}, opacity ${FADE_MS}ms ease-out`;
  const zoomLabel = `${zoom < 10 ? zoom.toFixed(1).replace(/\.0$/, '') : Math.round(zoom)}×`;

  return createPortal(
    // data-no-swipe: the page swipe (a React ancestor, reached through the portal) must stay out of this.
    <div
      ref={backdrop}
      data-no-swipe
      className="fixed inset-0 z-[80] overflow-hidden bg-[var(--bg)] text-[var(--text)]"
      style={{ opacity: shown ? 1 - progress * 0.85 : 0, transition: dragging ? 'none' : `opacity ${FADE_MS}ms ease-out`, pointerEvents: open ? 'auto' : 'none' }}
    >
      <div
        ref={stage}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute left-1/2 top-1/2 flex select-none flex-col gap-1.5 will-change-transform"
        style={{
          width: turned ? '100dvh' : '100%',
          height: turned ? '100dvw' : '100%',
          paddingTop: pad.top,
          paddingRight: pad.right,
          paddingBottom: pad.bottom,
          paddingLeft: pad.left,
          transform: `translate3d(-50%, -50%, 0) rotate(${turned ? 90 : 0}deg) translate3d(0, ${offset}px, 0)`,
          opacity: shown ? 1 - progress * 0.4 : 0,
          transition,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
      >
        {/* Title bar: also where a swipe down closes the view. */}
        <div className="shrink-0 touch-none">
          <div className="mx-auto mb-1.5 h-1 w-10 rounded-full bg-[var(--border)]" aria-hidden="true" />
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex min-w-0 items-center gap-2 text-base font-extrabold">
              <ChartColumn size={18} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
              <span className="truncate">{title}</span>
            </h3>
            <button type="button" onClick={onClose} aria-label={t('Close full view')} title={t('Close full view')} className="pressable flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--text)] text-[var(--on-text)]">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-1.5" role="group" aria-label={t('Zoom')}>
            <button type="button" className={iconButton} onClick={() => zoomTo(zoomRef.current / ZOOM_STEP)} disabled={zoom <= ZOOM_MIN + 1e-3} aria-label={t('Zoom out')} title={t('Zoom out')}>
              <ZoomOut size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => zoomTo(ZOOM_MIN)}
              disabled={zoom <= ZOOM_MIN + 1e-3}
              aria-label={t('Fit the whole period')}
              title={t('Fit the whole period')}
              className="pressable h-9 min-w-[3.25rem] rounded-full bg-[var(--inset)] px-3 text-[11px] font-extrabold tabular-nums text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-100"
            >
              {zoom <= ZOOM_MIN + 1e-3 ? t('Fit') : zoomLabel}
            </button>
            <button type="button" className={iconButton} onClick={() => zoomTo(zoomRef.current * ZOOM_STEP)} disabled={zoom >= limit - 1e-3} aria-label={t('Zoom in')} title={t('Zoom in')}>
              <ZoomIn size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            {(portrait || rotated) && (
              <button
                type="button"
                className={`${iconButton} ${turned ? '!bg-[var(--text)] !text-[var(--on-text)]' : ''}`}
                onClick={toggleTurn}
                aria-pressed={turned}
                aria-label={turned ? t('Back to upright') : t('Turn the chart sideways')}
                title={turned ? t('Back to upright') : t('Turn the chart sideways')}
              >
                <RotateCw size={16} aria-hidden="true" />
              </button>
            )}
            <button type="button" className={iconButton} onClick={onOpenSettings} aria-label={t('Chart settings')} title={t('Chart settings')}>
              <SlidersHorizontal size={16} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div data-no-close className="max-h-[32%] shrink-0 touch-pan-y overflow-y-auto overscroll-contain">
          {readout}
        </div>

        <div ref={scroller} data-chart-pan className="no-scrollbar min-h-0 flex-1 touch-none overflow-x-auto overflow-y-hidden overscroll-contain">
          <div className="h-full" style={{ width: `${zoom * 100}%` }}>
            <ChartPlot {...plot} rotated={turned} freeze={turning} />
          </div>
        </div>

        {!turned && <p className="shrink-0 px-1 text-center text-[11px] font-medium text-[var(--muted)]">{t('Pinch to zoom · drag to move · swipe down to close')}</p>}

        {popup}
      </div>
    </div>,
    document.body,
  );
}
