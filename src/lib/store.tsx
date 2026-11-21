import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { sortTxs } from './calc';
import { syncCategories } from './categories';
import { currentMonth, daysInMonth, formatDay, pad, todayStr } from './dates';
import { buildSampleTxs, SAMPLE_ACCOUNTS, SAMPLE_GOALS, SAMPLE_PROFILE, SAMPLE_RECURRING } from './demo';
import { whenIdle } from './idle';
import { currencySymbol, exchangeRate, formatMoney, formatMoneyFit, isCurrency, round2, type MoneyOptions } from './format';
import { normalizeNotificationSettings } from './reminders';
import { syncLaunchBackground, syncSystemBars } from './platform';
import { STORAGE_KEY } from './storage';
import { applyThemeAttributes, applyUltraMinimal, DEFAULT_MONO_HUE, normalizeMonoHue, normalizeTheme, normalizeThemeStyle } from './themes';
import type { Account, ActiveTab, AppData, CurrencyCode, CustomCategory, Goal, Profile, Recurring, Settings, Sheet, Tx } from './types';


const defaultSettings = (): Settings => ({
  theme: 'light',
  themeStyle: 'classic',
  monoHue: DEFAULT_MONO_HUE,
  ultraMinimal: false,
  currency: 'EUR',
  hiddenCategories: [],
  rates: {},
  ratesDate: '',
  quickAdd: { income: true, expense: true, recurring: true, quick: true, saving: true },
  notifications: normalizeNotificationSettings(undefined),
  sampleData: false,
});

const emptyProfile = (): Profile => ({ name: '', rule: { needs: 50, wants: 30, savings: 20 }, budgets: {} });

