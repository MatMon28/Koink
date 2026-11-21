import { useRef, useState } from 'react';
import { Banknote, Download, Minimize2, PiggyBank, Receipt, Repeat, Sparkles, Trash2, Upload, Zap, type LucideIcon } from 'lucide-react';
import { AppIcon } from '../components/Brand';
import { InstallApp } from '../components/InstallApp';
import { Modal } from '../components/Modal';
import { ProjectDownload } from '../components/ProjectDownload';
import { Collapsible, ConfirmDialog, SectionLabel, seg, Switch } from '../components/ui';
import { todayStr } from '../lib/dates';
import { CURRENCIES } from '../lib/format';
import { saveTextFile } from '../lib/platform';
import { useApp, useSheet } from '../lib/store';
import { MONO_HUES, STYLE_PRESETS } from '../lib/themes';
import type { QuickAddKey, Theme } from '../lib/types';
import { NotificationSettings } from './NotificationSettings';

const THEME_CHOICES: [Theme, string][] = [
  ['light', 'Light'],
  ['lite-dark', 'Soft dark'],
  ['dark', 'Dark'],
];

const QUICK_ROWS: { key: QuickAddKey; label: string; icon: LucideIcon; tone: string }[] = [
  { key: 'income', label: 'Income', icon: Banknote, tone: 'bg-intake text-intake-ink' },
  { key: 'expense', label: 'Expense', icon: Receipt, tone: 'bg-activity text-activity-ink' },
  { key: 'recurring', label: 'Recurring', icon: Repeat, tone: 'bg-[#CFE7FE] text-[#183F66]' },
  { key: 'quick', label: 'Log again', icon: Zap, tone: 'bg-[#FAE0B4] text-[#7D4E14]' },
  { key: 'saving', label: 'Savings', icon: PiggyBank, tone: 'bg-weight text-weight-ink' },
];

const GESTURES: [string, string][] = [
  ['Swipe left or right', 'Next or previous page'],
  ['Swipe the month row', 'Next or previous month'],
  ['Drag a sheet down', 'Close it'],
  ['Back', 'Close the open sheet or month picker'],
  ['Tap the launch animation', 'Skip it'],
  ['Hold + or -', 'Keep counting'],
  ['Scroll down', 'Hide the bottom bar'],
];

const dataButton =
  'pressable pressable-soft flex-1 min-w-0 py-2.5 px-3 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] text-xs font-extrabold inline-flex items-center justify-center gap-1.5';

