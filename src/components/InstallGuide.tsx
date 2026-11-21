import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Apple,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Laptop,
  LockKeyhole,
  Monitor,
  MoreVertical,
  Plus,
  RotateCw,
  Share,
  ShieldAlert,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { AppIcon } from './Brand';
import { useBackLayer } from '../lib/back';
import { getLanguage } from '../lib/i18n';
import { promptInstall, useInstallState } from '../lib/pwa';
import { STORAGE_KEY } from '../lib/storage';

export type GuideLanguage = 'en' | 'it';
export type InstallTarget = 'ios' | 'android' | 'desktop';

export const OPEN_INSTALL_GUIDE = 'koink:open-install-guide';
export const VIEW_CHANGE_EVENT = 'koink:view-change';

/** Switches between the guided tour (`tour`) and the full journal (`app`) without a network reload. */
export function navigateToView(view: 'app' | 'tour', event?: React.MouseEvent): void {
  if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)) return;
  event?.preventDefault();
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('view', view);
    if (view === 'app') url.hash = '';
    window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent<'app' | 'tour'>(VIEW_CHANGE_EVENT, { detail: view }));
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
}

/** The APK is placed here by the release workflow (see docs/apk-download.md). */
const APK_URL = './downloads/Koink.apk';
const RELEASES_URL = 'https://github.com/MatMon28/Koink/releases/latest';
const BUILD_APK_URL = 'https://github.com/MatMon28/Koink/blob/main/docs/prepare-apps.md#2-the-android-app';

type OpenDetail = { target?: InstallTarget; lang?: GuideLanguage };

