import { useCallback, useEffect, useRef } from 'react';
import { buildNativeWidgets } from './widgetBridge';
import { isNativeApp, syncWidgets } from './platform';
import { useApp } from './store';
import { intentFor, parseWidgetLink } from './widgets';

/**
 * Runs a widget button: opens the screen its action key stands for (src/lib/widgets.ts). The in-app strip,
 * the preview and a tapped Android widget all end up here, so every button does the same everywhere.
 */
export function useRunWidgetAction(): (key: string) => void {
  const { data, openSheet, closeSheet, setActiveTab } = useApp();
  const hasGoals = data.goals.length > 0;
  return useCallback((key: string) => {
    const intent = intentFor(key);
    if (intent.type === 'category') return openSheet({ type: 'tx', kind: 'expense', categoryId: intent.categoryId });
    if (intent.type === 'saving') return openSheet(hasGoals ? { type: 'tx', kind: 'saving' } : { type: 'goal' });
    if (intent.type === 'quick') return openSheet({ type: 'quick' });
    switch (intent.target) {
      case 'expense': return openSheet({ type: 'tx', kind: 'expense' });
      case 'income': return openSheet({ type: 'tx', kind: 'income' });
      case 'recurring': return openSheet({ type: 'recurring' });
      case 'giftcard': return openSheet({ type: 'giftCard' });
      default:
        closeSheet();
        return setActiveTab(intent.target);
    }
  }, [hasGoals, openSheet, closeSheet, setActiveTab]);
}

let launchLinkTaken = false;

/**
 * Android only. Keeps the home-screen widgets in step with Settings > Widgets (and with the category
 * list, which the category widget shows), and opens the screen behind a tapped widget button: the
 * widget starts the app with a `koink://widget?a=<action>` link. Mounted once, in the shell.
 */
export function useWidgetSync(): void {
  const { data } = useApp();
  const run = useRunWidgetAction();
  const latest = useRef(run);
  useEffect(() => {
    latest.current = run;
  });

  const { widgets, hiddenCategories } = data.settings;
  const categories = data.categories;
  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    // Debounced: toggling several buttons in a row redraws the widgets once.
    const timer = window.setTimeout(() => {
      buildNativeWidgets(widgets).then((json) => {
        if (!cancelled) syncWidgets(json);
      }).catch(() => undefined);
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [widgets, hiddenCategories, categories]);

  useEffect(() => {
    if (!isNativeApp()) return;
    let remove = () => {};
    let gone = false;
    void import('@capacitor/app').then(async ({ App }) => {
      if (!launchLinkTaken) {
        launchLinkTaken = true;
        const launch = await App.getLaunchUrl().catch(() => null);
        const key = parseWidgetLink(launch?.url);
        if (key && !gone) latest.current(key);
      }
      const handle = await App.addListener('appUrlOpen', ({ url }) => {
        const key = parseWidgetLink(url);
        if (key) latest.current(key);
      });
      if (gone) void handle.remove();
      else remove = () => void handle.remove();
    });
    return () => {
      gone = true;
      remove();
    };
  }, []);
}
