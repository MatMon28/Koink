import { useEffect, useRef } from 'react';
import { Settings, User } from 'lucide-react';
import { PRESS_ANIMATIONS } from '../brand/art.js';
import { useApp } from '../lib/store';
import { Wordmark } from './Brand';
import { Tabs } from './Tabs';
import { t } from '../lib/i18n';

const TOP_HIDE_SCROLL_PX = 48;
const TABS_DELTA_PX = 68;
const TOP_ROW_HEIGHT_PX = 44;
const TABS_ROW_HEIGHT_PX = 52;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (value: number) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

/**
 * Profile (left), name (centre), settings (right), with the page pill below. The name row folds
 * away over the first few pixels of scroll; the pill hides while scrolling down and floats back in
 * (without the header background) as soon as the page is scrolled up again. Tapping the logo makes
 * one of the press animations play on the pig and its coin (`PRESS_ANIMATIONS` in art.js, `data-press`).
 */
export function Header() {
  const { activeTab, setActiveTab, openSheet } = useApp();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const topRowRef = useRef<HTMLDivElement>(null);
  const tabsRowRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLButtonElement>(null);
  const pressTimer = useRef<number | null>(null);
  const lastPress = useRef(-1);
  const state = useRef({ lastY: 0, tabs: 1 });

  useEffect(() => {
    const surface = surfaceRef.current;
    const bg = bgRef.current;
    const topRow = topRowRef.current;
    const tabsRow = tabsRowRef.current;
    if (!surface || !bg || !topRow || !tabsRow) return;
    const s = state.current;
    const written = { topPointer: '', tabsPointer: '', surfacePointer: '', floating: '' };
    let frame = 0;

    // Only opacity and transform change while scrolling (nothing that needs layout, no blur radius
    // to repaint), and at most once per frame: scrolling stays on the compositor.
    const apply = () => {
      frame = 0;
      const top = clamp01(1 - s.lastY / TOP_HIDE_SCROLL_PX);
      const tabs = smoothstep(s.tabs);

      topRow.style.opacity = top.toFixed(3);
      topRow.style.transform = `translate3d(0, ${((1 - top) * -12).toFixed(2)}px, 0)`;
      // The pill rises into the room the name row leaves; --hdr-shift (index.css) is that row plus the padding it frees.
      tabsRow.style.opacity = tabs.toFixed(3);
      tabsRow.style.transform = `translate3d(0, calc(${(top - 1).toFixed(3)} * var(--hdr-shift) + ${((1 - tabs) * -8).toFixed(2)}px), 0) scale(${(0.97 + 0.03 * tabs).toFixed(3)})`;
      // Background and hairline follow only the name row, so scrolling back up reveals just the pill.
      bg.style.opacity = top.toFixed(3);
      // Fully faded = not drawn at all (no layer left over the cards under the header).
      bg.style.visibility = top <= 0.01 ? 'hidden' : 'visible';

      const topPointer = top > 0.45 ? 'auto' : 'none';
      if (written.topPointer !== topPointer) topRow.style.pointerEvents = written.topPointer = topPointer;
      const tabsPointer = s.tabs > 0.15 ? 'auto' : 'none';
      if (written.tabsPointer !== tabsPointer) tabsRow.style.pointerEvents = written.tabsPointer = tabsPointer;
      const surfacePointer = top > 0.2 ? 'auto' : 'none';
      if (written.surfacePointer !== surfacePointer) surface.style.pointerEvents = written.surfacePointer = surfacePointer;
      const floating = top < 0.85 ? 'true' : 'false';
      if (written.floating !== floating) surface.dataset.pillFloating = written.floating = floating;
    };

    const read = () => Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);
    s.lastY = read();
    s.tabs = 1;
    apply();

    const onScroll = () => {
      if (document.documentElement.classList.contains('kc-sheet-open')) return;
      const y = read();
      const dy = y - s.lastY;
      s.lastY = y;
      // Scrolling down fades the pill out, scrolling up brings it back by the same distance.
      s.tabs = y <= 4 ? 1 : clamp01(s.tabs - dy / TABS_DELTA_PX);
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, [activeTab]);

  useEffect(() => () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
  }, []);

  /**
   * Plays a press animation on the logo: random, never the same twice in a row (`?press=1` to `?press=5`
   * forces one). Restarts when the logo is tapped again while one plays; the attribute is removed when it ends.
   */
  const press = () => {
    const logo = logoRef.current;
    if (!logo) return;
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    const forced = Number(new URLSearchParams(window.location.search).get('press'));
    let next: number;
    if (Number.isInteger(forced) && forced >= 1 && forced <= PRESS_ANIMATIONS.length) next = forced - 1;
    else {
      const choices = PRESS_ANIMATIONS.map((_, index) => index).filter((index) => index !== lastPress.current);
      next = choices[Math.floor(Math.random() * choices.length)];
    }
    lastPress.current = next;
    logo.removeAttribute('data-press');
    void logo.getBoundingClientRect(); // restart the CSS animations
    logo.setAttribute('data-press', PRESS_ANIMATIONS[next].id);
    pressTimer.current = window.setTimeout(() => logo.removeAttribute('data-press'), PRESS_ANIMATIONS[next].duration + 100);
  };

  const onTitle = () => {
    press();
    if (activeTab !== 'month') setActiveTab('month');
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const iconButton =
    'kc-icon-btn pressable w-11 h-11 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center';

  return (
    <header className="sticky top-0 z-40 h-[calc(max(0.75rem,env(safe-area-inset-top))+6.25rem)] pointer-events-none">
      <div
        ref={surfaceRef}
        className="kc-header-surface pointer-events-auto px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1"
      >
        <div ref={bgRef} className="kc-header-bg" aria-hidden="true" />
        <div className="relative max-w-4xl mx-auto">
          <div
            ref={topRowRef}
            className="grid grid-cols-[1fr_auto_1fr] items-center will-change-[opacity,transform]"
            style={{ height: `${TOP_ROW_HEIGHT_PX}px` }}
          >
            <div className="flex items-center">
              <button type="button" onClick={() => openSheet({ type: 'profile' })} className={iconButton} title={t('Profile')} aria-label={t('Profile')}>
                <User size={21} />
              </button>
            </div>

            <button
              ref={logoRef}
              type="button"
              onClick={onTitle}
              aria-label={t('Koink: go to the Month page')}
              title={t('Koink')}
              className="kc-logo-btn flex justify-self-center rounded-md transition-opacity hover:opacity-80"
            >
              <Wordmark className="h-10 sm:h-11" />
            </button>

            <div className="flex items-center justify-end">
              <button type="button" onClick={() => openSheet({ type: 'settings' })} className={iconButton} title={t('Settings')} aria-label={t('Settings')}>
                <Settings size={22} />
              </button>
            </div>
          </div>

          <div ref={tabsRowRef} className="will-change-[opacity,transform]" style={{ height: `${TABS_ROW_HEIGHT_PX}px` }}>
            <Tabs />
          </div>
        </div>
      </div>
    </header>
  );
}
