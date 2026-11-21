import { addMonths, daysInMonth, monthOf, pad, todayStr } from './dates';
import { round2 } from './format';
import type { Account, Goal, Profile, Recurring, Tx } from './types';

/** Small deterministic generator, so the sample journal looks the same on every visit. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Starting balances only: sample entries carry no account, so these show the Accounts card at work. */
export const SAMPLE_ACCOUNTS: Account[] = [
  { id: 'a_current', name: 'Current account', icon: 'bank', opening: 1240 },
  { id: 'a_cash', name: 'Cash', icon: 'cash', opening: 85 },
  { id: 'a_savings', name: 'Savings account', icon: 'piggy', opening: 2500 },
];

export const SAMPLE_GOALS: Goal[] = [
  { id: 'g_safety', name: 'Emergency fund', target: 6000 },
  { id: 'g_trip', name: 'Summer trip', target: 1800 },
  { id: 'g_laptop', name: 'New laptop', target: 1400 },
];

export const SAMPLE_RECURRING: Recurring[] = [
  { id: 'r_rent', name: 'Rent', amount: 820, kind: 'expense', categoryId: 'housing', day: 1, every: 1, start: '2000-01' },
  { id: 'r_gym', name: 'Gym', amount: 34.9, kind: 'expense', categoryId: 'health', day: 3, every: 1, start: '2000-01' },
  { id: 'r_net', name: 'Internet', amount: 27.9, kind: 'expense', categoryId: 'bills', day: 5, every: 1, start: '2000-01' },
  { id: 'r_salary', name: 'Salary', amount: 2650, kind: 'income', categoryId: 'salary', day: 10, every: 1, start: '2000-01' },
  { id: 'r_stream', name: 'Streaming', amount: 13.99, kind: 'expense', categoryId: 'fun', day: 14, every: 1, start: '2000-01' },
  { id: 'r_power', name: 'Electricity', amount: 62, kind: 'expense', categoryId: 'bills', day: 22, every: 1, start: '2000-01' },
  { id: 'r_phone', name: 'Phone plan', amount: 9.99, kind: 'expense', categoryId: 'bills', day: 25, every: 1, start: '2000-01' },
];

export const SAMPLE_PROFILE: Profile = {
  name: '',
  rule: { needs: 50, wants: 30, savings: 20 },
  budgets: {
    housing: 850, groceries: 360, transport: 140, bills: 120, health: 70,
    eating_out: 150, fun: 90, shopping: 130,
  },
  monthlyBudget: 0,
};

/** Six months of believable entries ending today. */
export function buildSampleTxs(today: string = todayStr()): Tx[] {
  const txs: Tx[] = [];
  const thisMonth = monthOf(today);
  let seq = 0;

  for (let offset = -5; offset <= 0; offset += 1) {
    const month = addMonths(thisMonth, offset);
    const last = offset === 0 ? Number(today.slice(8, 10)) : daysInMonth(month);
    const rand = mulberry32(Number(month.replace('-', '')) * 7 + 13);
    const between = (min: number, max: number) => round2(min + rand() * (max - min));
    const chance = (p: number) => rand() < p;
    const day = (min: number, max: number) => Math.round(min + rand() * (max - min));

    const add = (d: number, kind: Tx['kind'], categoryId: string, note: string, amount: number, recurringId?: string) => {
      if (d < 1 || d > last) return;
      const date = `${month}-${pad(d)}`;
      seq += 1;
      txs.push({ id: `s${seq}`, kind, categoryId, note, amount: round2(amount), date, recurringId, ts: seq });
    };

    for (const r of SAMPLE_RECURRING) {
      add(r.day, r.kind, r.categoryId, r.name, r.id === 'r_power' ? between(48, 78) : r.amount, r.id);
    }

    // Needs
    for (const base of [3, 10, 17, 24]) add(base + day(-1, 1), 'expense', 'groceries', 'Weekly shop', between(38, 76));
    for (let i = 0; i < 4; i += 1) add(day(1, 28), 'expense', 'groceries', 'Bakery', between(3.2, 7.5));
    add(day(5, 9), 'expense', 'groceries', 'Market', between(11, 26));
    add(day(19, 26), 'expense', 'groceries', 'Market', between(11, 26));
    add(2, 'expense', 'transport', 'Metro pass', 35);
    add(day(6, 9), 'expense', 'transport', 'Fuel', between(38, 58));
    add(day(20, 24), 'expense', 'transport', 'Fuel', between(38, 58));
    if (chance(0.5)) add(day(12, 27), 'expense', 'transport', 'Train ticket', between(12, 34));
    if (chance(0.7)) add(day(4, 26), 'expense', 'health', 'Pharmacy', between(6, 22));
    if (offset === -3) add(16, 'expense', 'health', 'Dentist', 85);

    // Wants
    for (let i = 0; i < 7; i += 1) add(day(1, 28), 'expense', 'eating_out', 'Coffee', between(1.4, 3.8));
    for (let i = 0; i < 3; i += 1) add(day(2, 27), 'expense', 'eating_out', 'Lunch out', between(9, 14.5));
    add(day(5, 9), 'expense', 'eating_out', 'Pizza night', between(16, 26));
    add(day(18, 26), 'expense', 'eating_out', 'Pizza night', between(16, 26));
    if (chance(0.6)) add(day(11, 22), 'expense', 'eating_out', 'Sushi', between(29, 41));
    if (chance(0.8)) add(day(6, 19), 'expense', 'fun', 'Cinema', 9.5);
    if (offset === -4 || offset === -1) add(19, 'expense', 'fun', 'Concert tickets', 48);
    if (chance(0.4)) add(day(8, 25), 'expense', 'fun', 'Museum', 12);
    if (chance(0.4)) add(day(9, 27), 'expense', 'fun', 'Bowling', 15);
    if (chance(0.7)) add(day(3, 18), 'expense', 'shopping', 'Books', between(11, 28));
    if (chance(0.7)) add(day(7, 26), 'expense', 'shopping', 'Home stuff', between(14, 46));
    if (offset === -2) add(13, 'expense', 'shopping', 'Sneakers', 89);
    if (offset === 0) add(8, 'expense', 'shopping', 'Winter jacket', 119);

    // Extra income
    if (offset === -4) add(18, 'income', 'freelance', 'Logo project', 380);
    if (offset === -2) add(21, 'income', 'freelance', 'Website fix', 240);
    if (offset === -1) add(6, 'income', 'other', 'Sold old bike', 150);
    if (offset === 0) add(15, 'income', 'freelance', 'Workshop fee', 300);

    // Savings, the day after payday
    add(11, 'saving', 'g_safety', 'Monthly transfer', 200);
    add(11, 'saving', 'g_trip', 'Monthly transfer', 100);
    if (offset >= -3) add(11, 'saving', 'g_laptop', 'Monthly transfer', 80);
  }

  return txs;
}
