import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ICON } from '../lib/icons';
import { BellRing, CalendarDays, Receipt, Repeat, ChartColumn } from 'lucide-react';
import { Collapsible, ToggleRow, textInput } from '../components/ui';
import { getNotificationPermission, requestNotificationPermission, sendTestNotification, type NotificationPermission } from '../lib/notifications';
import { isNativeApp } from '../lib/platform';
import { WEEKDAYS } from '../lib/reminders';
import { useApp } from '../lib/store';
import type { NotificationSettings as NotificationSettingsData } from '../lib/types';
import { t } from '../lib/i18n';

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
      <span>{t(label)}</span>
      <input
        type="time"
        value={value}
        onChange={(event) => {
          if (event.target.value) onChange(event.target.value);
        }}
        className={`${textInput} !w-auto !min-h-9 !px-2.5 tabular-nums normal-case tracking-normal`}
      />
    </label>
  );
}

interface RowProps {
  icon: ReactNode;
  tone: string;
  title: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  children?: ReactNode;
}

/** A switch row of the shared `ToggleRow`; `desc` is the English description (translated by the row). */
function Row({ desc, ...rest }: Omit<RowProps, 'children'> & { children?: ReactNode }) {
  return <ToggleRow description={desc} {...rest} />;
}

/**
 * Settings > Notifications. Every reminder is opt-in, scheduled on the device, and never leaves it.
 * Turning one on asks for the system permission; the scheduling itself happens in useReminders.
 */
export function NotificationSettings() {
  const { data, basic, updateSettings, showToast } = useApp();
  const n = data.settings.notifications;
  const [permission, setPermission] = useState<NotificationPermission>('prompt');

  // The permission can change in system settings while the app is in the background.
  const refresh = useCallback(() => {
    void getNotificationPermission().then(setPermission);
  }, []);
  useEffect(() => {
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [refresh]);

  const save = (next: NotificationSettingsData) => updateSettings({ notifications: next });
  const ensurePermission = async () => {
    if (permission !== 'granted') setPermission(await requestNotificationPermission());
  };
  const patch = <K extends keyof NotificationSettingsData>(key: K, change: Partial<NotificationSettingsData[K]>) =>
    save({ ...n, [key]: { ...n[key], ...change } });
  /** Turning a reminder on asks for permission first: the tap is the gesture browsers require. */
  const toggle = (key: keyof NotificationSettingsData) => {
    const enabled = !n[key].enabled;
    patch(key, { enabled });
    if (enabled) void ensurePermission();
  };

  const recurringDays = new Set(data.recurring.map((item) => item.day)).size;
  const anyOn = n.logDay.enabled || (n.recurring.enabled && !basic) || n.weeklyReview.enabled || n.monthStart.enabled;

  const test = async () => {
    const sent = await sendTestNotification().catch(() => false);
    refresh();
    showToast(sent ? t('Test notification sent') : t('Notifications are not allowed here'));
  };

  return (
    <Collapsible title={t('Notifications')}>
      <p className="text-xs font-medium text-[var(--muted)]">
        {isNativeApp() ? t('Reminders come from your phone, even when Koink is closed. Pick the ones you want.') : t('Pick the reminders you want. In a browser they only arrive while Koink is open; the Android app delivers them in the background.')}
      </p>

      {permission === 'denied' && (
        <p role="alert" className="text-[11px] font-bold rounded-xl px-3 py-2 bg-wants text-wants-ink">
          {t('Notifications are blocked for Koink. Allow them in your')} {isNativeApp() ? t('phone') : t('browser')} {t('settings to receive reminders.')}
        </p>
      )}
      {permission === 'unsupported' && (
        <p className="text-[11px] font-bold rounded-xl px-3 py-2 bg-[var(--inset)] border border-[var(--border)] text-[var(--muted)]">{t('Notifications are not available here.')}</p>
      )}
      {permission === 'prompt' && anyOn && (
        <button
          type="button"
          onClick={() => void ensurePermission()}
          className="pressable pressable-soft w-full rounded-xl px-3 py-2.5 text-xs font-extrabold bg-[var(--text)] text-[var(--on-text)]"
        >
          {t('Allow notifications')}
        </button>
      )}

      <div className="space-y-1.5">
        <Row
          icon={<Receipt size={ICON.md} aria-hidden="true" />}
          tone="bg-activity text-activity-ink"
          title={t('Daily reminder')}
          desc="Log the day's spending while you remember it"
          on={n.logDay.enabled}
          onToggle={() => toggle('logDay')}
        >
          <TimeField label={t('At')} value={n.logDay.time} onChange={(time) => patch('logDay', { time })} />
        </Row>

        {!basic && (
        <Row
          icon={<Repeat size={ICON.md} aria-hidden="true" />}
          tone="bg-needs text-needs-ink"
          title={t('Recurring items')}
          desc={data.recurring.length === 0 ? 'Set up a recurring item first.' : 'On the day each one is due'}
          on={n.recurring.enabled}
          disabled={data.recurring.length === 0 && !n.recurring.enabled}
          onToggle={() => toggle('recurring')}
        >
          <TimeField label={t('At')} value={n.recurring.time} onChange={(time) => patch('recurring', { time })} />
          <p className="text-[11px] font-medium text-[var(--muted)] tabular-nums">
            {recurringDays === 1 ? t('1 reminder a month') : t('{recurringDays} reminders a month', { recurringDays })}{t(', one for each day something is due.')}
          </p>
        </Row>
        )}

        <Row
          icon={<ChartColumn size={ICON.md} aria-hidden="true" />}
          tone="bg-weight text-weight-ink"
          title={t('Weekly review')}
          desc="A look at where the week's money went"
          on={n.weeklyReview.enabled}
          onToggle={() => toggle('weeklyReview')}
        >
          <div className="grid grid-cols-7 gap-1" role="group" aria-label={t('Day of the week')}>
            {WEEKDAYS.map((day) => {
              const active = n.weeklyReview.weekday === day.id;
              return (
                <button
                  key={day.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={t(day.long)}
                  onClick={() => patch('weeklyReview', { weekday: day.id })}
                  className={`pressable min-w-0 py-1.5 rounded-xl text-[11px] font-extrabold border ${
                    active
                      ? 'bg-[var(--text)] text-[var(--on-text)] border-[var(--text)]'
                      : 'bg-[var(--surface)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)]'
                  }`}
                >
                  {t(day.short)}
                </button>
              );
            })}
          </div>
          <TimeField label={t('At')} value={n.weeklyReview.time} onChange={(time) => patch('weeklyReview', { time })} />
        </Row>

        <Row
          icon={<CalendarDays size={ICON.md} aria-hidden="true" />}
          tone="bg-nutrient text-nutrient-ink"
          title={t('New month')}
          desc={basic ? 'On the 1st: a fresh month to log' : 'On the 1st: check budgets, log what repeats'}
          on={n.monthStart.enabled}
          onToggle={() => toggle('monthStart')}
        >
          <TimeField label={t('At')} value={n.monthStart.time} onChange={(time) => patch('monthStart', { time })} />
        </Row>
      </div>

      <button
        type="button"
        onClick={() => void test()}
        disabled={permission === 'unsupported'}
        className="pressable pressable-soft w-full py-2.5 px-3 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
      >
        <BellRing size={ICON.sm} aria-hidden="true" />
        {t('Send a test notification')}
      </button>
    </Collapsible>
  );
}
