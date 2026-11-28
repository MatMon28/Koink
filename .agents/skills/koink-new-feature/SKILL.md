---
name: koink-new-feature
description: >-
  Use when implementing a new Koink feature, sheet, modal, or page in source
  code to ensure storage/backup, themes, Ultra minimal, i18n, and docs stay
  consistent.
---

# Koink New Feature Checklist

Route first via `docs/README.md` and `docs/file-map/README.md` (open only the matching doc and area file), then verify each item below:

1. **Persistence & backup:** If adding a stored key or field on `AppData`, update `src/lib/types.ts`, `src/lib/storage.ts`, and `src/lib/store.tsx`, and keep backup export/import compatible (`docs/data-model.md`, `docs/features/backup.md`).
2. **Themes & styles parity (all 7 styles × 3 modes + Ultra minimal):**
   - Neutral cards/surfaces: use `.kc-themed-card` and tokens (`--bg`, `--surface`, `--inset`, `--border`, `--hover`, `--text`, `--muted`, `--on-text`).
   - Semantic accents & borrowed hooks: reuse existing hooks per `docs/design-system.md#the-borrowed-names` (`.kc-hero-intake`, `.kc-hero-burned`, `[data-tracker]`, `[data-meal-slot]`, `[data-nutrient="fiber"]`, `.kc-water-track`, `.kc-dock`, `.kc-sticky-footer`, etc.).
   - Controls & UI consistency: follow `guide to UI UX fixes.md#4-rules-for-future-features` and reuse shared primitives from `src/components/ui.tsx` and `src/sheets/shared.tsx`. Add `tabular-nums` on dynamic numbers, and never use raw Tailwind palette/arbitrary hex colour classes (`bg-slate-*`, `bg-[#...]`) or hardcode `font-family`.
   - Ultra minimal (`data-ultra`): tighten padding/gaps and keep accessible labels (`sr-only` / `aria-label` / `title`); see `docs/features/ultra-minimal.md`.
3. **i18n:** Wrap all visible English strings in `t(...)` (`src/lib/i18n.ts`) and add Italian translations in `src/lib/i18n.it.ts`.
4. **Docs, context export & verification:**
   - Update the matching `docs/*.md`, `docs/features/*.md`, and `docs/file-map/*.md` rows, and update `scripts/export-context.mjs` if files were added/renamed/deleted.
   - Verify with `npm run build` and `npx eslint src`, and visually inspect UI changes against `npm run preview` across `classic`, `angular`, `aurora`, `pop`, `playful`, `minimal`, `mono` (in `light`, `lite-dark`, `dark`) plus **Ultra minimal** in EN and IT.
