import { Banknote, BookOpen, ChartPie, Gift, Plus, Receipt, Repeat, Wallet, Zap, type LucideIcon } from 'lucide-react';
import { categoryMeta, visibleExpenseCategories } from './categories';
import { PigIcon } from './pig';
import type { OpenTarget, WidgetSettings } from './types';

/**
 * Widgets: a button is an action key. `expense`, `income`, `saving`, `recurring`, `quick`, `giftcard`, `stats`
 * and `budgets` are fixed; `cat:<expense category id>` opens Add expense with that category already chosen
 * (Housing, Bills, Groceries...). Three widgets use them:
 *   single      one button, any action the user picks
 *   multi       the buttons the user picks
 *   categories  one button per expense category
 * The same buttons are drawn in the app (WidgetStrip) and, on Android, on the home screen (KoinkWidgetProvider).
 */

export const CAT_PREFIX = 'cat:';
export const catKey = (id: string) => `${CAT_PREFIX}${id}`;
export const isCatKey = (key: string) => key.startsWith(CAT_PREFIX);
export const catId = (key: string) => key.slice(CAT_PREFIX.length);

/** What a widget button looks like. Hex on purpose: the Android widget cannot read CSS variables. */
export interface WidgetAction {
  key: string;
  label: string;
  icon: LucideIcon;
  bg: string;
  fg: string;
}

const FIXED: WidgetAction[] = [
  { key: 'expense', label: 'Expense', icon: Receipt, bg: '#F6D0D0', fg: '#702D32' },
  { key: 'income', label: 'Income', icon: Banknote, bg: '#C9EFD3', fg: '#17432A' },
  { key: 'saving', label: 'Savings', icon: PigIcon, bg: '#E2D6FF', fg: '#49346F' },
  { key: 'recurring', label: 'Recurring', icon: Repeat, bg: '#CFE7FE', fg: '#183F66' },
  { key: 'quick', label: 'Log again', icon: Zap, bg: '#FAE0B4', fg: '#7D4E14' },
  { key: 'giftcard', label: 'Gift card', icon: Gift, bg: '#FFD9E8', fg: '#7A1F4B' },
  { key: 'budgets', label: 'Budgets', icon: Wallet, bg: '#EFE9DD', fg: '#24201C' },
  { key: 'stats', label: 'Statistics', icon: ChartPie, bg: '#EFE9DD', fg: '#24201C' },
];

const CATEGORY_TONE = { bg: '#FBF8F2', fg: '#24201C' };

/** The fixed actions, in the order the picker lists them. */
export const FIXED_ACTIONS: readonly WidgetAction[] = FIXED;

const KEY_PATTERN = /^(expense|income|saving|recurring|quick|giftcard|budgets|stats|cat:[\w-]{1,64})$/;
export const isActionKey = (value: unknown): value is string => typeof value === 'string' && KEY_PATTERN.test(value);

/** Name, icon and colours of an action key. An unknown category falls back to a plain "+". */
export function actionFor(key: string): WidgetAction {
  if (isCatKey(key)) {
    const meta = categoryMeta('expense', catId(key), []);
    return { key, label: meta.name, icon: meta.icon ?? Plus, ...CATEGORY_TONE };
  }
  return FIXED.find((a) => a.key === key) ?? { key, label: 'Add', icon: BookOpen, ...CATEGORY_TONE };
}

export const defaultWidgets = (): WidgetSettings => ({
  single: 'expense',
  multi: ['expense', 'income', 'saving', 'quick'],
  categories: [],
  showInApp: false,
});

const cleanKeys = (raw: unknown, max: number): string[] => {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) if (isActionKey(item) && !out.includes(item)) out.push(item);
  return out.slice(0, max);
};

/** Accepts anything stored (an old journal, an imported backup) and returns well-formed widget settings. */
export function normalizeWidgets(raw: unknown): WidgetSettings {
  const base = defaultWidgets();
  if (!raw || typeof raw !== 'object') return base;
  const src = raw as Partial<WidgetSettings>;
  const multi = cleanKeys(src.multi, 6);
  return {
    single: isActionKey(src.single) ? src.single : base.single,
    multi: Array.isArray(src.multi) ? multi : base.multi,
    categories: cleanKeys(src.categories, 12).filter(isCatKey),
    showInApp: src.showInApp === true,
  };
}

/** The buttons of the category widget: the picked categories, or every visible one when none is picked. */
export function categoryWidgetKeys(settings: WidgetSettings): string[] {
  const picked = settings.categories;
  return (picked.length ? picked : visibleExpenseCategories().map((c) => catKey(c.id))).slice(0, 8);
}

export const MULTI_MAX = 6;
export const CATEGORY_MAX = 8;

/* ---------- Links: a tapped Android widget opens the app with one of these ---------- */

const LINK_BASE = 'koink://widget';
export const widgetLink = (key: string) => `${LINK_BASE}?a=${encodeURIComponent(key)}`;

/** The action behind a `koink://widget?a=...` link, or null for any other URL. */
export function parseWidgetLink(url: string | null | undefined): string | null {
  if (!url || !url.startsWith(LINK_BASE)) return null;
  const query = url.split('?')[1] ?? '';
  const value = new URLSearchParams(query).get('a');
  return isActionKey(value) ? value : null;
}

/** What an action key asks the shell to do: open an Add sheet (with a category), or one of the shell's own targets. */
export type WidgetIntent =
  | { type: 'category'; categoryId: string }
  | { type: 'target'; target: OpenTarget }
  | { type: 'saving' }
  | { type: 'quick' };

export function intentFor(key: string): WidgetIntent {
  if (isCatKey(key)) return { type: 'category', categoryId: catId(key) };
  if (key === 'saving') return { type: 'saving' };
  if (key === 'quick') return { type: 'quick' };
  return { type: 'target', target: key as OpenTarget };
}
