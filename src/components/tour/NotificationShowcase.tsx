import type { ReactNode } from 'react';
import { BarChart3, BellRing, CalendarCheck2, Receipt, Repeat } from 'lucide-react';
import type { TourLang, TourScreen, TourUi } from './tourContent';

interface Props {
  ui: TourUi;
  lang: TourLang;
  onOpen: (screen: TourScreen) => void;
}

/**
 * Notification previews for the guided tour. Each card mirrors one of Koink's four reminder alarms
 * (src/lib/reminders.ts) and opens its target screen in the live journal when tapped.
 */
export function NotificationShowcase({ ui, onOpen }: Props) {
  const text = ui.notifications;

  const cards: { id: string; screen: TourScreen; when: string; title: string; body: string; tone: string; icon: ReactNode }[] = [
    {
      id: 'logDay',
      screen: 'expense',
      when: text.logDayWhen,
      title: text.logDayTitle,
      body: text.logDayBody,
      tone: 'bg-[#F6D0D0] text-[#6E2326]',
      icon: <Receipt size={16} aria-hidden="true" />,
    },
    {
      id: 'recurring',
      screen: 'recurring',
      when: text.recurringWhen,
      title: text.recurringTitle,
      body: text.recurringBody,
      tone: 'bg-[#CFE7FE] text-[#183F66]',
      icon: <Repeat size={16} aria-hidden="true" />,
    },
    {
      id: 'weeklyReview',
      screen: 'stats',
      when: text.weeklyWhen,
      title: text.weeklyTitle,
      body: text.weeklyBody,
      tone: 'bg-[#E2D6FF] text-[#49346F]',
      icon: <BarChart3 size={16} aria-hidden="true" />,
    },
    {
      id: 'monthStart',
      screen: 'budgets',
      when: text.monthStartWhen,
      title: text.monthStartTitle,
      body: text.monthStartBody,
      tone: 'bg-[#FAE0B4] text-[#7D4E14]',
      icon: <CalendarCheck2 size={16} aria-hidden="true" />,
    },
  ];

  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-extrabold">
        <BellRing size={16} aria-hidden="true" />
        {text.heading}
      </h3>
      <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{text.hint}</p>
      <ul data-testid="notification-showcase" className="mt-4 grid gap-2.5 rounded-[28px] bg-[var(--inset)] p-3 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.id}>
            <button
              type="button"
              onClick={() => onOpen(card.screen)}
              className="pressable flex w-full items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-sm hover:bg-[var(--hover)]"
            >
              <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${card.tone}`}>{card.icon}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--muted)]">
                  <span>{text.appName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{card.when}</span>
                </span>
                <span className="mt-0.5 block text-[13px] font-extrabold leading-snug">{card.title}</span>
                <span className="mt-0.5 block text-xs leading-snug text-[var(--muted)]">{card.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
