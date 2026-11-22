import { Download, FolderDown } from 'lucide-react';
import { ICON } from '../lib/icons';
import { isNativeApp } from '../lib/platform';
import { t } from '../lib/i18n';

/**
 * "Project files" card of Settings: the whole project (source, Android project, PWA files,
 * documentation) as one archive. The file is written by `npm run package` into public/downloads/.
 * Not shown inside the Android app, which does not ship the archive.
 */
export function ProjectDownload() {
  if (isNativeApp()) return null;
  return (
    <section aria-label={t('Project files')} className="bg-[var(--inset)] border border-[var(--border)] rounded-2xl p-3 space-y-2.5">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Project files')}</h3>
      <div className="flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-full bg-needs text-needs-ink flex items-center justify-center shrink-0">
          <FolderDown size={ICON.md} aria-hidden="true" />
        </span>
        <p className="flex-1 text-[11px] font-medium leading-relaxed text-[var(--muted)]">
          {t('Everything Koink is built from, in one zip: the source code, the Android project, the PWA files and the documentation.')}
        </p>
      </div>
      <a
        href={`${import.meta.env.BASE_URL}downloads/koink-project.zip`}
        download="koink-project.zip"
        className="pressable pressable-soft w-full py-2.5 px-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] font-extrabold text-xs flex items-center justify-center gap-1.5"
      >
        <Download size={ICON.md} aria-hidden="true" />
        {t('Download project (.zip)')}
      </a>
    </section>
  );
}
