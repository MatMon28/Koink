import { useCallback, useEffect, useRef, useState } from 'react';
import { Banknote, Gift, Receipt, Repeat, Zap } from 'lucide-react';
import { t } from './lib/i18n';
import { PigIcon } from './lib/pig';
import { ActionDock, type DockAction } from './components/ActionDock';
import { Header } from './components/Header';
import { InstallGuideHost, VIEW_CHANGE_EVENT } from './components/InstallGuide';
import { ModeChooser } from './components/ModeChooser';
import { PageSwiper } from './components/PageSwiper';
import { StorageBanner } from './components/StorageBanner';
import { AppTour } from './components/tour/AppTour';
import { TOUR_CHANNEL, type TourMessage, type TourScreen } from './components/tour/tourContent';
import { ToastHost } from './components/ui';
import { useBackLayer } from './lib/back';
import { currentMonth } from './lib/dates';
import { usePillTab } from './lib/pillTab';
import { useReportAppReady } from './lib/intro';
import { isAppShell } from './lib/platform';
import { takeLaunchAction } from './lib/pwa';
import { AppProvider, useApp } from './lib/store';
import type { ActiveTab, OpenTarget } from './lib/types';
import { useReminders } from './lib/useReminders';
import { useRunWidgetAction, useWidgetSync } from './lib/useWidgets';
import { BudgetsView } from './pages/BudgetsView';
import { MonthView } from './pages/MonthView';
import { StatsView } from './pages/StatsView';
import { TransactionsView } from './pages/TransactionsView';
import { AccountSheet } from './sheets/AccountSheet';
import { CategoriesSheet } from './sheets/CategoriesSheet';
import { GiftCardSheet } from './sheets/GiftCardSheet';
import { GiftCardPickerSheet } from './sheets/GiftCardPickerSheet';
import { BudgetSheet, GoalSheet, RecurringEditSheet } from './sheets/EditSheets';
import { ProfileSheet } from './sheets/ProfileSheet';
import { QuickSheet, RecurringSheet } from './sheets/QuickSheet';
import { SettingsSheet } from './sheets/SettingsSheet';
import { TxSheet } from './sheets/TxSheet';

const PAGE_TITLES = { month: 'Month', transactions: 'Transactions', budgets: 'Budgets', stats: 'Statistics' };

const targetOrigin = () => (window.location.origin === 'null' ? '*' : window.location.origin);

/** One page by id. The page swiper also uses it for the neighbour that rides along during a swipe. */
function renderPage(tab: ActiveTab) {
  if (tab === 'transactions') return <TransactionsView />;
  if (tab === 'budgets') return <BudgetsView />;
  if (tab === 'stats') return <StatsView />;
  return <MonthView />;
}

/** Income, expense and the shortcuts. The bar belongs to the Month page: `show` is false elsewhere. */
function QuickAddBar({ show }: { show: boolean }) {
  const { data, basic, openSheet } = useApp();
  // Basic mode: income and expense, nothing else (no recurring, log again, savings or gift cards).
  const quick = basic ? { ...data.settings.quickAdd, income: true, expense: true, recurring: false, quick: false, saving: false, giftcard: false } : data.settings.quickAdd;
  const actions: DockAction[] = [];
  if (quick.income) actions.push({ id: 'income', icon: <Banknote />, tone: 'bg-intake text-intake-ink', label: 'Add income', onClick: () => openSheet({ type: 'tx', kind: 'income' }) });
  if (quick.expense) actions.push({ id: 'expense', icon: <Receipt />, tone: 'bg-activity text-activity-ink', label: 'Add expense', onClick: () => openSheet({ type: 'tx', kind: 'expense' }) });
  if (quick.recurring) actions.push({ id: 'recurring', icon: <Repeat />, tone: 'bg-[#CFE7FE] text-[#183F66]', label: 'Recurring items', onClick: () => openSheet({ type: 'recurring' }) });
  if (quick.quick) actions.push({ id: 'quick', icon: <Zap />, tone: 'bg-[#FAE0B4] text-[#7D4E14]', label: 'Log again', onClick: () => openSheet({ type: 'quick' }) });
  if (quick.saving) {
    actions.push({
      id: 'saving',
      icon: <PigIcon />,
      tone: 'bg-weight text-weight-ink',
      label: 'Move to savings',
      onClick: () => openSheet(data.goals.length ? { type: 'tx', kind: 'saving' } : { type: 'goal' }),
    });
  }
  // The gift card button is opt-in (Settings > Buttons in the bottom bar).
  if (quick.giftcard) actions.push({ id: 'giftcard', icon: <Gift />, tone: 'bg-[#FFD9E8] text-[#7A1F4B]', label: 'Gift cards', onClick: () => openSheet({ type: 'giftCards' }) });
  return <ActionDock label={t('Quick add')} actions={actions} show={show} />;
}

