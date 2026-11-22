import { createElement, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check, ChevronDown, Delete, Minus, Plus, Trash2, type LucideIcon } from 'lucide-react';
import { round2 } from '../lib/format';
import { ICON, iconFor } from '../lib/icons';
import { useApp, useToast } from '../lib/store';
import { Modal } from './Modal';
import { t } from '../lib/i18n';
import { usePresence } from '../lib/usePresence';

/** Segmented choice inside a sheet (theme, currency, kind): the selected one is a solid block of the text colour. */
// eslint-disable-next-line react-refresh/only-export-components
export const seg = (active: boolean) =>
  `pressable flex-1 min-h-11 px-3 rounded-2xl text-xs font-extrabold text-center border ${
    active
      ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
  }`;

/* ---------- Shared controls (guide to UI UX fixes, 1.5): reuse these, never copy their class strings ---------- */

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'dangerQuiet';
export type ButtonTone = 'neutral' | 'expense' | 'income' | 'saving' | 'needs' | 'gift';

const BUTTON_TONES: Record<ButtonTone, string> = {
  neutral: 'bg-[var(--text)] text-[var(--on-text)]',
  expense: 'bg-activity text-activity-ink',
  income: 'bg-intake text-intake-ink',
  saving: 'bg-weight text-weight-ink',
  needs: 'bg-needs text-needs-ink',
  gift: 'bg-gift text-gift-ink',
};

const BUTTON_VARIANTS: Record<Exclude<ButtonVariant, 'primary'>, string> = {
  secondary: 'bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)]',
  quiet: 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]',
  danger: 'bg-danger hover:bg-danger-hover text-danger-ink',
  dangerQuiet: 'bg-[var(--inset)] border border-[var(--border)] text-[var(--text-warn)] hover:bg-danger hover:text-danger-ink',
};

/** Class string of a button: md = 44 px, sm = 36 px. */
// eslint-disable-next-line react-refresh/only-export-components
export function buttonClass({ variant = 'secondary', size = 'md', tone = 'neutral', block = false }: { variant?: ButtonVariant; size?: 'md' | 'sm'; tone?: ButtonTone; block?: boolean } = {}): string {
  const look = variant === 'primary' ? `kc-primary-btn pressable-soft hover:brightness-95 ${BUTTON_TONES[tone]}` : BUTTON_VARIANTS[variant];
  const dims = size === 'sm' ? 'min-h-9 px-3 text-xs gap-1.5' : 'min-h-11 px-4 text-sm gap-2';
  return `pressable inline-flex items-center justify-center rounded-2xl font-extrabold disabled:opacity-40 ${dims} ${block ? 'w-full' : ''} ${look}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  tone?: ButtonTone;
  block?: boolean;
  icon?: LucideIcon;
}

/** The one text button. The icon (14 px small, 18 px medium) is decorative and hidden from screen readers. */
export function Button({ variant, size = 'md', tone, block, icon: Icon, className = '', children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${buttonClass({ variant, size, tone, block })} ${className}`} {...rest}>
      {Icon && <Icon size={size === 'sm' ? ICON.sm : ICON.lg} strokeWidth={size === 'sm' || variant === 'primary' ? 2.5 : 2} className="shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

const ICON_BUTTON_SIZES = { sm: ['size-8 after:absolute after:-inset-1.5', ICON.md], md: ['size-10', ICON.lg], lg: ['size-11', ICON.xl] } as const;
const ICON_BUTTON_VARIANTS = {
  ghost: 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]',
  inset: 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] hover:text-[var(--text)]',
  surface: 'bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--inset)] text-[var(--muted)] hover:text-[var(--text)]',
  danger: 'text-[var(--muted)] hover:bg-danger hover:text-danger-ink',
} as const;

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'title'> {
  icon: LucideIcon;
  /** Spoken name and tooltip: an icon that stands alone always has one. */
  label: string;
  size?: keyof typeof ICON_BUTTON_SIZES;
  variant?: keyof typeof ICON_BUTTON_VARIANTS;
}

/** The one round icon button. `sm` keeps a 44 px touch area around its 32 px circle. */
export function IconButton({ icon: Icon, label, size = 'sm', variant = 'ghost', className = '', type = 'button', ...rest }: IconButtonProps) {
  const [box, iconSize] = ICON_BUTTON_SIZES[size];
  return (
    <button type={type} aria-label={label} title={label} className={`pressable relative shrink-0 rounded-full flex items-center justify-center ${box} ${ICON_BUTTON_VARIANTS[variant]} ${className}`} {...rest}>
      <Icon size={iconSize} aria-hidden="true" />
    </button>
  );
}

