import writeExcelFile from 'write-excel-file/universal';
import type { Cell, Row, SheetData } from 'write-excel-file/universal';
import { accountBalance, budgetSummary, goalSaved, monthTotals, totalsByMonth } from './calc';
import { allBuckets, allExpenseCategories, bucketLabel, categoryMeta, KIND_LABEL } from './categories';
import { formatMonth, monthOf, todayStr } from './dates';
import { currencyDecimals, round2 } from './format';
import { giftCardBalance } from './giftcards';
import { t } from './i18n';
import type { AppData, Tx } from './types';

/**
 * A readable Excel copy of the journal (Settings > Your data > Export to Excel). It is for people: titles in
 * bold, widths that fit, money with thousands separators, income green and spending red, the header row frozen.
 * It is NOT a backup: nothing can be restored from it (that is the JSON file's job).
 *
 * This file is imported on demand (the library is not part of the first download).
 */

const INK = '#3A3226';
const HEAD_BG = '#EADFC8';
const BAND_BG = '#F8F4EA';
const MUTED = '#8A7F6C';
const GREEN = '#1F7A45';
const RED = '#B4342F';
const PURPLE = '#5B3F99';

type Cells = Exclude<Cell, null | undefined>;

const text = (value: string, extra: object = {}): Cells => ({ value, ...extra });
const head = (value: string, align: 'left' | 'right' = 'left'): Cells => ({ value, fontWeight: 'bold', backgroundColor: HEAD_BG, textColor: INK, align });
const title = (value: string): Cells => ({ value, fontWeight: 'bold', fontSize: 16, textColor: INK });
const section = (value: string): Cells => ({ value, fontWeight: 'bold', fontSize: 12, textColor: INK });
const note = (value: string): Cells => ({ value, fontStyle: 'italic', textColor: MUTED });

/** A day as a real Excel date (UTC, so the day never shifts with the time zone). */
const day = (date: string, band?: string): Cells => {
  const [y, m, d] = date.split('-').map(Number);
  return { value: new Date(Date.UTC(y, m - 1, d)), format: 'yyyy-mm-dd', align: 'left', backgroundColor: band };
};

