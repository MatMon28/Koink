import { actionFor } from '../lib/widgets';

/** One widget button: a rounded tile in the action's own colours, with its icon and name. */
export function WidgetTile({ actionKey, onPress, size = 'md' }: { actionKey: string; onPress?: (key: string) => void; size?: 'md' | 'lg' }) {
  const action = actionFor(actionKey);
  const Icon = action.icon;
  const box = size === 'lg' ? 'size-[4.5rem]' : 'h-16 min-w-[4.25rem] flex-1';
  const content = (
    <>
      <Icon size={size === 'lg' ? 26 : 21} strokeWidth={2.2} aria-hidden="true" />
      <span className="max-w-full truncate px-1 text-[10px] font-extrabold leading-none">{action.label}</span>
    </>
  );
  const style = { backgroundColor: action.bg, color: action.fg };
  const cls = `${box} shrink-0 rounded-2xl flex flex-col items-center justify-center gap-1.5 border border-black/5`;
  return onPress ? (
    <button type="button" onClick={() => onPress(action.key)} style={style} className={`pressable ${cls} hover:brightness-95`} aria-label={action.label}>
      {content}
    </button>
  ) : (
    <span style={style} className={cls} aria-hidden="true">{content}</span>
  );
}

/**
 * A widget as it looks on the home screen, in the app: `single` is one tile, `multi` a row (two rows from
 * five buttons), `categories` a grid of four per row. Pass `onPress` to make the tiles real buttons.
 */
export function WidgetFace({ kind, keys, onPress }: { kind: 'single' | 'multi' | 'categories'; keys: string[]; onPress?: (key: string) => void }) {
  if (keys.length === 0) return <p className="text-xs font-medium text-[var(--muted)]">No buttons chosen.</p>;
  if (kind === 'single') return <WidgetTile actionKey={keys[0]} onPress={onPress} size="lg" />;
  const perRow = kind === 'categories' ? 4 : keys.length > 4 ? Math.ceil(keys.length / 2) : keys.length;
  const rows: string[][] = [];
  for (let i = 0; i < keys.length; i += perRow) rows.push(keys.slice(i, i + perRow));
  return (
    <div className="inline-flex max-w-full flex-col gap-1.5 rounded-3xl bg-[var(--surface)] border border-[var(--border)] p-2 shadow-sm shadow-black/5">
      {rows.map((row, index) => (
        <div key={index} className="flex gap-1.5">
          {row.map((key) => <WidgetTile key={key} actionKey={key} onPress={onPress} />)}
          {kind === 'categories' && row.length < perRow && Array.from({ length: perRow - row.length }, (_, i) => <span key={`pad${i}`} className="h-16 min-w-[4.25rem] flex-1" aria-hidden="true" />)}
        </div>
      ))}
    </div>
  );
}
