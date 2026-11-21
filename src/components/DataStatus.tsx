import { useState } from 'react';
import { CircleAlert, CircleCheck, RefreshCw } from 'lucide-react';
import { localeTag, t } from '../lib/i18n';
import { useApp, useStorageStatus } from '../lib/store';

const when = (at: number) => {
  const date = new Date(at);
  return `${date.toLocaleDateString(localeTag(), { day: 'numeric', month: 'short', year: 'numeric' })}, ${date.toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * Settings > Your data: is the journal being saved on this device, and when was the last backup file made.
 * A failed save is also announced by the banner on top of every page (StorageBanner).
 */
export function DataStatus({ lastBackup }: { lastBackup: number }) {
  const { ok, savedAt, reason, retry } = useStorageStatus();
  const { showToast } = useApp();
  const [retried, setRetried] = useState(false);

  return (
    <div className="rounded-xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2.5 space-y-1.5" role="status">
      <div className={`flex items-start gap-2 text-xs font-bold ${ok ? 'text-[var(--text)]' : 'text-[#B4342F]'}`}>
        {ok ? <CircleCheck size={15} className="mt-px shrink-0 text-[#1F7A45]" aria-hidden="true" /> : <CircleAlert size={15} className="mt-px shrink-0" aria-hidden="true" />}
        <span className="min-w-0 flex-1">
          {ok
            ? savedAt
              ? t('Saved on this device · {time}', { time: when(savedAt) })
              : t('Saved on this device')
            : reason === 'full'
              ? t('Not saved: the storage of this browser is full')
              : t('Not saved: this browser blocks storage')}
        </span>
        {!ok && (
          <button
            type="button"
            onClick={() => {
              const saved = retry();
              setRetried(!saved);
              showToast(saved ? t('Saved on this device again') : t('Still not saving. Export a backup to be safe.'));
            }}
            className="pressable shrink-0 inline-flex items-center gap-1 rounded-lg bg-[#F6D0D0] text-[#7A2727] px-2 py-1 text-[11px] font-extrabold"
          >
            <RefreshCw size={11} aria-hidden="true" />
            {retried ? t('Try again') : t('Retry')}
          </button>
        )}
      </div>
      <p className="text-[11px] font-medium text-[var(--muted)] pl-[23px]">
        {lastBackup ? t('Last backup file: {time}', { time: when(lastBackup) }) : t('No backup file saved from this device yet')}
      </p>
    </div>
  );
}
