import { useRef, useState } from 'react';
import { Banknote, Download, EyeOff, Gift, ListChecks, Minimize2, Receipt, RefreshCw, Repeat, Sparkles, Trash2, Upload, Zap, type LucideIcon } from 'lucide-react';
import { PigIcon } from '../lib/pig';
import { AppIcon } from '../components/Brand';
import { InstallApp } from '../components/InstallApp';
import { Modal } from '../components/Modal';
import { ProjectDownload } from '../components/ProjectDownload';
import { Collapsible, ConfirmDialog, SectionLabel, seg, Switch } from '../components/ui';
import { todayStr } from '../lib/dates';
import { LANGUAGES, t } from '../lib/i18n';
import { saveTextFile } from '../lib/platform';
import { useApp, useSheet } from '../lib/store';
import { MONO_HUES, STYLE_PRESETS } from '../lib/themes';
import type { QuickAddKey, Theme } from '../lib/types';
import { NotificationSettings } from './NotificationSettings';
import { WidgetsSettings } from './WidgetsSettings';
import { CurrencyGrid } from './shared';

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
  { key: 'saving', label: 'Savings', icon: PigIcon, tone: 'bg-weight text-weight-ink' },
  { key: 'giftcard', label: 'Gift cards', icon: Gift, tone: 'bg-[#FFD9E8] text-[#7A1F4B]' },
];

const dataButton =
  'pressable pressable-soft flex-1 min-w-0 py-2.5 px-3 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] text-xs font-extrabold inline-flex items-center justify-center gap-1.5';

