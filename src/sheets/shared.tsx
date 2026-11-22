import { useState, type ReactNode } from 'react';
import { Check, MoreHorizontal, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { SectionLabel, seg, textInput } from '../components/ui';
import { allBuckets } from '../lib/categories';
import { useApp } from '../lib/store';
import { CURRENCIES } from '../lib/format';
import { ICON_CHOICES } from '../lib/icons';
import { t } from '../lib/i18n';

export interface Choice {
  id: string;
  name: string;
  icon: LucideIcon;
}

/**
 * Icon tiles to pick a category, an income source or a goal. The chosen one is a solid block.
 *
 * `collapsible`: only ONE row is shown: the first `columns - 1` choices (the callers list them most
 * recent first) and, as the last tile of the row, a "..." button that opens the rest, in the same
 * order, plus the `extra` tile. A choice made in the opened list stays visible once it is folded
 * again: it takes the last choice place of the row. A list that fits in one row has no button.
 */
export function ChoiceGrid({ choices, value, onChange, label, columns = 4, extra, collapsible = false }: {
  choices: Choice[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  columns?: 2 | 3 | 4;
  /** A last tile that is an action rather than a choice ("New"). */
  extra?: { label: string; icon: LucideIcon; onClick: () => void };
  /** Show one row, with the rest behind a button. */
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cols = columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-4';
  const fold = collapsible && choices.length > columns;

  const tile = (choice: Choice) => {
    const Icon = choice.icon;
    const active = choice.id === value;
    return (
      <button
        key={choice.id}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onChange(choice.id)}
        className={`pressable min-w-0 flex flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2.5 ${
          active
            ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
            : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] border-[var(--border)]'
        }`}
      >
        <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
        <span className="max-w-full truncate text-[11px] font-extrabold leading-tight">{choice.name}</span>
      </button>
    );
  };

  const extraTile = extra && (
    <button
      key="extra"
      type="button"
      onClick={extra.onClick}
      className="pressable min-w-0 flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--border)] px-1 py-2.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]"
    >
      <extra.icon size={17} strokeWidth={2.2} aria-hidden="true" />
      <span className="max-w-full truncate text-[11px] font-extrabold leading-tight">{t(extra.label)}</span>
    </button>
  );

  if (!fold) {
    return (
      <div role="radiogroup" aria-label={t(label)} className={`grid ${cols} gap-1.5`}>
        {choices.map(tile)}
        {extraTile}
      </div>
    );
  }

  // The first row: `columns - 1` choices and the "..." tile. Folded, the chosen tile is kept in view even
  // when it lies further down the list (it takes the last choice place).
  const places = columns - 1;
  let row = choices.slice(0, places);
  if (!expanded) {
    const chosen = choices.find((choice) => choice.id === value);
    if (chosen && !row.includes(chosen)) row = [...row.slice(0, places - 1), chosen];
  }
  const rest = choices.filter((choice) => !row.includes(choice));

  const moreLabel = expanded ? t('Show fewer') : `${t('Show all')} · ${rest.length}`;
  const moreTile = (
    <button
      key="more"
      type="button"
      onClick={() => setExpanded((open) => !open)}
      aria-expanded={expanded}
      aria-label={moreLabel}
      title={moreLabel}
      className={`pressable min-w-0 flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed px-1 py-2.5 ${
        expanded
          ? 'border-[var(--text)] text-[var(--text)] bg-[var(--inset)]'
          : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]'
      }`}
    >
      <MoreHorizontal size={17} strokeWidth={2.4} aria-hidden="true" />
      <span className="max-w-full truncate text-[11px] font-extrabold leading-tight">{expanded ? t('Less') : `+${rest.length}`}</span>
    </button>
  );

  return (
    <div role="radiogroup" aria-label={t(label)}>
      <div className={`grid ${cols} gap-1.5`}>{row.map(tile)}{moreTile}</div>
      <div className="accordion-grid" data-open={expanded}>
        <div className="accordion-inner">
          <div className={`grid ${cols} gap-1.5 pt-1.5`} inert={!expanded}>
            {rest.map(tile)}
            {extraTile}
          </div>
        </div>
      </div>
    </div>
  );
}

const BANNER_TONES = {
  expense: { card: 'bg-activity', ink: 'text-activity-ink', accent: 'text-activity-accent', dot: 'bg-activity-soft' },
  income: { card: 'bg-intake', ink: 'text-intake-ink', accent: 'text-intake-accent', dot: 'bg-intake-soft' },
  saving: { card: 'bg-weight', ink: 'text-weight-ink', accent: 'text-weight-accent', dot: 'bg-weight-soft' },
  needs: { card: 'bg-[#CFE7FE]', ink: 'text-[#183B5E]', accent: 'text-[#436B94]', dot: 'bg-[#E8F3FF]' },
  wants: { card: 'bg-[#FAE0B4]', ink: 'text-[#7D4E14]', accent: 'text-[#9B6E32]', dot: 'bg-[#FDF3E0]' },
  gift: { card: 'bg-[#FFD9E8]', ink: 'text-[#7A1F4B]', accent: 'text-[#9C4C73]', dot: 'bg-[#FFEDF4]' },
};

export type BannerTone = keyof typeof BANNER_TONES;

/** Pastel summary at the top of a sheet: what the figure below is about, and where it stands. */
export function Banner({ tone, icon: Icon, label, value, sub }: { tone: BannerTone; icon: LucideIcon; label: string; value: string; sub?: string }) {
  const c = BANNER_TONES[tone];
  return (
    <div className={`kc-modal-banner ${c.card} rounded-3xl p-4 flex items-center justify-between gap-3`}>
      <span className={`flex items-center gap-2.5 text-sm font-extrabold ${c.ink} min-w-0`}>
        <span className={`w-9 h-9 rounded-full ${c.dot} flex items-center justify-center shrink-0`}>
          <Icon size={17} />
        </span>
        <span className="truncate">{label}</span>
      </span>
      <span className="text-right tabular-nums shrink-0">
        <span className={`block text-lg font-extrabold ${c.ink}`}>{value}</span>
        {sub && <span className={`block text-[11px] font-bold ${c.accent}`}>{t(sub)}</span>}
      </span>
    </div>
  );
}

const SAVE_TONES = {
  expense: 'bg-activity text-activity-ink',
  income: 'bg-intake text-intake-ink',
  saving: 'bg-weight text-weight-ink',
  neutral: 'bg-intake text-intake-ink',
  gift: 'bg-[#FFD9E8] text-[#7A1F4B]',
};

/**
 * The row that ends a form: optional delete on the left, the wide save button on the right. It sticks to
 * the bottom of the sheet, so confirming never needs a scroll.
 */
export function SaveRow({ tone, label, disabled, onSave, onDelete, deleteLabel }: {
  tone: keyof typeof SAVE_TONES;
  label: ReactNode;
  disabled?: boolean;
  onSave: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  return (
    <div className="kc-sticky-footer flex gap-2">
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={deleteLabel ?? 'Delete'}
          title={deleteLabel ?? 'Delete'}
          className="pressable w-12 shrink-0 rounded-2xl bg-[#F6D0D0] hover:bg-[#F0BDBD] text-[#7A2727] flex items-center justify-center"
        >
          <Trash2 size={17} />
        </button>
      )}
      <button
        type="button"
        onClick={onSave}
        disabled={disabled}
        className={`kc-primary-btn pressable pressable-soft flex-1 min-w-0 py-3 hover:brightness-95 font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums disabled:opacity-40 ${SAVE_TONES[tone]}`}
      >
        <Check size={18} strokeWidth={2.5} className="shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    </div>
  );
}

/** Every currency as a code tile: pick the one an entry was paid in, or the journal's own. */
export function CurrencyGrid({ value, onChange, label = 'Currency' }: { value: string; onChange: (code: string) => void; label?: string }) {
  return (
    <div role="radiogroup" data-scroll-fade="y" aria-label={t(label)} className="grid grid-cols-4 min-[400px]:grid-cols-5 gap-1.5 max-h-72 overflow-y-auto overscroll-contain pr-0.5">
      {CURRENCIES.map((currency) => {
        const active = currency.code === value;
        return (
          <button
            key={currency.code}
            type="button"
            role="radio"
            aria-checked={active}
            title={currency.name}
            onClick={() => onChange(currency.code)}
            className={`pressable min-w-0 rounded-xl border px-1 py-2 text-center ${
              active
                ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
                : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] border-[var(--border)]'
            }`}
          >
            <span className="block text-xs font-extrabold leading-tight">{currency.code}</span>
            <span className="block truncate text-[10px] font-bold leading-tight opacity-70">{currency.symbol}</span>
          </button>
        );
      })}
    </div>
  );
}

/** The icons offered for categories and accounts. */
export function IconPicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div>
      <SectionLabel>{t('Icon')}</SectionLabel>
      <div role="radiogroup" aria-label={t('Icon')} className="grid grid-cols-6 min-[400px]:grid-cols-8 gap-1.5">
        {ICON_CHOICES.map((choice) => {
          const Icon = choice.icon;
          const active = choice.key === value;
          return (
            <button
              key={choice.key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={t(choice.label)}
              title={t(choice.label)}
              onClick={() => onChange(choice.key)}
              className={`pressable aspect-square rounded-xl border flex items-center justify-center ${
                active ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]' : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] border-[var(--border)]'
              }`}
            >
              <Icon size={17} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * "Counts as": Need, Want, or one of the user's own expense types, plus a chip that makes a new type on the
 * spot (it is selected at once). Own types are counted apart from needs and wants.
 */
export function BucketPicker({ value, onChange }: { value: string; onChange: (bucket: string) => void }) {
  const { saveCategoryType } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const label = (id: string, text: string) => (id === 'needs' ? t('Need') : id === 'wants' ? t('Want') : text);
  const create = () => {
    if (!name.trim()) return;
    onChange(saveCategoryType({ name }));
    setName('');
    setAdding(false);
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Type of expense')}>
        {allBuckets().map((bucket) => (
          <button key={bucket.id} type="button" aria-pressed={value === bucket.id} onClick={() => onChange(bucket.id)} className={`${seg(value === bucket.id)} min-w-[5rem] truncate`}>
            {label(bucket.id, bucket.name)}
          </button>
        ))}
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="pressable inline-flex items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--border)] px-3 py-2.5 text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]">
            <Plus size={13} strokeWidth={2.6} />
            {t('New type')}
          </button>
        )}
      </div>
      {adding && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={name}
            autoFocus
            maxLength={30}
            autoComplete="off"
            aria-label={t('Name of the new type')}
            placeholder={t('Investments, Family, Travel...')}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') { event.preventDefault(); create(); }
            }}
            className={`${textInput} min-w-0 flex-1 text-sm`}
          />
          <button type="button" disabled={!name.trim()} onClick={create} className="kc-primary-btn pressable shrink-0 rounded-2xl bg-activity px-4 py-3 text-sm font-extrabold text-activity-ink disabled:opacity-40">
            {t('Add')}
          </button>
        </div>
      )}
    </div>
  );
}
