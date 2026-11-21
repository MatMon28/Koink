import { useEffect, useId, useRef, useState, type ChangeEvent, type FocusEvent, type ReactNode } from 'react';
import { ChevronDown, Minus, Plus, Trash2 } from 'lucide-react';
import { round2 } from '../lib/format';
import { useApp } from '../lib/store';
import { Modal } from './Modal';

/** Segmented choice (theme, currency, kind): the selected one is a solid block of the text colour. */
// eslint-disable-next-line react-refresh/only-export-components
export const seg = (active: boolean) =>
  `pressable flex-1 py-2.5 rounded-xl text-xs font-extrabold text-center border ${
    active
      ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
      : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
  }`;

export function SectionLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  const cls = 'text-xs font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-2';
  return htmlFor ? <label htmlFor={htmlFor} className={cls}>{children}</label> : <span className={cls}>{children}</span>;
}

export const textInput =
  'w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[var(--text)] placeholder:text-[var(--muted)]/60 text-base font-bold focus:outline-none focus:border-[var(--muted)] transition-colors';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
}

/** Decimal field that accepts a comma, selects its content on focus and tidies up on blur. */
export function NumericInput({ value, onChange, min = 0, max, unit, className = '', id, ariaLabel, autoFocus = false }: NumericInputProps) {
  const [focused, setFocused] = useState(false);
  const [local, setLocal] = useState(value === 0 ? '' : String(value));

  // The field follows changes made elsewhere (stepper, quick chips) unless it is being typed in.
  const [seen, setSeen] = useState(value);
  if (!focused && value !== seen) {
    setSeen(value);
    const parsed = parseFloat(local);
    if ((Number.isNaN(parsed) && value !== 0) || (!Number.isNaN(parsed) && parsed !== value)) {
      setLocal(value === 0 ? '' : String(value));
    }
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value.replace(',', '.');
    if (text !== '' && !/^\d*\.?\d{0,2}$/.test(text)) return;
    setLocal(text);
    const num = parseFloat(text);
    onChange(text === '' || Number.isNaN(num) ? 0 : num);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    const input = event.currentTarget;
    requestAnimationFrame(() => {
      try {
        input.select();
      } catch {
        /* some keyboards refuse a programmatic selection */
      }
    });
  };

  const handleBlur = () => {
    setFocused(false);
    let num = parseFloat(local);
    if (Number.isNaN(num)) num = 0;
    if (num < min) num = min;
    if (max !== undefined && num > max) num = max;
    num = round2(num);
    setLocal(num === 0 ? '' : String(num));
    onChange(num);
  };

  const centered = className.includes('text-center');
  const pad = unit ? (centered ? 'pl-11 pr-11' : 'pl-3.5 pr-11') : 'px-3.5';

  return (
    <div className="relative flex items-center w-full">
      <input
        id={id}
        aria-label={ariaLabel}
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        autoComplete="off"
        autoFocus={autoFocus}
        value={local}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
        }}
        placeholder="0"
        className={`w-full bg-[var(--inset)] border border-[var(--border)] rounded-xl py-2.5 text-[var(--text)] placeholder:text-[var(--muted)]/60 text-base font-bold tabular-nums focus:outline-none focus:border-[var(--muted)] transition-colors ${pad} ${className}`}
      />
      {unit && (
        <span className="absolute right-3 text-xs font-bold text-[var(--muted)] pointer-events-none select-none">{unit}</span>
      )}
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
  autoFocus?: boolean;
  /** Quick additions shown under the field. */
  chips?: number[];
  chipLabel?: (delta: number) => string;
}

