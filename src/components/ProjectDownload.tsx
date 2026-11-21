import { Download, FolderDown } from 'lucide-react';
import { isNativeApp } from '../lib/platform';

/**
 * "Project files" card of Settings: the whole project (source, Android project, PWA files,
 * documentation) as one archive. The file is written by `npm run package` into public/downloads/.
 * Not shown inside the Android app, which does not ship the archive.
 */
export function ProjectDownload() {
  if (isNativeApp()) return null;
  return (
    <section aria-label="Project files" className="bg-[var(--inset)] border border-[var(--border)] rounded-2xl p-3 space-y-2.5">
      <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">Project files</h3>
      <div className="flex items-start gap-2.5">
        <span className="w-8 h-8 rounded-full bg-[#CFE7FE] text-[#183F66] flex items-center justify-center shrink-0">
          <FolderDown size={15} />
        </span>
        <p className="flex-1 text-[11px] font-medium leading-relaxed text-[var(--muted)]">
          Everything Koink is built from, in one zip: the source code, the Android project, the PWA files and the documentation.
        </p>
      </div>
      <a
        href={`${import.meta.env.BASE_URL}downloads/koink-project.zip`}
        download="koink-project.zip"
        className="pressable pressable-soft w-full py-2.5 px-3 rounded-xl bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] font-extrabold text-xs flex items-center justify-center gap-1.5"
      >
        <Download size={15} />
        Download project (.zip)
      </a>
    </section>
  );
}