/** A small choice or filter: off is an inset pill, on is a solid block of the text colour. */
// eslint-disable-next-line react-refresh/only-export-components
export const chip = (active: boolean, dashed = false) =>
  `pressable inline-flex items-center gap-1.5 min-h-9 px-3 rounded-full text-xs font-extrabold border ${
    active
      ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
      : `bg-[var(--inset)] text-[var(--text)] hover:bg-[var(--hover)] ${dashed ? 'border-dashed border-[var(--muted)]' : 'border-[var(--border)]'}`
  }`;

/** Switch between a few views on a page (kind, period, layout). Items use `pillItem`. */
export function PillGroup({ children, className = '', label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div role="group" aria-label={label} className={`inline-flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full ${className}`}>
      {children}
    </div>
  );
}

/** Wrapper class of a pill group, for pages that need a group with their own markup. */
// eslint-disable-next-line react-refresh/only-export-components
export const pillGroup = 'inline-flex w-fit max-w-full items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full';

// eslint-disable-next-line react-refresh/only-export-components
export const pillItem = (active: boolean, iconOnly = false) =>
  `pressable inline-flex items-center justify-center gap-1.5 whitespace-nowrap h-8 ${iconOnly ? 'w-10' : 'px-3.5'} rounded-full text-xs font-extrabold ${
    active ? 'bg-[var(--text)] text-[var(--on-text)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]'
  }`;

/** A date or time field: the same look everywhere. `compact` only beside the Today / Yesterday chips. */
export function DateField({ compact = false, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { compact?: boolean }) {
  return <input type="date" className={`${textInput} ${compact ? '!min-h-9 !px-2.5' : ''} ${className}`} {...rest} />;
}

/** A switch row (icon bubble, title, description, switch); its controls open below it while it is on. */
export function ToggleRow({ icon, tone = 'bg-[var(--surface)] text-[var(--muted)]', title, description, on, onToggle, disabled, children }: {
  icon?: ReactNode;
  /** Colour of the icon bubble. */
  tone?: string;
  title: string;
  description?: string;
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="bg-[var(--inset)] border border-[var(--border)] rounded-2xl">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        disabled={disabled}
        onClick={onToggle}
        className="w-full min-h-[52px] flex items-center justify-between gap-3 px-3 py-2.5 text-left rounded-2xl hover:bg-[var(--hover)] transition-colors disabled:opacity-50"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {icon && <span className={`size-8 rounded-full flex items-center justify-center shrink-0 ${tone}`}>{icon}</span>}
          <span className="min-w-0">
            <span className="block text-xs font-extrabold text-[var(--text)] leading-tight">{title}</span>
            {description && <span className="block text-[11px] font-medium text-[var(--muted)] leading-tight mt-0.5">{t(description)}</span>}
          </span>
        </span>
        <Switch on={on} />
      </button>
      {on && children && <div className="px-3 pb-3 pt-1 space-y-2.5">{children}</div>}
    </div>
  );
}

/** "Nothing here yet": one sentence, an optional title and an optional action. */
export function EmptyState({ title, children, action }: { title?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="kc-section-empty flex flex-col items-center gap-2 text-center py-6 px-4">
      {title && <p className="text-sm font-extrabold text-[var(--text)]">{t(title)}</p>}
      <p className="text-xs font-medium text-[var(--muted)]">{children}</p>
      {action}
    </div>
  );
}

/** One of the user-pickable icons (`ICON_CHOICES`) by its stored key. */
export function KeyIcon({ name, size = 16, strokeWidth = 2, className, ...rest }: { name: string; size?: number; strokeWidth?: number; className?: string; 'aria-hidden'?: boolean | 'true' }) {
  return createElement(iconFor(name), { size, strokeWidth, className, ...rest });
}

export function SectionLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  const cls = 'text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-1.5';
  return htmlFor ? <label htmlFor={htmlFor} className={cls}>{children}</label> : <span className={cls}>{children}</span>;
}

export const textInput =
  'w-full min-h-11 bg-[var(--inset)] border border-[var(--border)] rounded-2xl px-3.5 text-base [@media(pointer:fine)]:text-sm font-bold text-[var(--text)] placeholder:text-[var(--muted)] placeholder:font-medium focus:outline-none focus:border-[var(--muted)] transition-colors';

/* ---------- Number pad: amounts are typed on screen, never with the phone's keyboard ---------- */

export type PadKey = string;
const MAX_INTEGER_DIGITS = 9;

