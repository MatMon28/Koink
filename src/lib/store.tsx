import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { sortTxs } from './calc';
import { DEFAULT_HIDDEN_CATEGORIES, syncCategories } from './categories';
import { inTourEmbed, normalizeMode, syncMode } from './mode';
import { syncTabs } from './tabs';
import { giftCardIncomeTxs, syncGiftCards } from './giftcards';
import { currentMonth, daysInMonth, formatDay, pad, todayStr } from './dates';
import { buildSampleTxs, SAMPLE_ACCOUNTS, SAMPLE_GOALS, SAMPLE_PROFILE, SAMPLE_RECURRING } from './demo';
import { whenIdle } from './idle';
import { currencyLocked, summarizeJournal, type BackupPreview } from './journal';
import { currencySymbol, exchangeRate, formatMoney, formatMoneyFit, isCurrency, round2, type MoneyOptions } from './format';
import { normalizeNotificationSettings } from './reminders';
import { syncLaunchBackground, syncSystemBars } from './platform';
import { getSaveState, STORAGE_KEY, subscribeSaveState, writeJournal, type SaveState } from './storage';
import { applyThemeAttributes, applyUltraMinimal, DEFAULT_MONO_HUE, normalizeMonoHue, normalizeTheme, normalizeThemeStyle } from './themes';
import { detectLanguage, normalizeLanguage, setLanguage } from './i18n';
import { normalizeWidgets } from './widgets';
import type { Account, ActiveTab, AppData, CategoryType, CurrencyCode, CustomCategory, GiftCard, Goal, Profile, Recurring, Settings, Sheet, Tx } from './types';
import { t } from './i18n';


const defaultSettings = (): Settings => ({
  language: detectLanguage(),
  // Full until the first-launch chooser (ModeChooser.tsx) records the user's pick.
  mode: 'full',
  modeChosen: false,
  hideSplit: false,
  hideBudgets: false,
  theme: 'light',
  themeStyle: 'classic',
  monoHue: DEFAULT_MONO_HUE,
  ultraMinimal: false,
  currency: 'EUR',
  hiddenCategories: [...DEFAULT_HIDDEN_CATEGORIES],
  inflationExcluded: [],
  rates: {},
  ratesDate: '',
  quickAdd: { income: true, expense: true, recurring: true, quick: true, saving: true, giftcard: false },
  widgets: normalizeWidgets(undefined),
  notifications: normalizeNotificationSettings(undefined),
  sampleData: false,
});

function legacySplitHidden(): boolean {
  try {
    return localStorage.getItem('koink_month_split_hidden') === 'true';
  } catch {
    return false;
  }
}

const NO_CARDS: GiftCard[] = [];
const emptyProfile = (): Profile => ({ name: '', rule: { needs: 50, wants: 30, savings: 20 }, budgets: {}, monthlyBudget: 0 });

