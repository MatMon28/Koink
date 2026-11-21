import { IT } from './i18n.it';

/**
 * Languages. English is the source language: every visible string in the code is its own English text,
 * wrapped in `t()`. Italian is looked up in `IT` (src/lib/i18n.it.ts); a missing entry simply stays English.
 *
 * `t()` is a plain function (no hook) on purpose: the store calls `setLanguage()` while it renders, and every
 * component that reads `useApp()` re-renders when the setting changes, so the text follows at once.
 */
export type Language = 'en' | 'it';

export const LANGUAGES: { id: Language; label: string; tag: string }[] = [
  { id: 'en', label: 'English', tag: 'EN' },
  { id: 'it', label: 'Italiano', tag: 'IT' },
];

export const normalizeLanguage = (value: unknown): Language => (value === 'it' ? 'it' : 'en');

/** The language to start with before the journal is read: a choice made on the tour, or the browser's. */
export function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem('koink_lang');
    if (saved === 'it' || saved === 'en') return saved;
    return navigator.language?.toLowerCase().startsWith('it') ? 'it' : 'en';
  } catch {
    return 'en';
  }
}

let current: Language = 'en';

export function setLanguage(language: Language): void {
  current = language;
  try {
    document.documentElement.lang = language;
  } catch {
    /* no document (tests, scripts) */
  }
}

export const getLanguage = (): Language => current;

/** Locale for number and date formatting. */
export const localeTag = (): string => (current === 'it' ? 'it-IT' : 'en-US');

/**
 * Translate an English text. `{name}` placeholders are filled from `params` after the lookup, so the
 * dictionary key is always the English template: `t('Delete {name}?', { name })`.
 */
export function t(text: string, params?: Record<string, string | number>): string {
  const base = current === 'it' ? IT[text] ?? text : text;
  if (!params) return base;
  return base.replace(/\{(\w+)\}/g, (whole, key: string) => (key in params ? String(params[key]) : whole));
}
