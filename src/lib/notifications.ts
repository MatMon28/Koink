import { t } from './i18n';
import { isNativeApp } from './platform';
import { NOTIFICATION_CHANNELS, NOTIFICATION_IDS, nextOccurrence, type PlannedNotification } from './reminders';

/*
 * Reminder notifications, the delivery part.
 *
 * - Android app: the plan is handed to Capacitor Local Notifications, which keeps repeating alarms
 *   in the system alarm manager. They arrive with the app closed and are restored after a reboot.
 * - Browser / PWA: the same plan runs on timers, so a reminder only arrives while Koink is open.
 *
 * Nothing is ever sent to a server. See docs/notifications.md.
 */

export type NotificationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

/** Loaded on demand, and only inside the Android app. */
const nativePlugin = () => import('@capacitor/local-notifications').then((module) => module.LocalNotifications);

/** Name of the drawable in android/app/src/main/res/drawable (status-bar glyph) and its tint. */
const SMALL_ICON = 'ic_stat_koink';
const ICON_COLOR = '#286540';

/* ---------- Permission ---------- */

export async function getNotificationPermission(): Promise<NotificationPermission> {
  try {
    if (isNativeApp()) {
      const { display } = await (await nativePlugin()).checkPermissions();
      return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
    }
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission === 'default' ? 'prompt' : Notification.permission;
  } catch {
    return 'unsupported';
  }
}

/** Asks the user. Call it from a tap: browsers require a user gesture. */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  let result: NotificationPermission;
  try {
    if (isNativeApp()) {
      const { display } = await (await nativePlugin()).requestPermissions();
      result = display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
    } else if (typeof Notification === 'undefined') {
      return 'unsupported';
    } else {
      if (Notification.permission === 'default') await Notification.requestPermission();
      result = await getNotificationPermission();
    }
  } catch {
    return 'unsupported';
  }
  // The reminders were planned while the question was still open (and, on Android, nothing could be
  // scheduled without the permission): tell `useReminders`, so it schedules them now.
  announcePermissionChange();
  return result;
}

/* ---------- Permission changes ---------- */

const PERMISSION_EVENT = 'koink:notification-permission';

/** Says that the notification permission may have changed (after the question was answered). */
export function announcePermissionChange(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PERMISSION_EVENT));
}

/**
 * Calls `listener` when the permission may have changed: after the question was answered in the app, and
 * when the app comes back to the foreground (it can be changed in the system settings meanwhile).
 */
export function onPermissionChange(listener: () => void): () => void {
  const onVisible = () => {
    if (document.visibilityState === 'visible') listener();
  };
  window.addEventListener(PERMISSION_EVENT, listener);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.removeEventListener(PERMISSION_EVENT, listener);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

/* ---------- Android: repeating system alarms ---------- */

let nativeQueue: Promise<unknown> = Promise.resolve();

/**
 * Replaces every pending reminder with `plan`. The app owns all of its local notifications, so
 * everything pending is cancelled first. Calls are queued: quick successive edits cannot interleave.
 */
export function syncNativeNotifications(plan: PlannedNotification[]): Promise<void> {
  const run = async () => {
    const plugin = await nativePlugin();
    const pending = await plugin.getPending();
    if (pending.notifications.length > 0) {
      await plugin.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) });
    }
    if (plan.length === 0) return;
    if ((await plugin.checkPermissions()).display !== 'granted') return;
    for (const channel of NOTIFICATION_CHANNELS) await plugin.createChannel({ ...channel, importance: 3, visibility: 1 });
    await plugin.schedule({
      notifications: plan.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        channelId: n.channelId,
        smallIcon: SMALL_ICON,
        iconColor: ICON_COLOR,
        extra: { target: n.target },
        // Repeats at every match of the fields given: daily, weekly (weekday) or monthly (day).
        // `second: 0` matters: without it Android keeps the seconds of "now".
        schedule: {
          on: {
            ...(n.day ? { day: n.day } : {}),
            ...(n.weekday ? { weekday: n.weekday } : {}),
            hour: n.hour,
            minute: n.minute,
            second: 0,
          },
          allowWhileIdle: true,
        },
      })),
    });
  };
  nativeQueue = nativeQueue.then(run, run).catch((error) => console.warn('Scheduling reminders failed', error));
  return nativeQueue as Promise<void>;
}

