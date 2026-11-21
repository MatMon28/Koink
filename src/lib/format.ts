import { localeTag } from './i18n';
import type { CurrencyCode } from './types';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
  /** Minor-unit digits shown in lists (0 for yen, won...). */
  decimals: number;
  /** Rough units of this currency for 1 US dollar. Used until the user updates the rates in Settings. */
  perUsd: number;
}

const c = (code: string, symbol: string, name: string, perUsd: number, decimals = 2): CurrencyInfo => ({ code, symbol, name, perUsd, decimals });

/** The currencies on offer. The `perUsd` figures are approximations: Settings can fetch current ones. */
export const CURRENCIES: CurrencyInfo[] = [
  c('EUR', '€', 'Euro', 0.92),
  c('USD', '$', 'US dollar', 1),
  c('GBP', '£', 'Pound sterling', 0.79),
  c('CHF', 'CHF', 'Swiss franc', 0.88),
  c('JPY', '¥', 'Japanese yen', 150, 0),
  c('CAD', 'CA$', 'Canadian dollar', 1.37),
  c('AUD', 'A$', 'Australian dollar', 1.52),
  c('NZD', 'NZ$', 'New Zealand dollar', 1.65),
  c('CNY', 'CN¥', 'Chinese yuan', 7.2),
  c('HKD', 'HK$', 'Hong Kong dollar', 7.8),
  c('SGD', 'S$', 'Singapore dollar', 1.34),
  c('KRW', '₩', 'South Korean won', 1350, 0),
  c('INR', '₹', 'Indian rupee', 83.5),
  c('IDR', 'Rp', 'Indonesian rupiah', 15800, 0),
  c('THB', '฿', 'Thai baht', 35.5),
  c('MYR', 'RM', 'Malaysian ringgit', 4.7),
  c('PHP', '₱', 'Philippine peso', 56),
  c('VND', '₫', 'Vietnamese dong', 25000, 0),
  c('AED', 'AED', 'UAE dirham', 3.67),
  c('SAR', 'SAR', 'Saudi riyal', 3.75),
  c('ILS', '₪', 'Israeli shekel', 3.7),
  c('TRY', '₺', 'Turkish lira', 32),
  c('EGP', 'E£', 'Egyptian pound', 48),
  c('ZAR', 'R', 'South African rand', 18.5),
  c('NGN', '₦', 'Nigerian naira', 1500),
  c('KES', 'KSh', 'Kenyan shilling', 129),
  c('MAD', 'MAD', 'Moroccan dirham', 10),
  c('SEK', 'kr', 'Swedish krona', 10.5),
  c('NOK', 'kr', 'Norwegian krone', 10.7),
  c('DKK', 'kr', 'Danish krone', 6.9),
  c('ISK', 'kr', 'Icelandic króna', 138, 0),
  c('PLN', 'zł', 'Polish złoty', 4),
  c('CZK', 'Kč', 'Czech koruna', 23.3),
  c('HUF', 'Ft', 'Hungarian forint', 360),
  c('RON', 'lei', 'Romanian leu', 4.6),
  c('BGN', 'лв', 'Bulgarian lev', 1.8),
  c('UAH', '₴', 'Ukrainian hryvnia', 40),
  c('MXN', 'MX$', 'Mexican peso', 17.2),
  c('BRL', 'R$', 'Brazilian real', 5),
  c('ARS', 'AR$', 'Argentine peso', 900),
  c('CLP', 'CL$', 'Chilean peso', 940, 0),
  c('COP', 'CO$', 'Colombian peso', 3900),
];

const info = new Map(CURRENCIES.map((x) => [x.code, x]));

export const isCurrency = (code: unknown): code is CurrencyCode => typeof code === 'string' && info.has(code);
export const currencySymbol = (code: CurrencyCode) => info.get(code)?.symbol ?? code;
/** Yen, won, dong... have no minor unit; every other supported currency has two decimals. */
export const currencyDecimals = (code: CurrencyCode) => info.get(code)?.decimals ?? 2;

/**
 * How many units of `to` one unit of `from` is worth. `rates` (units per US dollar, from Settings)
 * wins over the built-in table, code by code.
 */
export function exchangeRate(from: CurrencyCode, to: CurrencyCode, rates: Record<string, number> = {}): number {
  if (from === to) return 1;
  const perUsd = (code: CurrencyCode) => {
    const live = rates[code];
    return typeof live === 'number' && live > 0 ? live : info.get(code)?.perUsd ?? 1;
  };
  return perUsd(to) / perUsd(from);
}

/** A rate for display: enough digits to be meaningful for both strong and weak currencies. */
export function formatRate(rate: number): string {
  if (rate >= 100) return rate.toFixed(2);
  if (rate >= 1) return rate.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  return rate.toPrecision(4).replace(/0+$/, '').replace(/\.$/, '');
}

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
  const key = `${localeTag()}:${currency}:${digits}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(localeTag(), {
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
  const key = `${localeTag()}:${currency}:short`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(localeTag(), { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 });
    cache.set(key, f);
  }
  const text = f.format(amount);
  return sign && amount > 0 ? `+${text}` : text;
}

export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
