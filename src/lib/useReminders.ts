import { useEffect, useMemo, useRef } from 'react';
import { whenIdle } from './idle';
import { listenForNotificationTaps, startWebReminders, syncNativeNotifications } from './notifications';
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
  const { data, money } = useApp();
  const latestOnOpen = useRef(onOpen);
  useEffect(() => {
    latestOnOpen.current = onOpen;
  });

  // The plan as text: the effect below runs only when something in it really changed.
  const planKey = useMemo(
    () => JSON.stringify(buildNotificationPlan(data.settings.notifications, data.recurring, (amount) => money(amount, { cents: true }))),
    [data.settings.notifications, data.recurring, money],
  );

  useEffect(() => listenForNotificationTaps((target) => {
    if (isOpenTarget(target)) latestOnOpen.current(target);
  }), []);

  useEffect(() => {
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
  }, [planKey]);
}
