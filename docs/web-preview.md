# Run the web preview / guided tour

> **Scope:** Dev server, browser build, URL switches (`?view=`, `?tour=1`, `?intro=`), and how the guided tour and install guide open.
>
> **Read when:** you run or build the browser version, or need a URL parameter.
>
> **Related:** [prepare-apps.md](prepare-apps.md), [pwa.md](pwa.md), [pwa-setup.md](pwa-setup.md), [launch-intro.md](launch-intro.md)

```sh
npm ci
npm run dev
npm run build
npm run preview
```

- `/` (or `?view=tour`): the guided tour (`src/components/tour/AppTour.tsx`), **only for browser visitors**. It explains each page and sheet of Koink beside a live copy of the journal (`14` steps, including **Notifications** and **Home-screen widgets**), and starts with an install card for iPhone/iPad, Android (PWA + APK) and desktop (`openInstallGuide()`).
- `?view=app`: the standalone browser journal.
- `?view=app&tour=1`: loaded inside the tour's phone frame. It skips the launch animation (`shouldShowIntro()` returns `false` when `tour=1`) and enables the same-origin `postMessage` bridge (`koink-tour`) so changing tour steps, clicking notification preview cards or tapping widget buttons drives the live journal.
- Installed PWAs (`display-mode: standalone`), iOS Home Screen apps (`navigator.standalone`), launch shortcuts (`?add=expense`, `?add=income`), notification launches (`?open=...`) and the native Android app always open the journal directly, even if `?view=tour` is in the URL.
