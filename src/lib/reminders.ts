import type { NotificationSettings, OpenTarget, Recurring, TimedReminder } from './types';

/*
 * Reminder notifications, the pure part: defaults, validation and the plan (settings -> a list of
 * repeating alarms with their text). Delivery (Android alarms, browser timers, permissions) is in
 * notifications.ts. Nothing here touches the device. See docs/notifications.md.
 */

/** Weekdays as Capacitor numbers them (1 = Sunday ... 7 = Saturday), listed Monday first. */
export const WEEKDAYS: { id: number; short: string; long: string }[] = [
  { id: 2, short: 'Mon', long: 'Monday' },
  { id: 3, short: 'Tue', long: 'Tuesday' },
  { id: 4, short: 'Wed', long: 'Wednesday' },
  { id: 5, short: 'Thu', long: 'Thursday' },
  { id: 6, short: 'Fri', long: 'Friday' },
  { id: 7, short: 'Sat', long: 'Saturday' },
  { id: 1, short: 'Sun', long: 'Sunday' },
];

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  logDay: { enabled: false, time: '21:00' },
  recurring: { enabled: false, time: '09:00' },
  weeklyReview: { enabled: false, time: '18:00', weekday: 1 },
  monthStart: { enabled: false, time: '09:00' },
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeTimed(raw: unknown, fallback: TimedReminder): TimedReminder {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    enabled: typeof src.enabled === 'boolean' ? src.enabled : fallback.enabled,
    time: typeof src.time === 'string' && TIME_RE.test(src.time) ? src.time : fallback.time,
  };
}

/** Accepts anything (old storage, an imported backup) and returns complete, valid settings. */
export function normalizeNotificationSettings(raw: unknown): NotificationSettings {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_NOTIFICATION_SETTINGS;
  const weekday = Number((src.weeklyReview as { weekday?: unknown } | undefined)?.weekday);
  return {
    logDay: normalizeTimed(src.logDay, d.logDay),
    recurring: normalizeTimed(src.recurring, d.recurring),
    weeklyReview: {
      ...normalizeTimed(src.weeklyReview, d.weeklyReview),
      weekday: Number.isInteger(weekday) && weekday >= 1 && weekday <= 7 ? weekday : d.weeklyReview.weekday,
    },
    monthStart: normalizeTimed(src.monthStart, d.monthStart),
  };
}

/* ---------- Plan ---------- */

export type NotificationChannelId = 'koink-daily' | 'koink-recurring' | 'koink-reviews';

/** Android notification channels: the user can tune sound and importance per kind in system settings. */
export const NOTIFICATION_CHANNELS: { id: NotificationChannelId; name: string; description: string }[] = [
  { id: 'koink-daily', name: 'Daily reminder', description: 'The reminder to log the day\u2019s spending' },
  { id: 'koink-recurring', name: 'Recurring items', description: 'Rent, salary and subscriptions on the day they are due' },
  { id: 'koink-reviews', name: 'Reviews', description: 'The weekly review and the start of a new month' },
];

export interface PlannedNotification {
  /** Stable id: the same reminder always replaces itself. */
  id: number;
  channelId: NotificationChannelId;
  title: string;
  body: string;
  hour: number;
  minute: number;
  /** Set = once a month, on this day (1-28). */
  day?: number;
  /** Set = once a week, on this weekday (1 = Sunday). Neither set = every day. */
  weekday?: number;
  /** What a tap on the notification opens. */
  target: OpenTarget;
}

/** Recurring items: one alarm per day of the month, id 2001-2028. The rest are single alarms. */
export const NOTIFICATION_IDS = { recurringBase: 2000, logDay: 3001, weeklyReview: 3002, monthStart: 3003, test: 9001 };

const clock = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
};

const listNames = (names: string[]) => (names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', '));

/**
 * Settings + recurring items -> every repeating alarm the app wants. Pure, so the same plan drives
 * Android's alarm manager and the browser timers. `money` formats an amount in the user's currency.
 */
export function buildNotificationPlan(
  settings: NotificationSettings,
  recurring: Recurring[],
  money: (amount: number) => string,
): PlannedNotification[] {
  const plan: PlannedNotification[] = [];

  if (settings.recurring.enabled) {
    const byDay = new Map<number, Recurring[]>();
    // The alarm repeats every month, so only monthly items get one (an item that is due every 3 months
    // would ring in the two months it is not due).
    for (const item of recurring.filter((r) => r.every <= 1)) byDay.set(item.day, [...(byDay.get(item.day) ?? []), item]);
    for (const [day, items] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
      const [first] = items;
      plan.push({
        id: NOTIFICATION_IDS.recurringBase + day,
        channelId: 'koink-recurring',
        title:
          items.length > 1
            ? `${items.length} recurring items today`
            : first.kind === 'income'
              ? `${first.name} is expected today`
              : `${first.name} is due today`,
        body: items.length > 1 ? `${listNames(items.map((item) => item.name))}. Tap to log them.` : `${money(first.amount)}. Tap to log it.`,
        ...clock(settings.recurring.time),
        day,
        target: 'recurring',
      });
    }
  }

  if (settings.logDay.enabled) {
    plan.push({
      id: NOTIFICATION_IDS.logDay,
      channelId: 'koink-daily',
      title: 'Anything to log today?',
      body: 'Add today\u2019s spending while you still remember it.',
      ...clock(settings.logDay.time),
      target: 'expense',
    });
  }

  if (settings.weeklyReview.enabled) {
    plan.push({
      id: NOTIFICATION_IDS.weeklyReview,
      channelId: 'koink-reviews',
      title: 'Your week in Koink',
      body: 'See what came in, what went out and where it went.',
      ...clock(settings.weeklyReview.time),
      weekday: settings.weeklyReview.weekday,
      target: 'stats',
    });
  }

  if (settings.monthStart.enabled) {
    plan.push({
      id: NOTIFICATION_IDS.monthStart,
      channelId: 'koink-reviews',
      title: 'A new month starts',
      body: 'Check your budgets and log what repeats.',
      ...clock(settings.monthStart.time),
      day: 1,
      target: 'budgets',
    });
  }

  return plan;
}

/** The next moment a planned notification is due, strictly after `now`. */
export function nextOccurrence(n: Pick<PlannedNotification, 'hour' | 'minute' | 'day' | 'weekday'>, now: Date = new Date()): Date {
  if (n.day) {
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), n.day, n.hour, n.minute, 0, 0);
    return thisMonth.getTime() > now.getTime() ? thisMonth : new Date(now.getFullYear(), now.getMonth() + 1, n.day, n.hour, n.minute, 0, 0);
  }
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), n.hour, n.minute, 0, 0);
  if (n.weekday) {
    at.setDate(at.getDate() + ((n.weekday - 1 - at.getDay() + 7) % 7));
    if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 7);
    return at;
  }
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at;
}

const OPEN_TARGETS: OpenTarget[] = ['expense', 'income', 'recurring', 'stats', 'budgets', 'giftcard'];
export const isOpenTarget = (value: unknown): value is OpenTarget => OPEN_TARGETS.includes(value as OpenTarget);
