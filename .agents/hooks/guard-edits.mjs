import fs from 'node:fs';
import path from 'node:path';

const raw = fs.readFileSync(0, 'utf8').trim();
const payload = raw ? JSON.parse(raw) : {};
const args = payload?.toolCall?.args || {};
const editedPath = String(args.Path || args.path || '').replace(/\\/g, '/');
const repoRoot =
  payload?.cwd ||
  path.resolve(
    path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
    '../..'
  );

function checkIndexCssOrder(filePath) {
  if (!fs.existsSync(filePath)) return;
  const css = fs.readFileSync(filePath, 'utf8');
  const imports = [...css.matchAll(/@import\s+"([^"]+)";/g)].map((m) => m[1]);
  if (imports[0] !== 'tailwindcss') {
    console.error('CSS @import order violation in src/index.css: First @import must be "tailwindcss".');
    process.exit(1);
  }
  if (/font-family\s*:/.test(css.replace(/@font-face\s*\{[^}]*\}/g, '').replace(/@theme\s*\{[^}]*\}/g, ''))) {
    // Allow font-family inside @font-face/@theme and [data-style="angular"] rules, flag elsewhere only if unexpected.
  }
}

const RAW_PALETTE_RE =
  /\b(?:bg|text|border)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;
const ARBITRARY_HEX_RE = /\b(?:bg|text|border)-\[#[0-9a-fA-F]{3,8}\]/g;
const MOTION_UNSAFE_RE = /\b(?<!motion-safe:)animate-(?:pulse|bounce)\b/g;

function checkComponentTokens(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(repoRoot, filePath);

  const paletteMatches = [...new Set(content.match(RAW_PALETTE_RE) ?? [])];
  if (paletteMatches.length > 0) {
    console.error(
      `Raw Tailwind palette colour class(es) in ${rel}: ${paletteMatches.join(', ')}\n` +
        `Use .kc-themed-card, @theme utilities (bg-intake, text-activity-ink, etc.), and Koink CSS tokens instead.`
    );
    process.exit(1);
  }

  const hexMatches = [...new Set(content.match(ARBITRARY_HEX_RE) ?? [])];
  if (hexMatches.length > 0) {
    console.error(
      `Arbitrary hex colour class(es) in ${rel}: ${hexMatches.join(', ')}\n` +
        `Use @theme semantic utilities and CSS variables from src/index.css instead.`
    );
    process.exit(1);
  }

  if (/bg-\[var\(--text\)\]/.test(content) && /text-\[var\(--surface\)\]/.test(content)) {
    console.error(
      `Found bg-[var(--text)] with text-[var(--surface)] in ${rel}: use text-[var(--on-text)] instead.`
    );
    process.exit(1);
  }

  if (/font-family\s*:/.test(content) || /\bfont-\[/.test(content)) {
    console.error(
      `Hardcoded font-family in ${rel}: inherit Koink's theme font-family.`
    );
    process.exit(1);
  }

  const unsafeMotion = [...new Set(content.match(MOTION_UNSAFE_RE) ?? [])];
  if (unsafeMotion.length > 0) {
    console.error(
      `Use motion-safe:${unsafeMotion[0]} in ${rel} so prefers-reduced-motion is respected.`
    );
    process.exit(1);
  }
}

try {
  if (editedPath.endsWith('/src/index.css') || editedPath === 'src/index.css') {
    checkIndexCssOrder(path.resolve(repoRoot, 'src/index.css'));
  } else if (/(?:^|\/)src\/(?:components|pages|sheets)\/.*\.(?:tsx|ts)$/.test(editedPath)) {
    const resolved = path.isAbsolute(editedPath) ? editedPath : path.resolve(repoRoot, editedPath);
    checkComponentTokens(resolved);
  }
  process.stdout.write('{}\n');
} catch (err) {
  const msg = err?.stderr?.toString() || err?.message || String(err);
  console.error(msg);
  process.exit(1);
}
