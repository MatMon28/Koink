import { useState } from 'react';
import { Check, Download, TriangleAlert, Upload } from 'lucide-react';
import { Modal } from '../components/Modal';
import { formatDay } from '../lib/dates';
import { t } from '../lib/i18n';
import { summarizeJournal, type BackupPreview, type JournalSummary } from '../lib/journal';
import { useApp } from '../lib/store';
import { useBackup } from '../lib/useBackup';

const range = (s: JournalSummary) => (s.txCount === 0 ? '–' : `${formatDay(s.firstDate, false)} → ${formatDay(s.lastDate, false)}`);
const names = (s: JournalSummary) => (s.accounts.length === 0 ? '–' : s.accounts.join(', '));

/**
 * Asked after a backup file was picked and validated, before anything is replaced. Shows what is in the file
 * next to what the journal holds now, says that the current journal will be replaced, and offers to save a
 * copy of the current one first. Nothing changes until "Replace journal".
 */
export function RestoreDialog({ open, preview, fileName, onCancel, onConfirm }: { open: boolean; preview: BackupPreview | null; fileName: string; onCancel: () => void; onConfirm: () => void }) {
  const { data } = useApp();
  const { saveBackup } = useBackup();
  const [copySaved, setCopySaved] = useState(false);
  const current = summarizeJournal(data);
  const incoming = preview?.summary ?? current;
  const hasCurrent = current.txCount > 0 || current.goals > 0 || current.budgets > 0 || current.accounts.length > 0;
  const cancel = () => {
    setCopySaved(false);
    onCancel();
  };
  const currencyDiffers = !!preview && incoming.currency !== current.currency;

  const rows: [string, string, string][] = [
    [t('Entries'), String(current.txCount), String(incoming.txCount)],
    [t('Dates'), range(current), range(incoming)],
    [t('Currency'), current.currency, incoming.currency],
    [t('Accounts'), names(current), names(incoming)],
    [t('Goals'), String(current.goals), String(incoming.goals)],
    [t('Budgets'), String(current.budgets), String(incoming.budgets)],
    [t('Recurring'), String(current.recurring), String(incoming.recurring)],
  ];

  return (
    <Modal isOpen={open} onClose={cancel} title={t('Restore this backup?')} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-xs font-medium text-[var(--muted)] break-all">{fileName}</p>

        <div className="rounded-2xl bg-[#F6D0D0] text-[#7A2727] border border-[#D93636]/25 p-3 flex items-start gap-2.5">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-xs font-bold leading-snug">
            {t('This will replace your current journal.')}{' '}
            <span className="font-medium">{t('Entries, goals, budgets, accounts and settings in this browser are swapped for the ones in the file. Nothing is merged.')}</span>
          </p>
        </div>

        <div className="rounded-2xl bg-[var(--inset)] border border-[var(--border)] overflow-hidden text-xs">
          <div className="grid grid-cols-[5.5rem_1fr_1fr] gap-x-2 px-3 py-2 font-extrabold uppercase tracking-wider text-[10px] text-[var(--muted)] border-b border-[var(--border)]">
            <span />
            <span>{t('Now')}</span>
            <span>{t('Backup file')}</span>
          </div>
          {rows.map(([label, now, next]) => (
            <div key={label} className="grid grid-cols-[5.5rem_1fr_1fr] gap-x-2 px-3 py-1.5 border-b last:border-b-0 border-[var(--border)]">
              <span className="font-bold text-[var(--muted)]">{label}</span>
              <span className="min-w-0 break-words font-medium text-[var(--text)]">{now}</span>
              <span className="min-w-0 break-words font-extrabold text-[var(--text)]">{next}</span>
            </div>
          ))}
        </div>

        {currencyDiffers && (
          <p className="text-[11px] font-bold text-[#7A2727] bg-[#FAE0B4] rounded-xl px-3 py-2">
            {t('The file is in {next}, your journal is in {now}. After the restore every amount is shown in {next}.', { next: incoming.currency, now: current.currency })}
          </p>
        )}
        {!!preview && preview.skipped > 0 && (
          <p className="text-[11px] font-medium text-[var(--muted)]">{t('{n} entries in the file were not valid and are left out.', { n: preview.skipped })}</p>
        )}

        {hasCurrent && (
          <button
            type="button"
            onClick={async () => setCopySaved((await saveBackup()) || copySaved)}
            className="pressable pressable-soft w-full py-2.5 px-3 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] text-xs font-extrabold inline-flex items-center justify-center gap-1.5"
          >
            {copySaved ? <Check size={14} aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}
            {copySaved ? t('Copy of the current journal saved') : t('Save a copy of the current journal first')}
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={cancel} className="pressable py-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] text-sm font-extrabold">
            {t('Cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              setCopySaved(false);
              onConfirm();
            }}
            className="pressable min-h-11 px-2 py-2.5 rounded-2xl bg-[#F6D0D0] hover:bg-[#F0BDBD] text-[#7A2727] text-sm font-extrabold flex items-center justify-center gap-1.5"
          >
            <Upload size={15} aria-hidden="true" />
            <span className="leading-tight">{hasCurrent && !copySaved ? t('Replace anyway') : t('Replace journal')}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