/** Opens the install guide from anywhere (tour header, Settings card, platform chips). */
export function openInstallGuide(target?: InstallTarget, lang?: GuideLanguage): void {
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { settings?: { language?: string } };
      if (parsed?.settings?.language === 'it') return 'it';
      if (parsed?.settings?.language === 'en') return 'en';
    }
  } catch {
    /* ignore */
  }
  return getLanguage() === 'it' ? 'it' : 'en';
}

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
  apkChecking: string;
  apkWarningTitle: string;
  apkWarning: string;
  apkSteps: Step[];
  apkUpdate: string;
  apkMissing: string;
  apkReleases: string;
  apkBuild: string;
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
    lede: 'Install once, then every launch opens straight into your journal — full screen, offline and without this guide.',
    installedTitle: 'Already installed',
    installedBody: 'Koink runs as an app on this device. Future launches open the journal directly.',
    availableTitle: 'Your browser can install it in one tap',
    availableBody: 'Use the install button for a full-screen app with its own icon. No store, no account.',
    installNow: 'Install now',
    installing: 'Opening the install dialog…',
    installedNow: 'Installation started. Look for Koink on your Home screen or desktop.',
    cancelled: 'Installation cancelled. You can try again any time.',
    manualNote: 'Choose your device and follow the steps. It takes about 30 seconds.',
    tabsLabel: 'Choose your device',
    ios: 'iPhone & iPad',
    android: 'Android',
    desktop: 'Computer',
    iosTitle: 'Add to the Home Screen',
    iosLede: 'Safari installs Koink as a web app. It gets its own icon and opens without browser bars.',
    iosNote: 'On iPhone and iPad only Safari can install a web app. If you are reading this in Chrome, Firefox or Instagram, copy the link and open it in Safari.',
    iosSteps: [
      { title: 'Open this page in Safari', body: 'Use the address bar at the top of this guide. The browser menu must be Safari.' },
      { title: 'Tap the Share button', body: 'It is the square with an arrow, in the toolbar (on iPad it can be at the top).' },
      { title: 'Choose “Add to Home Screen”', body: 'Scroll down the share sheet if you do not see it straight away.' },
      { title: 'Tap Add, then open Koink', body: 'Launch it from the new Home Screen icon. It now starts in the app, not on this page.' },
    ],
    androidTitle: 'Install the web app',
    androidLede: 'Chrome, Edge and Samsung Internet can install Koink directly from this page. This is the recommended route: it updates automatically.',
    androidSteps: [
      { title: 'Open this page in Chrome (or Edge)', body: 'You do not need to download anything from a store.' },
      { title: 'Open the ⋮ menu', body: 'Use the three-dot menu in the top-right corner.' },
      { title: 'Tap “Install app”', body: 'If your browser says “Add to Home screen” instead, that works too. Confirm with Install.' },
      { title: 'Open it from your Home screen', body: 'Koink opens full screen and keeps working offline.' },
    ],
    androidNote: 'Do not see “Install app”? Make sure the page is open on the published https:// address, then pull down to refresh once and try again.',
    apkTitle: 'Prefer the APK?',
    apkBody: 'The Android APK is the same app packaged as a native file. Choose it if you want a browser-free install, the native home-screen widgets, background reminder notifications and a fixed version you control.',
    apkDownload: 'Download APK',
    apkChecking: 'Checking…',
    apkWarningTitle: 'Android may say this app could be dangerous',
    apkWarning: 'Because the APK is not distributed through Google Play, Android (and Play Protect) can warn that it is from an “unknown source”, “unsafe” or that the app “could be dangerous”. That message appears for any app installed directly from a file — it does not mean the file is infected. Download the APK only from this page or the official Koink GitHub releases, and compare the source. You may be asked to allow your browser to install unknown apps.',
    apkSteps: [
      { title: 'Tap Download APK', body: 'If your browser asks, confirm that you want to keep the file.' },
      { title: 'Open the finished download', body: 'Use the download notification or your Files/Downloads folder.' },
      { title: 'Allow installs from this source, then tap Install anyway', body: 'This is Android’s standard warning for direct APK installs. Only continue if the file came from this page.' },
      { title: 'Open Koink and restore a backup', body: 'If you already used the web app, save a backup in Settings first and restore it in the APK.' },
    ],
    apkUpdate: 'The APK does not update itself. When a new build is released, download and install it again — your journal stays on the device. The web app versions update automatically.',
    apkMissing: 'The APK is not attached to this deployment yet. Use the GitHub releases link, or build it with the instructions in docs/prepare-apps.md.',
    apkReleases: 'Official GitHub releases',
    apkBuild: 'How to build the APK',
    desktopTitle: 'Install on Windows, macOS or Linux',
    desktopLede: 'Chrome, Edge, Brave and Opera can turn the site into a real desktop app with its own window and shortcut.',
    desktopSteps: [
      { title: 'Open this page in Chrome or Edge', body: 'The browser needs the https:// address.' },
      { title: 'Click the install icon in the address bar', body: 'It looks like a small monitor with an arrow. You can also open ⋮ → “Cast, save and share” → “Install page as app”.' },
      { title: 'Confirm Install', body: 'Koink opens in its own window and appears in the Start menu (Windows) or Applications (macOS).' },
    ],
    desktopSafari: 'Safari on macOS',
    desktopSafariBody: 'Use the Share menu → “Add to Dock” (macOS Sonoma or later). On older macOS, drag the page heading or use “Add to Home Screen” in Safari’s File menu when available.',
    desktopFirefox: 'Firefox',
    desktopFirefoxBody: 'Firefox does not install PWAs. Open this page in Chrome or Edge for the app window, or add it to your bookmarks to use it as a normal website.',
    desktopNote: 'To uninstall, open the app menu (⋮) and choose “Uninstall Koink”. Your journal data stays in the browser until you clear site data.',
    benefits: [
      { title: 'Works offline', body: 'The journal opens without a connection once installed.' },
      { title: 'Stays on your device', body: 'No account, no server. Income, expenses, budgets and savings live locally.' },
      { title: 'Full screen', body: 'No address bar or tabs — just the app and its own icon.' },
    ],
    openApp: 'Open the app',
    continueWeb: 'Continue on the web',
    close: 'Close install guide',
    stepLabel: (n) => `Step ${n}`,
    dataNote: 'Your data never leaves this device',
  },
  it: {
    eyebrow: 'Koink sul tuo dispositivo',
    title: 'Installa l’app',
    lede: 'Installala una volta: da quel momento ogni avvio apre direttamente il diario, a schermo intero e offline, senza questa guida.',
    installedTitle: 'Già installata',
    installedBody: 'Koink funziona come app su questo dispositivo. I prossimi avvii apriranno subito il diario.',
    availableTitle: 'Il browser può installarla con un tocco',
    availableBody: 'Usa il pulsante di installazione per averla a schermo intero con la sua icona. Nessuno store, nessun account.',
    installNow: 'Installa ora',
    installing: 'Apertura della finestra di installazione…',
    installedNow: 'Installazione avviata. Cerca Koink nella schermata Home o sul desktop.',
    cancelled: 'Installazione annullata. Puoi riprovare quando vuoi.',
    manualNote: 'Scegli il tuo dispositivo e segui i passaggi. Servono circa 30 secondi.',
    tabsLabel: 'Scegli il dispositivo',
    ios: 'iPhone e iPad',
    android: 'Android',
    desktop: 'Computer',
    iosTitle: 'Aggiungi alla schermata Home',
    iosLede: 'Safari installa Koink come web app: icona dedicata e apertura senza barre del browser.',
    iosNote: 'Su iPhone e iPad solo Safari può installare una web app. Se stai leggendo in Chrome, Firefox o Instagram, copia il link e aprilo in Safari.',
    iosSteps: [
      { title: 'Apri questa pagina in Safari', body: 'Usa la barra degli indirizzi in alto. Il menu del browser deve essere Safari.' },
      { title: 'Tocca il pulsante Condividi', body: 'È il quadrato con la freccia, nella barra in basso (su iPad può essere in alto).' },
      { title: 'Scegli “Aggiungi alla schermata Home”', body: 'Scorri il menu se non lo vedi subito.' },
      { title: 'Tocca Aggiungi e apri Koink', body: 'Avviala dalla nuova icona: ora parte dall’app, non da questa pagina.' },
    ],
    androidTitle: 'Installa la web app',
    androidLede: 'Chrome, Edge e Samsung Internet installano Koink direttamente da qui. È la via consigliata: si aggiorna da sola.',
    androidSteps: [
      { title: 'Apri questa pagina in Chrome (o Edge)', body: 'Non serve scaricare nulla da uno store.' },
      { title: 'Apri il menu ⋮', body: 'Sono i tre puntini in alto a destra.' },
      { title: 'Tocca “Installa app”', body: 'Se compare “Aggiungi a schermata Home” va bene lo stesso. Conferma con Installa.' },
      { title: 'Aprila dalla schermata Home', body: 'Koink si apre a schermo intero e funziona anche offline.' },
    ],
    androidNote: 'Non vedi “Installa app”? Controlla di essere sull’indirizzo https:// pubblicato, poi ricarica la pagina una volta e riprova.',
    apkTitle: 'Preferisci l’APK?',
    apkBody: 'L’APK Android è la stessa app confezionata come file nativo. Sceglilo per un’installazione senza browser, con i widget nativi sulla schermata Home, le notifiche in background e una versione fissa che controlli tu.',
    apkDownload: 'Scarica APK',
    apkChecking: 'Verifica…',
    apkWarningTitle: 'Android potrebbe dire che l’app è pericolosa',
    apkWarning: 'Poiché l’APK non passa da Google Play, Android (e Play Protect) può avvisarti che proviene da una “fonte sconosciuta”, che non è sicuro o che l’app “potrebbe essere pericolosa”. Questo messaggio compare per qualsiasi app installata da un file: non significa che sia infetta. Scarica l’APK solo da questa pagina o dalle release ufficiali su GitHub, e verifica la fonte. Potrebbe esserti chiesto di consentire al browser di installare app sconosciute.',
    apkSteps: [
      { title: 'Tocca Scarica APK', body: 'Se il browser lo chiede, conferma che vuoi tenere il file.' },
      { title: 'Apri il download completato', body: 'Usa la notifica di download o la cartella File/Download.' },
      { title: 'Consenti installazioni da questa fonte, poi tocca Installa comunque', body: 'È l’avviso standard di Android per gli APK diretti. Continua solo se il file arriva da questa pagina.' },
      { title: 'Apri Koink e ripristina un backup', body: 'Se usavi già la web app, salva prima un backup da Impostazioni e ripristinalo nell’APK.' },
    ],
    apkUpdate: 'L’APK non si aggiorna da solo. Quando esce una nuova build, scaricala e installala di nuovo: il diario resta sul dispositivo. Le versioni web si aggiornano automaticamente.',
    apkMissing: 'L’APK non è ancora allegato a questa pubblicazione. Usa il link alle release GitHub oppure compilalo seguendo docs/prepare-apps.md.',
    apkReleases: 'Release ufficiali su GitHub',
    apkBuild: 'Come compilare l’APK',
    desktopTitle: 'Installa su Windows, macOS o Linux',
    desktopLede: 'Chrome, Edge, Brave e Opera trasformano il sito in una vera app desktop con finestra e collegamento dedicati.',
    desktopSteps: [
      { title: 'Apri questa pagina in Chrome o Edge', body: 'Il browser deve usare l’indirizzo https://.' },
      { title: 'Clicca l’icona Installa nella barra degli indirizzi', body: 'Sembra un piccolo monitor con una freccia. In alternativa: ⋮ → “Cast, salva e condividi” → “Installa pagina come app”.' },
      { title: 'Conferma Installa', body: 'Koink si apre in una finestra dedicata e compare nel menu Start (Windows) o in Applicazioni (macOS).' },
    ],
    desktopSafari: 'Safari su macOS',
    desktopSafariBody: 'Usa il menu Condividi → “Aggiungi al Dock” (macOS Sonoma o successivo). Su macOS più vecchi puoi trascinare il titolo della pagina o usare “Aggiungi alla schermata Home” nel menu File di Safari, quando disponibile.',
    desktopFirefox: 'Firefox',
    desktopFirefoxBody: 'Firefox non installa le PWA. Apri questa pagina in Chrome o Edge per la finestra dell’app, oppure aggiungila ai segnalibri per usarla come sito normale.',
    desktopNote: 'Per disinstallarla apri il menu dell’app (⋮) e scegli “Disinstalla Koink”. I dati del diario restano nel browser finché non cancelli i dati del sito.',
    benefits: [
      { title: 'Funziona offline', body: 'Il diario si apre anche senza connessione una volta installato.' },
      { title: 'Resta sul dispositivo', body: 'Nessun account, nessun server. Entrate, spese, budget e risparmi vivono in locale.' },
      { title: 'Schermo intero', body: 'Niente barra degli indirizzi o schede: solo l’app e la sua icona.' },
    ],
    openApp: 'Apri l’app',
    continueWeb: 'Continua sul web',
    close: 'Chiudi guida di installazione',
    stepLabel: (n) => `Passo ${n}`,
    dataNote: 'I tuoi dati non lasciano mai questo dispositivo',
  },
};