export function SettingsSheet() {
  const { isOpen } = useSheet('settings');
  const { data, updateSettings, closeSheet, exportData, importData, loadSample, eraseAll, showToast } = useApp();
  const { settings } = data;
  const fileInput = useRef<HTMLInputElement>(null);
  const [eraseStep, setEraseStep] = useState<0 | 1 | 2>(0);
  const [confirmSample, setConfirmSample] = useState(false);
  const hasEntries = data.txs.length > 0;

  const download = async () => {
    try {
      const result = await saveTextFile(`koink_backup_${todayStr()}.json`, exportData());
      if (result === 'downloaded') showToast('Backup saved to your downloads');
      else if (result === 'shared') showToast('Backup handed to the app you chose');
    } catch {
      showToast('The backup could not be saved');
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const ok = importData(await file.text());
    showToast(ok ? 'Backup restored' : 'That file is not a Koink backup');
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title="Settings" maxWidth="max-w-lg">
      <div className="space-y-5">
        {/* Currency */}
        <div>
          <SectionLabel>Currency</SectionLabel>
          <div className="flex gap-1.5" role="group" aria-label="Currency">
            {CURRENCIES.map((currency) => (
              <button
                key={currency.code}
                type="button"
                aria-pressed={settings.currency === currency.code}
                onClick={() => updateSettings({ currency: currency.code })}
                title={currency.name}
                className={seg(settings.currency === currency.code)}
              >
                {currency.code}
              </button>
            ))}
          </div>
        </div>

        <Collapsible title="Appearance" defaultOpen>
          <div>
            <SectionLabel>Theme</SectionLabel>
            <div className="flex gap-1.5" role="group" aria-label="Theme">
              {THEME_CHOICES.map(([theme, label]) => (
                <button key={theme} type="button" aria-pressed={settings.theme === theme} onClick={() => updateSettings({ theme })} className={seg(settings.theme === theme)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">Style</span>
              <button
                type="button"
                aria-pressed={settings.themeStyle === 'classic'}
                onClick={() => updateSettings({ themeStyle: 'classic' })}
                className={`pressable px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
                  settings.themeStyle === 'classic'
                    ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
                    : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                }`}
              >
                Classic
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Style">
              {STYLE_PRESETS.map((preset) => {
                const active = settings.themeStyle === preset.id;
                const swatches = preset.id === 'mono' ? ['#0f172a', settings.monoHue, '#e2e8f0'] : preset.swatches;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateSettings({ themeStyle: preset.id })}
                    className={`pressable flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left border transition-colors ${
                      active
                        ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
                        : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] border-[var(--border)]'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-extrabold leading-tight truncate">{preset.name}</span>
                      <span className={`block text-[10px] font-semibold leading-tight truncate mt-0.5 ${active ? 'opacity-80' : 'text-[var(--muted)]'}`}>{preset.tag}</span>
                    </span>
                    <span className="inline-flex items-center -space-x-1 shrink-0" aria-hidden="true">
                      {swatches.map((hex, index) => (
                        <span key={index} className="size-3.5 rounded-full border border-black/20" style={{ backgroundColor: hex }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {settings.themeStyle === 'mono' && (
            <div className="bg-[var(--inset)] border border-[var(--border)] rounded-xl p-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-2">Mono colour</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Mono colour">
                {MONO_HUES.map((hue) => {
                  const active = settings.monoHue.toLowerCase() === hue.hex;
                  return (
                    <button
                      key={hue.id}
                      type="button"
                      aria-pressed={active}
                      aria-label={hue.label}
                      title={hue.label}
                      onClick={() => updateSettings({ monoHue: hue.hex })}
                      className={`pressable size-8 rounded-full border-2 ${active ? 'border-[var(--text)] scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: hue.hex, clipPath: 'none', borderRadius: 9999 }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="button"
            role="switch"
            aria-checked={settings.ultraMinimal}
            onClick={() => updateSettings({ ultraMinimal: !settings.ultraMinimal })}
            className="w-full flex items-center justify-between gap-3 bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] rounded-2xl px-3 py-2.5 transition-colors text-left"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="size-8 rounded-full bg-[#E2D6FF] text-[#4D3582] flex items-center justify-center shrink-0">
                <Minimize2 size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-extrabold text-[var(--text)] leading-tight">Ultra minimal</span>
                <span className="block text-[11px] font-medium text-[var(--muted)] leading-tight mt-0.5">Icons instead of labels, tighter cards</span>
              </span>
            </span>
            <Switch on={settings.ultraMinimal} />
          </button>
        </Collapsible>

        {/* Quick-add bar */}
        <div>
          <SectionLabel>Buttons in the bottom bar</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {QUICK_ROWS.map((row) => {
              const Icon = row.icon;
              const on = settings.quickAdd[row.key];
              return (
                <button
                  key={row.key}
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => updateSettings({ quickAdd: { ...settings.quickAdd, [row.key]: !on } })}
                  className="w-full flex items-center justify-between gap-2 rounded-xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2 text-left"
                >
                  <span className="flex items-center gap-2 text-xs font-extrabold text-[var(--text)] min-w-0">
                    <span className={`size-7 rounded-full flex items-center justify-center shrink-0 ${row.tone}`}>
                      <Icon size={13} />
                    </span>
                    <span className="truncate">{row.label}</span>
                  </span>
                  <span className="scale-[0.82] origin-right shrink-0">
                    <Switch on={on} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <NotificationSettings />

        <InstallApp />

        <Collapsible title="Gestures">
          <ul className="space-y-2">
            {GESTURES.map(([action, result]) => (
              <li key={action} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-extrabold text-[var(--text)]">{action}</span>
                <span className="font-medium text-[var(--muted)] text-right">{result}</span>
              </li>
            ))}
          </ul>
        </Collapsible>

        <Collapsible title="Your data">
          <p className="text-xs font-medium text-[var(--muted)]">
            Everything stays in this browser. There is no account and nothing is uploaded, so keep a backup if the journal matters to you.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => void download()} className={dataButton}>
              <Download size={14} />
              Save backup
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} className={dataButton}>
              <Upload size={14} />
              Restore backup
            </button>
            <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => void onFile(event.target.files?.[0])} />
          </div>
          <button type="button" onClick={() => (hasEntries ? setConfirmSample(true) : loadSample())} className={`${dataButton} w-full`}>
            <Sparkles size={14} />
            Load the sample journal
          </button>
        </Collapsible>

        <ProjectDownload />

        <div className="flex items-center justify-center gap-2.5 pt-1">
          <AppIcon className="size-8" />
          <p className="text-[11px] font-medium text-[var(--muted)] leading-tight">
            <span className="block font-extrabold text-[var(--text)]">Koink</span>
            A local-first money journal
          </p>
        </div>

        {/* Deliberately quiet: small, muted red, centred. Two confirmations. */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setEraseStep(1)}
            className="pressable py-1.5 px-3.5 rounded-xl bg-[#D93636]/10 hover:bg-[#D93636]/20 border border-[#D93636]/25 text-[#C94444] font-bold text-xs flex items-center justify-center gap-1.5"
          >
            <Trash2 size={13} className="shrink-0" />
            <span>Delete all data</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSample}
        title="Replace your journal?"
        message="Loading the sample journal replaces your entries, goals, budgets and recurring items. Save a backup first if you want to keep them."
        confirmLabel="Replace"
        onCancel={() => setConfirmSample(false)}
        onConfirm={() => {
          setConfirmSample(false);
          loadSample();
          showToast('Sample journal loaded');
        }}
      />
      <ConfirmDialog
        open={eraseStep === 1}
        title="Delete all data?"
        message="Every entry, goal, budget and recurring item in this browser is erased."
        confirmLabel="Continue"
        onCancel={() => setEraseStep(0)}
        onConfirm={() => setEraseStep(2)}
      />
      <ConfirmDialog
        open={eraseStep === 2}
        title="This cannot be undone"
        message="There is no copy anywhere else unless you saved a backup. Erase the journal for good?"
        confirmLabel="Erase everything"
        onCancel={() => setEraseStep(0)}
        onConfirm={() => {
          setEraseStep(0);
          eraseAll();
          closeSheet();
          showToast('Journal erased');
        }}
      />
    </Modal>
  );
}
