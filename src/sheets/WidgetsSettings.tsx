import { Check } from 'lucide-react';
import { WidgetFace } from '../components/WidgetButtons';
import { Collapsible, SectionLabel, Switch } from '../components/ui';
import { visibleExpenseCategories } from '../lib/categories';
import { isNativeApp } from '../lib/platform';
import { t } from '../lib/i18n';
import { useApp } from '../lib/store';
import { actionFor, CATEGORY_MAX, catKey, categoryWidgetKeys, FIXED_ACTIONS, MULTI_MAX } from '../lib/widgets';

/**
 * Settings > Widgets (a collapsible section, no sheet of its own): which button the single widget has, which
 * buttons the multiple widget has, which categories the category widget has. The previews are live.
 */
export function WidgetsSettings() {
  return (
    <Collapsible title={t('Widgets')}>
      <WidgetsForm />
    </Collapsible>
  );
}

function Chip({ actionKey, on, disabled, onClick, mode }: { actionKey: string; on: boolean; disabled?: boolean; onClick: () => void; mode: 'one' | 'many' }) {
  const action = actionFor(actionKey);
  const Icon = action.icon;
  return (
    <button
      type="button"
      role={mode === 'one' ? 'radio' : 'checkbox'}
      aria-checked={on}
      disabled={disabled && !on}
      onClick={onClick}
      className={`pressable inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-extrabold disabled:opacity-40 ${
        on ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]' : 'bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--text)] border-[var(--border)]'
      }`}
    >
      {on && mode === 'many' ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />}
      <span className="truncate max-w-[9rem]">{t(action.label)}</span>
    </button>
  );
}

function Block({ title, hint, children, preview }: { title: string; hint: string; children: React.ReactNode; preview: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <div>
        <SectionLabel>{t(title)}</SectionLabel>
        <p className="-mt-1 text-[11px] font-medium text-[var(--muted)]">{t(hint)}</p>
      </div>
      <div data-scroll-fade="x" className="rounded-2xl bg-[var(--inset)] border border-[var(--border)] p-3 flex justify-center overflow-x-auto no-scrollbar">{preview}</div>
      {children}
    </section>
  );
}

function WidgetsForm() {
  const { data, updateSettings } = useApp();
  const widgets = data.settings.widgets;
  const set = (patch: Partial<typeof widgets>) => updateSettings({ widgets: { ...widgets, ...patch } });
  const categories = visibleExpenseCategories().map((c) => catKey(c.id));
  const fixed = FIXED_ACTIONS.map((a) => a.key);
  const everything = [...fixed, ...categories];
  const native = isNativeApp();

  const toggle = (list: string[], key: string, max: number) => (list.includes(key) ? list.filter((k) => k !== key) : list.length < max ? [...list, key] : list);
  const picked = widgets.categories.filter((k) => categories.includes(k));
  const catKeys = categoryWidgetKeys({ ...widgets, categories: picked });

  return (
    <div className="space-y-3.5">
      <p className="text-xs font-medium text-[var(--muted)]">
        {native
          ? t('Press and hold the home screen, choose Widgets, then Koink: Button, Buttons or Expense types. A Button widget asks which button it should be when you place it; Buttons and Expense types show what you set here.')
          : t('On Android, the Koink app can put these on the home screen. Here you can still switch them on for the Month page.')}
      </p>

      <Block
        title={t('Single button')}
        hint={native ? t('The default. Each Button widget you place on the home screen gets its own button, picked when you add it.') : t('One button. You decide what it does.')}
        preview={<WidgetFace keys={[widgets.single]} />}
      >
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t('Button of the single widget')}>
          {everything.map((key) => <Chip key={key} mode="one" actionKey={key} on={widgets.single === key} onClick={() => set({ single: key })} />)}
        </div>
      </Block>

      <Block
        title={t('Multiple buttons')}
        hint={t('Up to {max} buttons, in the order you tap them ({n} chosen).', { max: MULTI_MAX, n: widgets.multi.length })}
        preview={<WidgetFace keys={widgets.multi} />}
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Buttons of the multiple widget')}>
          {everything.map((key) => (
            <Chip key={key} mode="many" actionKey={key} on={widgets.multi.includes(key)} disabled={widgets.multi.length >= MULTI_MAX} onClick={() => set({ multi: toggle(widgets.multi, key, MULTI_MAX) })} />
          ))}
        </div>
      </Block>

      <Block
        title={t('Expense types')}
        hint={t('One button per category: a tap opens Add expense with that category chosen. Up to {max}; none chosen = the first {max} you see on the Month page.', { max: CATEGORY_MAX })}
        preview={<WidgetFace keys={catKeys} />}
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Categories of the category widget')}>
          {categories.map((key) => (
            <Chip key={key} mode="many" actionKey={key} on={picked.includes(key)} disabled={picked.length >= CATEGORY_MAX} onClick={() => set({ categories: toggle(picked, key, CATEGORY_MAX) })} />
          ))}
        </div>
        {picked.length > 0 && (
          <button type="button" onClick={() => set({ categories: [] })} className="pressable text-[11px] font-extrabold text-[var(--muted)] hover:text-[var(--text)]">
            {t('Use the first {max} again', { max: CATEGORY_MAX })}
          </button>
        )}
      </Block>

      <button
        type="button"
        role="switch"
        aria-checked={widgets.showInApp}
        onClick={() => set({ showInApp: !widgets.showInApp })}
        className="w-full flex items-center justify-between gap-3 rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-3.5 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-extrabold text-[var(--text)]">{t('Show them on the Month page')}</span>
          <span className="block text-[11px] font-medium text-[var(--muted)]">{t('The same three widgets, above the cards. Works in the browser too.')}</span>
        </span>
        <Switch on={widgets.showInApp} />
      </button>
    </div>
  );
}
