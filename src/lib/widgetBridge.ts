import { createElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import { t } from './i18n';
import { actionFor, categoryWidgetKeys, widgetLink, type WidgetAction } from './widgets';
import type { WidgetSettings } from './types';

/**
 * Android only. The home-screen widgets are drawn natively (KoinkWidgetProvider.java), so the app hands
 * them everything they show: for each button its label, colours, an icon as a PNG and the link a tap opens.
 * The icons are the app's own Lucide icons (and the Koink pig), drawn once into a canvas here, so the
 * native side needs no icon files and always matches the app.
 */

export interface NativeButton {
  label: string;
  bg: string;
  fg: string;
  /** PNG as base64, no `data:` prefix. */
  icon: string;
  uri: string;
}

/** The app's own colours, so the widget tray matches Light, Soft dark and Dark. */
export interface NativeTheme {
  surface: string;
  border: string;
  text: string;
}

export interface NativeWidgets {
  theme: NativeTheme;
  single: NativeButton[];
  multi: NativeButton[];
  categories: NativeButton[];
}

const ICON_PX = 72;
const cache = new Map<string, Promise<string>>();

async function iconPng(icon: LucideIcon, color: string, name: string): Promise<string> {
  const key = `${name}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const job = (async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const svg = renderToStaticMarkup(createElement(icon, { size: ICON_PX, color, strokeWidth: 2.2 }));
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = ICON_PX;
    canvas.height = ICON_PX;
    canvas.getContext('2d')?.drawImage(image, 0, 0, ICON_PX, ICON_PX);
    return canvas.toDataURL('image/png').split(',')[1] ?? '';
  })();
  cache.set(key, job);
  job.catch(() => cache.delete(key));
  return job;
}

/** Any CSS colour (a var(), rgb(), oklch()...) as #rrggbb, the one form the native side parses. */
function cssColorToHex(value: string, fallback: string): string {
  try {
    const probe = document.createElement('span');
    probe.style.color = value;
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return fallback;
    ctx.fillStyle = resolved;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
  } catch {
    return fallback;
  }
}

const readTheme = (): NativeTheme => ({
  surface: cssColorToHex('var(--surface)', '#FBF8F2'),
  border: cssColorToHex('var(--border)', '#E2D9C8'),
  text: cssColorToHex('var(--text)', '#24201C'),
});

async function toNative(action: WidgetAction): Promise<NativeButton> {
  return { label: t(action.label), bg: action.bg, fg: action.fg, icon: await iconPng(action.icon, action.fg, action.key), uri: widgetLink(action.key) };
}

/** Everything the three native widgets draw, as the JSON string `KoinkDevice.setWidgets` stores. */
export async function buildNativeWidgets(settings: WidgetSettings): Promise<string> {
  const make = (keys: string[]) => Promise.all(keys.map((key) => toNative(actionFor(key))));
  const payload: NativeWidgets = {
    theme: readTheme(),
    single: await make([settings.single]),
    multi: await make(settings.multi),
    categories: await make(categoryWidgetKeys(settings)),
  };
  return JSON.stringify(payload);
}
