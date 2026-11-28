# Koink Agent Router

## Start here (never start by reading `README.md`)
1. **Clarify before acting:** If a fix or change request is vague, ambiguous, or missing key details (e.g., which page, theme/mode, or expected behaviour), ask 1–3 concise clarifying questions **before** reading large files or making edits.
2. Open `docs/README.md` (task -> doc) and `docs/file-map/README.md` (feature -> file).
3. Read **only** the single matching doc and single matching area file for your task.

## Do not read unless explicitly asked
- `README.md` (overview / pointer only)
- `export-txt/`, `package-lock.json`, `dist/`

## Token efficiency
- **Grep before reading:** Use `rg -n` to locate symbols first, then read only the needed line range (never whole files unless small).
- **Batch tool calls:** Issue independent `read_file` and `edit_file` calls in parallel; finish all related edits before running verification commands.
- **Offload broad discovery:** Use a `research` subagent for multi-file exploration so raw file reads stay out of the main session context.
- **Skip planning overhead:** Execute directly without Plan Mode for small or clearly scoped tasks.
- **Keep replies concise:** Do not re-summarize diffs or repeat file contents.

## Hard invariants
- **Themes & styles parity:** When adding or editing any UI feature (page, card, field, sheet, badge, tab, or dock item), follow `docs/design-system.md`, `docs/features/themes.md`, `docs/features/ultra-minimal.md`, and `guide to UI UX fixes.md#4-rules-for-future-features`: ensure all 7 styles (`classic`, `angular`, `aurora`, `pop`, `playful`, `minimal`, `mono`), 3 modes (`light`, `lite-dark`, `dark`), and **Ultra minimal** (`data-ultra`) are wired using `.kc-themed-card`, semantic CSS tokens (`--bg`, `--surface`, `--inset`, `--border`, `--hover`, `--text`, `--muted`, `--on-text`), and shared controls from `src/components/ui.tsx` and `src/sheets/shared.tsx`. Never use raw Tailwind palette colour classes (`bg-slate-*`, `text-red-*`, etc.), arbitrary Tailwind hex colour classes (`bg-[#...]`, `text-[#...]`, `border-[#...]`), or hardcode `font-family` in component TSX/CSS — use `@theme` semantic utilities (`bg-intake`, `text-activity-ink`, etc.) and CSS variables from `src/index.css` / `src/styles/presets.css`.
- **CSS order:** Keep `@import "tailwindcss";` first in `src/index.css` and preserve the load order of `src/styles/presets.css` and `src/styles/intro.css`.
- **i18n parity:** Wrap every visible English string in `t(...)` (`src/lib/i18n.ts`) and add its Italian translation in `src/lib/i18n.it.ts`.
- **Context export & docs sync:** Update the matching `docs/*.md`, `docs/features/*.md`, and `docs/file-map/*.md` row in the same change (`docs/README.md#keeping-the-docs-current`), and update `scripts/export-context.mjs` when adding, renaming, or deleting files (see `.agents/skills/context-export/SKILL.md`).

## Verification ladder
1. Iterate with `npm run build` (`tsc -b && vite build`) and `npx eslint src`.
2. Run `npm run android:prepare` when `capacitor.config.json`, `android/`, or web assets affecting Android change (and `npm run android:splash` if `--bg` or Mono palette changes; `npm run brand` if `src/brand/art.js` changes).
3. Verify UI/browser flows against `npm run preview` per `docs/verification.md`.