/**
 * The text behind an amount typed on a number pad. It keeps what the user typed ("12." while the
 * next digit is still to come) and follows the value when something else changes it (a chip, a plus).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAmountBuffer(value: number, onChange: (value: number) => void, { decimals = 2, max }: { decimals?: number; max?: number } = {}) {
  const [text, setText] = useState(() => (value ? String(value) : ''));
  const parsed = text === '' || text === '.' ? 0 : parseFloat(text);
  if (parsed !== value) setText(value ? String(value) : '');

  const press = (key: PadKey) => {
    let next = text;
    if (key === 'back') next = text.slice(0, -1);
    else if (key === 'clear') next = '';
    else if (key === '.') {
      if (decimals === 0 || text.includes('.')) return;
      next = `${text || '0'}.`;
    } else if (/^\d$/.test(key)) {
      if (text === '0') next = key;
      else next = text + key;
      const [whole, fraction = ''] = next.split('.');
      if (fraction.length > decimals || whole.length > MAX_INTEGER_DIGITS) return;
    } else return;
    const num = next === '' || next === '.' ? 0 : parseFloat(next);
    if (max !== undefined && num > max) return;
    setText(next);
    onChange(num);
  };

  return { text, press };
}

/** The figure of an amount being typed, with its unit in front. */
export function AmountDisplay({ text, unit, className = '' }: { text: string; unit: string; className?: string }) {
  return (
    <span className={`inline-flex items-baseline justify-center gap-1.5 tabular-nums font-extrabold text-[var(--text)] ${className}`}>
      <span className="text-[0.55em] text-[var(--muted)]">{unit}</span>
      <span className={text ? '' : 'text-[var(--muted)]/50'}>{text || '0'}</span>
    </span>
  );
}

const PAD_KEY =
  'pressable h-12 min-[400px]:h-[3.25rem] rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] text-xl font-extrabold tabular-nums flex items-center justify-center select-none touch-manipulation';

interface NumPadProps {
  onPress: (key: PadKey) => void;
  onConfirm: () => void;
  confirmLabel: ReactNode;
  confirmDisabled?: boolean;
  /** Colour of the confirm button, e.g. `bg-activity text-activity-ink`. */
  confirmClass?: string;
  /** Show the decimal point. */
  decimal?: boolean;
  /** Also answer the physical keyboard (digits, comma, Backspace, Enter). */
  captureKeys?: boolean;
}

/**
 * 3 x 4 keys and one wide confirm button. A long press on the backspace key clears everything. The confirm
 * button is plain content under the keys: it never floats above anything (only the save row of the entry
 * forms does, see `.kc-sticky-footer`).
 */
export function NumPad({ onPress, onConfirm, confirmLabel, confirmDisabled, confirmClass = 'bg-[var(--text)] text-[var(--on-text)]', decimal = true, captureKeys = true }: NumPadProps) {
  const latest = useRef({ onPress, onConfirm, confirmDisabled });
  const holdTimer = useRef<number | null>(null);
  const cleared = useRef(false);

  useEffect(() => {
    latest.current = { onPress, onConfirm, confirmDisabled };
  });

  // Desktop: the keyboard types into the open pad, unless a field or a button has the focus.
  useEffect(() => {
    if (!captureKeys) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const { onPress: press, onConfirm: confirm, confirmDisabled: disabled } = latest.current;
      if (/^\d$/.test(event.key)) press(event.key);
      else if (event.key === '.' || event.key === ',') press('.');
      else if (event.key === 'Backspace') press('back');
      else if (event.key === 'Enter' && !target?.closest('button')) {
        if (!disabled) confirm();
      } else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [captureKeys]);

  useEffect(() => () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
  }, []);

  const digit = (key: string) => (
    <button key={key} type="button" className={PAD_KEY} onClick={() => onPress(key)}>
      {key}
    </button>
  );

  return (
    <div className="space-y-2" role="group" aria-label={t('Number pad')}>
      <div className="grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit)}
        {decimal ? (
          <button type="button" className={PAD_KEY} onClick={() => onPress('.')} aria-label={t('Decimal point')}>.</button>
        ) : (
          <span aria-hidden="true" />
        )}
        {digit('0')}
        <button
          type="button"
          className={PAD_KEY}
          aria-label={t('Delete the last digit (hold to clear)')}
          onPointerDown={() => {
            cleared.current = false;
            if (holdTimer.current) window.clearTimeout(holdTimer.current);
            holdTimer.current = window.setTimeout(() => {
              cleared.current = true;
              onPress('clear');
            }, 450);
          }}
          onPointerUp={() => holdTimer.current && window.clearTimeout(holdTimer.current)}
          onPointerLeave={() => holdTimer.current && window.clearTimeout(holdTimer.current)}
          onPointerCancel={() => holdTimer.current && window.clearTimeout(holdTimer.current)}
          onClick={() => {
            if (cleared.current) cleared.current = false;
            else onPress('back');
          }}
        >
          <Delete size={ICON.xl} aria-hidden="true" />
        </button>
      </div>
      <div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
          className={`kc-primary-btn pressable pressable-soft w-full min-h-11 px-4 hover:brightness-95 font-extrabold rounded-2xl flex items-center justify-center gap-2 text-sm tabular-nums disabled:opacity-40 ${confirmClass}`}
        >
          <Check size={ICON.lg} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{confirmLabel}</span>
        </button>
      </div>
    </div>
  );
}

