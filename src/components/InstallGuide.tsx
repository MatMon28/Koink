import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Apple,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Laptop,
  LockKeyhole,
  Monitor,
  MoreVertical,
  Plus,
  RotateCw,
  Share,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { AppIcon } from './Brand';
import { promptInstall, useInstallState } from '../lib/pwa';

export type GuideLanguage = 'en' | 'it';
export type InstallTarget = 'ios' | 'android' | 'desktop';

export const OPEN_INSTALL_GUIDE = 'koink:open-install-guide';

const RELEASES_URL = 'https://github.com/MatMon28/Koink/releases';

type OpenDetail = { target?: InstallTarget; lang?: GuideLanguage };

/** Opens the install guide from anywhere (tour header, Settings card, platform chips). */
export function openInstallGuide(target?: InstallTarget, lang?: GuideLanguage) {
  window.dispatchEvent(new CustomEvent<OpenDetail>(OPEN_INSTALL_GUIDE, { detail: { target, lang } }));
}

export function detectInstallTarget(): InstallTarget {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

function readLanguage(): GuideLanguage {
  try {
    return localStorage.getItem('koink_lang') === 'it' ? 'it' : 'en';
  } catch {
    return 'en';
  }
}

/** Mounted by App.tsx. Listens for openInstallGuide() and renders above any page or modal. */
export const InstallGuideHost: React.FC<{ lang?: GuideLanguage }> = ({ lang }) => {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<InstallTarget>('desktop');
  const [language, setLanguage] = useState<GuideLanguage>(lang ?? readLanguage);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenDetail>).detail ?? {};
      setTarget(detail.target ?? detectInstallTarget());
      setLanguage(detail.lang ?? lang ?? readLanguage());
      setOpen(true);
    };
    window.addEventListener(OPEN_INSTALL_GUIDE, onOpen);
    return () => window.removeEventListener(OPEN_INSTALL_GUIDE, onOpen);
  }, [lang]);

  if (!open) return null;
  return createPortal(
    <InstallGuideDialog
      target={target}
      language={language}
      onClose={() => setOpen(false)}
    />,
    document.body,
  );
};

interface Step {
  title: string;
  body: string;
}

interface Benefit {
  title: string;
  body: string;
}

interface GuideCopy {
  eyebrow: string;
  title: string;
  lede: string;
  installedTitle: string;
  installedBody: string;
  availableTitle: string;
  availableBody: string;
  installNow: string;
  installing: string;
  installedNow: string;
  cancelled: string;
  manualNote: string;
  tabsLabel: string;
  ios: string;
  android: string;
  desktop: string;
  iosTitle: string;
  iosLede: string;
  iosNote: string;
  iosSteps: Step[];
  androidTitle: string;
  androidLede: string;
  androidSteps: Step[];
  androidNote: string;
  apkTitle: string;
  apkBody: string;
  apkDownload: string;
  apkWarningTitle: string;
  apkWarning: string;
  apkSteps: Step[];
  apkReleases: string;
  desktopTitle: string;
  desktopLede: string;
  desktopSteps: Step[];
  desktopSafari: string;
  desktopSafariBody: string;
  desktopFirefox: string;
  desktopFirefoxBody: string;
  desktopNote: string;
  benefits: Benefit[];
  openApp: string;
  continueWeb: string;
  close: string;
  stepLabel: (n: number) => string;
  dataNote: string;
}

