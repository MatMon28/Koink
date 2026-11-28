---
name: context-export
description: >-
  Maintains and runs `scripts/export-context.mjs` to export aggregated `.txt`
  context bundles (each under 250 KB) into `export-txt/` for sharing app code
  and docs with another agent. Use whenever creating a new source, doc, script,
  config, or native Android file, or when the user asks to export/update the
  aggregated context files.
---

# Context Export Workflow

Koink maintains an aggregated text export of all understanding-critical code, documentation, configuration, scripts, and native Android files in `export-txt/` (gitignored) via `scripts/export-context.mjs`.

## 1. When Creating a New File

Whenever you create a new file that helps deeply understand how the app works, add its repo-relative path to the appropriate category in `CATEGORIES` inside `scripts/export-context.mjs`:

- **`docs-overview-and-architecture`**: Root/top-level docs (`docs/*.md`, `README.md`, guides)
- **`docs-features`**: Feature specs (`docs/features/*.md`)
- **`docs-file-map`**: Codebase map docs (`docs/file-map/*.md`)
- **`config-and-scripts`**: Build/tooling configs (`vite.config.ts`, `tsconfig*.json`, `package.json`, `capacitor.config.json`) and `scripts/*`
- **`app-core-and-pages`**: `src/main.tsx`, `src/App.tsx`, `src/pages/*.tsx`
- **`app-components`**: `src/components/**/*.tsx` and `src/components/**/*.ts`
- **`app-sheets`**: `src/sheets/*.tsx`
- **`app-lib`**: `src/lib/*.ts` and `src/lib/*.tsx`
- **`app-styles-and-brand`**: `src/index.css`, `src/styles/*.css`, `src/brand/*`
- **`android-native`**: Native Android Java, Manifest, Gradle, and XML layouts/resources under `android/`

Do **not** add generated outputs (`dist/`, `node_modules/`), lockfiles (`package-lock.json`), binary assets (`.png`, `.svg`, `.jar`, `.zip`), or boilerplate Gradle wrappers.

## 2. When the User Asks to Export / Refresh Context Files

Run:

```powershell
npm run export:context
```

(or `node scripts/export-context.mjs`).

This automatically:
1. Deletes all old files in `export-txt/`.
2. Generates fresh `<category>.txt` (or `<category>-partN.txt`) files, each strictly under 250 KB.
3. Writes `export-txt/README.md` documenting what each `.txt` file contains and which original files are inside it.
4. Warns if any file under `docs/`, `src/`, `scripts/`, or `android/app/src/main/java/` is uncategorized — if any warnings appear for relevant new files, add them to `scripts/export-context.mjs` and re-run.
