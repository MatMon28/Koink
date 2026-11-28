---
name: koink-release-docs
description: >-
  Use when finishing a feature round, updating Koink documentation and file maps,
  updating context export, or generating/verifying changes.patch.
---

# Koink Release & Docs Workflow

1. Check `docs/README.md#keeping-the-docs-current` and update only the matching `docs/*.md`, `docs/features/*.md`, and `docs/file-map/*.md` rows for files/features you changed.
2. Keep individual doc files concise (under ~120 lines; split and link if one grows, except `guide to UI UX fixes.md`).
3. If files were added, renamed, or deleted, update `scripts/export-context.mjs` and run `npm run export:context` if requested (`.agents/skills/context-export/SKILL.md`).
4. Run full verification: `npm run build` and `npx eslint src` (plus `npm run android:prepare` if Android/PWA assets changed).
5. Follow `docs/changes-patch.md` when generating or verifying `changes.patch`.
