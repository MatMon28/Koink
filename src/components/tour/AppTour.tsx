import { useEffect, useMemo, useRef, useState } from 'react';
import { Apple, ArrowLeft, ArrowRight, ArrowUpRight, Download, Monitor, MousePointer2, Smartphone } from 'lucide-react';
import { Wordmark } from '../Brand';
import { navigateToView, openInstallGuide, type InstallTarget } from '../InstallGuide';
import { NotificationShowcase } from './NotificationShowcase';
import { WidgetGallery } from './WidgetGallery';
import {
  isTourReadyMessage,
  TOUR_CHANNEL,
  TOUR_STEPS,
  TOUR_UI,
  type TourLang,
  type TourScreen,
} from './tourContent';
import { detectLanguage, setLanguage } from '../../lib/i18n';
import { STORAGE_KEY } from '../../lib/storage';
import { applyThemeAttributes, DEFAULT_MONO_HUE, normalizeMonoHue, normalizeTheme, normalizeThemeStyle } from '../../lib/themes';
import type { Theme, ThemeStyle } from '../../lib/types';

const LANG_KEY = 'koink_lang';

function readLang(): TourLang {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { settings?: { language?: string } };
      if (parsed?.settings?.language === 'it') return 'it';
      if (parsed?.settings?.language === 'en') return 'en';
    }
    const fallback = localStorage.getItem(LANG_KEY);
    if (fallback === 'it' || fallback === 'en') return fallback;
  } catch {
    /* ignore */
  }
  return detectLanguage();
}

function readThemeConfig(): { theme: Theme; themeStyle: ThemeStyle; monoHue: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? ((JSON.parse(raw) as { settings?: Record<string, unknown> }).settings ?? {}) : {};
    return {
      theme: normalizeTheme(parsed.theme),
      themeStyle: normalizeThemeStyle(parsed.themeStyle),
      monoHue: normalizeMonoHue(parsed.monoHue),
    };
  } catch {
    return { theme: 'light', themeStyle: 'classic', monoHue: DEFAULT_MONO_HUE };
  }
}

function stepFromHash(): number {
  const index = TOUR_STEPS.findIndex((step) => step.id === window.location.hash.slice(1));
  return index >= 0 ? index : 0;
}

const journalBase = () => `${window.location.origin}${window.location.pathname}`;
const targetOrigin = () => (window.location.origin === 'null' ? '*' : window.location.origin);
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The guided webview: each page and sheet of the app is explained beside the live journal,
 * which the tour drives through the same-origin postMessage bridge. Notifications and widgets come last.
 */
