import { STORAGE_KEY } from './storage';
import type { Settings, Theme, ThemeStyle } from './types';

/*
 * Style presets and the Mono palette generator of the reference design system. The CSS variables
 * they drive are consumed by src/styles/presets.css.
 */
export interface ThemePresetMeta {
  id: ThemeStyle;
  name: string;
  tag: string;
  swatches: [string, string, string];
}

export const THEME_STYLES: ThemeStyle[] = ['classic', 'angular', 'aurora', 'pop', 'playful', 'minimal', 'mono'];
export const THEMES: Theme[] = ['light', 'lite-dark', 'dark'];

export const STYLE_PRESETS: ThemePresetMeta[] = [
  { id: 'angular', name: 'Angular', tag: 'Chamfered · Tactical', swatches: ['#0b1019', '#ff551a', '#7dd3fc'] },
  { id: 'aurora', name: 'Aurora', tag: 'Glass · Mint & Coral', swatches: ['#16112b', '#34d399', '#fb7185'] },
  { id: 'pop', name: 'Pop', tag: 'Neo-Brutalist · Bold', swatches: ['#fae043', '#7ef29d', '#ff7a7a'] },
  { id: 'playful', name: 'Playful', tag: 'Bubbly · Soft Pastel', swatches: ['#312e81', '#34d399', '#fb7185'] },
  { id: 'minimal', name: 'Minimal', tag: 'Hairline · Crisp Slate', swatches: ['#060911', '#3b82f6', '#e2e8f0'] },
  { id: 'mono', name: 'Mono', tag: 'Single-Hue Tonal', swatches: ['#1e293b', '#64748b', '#cbd5e1'] },
];

export const MONO_HUES: { id: string; hex: string; label: string }[] = [
  { id: 'slate', hex: '#64748b', label: 'Slate' },
  { id: 'emerald', hex: '#059669', label: 'Emerald' },
  { id: 'cobalt', hex: '#2563eb', label: 'Cobalt' },
  { id: 'crimson', hex: '#dc2626', label: 'Crimson' },
  { id: 'amber', hex: '#d97706', label: 'Amber' },
  { id: 'violet', hex: '#7c3aed', label: 'Violet' },
  { id: 'teal', hex: '#0d9488', label: 'Teal' },
  { id: 'rose', hex: '#e11d48', label: 'Rose' },
  { id: 'indigo', hex: '#4f46e5', label: 'Indigo' },
  { id: 'olive', hex: '#65a30d', label: 'Olive' },
];

export const DEFAULT_MONO_HUE = '#64748b';

export const normalizeTheme = (value: unknown): Theme =>
  typeof value === 'string' && (THEMES as string[]).includes(value) ? (value as Theme) : 'light';

export const normalizeThemeStyle = (value: unknown): ThemeStyle =>
  typeof value === 'string' && (THEME_STYLES as string[]).includes(value) ? (value as ThemeStyle) : 'classic';

export function normalizeMonoHue(value: unknown): string {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())) return value.trim().toLowerCase();
  return DEFAULT_MONO_HUE;
}

