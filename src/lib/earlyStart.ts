/*
 * Side-effect module. main.tsx imports it BEFORE the app, and ES modules run in import order, so
 * everything here happens before the app's modules are evaluated and before React exists:
 *
 *   0. storage written under the app's old name is moved to the new keys,
 *   1. the saved theme (and Ultra minimal) goes on <html>,
 *   2. the spring curves are published as CSS variables,
 *   3. the launch animation is put on screen.
 *
 * Keep its imports small: whatever it pulls in delays the first frame. See docs/launch-intro.md.
 */
import { startLaunchIntro } from './intro';
import { applyMotionTokens } from './spring';
import { migrateLegacyStorage } from './storage';
import { applyStoredTheme } from './themes';

migrateLegacyStorage();
applyStoredTheme();
applyMotionTokens();
startLaunchIntro();
