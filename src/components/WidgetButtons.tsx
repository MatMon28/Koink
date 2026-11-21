import { t } from '../lib/i18n';
import { actionFor, widgetRows, widgetShape } from '../lib/widgets';

/*
 * A widget button follows the bottom dock of the app: a round pastel button with a small icon (the dock's
 * buttons are circles too), . The tray behind a group of buttons
 * is the dock's own surface: border, soft shadow, fully rounded for a single row, rounded card for several.
 * A button carries no text: the name is only its tooltip and screen-reader label.
 * Sizes are in px on purpose: they are the dp of the Android widget (res/layout/widget_button.xml).
 */

/** One widget button: just the round icon (no text). `size="lg"` is the lone, bigger circle of a single-button widget. */
export function WidgetTile({ actionKey, onPress, size = 'md' }: { actionKey: string; onPress?: (key: string) => void; size?: 'md' | 'lg' }) {
  const action = actionFor(actionKey);
  const Icon = action.icon;
  const label = t(action.label);
  const circle = (
    <span
      style={{ backgroundColor: action.bg, color: action.fg }}
      className={`${size === 'lg' ? 'size-14' : 'size-10'} shrink-0 rounded-full flex items-center justify-center border border-black/5`}
    >
      <Icon size={size === 'lg' ? 22 : 17} strokeWidth={2.2} aria-hidden="true" />
    </span>
  );
  const cls = size === 'lg' ? 'shrink-0' : 'flex w-12 shrink-0 items-center justify-center py-0.5';
  return onPress ? (
    <button type="button" onClick={() => onPress(action.key)} className={`pressable ${cls} hover:brightness-95`} aria-label={t(label)} title={t(label)}>
      {circle}
    </button>
  ) : (
    <span className={cls} aria-hidden="true">{circle}</span>
  );
}

/**
 * A widget as it looks on the home screen, in the app. The shape follows the number of buttons (`widgetShape`):
 * a lone circle, a pill with one row, a card with several rows. Pass `onPress` to make the tiles real buttons.
 */
export function WidgetFace({ keys, onPress }: { kind?: 'single' | 'multi' | 'categories'; keys: string[]; onPress?: (key: string) => void }) {
  if (keys.length === 0) return <p className="text-xs font-medium text-[var(--muted)]">{t('No buttons chosen.')}</p>;
  const shape = widgetShape(keys.length);
  if (shape === 'circle') return <WidgetTile actionKey={keys[0]} onPress={onPress} size="lg" />;
  return (
    <div
      className={`inline-flex max-w-full flex-col items-center gap-1.5 border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg shadow-black/10 ${
        shape === 'pill' ? 'rounded-full px-2.5' : 'rounded-[1.75rem] px-2.5 py-2'
      }`}
    >
      {widgetRows(keys).map((row, index) => (
        <div key={index} className="flex justify-center gap-1">
          {row.map((key) => <WidgetTile key={key} actionKey={key} onPress={onPress} />)}
        </div>
      ))}
    </div>
  );
}
