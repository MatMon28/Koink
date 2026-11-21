# Creating and applying `changes.patch`

> **Scope:** how the patch handed back with a round of work is made and applied.
>
> **Read when:** you receive a `changes.patch` or have to produce one.
>
> **Related:** [prepare-apps.md](prepare-apps.md)

`changes.patch` is `git diff --binary` between the repository at the commit **`f2856ca` ("fixes")** and the working copy after the *Latest round* (see the root [README.md](../README.md)). It contains source, CSS and documentation only: no `node_modules/`, `dist/`, `package.json` or lock file change, and it does not contain itself.

```sh
git apply --check changes.patch   # dry run
git apply --index changes.patch   # apply and stage (new files included)
# the repository has moved on since f2856ca:
git apply --3way changes.patch
```

To make the next one: commit or stash nothing, edit, `git add -A`, then `git diff --cached --binary > changes.patch` and unstage with `git reset`. Keep the docs of every changed file in the same patch (rule in [README.md](README.md#keeping-the-docs-current)).

## What the Latest round changed

- New: `src/lib/interrupt.ts`, `docs/changes-patch.md`.
- Edited source: `src/App.tsx`, `src/components/ActionDock.tsx`, `src/components/Modal.tsx`, `src/components/PageSwiper.tsx`, `src/components/ui.tsx`, `src/index.css`, `src/lib/i18n.it.ts`, `src/pages/MonthView.tsx`, `src/sheets/EditSheets.tsx`, `src/sheets/GiftCardSheet.tsx`, `src/sheets/TxSheet.tsx`, `src/sheets/shared.tsx`.
- Edited docs: `README.md`, `docs/architecture.md`, `docs/design-system.md`, `docs/gestures.md`, `docs/known-gaps.md`, `docs/motion.md`, `docs/file-map/{components,lib,sheets}.md`, `docs/features/{entries,month,statistics,categories,recurring,gift-cards,savings-goals}.md`.
