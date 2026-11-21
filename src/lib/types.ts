export type Theme = 'light' | 'lite-dark' | 'dark';
export type ThemeStyle = 'classic' | 'angular' | 'aurora' | 'pop' | 'playful' | 'minimal' | 'mono';

export type Kind = 'expense' | 'income' | 'saving';
export type Bucket = 'needs' | 'wants';
/** ISO 4217 code of one of the currencies in `CURRENCIES` (format.ts). */
export type CurrencyCode = string;
export type ActiveTab = 'month' | 'transactions' | 'budgets' | 'stats';

/** One entry of the ledger. `amount` is always positive; `kind` gives it its direction. */
export interface Tx {
  id: string;
  kind: Kind;
  amount: number;
  /** Expense category id, income source id, or savings goal id (by kind). */
  categoryId: string;
  /** The short title of the entry (shown in lists). Called "Title" in the app; the field keeps its old name. */
  note: string;
  /** The long note: an optional longer explanation. Called "Note" in the app. */
  details?: string;
  /** The account the money moved through (see `Account`). Missing = no account. */
  accountId?: string;
  /**
   * Set when the entry was paid in another currency than the journal's: `amount` above is already
   * converted into the journal's currency (it is what every total uses), this is what was paid.
   */
  foreign?: { amount: number; currency: CurrencyCode; rate: number };
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  /** Set when the entry was logged from a recurring item. */
  recurringId?: string;
  /**
   * Set when (part of) an expense was paid with a gift card: `amount` is how much of the entry the card
   * covered, in the journal's currency. It leaves the card's balance, and leaves the account's too:
   * only the rest (`amount` of the entry minus this) moved through the account.
   */
  giftCard?: { id: string; amount: number };
  /** Creation order, newest first inside a day. */
  ts: number;
}

/** A place money lives: current account, cash, a card... Its balance is the starting balance plus its entries. */
export interface Account {
  id: string;
  name: string;
  /** Key into `ICON_CHOICES` (icons.ts). */
  icon: string;
  /** What was in it before the first entry that points at it. May be negative (an overdraft). */
  opening: number;
}

/** An expense category made by the user. Built-in ones live in code (`categories.ts`). */
export interface CustomCategory {
  id: string;
  name: string;
  /** Key into `ICON_CHOICES` (icons.ts). */
  icon: string;
  bucket: Bucket;
}

/** A gift card or voucher. What is left on it is `initial` minus every entry paid with it (`giftcards.ts`). */
export interface GiftCard {
  id: string;
  name: string;
  /** What it was worth when it was added, in the journal's currency. */
  initial: number;
  /** Optional last day it can be used, YYYY-MM-DD. */
  expires?: string;
  /** Optional longer note (code, shop address...). */
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
}

export interface Recurring {
  id: string;
  name: string;
  amount: number;
  kind: 'expense' | 'income';
  categoryId: string;
  /** Day of the month it is due (1-28). */
  day: number;
}

export interface BudgetRule {
  needs: number;
  wants: number;
  savings: number;
}

export interface Profile {
  name: string;
  rule: BudgetRule;
  /** Monthly budget per expense category id. 0 or missing = no budget. */
  budgets: Record<string, number>;
}

export type QuickAddKey = 'income' | 'expense' | 'recurring' | 'quick' | 'saving' | 'giftcard';

/** A reminder that fires at one time of day, `HH:MM` (24 h, local time). */
export interface TimedReminder {
  enabled: boolean;
  time: string;
}

/** Settings > Notifications. Everything is off by default. */
export interface NotificationSettings {
  /** Every day: log today's spending. */
  logDay: TimedReminder;
  /** On the day of the month each recurring item is due. */
  recurring: TimedReminder;
  /** Once a week. `weekday`: 1 = Sunday ... 7 = Saturday. */
  weeklyReview: TimedReminder & { weekday: number };
  /** On the 1st of every month. */
  monthStart: TimedReminder;
}

/** What a notification, a home-screen shortcut or a link can open. */
export type OpenTarget = 'expense' | 'income' | 'recurring' | 'stats' | 'budgets' | 'giftcard';

/**
 * Home-screen widgets (Settings > Widgets). A button is an action key (`widgets.ts`): `expense`, `income`,
 * `saving`, `recurring`, `quick`, `giftcard`, `stats`, `budgets` or `cat:<expense category id>`.
 */
export interface WidgetSettings {
  /** The one button of the single-button widget. */
  single: string;
  /** The buttons of the multiple-button widget, in order. */
  multi: string[];
  /** The expense categories of the category widget, as `cat:<id>` keys. Empty = every visible category. */
  categories: string[];
  /** Also show the widgets as a strip at the top of the Month page (browser, PWA and Android). */
  showInApp: boolean;
}

export interface Settings {
  theme: Theme;
  themeStyle: ThemeStyle;
  monoHue: string;
  /** Icons instead of labels, tighter cards, compact Month layout. */
  ultraMinimal: boolean;
  currency: CurrencyCode;
  /** Built-in or custom expense categories the user hid from the pickers (their entries stay). */
  hiddenCategories: string[];
  /** Units of each currency for 1 US dollar. Missing codes fall back to the built-in table. */
  rates: Record<string, number>;
  /** Day (YYYY-MM-DD) the rates were last fetched, or '' while the built-in table is used. */
  ratesDate: string;
  quickAdd: Record<QuickAddKey, boolean>;
  widgets: WidgetSettings;
  notifications: NotificationSettings;
  /** True while the journal still holds the sample data it started with. */
  sampleData: boolean;
}

export interface AppData {
  txs: Tx[];
  goals: Goal[];
  recurring: Recurring[];
  accounts: Account[];
  giftCards: GiftCard[];
  categories: CustomCategory[];
  profile: Profile;
  settings: Settings;
}

export type Sheet =
  | { type: 'tx'; kind: Kind; categoryId?: string; editId?: string; giftCardId?: string }
  | { type: 'recurring' }
  | { type: 'recurringEdit'; id?: string }
  | { type: 'goal'; id?: string }
  | { type: 'account'; id?: string }
  | { type: 'giftCard'; id?: string }
  | { type: 'widgets' }
  | { type: 'categories' }
  | { type: 'budget'; categoryId: string }
  | { type: 'quick' }
  | { type: 'profile' }
  | { type: 'settings' };
