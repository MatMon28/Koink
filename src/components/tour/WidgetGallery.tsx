import { LayoutGrid } from 'lucide-react';
import { WidgetFace } from '../WidgetButtons';
import { syncCategories } from '../../lib/categories';
import { STORAGE_KEY } from '../../lib/storage';
import { categoryWidgetKeys, normalizeWidgets } from '../../lib/widgets';
import type { CustomCategory, WidgetSettings } from '../../lib/types';
import type { TourLang, TourUi } from './tourContent';

interface Props {
  ui: TourUi;
  lang: TourLang;
  onAction: (action: string) => void;
}

function readWidgetConfig(): WidgetSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeWidgets(undefined);
    const parsed = JSON.parse(raw) as {
      categories?: CustomCategory[];
      settings?: { widgets?: unknown; hiddenCategories?: string[] };
    };
    syncCategories(parsed.categories ?? [], parsed.settings?.hiddenCategories ?? []);
    return normalizeWidgets(parsed.settings?.widgets);
  } catch {
    return normalizeWidgets(undefined);
  }
}

/**
 * Widget gallery for the final step of the guided tour. Draws the three home-screen widgets
 * (Single button, Multiple buttons, Expense categories) using the app's own `WidgetFace` component
 * and opens the tapped action in the live journal beside it.
 */
export function WidgetGallery({ ui, onAction }: Props) {
  const widgets = readWidgetConfig();
  const catKeys = categoryWidgetKeys(widgets);

  return (
    <div data-testid="widget-gallery">
      <h3 className="flex items-center gap-2 text-sm font-extrabold">
        <LayoutGrid size={16} aria-hidden="true" />
        {ui.widgetsHeading}
      </h3>
      <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{ui.widgetsHint}</p>

      <div className="mt-4 grid gap-3 rounded-[28px] bg-[var(--inset)] p-3.5">
        <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <div>
              <p className="text-xs font-extrabold">{ui.singleWidgetTitle}</p>
              <p className="mt-0.5 text-[11px] font-medium text-[var(--muted)]">{ui.singleWidgetMeta}</p>
            </div>
            <div className="mt-3 flex items-center justify-center py-1">
              <WidgetFace kind="single" keys={[widgets.single]} onPress={onAction} />
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <div>
              <p className="text-xs font-extrabold">{ui.multiWidgetTitle}</p>
              <p className="mt-0.5 text-[11px] font-medium text-[var(--muted)]">{ui.multiWidgetMeta}</p>
            </div>
            <div className="mt-3 flex items-center justify-center py-1">
              <WidgetFace kind="multi" keys={widgets.multi} onPress={onAction} stretch />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xs font-extrabold">{ui.categoryWidgetTitle}</p>
            <p className="text-[11px] font-medium text-[var(--muted)]">{ui.categoryWidgetMeta}</p>
          </div>
          <div className="mt-3 flex items-center justify-center py-1">
            <WidgetFace kind="categories" keys={catKeys} onPress={onAction} stretch />
          </div>
        </div>
      </div>
    </div>
  );
}
