import { ListOrdered, Target, TrendingUp, Wallet } from 'lucide-react';
import { useApp } from '../lib/store';
import { tabOrder } from '../lib/tabs';
import { usePillTab } from '../lib/pillTab';
import type { ActiveTab } from '../lib/types';
import { t } from '../lib/i18n';

// Each page has its own pastel when it is the active one (the style presets replace it with theirs).
const NAV_META: Record<ActiveTab, { label: string; icon: typeof Wallet; activeClass: string }> = {
  month: { label: 'Month', icon: Wallet, activeClass: 'bg-[#F6D0D0] text-[#6E2326]' },
  transactions: { label: 'Transactions', icon: ListOrdered, activeClass: 'bg-[#FAE0B4] text-[#6E4412]' },
  budgets: { label: 'Budgets', icon: Target, activeClass: 'bg-[#E2D6FF] text-[#49346F]' },
  stats: { label: 'Statistics', icon: TrendingUp, activeClass: 'bg-[#CFE7FE] text-[#1A4670]' },
};
export function Tabs() {
  const { activeTab, setActiveTab, data } = useApp();
  const shownTab = usePillTab() ?? activeTab; // a committed swipe moves the pill at once, not when the page has landed
  const ultra = data.settings.ultraMinimal; // only icons: the active page is a filled circle
  // The order is tabOrder(), the same one the page swipe follows (Budgets can be hidden in Settings).
  const navItems = tabOrder().map((id) => ({ id, ...NAV_META[id] }));

  const select = (id: ActiveTab) => {
    if (shownTab === id) window.scrollTo({ top: 0, behavior: 'smooth' });
    else setActiveTab(id);
  };

  return (
    <div className="flex items-center justify-center pt-1.5 pb-1.5">
      <nav
        aria-label={t('Primary')}
        className="kc-nav-pill inline-flex items-center gap-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full max-w-full"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = shownTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => select(item.id)}
              title={t(item.label)}
              aria-label={t(item.label)}
              aria-current={isActive ? 'page' : undefined}
              className={`kc-nav-tab pressable flex items-center justify-center rounded-full text-xs sm:text-sm font-bold whitespace-nowrap ${
                isActive
                  ? ultra
                    ? `kc-nav-tab-active w-8 h-8 shrink-0 ${item.activeClass}`
                    : `kc-nav-tab-active h-8 gap-1.5 ${item.activeClass} px-3.5 sm:px-4`
                  : 'w-8 h-8 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--inset)]'
              }`}
            >
              <Icon size={16} />
              {isActive && !ultra && <span>{t(item.label)}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
