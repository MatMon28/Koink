export type Theme = 'light' | 'lite-dark' | 'dark';
export type ThemeStyle = 'classic' | 'angular' | 'aurora' | 'pop' | 'playful' | 'minimal' | 'mono';

export type Kind = 'expense' | 'income' | 'saving';
export type Bucket = 'needs' | 'wants';
export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY';
export type ActiveTab = 'month' | 'transactions' | 'budgets' | 'stats';

/** One entry of the ledger. `amount` is always positive; `kind` gives it its direction. */
export interface Tx {
  id: string;
  kind: Kind;
  amount: number;
  /** Expense category id, income source id, or savings goal id (by kind). */
  categoryId: string;
  note: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  /** Set when the entry was logged from a recurring item. */
  recurringId?: string;
  /** Creation order, newest first inside a day. */
  ts: number;
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

export type QuickAddKey = 'income' | 'expense' | 'recurring' | 'quick' | 'saving';

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
export type OpenTarget = 'expense' | 'income' | 'recurring' | 'stats' | 'budgets';

export interface Settings {
  theme: Theme;
  themeStyle: ThemeStyle;
  monoHue: string;
  /** Icons instead of labels, tighter cards, compact Month layout. */
  ultraMinimal: boolean;
  currency: CurrencyCode;
  quickAdd: Record<QuickAddKey, boolean>;
  notifications: NotificationSettings;
  /** True while the journal still holds the sample data it started with. */
  sampleData: boolean;
}

export interface AppData {
  txs: Tx[];
  goals: Goal[];
  recurring: Recurring[];
  profile: Profile;
  settings: Settings;
}

export type Sheet =
  | { type: 'tx'; kind: Kind; categoryId?: string; editId?: string }
  | { type: 'recurring' }
  | { type: 'recurringEdit'; id?: string }
  | { type: 'goal'; id?: string }
  | { type: 'budget'; categoryId: string }
  | { type: 'quick' }
  | { type: 'profile' }
  | { type: 'settings' };
