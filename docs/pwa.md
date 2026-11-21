# PWA: how it works

> **Scope:** the manifest, icons, the offline worker and how the build writes it, the install card, launch shortcuts, updates.
>
> **Read when:** you change anything that makes the website installable or offline-capable.
>
> **Related:** steps in [prepare-apps.md](prepare-apps.md); [brand.md](brand.md) (icons); [gestures.md](gestures.md) (Back in the installed app); [notifications.md](notifications.md)

## Pieces

| Piece | File | Role |
| --- | --- | --- |
| Tags | `index.html` (between `pwa:start` / `pwa:end`) | manifest link, apple-touch icon, standalone hints, app title; `viewport-fit=cover` and `theme-color` sit just above |
| Manifest | `public/manifest.webmanifest` | name, colours, `display: standalone`, portrait, icons, two shortcuts. All URLs are relative, so a sub-path deployment works |
| Icons | `public/icons/` | `icon-192.png`, `icon-512.png` (any), `maskable-512.png`, `apple-touch-icon.png` (180). Generated: [brand.md](brand.md) |
| Worker template | `scripts/offline-worker.template.js` | the service worker source, with two tokens |
| Worker build step | `offlineWorker()` in `vite.config.ts` | fills the tokens and writes `dist/offline-worker.js` |
| Run time | `src/lib/pwa.ts` | registration, install state, launch requests (`?add=`, `?open=`) |
| UI | `src/components/InstallApp.tsx` | the "Install app" card in Settings |

## The offline worker

**Build.** When `vite build` has written `dist/`, the plugin lists every file in it (except `index.html`, the worker itself, source maps, `downloads/` and `brand/`), hashes names + contents into a 12-character build id, and replaces `'__BUILD_ID__'` and `['__PRECACHE__']` in the template. So each build precaches exactly its own files under its own cache name, `koink-shell-<id>`. The plugin does nothing in `--mode android` and in `npm run dev`.

**Install.** Caches the shell (`./`) and every listed file. A file under `assets/` that cannot be fetched fails the install (the app could not start offline without it; the browser retries later). Icons and the manifest are best-effort. A response that is HTML where a file was expected is rejected: some hosts answer a missing file with `index.html` and status 200.

**Activate.** Deletes every other `koink-shell-*` cache (and `koins-shell-*`, from before the rename) and takes control of open pages.

**Fetch.** Same-origin `GET` inside the worker's scope only:

- *navigation* (opening the app): network first, so a new version is picked up; the cached shell when offline. Query strings do not matter (`?add=expense` still gets the shell).
- *everything else*: cache first, network as a fallback (and the answer is added to the cache).

Requests under `downloads/` (the project archive) and `brand/` (the brand sheet) are left to the browser: not precached, not cached, not answered with the shell. Without that rule, opening the brand sheet would store its page as the app shell.

**Notification taps.** Reminders in the browser are shown through the worker (`registration.showNotification`), so the worker also gets the tap: its `notificationclick` handler closes the notification, focuses an open Koink window and posts `{ type: 'koink:open', target }` to it, or opens `./?open=<target>` when none is left. The scheduling itself is not in the worker: [notifications.md](notifications.md).

**Registration** (`registerOfflineWorker()` in `pwa.ts`, called from `main.tsx`): production builds only, not inside the Android app, after the `load` event, at `BASE_URL + 'offline-worker.js'`. Failures are ignored: the site works without it.

**Updates.** Deploy a new build. The next online launch gets the new page, the browser sees a changed worker, the new worker precaches and activates, the old cache is deleted. There is no "update available" prompt.

The journal is in `localStorage`, not in the cache: clearing or replacing the cache never touches data.

## Install card

`initInstallPrompt()` runs at start-up because `beforeinstallprompt` fires once and early. The state is one of:

| State | When | Card shows |
| --- | --- | --- |
| `available` | the browser offered its dialog (Chromium on Android / desktop) | text + **Install Koink** button (`promptInstall()`) |
| `ios` | iPhone / iPad | Safari > Share > Add to Home Screen |
| `manual` | any other browser | "use the browser menu" |
| `installed` | running standalone, or just installed | "installed on this device" |
| `hidden` | inside the Android app | nothing |

`useInstallState()` is a `useSyncExternalStore` hook over that state. Nothing is stored or sent.

## Launch requests

A launch can ask for a screen. `takeLaunchAction()` reads the request once, removes it (and `?source=pwa`) from the address with `history.replaceState`, and `App.tsx` hands it to `openTarget()`.

| Address | From | Opens |
| --- | --- | --- |
| `./?add=expense`, `./?add=income` | the manifest's `shortcuts` (long-press the home-screen icon on Android, right-click on desktop) | the Add sheet |
| `./?open=expense`, `income`, `recurring`, `stats`, `budgets` | a reminder tapped when no Koink window was open | that sheet or page |

To add one: a value in `OpenTarget` (`types.ts`) and `isOpenTarget` (`reminders.ts`), a case in `openTarget()`, and a manifest entry if it should be a shortcut.

## Installed behaviour

`isStandaloneApp()` (`platform.ts`) is true for `display-mode: standalone / fullscreen / minimal-ui` and iOS `navigator.standalone`. Installed, Back returns to the Month page before it leaves the app ([gestures.md](gestures.md)). Safe-area padding uses `env(safe-area-inset-*)` throughout (header, dock, sheets).

## Not included

No push notifications (reminders are local and, in a browser, only fire while the app is open), no background sync, no `_headers` / `vercel.json` (hosting headers are described in [prepare-apps.md](prepare-apps.md)), no screenshots in the manifest (Chrome then shows its simpler install dialog). See [known-gaps.md](known-gaps.md).
