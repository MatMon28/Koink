import { useEffect, useRef } from 'react';
import { Settings, User } from 'lucide-react';
import { useApp } from '../lib/store';
import { Wordmark } from './Brand';
import { Tabs } from './Tabs';

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
 * (without the header background) as soon as the page is scrolled up again.
 */
export function Header() {
  const { activeTab, setActiveTab, openSheet } = useApp();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const topRowRef = useRef<HTMLDivElement>(null);
  const tabsRowRef = useRef<HTMLDivElement>(null);
  const state = useRef({ lastY: 0, tabs: 1 });

  useEffect(() => {
    const surface = surfaceRef.current;
    const topRow = topRowRef.current;
    const tabsRow = tabsRowRef.current;
    if (!surface || !topRow || !tabsRow) return;
    const s = state.current;

    const apply = () => {
      const top = clamp01(1 - s.lastY / TOP_HIDE_SCROLL_PX);
      const tabs = smoothstep(s.tabs);
      const visible = Math.max(top, tabs);

      topRow.style.height = `${(top * TOP_ROW_HEIGHT_PX).toFixed(2)}px`;
      topRow.style.opacity = top.toFixed(3);
      topRow.style.transform = `translate3d(0, ${((1 - top) * -12).toFixed(2)}px, 0)`;
      topRow.style.pointerEvents = top > 0.45 ? 'auto' : 'none';

      tabsRow.style.opacity = tabs.toFixed(3);
      tabsRow.style.transform = `translate3d(0, ${((1 - tabs) * -8).toFixed(2)}px, 0) scale(${(0.97 + 0.03 * tabs).toFixed(3)})`;
      tabsRow.style.pointerEvents = s.tabs > 0.15 ? 'auto' : 'none';

      // Background and hairline follow only the name row, so scrolling back up reveals just the pill.
      surface.style.setProperty('--header-bg-progress', top.toFixed(3));
      surface.dataset.pillFloating = top < 0.85 ? 'true' : 'false';
      surface.style.paddingTop = visible > 0.02
        ? `calc(max(${(0.25 + 0.5 * top).toFixed(3)}rem, env(safe-area-inset-top)) * ${visible.toFixed(3)})`
        : '0px';
      surface.style.paddingBottom = `${(0.25 * top).toFixed(3)}rem`;
      surface.style.pointerEvents = top > 0.2 ? 'auto' : 'none';
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
      apply();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [activeTab]);

  const onTitle = () => {
    if (activeTab !== 'month') setActiveTab('month');
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const iconButton =
    'kc-icon-btn pressable w-11 h-11 rounded-full bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center';

  return (
    <header className="sticky top-0 z-40 h-[calc(max(0.75rem,env(safe-area-inset-top))+6.25rem)] pointer-events-none">
      <div
        ref={surfaceRef}
        className="kc-header-surface pointer-events-auto border-b border-transparent px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-1"
      >
        <div className="max-w-4xl mx-auto">
          <div
            ref={topRowRef}
            className="grid grid-cols-[1fr_auto_1fr] items-center overflow-hidden will-change-[height,opacity,transform]"
            style={{ height: `${TOP_ROW_HEIGHT_PX}px` }}
          >
            <div className="flex items-center">
              <button type="button" onClick={() => openSheet({ type: 'profile' })} className={iconButton} title="Profile" aria-label="Profile">
                <User size={21} />
              </button>
            </div>

            <button
              type="button"
              onClick={onTitle}
              aria-label="Koink: go to the Month page"
              title="Koink"
              className="flex justify-self-center rounded-md transition-opacity hover:opacity-80"
            >
              <Wordmark className="h-10 sm:h-11" />
            </button>

            <div className="flex items-center justify-end">
              <button type="button" onClick={() => openSheet({ type: 'settings' })} className={iconButton} title="Settings" aria-label="Settings">
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