function sampleData(settings: Settings = defaultSettings()): AppData {
  return {
    txs: sortTxs(buildSampleTxs()),
    goals: SAMPLE_GOALS.map((g) => ({ ...g })),
    recurring: SAMPLE_RECURRING.map((r) => ({ ...r })),
    accounts: SAMPLE_ACCOUNTS.map((a) => ({ ...a })),
    categories: [],
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
    }));

  const accounts: Account[] = (Array.isArray(src.accounts) ? src.accounts : [])
    .filter((a): a is Account => !!a && isStr((a as Account).id) && ID_PATTERN.test((a as Account).id) && isStr((a as Account).name))
    .map((a) => ({ id: a.id, name: a.name.slice(0, 40), icon: isStr(a.icon) ? a.icon : 'wallet', opening: isNum(a.opening) ? round2(a.opening) : 0 }));

  const categories: CustomCategory[] = (Array.isArray(src.categories) ? src.categories : [])
    .filter((c): c is CustomCategory => !!c && isStr((c as CustomCategory).id) && ID_PATTERN.test((c as CustomCategory).id) && isStr((c as CustomCategory).name))
    .map((c) => ({ id: c.id, name: c.name.slice(0, 30), icon: isStr(c.icon) ? c.icon : 'tag', bucket: c.bucket === 'needs' ? 'needs' : 'wants' }));

  const p = (src.profile ?? {}) as Partial<Profile>;
  const rule = p.rule && isNum(p.rule.needs) && isNum(p.rule.wants) && isNum(p.rule.savings) ? p.rule : emptyProfile().rule;
  const budgets: Record<string, number> = {};
  for (const [id, amount] of Object.entries(p.budgets ?? {})) if (isNum(amount) && amount > 0) budgets[id] = round2(amount);

  const s = (src.settings ?? {}) as Partial<Settings>;
  const base = defaultSettings();
  const settings: Settings = {
    theme: normalizeTheme(s.theme),
    themeStyle: normalizeThemeStyle(s.themeStyle),
    monoHue: normalizeMonoHue(s.monoHue),
    ultraMinimal: s.ultraMinimal === true,
    currency: isCurrency(s.currency) ? s.currency : base.currency,
    hiddenCategories: Array.isArray(s.hiddenCategories) ? s.hiddenCategories.filter(isStr) : [],
    rates: cleanRates(s.rates),
    ratesDate: isStr(s.ratesDate) ? s.ratesDate : '',
    quickAdd: { ...base.quickAdd, ...(s.quickAdd && typeof s.quickAdd === 'object' ? s.quickAdd : {}) },
    // Journals and backups written before reminders existed load with everything off.
    notifications: normalizeNotificationSettings(s.notifications),
    sampleData: s.sampleData === true,
  };

  return {
    txs: sortTxs(txs),
    goals,
    recurring,
    accounts,
    categories,
    profile: { name: isStr(p.name) ? p.name : '', rule: { needs: rule.needs, wants: rule.wants, savings: rule.savings }, budgets },
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
  logRecurring: (item: Recurring, month: string) => void;
  saveAccount: (account: { id?: string; name: string; icon: string; opening: number }) => void;
  removeAccount: (id: string) => void;
  /** Creates or edits one of the user's own expense categories; returns its id. */
  saveCategory: (category: { id?: string; name: string; icon: string; bucket: CustomCategory['bucket'] }) => string;
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
  importData: (raw: string) => boolean;
  showToast: (message: string, action?: { label: string; run: () => void }) => void;
  dismissToast: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

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
  const [activeTab, setTab] = useState<ActiveTab>('month');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [sheetSeq, setSheetSeq] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);
  const toastId = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked: the journal lives in memory for this visit */
    }
  }, [data]);

  // Everything below reads the category list through categories.ts: bring it up to date first.
  useMemo(() => syncCategories(data.categories, data.settings.hiddenCategories), [data.categories, data.settings.hiddenCategories]);

  const { theme, themeStyle, monoHue, currency, ultraMinimal } = data.settings;
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

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

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
    showToast(`Deleted ${removed.note || 'entry'}`, {
      label: 'Undo',
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
    const clean = { ...item, name: item.name.trim(), amount: round2(item.amount), day: Math.min(28, Math.max(1, Math.round(item.day))) };
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

  const logRecurring = useCallback((item: Recurring, month: string) => {
    const day = Math.min(item.day, daysInMonth(month));
    addTx({ kind: item.kind, categoryId: item.categoryId, note: item.name, amount: item.amount, date: `${month}-${pad(day)}`, recurringId: item.id });
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

  const removeCategory = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      settings: { ...prev.settings, hiddenCategories: prev.settings.hiddenCategories.filter((x) => x !== id) },
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

  const refreshRates = useCallback(async () => {
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
      const body = (await response.json()) as { result?: string; rates?: Record<string, unknown> };
      if (body.result !== 'success' || !body.rates) return false;
      const fresh = cleanRates(body.rates);
      if (Object.keys(fresh).length < 5) return false;
      setData((prev) => ({ ...prev, settings: { ...prev.settings, rates: fresh, ratesDate: todayStr() } }));
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
      return { ...prev, profile: { ...prev.profile, budgets } };
    });
  }, []);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setData((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const eraseAll = useCallback(() => {
    setData((prev) => ({
      txs: [], goals: [], recurring: [], accounts: [], categories: [], profile: emptyProfile(),
      settings: { ...prev.settings, hiddenCategories: [], sampleData: false },
    }));
    setSelectedMonth(currentMonth());
  }, []);

  const loadSample = useCallback(() => {
    setData((prev) => sampleData(prev.settings));
    setSelectedMonth(currentMonth());
  }, []);

  const exportData = useCallback(() => JSON.stringify({ app: 'koink', version: 1, ...data }, null, 2), [data]);

  const importData = useCallback((raw: string) => {
    try {
      const parsed = sanitize(JSON.parse(raw));
      if (!parsed) return false;
      setData({ ...parsed, settings: { ...parsed.settings, sampleData: false } });
      setSelectedMonth(currentMonth());
      return true;
    } catch {
      return false;
    }
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    data, activeTab, setActiveTab, selectedMonth, setSelectedMonth, openSheet, closeSheet,
    money, moneyFit, symbol: currencySymbol(currency), currency, rateFor, addTx, updateTx, removeTx, saveGoal, removeGoal, saveRecurring,
    removeRecurring, logRecurring, saveAccount, removeAccount, saveCategory, removeCategory, setCategoryHidden, refreshRates, setBudget, updateProfile, updateSettings, eraseAll, loadSample, exportData,
    importData, showToast, dismissToast,
  }), [
    data, activeTab, setActiveTab, selectedMonth, openSheet, closeSheet, money, moneyFit, currency, addTx,
    updateTx, removeTx, saveGoal, removeGoal, saveRecurring, removeRecurring, logRecurring, saveAccount, removeAccount, saveCategory,
    removeCategory, setCategoryHidden, refreshRates, rateFor, setBudget, updateProfile,
    updateSettings, eraseAll, loadSample, exportData, importData, showToast, dismissToast,
  ]);

  const ui = useMemo<UiState>(() => ({ sheet, sheetSeq, toast }), [sheet, sheetSeq, toast]);

  return (
    <AppContext.Provider value={value}>
      <UiContext.Provider value={ui}>{children}</UiContext.Provider>
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
