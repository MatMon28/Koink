import { useState } from 'react';
import { ICON } from '../lib/icons';
import { Compass, CircleCheck, Download, Smartphone } from 'lucide-react';
import { navigateToView, openInstallGuide } from './InstallGuide';
import { promptInstall, useInstallState, type InstallState } from '../lib/pwa';
import { t } from '../lib/i18n';

const COPY: Record<Exclude<InstallState, 'hidden'>, string> = {
  available: 'Put Koink on your home screen. It opens in its own window and works offline.',
  ios: 'On iPhone and iPad: open this page in Safari, tap Share, then Add to Home Screen.',
  manual: 'Guide for iPhone, Android and PC, plus the Android APK.',
  installed: 'Koink is installed on this device and works offline.',
};

/**
 * "Install app" card of Settings. Always available in a browser (iOS and desktop included),
 * because manual installation never fires `beforeinstallprompt`. Opens the full guide with
 * iPhone/iPad, Android (PWA and APK) and desktop steps. Not shown inside the Android app.
 */
export function InstallApp() {
  const state = useInstallState();
  const [message, setMessage] = useState<string | null>(null);
  if (state === 'hidden') return null;

  const inTourFrame = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tour') === '1';

  const install = async () => {
    const accepted = await promptInstall();
    setMessage(accepted ? t('Installing. Look for Koink on your home screen.') : t('Not installed. You can do it later from your browser menu.'));
  };

  return (
    <section aria-label={t('Install app')} className="bg-[var(--inset)] border border-[var(--border)] rounded-2xl p-3 space-y-2.5">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Install app')}</h3>
      <div className="flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-full bg-intake text-intake-ink flex items-center justify-center shrink-0">
          {state === 'installed' ? <CircleCheck size={ICON.md} aria-hidden="true" /> : <Smartphone size={ICON.md} aria-hidden="true" />}
        </span>
        <p className="flex-1 text-[11px] font-medium leading-relaxed text-[var(--muted)]" aria-live="polite">
          {message ?? t(COPY[state])}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {state === 'available' && (
          <button
            type="button"
            onClick={() => void install()}
            className="kc-primary-btn pressable pressable-soft flex-1 py-2.5 px-3 rounded-xl bg-intake hover:brightness-95 text-intake-ink font-extrabold text-xs flex items-center justify-center gap-1.5"
          >
            <Download size={ICON.md} aria-hidden="true" />
            {t('Install Koink')}
          </button>
        )}
        <button
          type="button"
          onClick={() => openInstallGuide()}
          className="pressable pressable-soft flex-1 py-2.5 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--text)] font-extrabold text-xs flex items-center justify-center gap-1.5"
        >
          <Smartphone size={ICON.md} aria-hidden="true" />
          {state === 'installed' ? t('Other devices') : t('How to install')}
        </button>
        {state !== 'installed' && !inTourFrame && (
          <a
            href="./?view=tour"
            onClick={(event) => navigateToView('tour', event)}
            className="pressable pressable-soft py-2.5 px-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)] font-extrabold text-xs flex items-center justify-center gap-1.5"
          >
            <Compass size={ICON.md} aria-hidden="true" />
            {t('Guided tour')}
          </a>
        )}
      </div>
    </section>
  );
}