export function AppTour() {
  const [index, setIndex] = useState(stepFromHash);
  const [lang, setLang] = useState<TourLang>(readLang);
  const [themeCfg, setThemeCfg] = useState(readThemeConfig);
  // Increases each time the embedded journal starts, so its first command is never lost.
  const [bootCount, setBootCount] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  const last = TOUR_STEPS.length - 1;
  const step = TOUR_STEPS[index];
  const ui = TOUR_UI[lang];
  const appUrl = useMemo(() => `${journalBase()}?view=app&tour=1`, []);
  const journalUrl = useMemo(() => `${journalBase()}?view=app`, []);

  const go = (delta: number) => setIndex((current) => Math.min(last, Math.max(0, current + delta)));

  useEffect(() => {
    applyThemeAttributes(themeCfg.theme, themeCfg.themeStyle, themeCfg.monoHue);
  }, [themeCfg]);

  useEffect(() => {
    setLanguage(lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // The theme and language follow the journal's own settings, including changes made inside it.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === LANG_KEY) {
        setThemeCfg(readThemeConfig());
        setLang(readLang());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (window.location.origin !== 'null' && event.origin !== window.location.origin) return;
      if (isTourReadyMessage(event.data)) {
        setThemeCfg(readThemeConfig());
        setLang(readLang());
        setBootCount((count) => count + 1);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Show the current page each time the journal starts, or the reader moves to another step.
  useEffect(() => {
    if (bootCount === 0) return;
    frameRef.current?.contentWindow?.postMessage(
      { channel: TOUR_CHANNEL, type: 'show-screen', screen: step.screen },
      targetOrigin(),
    );
  }, [bootCount, step.id, step.screen]);

  useEffect(() => {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${step.id}`);
  }, [step.id]);

  // Following a link such as #widgets moves the tour to that page without reloading it.
  useEffect(() => {
    const onHash = () => setIndex(stepFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last]);

  const handleAction = (action: string) => {
    frameRef.current?.contentWindow?.postMessage({ channel: TOUR_CHANNEL, type: 'open-action', action }, targetOrigin());
    phoneRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  };

  // Notification previews drive the live app the same way the widget icons do.
  const handleScreen = (screen: TourScreen) => {
    frameRef.current?.contentWindow?.postMessage({ channel: TOUR_CHANNEL, type: 'show-screen', screen }, targetOrigin());
    phoneRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
  };

  const chooseLanguage = (next: TourLang) => {
    if (next === lang) return;
    try {
      localStorage.setItem(LANG_KEY, next);
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { settings?: Record<string, unknown> };
        parsed.settings = { ...(parsed.settings ?? {}), language: next };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
    } catch {
      /* ignore */
    }
    setLanguage(next);
    setLang(next);
    frameRef.current?.contentWindow?.location.reload();
  };

  const phone = (maxWidth: number) => (
    <div ref={phoneRef} className="mx-auto w-full" style={{ maxWidth }}>
      <div className="rounded-[46px] bg-[#24201C] p-2.5 shadow-[0_30px_60px_-28px_rgba(36,32,28,0.55)]">
        <div className="h-[640px] overflow-hidden rounded-[36px] bg-[var(--bg)]">
          <iframe ref={frameRef} src={appUrl} title={ui.liveAppTitle} className="block size-full border-0" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold text-[var(--muted)]">
        <span>{ui.liveApp}</span>
        <a
          href={journalUrl}
          onClick={(event) => navigateToView('app', event)}
          className="inline-flex items-center gap-1 text-[var(--text)] hover:underline underline-offset-4"
        >
          {ui.openApp}
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-[var(--bg)] font-sans text-[var(--text)]">
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Wordmark className="h-8 sm:h-9" />
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div role="group" aria-label={ui.language} className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-1">
              {(['en', 'it'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lang === code}
                  onClick={() => chooseLanguage(code)}
                  className={`min-h-8 rounded-full px-3 text-xs font-extrabold uppercase transition-colors ${
                    lang === code ? 'bg-[var(--text)] text-[var(--bg)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => openInstallGuide(undefined, lang)}
              className="inline-flex min-h-10 items-center gap-1.5 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)]"
            >
              <Download size={15} aria-hidden="true" />
              <span>{ui.installCta}</span>
            </button>
            <a
              href={journalUrl}
              onClick={(event) => navigateToView('app', event)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--text)] px-4 text-xs font-extrabold text-[var(--bg)]"
            >
              {ui.openApp}
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">{ui.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{ui.pageTitle}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">{ui.pageLede}</p>
        </div>

        <section aria-label={ui.installHeading} className="mb-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#C9EFD3] text-[#174A2B]">
              <Download size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">{ui.installCta}</p>
              <h2 className="mt-1 text-lg font-extrabold tracking-tight sm:text-xl">{ui.installHeading}</h2>
              <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--muted)] sm:text-[13px]">{ui.installLede}</p>
            </div>
            <button
              type="button"
              onClick={() => openInstallGuide(undefined, lang)}
              className="pressable inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#1E5E3A] px-5 text-sm font-extrabold text-[#EAF7EE] hover:bg-[#174A2B]"
            >
              {ui.installCta}
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {([
              ['ios', ui.installIos, Apple],
              ['android', ui.installAndroid, Smartphone],
              ['desktop', ui.installDesktop, Monitor],
            ] as Array<[InstallTarget, string, typeof Apple]>).map(([target, label, Icon]) => (
              <button
                key={target}
                type="button"
                onClick={() => openInstallGuide(target, lang)}
                className="pressable flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-2 text-[11px] font-extrabold text-[var(--text)] hover:bg-[var(--hover)] sm:text-xs"
              >
                <Icon size={15} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-[var(--muted)]">
            <ArrowUpRight size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{ui.installedNote}</span>
          </p>
        </section>

        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <section aria-label={ui.pages} className="min-w-0">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--inset)]" aria-hidden="true">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${((index + 1) / TOUR_STEPS.length) * 100}%`, backgroundColor: step.accent }}
              />
            </div>

            <div key={step.id} className="anim-page mt-7">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider"
                style={{ backgroundColor: step.accent, color: step.ink }}
              >
                {step.short[lang]}
              </span>
              <h2 id="tour-step-title" className="mt-4 text-3xl font-extrabold tracking-tight">{step.title[lang]}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">{step.body[lang]}</p>
              <ul className="mt-6 space-y-3">
                {step.points[lang].map((point) => (
                  <li key={point} className="flex gap-3 text-[15px] leading-relaxed">
                    <span className="mt-2 size-2 shrink-0 rounded-full" style={{ backgroundColor: step.accent }} aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex items-start gap-2 text-xs font-semibold text-[var(--muted)]">
                <MousePointer2 size={14} className="mt-px shrink-0" aria-hidden="true" />
                <span>{ui.tryIt}</span>
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={index === 0}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-extrabold text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-40"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                {ui.back}
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={index === last}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--text)] px-5 text-sm font-extrabold text-[var(--bg)] disabled:opacity-40"
              >
                {ui.next}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <span className="ml-auto text-xs font-bold tabular-nums text-[var(--muted)]">{ui.pageCount(index + 1, TOUR_STEPS.length)}</span>
            </div>

            <nav aria-label={ui.pages} className="mt-10 border-t border-[var(--border)] pt-6">
              <ol className="flex flex-wrap gap-1.5">
                {TOUR_STEPS.map((item, position) => {
                  const active = position === index;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setIndex(position)}
                        aria-current={active ? 'step' : undefined}
                        className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-bold transition-colors ${
                          active ? 'border-transparent' : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                        style={active ? { backgroundColor: item.accent, color: item.ink } : undefined}
                      >
                        <span className="tabular-nums">{position + 1}</span>
                        {item.short[lang]}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </section>

          <section
            aria-label={ui.liveApp}
            className={`min-w-0 ${step.kind === 'widgets' || step.kind === 'notifications' ? '' : 'lg:sticky lg:top-24'}`}
          >
            {/* The phone keeps the same position on every step, so the journal never reloads when the step changes. */}
            <div className="grid gap-10">
              {step.kind === 'widgets' ? (
                <WidgetGallery ui={ui} lang={lang} onAction={handleAction} />
              ) : null}
              {step.kind === 'notifications' ? (
                <NotificationShowcase ui={ui} lang={lang} onOpen={handleScreen} />
              ) : null}
              {phone(340)}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