function mixHex(hex1: string, hex2: string, weight: number): string {
  const a = hex1.replace('#', '');
  const b = hex2.replace('#', '');
  const channel = (i: number) => {
    const v = Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - weight) + parseInt(b.slice(i, i + 2), 16) * weight);
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(clean.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const bestContrastText = (bgHex: string) => (relativeLuminance(bgHex) > 0.42 ? '#090e17' : '#ffffff');

/** Every token of the Mono style, derived from one hue. */
export function getMonoVariables(baseHex: string, mode: Theme): Record<string, string> {
  const hue = normalizeMonoHue(baseHex);
  const p =
    mode === 'light'
      ? {
          appBg: mixHex('#f8fafc', hue, 0.14), surface: '#ffffff', inset: mixHex('#f1f5f9', hue, 0.18),
          hover: mixHex('#e2e8f0', hue, 0.24), card: mixHex('#ffffff', hue, 0.16), pill: mixHex('#f1f5f9', hue, 0.22),
          border: mixHex('#cbd5e1', hue, 0.35), text: '#090e17', muted: '#1e293b', accent: mixHex(hue, '#090e17', 0.22),
          inBg: mixHex(hue, '#090e17', 0.32), outBg: mixHex(hue, '#090e17', 0.08), badgeBg: '#090e17',
        }
      : mode === 'lite-dark'
        ? {
            appBg: mixHex('#181d29', hue, 0.24), surface: mixHex('#242b3b', hue, 0.28), inset: mixHex('#1c2230', hue, 0.26),
            hover: mixHex('#2f384d', hue, 0.32), card: mixHex('#2e374a', hue, 0.32), pill: mixHex('#151a26', hue, 0.22),
            border: mixHex('#64748b', hue, 0.45), text: '#ffffff', muted: '#e2e8f0', accent: mixHex(hue, '#ffffff', 0.34),
            inBg: mixHex(hue, '#ffffff', 0.42), outBg: mixHex(hue, '#ffffff', 0.16), badgeBg: 'rgba(9, 14, 23, 0.65)',
          }
        : {
            appBg: mixHex('#090d16', hue, 0.16), surface: mixHex('#131926', hue, 0.2), inset: mixHex('#0e131f', hue, 0.18),
            hover: mixHex('#1e2638', hue, 0.24), card: mixHex('#1a2233', hue, 0.24), pill: mixHex('#0c111c', hue, 0.18),
            border: mixHex('#334155', hue, 0.35), text: '#f8fafc', muted: '#cbd5e1', accent: mixHex(hue, '#ffffff', 0.25),
            inBg: mixHex(hue, '#ffffff', 0.28), outBg: mixHex(hue, '#090d16', 0.05), badgeBg: 'rgba(0, 0, 0, 0.45)',
          };

  const inText = bestContrastText(p.inBg);
  const outText = bestContrastText(p.outBg);
  const cardText = bestContrastText(p.card);
  const pillText = bestContrastText(p.pill);
  const track = (ink: string) => (ink === '#ffffff' ? 'rgba(255,255,255,0.28)' : 'rgba(9,14,23,0.22)');

  const vars: Record<string, string> = {
    '--mono-accent': p.accent,
    '--bg': p.appBg,
    '--surface': p.surface,
    '--surface-solid': p.surface,
    '--inset': p.inset,
    '--hover': p.hover,
    '--border': p.border,
    '--text': p.text,
    '--muted': p.muted,
    '--brand-flame-color': p.accent,
    '--header-btn-bg': p.surface,
    '--header-icon-color': p.text,
    '--nav-bg': p.surface,
    '--nav-inactive-color': p.muted,
    '--nav-active-bg': p.accent,
    '--nav-active-color': bestContrastText(p.accent),
    '--meal-icon-color': p.accent,
    '--card-border': `1.5px solid ${p.border}`,
    '--intake-bg': p.inBg,
    '--intake-text': inText,
    '--intake-label': inText,
    '--intake-track': track(inText),
    '--intake-fill': inText,
    '--intake-badge-bg': inText,
    '--intake-badge-text': p.inBg,
    '--burned-bg': p.outBg,
    '--burned-text': outText,
    '--burned-label': outText,
    '--burned-track': track(outText),
    '--burned-fill': outText,
    '--badge-bg': p.badgeBg,
    '--badge-text': '#ffffff',
    '--dock-bg': p.surface,
    '--dock-border': `1.5px solid ${p.border}`,
    '--color-nutrient': p.card,
    '--color-nutrient-ink': cardText,
    '--color-intake': p.inBg,
    '--color-intake-ink': inText,
    '--color-intake-accent': inText,
    '--color-intake-soft': track(inText),
    '--color-activity': p.outBg,
    '--color-activity-ink': outText,
    '--color-activity-accent': outText,
    '--color-activity-soft': track(outText),
    '--color-activity-border': p.border,
    '--color-activity-hover': p.hover,
    '--color-weight': p.card,
    '--color-weight-ink': cardText,
    '--color-weight-accent': p.accent,
    '--color-weight-soft': p.pill,
  };
  for (const name of ['carbs', 'protein', 'fat', 'fiber', 'salt', 'sugar']) {
    vars[`--${name}-bg`] = p.card;
    vars[`--${name}-text`] = cardText;
  }
  for (const name of ['c', 'p', 'f']) {
    vars[`--pill-${name}-bg`] = p.pill;
    vars[`--pill-${name}-text`] = pillText;
  }
  for (let i = 1; i <= 6; i += 1) {
    vars[`--dock-${i}`] = p.card;
    vars[`--dock-icon-${i}`] = cardText;
  }
  return vars;
}

const MONO_VAR_KEYS = Object.keys(getMonoVariables(DEFAULT_MONO_HUE, 'light'));

/** Puts the theme on <html>. Returns the page background it results in (`--bg`, as `#rrggbb`). */
export function applyThemeAttributes(theme: Theme, style: ThemeStyle = 'classic', monoHue: string = DEFAULT_MONO_HUE): string {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-style', style);

  if (style === 'mono') {
    for (const [name, value] of Object.entries(getMonoVariables(monoHue, theme))) root.style.setProperty(name, value);
  } else {
    for (const name of MONO_VAR_KEYS) root.style.removeProperty(name);
  }

  // The inline script of index.html may have painted the saved colour before the stylesheet loaded:
  // from here on the CSS rules govern the background.
  root.style.removeProperty('background-color');

  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg || '#EFE9DD');
  writeBootHint({ theme, style, bg });
  return bg;
}

/** Ultra minimal is a look, so it lives on <html> like the theme: `data-ultra="true"` (index.css). */
export function applyUltraMinimal(on: boolean): void {
  const root = document.documentElement;
  if (on) root.setAttribute('data-ultra', 'true');
  else root.removeAttribute('data-ultra');
  writeBootHint({ ultra: on });
}

/**
 * The few values the inline script of index.html needs to paint the very first frame in the saved
 * colours, before the bundle has even been fetched. Kept in a small key of its own so that script
 * never has to parse the journal. See docs/launch-intro.md.
 */
export const BOOT_KEY = 'koink_boot';

function writeBootHint(patch: { theme?: Theme; style?: ThemeStyle; bg?: string; ultra?: boolean }): void {
  try {
    const current = JSON.parse(localStorage.getItem(BOOT_KEY) ?? '{}') as Record<string, unknown>;
    localStorage.setItem(BOOT_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    /* storage blocked: the first frame simply starts in the default colours */
  }
}

/** Called before the first paint so the saved theme is on screen from the first frame. */
export function applyStoredTheme(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const s = raw ? ((JSON.parse(raw) as { settings?: Partial<Settings> }).settings ?? {}) : {};
    applyThemeAttributes(normalizeTheme(s.theme), normalizeThemeStyle(s.themeStyle), normalizeMonoHue(s.monoHue));
    applyUltraMinimal(s.ultraMinimal === true);
  } catch {
    applyThemeAttributes('light', 'classic');
  }
}