const COPY: Record<GuideLanguage, GuideCopy> = {
  en: {
    eyebrow: 'Koink on your device',
    title: 'Install the app',
    lede: 'Install once, then every launch opens straight into your finance journal — full screen, offline and without this guide.',
    installedTitle: 'Already installed',
    installedBody: 'Koink runs as an app on this device. Future launches open your journal directly.',
    availableTitle: 'Your browser can install it in one tap',
    availableBody: 'Use the install button for a full-screen app with its own icon. No store, no account required.',
    installNow: 'Install now',
    installing: 'Opening install dialog…',
    installedNow: 'Installation started. Look for Koink on your Home screen or desktop.',
    cancelled: 'Installation cancelled. You can try again any time.',
    manualNote: 'Choose your device and follow the steps below. It takes about 30 seconds.',
    tabsLabel: 'Choose your device',
    ios: 'iPhone & iPad',
    android: 'Android',
    desktop: 'Computer',
    iosTitle: 'Add to the Home Screen',
    iosLede: 'Safari installs Koink as a standalone web app. It gets its own icon and opens full-screen without browser chrome.',
    iosNote: 'On iOS only Safari can install a web app. If you are reading this in Chrome, Firefox or another app, copy this URL and open it in Safari.',
    iosSteps: [
      { title: 'Open this page in Safari', body: 'Make sure you are browsing in Safari rather than an in-app browser.' },
      { title: 'Tap the Share button', body: 'The square with an upward arrow in the toolbar at the bottom (or top on iPad).' },
      { title: 'Choose “Add to Home Screen”', body: 'Scroll down the share sheet options until you see Add to Home Screen.' },
      { title: 'Tap Add, then open Koink', body: 'Launch it from your Home Screen. It now starts directly in your journal.' },
    ],
    androidTitle: 'Install the web app',
    androidLede: 'Chrome, Edge and Samsung Internet can install Koink directly from this page with full offline support and auto-updates.',
    androidSteps: [
      { title: 'Open this page in Chrome or Edge', body: 'Navigate to the live URL without needing an app store.' },
      { title: 'Open the ⋮ menu', body: 'Tap the three-dot menu in the top-right corner of the browser.' },
      { title: 'Tap “Install app” or “Add to Home screen”', body: 'A prompt will appear confirming installation of Koink.' },
      { title: 'Open from your Home screen', body: 'Koink opens full screen and works completely without internet.' },
    ],
    androidNote: 'Do not see “Install app”? Verify the page is on https://, pull down to refresh, and try again.',
    apkTitle: 'Prefer an Android APK?',
    apkBody: 'Koink also ships as an Android APK with native home-screen widgets and notification reminders.',
    apkDownload: 'Download APK',
    apkWarningTitle: 'Android “unknown source” notice',
    apkWarning: 'Directly installed APK files show standard Android security prompts. Download only from the official repository or this site.',
    apkSteps: [
      { title: 'Download APK', body: 'Confirm download in your browser if prompted.' },
      { title: 'Open download & allow source', body: 'Allow installs from your browser or file manager.' },
      { title: 'Tap Install anyway', body: 'Complete installation and find Koink in your app drawer.' },
    ],
    apkReleases: 'Koink Releases on GitHub',
    desktopTitle: 'Install on Windows, macOS or Linux',
    desktopLede: 'Chrome, Edge, Brave and Opera can turn Koink into a dedicated desktop app with its own window and shortcut.',
    desktopSteps: [
      { title: 'Open in Chrome or Edge', body: 'Use the secure web address in your desktop browser.' },
      { title: 'Click the install icon in address bar', body: 'Look for the computer icon with down arrow on the right side of the address bar, or use browser menu ⋮ → Install Koink.' },
      { title: 'Confirm Install', body: 'Koink opens in its own window and adds an entry to your applications or dock.' },
    ],
    desktopSafari: 'Safari on macOS',
    desktopSafariBody: 'In macOS Sonoma or later, use File → Add to Dock to run Koink as a native desktop application.',
    desktopFirefox: 'Firefox',
    desktopFirefoxBody: 'Firefox does not support PWA installation. Open in Chrome or Edge for standalone mode, or bookmark the page.',
    desktopNote: 'To uninstall, open the window menu (⋮) and select “Uninstall Koink”. Your data remains safe in browser storage.',
    benefits: [
      { title: '100% Offline', body: 'Your journal opens instantly without any internet connection.' },
      { title: 'Private & Local', body: 'No account, no tracking, no cloud database. Everything is on device.' },
      { title: 'Zero Latency', body: 'Full-screen app experience with smooth 120Hz gesture navigation.' },
    ],
    openApp: 'Open Koink',
    continueWeb: 'Continue in browser',
    close: 'Close guide',
    stepLabel: (n) => `Step ${n}`,
    dataNote: 'Your money data never leaves this device',
  },
  it: {
    eyebrow: 'Koink sul tuo dispositivo',
    title: 'Installa l’app',
    lede: 'Installala una volta: da quel momento ogni avvio apre direttamente il diario finanziario, a schermo intero e offline.',
    installedTitle: 'Già installata',
    installedBody: 'Koink funziona già come app su questo dispositivo. I prossimi avvii apriranno direttamente il diario.',
    availableTitle: 'Il browser può installarla con un tocco',
    availableBody: 'Usa il pulsante di installazione per averla a schermo intero con la sua icona. Nessuno store o account.',
    installNow: 'Installa ora',
    installing: 'Apertura installazione…',
    installedNow: 'Installazione avviata. Cerca Koink nella schermata Home o sul desktop.',
    cancelled: 'Installazione annullata. Puoi riprovare quando vuoi.',
    manualNote: 'Scegli il tuo dispositivo e segui i passaggi. Servono circa 30 secondi.',
    tabsLabel: 'Scegli il dispositivo',
    ios: 'iPhone e iPad',
    android: 'Android',
    desktop: 'Computer',
    iosTitle: 'Aggiungi alla schermata Home',
    iosLede: 'Safari installa Koink come web app autonoma con la sua icona e senza le barre del browser.',
    iosNote: 'Su iOS solo Safari può installare una web app. Se stai usando Chrome o Firefox, copia il link e aprilo in Safari.',
    iosSteps: [
      { title: 'Apri questa pagina in Safari', body: 'Assicurati di usare Safari e non un browser integrato.' },
      { title: 'Tocca il pulsante Condividi', body: 'L’icona quadrata con la freccia verso l’alto nella barra degli strumenti.' },
      { title: 'Seleziona “Aggiungi alla schermata Home”', body: 'Scorri il menu di condivisione fino a trovare la voce.' },
      { title: 'Tocca Aggiungi e avvia Koink', body: 'Aprila dalla nuova icona sulla Home per avviare direttamente il diario.' },
    ],
    androidTitle: 'Installa la web app',
    androidLede: 'Chrome, Edge e Samsung Internet installano Koink direttamente con aggiornamenti automatici e supporto offline.',
    androidSteps: [
      { title: 'Apri la pagina in Chrome o Edge', body: 'Naviga sul sito senza bisogno di uno store.' },
      { title: 'Apri il menu ⋮', body: 'Tocca i tre puntini in alto a destra.' },
      { title: 'Tocca “Installa app” o “Aggiungi a Home”', body: 'Conferma l’installazione nella finestra che compare.' },
      { title: 'Apri Koink dalla schermata Home', body: 'L’app si apre a schermo intero e funziona completamente offline.' },
    ],
    androidNote: 'Non vedi “Installa app”? Verifica che il sito sia su https:// e ricarica la pagina.',
    apkTitle: 'Preferisci l’APK per Android?',
    apkBody: 'Koink è disponibile anche come file APK con supporto a widget e notifiche locali.',
    apkDownload: 'Scarica APK',
    apkWarningTitle: 'Avviso di sicurezza Android',
    apkWarning: 'Gli APK installati da file mostrano il normale avviso di origine sconosciuta. Scarica sempre dai canali ufficiali.',
    apkSteps: [
      { title: 'Scarica l’APK', body: 'Conferma il download nel browser se richiesto.' },
      { title: 'Apri il file scaricato', body: 'Consenti l’installazione da questa sorgente.' },
      { title: 'Installa e avvia Koink', body: 'Completa l’installazione e trovi Koink tra le tue app.' },
    ],
    apkReleases: 'Release ufficiali su GitHub',
    desktopTitle: 'Installa su Windows, Mac o Linux',
    desktopLede: 'Chrome, Edge, Brave e Opera trasformano Koink in una vera app desktop con finestra dedicata.',
    desktopSteps: [
      { title: 'Apri in Chrome o Edge', body: 'Usa l’indirizzo web sicuro nel browser desktop.' },
      { title: 'Clicca l’icona Installa nella barra', body: 'Trovi l’icona a forma di computer con freccia a destra dell’indirizzo, oppure nel menu ⋮.' },
      { title: 'Conferma Installa', body: 'Koink si apre nella sua finestra e compare nel menu Avvio o nel Dock.' },
    ],
    desktopSafari: 'Safari su macOS',
    desktopSafariBody: 'Con macOS Sonoma o successivi, usa File → Aggiungi al Dock per eseguire Koink come app autonoma.',
    desktopFirefox: 'Firefox',
    desktopFirefoxBody: 'Firefox non supporta le PWA. Usa Chrome o Edge per la modalità app, oppure aggiungi la pagina ai segnalibri.',
    desktopNote: 'Per disinstallare, usa il menu (⋮) della finestra dell’app e scegli “Disinstalla Koink”.',
    benefits: [
      { title: '100% Offline', body: 'Il tuo diario si apre all’istante anche senza connessione internet.' },
      { title: 'Locale e Privato', body: 'Nessun account, nessun server. Tutti i dati restano sul dispositivo.' },
      { title: 'Nessuna Latenza', body: 'Esperienza fluida a schermo intero con navigazione a gesti reattiva.' },
    ],
    openApp: 'Apri Koink',
    continueWeb: 'Continua nel browser',
    close: 'Chiudi guida',
    stepLabel: (n) => `Passo ${n}`,
    dataNote: 'I tuoi dati finanziari non lasciano mai questo dispositivo',
  },
};