function sampleData(settings: Settings = defaultSettings()): AppData {
  return {
    txs: sortTxs(buildSampleTxs()),
    goals: SAMPLE_GOALS.map((g) => ({ ...g })),
    recurring: SAMPLE_RECURRING.map((r) => ({ ...r })),
    accounts: SAMPLE_ACCOUNTS.map((a) => ({ ...a })),
    giftCards: [],
    categories: [],
    categoryTypes: [],
    profile: { ...SAMPLE_PROFILE, rule: { ...SAMPLE_PROFILE.rule }, budgets: { ...SAMPLE_PROFILE.budgets } },
    settings: { ...settings, sampleData: true },
  };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';

const ID_PATTERN = /^[\w-]{1,64}$/;

function cleanRates(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') for (const [code, rate] of Object.entries(raw)) if (isCurrency(code) && isNum(rate) && rate > 0) out[code] = rate;
  return out;
}

/** The two counting choices of a gift card. Counting the value as income needs a valid day; without one it is off. Older journals have neither (income off, spending on). */
function cleanGiftCardCounting(g: Partial<GiftCard>): Pick<GiftCard, 'countAsIncome' | 'incomeDate' | 'countAsSpending'> {
  const incomeDate = isStr(g.incomeDate) && /^\d{4}-\d{2}-\d{2}$/.test(g.incomeDate) ? g.incomeDate : undefined;
  return {
    countAsIncome: g.countAsIncome === true && !!incomeDate ? true : undefined,
    incomeDate: g.countAsIncome === true ? incomeDate : undefined,
    countAsSpending: g.countAsSpending === false ? false : undefined,
  };
}

function cleanGiftCardUse(raw: unknown): Tx['giftCard'] {
  const g = raw as Partial<NonNullable<Tx['giftCard']>> | undefined;
  if (!g || !isStr(g.id) || !ID_PATTERN.test(g.id) || !isNum(g.amount) || !(g.amount > 0)) return undefined;
  return { id: g.id, amount: round2(g.amount) };
}

function cleanForeign(raw: unknown): Tx['foreign'] {
  const f = raw as Partial<NonNullable<Tx['foreign']>> | undefined;
  if (!f || !isNum(f.amount) || !(f.amount > 0) || !isNum(f.rate) || !(f.rate > 0) || !isCurrency(f.currency)) return undefined;
  return { amount: round2(f.amount), currency: f.currency, rate: f.rate };
}

/** Accepts anything (a stored journal, an imported backup) and returns a well-formed journal or null. */
function sanitize(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  if (!Array.isArray(src.txs)) return null;

  const txs: Tx[] = [];
  src.txs.forEach((item, index) => {
    const t = item as Partial<Tx>;
    if (!t || !isStr(t.id) || !isNum(t.amount) || !(t.amount > 0)) return;
    if (t.kind !== 'expense' && t.kind !== 'income' && t.kind !== 'saving') return;
    if (!isStr(t.date) || !/^\d{4}-\d{2}-\d{2}$/.test(t.date) || !isStr(t.categoryId)) return;
    txs.push({
      id: t.id,
      kind: t.kind,
      amount: round2(t.amount),
      categoryId: t.categoryId,
      note: isStr(t.note) ? t.note : '',
      details: isStr(t.details) && t.details.trim() ? t.details : undefined,
      accountId: isStr(t.accountId) ? t.accountId : undefined,
      foreign: cleanForeign(t.foreign),
      date: t.date,
      recurringId: isStr(t.recurringId) ? t.recurringId : undefined,
      giftCard: t.kind === 'expense' ? cleanGiftCardUse(t.giftCard) : undefined,
      ts: isNum(t.ts) ? t.ts : index,
    });
  });

  const goals: Goal[] = (Array.isArray(src.goals) ? src.goals : [])
    .filter((g): g is Goal => !!g && isStr((g as Goal).id) && isStr((g as Goal).name))
    .map((g) => ({ id: g.id, name: g.name, target: isNum(g.target) && g.target > 0 ? g.target : 0 }));

  const recurring: Recurring[] = (Array.isArray(src.recurring) ? src.recurring : [])
    .filter((r): r is Recurring => !!r && isStr((r as Recurring).id) && isStr((r as Recurring).name) && isNum((r as Recurring).amount))
    .map((r) => ({
      id: r.id,
      name: r.name,
      amount: round2(Math.max(0, r.amount)),
      kind: r.kind === 'income' ? 'income' : 'expense',
      categoryId: isStr(r.categoryId) ? r.categoryId : 'bills',
      day: isNum(r.day) ? Math.min(28, Math.max(1, Math.round(r.day))) : 1,
      // Items saved before frequencies existed are monthly.
      every: isNum(r.every) && r.every >= 1 ? Math.min(60, Math.round(r.every)) : 1,
      start: isStr(r.start) && /^\d{4}-\d{2}$/.test(r.start) ? r.start : currentMonth(),
      // Weekly items count `every` in weeks from `anchor`; everything saved before is monthly.
      ...(r.unit === 'week' && isStr(r.anchor) && /^\d{4}-\d{2}-\d{2}$/.test(r.anchor) ? { unit: 'week' as const, anchor: r.anchor } : {}),
    }));

  const accounts: Account[] = (Array.isArray(src.accounts) ? src.accounts : [])
    .filter((a): a is Account => !!a && isStr((a as Account).id) && ID_PATTERN.test((a as Account).id) && isStr((a as Account).name))
    .map((a) => ({ id: a.id, name: a.name.slice(0, 40), icon: isStr(a.icon) ? a.icon : 'wallet', opening: isNum(a.opening) ? round2(a.opening) : 0 }));

  const giftCards: GiftCard[] = (Array.isArray(src.giftCards) ? src.giftCards : [])
    .filter((g): g is GiftCard => !!g && isStr((g as GiftCard).id) && ID_PATTERN.test((g as GiftCard).id) && isStr((g as GiftCard).name) && isNum((g as GiftCard).initial))
    .map((g) => ({
      id: g.id,
      name: g.name.slice(0, 40),
      initial: round2(Math.max(0, g.initial)),
      expires: isStr(g.expires) && /^\d{4}-\d{2}-\d{2}$/.test(g.expires) ? g.expires : undefined,
      note: isStr(g.note) && g.note.trim() ? g.note.slice(0, 500) : undefined,
      ...cleanGiftCardCounting(g),
    }));

  const categoryTypes: CategoryType[] = (Array.isArray(src.categoryTypes) ? src.categoryTypes : [])
    .filter((c): c is CategoryType => !!c && isStr((c as CategoryType).id) && ID_PATTERN.test((c as CategoryType).id) && isStr((c as CategoryType).name) && !!(c as CategoryType).name.trim())
    .map((c) => ({ id: c.id, name: c.name.trim().slice(0, 30) }));
  const knownBucket = (b: unknown): string => (b === 'needs' || (isStr(b) && categoryTypes.some((x) => x.id === b)) ? (b as string) : 'wants');

  const categories: CustomCategory[] = (Array.isArray(src.categories) ? src.categories : [])
    .filter((c): c is CustomCategory => !!c && isStr((c as CustomCategory).id) && ID_PATTERN.test((c as CustomCategory).id) && isStr((c as CustomCategory).name))
    .map((c) => ({ id: c.id, name: c.name.slice(0, 30), icon: isStr(c.icon) ? c.icon : 'tag', bucket: knownBucket(c.bucket) }));

  const p = (src.profile ?? {}) as Partial<Profile>;
  const rule = p.rule && isNum(p.rule.needs) && isNum(p.rule.wants) && isNum(p.rule.savings) ? p.rule : emptyProfile().rule;
  const budgets: Record<string, number> = {};
  for (const [id, amount] of Object.entries(p.budgets ?? {})) if (isNum(amount) && amount > 0) budgets[id] = round2(amount);

  const s = (src.settings ?? {}) as Partial<Settings>;
  const base = defaultSettings();
  const settings: Settings = {
    language: s.language === undefined ? base.language : normalizeLanguage(s.language),
    // A journal or backup from before modes existed keeps the whole app (Full) and is not asked again.
    mode: normalizeMode(s.mode),
    modeChosen: s.modeChosen === undefined ? true : s.modeChosen === true,
    hideBudgets: s.hideBudgets === true,
    // Before this setting existed the choice lived in localStorage ('koink_month_split_hidden').
    hideSplit: s.hideSplit === undefined ? legacySplitHidden() : s.hideSplit === true,
    theme: normalizeTheme(s.theme),
    themeStyle: normalizeThemeStyle(s.themeStyle),
    monoHue: normalizeMonoHue(s.monoHue),
    ultraMinimal: s.ultraMinimal === true,
    currency: isCurrency(s.currency) ? s.currency : base.currency,
    hiddenCategories: Array.isArray(s.hiddenCategories) ? s.hiddenCategories.filter(isStr) : [],
    // Journals and backups from before personal inflation exclude nothing.
    inflationExcluded: Array.isArray(s.inflationExcluded) ? s.inflationExcluded.filter(isStr) : [],
    rates: cleanRates(s.rates),
    ratesDate: isStr(s.ratesDate) ? s.ratesDate : '',
    quickAdd: { ...base.quickAdd, ...(s.quickAdd && typeof s.quickAdd === 'object' ? s.quickAdd : {}) },
    // Journals and backups written before widgets existed get the default buttons.
    widgets: normalizeWidgets(s.widgets),
    // Journals and backups written before reminders existed load with everything off.
    notifications: normalizeNotificationSettings(s.notifications),
    sampleData: s.sampleData === true,
  };

  return {
    txs: sortTxs(txs),
    goals,
    recurring,
    accounts,
    giftCards,
    categories,
    categoryTypes,
    profile: { name: isStr(p.name) ? p.name : '', rule: { needs: rule.needs, wants: rule.wants, savings: rule.savings }, budgets, monthlyBudget: isNum(p.monthlyBudget) && p.monthlyBudget > 0 ? round2(p.monthlyBudget) : 0 },
    settings,
  };
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = sanitize(JSON.parse(raw));
      if (parsed) return parsed;
    }
  } catch {
    /* unreadable storage: start with the sample journal */
  }
  return sampleData();
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface AppContextValue {
  data: AppData;
  /**
   * True while Basic mode is on (and not inside the guided tour). The one flag every screen asks: Basic only
   * changes what is shown, `data` always keeps everything.
   */
  basic: boolean;
  /** The entries the current mode shows: all of them, or in Basic mode income and expenses only (no savings). */
  txs: Tx[];
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  openSheet: (sheet: Sheet) => void;
  closeSheet: () => void;
  money: (amount: number, options?: MoneyOptions) => string;
  /** Whole units, shortened ("€1.2M") when longer than `maxChars`: for figures inside fixed-width cards. */
  moneyFit: (amount: number, maxChars: number, sign?: boolean) => string;
  symbol: string;
  /** The journal's currency. */
  currency: CurrencyCode;
  /** How many journal-currency units one unit of `from` is worth right now (Settings rates, else the built-in table). */
  rateFor: (from: CurrencyCode) => number;
  addTx: (input: Omit<Tx, 'id' | 'ts'>, options?: { quiet?: boolean }) => void;
  updateTx: (id: string, patch: Partial<Omit<Tx, 'id' | 'ts'>>) => void;
  removeTx: (id: string) => void;
  saveGoal: (goal: { id?: string; name: string; target: number }) => void;
  removeGoal: (id: string) => void;
  saveRecurring: (item: Omit<Recurring, 'id'> & { id?: string }) => void;
  removeRecurring: (id: string) => void;
  /** `date` is the due date of one occurrence of a weekly item; monthly items use their day of the month. */
  logRecurring: (item: Recurring, month: string, date?: string) => void;
  saveAccount: (account: { id?: string; name: string; icon: string; opening: number }) => void;
  removeAccount: (id: string) => void;
  /** Creates or edits a gift card; returns its id. */
  saveGiftCard: (card: { id?: string; name: string; initial: number; expires?: string; note?: string; countAsIncome?: boolean; incomeDate?: string; countAsSpending?: boolean }) => string;
  /** Deletes a gift card. Entries paid with it stay, and count as paid the normal way again. */
  removeGiftCard: (id: string) => void;
  /** Creates or edits one of the user's own expense categories; returns its id. */
  saveCategory: (category: { id?: string; name: string; icon: string; bucket: CustomCategory['bucket'] }) => string;
  /** Creates or edits one of the user's own expense types (besides Needs and Wants); returns its id. */
  saveCategoryType: (type: { id?: string; name: string }) => string;
  /** Deletes one of the user's own types: its categories move to Wants. */
  removeCategoryType: (id: string) => void;
  /** Deletes one of the user's own categories (its entries stay, listed under \"Other\"). */
  removeCategory: (id: string) => void;
  /** Hides or shows a category (built-in or own) in the pickers and on the Month page. */
  setCategoryHidden: (id: string, hidden: boolean) => void;
  /** Fetches current exchange rates; resolves to whether it worked. */
  refreshRates: () => Promise<boolean>;
  setBudget: (categoryId: string, amount: number) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  eraseAll: () => void;
  loadSample: () => void;
  exportData: () => string;
  /** Validates the text of a backup file WITHOUT touching the journal; null when it is not a Koink journal. */
  previewBackup: (raw: string) => BackupPreview | null;
  /** Replaces the whole journal with a previewed backup. Only call it after the user confirmed. */
  restoreBackup: (preview: BackupPreview) => void;
  /** Validate and replace in one go (no preview). The app's own screens use `previewBackup` + `restoreBackup`. */
  importData: (raw: string) => boolean;
  showToast: (message: string, action?: { label: string; run: () => void }) => void;
  dismissToast: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Only carries the retry action; the save state itself is an external store (storage.ts). */
const RetryContext = createContext<() => boolean>(() => true);

/**
 * The open sheet and the toast live in their own context. They change on every open, close and
 * save, and nothing but the sheets and the toast host needs to hear about it: the pages behind a
 * closing sheet must not re-render while it is flying away (that was the lag of swiping a sheet down).
 */
interface UiState {
  sheet: Sheet | null;
  /** Increases every time a sheet opens, so forms start fresh. */
  sheetSeq: number;
  toast: Toast | null;
}
const UiContext = createContext<UiState>({ sheet: null, sheetSeq: 0, toast: null });

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(load);
  const [chosenTab, setTab] = useState<ActiveTab>('month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [sheetSeq, setSheetSeq] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);
  const toastId = useRef(0);

  // Writing to localStorage can fail (storage full, private mode, blocked): the journal then only lives in
  // memory. That must never be silent: writeJournal records the outcome, StorageBanner shows it.
  const latest = useRef(data);
  useEffect(() => {
    latest.current = data;
    writeJournal(JSON.stringify(data));
  }, [data]);
  const retrySave = useCallback(() => writeJournal(JSON.stringify(latest.current)), []);

  // Everything below reads the category list through categories.ts: bring it up to date first.
  // The page order (tabs.ts) also follows Settings: a hidden page leaves the pill and the swipe rail.
  // Basic mode: no Budgets page, whatever the Appearance switch says. The guided tour always shows everything.
  const basic = data.settings.mode === 'basic' && !inTourEmbed();
  useMemo(() => syncMode(basic), [basic]);
  useMemo(() => syncTabs(data.settings.hideBudgets || basic), [data.settings.hideBudgets, basic]);
  // Savings entries are not shown in Basic mode (they stay in the journal and come back in Full).
  // Gift cards: their counting choices reach the totals through giftcards.ts, and a card that counts its value as income adds
  // an income entry to the ledger. Basic mode has no gift cards, so it syncs none (nothing changes in its totals).
  const activeCards = basic ? NO_CARDS : data.giftCards;
  useMemo(() => syncGiftCards(activeCards), [activeCards]);
  const txs = useMemo(
    () => (basic ? data.txs.filter((tx) => tx.kind !== 'saving') : [...giftCardIncomeTxs(activeCards), ...data.txs]),
    [basic, data.txs, activeCards],
  );
  useMemo(() => syncCategories(data.categories, data.settings.hiddenCategories, data.categoryTypes), [data.categories, data.settings.hiddenCategories, data.categoryTypes]);

  const { theme, themeStyle, monoHue, currency, ultraMinimal, language } = data.settings;
  // Set during render (like the category list above) so every `t()` below already speaks the new language.
  setLanguage(language);
  useEffect(() => {
    const background = applyThemeAttributes(theme, themeStyle, monoHue);
    syncSystemBars(theme);
    // Android: the next launch opens on this colour. Not needed for the first frames.
    return whenIdle(() => syncLaunchBackground(background));
  }, [theme, themeStyle, monoHue]);
  useEffect(() => {
    applyUltraMinimal(ultraMinimal);
  }, [ultraMinimal]);

  const money = useCallback((amount: number, options?: MoneyOptions) => formatMoney(amount, currency, options), [currency]);
  const moneyFit = useCallback((amount: number, maxChars: number, sign = false) => formatMoneyFit(amount, currency, maxChars, sign), [currency]);

  const rates = data.settings.rates;
  const rateFor = useCallback((from: CurrencyCode) => Number(exchangeRate(from, currency, rates).toPrecision(6)), [currency, rates]);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, action?: { label: string; run: () => void }) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastId.current += 1;
    setToast({ id: toastId.current, message, actionLabel: action?.label, onAction: action?.run });
    toastTimer.current = window.setTimeout(() => setToast(null), action ? 5200 : 2800);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  // A hidden page is never the active one (hiding Budgets while it is open shows the Month page).
  const hideBudgets = data.settings.hideBudgets || basic;
  const activeTab: ActiveTab = chosenTab === 'budgets' && hideBudgets ? 'month' : chosenTab;
  const setActiveTab = useCallback((tab: ActiveTab) => {
    // A hidden page cannot be opened (a widget, a reminder or an old link may still ask for it).
    setTab(tab === 'budgets' && hideBudgets ? 'month' : tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [hideBudgets]);

  const openSheet = useCallback((next: Sheet) => {
    setSheet(next);
    setSheetSeq((n) => n + 1);
  }, []);
  const closeSheet = useCallback(() => setSheet(null), []);

  const removeById = useCallback((id: string) => {
    setData((prev) => ({ ...prev, txs: prev.txs.filter((tx) => tx.id !== id) }));
  }, []);

  const addTx = useCallback<AppContextValue['addTx']>((input, options) => {
    const tx: Tx = { ...input, amount: round2(input.amount), note: input.note.trim(), details: input.details?.trim() || undefined, id: uid(), ts: Date.now() };
    setData((prev) => ({ ...prev, txs: sortTxs([tx, ...prev.txs]) }));
    if (!options?.quiet) {
      const sign = tx.kind === 'income' ? '+' : tx.kind === 'expense' ? '-' : '';
      const amount = formatMoney(tx.amount, currency, { cents: true });
      showToast(`${tx.note || 'Entry'} · ${sign}${amount} · ${formatDay(tx.date)}`, { label: 'Undo', run: () => removeById(tx.id) });
    }
  }, [currency, removeById, showToast]);

  const updateTx = useCallback<AppContextValue['updateTx']>((id, patch) => {
    setData((prev) => ({
      ...prev,
      txs: sortTxs(prev.txs.map((tx) => (tx.id === id
        ? {
          ...tx,
          ...patch,
          amount: round2(patch.amount ?? tx.amount),
          note: (patch.note ?? tx.note).trim(),
          details: ('details' in patch ? patch.details : tx.details)?.trim() || undefined,
        }
        : tx))),
    }));
  }, []);

  const removeTx = useCallback((id: string) => {
    const removed = data.txs.find((tx) => tx.id === id);
    if (!removed) return;
    removeById(id);
    showToast(t('Deleted {name}', { name: removed.note || t('entry') }), {
      label: t('Undo'),
      run: () => setData((prev) => (prev.txs.some((tx) => tx.id === removed.id) ? prev : { ...prev, txs: sortTxs([removed, ...prev.txs]) })),
    });
  }, [data.txs, removeById, showToast]);

  const saveGoal = useCallback<AppContextValue['saveGoal']>((goal) => {
    setData((prev) => ({
      ...prev,
      goals: goal.id
        ? prev.goals.map((g) => (g.id === goal.id ? { ...g, name: goal.name.trim(), target: round2(goal.target) } : g))
        : [...prev.goals, { id: `g_${uid()}`, name: goal.name.trim(), target: round2(goal.target) }],
    }));
  }, []);

  const removeGoal = useCallback((id: string) => {
    setData((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
  }, []);

  const saveRecurring = useCallback<AppContextValue['saveRecurring']>((item) => {
    const clean = { ...item, name: item.name.trim(), amount: round2(item.amount), day: Math.min(28, Math.max(1, Math.round(item.day))), every: Math.max(1, Math.round(item.every || 1)) };
    setData((prev) => ({
      ...prev,
      recurring: (clean.id
        ? prev.recurring.map((r) => (r.id === clean.id ? { ...clean, id: r.id } : r))
        : [...prev.recurring, { ...clean, id: `r_${uid()}` }]
      ).sort((a, b) => a.day - b.day),
    }));
  }, []);

  const removeRecurring = useCallback((id: string) => {
    setData((prev) => ({ ...prev, recurring: prev.recurring.filter((r) => r.id !== id) }));
  }, []);

  const logRecurring = useCallback((item: Recurring, month: string, date?: string) => {
    const day = Math.min(item.day, daysInMonth(month));
    addTx({ kind: item.kind, categoryId: item.categoryId, note: item.name, amount: item.amount, date: date ?? `${month}-${pad(day)}`, recurringId: item.id });
  }, [addTx]);

  const saveAccount = useCallback<AppContextValue['saveAccount']>((account) => {
    const clean = { name: account.name.trim().slice(0, 40), icon: account.icon, opening: round2(account.opening) };
    setData((prev) => ({
      ...prev,
      accounts: account.id
        ? prev.accounts.map((a) => (a.id === account.id ? { ...a, ...clean } : a))
        : [...prev.accounts, { id: `a_${uid()}`, ...clean }],
    }));
  }, []);

  const removeAccount = useCallback((id: string) => {
    // Entries keep their place in the journal; they just no longer point at an account.
    setData((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((a) => a.id !== id),
      txs: prev.txs.map((tx) => (tx.accountId === id ? { ...tx, accountId: undefined } : tx)),
    }));
  }, []);

  const saveGiftCard = useCallback<AppContextValue['saveGiftCard']>((card) => {
    const id = card.id ?? `gc_${uid()}`;
    const clean = {
      name: card.name.trim().slice(0, 40),
      initial: round2(Math.max(0, card.initial)),
      expires: card.expires && /^\d{4}-\d{2}-\d{2}$/.test(card.expires) ? card.expires : undefined,
      note: card.note?.trim().slice(0, 500) || undefined,
      ...cleanGiftCardCounting(card),
    };
    setData((prev) => ({
      ...prev,
      giftCards: card.id ? prev.giftCards.map((g) => (g.id === id ? { ...g, ...clean } : g)) : [...prev.giftCards, { id, ...clean }],
    }));
    return id;
  }, []);

  const removeGiftCard = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      giftCards: prev.giftCards.filter((g) => g.id !== id),
      txs: prev.txs.map((tx) => (tx.giftCard?.id === id ? { ...tx, giftCard: undefined } : tx)),
    }));
  }, []);

  const saveCategory = useCallback<AppContextValue['saveCategory']>((category) => {
    const id = category.id ?? `c_${uid()}`;
    const clean = { name: category.name.trim().slice(0, 30), icon: category.icon, bucket: category.bucket };
    setData((prev) => ({
      ...prev,
      categories: category.id
        ? prev.categories.map((c) => (c.id === id ? { ...c, ...clean } : c))
        : [...prev.categories, { id, ...clean }],
    }));
    return id;
  }, []);

  const saveCategoryType = useCallback<AppContextValue['saveCategoryType']>((type) => {
    const id = type.id ?? `ty_${uid()}`;
    const name = type.name.trim().slice(0, 30);
    setData((prev) => ({
      ...prev,
      categoryTypes: type.id ? prev.categoryTypes.map((x) => (x.id === id ? { ...x, name } : x)) : [...prev.categoryTypes, { id, name }],
    }));
    return id;
  }, []);

  const removeCategoryType = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      categoryTypes: prev.categoryTypes.filter((x) => x.id !== id),
      categories: prev.categories.map((c) => (c.bucket === id ? { ...c, bucket: 'wants' } : c)),
    }));
  }, []);

  const removeCategory = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      settings: {
        ...prev.settings,
        hiddenCategories: prev.settings.hiddenCategories.filter((x) => x !== id),
        // A deleted category leaves the widgets too (the single button falls back to plain Add expense).
        widgets: {
          ...prev.settings.widgets,
          single: prev.settings.widgets.single === `cat:${id}` ? 'expense' : prev.settings.widgets.single,
          multi: prev.settings.widgets.multi.filter((k) => k !== `cat:${id}`),
          categories: prev.settings.widgets.categories.filter((k) => k !== `cat:${id}`),
        },
      },
      profile: { ...prev.profile, budgets: Object.fromEntries(Object.entries(prev.profile.budgets).filter(([key]) => key !== id)) },
      recurring: prev.recurring.map((r) => (r.categoryId === id ? { ...r, categoryId: 'bills' } : r)),
    }));
  }, []);

  const setCategoryHidden = useCallback((id: string, hidden: boolean) => {
    setData((prev) => {
      const rest = prev.settings.hiddenCategories.filter((x) => x !== id);
      return { ...prev, settings: { ...prev.settings, hiddenCategories: hidden ? [...rest, id] : rest } };
    });
  }, []);

  // Rates come from Frankfurter (ECB reference rates, free, no key): https://frankfurter.dev
  // It covers about 30 currencies; any other code keeps using the built-in table (see exchangeRate).
  const refreshRates = useCallback(async () => {
    try {
      const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD', { cache: 'no-store' });
      if (!response.ok) return false;
      const body = (await response.json()) as { date?: unknown; rates?: Record<string, unknown> };
      if (!body.rates) return false;
      const fresh = cleanRates({ ...body.rates, USD: 1 }); // the base itself is not in the answer
      if (Object.keys(fresh).length < 5) return false;
      const day = isStr(body.date) && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : todayStr();
      setData((prev) => ({ ...prev, settings: { ...prev.settings, rates: fresh, ratesDate: day } }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const setBudget = useCallback((categoryId: string, amount: number) => {
    setData((prev) => {
      const budgets = { ...prev.profile.budgets };
      if (amount > 0) budgets[categoryId] = round2(amount);
      else delete budgets[categoryId];
      // The monthly budget can never be smaller than the budgets of the categories: raise it when they outgrow it.
      const sum = round2(Object.values(budgets).reduce((total, v) => total + (v > 0 ? v : 0), 0));
      const monthlyBudget = prev.profile.monthlyBudget > 0 ? Math.max(prev.profile.monthlyBudget, sum) : 0;
      return { ...prev, profile: { ...prev.profile, budgets, monthlyBudget } };
    });
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setData((prev) => {
      const profile = { ...prev.profile, ...patch };
      // A monthly budget (0 = none: it is then the sum of the category budgets) is never below that sum.
      const sum = round2(Object.values(profile.budgets).reduce((total, v) => total + (v > 0 ? v : 0), 0));
      if (profile.monthlyBudget > 0) profile.monthlyBudget = Math.max(round2(profile.monthlyBudget), sum);
      return { ...prev, profile };
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((prev) => {
      // Safety net behind the locked currency picker: amounts are bare numbers, so a new currency would
      // silently relabel every one of them (see currencyLocked in journal.ts).
      let safe = patch;
      if (patch.currency !== undefined && patch.currency !== prev.settings.currency && currencyLocked(prev)) {
        safe = { ...patch };
        delete safe.currency;
        if (Object.keys(safe).length === 0) return prev;
      }
      return { ...prev, settings: { ...prev.settings, ...safe } };
    });
  }, []);

  const eraseAll = useCallback(() => {
    setData((prev) => ({
      txs: [], goals: [], recurring: [], accounts: [], giftCards: [], categories: [], categoryTypes: [], profile: emptyProfile(),
      settings: { ...prev.settings, hiddenCategories: [...DEFAULT_HIDDEN_CATEGORIES], inflationExcluded: [], sampleData: false },
    }));
    setSelectedMonth(currentMonth());
  }, []);

  const loadSample = useCallback(() => {
    setData((prev) => sampleData(prev.settings));
    setSelectedMonth(currentMonth());
  }, []);

  const exportData = useCallback(() => JSON.stringify({ app: 'koink', version: 1, ...data }, null, 2), [data]);

  const previewBackup = useCallback((raw: string): BackupPreview | null => {
    try {
      const json: unknown = JSON.parse(raw);
      const parsed = sanitize(json);
      if (!parsed) return null;
      const inFile = Array.isArray((json as { txs?: unknown }).txs) ? (json as { txs: unknown[] }).txs.length : 0;
      return { data: parsed, summary: summarizeJournal(parsed), skipped: Math.max(0, inFile - parsed.txs.length) };
    } catch {
      return null;
    }
  }, []);

  const restoreBackup = useCallback((preview: BackupPreview) => {
    setData({ ...preview.data, settings: { ...preview.data.settings, sampleData: false } });
    setSelectedMonth(currentMonth());
  }, []);

  const importData = useCallback((raw: string) => {
    const preview = previewBackup(raw);
    if (!preview) return false;
    restoreBackup(preview);
    return true;
  }, [previewBackup, restoreBackup]);

  const value = useMemo<AppContextValue>(() => ({
    data, basic, txs, activeTab, setActiveTab, selectedMonth, setSelectedMonth, openSheet, closeSheet,
    money, moneyFit, symbol: currencySymbol(currency), currency, rateFor, addTx, updateTx, removeTx, saveGoal, removeGoal, saveRecurring,
    removeRecurring, logRecurring, saveAccount, removeAccount, saveGiftCard, removeGiftCard, saveCategory, saveCategoryType, removeCategoryType, removeCategory, setCategoryHidden, refreshRates, setBudget, updateProfile, updateSettings, eraseAll, loadSample, exportData,
    previewBackup, restoreBackup, importData, showToast, dismissToast,
  }), [
    data, basic, txs, activeTab, setActiveTab, selectedMonth, openSheet, closeSheet, money, moneyFit, currency, addTx,
    updateTx, removeTx, saveGoal, removeGoal, saveRecurring, removeRecurring, logRecurring, saveAccount, removeAccount, saveGiftCard, removeGiftCard, saveCategory,
    saveCategoryType, removeCategoryType, removeCategory, setCategoryHidden, refreshRates, rateFor, setBudget, updateProfile,
    updateSettings, eraseAll, loadSample, exportData, previewBackup, restoreBackup, importData, showToast, dismissToast,
  ]);

  const ui = useMemo<UiState>(() => ({ sheet, sheetSeq, toast }), [sheet, sheetSeq, toast]);

  return (
    <AppContext.Provider value={value}>
      <RetryContext.Provider value={retrySave}>
        <UiContext.Provider value={ui}>{children}</UiContext.Provider>
      </RetryContext.Provider>
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/**
 * The sheet of one type, kept as it was while its closing animation plays (the store already holds
 * `null` by then, and an empty sheet sliding away would flash).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useSheet<T extends Sheet['type']>(type: T): { isOpen: boolean; sheet: Extract<Sheet, { type: T }> | null; seq: number } {
  const { sheet, sheetSeq } = useContext(UiContext);
  type Mine = Extract<Sheet, { type: T }>;
  const [last, setLast] = useState<{ sheet: Mine; seq: number } | null>(null);
  const isOpen = sheet?.type === type;
  if (isOpen && last?.seq !== sheetSeq) setLast({ sheet: sheet as Mine, seq: sheetSeq });
  return isOpen ? { isOpen, sheet: sheet as Mine, seq: sheetSeq } : { isOpen, sheet: last?.sheet ?? null, seq: last?.seq ?? 0 };
}

/** The toast on screen, if any. Kept apart from `useApp()` so a toast does not re-render the pages. */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): Toast | null {
  return useContext(UiContext).toast;
}

/** Whether the journal is being saved on this device, and a way to try again. Kept apart from `useApp()`. */
// eslint-disable-next-line react-refresh/only-export-components
export function useStorageStatus(): SaveState & { retry: () => boolean } {
  const state = useSyncExternalStore(subscribeSaveState, getSaveState, getSaveState);
  const retry = useContext(RetryContext);
  return { ...state, retry };
}