/**
 * Same-origin bridge between the guided tour (`AppTour.tsx`) and the embedded live journal (`?tour=1`).
 * Announces when the journal is ready (and when its theme / language changes) and opens the page or
 * sheet requested by the current tour step, notification preview card or widget button.
 */
function TourBridge() {
  const { data, setActiveTab, setSelectedMonth, openSheet, closeSheet } = useApp();
  const runWidgetAction = useRunWidgetAction();

  const showScreenRef = useRef<(screen: TourScreen) => void>(() => {});
  showScreenRef.current = (screen) => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    switch (screen) {
      case 'month':
      case 'transactions':
      case 'budgets':
      case 'stats':
        closeSheet();
        setActiveTab(screen);
        break;
      case 'expense':
        setActiveTab('month');
        openSheet({ type: 'tx', kind: 'expense' });
        break;
      case 'income':
        setActiveTab('month');
        openSheet({ type: 'tx', kind: 'income' });
        break;
      case 'saving':
        setActiveTab('month');
        openSheet(data.goals.length ? { type: 'tx', kind: 'saving' } : { type: 'goal' });
        break;
      case 'recurring':
        setActiveTab('month');
        setSelectedMonth(currentMonth());
        openSheet({ type: 'recurring' });
        break;
      case 'quick':
        setActiveTab('month');
        openSheet({ type: 'quick' });
        break;
      case 'giftcards':
        setActiveTab('month');
        openSheet({ type: 'giftCards' });
        break;
      case 'profile':
        openSheet({ type: 'profile' });
        break;
      case 'settings':
        openSheet({ type: 'settings' });
        break;
    }
  };

  const runActionRef = useRef(runWidgetAction);
  runActionRef.current = runWidgetAction;

  useEffect(() => {
    if (window.parent === window) return;
    window.parent.postMessage({ channel: TOUR_CHANNEL, type: 'ready' } satisfies TourMessage, targetOrigin());
  }, [data.settings.theme, data.settings.themeStyle, data.settings.monoHue, data.settings.language, data.settings.widgets]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (window.location.origin !== 'null' && event.origin !== window.location.origin) return;
      const msg = event.data as Partial<TourMessage> | null;
      if (!msg || msg.channel !== TOUR_CHANNEL) return;
      if (msg.type === 'show-screen' && typeof msg.screen === 'string') {
        showScreenRef.current(msg.screen as TourScreen);
      } else if (msg.type === 'open-action' && typeof msg.action === 'string') {
        closeSheet();
        setActiveTab('month');
        runActionRef.current(msg.action);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [closeSheet, setActiveTab]);

  return null;
}