interface AmountStepperProps {
  value: number;
  onChange: (value: number) => void;
  unit: string;
  step?: number;
  min?: number;
  max?: number;
  ariaLabel: string;
  /** Show the number pad as soon as the field appears (otherwise a tap on the figure opens it). */
  startOpen?: boolean;
  /** Digits after the point. Whole numbers (days) pass 0. */
  decimals?: number;
  /** Quick additions shown under the field. */
  chips?: number[];
  chipLabel?: (delta: number) => string;
}

/**
 * Minus / figure / plus, with hold-to-repeat on the buttons and optional quick-add chips. Tapping
 * the figure opens a number pad right below it: no keyboard ever covers the sheet.
 */
export function AmountStepper({ value, onChange, unit, step = 1, min = 0, max, ariaLabel, startOpen = false, decimals = 2, chips, chipLabel }: AmountStepperProps) {
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const holdTimeout = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  const didHold = useRef(false);
  const [open, setOpen] = useState(startOpen);
  const { text, press } = useAmountBuffer(value, onChange, { decimals, max });

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const clamp = (v: number) => round2(Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, v)));

  const stopHold = () => {
    if (holdTimeout.current) window.clearTimeout(holdTimeout.current);
    if (holdInterval.current) window.clearInterval(holdInterval.current);
    holdTimeout.current = null;
    holdInterval.current = null;
  };
  useEffect(() => stopHold, []);

  const startHold = (delta: number) => {
    stopHold();
    didHold.current = false;
    holdTimeout.current = window.setTimeout(() => {
      didHold.current = true;
      holdInterval.current = window.setInterval(() => {
        const next = clamp(valueRef.current + delta);
        if (next === valueRef.current) return;
        valueRef.current = next;
        onChangeRef.current(next);
      }, 90);
    }, 360);
  };

  const click = (delta: number) => {
    if (didHold.current) {
      didHold.current = false;
      return;
    }
    onChange(clamp(value + delta));
  };

  const done = () => {
    if (value < min) onChange(min);
    setOpen(false);
  };

  const button =
    'pressable w-12 h-12 shrink-0 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center select-none disabled:opacity-35';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={value <= min}
          onPointerDown={() => startHold(-step)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onClick={() => click(-step)}
          className={button}
          aria-label={t('Minus {step}', { step })}
        >
          <Minus size={ICON.lg} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => (open ? done() : setOpen(true))}
          aria-expanded={open}
          aria-label={`${ariaLabel}: ${text || 0} ${unit}. ${open ? t('Close the number pad') : t('Open the number pad')}`}
          className={`pressable flex-1 min-w-0 h-12 rounded-2xl bg-[var(--inset)] border text-lg tabular-nums ${open ? 'border-[var(--muted)]' : 'border-[var(--border)]'} flex items-center justify-center`}
        >
          <AmountDisplay text={t(text)} unit={unit} className="text-lg" />
        </button>
        <button
          type="button"
          disabled={max !== undefined && value >= max}
          onPointerDown={() => startHold(step)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onClick={() => click(step)}
          className={button}
          aria-label={t('Plus {step}', { step })}
        >
          <Plus size={ICON.lg} aria-hidden="true" />
        </button>
      </div>
      {open && <NumPad onPress={press} onConfirm={done} confirmLabel={t('Done')} decimal={decimals > 0} />}
      {chips && (
        <div className="flex gap-1.5">
          {chips.map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => onChange(clamp(value + delta))}
              className="pressable flex-1 min-h-9 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] text-xs font-extrabold tabular-nums"
            >
              {chipLabel ? chipLabel(delta) : `+${delta}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-150 shrink-0 inline-flex items-center border ${
        on ? 'bg-[var(--intake-on-surface)] border-transparent' : 'bg-[var(--muted)] border-transparent'
      }`}
    >
      <span
        className={`block w-5 h-5 rounded-full transition-transform [transition-duration:420ms] [transition-timing-function:var(--ease-bounce)] shadow-sm ${
          on ? 'translate-x-5 bg-[var(--surface)]' : 'translate-x-0 bg-[var(--surface)]'
        }`}
      />
    </span>
  );
}

/** A settings group that opens and closes with a smooth height animation. */
export function Collapsible({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--inset)]/40 overflow-hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--text)]">{t(title)}</span>
        <ChevronDown
          size={ICON.lg}
          aria-hidden="true"
          className={`shrink-0 text-[var(--muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div id={`${id}-panel`} className="accordion-grid" data-open={open} inert={!open}>
        <div className="accordion-inner">
          <div className="px-4 pb-4 pt-1 space-y-5">{children}</div>
        </div>
      </div>
    </section>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Small "Are you sure?" sheet shown before anything that cannot be undone. */
export function ConfirmDialog({ open, title = 'Are you sure?', message, confirmLabel = 'Delete', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal isOpen={open} onClose={onCancel} title={t(title)} maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm font-medium text-[var(--text)]">{t(message)}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onCancel}>{t('Cancel')}</Button>
          <Button variant="danger" icon={Trash2} onClick={onConfirm}>{t(confirmLabel)}</Button>
        </div>
      </div>
    </Modal>
  );
}

interface SaveBeforeCloseDialogProps {
  open: boolean;
  /** False while what was entered cannot be saved yet (no amount): only discard or keep editing. */
  canSave: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onKeep: () => void;
}

/**
 * Asked when a sheet with unsaved input is dismissed (scrim, swipe down, X, Escape, Back): nothing
 * typed is lost by accident. Dismissing this question keeps editing.
 */
export function SaveBeforeCloseDialog({ open, canSave, onSave, onDiscard, onKeep }: SaveBeforeCloseDialogProps) {
  return (
    <Modal isOpen={open} onClose={onKeep} title={t('Save this entry?')} maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm font-medium text-[var(--text)]">
          {canSave ? t('You have not saved what you entered.') : t('What you entered has no amount yet, so it cannot be saved.')}
        </p>
        <div className="space-y-2">
          {canSave && <Button variant="primary" tone="income" block onClick={onSave}>{t('Save')}</Button>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onKeep}>{t('Keep editing')}</Button>
            {/* Destructive choice on the right, away from the primary Save button's thumb path. */}
            <Button variant="danger" onClick={onDiscard}>{t('Don’t save')}</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Progress bar on a neutral surface: a soft track with an ink fill. */
export function Bar({ value, max, track, fill, className = 'h-2' }: { value: number; max: number; track: string; fill: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`w-full rounded-full overflow-hidden ${track} ${className}`}>
      <div className={`h-full rounded-full transition-[width] duration-500 ease-out ${fill}`} style={{ width: `${value > 0 ? Math.max(4, pct) : 0}%` }} />
    </div>
  );
}

/** One confirmation line at the bottom of the screen, with Undo where it makes sense. */
export function ToastHost() {
  const { dismissToast, activeTab, data, basic } = useApp();
  // The bar of buttons exists on the Month page only: lift the toast only when it is on screen.
  const barOnScreen = activeTab === 'month' && (basic || Object.values(data.settings.quickAdd).some(Boolean));
  const toast = useToast();
  // The toast plays its exit before it unmounts; a newer toast takes over at once (new key, new entrance).
  const lastToast = useRef(toast);
  if (toast) lastToast.current = toast;
  const { mounted } = usePresence(!!toast, 170);
  const shown = toast ?? lastToast.current;
  if (!mounted || !shown) return null;
  return (
    <div
      className={`fixed left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none ${
        barOnScreen ? 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(6.25rem+env(safe-area-inset-bottom))]' : 'bottom-[max(1.25rem,env(safe-area-inset-bottom))]'
      }`}
    >
      <div
        key={shown.id}
        role="status"
        className={`${toast ? 'anim-toast pointer-events-auto' : 'anim-toast-out pointer-events-none'} max-w-full inline-flex items-center gap-3 rounded-full bg-[var(--text)] text-[var(--on-text)] pl-4 pr-1.5 py-1.5 shadow-lg shadow-black/20`}
      >
        <span className="min-w-0 truncate text-xs font-bold tabular-nums py-1">{t(shown.message)}</span>
        {shown.onAction ? (
          <button
            type="button"
            onClick={() => {
              shown.onAction?.();
              dismissToast();
            }}
            className="pressable shrink-0 rounded-full bg-[var(--on-text)]/15 hover:bg-[var(--on-text)]/25 px-3 py-1.5 text-xs font-extrabold"
          >
            {shown.actionLabel}
          </button>
        ) : (
          <span className="w-2.5" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