const TARGET_META: Record<InstallTarget, { icon: React.ElementType; label: (copy: GuideCopy) => string }> = {
  ios: { icon: Apple, label: (copy) => copy.ios },
  android: { icon: Smartphone, label: (copy) => copy.android },
  desktop: { icon: Monitor, label: (copy) => copy.desktop },
};

const IOS_ICONS: React.ElementType[] = [Smartphone, Share, Plus, ArrowUpRight];
const ANDROID_ICONS: React.ElementType[] = [Smartphone, MoreVertical, Download, ArrowUpRight];
const APK_ICONS: React.ElementType[] = [Download, Smartphone, ShieldAlert, ArrowUpRight];
const DESKTOP_ICONS: React.ElementType[] = [Monitor, Download, ArrowUpRight];

const StepList: React.FC<{ steps: Step[]; icons: React.ElementType[]; stepLabel: (n: number) => string }> = ({
  steps,
  icons,
  stepLabel,
}) => (
  <ol className="mt-4 space-y-2.5">
    {steps.map((step, index) => {
      const Icon = icons[index] ?? CheckCircle2;
      return (
        <li key={step.title} className="flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#C9EFD3] text-[#174A2B]">
            <Icon size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
              {stepLabel(index + 1)}
            </p>
            <h4 className="mt-0.5 text-sm font-extrabold leading-snug text-[var(--text)]">{step.title}</h4>
            <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--muted)]">{step.body}</p>
          </div>
        </li>
      );
    })}
  </ol>
);