function Shell() {
  const { activeTab, setActiveTab, setSelectedMonth, openSheet, closeSheet, data, basic } = useApp();
  const hasDock = basic || Object.values(data.settings.quickAdd).some(Boolean);
  // The button bar is only on the Month page. A committed swipe counts at once (like the header pill),
  // so the bar comes or goes while the page is still travelling.
  const shownTab = usePillTab() ?? activeTab;
  const dockOnPage = hasDock && activeTab === 'month';

  // Installed (Android app or PWA): Back returns to the Month page before it leaves the app.
  useBackLayer(activeTab !== 'month' && isAppShell(), () => setActiveTab('month'));

  // One way in for everything that opens a screen from outside: a tapped reminder, a home-screen
  // shortcut (?add=expense / ?add=income) or a notification that launched the app (?open=...).
  const openTarget = useCallback((target: OpenTarget) => {
    if (target === 'stats' || target === 'budgets') {
      closeSheet();
      setActiveTab(target); // Budgets is not reachable in Basic mode: the store shows the Month page
    } else if (basic && (target === 'giftcard' || target === 'recurring')) {
      // Basic mode has neither gift cards nor recurring items: land on the Month page.
      closeSheet();
      setActiveTab('month');
    } else if (target === 'giftcard') {
      openSheet({ type: 'giftCards' });
    } else if (target === 'recurring') {
      setSelectedMonth(currentMonth()); // "due today" is about this month, whatever was being browsed
      openSheet({ type: 'recurring' });
    } else {
      openSheet({ type: 'tx', kind: target });
    }
  }, [basic, closeSheet, openSheet, setActiveTab, setSelectedMonth]);

  useEffect(() => {
    const target = takeLaunchAction();
    if (target) openTarget(target);
  }, [openTarget]);

  // Reminder notifications: keeps them scheduled and opens the matching screen on a tap.
  useReminders(openTarget);

  // Android home-screen widgets: keeps them drawn and opens the screen behind a tapped button.
  useWidgetSync();

  return (
    <div data-journal-root className="min-h-dvh bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <TourBridge />
      <Header />

      <main className="flex-1 min-w-0 overflow-x-clip">
        <div className={`w-full max-w-4xl mx-auto px-3.5 sm:px-6 pt-3 sm:pt-4 ${dockOnPage ? 'pb-[calc(7rem+env(safe-area-inset-bottom))]' : 'pb-8'}`}>
          <StorageBanner />
          <h1 className="sr-only">{t('Koink:')} {PAGE_TITLES[activeTab]}</h1>
          <PageSwiper renderPage={renderPage} />
        </div>
      </main>

      {hasDock && <QuickAddBar show={shownTab === 'month'} />}

      <TxSheet />
      <QuickSheet />
      <RecurringSheet />
      <RecurringEditSheet />
      <GoalSheet />
      <BudgetSheet />
      <AccountSheet />
      <GiftCardSheet />
      <GiftCardPickerSheet />
      <CategoriesSheet />
      <ProfileSheet />
      <SettingsSheet />
      <ToastHost />
      <ModeChooser />
    </div>
  );
}

function shouldOpenJournal(): boolean {
  if (typeof window === 'undefined') return true;
  // Normal (installed) mode: an installed PWA, an iOS Home Screen app and the Android bundle
  // always open the journal itself — never the guided-tour page, even with ?view=tour.
  // The guided tour is the default for browser visitors and can be skipped with ?view=app.
  const installed =
    isAppShell() ||
    import.meta.env.VITE_ANDROID_RELEASE === 'true' ||
    window.location.protocol === 'capacitor:';
  if (installed) return true;
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view === 'tour') return false;
  if (view === 'app' || params.get('tour') === '1' || params.has('add') || params.has('open') || params.has('source')) {
    return true;
  }
  return false;
}

export default function App() {
  const [showJournal, setShowJournal] = useState(shouldOpenJournal);

  // Tells the launch animation that the first screen (tour or journal) is painted.
  useReportAppReady();

  useEffect(() => {
    const onViewChange = (event: Event) => {
      const next = (event as CustomEvent<'app' | 'tour'>).detail;
      if (next === 'app') setShowJournal(true);
      else if (next === 'tour' && !isAppShell()) setShowJournal(false);
    };
    const onPopState = () => setShowJournal(shouldOpenJournal());
    window.addEventListener(VIEW_CHANGE_EVENT, onViewChange);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener(VIEW_CHANGE_EVENT, onViewChange);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  if (!showJournal) {
    return (
      <>
        <InstallGuideHost />
        <AppTour />
      </>
    );
  }

  return (
    <>
      <AppProvider>
        <Shell />
      </AppProvider>
      <InstallGuideHost />
    </>
  );
}
