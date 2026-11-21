# Preparing the two apps: PWA and Android

> **Scope:** the steps *you* follow to build, host, install and release Koink as a PWA and as an Android app.
>
> **Read when:** you set the project up, deploy the web app, or produce an APK / app bundle.
>
> **Related:** [pwa.md](pwa.md) and [android.md](android.md) (how each one works), [known-gaps.md](known-gaps.md), [verification.md](verification.md)

## 0. Requirements

| For | You need |
| --- | --- |
| Everything | Node.js 22 or newer, npm. `npm ci` installs the rest. |
| Android | Android Studio with **JDK 21**, **Android SDK Platform 36** and its build tools. A device or emulator on Android 7.0 (API 24) or newer. |
| Regenerating brand files (rare) | `npm i --no-save sharp` (not a project dependency), then `npm run brand`. |

```sh
npm ci
npm run dev          # http://localhost:5173, hot reload, no offline worker
```

## 1. The PWA

### Build

```sh
npm run build        # type check + production build
npm run preview      # serves dist/ on http://localhost:4173 (the offline worker works on localhost)
```

`dist/` must contain `index.html`, `assets/`, `favicon.svg`, `manifest.webmanifest`, `icons/` (4 PNGs) and `offline-worker.js`. The worker is written by the build itself (see [pwa.md](pwa.md)); never edit it by hand.

### Host

Upload the **whole `dist/` folder** to any static host that serves **HTTPS** (install and offline need a secure origin).

| Host | How |
| --- | --- |
| Vercel / Netlify / Cloudflare Pages | Build command `npm run build`, output directory `dist`. `.vercelignore` keeps `android/` out of Vercel uploads. |
| A sub-path (GitHub Pages: `https://user.github.io/koink/`) | `npm run build -- --base=/koink/`. Every URL (assets, manifest, icons, worker scope) follows the base. |
| Your own server | Serve `dist/`. Send `Cache-Control: no-cache` for `index.html`, `offline-worker.js` and `manifest.webmanifest`, and the type `application/manifest+json` for the manifest. Files under `assets/` have hashed names and can be cached for a year. |

### Install

| Device | Steps |
| --- | --- |
| Android (Chrome, Edge) | Open the site, then **Settings > Install app > Install Koink** in the app, or the browser menu > *Install app* / *Add to Home screen*. Reminders in the installed PWA only fire while it is open; the Android app (section 2) delivers them in the background. |
| iPhone / iPad | Open the site in **Safari**, tap **Share**, then **Add to Home Screen**. |
| Desktop (Chrome, Edge) | The install icon in the address bar, or **Settings > Install app** in the app. |

### Check

1. Chrome DevTools > *Application* > *Manifest*: name, icons and two shortcuts, no errors.
2. *Application* > *Service workers*: `offline-worker.js` is activated. *Cache storage*: one `koink-shell-<id>` cache.
3. *Network* > *Offline*, reload: the app still opens with your data.

### Update

Deploy a new `dist/`. Opening the app online fetches the new page; the new worker installs, precaches the new files and deletes the old cache. Nothing else to do. Journal data is in `localStorage` and is not touched by updates.

## 2. The Android app

The native project in `android/` is committed. Its web files are **not**: they are copied in by the prepare step.

### Every build

```sh
npm ci
npm run android:prepare     # type check, `vite build --mode android`, `cap sync android`, checks
npm run android:open        # opens android/ in Android Studio -> Run
```

or without the IDE:

```sh
cd android
./gradlew assembleDebug     # app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

`android:prepare` replaces `dist/` with the Android build (no offline worker). Run `npm run build` again before you deploy the website.

### Release

1. Raise `versionCode` (every upload) and `versionName` in `android/app/build.gradle`.
2. `npm run android:prepare`.
3. Android Studio > *Build* > *Generate Signed App Bundle / APK*. Create a keystore the first time and keep it and its passwords safe and **out of the repository**: you need the same key for every update.
4. Upload the `.aab` to Google Play, or hand out the signed `.apk`.

### If `android/` has to be recreated

```sh
rm -rf android && npx cap add android
npm i --no-save sharp && npm run brand        # launcher, themed and notification icons
npm run android:splash                        # values/splash_themes.xml
```

then reapply the hand edits listed in [android.md](android.md#hand-edits-on-top-of-the-capacitor-template) (resources, the notification glyph and the three permission lines).

### First run on a device: check these

None of this could be tried where the project was written (no Android SDK). Please confirm on a phone:

- the project compiles (it now has three small Java files) and the app starts on a plain launch screen in the app's background colour;
- the header clears the status bar and the bottom dock clears the navigation bar (old WebView < 140 and a current one);
- Back closes a sheet, then returns to Month, then sends the app to the background;
- **Settings > Your data > Save backup** opens the share sheet with a `.json` file, and **Restore backup** opens the file picker;
- status-bar icons turn light when you choose Soft dark or Dark;
- **Settings > Notifications**: switching a reminder on asks for permission (Android 13+), *Send a test notification* arrives after two seconds with the Koink logo as its small icon (K, pig and coin, tinted green, not a blank square), a reminder set a minute ahead arrives with the app closed, and tapping it opens the right screen;
- the launch animation plays on start and the on-screen keyboard does not cover the amount field or the Save button of a sheet;
- **launch colour** (Android 13+): choose Dark, close the app from recents, open it again: launch screen, animation background and app are the same dark colour, with no light frame in between. Repeat with a style preset;
- the launcher shows the Koink icon, and the themed (monochrome) icon when themed icons are switched on.

## 3. The project archive

**Settings > Project files > Download project (.zip)** in the running web app downloads `koink-project.zip`: the source, the Android project, the PWA files, the scripts and this documentation, under one `koink/` folder. Unzip it, then follow sections 0 to 2 above.

The archive is a file in the repository, `public/downloads/koink-project.zip`, written by:

```sh
npm run package      # then: npm run build
```

It is a snapshot: run `npm run package` again (before the build) whenever the download should match changed files. It leaves out what is installed or generated again (`node_modules`, `dist`, the web files `cap sync` copies into `android/`) and itself. The offline worker does not cache it, and `android:prepare` removes it from the Android build.