const Note: React.FC<{ children: React.ReactNode; tone?: 'neutral' | 'warn' | 'good'; title?: string; icon?: React.ElementType }> = ({
  children,
  tone = 'neutral',
  title,
  icon: Icon,
}) => {
  const palette = tone === 'warn'
    ? 'border-[#E9C68C] bg-[#FBE7C6] text-[#5E3B0C]'
    : tone === 'good'
      ? 'border-[#9ADBB0] bg-[#DDF4E4] text-[#174A2B]'
      : 'border-[var(--border)] bg-[var(--inset)] text-[var(--muted)]';
  return (
    <div className={`mt-3 flex gap-2.5 rounded-2xl border p-3 ${palette}`}>
      {Icon && <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
      <div className="min-w-0 text-xs font-medium leading-relaxed">
        {title && <p className="mb-0.5 text-sm font-extrabold leading-snug">{title}</p>}
        <p>{children}</p>
      </div>
    </div>
  );
};

const InstallGuideDialog: React.FC<{ target: InstallTarget; language: GuideLanguage; onClose: () => void }> = ({
  target,
  language,
  onClose,
}) => {
  const copy = COPY[language];
  const pwaState = useInstallState();
  const [tab, setTab] = useState<InstallTarget>(target);
  const [busy, setBusy] = useState(false);
  const [apkBusy, setApkBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'good' | 'neutral'; text: string } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useBackLayer(true, onClose);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Capture phase: the guide sits above open sheets, so Escape closes only the guide.
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  const handleInstall = async () => {
    setBusy(true);
    setMessage(null);
    const accepted = await promptInstall();
    setBusy(false);
    setMessage({
      kind: accepted ? 'good' : 'neutral',
      text: accepted ? copy.installedNow : copy.cancelled,
    });
  };

  const handleApk = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setMessage(null);
    setApkBusy(true);
    try {
      const response = await fetch(APK_URL, { method: 'HEAD', cache: 'no-store' });
      const type = response.headers.get('content-type') ?? '';
      if (response.ok && !type.includes('text/html')) {
        window.location.href = APK_URL;
        return;
      }
    } catch {
      // A missing file or a host that blocks HEAD falls through to the explanation below.
    }
    setApkBusy(false);
    setMessage({ kind: 'neutral', text: copy.apkMissing });
  };

  const installed = pwaState === 'installed';
  const canPrompt = pwaState === 'available' && !installed;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <div className="anim-backdrop absolute inset-0 bg-black/55 sm:backdrop-blur-xs" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-guide-title"
        className="anim-dialog relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] shadow-2xl shadow-black/30 sm:max-h-[90dvh] sm:max-w-2xl sm:rounded-3xl"
      >
        <header className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-5">
          <div className="mx-auto mb-2 h-1.5 w-11 rounded-full bg-[var(--border)] sm:hidden" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <AppIcon className="mt-0.5 size-12 shrink-0 rounded-2xl shadow-sm sm:size-14" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--muted)]">{copy.eyebrow}</p>
              <h2 id="install-guide-title" className="mt-0.5 text-xl font-extrabold tracking-tight sm:text-2xl">{copy.title}</h2>
              <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--muted)] sm:text-[13px]">{copy.lede}</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={copy.close}
              className="pressable flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--inset)] text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div data-dialog-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {installed ? (
            <Note tone="good" icon={CheckCircle2} title={copy.installedTitle}>{copy.installedBody}</Note>
          ) : canPrompt ? (
            <section className="rounded-2xl border border-[#9ADBB0] bg-[#DDF4E4] p-3.5 text-[#174A2B]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#1E5E3A] text-[#EAF7EE]">
                  <Download size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-extrabold">{copy.availableTitle}</h3>
                  <p className="mt-0.5 text-[11px] font-medium leading-relaxed">{copy.availableBody}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleInstall()}
                  disabled={busy}
                  className="pressable inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#1E5E3A] px-4 text-xs font-extrabold text-[#EAF7EE] hover:bg-[#174A2B] disabled:opacity-60"
                >
                  {busy ? copy.installing : copy.installNow}
                  {!busy && <ArrowRight size={14} aria-hidden="true" />}
                </button>
              </div>
            </section>
          ) : message ? null : (
            <p className="flex items-center gap-2 rounded-2xl bg-[var(--inset)] px-3 py-2.5 text-xs font-semibold text-[var(--muted)]">
              <ArrowRight size={14} className="shrink-0" aria-hidden="true" />
              {copy.manualNote}
            </p>
          )}

          {message && (
            <div
              role="status"
              className={`mt-3 rounded-2xl border p-3 text-xs font-bold leading-relaxed ${
                message.kind === 'good'
                  ? 'border-[#9ADBB0] bg-[#DDF4E4] text-[#174A2B]'
                  : 'border-[var(--border)] bg-[var(--inset)] text-[var(--text)]'
              }`}
            >
              {message.text}
            </div>
          )}

          <div role="tablist" aria-label={copy.tabsLabel} className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5">
            {(Object.keys(TARGET_META) as InstallTarget[]).map((key) => {
              const meta = TARGET_META[key];
              const active = tab === key;
              const Icon = meta.icon;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`install-panel-${key}`}
                  id={`install-tab-${key}`}
                  onClick={() => { setTab(key); setMessage(null); }}
                  className={`pressable flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-extrabold transition-colors sm:text-xs ${
                    active
                      ? 'bg-[var(--text)] text-[var(--bg)]'
                      : 'text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]'
                  }`}
                >
                  <Icon size={15} className="shrink-0" aria-hidden="true" />
                  <span className="truncate">{meta.label(copy)}</span>
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`install-panel-${tab}`}
            aria-labelledby={`install-tab-${tab}`}
            className="mt-5"
          >
            {tab === 'ios' && (
              <section>
                <h3 className="text-base font-extrabold tracking-tight">{copy.iosTitle}</h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--muted)]">{copy.iosLede}</p>
                <Note icon={Apple}>{copy.iosNote}</Note>
                <StepList steps={copy.iosSteps} icons={IOS_ICONS} stepLabel={copy.stepLabel} />
              </section>
            )}

            {tab === 'android' && (
              <section>
                <h3 className="text-base font-extrabold tracking-tight">{copy.androidTitle}</h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--muted)]">{copy.androidLede}</p>
                <StepList steps={copy.androidSteps} icons={ANDROID_ICONS} stepLabel={copy.stepLabel} />
                <Note icon={Smartphone}>{copy.androidNote}</Note>

                <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FAE0B4] text-[#7D4E14]">
                      <Download size={17} aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-extrabold tracking-tight">{copy.apkTitle}</h3>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--muted)]">{copy.apkBody}</p>
                    </div>
                  </div>
                  <a
                    href={APK_URL}
                    download="Koink.apk"
                    onClick={(event) => void handleApk(event)}
                    className="pressable mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1E5E3A] px-4 text-sm font-extrabold text-[#EAF7EE] hover:bg-[#174A2B] sm:w-auto"
                  >
                    <Download size={16} aria-hidden="true" />
                    {apkBusy ? copy.apkChecking : copy.apkDownload}
                  </a>
                  <Note tone="warn" icon={ShieldAlert} title={copy.apkWarningTitle}>{copy.apkWarning}</Note>
                  <StepList steps={copy.apkSteps} icons={APK_ICONS} stepLabel={copy.stepLabel} />
                  <p className="mt-3 flex items-start gap-2 text-[11px] font-semibold leading-relaxed text-[var(--muted)]">
                    <RotateCw size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{copy.apkUpdate}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-extrabold">
                    <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#174A2B] underline decoration-[#9ADBB0] underline-offset-4 hover:decoration-[#174A2B]">
                      {copy.apkReleases}
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                    <a href={BUILD_APK_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[var(--muted)] underline underline-offset-4 hover:text-[var(--text)]">
                      {copy.apkBuild}
                      <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </section>
            )}

            {tab === 'desktop' && (
              <section>
                <h3 className="text-base font-extrabold tracking-tight">{copy.desktopTitle}</h3>
                <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--muted)]">{copy.desktopLede}</p>
                <StepList steps={copy.desktopSteps} icons={DESKTOP_ICONS} stepLabel={copy.stepLabel} />
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-3">
                    <p className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--text)]">
                      <Apple size={14} aria-hidden="true" /> {copy.desktopSafari}
                    </p>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-[var(--muted)]">{copy.desktopSafariBody}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--inset)] p-3">
                    <p className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--text)]">
                      <Laptop size={14} aria-hidden="true" /> {copy.desktopFirefox}
                    </p>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-[var(--muted)]">{copy.desktopFirefoxBody}</p>
                  </div>
                </div>
                <Note icon={CheckCircle2}>{copy.desktopNote}</Note>
              </section>
            )}
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {copy.benefits.map((benefit, index) => {
              const Icon = [WifiOff, LockKeyhole, Monitor][index] ?? CheckCircle2;
              return (
                <div key={benefit.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-[#C9EFD3] text-[#174A2B]">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <p className="mt-2 text-xs font-extrabold text-[var(--text)]">{benefit.title}</p>
                  <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-[var(--muted)]">{benefit.body}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            <LockKeyhole size={12} aria-hidden="true" />
            {copy.dataNote}
          </p>
        </div>

        <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="./?view=app"
              onClick={(event) => {
                onClose();
                navigateToView('app', event);
              }}
              className="pressable inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--text)] px-4 text-xs font-extrabold text-[var(--bg)] sm:flex-none"
            >
              {copy.openApp}
              <ArrowUpRight size={14} aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="pressable inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--inset)] px-4 text-xs font-extrabold text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--text)] sm:flex-none"
            >
              {copy.continueWeb}
            </button>
            {canPrompt && (
              <button
                type="button"
                onClick={() => void handleInstall()}
                disabled={busy}
                className="pressable hidden min-h-11 items-center gap-1.5 rounded-xl bg-[#1E5E3A] px-4 text-xs font-extrabold text-[#EAF7EE] disabled:opacity-60 sm:ml-auto sm:inline-flex"
              >
                {busy ? copy.installing : copy.installNow}
                <Download size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

/** Mounted once by App.tsx. Listens for openInstallGuide() and renders the sheet above every modal. */
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

export default InstallGuideHost;
