import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Apple,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Download,
  Monitor,
  MousePointer2,
  Smartphone,
} from 'lucide-react';
import { openInstallGuide, type InstallTarget } from '../InstallGuide';
import { Wordmark } from '../Brand';
import { TOUR_STEPS, TOUR_UI, type TourLang } from './tourContent';

const LANG_KEY = 'koink_lang';

function readLang(): TourLang {
  try {
    return localStorage.getItem(LANG_KEY) === 'it' ? 'it' : 'en';
  } catch {
    return 'en';
  }
}

function stepFromHash(): number {
  if (typeof window === 'undefined') return 0;
  const hash = window.location.hash.slice(1);
  const index = TOUR_STEPS.findIndex((step) => step.id === hash);
  return index >= 0 ? index : 0;
}

const journalBase = () => {
  if (typeof window === 'undefined') return './';
  return `${window.location.origin}${window.location.pathname}`;
};

const targetOrigin = () => {
  if (typeof window === 'undefined') return '*';
  return window.location.origin === 'null' ? '*' : window.location.origin;
};

export function AppTour() {
  const [index, setIndex] = useState(stepFromHash);
  const [lang, setLang] = useState<TourLang>(readLang);
  const [bootCount, setBootCount] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  const last = TOUR_STEPS.length - 1;
  const step = TOUR_STEPS[index];
  const ui = TOUR_UI[lang];

  const appUrl = useMemo(() => `${journalBase()}?view=app&tour=1`, []);
  const journalUrl = useMemo(() => `${journalBase()}?view=app`, []);

  const go = (delta: number) => {
    setIndex((current) => Math.min(last, Math.max(0, current + delta)));
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Listen for iframe ready message
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === 'koink:ready') {
        setBootCount((c) => c + 1);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Post current tour step screen to embedded journal
  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage(
      { channel: 'koink', type: 'show-screen', screen: step.screen },
      targetOrigin(),
    );
  }, [bootCount, step.id, step.screen]);

  // Update hash when step changes
  useEffect(() => {
    history.replaceState(null, '', `#${step.id}`);
  }, [step.id]);

  // Handle URL hash changes
  useEffect(() => {
    const onHash = () => setIndex(stepFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Keyboard navigation with arrow keys
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last]);

  const chooseLanguage = (next: TourLang) => {
    if (next === lang) return;
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {}
    setLang(next);
    frameRef.current?.contentWindow?.location.reload();
  };

  const handleOpenApp = () => {
    try {
      localStorage.setItem('koink_tour_seen', '1');
    } catch {}
    window.location.href = journalUrl;
  };

  return (
    <div className="min-h-dvh bg-[var(--bg)] font-sans text-[var(--text)]">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <Wordmark className="h-9 sm:h-10" />

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {/* Language switch */}
            <div
              role="group"
              aria-label={ui.language}
              className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface)] p-1"
            >
              {(['en', 'it'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lang === code}
                  onClick={() => chooseLanguage(code)}
                  className={`min-h-8 rounded-full px-3 text-xs font-extrabold uppercase transition-colors ${
                    lang === code
                      ? 'bg-[var(--text)] text-[var(--on-text)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Install Guide CTA */}
            <button
              type="button"
              onClick={() => openInstallGuide(undefined, lang)}
              className="inline-flex min-h-10 items-center gap-1.5 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)]"
            >
              <Download size={15} aria-hidden="true" />
              <span>{ui.installCta}</span>
            </button>

            {/* Open Koink button */}
            <button
              type="button"
              onClick={handleOpenApp}
              className="pressable inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--text)] px-4 text-xs font-extrabold text-[var(--on-text)] shadow-sm hover:opacity-90"
            >
              <span>{ui.openApp}</span>
              <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-8 sm:pt-10">
        {/* Hero Info */}
        <div className="mb-8 max-w-2xl">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">
            {ui.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {ui.pageTitle}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
            {ui.pageLede}
          </p>
        </div>

        {/* Installation banner card */}
        <section
          aria-label={ui.installHeading}
          className="mb-10 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 shadow-sm"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#C9EFD3] text-[#174A2B]">
              <Download size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">
                {ui.installCta}
              </p>
              <h2 className="mt-0.5 text-base font-extrabold tracking-tight sm:text-lg">
                {ui.installHeading}
              </h2>
              <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--muted)] sm:text-[13px]">
                {ui.installLede}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openInstallGuide(undefined, lang)}
              className="pressable inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#1E5E3A] px-5 text-sm font-extrabold text-[#EAF7EE] shadow hover:bg-[#174A2B]"
            >
              <span>{ui.installCta}</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {(
              [
                ['ios', ui.installIos, Apple],
                ['android', ui.installAndroid, Smartphone],
                ['desktop', ui.installDesktop, Monitor],
              ] as Array<[InstallTarget, string, typeof Apple]>
            ).map(([target, label, Icon]) => (
              <button
                key={target}
                type="button"
                onClick={() => openInstallGuide(target, lang)}
                className="pressable flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-2 text-[11px] font-extrabold text-[var(--text)] hover:bg-[var(--hover)] sm:text-xs"
              >
                <Icon size={14} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          <p className="mt-3 flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-[var(--muted)]">
            <ArrowUpRight size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{ui.installedNote}</span>
          </p>
        </section>

        {/* Tour Navigation & Live App Side-by-Side */}
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          {/* Left: Step Explanations & Controls */}
          <section aria-label={ui.pages} className="min-w-0">
            {/* Step Progress Bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--inset)]" aria-hidden="true">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${((index + 1) / TOUR_STEPS.length) * 100}%`,
                  backgroundColor: step.accent,
                }}
              />
            </div>

            {/* Active Step Content */}
            <div key={step.id} className="mt-7">
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-sm"
                style={{ backgroundColor: step.accent, color: step.ink }}
              >
                {step.short[lang]}
              </span>

              <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">
                {step.title[lang]}
              </h2>

              <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
                {step.body[lang]}
              </p>

              <ul className="mt-6 space-y-3">
                {step.points[lang].map((point) => (
                  <li key={point} className="flex gap-3 text-[15px] leading-relaxed">
                    <span
                      className="mt-2 size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: step.accent }}
                      aria-hidden="true"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-6 flex items-start gap-2 text-xs font-semibold text-[var(--muted)]">
                <MousePointer2 size={14} className="mt-px shrink-0" aria-hidden="true" />
                <span>{ui.tryIt}</span>
              </p>
            </div>

            {/* Back / Next Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={index === 0}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-extrabold text-[var(--text)] hover:bg-[var(--hover)] disabled:opacity-40"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span>{ui.back}</span>
              </button>

              <button
                type="button"
                onClick={() => go(1)}
                disabled={index === last}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--text)] px-5 text-sm font-extrabold text-[var(--on-text)] disabled:opacity-40"
              >
                <span>{ui.next}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>

              <span className="ml-auto text-xs font-bold tabular-nums text-[var(--muted)]">
                {ui.pageCount(index + 1, TOUR_STEPS.length)}
              </span>
            </div>

            {/* Step Pills */}
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
                          active
                            ? 'border-transparent shadow-sm'
                            : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                        style={
                          active
                            ? { backgroundColor: item.accent, color: item.ink }
                            : undefined
                        }
                      >
                        <span className="tabular-nums">{position + 1}</span>
                        <span>{item.short[lang]}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </nav>
          </section>

          {/* Right: Realistic Phone Frame with Live Interactive Journal */}
          <section aria-label={ui.liveApp} className="min-w-0 lg:sticky lg:top-24">
            <div ref={phoneRef} className="mx-auto w-full max-w-[340px]">
              <div className="rounded-[46px] bg-[#24201C] p-2.5 shadow-[0_30px_60px_-28px_rgba(36,32,28,0.55)]">
                <div className="h-[640px] overflow-hidden rounded-[36px] bg-[var(--bg)]">
                  <iframe
                    ref={frameRef}
                    src={appUrl}
                    title={ui.liveAppTitle}
                    className="block size-full border-0"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold text-[var(--muted)]">
                <span>{ui.liveApp}</span>
                <button
                  type="button"
                  onClick={handleOpenApp}
                  className="inline-flex items-center gap-1 text-[var(--text)] hover:underline underline-offset-4"
                >
                  <span>{ui.openApp}</span>
                  <ArrowUpRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
