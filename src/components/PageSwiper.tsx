import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { whenIdle } from '../lib/idle';
import { setPillTab } from '../lib/pillTab';
import { SPRING } from '../lib/spring';
import { useApp } from '../lib/store';
import { neighbourTab, tabOrder } from '../lib/tabs';
import { releaseSpeed, trackSample, type Sample } from '../lib/velocity';
import type { ActiveTab } from '../lib/types';

/* Sensitivity. Every number of the page swipe lives here; docs/gestures.md lists them. */
/** The outer strip of the screen belongs to the system's own back swipe. */
const EDGE_RESERVED_PX = 20;
/** Horizontal travel before the page starts to follow the finger... */
const TAKEOVER_PX = 8;
/** ...and by how much it has to beat the vertical travel. */
const TAKEOVER_RATIO = 1.2;
/** Vertical travel that hands the gesture to scrolling for good. */
const SCROLL_PX = 10;
/** The pages move a little less than the finger; at the first and last page the page only stretches. */
const FOLLOW = 0.9;
const RUBBER = 0.22;
/** Releasing past this share of the width changes the page (kept between the two pixel values). */
const COMMIT_SHARE = 0.16;
const COMMIT_MIN_PX = 48;
const COMMIT_MAX_PX = 84;
/** A quick flick changes the page sooner. */
const FLICK_SPEED = 0.35; // px per ms
const FLICK_MIN_PX = 24;

/** The neighbouring page rides this far beside the current one. */
const RAIL_GAP_PX = 24;
/** A committed swipe finishes its travel in this time (shorter when the finger already did most of it). */
const COMMIT_MIN_MS = 90;
/** A page reached without a swipe (the header pill, Back) slides in from this far on its side. */
const ENTER_OFFSET_PX = 28;
/** The finish of a committed swipe never takes longer / shorter than this, and follows the release speed (px per ms, at least). */
const EXIT_MAX_MS = 220;
const EXIT_MIN_SPEED = 1.4;
/** A caught rail that the finger did not move afterwards just rests (it is not a swipe to commit). */
const CATCH_TAP_PX = 4;

/** Controls that need horizontal drags themselves, or must never start a page change. */
const OWN_GESTURE = '[data-no-swipe], input, textarea, select, [contenteditable="true"], [role="slider"]';

const prefersReducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** An ancestor between the touch and the page that can itself scroll sideways keeps the gesture. */
function hasHorizontalScroller(target: Element, root: Element): boolean {
  for (let el: Element | null = target; el && el !== root; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const overflow = getComputedStyle(el).overflowX;
      if (overflow === 'auto' || overflow === 'scroll') return true;
    }
  }
  return false;
}

interface Gesture {
  id: number;
  startX: number;
  startY: number;
  /** Recent positions, for the release speed. */
  samples: Sample[];
  locked: boolean;
  dx: number;
  /** Where the rail was when the finger caught it mid-animation (0 for a rail at rest). */
  base: number;
  /** Where the rail is now: base plus the finger's travel. */
  pos: number;
}

/** What is running on the rail and how a new touch ends or takes it over. */
interface RailRun {
  /** Ends it at once: the animation's own end state is in place afterwards. */
  end: () => void;
  /** The last stretch of a committed swipe: a touch lands the new page, then swipes from it. */
  commit?: boolean;
  /** Stops it where it is and returns the rail's offset, so a finger can pick it up with no jump. */
  grab?: () => number;
}

/** The sideways offset of an element in the middle of a transform animation. */
function railOffset(el: HTMLElement): number {
  const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
  return Number.isFinite(matrix.m41) ? matrix.m41 : 0;
}

interface Peek {
  tab: ActiveTab;
  /** 1 = it waits on the right, -1 = on the left. */
  side: 1 | -1;
  /** Scroll offset when the drag began: the neighbour shows its top, however far this page was scrolled. */
  top: number;
}

/**
 * The pages, on one rail. A horizontal swipe with a finger or pen moves the current page and its
 * neighbour together under the finger; past the commit distance, or on a flick, the neighbour
 * takes over (same order as the pill in the header), otherwise both spring back. Vertical movement
 * stays ordinary scrolling.
 *
 * On touch devices the neighbouring pages are mounted, hidden, in an idle moment, so a swipe never
 * starts with a pause; the page that arrives is that same element, not a second copy. A page
 * reached any other way slides in from the side it lies on. See docs/gestures.md.
 */
