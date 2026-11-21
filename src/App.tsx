import { useCallback, useEffect, useRef } from 'react';
import { Banknote, Gift, Receipt, Repeat, Zap } from 'lucide-react';
import { t } from './lib/i18n';
import { PigIcon } from './lib/pig';
import { ActionDock, type DockAction } from './components/ActionDock';
import { Header } from './components/Header';
import { PageSwiper } from './components/PageSwiper';
import { StorageBanner } from './components/StorageBanner';
import { ToastHost } from './components/ui';
import { useBackLayer } from './lib/back';
import { currentMonth } from './lib/dates';
import { usePillTab } from './lib/pillTab';
import { useReportAppReady } from './lib/intro';
import { isAppShell, isStandaloneApp } from './lib/platform';
import { takeLaunchAction } from './lib/pwa';
import { AppProvider, useApp } from './lib/store';
import type { ActiveTab, OpenTarget } from './lib/types';
import { useReminders } from './lib/useReminders';
import { useWidgetSync } from './lib/useWidgets';
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
import { AppTour } from './components/tour/AppTour';
import { InstallGuideHost } from './components/InstallGuide';
import type { TourScreen } from './components/tour/tourContent';

const PAGE_TITLES = { month: 'Month', transactions: 'Transactions', budgets: 'Budgets', stats: 'Statistics' };

/** One page by id. The page swiper also uses it for the neighbour that rides along during a swipe. */
function renderPage(tab: ActiveTab) {
  if (tab === 'transactions') return <TransactionsView />;
  if (tab === 'budgets') return <BudgetsView />;
  if (tab === 'stats') return <StatsView />;
  return <MonthView />;
}

/** Income, expense and the shortcuts. The bar belongs to the Month page: `show` is false elsewhere. */
function QuickAddBar({ show }: { show: boolean }) {
  const { data, openSheet } = useApp();
  const quick = data.settings.quickAdd;
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

function Shell() {
  const { activeTab, setActiveTab, setSelectedMonth, openSheet, closeSheet, data } = useApp();
  const hasDock = Object.values(data.settings.quickAdd).some(Boolean);
  // The button bar is only on the Month page. A committed swipe counts at once (like the header pill),
  // so the bar comes or goes while the page is still travelling.
  const shownTab = usePillTab() ?? activeTab;
  const dockOnPage = hasDock && activeTab === 'month';

  // Tells the launch animation that the first screen is painted (it leaves once it has also finished).
  useReportAppReady();

  // Installed (Android app or PWA): Back returns to the Month page before it leaves the app.
  useBackLayer(activeTab !== 'month' && isAppShell(), () => setActiveTab('month'));

  // One way in for everything that opens a screen from outside: a tapped reminder, a home-screen
  // shortcut (?add=expense / ?add=income) or a notification that launched the app (?open=...).
  const openTarget = useCallback((target: OpenTarget) => {
    if (target === 'stats' || target === 'budgets') {
      closeSheet();
      setActiveTab(target);
    } else if (target === 'giftcard') {
      openSheet({ type: 'giftCards' });
    } else if (target === 'recurring') {
      setSelectedMonth(currentMonth()); // "due today" is about this month, whatever was being browsed
      openSheet({ type: 'recurring' });
    } else {
      openSheet({ type: 'tx', kind: target });
    }
  }, [closeSheet, openSheet, setActiveTab, setSelectedMonth]);

  useEffect(() => {
    const target = takeLaunchAction();
    if (target) openTarget(target);
  }, [openTarget]);

  // Reminder notifications: keeps them scheduled and opens the matching screen on a tap.
  useReminders(openTarget);

  // Android home-screen widgets: keeps them drawn and opens the screen behind a tapped button.
  useWidgetSync();

  // Interactive tour driver: responds to postMessage from parent when embedded in tour
  const showScreenRef = useRef<(screen: TourScreen) => void>(() => {});
  showScreenRef.current = (screen: TourScreen) => {
    closeSheet();
    window.scrollTo({ top: 0, behavior: 'instant' });
    switch (screen) {
      case 'month':
        setActiveTab('month');
        break;
      case 'transactions':
        setActiveTab('transactions');
        break;
      case 'budgets':
        setActiveTab('budgets');
        break;
      case 'stats':
        setActiveTab('stats');
        break;
      case 'expense':
        setActiveTab('month');
        openSheet({ type: 'tx', kind: 'expense' });
        break;
      case 'income':
        setActiveTab('month');
        openSheet({ type: 'tx', kind: 'income' });
        break;
      case 'recurring':
        setActiveTab('budgets');
        openSheet({ type: 'recurring' });
        break;
      case 'goals':
        setActiveTab('budgets');
        openSheet({ type: 'goal' });
        break;
      case 'giftcards':
        setActiveTab('month');
        openSheet({ type: 'giftCards' });
        break;
      case 'widgets':
        setActiveTab('month');
        break;
      case 'settings':
        openSheet({ type: 'settings' });
        break;
    }
  };

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.channel === 'koink' && event.data?.type === 'show-screen') {
        showScreenRef.current(event.data.screen);
      }
    };
    window.addEventListener('message', onMessage);
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'koink:ready' }, '*');
    }
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div data-journal-root className="min-h-dvh bg-[var(--bg)] text-[var(--text)] flex flex-col font-sans pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
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
    </div>
  );
}

export default function App() {
  const view = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null;
  const isInstalled = isStandaloneApp();
  const hasSeenTour = () => {
    try {
      return localStorage.getItem('koink_tour_seen') === '1';
    } catch {
      return false;
    }
  };

  // Normal mode: installed PWA, iOS home screen, or explicit ?view=app opens the journal directly.
  // First-time web visitors (or ?view=tour) see the guided tour and installation guide.
  const showJournal = view === 'app' || (view !== 'tour' && (isInstalled || hasSeenTour()));

  if (!showJournal) {
    return (
      <>
        <InstallGuideHost />
        <AppTour />
      </>
    );
  }

  return (
    <AppProvider>
      <Shell />
      <InstallGuideHost />
    </AppProvider>
  );
}
