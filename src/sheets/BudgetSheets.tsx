import { useMemo, useState, type ReactNode } from 'react';
import { Plus, TriangleAlert } from 'lucide-react';
import { Modal } from '../components/Modal';
import { AmountDisplay, NumPad, SectionLabel, useAmountBuffer } from '../components/ui';
import { monthsBack, monthTotals, totalsByMonth } from '../lib/calc';
import { allExpenseCategories, bucketLabel, expenseCategory, isCategoryHidden } from '../lib/categories';
import { addMonths, currentMonth, formatMonth } from '../lib/dates';
import { currencyDecimals, round2 } from '../lib/format';
import { ICON } from '../lib/icons';
import { useApp, useSheet } from '../lib/store';
import type { Sheet } from '../lib/types';
import { ChoiceGrid, SaveRow, type Choice } from './shared';
import { t } from '../lib/i18n';

/*
 * The two budget pop-ups of the Budgets page. Both use the same number pad as Add expense / Add income, with the
 * save button at the very bottom (the pad's own confirm button is hidden, so the category choice can sit between
 * the pad and the save button).
 *
 *   BudgetSheet         one category's monthly budget: pad, then the category choice, then Save.
 *   MonthlyBudgetSheet  the overall monthly budget: pad, then Save. It can never be below the sum of the category budgets.
 */

const chipClass =
  'pressable px-3 py-2 rounded-xl bg-[var(--inset)] hover:bg-[var(--hover)] border border-[var(--border)] text-xs font-extrabold text-[var(--muted)] hover:text-[var(--text)] tabular-nums';

/** The sum of every category budget (what the monthly budget must at least be). */
const sumOf = (budgets: Record<string, number>, skip?: string) =>
  round2(Object.entries(budgets).reduce((total, [id, value]) => total + (id !== skip && value > 0 ? value : 0), 0));

/** The amount on screen: the figure being typed in a rounded box, like the entry sheet's. */
function AmountBox({ text, unit, children }: { text: string; unit: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl bg-[var(--inset)] border border-[var(--border)] px-4 py-5 text-center min-h-[7.25rem] flex flex-col items-center justify-center gap-1">
      <AmountDisplay text={text} unit={unit} className="text-5xl max-w-full overflow-hidden" />
      <span className="text-xs font-bold text-[var(--muted)] tabular-nums min-h-4">{children}</span>
    </div>
  );
}

/* ---------- One category's budget ---------- */

export function BudgetSheet() {
  const { isOpen, sheet, seq } = useSheet('budget');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={t('Set a budget')} subtitle={t('Per month')} maxWidth="max-w-md">
      {sheet && <BudgetForm key={seq} sheet={sheet} />}
    </Modal>
  );
}