export async function buildJournalWorkbook(data: AppData, month: string): Promise<Blob> {
  const code = data.settings.currency;
  const moneyFormat = currencyDecimals(code) === 0 ? '#,##0;[Red]-#,##0' : '#,##0.00;[Red]-#,##0.00';

  const money = (value: number, extra: object = {}): Cells => ({ value: round2(value), type: Number, format: moneyFormat, align: 'right', ...extra });
  const percent = (value: number): Cells => ({ value, type: Number, format: '0%', align: 'right' });
  const count = (value: number): Cells => ({ value, type: Number, format: '0', align: 'right' });
  const label = (name: string) => `${name} (${code})`;

  // ---- Summary -------------------------------------------------------------------------------------------
  const months = [...new Set(data.txs.map((tx) => monthOf(tx.date)))].sort().reverse();
  const perMonth = totalsByMonth(data.txs, months);
  let income = 0;
  let spent = 0;
  let saved = 0;
  for (const m of perMonth) {
    income += m.income;
    spent += m.spent;
    saved += m.saved;
  }
  const dates = data.txs.map((tx) => tx.date).sort();
  const period = dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : '–';

  const summary: SheetData = [
    [title(data.profile.name ? t('{name}\'s Koink journal', { name: data.profile.name }) : t('Koink journal'))],
    [note(t('A readable copy for reading and sharing. It cannot be restored into the app: use Save backup for that.'))],
    [],
    [text(t('Exported on'), { fontWeight: 'bold' }), text(todayStr())],
    [text(t('Currency'), { fontWeight: 'bold' }), text(code)],
    [text(t('Entries'), { fontWeight: 'bold' }), count(data.txs.length)],
    [text(t('Period'), { fontWeight: 'bold' }), text(period)],
    [],
    [section(t('Totals, all time'))],
    [text(t('Income')), money(income, { textColor: GREEN })],
    [text(t('Spent')), money(-spent, { textColor: RED })],
    [text(t('Moved to savings')), money(saved, { textColor: PURPLE })],
    [text(t('Income minus spending'), { fontWeight: 'bold' }), money(income - spent, { fontWeight: 'bold' })],
    [],
    [section(t('By month'))],
    [head(t('Month')), head(label(t('Income')), 'right'), head(label(t('Spent')), 'right'), head(label(t('Saved')), 'right'), head(label(t('Income minus spending')), 'right'), head(label(t('Left')), 'right')],
    ...perMonth.map((m, i): Row => {
      const band = i % 2 ? BAND_BG : undefined;
      return [text(formatMonth(m.month), { backgroundColor: band }), money(m.income, { backgroundColor: band, textColor: GREEN }), money(-m.spent, { backgroundColor: band, textColor: RED }), money(m.saved, { backgroundColor: band, textColor: PURPLE }), money(m.net, { backgroundColor: band }), money(m.left, { backgroundColor: band })];
    }),
  ];

  // ---- Transactions --------------------------------------------------------------------------------------
  const accountName = (id?: string) => data.accounts.find((a) => a.id === id)?.name ?? '';
  const cardName = (id: string) => data.giftCards.find((g) => g.id === id)?.name ?? t('Gift card');
  const typeColor = (tx: Tx) => (tx.kind === 'income' ? GREEN : tx.kind === 'expense' ? RED : PURPLE);
  const transactions: SheetData = [
    [head(t('Date')), head(t('Type')), head(t('Category')), head(t('Title')), head(t('Note')), head(t('Account')), head(label(t('Income')), 'right'), head(label(t('Spent')), 'right'), head(label(t('Saved')), 'right'), head(t('Paid in'), 'right'), head(t('Rate'), 'right'), head(t('Gift card'))],
    ...data.txs.map((tx, i): Row => {
      const band = i % 2 ? BAND_BG : undefined;
      const amount = (kind: Tx['kind']): Cells => (tx.kind === kind ? money(tx.amount, { backgroundColor: band, textColor: typeColor(tx) }) : text('', { backgroundColor: band }));
      return [
        day(tx.date, band),
        text(KIND_LABEL[tx.kind], { backgroundColor: band, textColor: typeColor(tx) }),
        text(categoryMeta(tx.kind, tx.categoryId, data.goals).name, { backgroundColor: band }),
        text(tx.note, { backgroundColor: band }),
        text(tx.details ?? '', { backgroundColor: band, wrap: true }),
        text(accountName(tx.accountId), { backgroundColor: band }),
        amount('income'),
        amount('expense'),
        amount('saving'),
        text(tx.foreign ? `${tx.foreign.amount.toFixed(currencyDecimals(tx.foreign.currency))} ${tx.foreign.currency}` : '', { backgroundColor: band, align: 'right' }),
        tx.foreign ? { value: tx.foreign.rate, type: Number, format: '0.0000', align: 'right', backgroundColor: band } : text('', { backgroundColor: band }),
        text(tx.giftCard ? `${cardName(tx.giftCard.id)}: ${tx.giftCard.amount.toFixed(currencyDecimals(code))}` : '', { backgroundColor: band }),
      ];
    }),
  ];

  // ---- Budgets (the month being looked at) ---------------------------------------------------------------
  const totals = monthTotals(data.txs, month);
  const budget = budgetSummary(data.profile, totals);
  const typeOrder = allBuckets().map((b) => b.id);
  const budgetRows = allExpenseCategories()
    .map((c) => ({ c, planned: data.profile.budgets[c.id] ?? 0, used: totals.byCategory[c.id]?.total ?? 0 }))
    .filter((r) => r.planned > 0 || r.used > 0)
    .sort((a, b) => typeOrder.indexOf(a.c.bucket) - typeOrder.indexOf(b.c.bucket) || a.c.name.localeCompare(b.c.name));
  const budgets: SheetData = [
    [title(t('Budgets, {month}', { month: formatMonth(month) }))],
    [],
    [head(t('Category')), head(t('Type')), head(label(t('Budget')), 'right'), head(label(t('Spent')), 'right'), head(label(t('Left')), 'right'), head(t('Used'), 'right')],
    ...budgetRows.map((r, i): Row => {
      const band = i % 2 ? BAND_BG : undefined;
      const left = r.planned > 0 ? r.planned - r.used : null;
      return [
        text(r.c.name, { backgroundColor: band }),
        text(bucketLabel(r.c.bucket), { backgroundColor: band }),
        r.planned > 0 ? money(r.planned, { backgroundColor: band }) : text(t('no budget'), { backgroundColor: band, align: 'right', textColor: MUTED }),
        money(r.used, { backgroundColor: band }),
        left === null ? text('', { backgroundColor: band }) : money(left, { backgroundColor: band, textColor: left < 0 ? RED : GREEN }),
        r.planned > 0 ? percent(r.used / r.planned) : text('', { backgroundColor: band }),
      ];
    }),
    [],
    [section(t('What the headline figure covers'))],
    [text(t('Budgeted categories'), { fontWeight: 'bold' }), money(budget.categoryBudget), money(totals.spent - budget.unbudgeted), text(t('spent in categories that have a budget'), { textColor: MUTED })],
    [text(t('Unbudgeted spending'), { fontWeight: 'bold' }), text(''), money(budget.unbudgeted), text(t('spent in categories without a budget'), { textColor: MUTED })],
    ...(budget.generic
      ? [[text(t('Overall monthly budget'), { fontWeight: 'bold' }), money(data.profile.monthlyBudget), money(totals.spent), money(budget.left, { textColor: budget.left < 0 ? RED : GREEN })] as Row]
      : []),
  ];

  // ---- Goals, accounts, gift cards -----------------------------------------------------------------------
  const goals: SheetData = [
    [head(t('Goal')), head(label(t('Target')), 'right'), head(label(t('Saved')), 'right'), head(label(t('Still to go')), 'right'), head(t('Progress'), 'right')],
    ...data.goals.map((g, i): Row => {
      const band = i % 2 ? BAND_BG : undefined;
      const have = goalSaved(data.txs, g);
      return [
        text(g.name, { backgroundColor: band }),
        g.target > 0 ? money(g.target, { backgroundColor: band }) : text(t('open'), { backgroundColor: band, align: 'right', textColor: MUTED }),
        money(have, { backgroundColor: band, textColor: PURPLE }),
        g.target > 0 ? money(Math.max(0, g.target - have), { backgroundColor: band }) : text('', { backgroundColor: band }),
        g.target > 0 ? percent(Math.min(1, have / g.target)) : text('', { backgroundColor: band }),
      ];
    }),
  ];
  const accounts: SheetData = [
    [head(t('Account')), head(label(t('Opening balance')), 'right'), head(label(t('Balance now')), 'right')],
    ...data.accounts.map((a, i): Row => {
      const band = i % 2 ? BAND_BG : undefined;
      return [text(a.name, { backgroundColor: band }), money(a.opening, { backgroundColor: band }), money(accountBalance(data.txs, a), { backgroundColor: band, fontWeight: 'bold' })];
    }),
  ];
  const cards: SheetData = [
    [head(t('Gift card')), head(label(t('Value')), 'right'), head(label(t('Left')), 'right'), head(t('Expires'))],
    ...data.giftCards.map((g, i): Row => {
      const band = i % 2 ? BAND_BG : undefined;
      return [
        text(g.name, { backgroundColor: band }),
        money(g.initial, { backgroundColor: band }),
        money(giftCardBalance(data.txs, g), { backgroundColor: band, fontWeight: 'bold' }),
        g.expires ? day(g.expires, band) : text('', { backgroundColor: band }),
      ];
    }),
  ];

  const sheets = [
    { data: summary, sheet: t('Summary'), columns: [{ width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 22 }, { width: 18 }], showGridLines: false },
    { data: transactions, sheet: t('Transactions'), columns: [{ width: 12 }, { width: 10 }, { width: 18 }, { width: 28 }, { width: 34 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 14 }, { width: 10 }, { width: 22 }], stickyRowsCount: 1 },
    { data: budgets, sheet: t('Budgets'), columns: [{ width: 28 }, { width: 14 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 10 }], showGridLines: false },
    ...(data.goals.length ? [{ data: goals, sheet: t('Goals'), columns: [{ width: 28 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }], stickyRowsCount: 1 }] : []),
    ...(data.accounts.length ? [{ data: accounts, sheet: t('Accounts'), columns: [{ width: 28 }, { width: 22 }, { width: 22 }], stickyRowsCount: 1 }] : []),
    ...(data.giftCards.length ? [{ data: cards, sheet: t('Gift cards'), columns: [{ width: 28 }, { width: 18 }, { width: 18 }, { width: 14 }], stickyRowsCount: 1 }] : []),
  ];

  return writeExcelFile(sheets, { fontFamily: 'Calibri', fontSize: 11 }).toBlob();
}

export const excelFileName = () => `koink_journal_${todayStr()}.xlsx`;
