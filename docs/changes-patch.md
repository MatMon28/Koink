# Creating and applying `changes.patch`

> **Scope:** how the patch handed back with a round of work is made and applied.
>
> **Read when:** you receive a `changes.patch` or have to produce one.
>
> **Related:** [prepare-apps.md](prepare-apps.md), [pwa-setup.md](pwa-setup.md)

`changes.patch` is `git diff --binary` between the repository at the commit **`acab4c1`** (the head of `main` when this round started) and the working copy after the *Latest round* (see the root [README.md](../README.md)). It contains source, PWA files, GitHub Pages workflow and documentation only: no `node_modules/`, `dist/`, `package.json` or lock file change, and it does not contain itself.

```sh
git apply --check changes.patch   # dry run
git apply --index changes.patch   # apply and stage (new files included)
# the repository has moved on since acab4c1:
git apply --3way changes.patch
```

To make the next one: commit or stash nothing, edit, `git add -A`, then `git diff --cached --binary > changes.patch` and unstage with `git reset`. Keep the docs of every changed file in the same patch (rule in [README.md](README.md#keeping-the-docs-current)).

## What the Latest round changed

- New files: `.github/workflows/pages.yml`, `public/_headers`, `public/offline-worker.js`, `src/components/InstallGuide.tsx`, `src/components/tour/AppTour.tsx`, `src/components/tour/NotificationShowcase.tsx`, `src/components/tour/WidgetGallery.tsx`, `src/components/tour/tourContent.ts`, `docs/apk-download.md`, `docs/pwa-setup.md`, `docs/web-preview.md`.
- Edited: `README.md`, `index.html`, `public/manifest.webmanifest`, `scripts/offline-worker.template.js`, `src/App.tsx`, `src/components/InstallApp.tsx`, `src/lib/i18n.it.ts`, `src/lib/i18n.ts`, `src/lib/intro.ts`, `docs/README.md`, `docs/architecture.md`, `docs/changes-patch.md`, `docs/features/settings.md`, `docs/file-map/README.md`, `docs/file-map/app-shell.md`, `docs/file-map/components.md`, `docs/file-map/config-scripts-public.md`, `docs/launch-intro.md`, `docs/prepare-apps.md`, `docs/pwa.md`.
