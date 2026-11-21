import { useMemo, useState } from 'react';
import { Minus, Plus, RotateCcw, Wallet } from 'lucide-react';
import { Modal } from '../components/Modal';
import { SectionLabel, textInput } from '../components/ui';
import { formatMonth, monthOf } from '../lib/dates';
import { round2 } from '../lib/format';
import { useApp, useSheet } from '../lib/store';
import type { BudgetRule } from '../lib/types';
import { Banner, SaveRow } from './shared';

const RULE_ROWS: { key: keyof BudgetRule; label: string; hint: string; tone: string }[] = [
  { key: 'needs', label: 'Needs', hint: 'Housing, groceries, transport, bills, health', tone: 'bg-[#CFE7FE] text-[#1A4670]' },
  { key: 'wants', label: 'Wants', hint: 'Eating out, fun, shopping', tone: 'bg-[#FAE0B4] text-[#7D4E14]' },
  { key: 'savings', label: 'Savings', hint: 'Money moved to your goals', tone: 'bg-[#E2D6FF] text-[#4D3582]' },
];

export function ProfileSheet() {
  const { isOpen, seq } = useSheet('profile');
  const { closeSheet } = useApp();
  return (
    <Modal isOpen={isOpen} onClose={closeSheet} title="Profile" maxWidth="max-w-md">
      <ProfileForm key={seq} />
    </Modal>
  );
}

function ProfileForm() {
  const { data, money, updateProfile, closeSheet } = useApp();
  const [name, setName] = useState(data.profile.name);
  const [rule, setRule] = useState<BudgetRule>(data.profile.rule);

  const life = useMemo(() => {
    let balance = 0;
    for (const tx of data.txs) {
      if (tx.kind === 'income') balance += tx.amount;
      else if (tx.kind === 'expense') balance -= tx.amount;
    }
    const first = data.txs.length ? monthOf(data.txs[data.txs.length - 1].date) : null;
    return { balance: round2(balance), first, count: data.txs.length };
  }, [data.txs]);

  const total = rule.needs + rule.wants + rule.savings;
  const isDefault = rule.needs === 50 && rule.wants === 30 && rule.savings === 20;
  const step = (key: keyof BudgetRule, delta: number) =>
    setRule((prev) => ({ ...prev, [key]: Math.min(100, Math.max(0, prev[key] + delta)) }));

  const stepButton =
    'pressable size-9 shrink-0 rounded-xl bg-[var(--surface)] hover:bg-[var(--hover)] border border-[var(--border)] text-[var(--text)] flex items-center justify-center disabled:opacity-35';

  return (
    <div className="space-y-4">
      <Banner
        tone="saving"
        icon={Wallet}
        label={name.trim() ? `${name.trim()}'s balance` : 'Balance'}
        value={money(life.balance)}
        sub={life.first ? `${life.count} entries since ${formatMonth(life.first, 'short')}` : 'No entries yet'}
      />

      <div>
        <SectionLabel htmlFor="profile-name">Name</SectionLabel>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Optional"
          maxLength={30}
          autoComplete="given-name"
          className={`${textInput} text-sm`}
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--muted)]">Budget rule</span>
          <button
            type="button"
            onClick={() => setRule({ needs: 50, wants: 30, savings: 20 })}
            disabled={isDefault}
            className="pressable px-2.5 py-1 rounded-lg text-[11px] font-extrabold border bg-[var(--inset)] hover:bg-[var(--hover)] text-[var(--muted)] border-[var(--border)] inline-flex items-center gap-1 disabled:opacity-40"
          >
            <RotateCcw size={11} strokeWidth={2.6} />
            50 / 30 / 20
          </button>
        </div>
        <div className="space-y-1.5">
          {RULE_ROWS.map((row) => (
            <div key={row.key} className="flex items-center gap-2.5 rounded-2xl bg-[var(--inset)] border border-[var(--border)] px-3 py-2.5">
              <span className={`shrink-0 w-12 py-1.5 rounded-lg text-center text-xs font-extrabold tabular-nums ${row.tone}`}>{rule[row.key]}%</span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold text-[var(--text)]">{row.label}</span>
                <span className="block text-[11px] font-medium text-[var(--muted)] truncate">{row.hint}</span>
              </span>
              <button type="button" onClick={() => step(row.key, -5)} disabled={rule[row.key] <= 0} className={stepButton} aria-label={`${row.label}: minus 5 points`}>
                <Minus size={15} />
              </button>
              <button type="button" onClick={() => step(row.key, 5)} disabled={rule[row.key] >= 100} className={stepButton} aria-label={`${row.label}: plus 5 points`}>
                <Plus size={15} />
              </button>
            </div>
          ))}
        </div>
        <p className={`mt-2 text-[11px] font-bold tabular-nums ${total === 100 ? 'text-[var(--muted)]' : 'text-[var(--text-warn)]'}`} aria-live="polite">
          {total === 100
            ? 'Shares of your income. They add up to 100%.'
            : `The three shares add up to ${total}%. ${total < 100 ? `Add ${100 - total}` : `Take off ${total - 100}`} points to reach 100%.`}
        </p>
      </div>

      <SaveRow
        tone="neutral"
        disabled={total !== 100}
        onSave={() => {
          updateProfile({ name: name.trim(), rule });
          closeSheet();
        }}
        label="Save profile"
      />
    </div>
  );
}
