import { useEffect, useMemo, useRef, useState } from 'react';
import { getLanguage, t } from './i18n';
import { whenIdle } from './idle';
import { getNotificationPermission, listenForNotificationTaps, onPermissionChange, startWebReminders, syncNativeNotifications, type NotificationPermission } from './notifications';
import { isNativeApp } from './platform';
import { buildNotificationPlan, isOpenTarget, type PlannedNotification } from './reminders';
import { useApp } from './store';
import type { OpenTarget } from './types';

/**
 * Keeps the system alarms (Android) or the in-page timers (browser) in step with
 * Settings > Notifications, the recurring items and the currency, and routes a tap on a
 * notification to the matching screen. Mounted once, in the shell.
 */
export function useReminders(onOpen: (target: OpenTarget) => void): void {
  const { data, basic, money } = useApp();
  const latestOnOpen = useRef(onOpen);
  useEffect(() => {
    latestOnOpen.current = onOpen;
  });

  // The permission matters to the schedule: on Android nothing can be scheduled before it is granted, and it
  // is granted *after* the reminder was switched on (the plan itself did not change). So a change of
  // permission schedules again. It is also re-read when the app returns from the system settings.
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  useEffect(() => {
    let alive = true;
    const read = () => void getNotificationPermission().then((value) => alive && setPermission(value));
    read();
    const off = onPermissionChange(read);
    return () => {
      alive = false;
      off();
    };
  }, []);

  // The text follows the language chosen in Settings (this component re-renders when it changes).
  const language = getLanguage();
  // The plan as text: the effect below runs only when something in it really changed.
  const planKey = useMemo(
    () => JSON.stringify(buildNotificationPlan(data.settings.notifications, data.recurring, (amount) => money(amount, { cents: true }), basic, t)),
    // `language` is not read in the body: `t` reads it, so it must be a dependency to rebuild the text
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.settings.notifications, data.recurring, basic, money, language],
  );

  useEffect(() => listenForNotificationTaps((target) => {
    if (isOpenTarget(target)) latestOnOpen.current(target);
  }), []);

  useEffect(() => {
    if (permission === null) return; // not known yet: the next run has it
    const plan = JSON.parse(planKey) as PlannedNotification[];
    if (isNativeApp()) {
      // Debounced, so stepping through a time field does not reschedule on every change; then an
      // idle moment, because rescheduling is several native calls the first frame never needs.
      let cancelIdle = () => {};
      const timer = window.setTimeout(() => {
        cancelIdle = whenIdle(() => void syncNativeNotifications(plan), 4000);
      }, 400);
      return () => {
        window.clearTimeout(timer);
        cancelIdle();
      };
    }
    if (plan.length === 0) return;
    return startWebReminders(plan, (target) => {
      if (isOpenTarget(target)) latestOnOpen.current(target);
    });
  }, [planKey, permission]);
}
