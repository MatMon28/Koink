import { useCallback, useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react';
import { ListOrdered, Target, ChartColumn, Wallet } from 'lucide-react';
import { ICON } from '../lib/icons';
import { useApp } from '../lib/store';
import { tabOrder } from '../lib/tabs';
import { getPillPos, subscribePillPos, usePillTab } from '../lib/pillTab';
import type { ActiveTab } from '../lib/types';
import { t } from '../lib/i18n';

// Each page has its own pastel when it is the active one (the style presets replace it with theirs).
// `ink` is the text colour that goes with it: the label is mixed between it and the idle colour.
const NAV_META: Record<ActiveTab, { label: string; icon: typeof Wallet; activeClass: string; ink: string }> = {
  month: { label: 'Month', icon: Wallet, activeClass: 'bg-danger text-activity-ink', ink: 'var(--color-activity-ink)' },
  transactions: { label: 'Transactions', icon: ListOrdered, activeClass: 'bg-wants text-wants-ink', ink: 'var(--color-wants-ink)' },
  budgets: { label: 'Budgets', icon: Target, activeClass: 'bg-weight text-weight-ink', ink: 'var(--color-weight-ink)' },
  stats: { label: 'Statistics', icon: ChartColumn, activeClass: 'bg-needs text-needs-ink', ink: 'var(--color-needs-ink)' },
};

/** The pill glides to a page chosen by tapping the pill (a swipe drives it frame by frame instead). */
const GLIDE_MS = 260;

const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * The page pill. One coloured indicator sits behind the buttons and is placed by a single number,
 * the pill position (`lib/pillTab.ts`): 0 = first page, 1.5 = half way from the second to the third.
 * `PageSwiper` publishes that number every frame while a finger drags the pages, while a committed
 * swipe travels and while a cancelled one springs back, so the pill moves and changes colour with
 * the pages, never at a given point of them. At rest (`null`) it sits on the active page and glides
 * there by itself when the page was picked with a tap.
 *
 * For a position `p`, button `i` has the weight `w = max(0, 1 - |p - i|)` (`--w`, 0..1): its label
 * opens by `w` (width, opacity) and its text goes from the idle colour to its own ink by `w`. The
 * indicator has one layer per page in that page's pastel; the layer of the page below the position
 * is opaque and the one above fades in by the fraction, so the colour mixes gradually. All of it is
 * written straight to the DOM (no React render per frame). CSS: `.kc-nav-*` in `index.css`.
 */
export function Tabs() {
  const { activeTab, setActiveTab, data } = useApp();
  const shownTab = usePillTab() ?? activeTab; // the page a committed swipe is going to (a tap on it scrolls up)
  const ultra = data.settings.ultraMinimal; // only icons: the active page is a filled circle
  // The order is tabOrder(), the same one the page swipe follows (Budgets can be hidden in Settings).
  const order = tabOrder();
  const navItems = order.map((id) => ({ id, ...NAV_META[id] }));

  const navRef = useRef<HTMLElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const layers = useRef<(HTMLSpanElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  /** Where the pill is drawn now (null before the first frame). */
  const shown = useRef<number | null>(null);
  /** Where the glide is going, to start it only once per change. */
  const glideTarget = useRef<number | null>(null);
  const glide = useRef(0);
  const latest = useRef({ index: 0, count: 0 });

  /** Draws the pill at `pos`. */
  const apply = useCallback((pos: number) => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    const count = latest.current.count;
    if (!nav || !indicator || count === 0) return;
    const p = Math.min(count - 1, Math.max(0, pos));
    const lo = Math.floor(p);
    const hi = Math.min(count - 1, lo + 1);
    const fraction = hi === lo ? 0 : p - lo;
    for (let i = 0; i < count; i += 1) {
      buttons.current[i]?.style.setProperty('--w', Math.max(0, 1 - Math.abs(p - i)).toFixed(4));
      const layer = layers.current[i];
      if (layer) layer.style.opacity = i === lo ? '1' : i === hi ? fraction.toFixed(4) : '0';
    }
    const a = buttons.current[lo];
    const b = buttons.current[hi];
    if (!a || !b) return;
    // The buttons have just changed width: measure them (sub-pixel, and independent of any scale on the header).
    const box = nav.getBoundingClientRect();
    const scale = nav.offsetWidth ? box.width / nav.offsetWidth : 1;
    const edges = (button: HTMLElement) => {
      const rect = button.getBoundingClientRect();
      return { left: (rect.left - box.left) / scale - nav.clientLeft, right: (rect.right - box.left) / scale - nav.clientLeft };
    };
    const first = edges(a);
    const second = edges(b);
    const left = first.left + (second.left - first.left) * fraction;
    const right = first.right + (second.right - first.right) * fraction;
    indicator.style.transform = `translate3d(${left.toFixed(2)}px, 0, 0)`;
    indicator.style.width = `${Math.max(0, right - left).toFixed(2)}px`;
  }, []);

  /** Moves the pill to page `target` with a short glide (or at once when there is nothing to glide from). */
  const glideTo = useCallback(
    (target: number) => {
      cancelAnimationFrame(glide.current);
      glide.current = 0;
      glideTarget.current = target;
      const from = shown.current;
      if (from === null || reducedMotion() || Math.abs(from - target) < 0.002) {
        shown.current = target;
        apply(target);
        return;
      }
      const started = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - started) / GLIDE_MS);
        const value = from + (target - from) * (1 - (1 - k) ** 3);
        shown.current = value;
        apply(value);
        glide.current = k < 1 ? requestAnimationFrame(step) : 0;
      };
      glide.current = requestAnimationFrame(step);
    },
    [apply],
  );

  /** Label widths and the pill, redrawn (after a render, a font load or a language change). */
  const refresh = useCallback(() => {
    labels.current.forEach((label, i) => {
      if (label) buttons.current[i]?.style.setProperty('--label-w', `${label.scrollWidth}px`);
    });
    apply(shown.current ?? latest.current.index);
  }, [apply]);

  // After every render: the page may have changed (a tap on the pill, Back), or the labels' text.
  useLayoutEffect(() => {
    latest.current = { index: order.indexOf(activeTab), count: order.length };
    if (getPillPos() === null && glideTarget.current !== latest.current.index) glideTo(latest.current.index);
    else refresh();
  });

  useLayoutEffect(() => {
    const onPosition = () => {
      const pos = getPillPos();
      if (pos === null) {
        glideTo(latest.current.index); // the rail is at rest: settle on the active page (no move if it is there)
        return;
      }
      cancelAnimationFrame(glide.current);
      glide.current = 0;
      glideTarget.current = null;
      shown.current = pos;
      apply(pos);
    };
    const unsubscribe = subscribePillPos(onPosition);
    return () => {
      unsubscribe();
      cancelAnimationFrame(glide.current);
    };
  }, [apply, glideTo]);

  useEffect(() => {
    let cancelled = false;
    void document.fonts?.ready.then(() => !cancelled && refresh());
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const select = (id: ActiveTab) => {
    if (shownTab === id) window.scrollTo({ top: 0, behavior: 'smooth' });
    else setActiveTab(id);
  };

  return (
    <div className="flex items-center justify-center pt-1.5 pb-1.5">
      <nav
        ref={navRef}
        aria-label={t('Primary')}
        className="kc-nav-pill relative inline-flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full max-w-full"
      >
        {/* One layer per page, each in its own pastel; they fade into each other, so the colour changes gradually. */}
        <span ref={indicatorRef} aria-hidden="true" className="kc-nav-indicator">
          {navItems.map((item, i) => (
            <span
              key={item.id}
              ref={(el) => {
                layers.current[i] = el;
              }}
              className={`kc-nav-layer kc-nav-tab kc-nav-tab-active rounded-full ${item.activeClass}`}
            />
          ))}
        </span>
        {navItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              onClick={() => select(item.id)}
              title={t(item.label)}
              aria-label={t(item.label)}
              aria-current={shownTab === item.id ? 'page' : undefined}
              data-ultra={ultra ? '' : undefined}
              style={{ '--tab-ink-classic': item.ink } as CSSProperties}
              className="kc-nav-btn pressable rounded-full text-xs sm:text-sm font-bold whitespace-nowrap"
            >
              <Icon size={ICON.md} aria-hidden="true" />
              {!ultra && (
                <span
                  ref={(el) => {
                    labels.current[i] = el;
                  }}
                  className="kc-nav-label"
                >
                  {t(item.label)}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
