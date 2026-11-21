import type { ReactNode } from 'react';
import { Check, Trash2, type LucideIcon } from 'lucide-react';
import { SectionLabel } from '../components/ui';
import { CURRENCIES } from '../lib/format';
import { ICON_CHOICES } from '../lib/icons';

export interface Choice {
  id: string;
  name: string;
  icon: LucideIcon;
}

/** Icon tiles to pick a category, an income source or a goal. The chosen one is a solid block. */
export function ChoiceGrid({ choices, value, onChange, label, columns = 4, extra }: {
  choices: Choice[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  columns?: 2 | 3 | 4;
  /** A last tile that is an action rather than a choice ("New"). */
  extra?: { label: string; icon: LucideIcon; onClick: () => void };
}) {
  const cols = columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-4';
  return (
    <div role="radiogroup" aria-label={label} className={`grid ${cols} gap-1.5`}>
      {choices.map((choice) => {
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
      })}
      {extra && (
        <button
          type="button"
          onClick={extra.onClick}
          className="pressable min-w-0 flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[var(--border)] px-1 py-2.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]"
        >
          <extra.icon size={17} strokeWidth={2.2} aria-hidden="true" />
          <span className="max-w-full truncate text-[11px] font-extrabold leading-tight">{extra.label}</span>
        </button>
      )}
    </div>
  );
}

const BANNER_TONES = {
  expense: { card: 'bg-activity', ink: 'text-activity-ink', accent: 'text-activity-accent', dot: 'bg-activity-soft' },
  income: { card: 'bg-intake', ink: 'text-intake-ink', accent: 'text-intake-accent', dot: 'bg-intake-soft' },
  saving: { card: 'bg-weight', ink: 'text-weight-ink', accent: 'text-weight-accent', dot: 'bg-weight-soft' },
  needs: { card: 'bg-[#CFE7FE]', ink: 'text-[#183B5E]', accent: 'text-[#436B94]', dot: 'bg-[#E8F3FF]' },
  wants: { card: 'bg-[#FAE0B4]', ink: 'text-[#7D4E14]', accent: 'text-[#9B6E32]', dot: 'bg-[#FDF3E0]' },
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
        {sub && <span className={`block text-[11px] font-bold ${c.accent}`}>{sub}</span>}
      </span>
    </div>
  );
}

const SAVE_TONES = {
  expense: 'bg-activity text-activity-ink',
  income: 'bg-intake text-intake-ink',
  saving: 'bg-weight text-weight-ink',
  neutral: 'bg-intake text-intake-ink',
};

/** The row that ends a form: optional delete on the left, the wide save button on the right. */
export function SaveRow({ tone, label, disabled, onSave, onDelete, deleteLabel }: {
  tone: keyof typeof SAVE_TONES;
  label: ReactNode;
  disabled?: boolean;
  onSave: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  return (
    <div className="flex gap-2">
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
    <div role="radiogroup" aria-label={label} className="grid grid-cols-4 min-[400px]:grid-cols-5 gap-1.5 max-h-72 overflow-y-auto overscroll-contain pr-0.5">
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
      <SectionLabel>Icon</SectionLabel>
      <div role="radiogroup" aria-label="Icon" className="grid grid-cols-6 min-[400px]:grid-cols-8 gap-1.5">
        {ICON_CHOICES.map((choice) => {
          const Icon = choice.icon;
          const active = choice.key === value;
          return (
            <button
              key={choice.key}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={choice.label}
              title={choice.label}
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