function BudgetForm({ sheet }: { sheet: Extract<Sheet, { type: 'budget' }> }) {
  const { data, currency, symbol, money, selectedMonth, setBudget, closeSheet, openSheet } = useApp();
  const budgets = data.profile.budgets;
  const first = sheet.categoryId ? expenseCategory(sheet.categoryId) : undefined;
  // The choice is the categories of the type the + was pressed on (or of the row that was tapped); every type otherwise.
  const bucket = sheet.bucket ?? first?.bucket;

  const [categoryId, setCategoryId] = useState(first?.id ?? '');
  const [amount, setAmount] = useState(first ? budgets[first.id] ?? 0 : 0);
  const { text, press } = useAmountBuffer(amount, setAmount, { decimals: currencyDecimals(currency) });

  const choices: Choice[] = allExpenseCategories()
    .filter((c) => (!bucket || c.bucket === bucket) && (!isCategoryHidden(c.id) || c.id === first?.id || (budgets[c.id] ?? 0) > 0))
    .map((c) => ({ id: c.id, name: c.name, icon: c.icon }));
  const category = categoryId ? expenseCategory(categoryId) : undefined;

  const choose = (id: string) => {
    setCategoryId(id);
    setAmount(budgets[id] ?? 0);
  };

  const spent = useMemo(() => (category ? monthTotals(data.txs, selectedMonth).byCategory[category.id]?.total ?? 0 : 0), [data.txs, selectedMonth, category]);

  // Average of the three full months before this one, as a starting point.
  const average = useMemo(() => {
    if (!category) return 0;
    const months = monthsBack(addMonths(currentMonth(), -1), 3);
    const totals = totalsByMonth(data.txs, months).filter((m) => m.count > 0);
    if (totals.length === 0) return 0;
    return round2(totals.reduce((sum, m) => sum + (m.byCategory[category.id]?.total ?? 0), 0) / totals.length);
  }, [data.txs, category]);
  const suggestion = Math.ceil(average / 10) * 10;

  // The monthly budget rises with the category budgets when they outgrow it: say so.
  const monthly = data.profile.monthlyBudget;
  const newSum = category ? round2(sumOf(budgets, category.id) + amount) : 0;
  const raises = !!category && monthly > 0 && newSum > monthly;

  const left = round2(amount - spent);
  const note = !category
    ? t('Choose a category')
    : amount > 0
      ? left >= 0
        ? t('{v} left of the budget', { v: money(left) })
        : t('{v} over, already spent this month', { v: money(-left) })
      : t('Spent in {v}: {v2}', { v: formatMonth(selectedMonth, 'long', false), v2: money(spent, { cents: true }) });

  const save = () => {
    if (!category) return;
    setBudget(category.id, amount);
    closeSheet();
  };

  return (
    <div className="space-y-4">
      <AmountBox text={t(text)} unit={symbol}>{note}</AmountBox>

      <NumPad onPress={press} onConfirm={save} confirmDisabled={!category} confirmLabel="" hideConfirm decimal={currencyDecimals(currency) > 0} />

      <div>
        <SectionLabel>{t('Category')}</SectionLabel>
        <ChoiceGrid
          choices={choices}
          value={categoryId}
          onChange={choose}
          label={t('Category')}
          collapsible
          extra={{ label: 'New', icon: Plus, onClick: () => openSheet({ type: 'categories' }) }}
        />
        {bucket && <p className="mt-1.5 text-[11px] font-medium text-[var(--muted)]">{t('Categories of {type}. Show or create more in Settings.', { type: bucketLabel(bucket) })}</p>}
      </div>

      {category && (suggestion > 0 || amount > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {suggestion > 0 && (
            <button type="button" onClick={() => setAmount(suggestion)} className={chipClass}>
              {t('Use recent average ·')} {money(suggestion)}
            </button>
          )}
          {amount > 0 && (
            <button type="button" onClick={() => setAmount(0)} className={chipClass}>
              {t('No budget')}
            </button>
          )}
        </div>
      )}

      {raises && (
        <p className="flex items-start gap-1.5 text-[11px] font-bold text-[var(--text-warn)]">
          <TriangleAlert size={ICON.sm} className="mt-px shrink-0" aria-hidden="true" />
          {t('The category budgets add up to {v}: the monthly budget goes up to match.', { v: money(newSum) })}
        </p>
      )}

      <SaveRow
        tone="neutral"
        disabled={!category}
        onSave={save}
        label={!category ? t('Choose a category') : amount > 0 ? t('Save · {v} a month', { v: money(amount) }) : t('Save without a budget')}
      />
    </div>
  );
}

/* ---------- The monthly budget ---------- */

export function MonthlyBudgetSheet() {
  const { isOpen, sheet, seq } = useSheet('monthlyBudget');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title={t('Monthly budget')} subtitle={t('For everything you spend')} maxWidth="max-w-md">
      {sheet && <MonthlyForm key={seq} />}
    </Modal>
  );
}

function MonthlyForm() {
  const { data, currency, symbol, money, updateProfile, closeSheet } = useApp();
  const floor = sumOf(data.profile.budgets);
  const [amount, setAmount] = useState(data.profile.monthlyBudget);
  const { text, press } = useAmountBuffer(amount, setAmount, { decimals: currencyDecimals(currency) });

  // 0 = no monthly budget of its own: it is the sum of the category budgets.
  const tooLow = amount > 0 && amount < floor;
  const save = () => {
    if (tooLow) return;
    updateProfile({ monthlyBudget: amount });
    closeSheet();
  };

  return (
    <div className="space-y-4">
      <AmountBox text={t(text)} unit={symbol}>
        {amount > 0 ? t('At least {v}, the sum of the category budgets', { v: money(floor) }) : t('Not set: it is the sum of the category budgets, {v}', { v: money(floor) })}
      </AmountBox>

      <NumPad onPress={press} onConfirm={save} confirmDisabled={tooLow} confirmLabel="" hideConfirm decimal={currencyDecimals(currency) > 0} />

      {tooLow && (
        <p className="flex items-start gap-1.5 text-[11px] font-bold text-[var(--text-warn)]">
          <TriangleAlert size={ICON.sm} className="mt-px shrink-0" aria-hidden="true" />
          {t('The monthly budget cannot be smaller than the sum of the category budgets ({v}).', { v: money(floor) })}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {floor > 0 && amount !== floor && (
          <button type="button" onClick={() => setAmount(floor)} className={chipClass}>
            {t('Use the sum ·')} {money(floor)}
          </button>
        )}
        {amount > 0 && (
          <button type="button" onClick={() => setAmount(0)} className={chipClass}>
            {t('Remove it')}
          </button>
        )}
      </div>

      <SaveRow
        tone="neutral"
        disabled={tooLow}
        onSave={save}
        label={tooLow ? t('Too low') : amount > 0 ? t('Save · {v} a month', { v: money(amount) }) : t('Use the sum of the category budgets')}
      />
    </div>
  );
}