export function PageSwiper({ renderPage }: { renderPage: (tab: ActiveTab) => ReactNode }) {
  const { activeTab, setActiveTab } = useApp();
  const ref = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const leaving = useRef(false);
  const arrivedBySwipe = useRef(false);
  const swallowClick = useRef(false);
  const shownTab = useRef(activeTab);
  /**
   * The rail animation that is running, with what ends it at once (see the touch guard below).
   * `commit` marks the last stretch of a committed swipe: a touch that ends it lands the page and
   * then swipes normally (a quick second swipe goes on to the next page).
   */
  const running = useRef<RailRun | null>(null);
  const [peek, setPeek] = useState<Peek | null>(null);
  /** Pages kept mounted but hidden, ready to ride along. */
  const [warm, setWarm] = useState<ActiveTab[]>([]);

  // Touch and pen only (a mouse cannot swipe), and never in the way of the page that just opened.
  useEffect(() => {
    if (!window.matchMedia?.('(any-pointer: coarse)').matches) return;
    return whenIdle(() => {
      setWarm([neighbourTab(activeTab, -1), neighbourTab(activeTab, 1)].filter((tab): tab is ActiveTab => tab !== null));
    }, 1200);
  }, [activeTab]);

  useLayoutEffect(() => {
    if (shownTab.current === activeTab) return;
    const order = tabOrder();
    const direction = order.indexOf(activeTab) > order.indexOf(shownTab.current) ? 1 : -1;
    shownTab.current = activeTab;
    leaving.current = false;
    // The dock (when it appears) enters from the same side as the page.
    document.documentElement.style.setProperty('--kc-swipe-dir', String(direction));
    const el = ref.current;
    if (!el) return;
    // Back to rest in the same frame the new page takes the first place on the rail.
    el.getAnimations().forEach((animation) => animation.cancel());
    el.style.transform = '';
    if (arrivedBySwipe.current) {
      arrivedBySwipe.current = false; // it travelled in under the finger: nothing left to animate
      return;
    }
    if (prefersReducedMotion() || typeof el.animate !== 'function') return;
    const enter = el.animate(
      [
        { opacity: 0.3, transform: `translate3d(${direction * ENTER_OFFSET_PX}px, 0, 0)` },
        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
      ],
      { duration: SPRING.soft.duration, easing: SPRING.soft.easing },
    );
    const mine: RailRun = {
      end: () => enter.cancel(), // no fill: cancelling is the finished state
      grab: () => {
        const at = railOffset(el);
        enter.cancel();
        el.style.transform = at ? `translate3d(${at.toFixed(1)}px, 0, 0)` : '';
        running.current = null;
        return at;
      },
    };
    running.current = mine;
    enter.onfinish = enter.oncancel = () => {
      if (running.current === mine) running.current = null;
    };
  }, [activeTab]);

  // A new touch (or key) ends whatever the rail is doing at once: the slide-in, the spring back, or
  // the last stretch of a committed swipe (the new page is then simply in place). Kakcal's rule.
  useEffect(() => {
    const endNow = (event: Event) => {
      const run = running.current;
      if (!run) return;
      // A finger that lands on the rail itself catches a slide-in or a spring-back where it is (the
      // page's own pointerdown below does that, with no jump). Everything else, and every key,
      // ends the animation at once. A committed swipe is never caught: its new page lands now (this
      // runs in the capture phase, before the page's own pointerdown) and the touch swipes from it.
      if (run.grab && event.type !== 'keydown' && ref.current?.contains(event.target as Node)) return;
      run.end();
    };
    (['pointerdown', 'touchstart', 'keydown'] as const).forEach((type) => document.addEventListener(type, endNow, { capture: true, passive: true }));
    return () => (['pointerdown', 'touchstart', 'keydown'] as const).forEach((type) => document.removeEventListener(type, endNow, true));
  }, []);

  /** Lets go of the rail: it springs back to rest from wherever the finger left it. */
  const settle = () => {
    const el = ref.current;
    if (!el) return;
    const from = el.style.transform || 'translate3d(0, 0, 0)';
    el.style.transform = '';
    const rest = () => {
      el.style.willChange = '';
      setPeek(null); // the neighbour leaves once it is out of sight again
    };
    if (prefersReducedMotion() || typeof el.animate !== 'function') {
      rest();
      return;
    }
    const back = el.animate([{ transform: from }, { transform: 'translate3d(0, 0, 0)' }], { duration: SPRING.soft.duration, easing: SPRING.soft.easing });
    const mine: RailRun = {
      end: () => {
        back.onfinish = null;
        back.cancel(); // at rest at once
        running.current = null;
        rest();
      },
      // A new swipe starts from where the page is now, not from the rest position.
      grab: () => {
        const at = railOffset(el);
        back.onfinish = null;
        back.cancel();
        el.style.transform = `translate3d(${at.toFixed(1)}px, 0, 0)`;
        running.current = null;
        return at;
      },
    };
    running.current = mine;
    back.onfinish = () => {
      if (running.current === mine) running.current = null;
      rest();
    };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    swallowClick.current = false;
    gesture.current = null;
    const target = event.target as Element;
    const eligible =
      event.pointerType !== 'mouse' &&
      event.isPrimary &&
      !document.documentElement.classList.contains('kc-sheet-open') &&
      event.clientX >= EDGE_RESERVED_PX &&
      event.clientX <= window.innerWidth - EDGE_RESERVED_PX &&
      !target.closest(OWN_GESTURE) &&
      !hasHorizontalScroller(target, event.currentTarget);
    // A new touch never waits for an animation: it ends it, or (a slide-in or spring-back that this
    // touch can swipe) catches the page exactly where it is and carries on from there.
    const run = running.current;
    let base = 0;
    if (run) {
      if (eligible && run.grab) base = run.grab();
      else run.end();
    }
    if (!eligible || leaving.current) return;
    const caught = Math.abs(base) > 1;
    gesture.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      samples: [{ pos: event.clientX, at: event.timeStamp }],
      locked: caught,
      dx: 0,
      base: caught ? base : 0,
      pos: caught ? base : 0,
    };
    if (caught) {
      // The finger has the page: no dead zone before it follows, and the touch is not a tap.
      swallowClick.current = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const side = base < 0 ? 1 : -1;
      const neighbour = neighbourTab(activeTab, side);
      if (neighbour && (peek?.tab !== neighbour || peek.side !== side)) setPeek({ tab: neighbour, side, top: Math.max(0, window.scrollY) });
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const el = ref.current;
    if (!g || !el || g.id !== event.pointerId) return;
    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;

    if (!g.locked) {
      if (Math.abs(dy) > SCROLL_PX && Math.abs(dy) >= Math.abs(dx)) {
        gesture.current = null; // this is a scroll
        return;
      }
      if (Math.abs(dx) < TAKEOVER_PX || Math.abs(dx) < Math.abs(dy) * TAKEOVER_RATIO) return;
      g.locked = true;
      swallowClick.current = true; // the drag must not also press what is under the finger
      el.getAnimations().forEach((animation) => animation.cancel());
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    el.style.willChange = 'transform'; // its own layer for the length of the drag
    trackSample(g.samples, event.clientX, event.timeStamp);
    g.dx = dx;
    // The side follows where the rail is (a page that was caught off-centre may be dragged back across rest).
    const lead = g.base + dx * FOLLOW;
    const side = (lead === 0 ? dx : lead) < 0 ? 1 : -1;
    const neighbour = neighbourTab(activeTab, side);
    // The page on the side being revealed joins the rail (and changes if the finger turns round).
    if (neighbour && (peek?.tab !== neighbour || peek.side !== side)) setPeek({ tab: neighbour, side, top: Math.max(0, window.scrollY) });
    g.pos = neighbour ? lead : g.base + dx * RUBBER;
    el.style.transform = `translate3d(${g.pos.toFixed(1)}px, 0, 0)`;
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const el = ref.current;
    gesture.current = null;
    if (!g || !el || g.id !== event.pointerId || !g.locked) return;

    const step = g.pos < 0 ? 1 : -1;
    const next = neighbourTab(activeTab, step);
    const distance = Math.abs(g.pos) / FOLLOW;
    const commitAt = Math.min(COMMIT_MAX_PX, Math.max(COMMIT_MIN_PX, window.innerWidth * COMMIT_SHARE));
    const speed = releaseSpeed(g.samples, event.timeStamp);
    const flick = Math.abs(speed) > FLICK_SPEED && Math.sign(speed) === Math.sign(g.pos) && distance > FLICK_MIN_PX;
    // A page that was only caught (the finger hardly moved) rests where it belongs.
    const justCaught = g.base !== 0 && Math.abs(g.dx) < CATCH_TAP_PX;
    if (!next || justCaught || (distance < commitAt && !flick)) {
      settle();
      return;
    }

    arrivedBySwipe.current = true;
    // The side the new page lies on: the dock (which only belongs to the Month page) enters or leaves that way.
    document.documentElement.style.setProperty('--kc-swipe-dir', String(step));
    // One render: the neighbour's element is kept (same key) and becomes the current page.
    const promote = () => {
      running.current = null;
      el.style.willChange = '';
      // Synchronous, so the rail is back at rest in the very frame the new page is current: there
      // is no moment in which a new touch could meet the old page, a stale rail or a stuck `leaving`.
      flushSync(() => {
        setActiveTab(next);
        setPillTab(null); // the real page has caught up with the pill
        setPeek(null);
        setWarm((tabs) => (tabs.includes(activeTab) ? tabs : [...tabs, activeTab])); // the page just left is now a neighbour
      });
      leaving.current = false;
    };
    if (prefersReducedMotion() || typeof el.animate !== 'function') {
      promote();
      return;
    }
    // The rail finishes its travel: the neighbour ends exactly where the current page was.
    leaving.current = true;
    setPillTab(next); // the pill changes the moment the swipe is committed, not after the page has travelled
    const travel = el.offsetWidth + RAIL_GAP_PX;
    // The exit carries on at the speed the finger let go with: a hard flick is quick, a slow drag is not hurried.
    const remaining = Math.max(0, travel - Math.abs(g.pos));
    const duration = Math.min(EXIT_MAX_MS, Math.max(COMMIT_MIN_MS, remaining / Math.max(Math.abs(speed), EXIT_MIN_SPEED)));
    const exit = el.animate(
      [{ transform: `translate3d(${g.pos.toFixed(1)}px, 0, 0)` }, { transform: `translate3d(${-step * travel}px, 0, 0)` }],
      { duration, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'forwards' },
    );
    exit.onfinish = promote;
    exit.oncancel = () => {
      setPillTab(null);
      leaving.current = false;
      arrivedBySwipe.current = false;
    };
    // A touch during the last stretch: the new page lands now, and that touch then swipes from it.
    running.current = {
      commit: true,
      end: () => {
        el.style.willChange = '';
        exit.onfinish = null;
        exit.oncancel = null;
        promote();
      },
    };
  };

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (g && g.id === event.pointerId && g.locked) settle();
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!swallowClick.current) return;
    swallowClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  // The current page first, then whatever waits beside it: one keyed list, so a page keeps its
  // element (and its state) when it moves between "hidden", "riding along" and "current".
  const others = tabOrder().filter((tab) => tab !== activeTab && (warm.includes(tab) || peek?.tab === tab));

  return (
    <div
      ref={ref}
      data-page-swipe
      className="kc-swipe-surface relative"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
    >
      {[activeTab, ...others].map((tab) => {
        if (tab === activeTab) {
          return (
            <div key={tab} data-page={tab}>
              {renderPage(tab)}
            </div>
          );
        }
        const riding = peek?.tab === tab ? peek : null;
        return (
          <div
            key={tab}
            data-page={tab}
            aria-hidden="true"
            inert
            className={riding ? 'absolute w-full' : 'hidden'}
            style={riding ? { top: riding.top, left: riding.side > 0 ? `calc(100% + ${RAIL_GAP_PX}px)` : `calc(-100% - ${RAIL_GAP_PX}px)` } : undefined}
          >
            {renderPage(tab)}
          </div>
        );
      })}
    </div>
  );
}