export function SettingsSheet() {
  const { isOpen } = useSheet('settings');
  const { data, updateSettings, closeSheet, openSheet, exportData, importData, loadSample, eraseAll, showToast, refreshRates } = useApp();
  const [updatingRates, setUpdatingRates] = useState(false);
  const { settings } = data;
  const fileInput = useRef<HTMLInputElement>(null);
  const [eraseStep, setEraseStep] = useState<0 | 1 | 2>(0);
  const [confirmSample, setConfirmSample] = useState(false);
  const hasEntries = data.txs.length > 0;

  const download = async () => {
    try {
      const result = await saveTextFile(`koink_backup_${todayStr()}.json`, exportData());
      if (result === 'downloaded') showToast(t('Backup saved to your downloads'));
      else if (result === 'shared') showToast(t('Backup handed to the app you chose'));
    } catch {
      showToast(t('The backup could not be saved'));
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const ok = importData(await file.text());
    showToast(ok ? t('Backup restored') : t('That file is not a Koink backup'));
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={t('Settings')} maxWidth="max-w-lg">
      <div className="space-y-5">
        {/* Language: the first thing in Settings */}
        <div>
          <SectionLabel>{t('Language')}</SectionLabel>
          <div className="flex gap-1.5" role="group" aria-label={t('Language')}>
            {LANGUAGES.map((language) => (
              <button
                key={language.id}
                type="button"
                lang={language.id}
                aria-pressed={settings.language === language.id}
                onClick={() => updateSettings({ language: language.id })}
                className={seg(settings.language === language.id)}
              >
                {t(language.label)}
              </button>
            ))}
          </div>
        </div>

        <Collapsible title={t('Appearance')} defaultOpen>
          <div>
            <SectionLabel>{t('Theme')}</SectionLabel>
            <div className="flex gap-1.5" role="group" aria-label={t('Theme')}>
              {THEME_CHOICES.map(([theme, label]) => (
                <button key={theme} type="button" aria-pressed={settings.theme === theme} onClick={() => updateSettings({ theme })} className={seg(settings.theme === theme)}>
                  {t(label)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">{t('Style')}</span>
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
                {t('Classic')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label={t('Style')}>
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
                      <span className={`block text-[10px] font-semibold leading-tight truncate mt-0.5 ${active ? 'opacity-80' : 'text-[var(--muted)]'}`}>{t(preset.tag)}</span>
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
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)] block mb-2">{t('Mono colour')}</span>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('Mono colour')}>
                {MONO_HUES.map((hue) => {
                  const active = settings.monoHue.toLowerCase() === hue.hex;
                  return (
                    <button
                      key={hue.id}
                      type="button"
                      aria-pressed={active}
                      aria-label={t(hue.label)}
                      title={t(hue.label)}
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
                <span className="block text-xs font-extrabold text-[var(--text)] leading-tight">{t('Ultra minimal')}</span>
                <span className="block text-[11px] font-medium text-[var(--muted)] leading-tight mt-0.5">{t('Icons instead of labels, tighter cards')}</span>
              </span>
            </span>
            <Switch on={settings.ultraMinimal} />
          </button>

          <button
            type="button"
            role="switch"
            aria-checked={settings.hideSplit}
            onClick={() => updateSettings({ hideSplit: !settings.hideSplit })}
            className="w-full flex items-center justify-between gap-3 bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] rounded-2xl px-3 py-2.5 transition-colors text-left"
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="size-8 rounded-full bg-[#CFE7FE] text-[#1A4670] flex items-center justify-center shrink-0">
                <EyeOff size={15} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-extrabold text-[var(--text)] leading-tight">{t('Hide needs, wants and savings')}</span>
                <span className="block text-[11px] font-medium text-[var(--muted)] leading-tight mt-0.5">{t('Takes the three cards off the Month page')}</span>
              </span>
            </span>
            <Switch on={settings.hideSplit} />
          </button>
        </Collapsible>

        {/* Currency */}
        <Collapsible title={t('Currency')}>
        <div>
          <CurrencyGrid value={settings.currency} onChange={(code) => updateSettings({ currency: code })} label={t('Currency of the journal')} />
          <p className="mt-2 text-[11px] font-medium text-[var(--muted)]">
            {t('The journal\'s currency. Any single entry can be paid in another one: its amount is converted with the rates below.')}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={updatingRates}
              onClick={async () => {
                setUpdatingRates(true);
                const ok = await refreshRates();
                setUpdatingRates(false);
                showToast(ok ? t('Exchange rates updated') : t('Could not reach the rates service. The saved rates stay.'));
              }}
              className={`${dataButton} flex-none disabled:opacity-60`}
            >
              <RefreshCw size={14} aria-hidden="true" className={updatingRates ? 'animate-spin' : ''} />
              {t('Update exchange rates')}
            </button>
            <span className="min-w-0 text-[11px] font-medium text-[var(--muted)]">
              {settings.ratesDate ? t('Fetched {ratesDate}', { ratesDate: settings.ratesDate }) : t('Built-in, approximate')}
            </span>
          </div>
        </div>
        </Collapsible>

        <button
          type="button"
          onClick={() => openSheet({ type: 'categories' })}
          className="pressable pressable-soft w-full flex items-center justify-between gap-3 rounded-2xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-extrabold text-[var(--text)]">{t('Expense categories')}</span>
            <span className="block text-[11px] font-medium text-[var(--muted)]">{t('Make your own, hide the ones you do not use')}</span>
          </span>
          <ListChecks size={18} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
        </button>

        {/* Quick-add bar */}
        <Collapsible title={t('Buttons in the bottom bar')}>
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
                    <span className="truncate">{t(row.label)}</span>
                  </span>
                  <span className="scale-[0.82] origin-right shrink-0">
                    <Switch on={on} />
                  </span>
                </button>
              );
            })}
          </div>
        </Collapsible>

        <WidgetsSettings />

        <NotificationSettings />

        <InstallApp />

        <Collapsible title={t('Your data')}>
          <p className="text-xs font-medium text-[var(--muted)]">
            {t('Everything stays in this browser. There is no account and nothing is uploaded, so keep a backup if the journal matters to you.')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => void download()} className={dataButton}>
              <Download size={14} />
              {t('Save backup')}
            </button>
            <button type="button" onClick={() => fileInput.current?.click()} className={dataButton}>
              <Upload size={14} />
              {t('Restore backup')}
            </button>
            <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => void onFile(event.target.files?.[0])} />
          </div>
          <button type="button" onClick={() => (hasEntries ? setConfirmSample(true) : loadSample())} className={`${dataButton} w-full`}>
            <Sparkles size={14} />
            {t('Load the sample journal')}
          </button>
        </Collapsible>

        <ProjectDownload />

        <div className="flex items-center justify-center gap-2.5 pt-1">
          <AppIcon className="size-8" />
          <p className="text-[11px] font-medium text-[var(--muted)] leading-tight">
            <span className="block font-extrabold text-[var(--text)]">{t('Koink')}</span>
            {t('A local-first money journal')}
          </p>
        </div>

        {/* As big as the other fields, in the muted red of a danger action. Two confirmations follow. */}
        <button
          type="button"
          onClick={() => setEraseStep(1)}
          className="pressable w-full flex items-center justify-between gap-3 rounded-2xl bg-[#D93636]/10 hover:bg-[#D93636]/20 border border-[#D93636]/25 px-4 py-3 text-left text-[#C94444]"
        >
          <span className="min-w-0">
            <span className="block text-sm font-extrabold">{t('Delete all data')}</span>
            <span className="block text-[11px] font-medium opacity-80">{t('Erase every entry, goal, budget and account in this browser')}</span>
          </span>
          <Trash2 size={18} className="shrink-0" aria-hidden="true" />
        </button>
      </div>

      <ConfirmDialog
        open={confirmSample}
        title={t('Replace your journal?')}
        message={t('Loading the sample journal replaces your entries, goals, budgets and recurring items. Save a backup first if you want to keep them.')}
        confirmLabel={t('Replace')}
        onCancel={() => setConfirmSample(false)}
        onConfirm={() => {
          setConfirmSample(false);
          loadSample();
          showToast(t('Sample journal loaded'));
        }}
      />
      <ConfirmDialog
        open={eraseStep === 1}
        title={t('Delete all data?')}
        message={t('Every entry, goal, budget and recurring item in this browser is erased.')}
        confirmLabel={t('Continue')}
        onCancel={() => setEraseStep(0)}
        onConfirm={() => setEraseStep(2)}
      />
      <ConfirmDialog
        open={eraseStep === 2}
        title={t('This cannot be undone')}
        message={t('There is no copy anywhere else unless you saved a backup. Erase the journal for good?')}
        confirmLabel={t('Erase everything')}
        onCancel={() => setEraseStep(0)}
        onConfirm={() => {
          setEraseStep(0);
          eraseAll();
          closeSheet();
          showToast(t('Journal erased'));
        }}
      />
    </Modal>
  );
}
