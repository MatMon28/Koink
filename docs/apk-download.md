# Making the "Download APK" button work

> **Scope:** how to put a built APK on the website so the install guide's **Download APK** button really downloads it (GitHub Pages or any static deployment).
>
> **Read when:** the button says *"The APK is not attached to this deployment yet"*, or you released a new APK.
>
> **Related:** [android.md](android.md) (Android shell), [prepare-apps.md](prepare-apps.md) (building the APK), [pwa-setup.md](pwa-setup.md) (hosting)

## 1. How the button works

`src/components/InstallGuide.tsx` has `const APK_URL = './downloads/Koink.apk'`. When the user presses **Download APK** it:

1. sends a `HEAD` request to that URL (relative to the site, e.g. `https://matmon28.github.io/Koink/downloads/Koink.apk`);
2. if the answer is OK **and** is not `text/html`, it navigates to the URL and the browser downloads the file;
3. otherwise it shows the *"The APK is not attached to this deployment yet"* message and the *Official GitHub releases* link.

So the only requirement is: **after `npm run build`, the file `dist/downloads/Koink.apk` must exist.** Vite copies everything in `public/` to `dist/`, so the file has to be at `public/downloads/Koink.apk` when the site is built.

## 2. Build the APK first

Follow [prepare-apps.md](prepare-apps.md#2-the-android-app):

```sh
npm ci
npm run android:prepare
# then in Android Studio: Build > Generate Signed App Bundle / APK > APK > release
```

- **Use a signed release APK** for anything you publish.
- **Keep the same keystore forever** so Android allows updates over an existing install.
- **Raise `versionCode`** (and `versionName`) in `android/app/build.gradle` for every new APK.
- Rename the output to **`Koink.apk`** (case-sensitive on GitHub Pages).

## 3. Option A: GitHub Release + workflow step (recommended)

`.github/workflows/pages.yml` already includes a step that downloads `Koink.apk` from the latest GitHub Release into `public/downloads/Koink.apk` before `npm run build`:

1. GitHub > **Releases** > **Draft a new release**, choose a tag (e.g. `v1.1.0`).
2. Attach the signed file named **`Koink.apk`**.
3. Press **Publish release**. The **Deploy PWA** workflow runs automatically, downloads `Koink.apk`, builds `dist/` and deploys it.

## 4. Option B: copy `Koink.apk` into `public/downloads/` before building

```sh
mkdir -p public/downloads
cp /path/to/your-signed.apk public/downloads/Koink.apk
npm run build
```

Note: `offline-worker.template.js` and `public/offline-worker.js` skip everything under `downloads/`, so `Koink.apk` is never precached by the service worker.
