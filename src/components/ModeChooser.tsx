import { useEffect, useRef } from 'react';
import { Check, LayoutGrid, Sprout, type LucideIcon } from 'lucide-react';
import { t } from '../lib/i18n';
import { inTourEmbed } from '../lib/mode';
import { useApp } from '../lib/store';
import type { Mode } from '../lib/types';

interface ModeOption {
  id: Mode;
  title: string;
  tagline: string;
  icon: LucideIcon;
  tone: string;
  points: string[];
}

/** The two modes, in the words shown on the first launch and in Settings. Texts go through `t()` at render time. */
const OPTIONS: ModeOption[] = [
  {
    id: 'basic',
    title: 'Basic',
    tagline: 'Just income and expenses',
    icon: Sprout,
    tone: 'bg-intake text-intake-ink',
    points: [
      'Income and expenses only',
      'Month, Transactions and Statistics',
      'One account, simple statistics',
      'No budgets, savings or recurring items',
    ],
  },
  {
    id: 'full',
    title: 'Full',
    tagline: 'Everything Koink can do',
    icon: LayoutGrid,
    tone: 'bg-weight text-weight-ink',
    points: [
      'Budgets, needs / wants / savings',
      'Savings goals and recurring items',
      'Several accounts and gift cards',
      'Quick log, widgets and detailed charts',
    ],
  },
];

/** One big, tappable card per mode. Used by the first-launch chooser and by Settings. */
function ModeCards({ value, onPick }: { value: Mode | null; onPick: (mode: Mode) => void }) {
  return (
    <div role="group" aria-label={t('Mode')} className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {OPTIONS.map((option) => {
        const on = value === option.id;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(option.id)}
            className={`pressable w-full rounded-3xl border p-4 text-left space-y-3 ${
              on ? 'border-[var(--text)] bg-[var(--inset)]' : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)]'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className={`size-10 shrink-0 rounded-full flex items-center justify-center ${option.tone}`} aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-[var(--text)] leading-tight">{t(option.title)}</span>
                <span className="block text-[11px] font-medium text-[var(--muted)] leading-tight mt-0.5">{t(option.tagline)}</span>
              </span>
              {on && <Check size={16} strokeWidth={3} className="shrink-0 text-[var(--text)]" aria-hidden="true" />}
            </span>
            <span className="block space-y-1">
              {option.points.map((point) => (
                <span key={point} className="block text-[11px] font-semibold text-[var(--muted)] leading-snug">· {t(point)}</span>
              ))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Settings > Mode. Switching is instant and loses nothing: Basic only hides screens, and the budgets,
 * goals, accounts, recurring items and savings entries come back when Full is picked again.
 */
export function ModeSetting() {
  const { data, updateSettings } = useApp();
  return (
    <div className="space-y-2">
      <ModeCards value={data.settings.mode} onPick={(mode) => updateSettings({ mode, modeChosen: true })} />
      <p className="px-1 text-[11px] font-medium text-[var(--muted)] leading-snug">
        {t('Switching only changes what is shown. Nothing is deleted: budgets, goals, accounts and recurring items come back in Full.')}
      </p>
    </div>
  );
}

/**
 * First launch: a full-screen choice between Basic and Full, shown until one is picked (`settings.modeChosen`).
 * Journals that already exist are never asked; the guided tour (`?tour=1`) never shows it.
 */
export function ModeChooser() {
  const { data, updateSettings } = useApp();
  const heading = useRef<HTMLHeadingElement>(null);
  const open = !data.settings.modeChosen && !inTourEmbed();

  useEffect(() => {
    if (open) heading.current?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="mode-chooser-title" data-scroll-fade="y" className="fixed inset-0 z-[200] overflow-y-auto bg-[var(--bg)] text-[var(--text)] font-sans">
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center gap-5 px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="space-y-1.5 text-center">
          <h2 id="mode-chooser-title" ref={heading} tabIndex={-1} className="text-2xl font-extrabold tracking-tight outline-none">
            {t('How do you want to use Koink?')}
          </h2>
          <p className="text-sm font-medium text-[var(--muted)]">{t('Pick one to start. You can change it any time in Settings.')}</p>
        </div>
        <ModeCards value={null} onPick={(mode) => updateSettings({ mode, modeChosen: true })} />
      </div>
    </div>
  );
}
