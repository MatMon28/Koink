import type { CurrencyCode } from './types';

export const CURRENCIES: { code: CurrencyCode; symbol: string; name: string }[] = [
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'US dollar' },
  { code: 'GBP', symbol: '£', name: 'Pound' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss franc' },
  { code: 'JPY', symbol: '¥', name: 'Yen' },
];

export const currencySymbol = (code: CurrencyCode) => CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
/** Yen has no minor unit; every other supported currency has two decimals. */
export const currencyDecimals = (code: CurrencyCode) => (code === 'JPY' ? 0 : 2);

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const cache = new Map<string, Intl.NumberFormat>();

export interface MoneyOptions {
  /** Show the minor unit (cents). Cards and pills round to whole units; rows show cents. */
  cents?: boolean;
  /** Prefix positive amounts with "+". */
  sign?: boolean;
}

export function formatMoney(amount: number, currency: CurrencyCode, { cents = false, sign = false }: MoneyOptions = {}): string {
  const digits = cents ? currencyDecimals(currency) : 0;
  const key = `${currency}:${digits}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    cache.set(key, f);
  }
  // Avoid "-€0" for tiny negative values that round to zero.
  const scale = 10 ** digits;
  const rounded = Math.round(amount * scale) / scale;
  const text = f.format(rounded === 0 ? 0 : rounded);
  return sign && rounded > 0 ? `+${text}` : text;
}

/**
 * The amount in whole units, switching to a short form ("€1.2M") when the full figure would be
 * longer than `maxChars`. Cards have a fixed width, and a clipped amount would simply be wrong.
 */
export function formatMoneyFit(amount: number, currency: CurrencyCode, maxChars: number, sign = false): string {
  const full = formatMoney(amount, currency, { sign });
  if (full.length <= maxChars) return full;
  const key = `${currency}:short`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 });
    cache.set(key, f);
  }
  const text = f.format(amount);
  return sign && amount > 0 ? `+${text}` : text;
}

export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
