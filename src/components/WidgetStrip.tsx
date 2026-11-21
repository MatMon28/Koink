import { useApp } from '../lib/store';
import { useRunWidgetAction } from '../lib/useWidgets';
import { categoryWidgetKeys } from '../lib/widgets';
import { WidgetFace } from './WidgetButtons';

/**
 * The widgets on the Month page (Settings > Widgets > Show on the Month page): the same three widgets
 * as on the Android home screen, usable in the browser and the installed web app too.
 */
export function WidgetStrip() {
  const { data, openSheet } = useApp();
  const run = useRunWidgetAction();
  const { widgets } = data.settings;
  if (!widgets.showInApp) return null;
  return (
    <section aria-label="Widgets" className="um-hide space-y-2.5">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">Widgets</h2>
        <button type="button" onClick={() => openSheet({ type: 'widgets' })} className="pressable text-[11px] font-extrabold text-[var(--muted)] hover:text-[var(--text)] rounded-full px-2 py-1">
          Edit
        </button>
      </div>
      <div className="no-scrollbar flex items-start gap-2.5 overflow-x-auto pb-1">
        <WidgetFace kind="single" keys={[widgets.single]} onPress={run} />
        <WidgetFace kind="multi" keys={widgets.multi} onPress={run} />
      </div>
      <div className="no-scrollbar overflow-x-auto pb-1">
        <WidgetFace kind="categories" keys={categoryWidgetKeys(widgets)} onPress={run} />
      </div>
    </section>
  );
}