/* ---------- Browser: timers, only while the app is open ---------- */

/** Timers are re-armed at least this often, so a sleeping laptop or a changed clock cannot strand one. */
const MAX_TIMER_MS = 6 * 60 * 60 * 1000;

interface WebNotice {
  title: string;
  body: string;
  tag: string;
  target?: string;
}

async function showWebNotification(notice: WebNotice, onClick?: () => void): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  const options: NotificationOptions = {
    body: notice.body,
    tag: notice.tag,
    icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    data: { target: notice.target },
  };
  // Through the offline worker where there is one: Chrome on Android only allows that route, and
  // the worker also handles the tap when the tab is in the background.
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration?.active) {
      await registration.showNotification(notice.title, options);
      return true;
    }
  } catch {
    /* no worker here (dev server, sandboxed frame): fall through to the page's own notification */
  }
  try {
    const note = new Notification(notice.title, options);
    note.onclick = () => {
      window.focus();
      onClick?.();
      note.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** Starts the timers for `plan`. Returns the function that stops them. */
export function startWebReminders(plan: PlannedNotification[], onOpen: (target: string) => void): () => void {
  const timers = new Map<number, number>();
  let stopped = false;

  const arm = (n: PlannedNotification, due: Date) => {
    const wait = Math.max(0, due.getTime() - Date.now());
    timers.set(
      n.id,
      window.setTimeout(() => {
        if (stopped) return;
        // A long wait is cut into pieces: only fire when the moment has really come.
        if (Date.now() < due.getTime() - 500) {
          arm(n, due);
          return;
        }
        void showWebNotification({ title: n.title, body: n.body, tag: `koink-${n.id}`, target: n.target }, () => onOpen(n.target));
        arm(n, nextOccurrence(n, new Date(Math.max(Date.now(), due.getTime()))));
      }, Math.min(wait + 250, MAX_TIMER_MS)),
    );
  };

  plan.forEach((n) => arm(n, nextOccurrence(n)));
  return () => {
    stopped = true;
    timers.forEach((timer) => window.clearTimeout(timer));
  };
}

/* ---------- Taps ---------- */

/** Calls `onOpen` with the target of the notification the user tapped (on Android also after a cold start). */
export function listenForNotificationTaps(onOpen: (target: unknown) => void): () => void {
  if (isNativeApp()) {
    const handle = nativePlugin().then((plugin) =>
      plugin.addListener('localNotificationActionPerformed', (event) => {
        onOpen((event.notification.extra as { target?: unknown } | undefined)?.target);
      }),
    );
    return () => {
      void handle.then((h) => h.remove()).catch(() => undefined);
    };
  }
  // Browser: the offline worker reports a tap on a notification it showed (offline-worker.template.js).
  const onMessage = (event: MessageEvent) => {
    const message = event.data as { type?: unknown; target?: unknown } | null;
    if (message && message.type === 'koink:open') onOpen(message.target);
  };
  try {
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  } catch {
    return () => undefined; // sandboxed frame: no worker, nothing to listen to
  }
}

/* ---------- Test ---------- */

/** Fires a notification now, so the user can check that delivery works. Resolves to whether it was sent. */
export async function sendTestNotification(): Promise<boolean> {
  if ((await requestNotificationPermission()) !== 'granted') return false;
  const title = 'Koink';
  const body = t('Reminders are working.');
  if (!isNativeApp()) return showWebNotification({ title, body, tag: 'koink-test' });
  const plugin = await nativePlugin();
  const channel = NOTIFICATION_CHANNELS[0];
  await plugin.createChannel({ ...channel, importance: 3, visibility: 1 });
  await plugin.schedule({
    notifications: [{
      id: NOTIFICATION_IDS.test,
      title,
      body,
      channelId: channel.id,
      smallIcon: SMALL_ICON,
      iconColor: ICON_COLOR,
      schedule: { at: new Date(Date.now() + 2000), allowWhileIdle: true },
    }],
  });
  return true;
}
