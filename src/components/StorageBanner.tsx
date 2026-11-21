import { useEffect, useState } from 'react';
import { Download, RefreshCw, TriangleAlert } from 'lucide-react';
import { t } from '../lib/i18n';
import { useApp, useStorageStatus } from '../lib/store';
import { useBackup } from '../lib/useBackup';

/**
 * Shown for as long as the journal cannot be written to this device's storage (full, blocked, private
 * mode). The entries still work, but they only live in memory: closing the app would lose them. It cannot
 * be dismissed; it goes away by itself the moment a write succeeds. Offers a retry and a backup file.
 * While it is up, closing the tab also asks for confirmation.
 */
export function StorageBanner() {
  const { ok, reason, retry } = useStorageStatus();
  const { showToast } = useApp();
  const { saveBackup } = useBackup();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (ok) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [ok]);

  if (ok) return null;

  const button =
    'pressable inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold border border-[#7A2727]/25 disabled:opacity-60';

  return (
    <div role="alert" className="sticky z-30 top-[calc(max(0.75rem,env(safe-area-inset-top))+6.25rem)] mb-3 rounded-2xl bg-[#F6D0D0] text-[#7A2727] border border-[#D93636]/30 p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold leading-tight">{t("Changes aren't being saved on this device.")}</p>
          <p className="mt-1 text-[11px] font-medium leading-snug">
            {reason === 'full'
              ? t('The storage of this browser is full. What you enter now only lives in this open window and is lost when you close it. Export a backup now.')
              : t('This browser is not letting Koink store data (private mode or blocked storage). What you enter now only lives in this open window and is lost when you close it. Export a backup now.')}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button type="button" onClick={() => void saveBackup()} className={`${button} bg-[#7A2727] text-[#F6D0D0]`}>
              <Download size={13} aria-hidden="true" />
              {t('Export a backup now')}
            </button>
            <button
              type="button"
              disabled={retrying}
              onClick={() => {
                setRetrying(true);
                const saved = retry();
                setRetrying(false);
                showToast(saved ? t('Saved on this device again') : t('Still not saving. Export a backup to be safe.'));
              }}
              className={`${button} bg-white/50 hover:bg-white/70`}
            >
              <RefreshCw size={13} aria-hidden="true" />
              {t('Try again')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
