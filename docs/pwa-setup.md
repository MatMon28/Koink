# PWA setup instructions

> **Scope:** the steps *you* follow to get the PWA, guided tour and install guide into your repository, build, host over HTTPS, install and verify the app.
>
> **Read when:** you apply `changes.patch`, deploy the web app, or an install button / offline mode does not appear.
>
> **Related:** [pwa.md](pwa.md) (how it works), [apk-download.md](apk-download.md), [changes-patch.md](changes-patch.md), [prepare-apps.md](prepare-apps.md)

## 1. Apply the patch

From the root of your clone of `MatMon28/Koink` (commit `acab4c1` or a descendant whose touched files still match):

```sh
git apply --check changes.patch   # dry run, must print nothing
git apply --index changes.patch   # applies and stages
# repository has moved on?
git apply --3way changes.patch
```

New files in this round: `public/_headers`, `public/offline-worker.js`, `.github/workflows/pages.yml`, `src/components/InstallGuide.tsx`, `src/components/tour/AppTour.tsx`, `src/components/tour/tourContent.ts`, `src/components/tour/NotificationShowcase.tsx`, `src/components/tour/WidgetGallery.tsx`, `docs/pwa-setup.md`, `docs/apk-download.md`, `docs/web-preview.md`. Edited: `index.html`, `public/manifest.webmanifest`, `scripts/offline-worker.template.js`, `src/App.tsx`, `src/components/InstallApp.tsx`, `src/lib/intro.ts`, `src/lib/i18n.it.ts` and the docs. No new npm dependency (`package.json` is untouched).

## 2. Build

```sh
npm ci
npm run build
```

Check `dist/` contains `index.html`, `manifest.webmanifest`, `offline-worker.js`, `icons/` (4 PNGs), `favicon.svg` and `_headers`. Try it locally (service workers work on `localhost`):

```sh
npm run preview   # http://localhost:4173
```

## 3. Host it over HTTPS

Upload the **whole `dist/` folder**, not only `index.html` (the manifest, icons and worker are separate files). Any static host works; keep the relative layout.

| Host | How |
| --- | --- |
| **GitHub Pages** | Settings > Pages > *GitHub Actions*. `.github/workflows/pages.yml` builds and deploys `dist/`. For a sub-path (`https://<user>.github.io/Koink/`), relative URLs (`./...`) already handle the sub-path. |
| **Netlify / Cloudflare Pages** | Build command `npm run build`, publish directory `dist`. `public/_headers` is picked up automatically. |
| **Own server (nginx)** | Serve `dist/` over HTTPS; send `Cache-Control: no-cache` for `index.html`, `offline-worker.js`, `manifest.webmanifest`, and the MIME type `application/manifest+json` for the manifest (snippet below). |

nginx:

```nginx
location = /offline-worker.js       { add_header Cache-Control "no-cache"; }
location = /index.html              { add_header Cache-Control "no-cache"; }
location = /manifest.webmanifest    { add_header Cache-Control "no-cache"; default_type application/manifest+json; }
location /icons/                    { add_header Cache-Control "no-cache"; }
```

## 4. Install on a device

| Platform | Steps |
| --- | --- |
| **Android (Chrome / Edge / Samsung Internet)** | Open the HTTPS URL, tap **Install app** on the tour landing page or Settings > *Install app* > **Install Koink** (or browser menu > *Install app*). |
| **Desktop (Chrome / Edge)** | Tap **Install app** on the tour landing page, Settings > *Install app*, or the install icon in the address bar. |
| **iPhone / iPad (Safari)** | Share > **Add to Home Screen**. Safari offers no install button; the install guide and Settings show the steps. Open it from the home-screen icon once while online. |

Your journal stays on that browser/device (`localStorage`). A browser tab and the installed app on the same device share it; another device or browser does not, so use *Settings > Your data > Save backup / Restore backup* to move data.

## 5. Verify

1. Chrome DevTools > **Application** > *Manifest*: no errors, three icons, two shortcuts, "Installable" is shown. *Service Workers*: `offline-worker.js` is **activated and running**. *Cache Storage*: `koink-shell-*` lists the shell, manifest and icons.
2. Tick *Offline* (Application > Service Workers) or switch on flight mode and reload: the app must still open.
3. Run **Lighthouse** > Progressive Web App (or *Installable* audit); it should pass.
4. Open Settings: the **Install app** card offers one-tap install when supported, a **How to install** button that opens the device guide, and shows "Koink is installed on this device" inside the installed app.

## 6. Guided tour, install guide and APK

The site explains itself and its installation on first load: browser visitors land on `AppTour.tsx` (`/` or `?view=tour`), which walks through every page and sheet beside a live copy of the journal (`?view=app&tour=1`), previews the reminder notifications (`NotificationShowcase.tsx`), finishes with the home-screen widgets (`WidgetGallery.tsx`), and starts with the install card for **iPhone/iPad**, **Android** (web app and APK) and **Computer**.

Both the tour and Settings > *Install app* open `InstallGuide.tsx` (`openInstallGuide()`). For Android the guide also offers the **APK** (`./downloads/Koink.apk`; see [apk-download.md](apk-download.md)) and explains Android / Play Protect's “unknown source / could be dangerous” warning before downloading.

Installed copies always open the journal: the manifest starts at `./?view=app&source=pwa` and `App.tsx` detects standalone display mode (plus iOS Home Screen and the native Android shell) and ignores `?view=tour`.
