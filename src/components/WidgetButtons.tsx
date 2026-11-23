import { t } from '../lib/i18n';
import { actionFor, widgetColumns, widgetRows, widgetShape } from '../lib/widgets';

/*
 * A widget button follows the bottom dock of the app: a round pastel button with a small icon (the dock's
 * buttons are circles too), . The tray behind a group of buttons
 * is a semitransparent surface (a lone button has none).
 * A button carries no text: the name is only its tooltip and screen-reader label.
 * Sizes are in px on purpose: they are the dp of the Android widget (res/layout/widget_button.xml).
 *
 * The lone circle of the single-button widget is 48 px; its icon is 24 (md buttons: circle 40, icon 20; they were 20 and 17).
 * A tray has a semitransparent background (`.kc-widget-tray` in index.css: the surface colour at 48 %, 65 % when dark, a faint
 * border; fully transparent in the round before) and its buttons share the tray's width evenly: the wider the widget
 * is made, the more room there is between the buttons (the buttons themselves keep their size). A short
 * last row is centred on the same grid with half-width spacers. KoinkWidgetProvider.java does the same.
 */

/** One widget button: just the round icon (no text). `size="lg"` is the lone, bigger circle of a single-button widget. */
export function WidgetTile({ actionKey, onPress, size = 'md' }: { actionKey: string; onPress?: (key: string) => void; size?: 'md' | 'lg' }) {
  const action = actionFor(actionKey);
  const Icon = action.icon;
  const label = t(action.label);
  const circle = (
    <span
      style={{ backgroundColor: action.bg, color: action.fg }}
      className={`${size === 'lg' ? 'size-12' : 'size-10'} shrink-0 rounded-full flex items-center justify-center border border-black/5`}
    >
      <Icon size={size === 'lg' ? 24 : 20} strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
  // A tray tile is a slot of at least 48 px that grows with the tray (`grow`): its circle stays in the middle.
  const cls = size === 'lg' ? 'shrink-0' : 'flex min-w-12 flex-1 basis-12 items-center justify-center py-0.5';
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
 * `stretch` makes the tray as wide as the space it is given (the buttons then spread out); without it the
 * tray is only as wide as its buttons.
 */
export function WidgetFace({ keys, onPress, stretch = false }: { kind?: 'single' | 'multi' | 'categories'; keys: string[]; onPress?: (key: string) => void; stretch?: boolean }) {
  if (keys.length === 0) return <p className="text-xs font-medium text-[var(--muted)]">{t('No buttons chosen.')}</p>;
  const shape = widgetShape(keys.length);
  if (shape === 'circle') return <WidgetTile actionKey={keys[0]} onPress={onPress} size="lg" />;
  const perRow = widgetColumns(keys.length);
  return (
    <div
      className={`kc-widget-tray flex max-w-full flex-col items-stretch gap-1.5 p-1.5 ${
        stretch ? 'w-full' : 'inline-flex'
      } ${shape === 'pill' ? 'rounded-full px-2.5' : 'rounded-[1.75rem] px-2.5 py-2'}`}
    >
      {widgetRows(keys).map((row, index) => {
        // Spacers of half a slot on each side keep a short last row centred on the same grid as the rows above.
        const missing = perRow - row.length;
        return (
          <div key={index} className="flex justify-center">
            {Array.from({ length: missing }, (_, i) => <span key={`l${i}`} className="min-w-6 flex-[0.5] basis-6" aria-hidden="true" />)}
            {row.map((key) => <WidgetTile key={key} actionKey={key} onPress={onPress} />)}
            {Array.from({ length: missing }, (_, i) => <span key={`r${i}`} className="min-w-6 flex-[0.5] basis-6" aria-hidden="true" />)}
          </div>
        );
      })}
    </div>
  );
}