interface DialogProps {
  target: InstallTarget;
  language: GuideLanguage;
  onClose: () => void;
}

export function InstallGuideDialog({ target: initialTarget, language, onClose }: DialogProps) {
  const [target, setTarget] = useState<InstallTarget>(initialTarget);
  const [installing, setInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<'accepted' | 'dismissed' | null>(null);
  const installState = useInstallState();
  const dialogRef = useRef<HTMLDivElement>(null);

  const t = COPY[language];
  const canDirectInstall = installState === 'available';
  const isInstalled = installState === 'installed';

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      const accepted = await promptInstall();
      setInstallResult(accepted ? 'accepted' : 'dismissed');
    } finally {
      setInstalling(false);
    }
  };

  const handleOpenApp = () => {
    try {
      localStorage.setItem('koink_tour_seen', '1');
    } catch {}
    window.location.href = './?view=app';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="relative flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <AppIcon className="size-10 rounded-2xl" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--muted)]">
                {t.eyebrow}
              </p>
              <h2 id="install-guide-title" className="text-lg font-extrabold tracking-tight sm:text-xl">
                {t.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="flex size-9 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <p className="text-sm font-medium leading-relaxed text-[var(--muted)] sm:text-base">
            {t.lede}
          </p>

          {/* Quick Install Banner (when browser prompt is available) */}
          {canDirectInstall && !isInstalled && (
            <div className="mt-5 rounded-2xl border border-[#3E2468]/20 bg-[#E2D6FF] p-4 text-[#3E2468] dark:border-[#E2D6FF]/20 dark:bg-[#3E2468] dark:text-[#E2D6FF]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-extrabold">{t.availableTitle}</h3>
                  <p className="mt-1 text-xs opacity-90">{t.availableBody}</p>
                </div>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="pressable inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#2D1B4B] px-5 text-xs font-extrabold text-white shadow hover:bg-[#1E1232] disabled:opacity-50 dark:bg-[#E2D6FF] dark:text-[#2D1B4B]"
                >
                  <Download size={15} aria-hidden="true" />
                  <span>{installing ? t.installing : t.installNow}</span>
                </button>
              </div>
              {installResult === 'accepted' && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={14} />
                  <span>{t.installedNow}</span>
                </p>
              )}
              {installResult === 'dismissed' && (
                <p className="mt-2 text-xs font-semibold opacity-80">{t.cancelled}</p>
              )}
            </div>
          )}

          {isInstalled && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              <CheckCircle2 size={20} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-extrabold">{t.installedTitle}</p>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">{t.installedBody}</p>
              </div>
            </div>
          )}

          {/* Device Tabs */}
          <div className="mt-6">
            <div role="tablist" aria-label={t.tabsLabel} className="grid grid-cols-3 gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-1">
              {([
                ['ios', t.ios, Apple],
                ['android', t.android, Smartphone],
                ['desktop', t.desktop, Monitor],
              ] as Array<[InstallTarget, string, typeof Apple]>).map(([key, label, Icon]) => {
                const active = target === key;
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTarget(key)}
                    className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-extrabold transition-all ${
                      active
                        ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* iOS Guide */}
            {target === 'ios' && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-amber-500/20 bg-amber-50/70 p-3 text-xs font-medium text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  {t.iosNote}
                </div>
                <div className="space-y-2.5">
                  {t.iosSteps.map((step, idx) => (
                    <div
                      key={step.title}
                      className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3.5"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--inset)] text-xs font-extrabold text-[var(--text)]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-[var(--text)] sm:text-sm">
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{step.body}</p>
                      </div>
                      {idx === 1 && <Share size={18} className="shrink-0 text-sky-600" />}
                      {idx === 2 && <Plus size={18} className="shrink-0 text-emerald-600" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Android Guide */}
            {target === 'android' && (
              <div className="mt-5 space-y-4">
                <div className="space-y-2.5">
                  {t.androidSteps.map((step, idx) => (
                    <div
                      key={step.title}
                      className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3.5"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--inset)] text-xs font-extrabold text-[var(--text)]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-[var(--text)] sm:text-sm">
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{step.body}</p>
                      </div>
                      {idx === 1 && <MoreVertical size={18} className="shrink-0 text-slate-600" />}
                      {idx === 2 && <Download size={18} className="shrink-0 text-emerald-600" />}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--muted)]">{t.androidNote}</p>

                {/* Optional APK card */}
                <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold">{t.apkTitle}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--muted)]">{t.apkBody}</p>
                    </div>
                    <a
                      href={RELEASES_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[11px] font-bold text-[var(--text)] hover:bg-[var(--hover)]"
                    >
                      <span>{t.apkReleases}</span>
                      <ArrowUpRight size={12} />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Guide */}
            {target === 'desktop' && (
              <div className="mt-5 space-y-4">
                <div className="space-y-2.5">
                  {t.desktopSteps.map((step, idx) => (
                    <div
                      key={step.title}
                      className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3.5"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--inset)] text-xs font-extrabold text-[var(--text)]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-[var(--text)] sm:text-sm">
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{step.body}</p>
                      </div>
                      {idx === 1 && <Laptop size={18} className="shrink-0 text-sky-600" />}
                    </div>
                  ))}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <p className="text-[11px] font-extrabold">{t.desktopSafari}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">{t.desktopSafariBody}</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                    <p className="text-[11px] font-extrabold">{t.desktopFirefox}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">{t.desktopFirefoxBody}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Benefits summary */}
          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <div className="grid grid-cols-3 gap-2">
              {t.benefits.map((b, idx) => {
                const Icon = idx === 0 ? WifiOff : idx === 1 ? LockKeyhole : RotateCw;
                return (
                  <div key={b.title} className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-3 text-center sm:p-3.5">
                    <div className="mx-auto flex size-7 items-center justify-center rounded-xl bg-[var(--inset)] text-[var(--text)]">
                      <Icon size={14} />
                    </div>
                    <p className="mt-2 text-[11px] font-extrabold text-[var(--text)] sm:text-xs">{b.title}</p>
                    <p className="mt-0.5 hidden text-[10px] leading-tight text-[var(--muted)] sm:block">{b.body}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-center text-[11px] font-medium text-[var(--muted)]">
              🔒 {t.dataNote}
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--inset)]/40 px-5 py-3.5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-[var(--muted)] hover:text-[var(--text)]"
          >
            {t.continueWeb}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenApp}
              className="pressable inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--text)] px-5 text-xs font-extrabold text-[var(--on-text)] shadow hover:opacity-90"
            >
              <span>{t.openApp}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
