import { Capacitor, registerPlugin, SystemBars, SystemBarsStyle } from '@capacitor/core';
import type { Theme } from './types';

/** True inside the Android app (Capacitor WebView), false in a browser or an installed PWA. */
export const isNativeApp = () => Capacitor.isNativePlatform();

/** True when the web app runs from the home screen / its own window instead of a browser tab. */
export const isStandaloneApp = () =>
  typeof window !== 'undefined' && (
    !!window.matchMedia?.('(display-mode: standalone)').matches ||
    !!window.matchMedia?.('(display-mode: fullscreen)').matches ||
    !!window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );

/** Android app or installed PWA: there is no browser around the app, so Back has to stay inside it. */
export const isAppShell = () => isNativeApp() || isStandaloneApp();

/** Android only: status-bar and navigation-bar icons follow the app's light or dark mode. */
export function syncSystemBars(theme: Theme): void {
  if (!isNativeApp()) return;
  // Style.Light = dark icons for a light page; Style.Dark = light icons for a dark page.
  SystemBars.setStyle({ style: theme === 'light' ? SystemBarsStyle.Light : SystemBarsStyle.Dark }).catch(() => undefined);
}

/** The app's own native plugin (android/app/src/main/java/com/koink/app/KoinkDevicePlugin.java). */
interface KoinkDevicePlugin {
  /** Stores the app's background colour (`#rrggbb`) for the surfaces Android shows before the page paints. */
  setLaunchBackground(options: { color: string }): Promise<void>;
  /** Stores the buttons of the three home-screen widgets (JSON, see src/lib/widgetBridge.ts) and redraws them. */
  setWidgets(options: { json: string }): Promise<void>;
}
const KoinkDevice = registerPlugin<KoinkDevicePlugin>('KoinkDevice');

/**
 * Android only: mirrors the app's background colour natively, so the next launch opens on it: system
 * launch screen, window and WebView are then the colour the launch animation starts on.
 * See docs/launch-intro.md.
 */
export function syncLaunchBackground(color: string): void {
  if (!isNativeApp() || !/^#[0-9a-fA-F]{6}$/.test(color)) return;
  // A native build without the plugin just rejects: nothing to do then.
  KoinkDevice.setLaunchBackground({ color }).catch(() => undefined);
}

/** Android only: hands the home-screen widgets what to draw. A build without the plugin method just rejects. */
export function syncWidgets(json: string): void {
  if (!isNativeApp()) return;
  KoinkDevice.setWidgets({ json }).catch(() => undefined);
}

export type SaveResult = 'downloaded' | 'shared' | 'cancelled';

/**
 * Hands a text file to the user. A browser downloads it. The Android WebView cannot download a
 * blob, so there the file is written to the app's cache and passed to the system share sheet
 * (save to Files, Drive, send to yourself...).
 */
export async function saveTextFile(fileName: string, text: string, mime = 'application/json'): Promise<SaveResult> {
  if (isNativeApp()) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const { uri } = await Filesystem.writeFile({ path: fileName, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: fileName, files: [uri] });
      return 'shared';
    } catch {
      return 'cancelled'; // the share sheet was dismissed
    }
  }

  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