/** Minus / field / plus, with hold-to-repeat on the buttons and optional quick-add chips. */
export function AmountStepper({ value, onChange, unit, step = 1, min = 0, max, ariaLabel, autoFocus, chips, chipLabel }: AmountStepperProps) {
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const holdTimeout = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  const didHold = useRef(false);

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
          aria-label={`Minus ${step}`}
        >
          <Minus size={19} />
        </button>
        <div className="flex-1">
          <NumericInput value={value} onChange={onChange} unit={unit} min={min} max={max} ariaLabel={ariaLabel} autoFocus={autoFocus} className="text-center text-lg h-12" />
        </div>
        <button
          type="button"
          disabled={max !== undefined && value >= max}
          onPointerDown={() => startHold(step)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onClick={() => click(step)}
          className={button}
          aria-label={`Plus ${step}`}
        >
          <Plus size={19} />
        </button>
      </div>
      {chips && (
        <div className="flex gap-1.5">
          {chips.map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => onChange(clamp(value + delta))}
              className="pressable flex-1 py-2 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] text-xs font-extrabold tabular-nums"
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
        on ? 'bg-[#C9EFD3] border-[#9ADBB0]' : 'bg-[var(--border)] border-[var(--border)]'
      }`}
    >
      <span
        className={`block w-5 h-5 rounded-full transition-transform [transition-duration:420ms] [transition-timing-function:var(--ease-bounce)] shadow-sm ${
          on ? 'translate-x-5 bg-[#1E5E3A]' : 'translate-x-0 bg-[#FBF8F2]'
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
        <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">{title}</span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`shrink-0 text-[var(--muted)] transition-transform [transition-duration:480ms] [transition-timing-function:var(--ease-bounce)] ${open ? 'rotate-180' : ''}`}
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
    <Modal isOpen={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm font-medium text-[var(--text)]">{message}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="pressable py-2.5 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] text-sm font-extrabold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="pressable min-h-11 px-2 py-2.5 rounded-2xl bg-[#F6D0D0] hover:bg-[#F0BDBD] text-[#7A2727] text-sm font-extrabold flex items-center justify-center"
          >
            <span className="text-center leading-tight">
              <Trash2 size={15} className="inline-block align-[-2px] mr-1.5" aria-hidden="true" />
              {confirmLabel}
            </span>
          </button>
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
  const quiet = 'pressable py-2.5 rounded-2xl text-sm font-extrabold';
  return (
    <Modal isOpen={open} onClose={onKeep} title="Save this entry?" maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm font-medium text-[var(--text)]">
          {canSave ? 'You have not saved what you entered.' : 'What you entered has no amount yet, so it cannot be saved.'}
        </p>
        <div className="space-y-2">
          {canSave && (
            <button type="button" onClick={onSave} className={`kc-primary-btn pressable pressable-soft w-full py-3 rounded-2xl bg-intake hover:brightness-95 text-intake-ink text-sm font-extrabold`}>
              Save
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onDiscard} className={`${quiet} bg-[#F6D0D0] hover:bg-[#F0BDBD] text-[#7A2727]`}>
              Don&rsquo;t save
            </button>
            <button type="button" onClick={onKeep} className={`${quiet} bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)]`}>
              Keep editing
            </button>
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
  const { toast, dismissToast, activeTab } = useApp();
  if (!toast) return null;
  return (
    <div
      className={`fixed left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none ${
        activeTab === 'stats' ? 'bottom-[max(1.25rem,env(safe-area-inset-bottom))]' : 'bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-[calc(6.25rem+env(safe-area-inset-bottom))]'
      }`}
    >
      <div
        key={toast.id}
        role="status"
        className="anim-toast pointer-events-auto max-w-full inline-flex items-center gap-3 rounded-full bg-[var(--text)] text-[var(--on-text)] pl-4 pr-1.5 py-1.5 shadow-lg shadow-black/20"
      >
        <span className="min-w-0 truncate text-xs font-bold tabular-nums py-1">{toast.message}</span>
        {toast.onAction ? (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              dismissToast();
            }}
            className="pressable shrink-0 rounded-full bg-[var(--on-text)]/15 hover:bg-[var(--on-text)]/25 px-3 py-1.5 text-xs font-extrabold"
          >
            {toast.actionLabel}
          </button>
        ) : (
          <span className="w-2.5" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
