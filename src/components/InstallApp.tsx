import { useState } from 'react';
import { CircleCheck, Download, Smartphone } from 'lucide-react';
import { promptInstall, useInstallState, type InstallState } from '../lib/pwa';
import { t } from '../lib/i18n';

const COPY: Record<Exclude<InstallState, 'hidden'>, string> = {
  available: 'Put Koink on your home screen. It opens in its own window and works offline.',
  ios: 'On iPhone and iPad: open this page in Safari, tap Share, then Add to Home Screen.',
  manual: 'Open your browser menu and choose Install app or Add to Home Screen. Chrome and Edge offer it on phones and computers.',
  installed: 'Koink is installed on this device and works offline.',
};

/**
 * "Install app" card of Settings. Offers the browser's install dialog where there is one and says
 * how to install by hand where there is not. Not shown inside the Android app.
 */
export function InstallApp() {
  const state = useInstallState();
  const [message, setMessage] = useState<string | null>(null);
  if (state === 'hidden') return null;

  const install = async () => {
    const accepted = await promptInstall();
    setMessage(accepted ? 'Installing. Look for Koink on your home screen.' : 'Not installed. You can do it later from your browser menu.');
  };

  return (
    <section aria-label={t('Install app')} className="bg-[var(--inset)] border border-[var(--border)] rounded-2xl p-3 space-y-2.5">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Install app')}</h3>
      <div className="flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-full bg-[#C9EFD3] text-[#174A2B] flex items-center justify-center shrink-0">
          {state === 'installed' ? <CircleCheck size={15} /> : <Smartphone size={15} />}
        </span>
        <p className="flex-1 text-[11px] font-medium leading-relaxed text-[var(--muted)]" aria-live="polite">
          {message ?? COPY[state]}
        </p>
      </div>
      {state === 'available' && (
        <button
          type="button"
          onClick={() => void install()}
          className="kc-primary-btn pressable pressable-soft w-full py-2.5 px-3 rounded-xl bg-intake hover:brightness-95 text-intake-ink font-extrabold text-xs flex items-center justify-center gap-1.5"
        >
          <Download size={15} />
          {t('Install Koink')}
        </button>
      )}
    </section>
  );
}
