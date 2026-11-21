import type { AppData } from './types';

/**
 * Pure helpers about a whole journal: is it worth protecting, and what is in it. Used by the currency
 * lock (SettingsSheet) and the restore preview (RestoreDialog). No React, no storage.
 */

/** Entries of the sample journal are `s1`, `s2`...; entries made by the user have timestamp-style ids. */
const SAMPLE_TX_ID = /^s\d+$/;

/** True when the journal holds any amount: entries, budgets, goal targets, opening balances, gift cards, recurring items. */
export function hasMoneyData(data: AppData): boolean {
  return (
    data.txs.length > 0 ||
    data.profile.monthlyBudget > 0 ||
    Object.values(data.profile.budgets).some((amount) => amount > 0) ||
    data.goals.some((goal) => goal.target > 0) ||
    data.accounts.some((account) => account.opening !== 0) ||
    data.giftCards.length > 0 ||
    data.recurring.some((item) => item.amount > 0)
  );
}

/**
 * The journal's currency can only be changed while no amount would change its meaning. Every amount is
 * stored as a bare number and shown in the journal's currency, so switching it would relabel (not convert)
 * all of them. The untouched sample journal is exempt: nothing real is in it.
 */
export function currencyLocked(data: AppData): boolean {
  if (!hasMoneyData(data)) return false;
  const untouchedSample = data.settings.sampleData && data.txs.every((tx) => SAMPLE_TX_ID.test(tx.id));
  return !untouchedSample;
}

/** What a journal contains, in a few figures a person can check at a glance. */
export interface JournalSummary {
  currency: string;
  txCount: number;
  /** Oldest and newest entry date (YYYY-MM-DD), or '' for an empty journal. */
  firstDate: string;
  lastDate: string;
  accounts: string[];
  goals: number;
  recurring: number;
  budgets: number;
  giftCards: number;
}

export function summarizeJournal(data: AppData): JournalSummary {
  let firstDate = '';
  let lastDate = '';
  for (const tx of data.txs) {
    if (!firstDate || tx.date < firstDate) firstDate = tx.date;
    if (!lastDate || tx.date > lastDate) lastDate = tx.date;
  }
  return {
    currency: data.settings.currency,
    txCount: data.txs.length,
    firstDate,
    lastDate,
    accounts: data.accounts.map((account) => account.name),
    goals: data.goals.length,
    recurring: data.recurring.length,
    budgets: Object.values(data.profile.budgets).filter((amount) => amount > 0).length + (data.profile.monthlyBudget > 0 ? 1 : 0),
    giftCards: data.giftCards.length,
  };
}

/** A backup file that passed validation, ready to be shown to the user before it replaces anything. */
export interface BackupPreview {
  /** The cleaned journal that a restore would put in place. */
  data: AppData;
  summary: JournalSummary;
  /** Entries in the file that were not valid and are left out. */
  skipped: number;
}
