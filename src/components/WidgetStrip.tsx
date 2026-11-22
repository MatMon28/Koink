import { useApp } from '../lib/store';
import { useRunWidgetAction } from '../lib/useWidgets';
import { categoryWidgetKeys } from '../lib/widgets';
import { WidgetFace } from './WidgetButtons';
import { t } from '../lib/i18n';

/**
 * The widgets on the Month page (Settings > Widgets > Show on the Month page): the same three widgets
 * as on the Android home screen, usable in the browser and the installed web app too.
 */
export function WidgetStrip() {
  const { data, basic, openSheet } = useApp();
  const run = useRunWidgetAction();
  const { widgets } = data.settings;
  // Basic mode has no widgets (their buttons reach savings, budgets and the other Full-only screens).
  if (!widgets.showInApp || basic) return null;
  return (
    <section aria-label={t('Widgets')} className="um-hide space-y-2.5">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Widgets')}</h2>
        <button type="button" onClick={() => openSheet({ type: 'settings' })} className="pressable text-[11px] font-extrabold text-[var(--muted)] hover:text-[var(--text)] rounded-full px-2 py-1">
          {t('Edit')}
        </button>
      </div>
      {/* The trays take the width they are given, so their buttons spread out on a wide screen. */}
      <div className="flex items-center gap-2.5 pb-1">
        <WidgetFace keys={[widgets.single]} onPress={run} />
        <div className="min-w-0 flex-1">
          <WidgetFace keys={widgets.multi} onPress={run} stretch />
        </div>
      </div>
      <div className="pb-1">
        <WidgetFace keys={categoryWidgetKeys(widgets)} onPress={run} stretch />
      </div>
    </section>
  );
}
