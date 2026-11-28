/*
 * Exports curated, understanding-critical app code, docs, config, scripts, and
 * native Android sources into aggregated .txt files under `export-txt/`.
 *
 *   node scripts/export-context.mjs      (npm run export:context)
 *
 * Behavior:
 * - Deletes all existing files in `export-txt/` on every run before regenerating.
 * - Groups files by category so output filenames reflect the type of info they contain.
 * - Splits any category that would exceed MAX_BYTES (240 KiB, strictly under 250 KB)
 *   into numbered part files (`<category>-part1.txt`, `<category>-part2.txt`, ...).
 * - Writes `export-txt/README.md` explaining what each generated file contains and
 *   where every original file is located.
 *
 * Maintenance:
 * - Whenever a new file useful for deeply understanding the app is created, add its
 *   repo-relative path to the appropriate category in `CATEGORIES` below.
 */
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const OUT_DIR = path.join(root, 'export-txt');
const MAX_BYTES = 240 * 1024; // 245,760 bytes — strictly under both 250,000 B and 250 KiB

/**
 * Curated categories of files useful for a deep understanding of Koink.
 * Excluded by design: node_modules, dist, build artifacts, lockfiles (package-lock.json),
 * binary/media assets (PNG, SVG, JAR, ZIP), Gradle wrapper scripts, and template tests.
 */
export const CATEGORIES = [
  {
    name: 'docs-overview-and-architecture',
    description:
      'High-level project overview, architecture, data model, design system, UI/UX guidelines, brand, motion, gestures, PWA, Android, and verification docs.',
    files: [
      'README.md',
      'guide to UI UX fixes.md',
      'docs/README.md',
      'docs/architecture.md',
      'docs/data-model.md',
      'docs/design-system.md',
      'docs/brand.md',
      'docs/motion.md',
      'docs/gestures.md',
      'docs/launch-intro.md',
      'docs/notifications.md',
      'docs/pwa.md',
      'docs/pwa-setup.md',
      'docs/android.md',
      'docs/apk-download.md',
      'docs/prepare-apps.md',
      'docs/web-preview.md',
      'docs/verification.md',
      'docs/known-gaps.md',
      'docs/changes-patch.md',
    ],
  },
  {
    name: 'docs-features',
    description:
      'Detailed feature specifications (accounts, backup, basic mode, budgets, categories, currencies, entries, excel export, gift cards, language, month, profile, recurring, savings goals, settings, statistics, themes, transactions, ultra-minimal, widgets).',
    files: [
      'docs/features/accounts.md',
      'docs/features/backup.md',
      'docs/features/basic-mode.md',
      'docs/features/budgets.md',
      'docs/features/categories.md',
      'docs/features/currencies.md',
      'docs/features/entries.md',
      'docs/features/excel-export.md',
      'docs/features/gift-cards.md',
      'docs/features/language.md',
      'docs/features/month.md',
      'docs/features/profile.md',
      'docs/features/recurring.md',
      'docs/features/savings-goals.md',
      'docs/features/settings.md',
      'docs/features/statistics.md',
      'docs/features/themes.md',
      'docs/features/transactions.md',
      'docs/features/ultra-minimal.md',
      'docs/features/widgets.md',
    ],
  },
  {
    name: 'docs-file-map',
    description:
      'Codebase file-map documentation explaining responsibilities and relationships across app shell, pages, components, sheets, lib, Android native, and config/scripts.',
    files: [
      'docs/file-map/README.md',
      'docs/file-map/app-shell.md',
      'docs/file-map/pages.md',
      'docs/file-map/components.md',
      'docs/file-map/sheets.md',
      'docs/file-map/lib.md',
      'docs/file-map/android-native.md',
      'docs/file-map/config-scripts-public.md',
    ],
  },
  {
    name: 'config-and-scripts',
    description:
      'Build, TypeScript, Vite, ESLint, Capacitor, PWA service worker/manifest, GitHub Pages workflow, and Node utility scripts.',
    files: [
      'package.json',
      'tsconfig.json',
      'tsconfig.app.json',
      'tsconfig.node.json',
      'vite.config.ts',
      'eslint.config.js',
      'capacitor.config.json',
      'index.html',
      '.github/workflows/pages.yml',
      'public/manifest.webmanifest',
      'public/offline-worker.js',
      'public/_headers',
      'scripts/generate-splash-themes.mjs',
      'scripts/offline-worker.template.js',
      'scripts/package-project.mjs',
      'scripts/prepare-android.mjs',
      'scripts/render-brand.mjs',
      'scripts/export-context.mjs',
    ],
  },
  {
    name: 'app-core-and-pages',
    description:
      'React entrypoints (`main.tsx`, `App.tsx`) and top-level page views (`MonthView`, `TransactionsView`, `BudgetsView`, `StatsView`).',
    files: [
      'src/main.tsx',
      'src/App.tsx',
      'src/pages/MonthView.tsx',
      'src/pages/TransactionsView.tsx',
      'src/pages/BudgetsView.tsx',
      'src/pages/StatsView.tsx',
    ],
  },
  {
    name: 'app-components',
    description:
      'Reusable UI components, charts, navigation, cards, install/tour components, and shared UI primitives under `src/components/`.',
    files: [
      'src/components/ActionDock.tsx',
      'src/components/Brand.tsx',
      'src/components/ChartLargeView.tsx',
      'src/components/ChartPlot.tsx',
      'src/components/ChartPopup.tsx',
      'src/components/DataStatus.tsx',
      'src/components/ExpenseChart.tsx',
      'src/components/Header.tsx',
      'src/components/InstallApp.tsx',
      'src/components/InstallGuide.tsx',
      'src/components/Modal.tsx',
      'src/components/ModeChooser.tsx',
      'src/components/MonthNavigator.tsx',
      'src/components/PageSwiper.tsx',
      'src/components/PersonalInflation.tsx',
      'src/components/ProjectDownload.tsx',
      'src/components/RecurringRow.tsx',
      'src/components/RotateScreenIcon.tsx',
      'src/components/StorageBanner.tsx',
      'src/components/Tabs.tsx',
      'src/components/WidgetButtons.tsx',
      'src/components/WidgetStrip.tsx',
      'src/components/cards.tsx',
      'src/components/ui.tsx',
      'src/components/tour/AppTour.tsx',
      'src/components/tour/NotificationShowcase.tsx',
      'src/components/tour/WidgetGallery.tsx',
      'src/components/tour/tourContent.ts',
    ],
  },
  {
    name: 'app-sheets',
    description:
      'Modal bottom sheets and dialogs under `src/sheets/` for transactions, budgets, categories, accounts, gift cards, profile, settings, and restore.',
    files: [
      'src/sheets/AccountSheet.tsx',
      'src/sheets/BudgetSheets.tsx',
      'src/sheets/CategoriesSheet.tsx',
      'src/sheets/EditSheets.tsx',
      'src/sheets/GiftCardPickerSheet.tsx',
      'src/sheets/GiftCardSheet.tsx',
      'src/sheets/NotificationSettings.tsx',
      'src/sheets/ProfileAccounts.tsx',
      'src/sheets/ProfileSheet.tsx',
      'src/sheets/QuickSheet.tsx',
      'src/sheets/RestoreDialog.tsx',
      'src/sheets/SettingsSheet.tsx',
      'src/sheets/TitleField.tsx',
      'src/sheets/TxSheet.tsx',
      'src/sheets/WidgetsSettings.tsx',
      'src/sheets/shared.tsx',
    ],
  },
  {
    name: 'app-lib',
    description:
      'State store, domain types, calculations, storage, i18n, themes, notifications, widgets bridge, Excel export, and hooks under `src/lib/`.',
    files: [
      'src/lib/types.ts',
      'src/lib/store.tsx',
      'src/lib/storage.ts',
      'src/lib/usePersistentState.ts',
      'src/lib/useBackup.ts',
      'src/lib/calc.ts',
      'src/lib/categories.ts',
      'src/lib/dates.ts',
      'src/lib/format.ts',
      'src/lib/demo.ts',
      'src/lib/excel.ts',
      'src/lib/expenseSeries.ts',
      'src/lib/chartTurn.ts',
      'src/lib/giftcards.ts',
      'src/lib/inflation.ts',
      'src/lib/journal.ts',
      'src/lib/mode.ts',
      'src/lib/themes.ts',
      'src/lib/icons.ts',
      'src/lib/i18n.ts',
      'src/lib/i18n.it.ts',
      'src/lib/notifications.ts',
      'src/lib/reminders.ts',
      'src/lib/useReminders.ts',
      'src/lib/widgets.ts',
      'src/lib/widgetBridge.ts',
      'src/lib/useWidgets.ts',
      'src/lib/platform.ts',
      'src/lib/pwa.ts',
      'src/lib/back.ts',
      'src/lib/dock.ts',
      'src/lib/tabs.ts',
      'src/lib/pillTab.ts',
      'src/lib/scrollFade.ts',
      'src/lib/spring.ts',
      'src/lib/velocity.ts',
      'src/lib/idle.ts',
      'src/lib/interrupt.ts',
      'src/lib/intro.ts',
      'src/lib/earlyStart.ts',
      'src/lib/pig.ts',
      'src/lib/usePresence.ts',
    ],
  },
  {
    name: 'app-styles-and-brand',
    description:
      'Global CSS, theme presets, intro animations, and programmatic brand SVG/artwork definitions.',
    files: [
      'src/index.css',
      'src/styles/intro.css',
      'src/styles/presets.css',
      'src/brand/art.js',
    ],
  },
  {
    name: 'android-native',
    description:
      'Native Android Capacitor shell, Java plugins/widgets, AndroidManifest, Gradle configs, and XML layouts/resources.',
    files: [
      'android/build.gradle',
      'android/settings.gradle',
      'android/variables.gradle',
      'android/gradle.properties',
      'android/capacitor.settings.gradle',
      'android/app/build.gradle',
      'android/app/capacitor.build.gradle',
      'android/app/proguard-rules.pro',
      'android/app/src/main/AndroidManifest.xml',
      'android/app/src/main/java/com/koink/app/MainActivity.java',
      'android/app/src/main/java/com/koink/app/LaunchBackground.java',
      'android/app/src/main/java/com/koink/app/KoinkDevicePlugin.java',
      'android/app/src/main/java/com/koink/app/KoinkWidgetConfigActivity.java',
      'android/app/src/main/java/com/koink/app/KoinkWidgetProvider.java',
      'android/app/src/main/res/layout/activity_main.xml',
      'android/app/src/main/res/layout/widget_button.xml',
      'android/app/src/main/res/layout/widget_button_single.xml',
      'android/app/src/main/res/layout/widget_buttons.xml',
      'android/app/src/main/res/layout/widget_row.xml',
      'android/app/src/main/res/layout/widget_spacer.xml',
      'android/app/src/main/res/values/colors.xml',
      'android/app/src/main/res/values/ic_launcher_background.xml',
      'android/app/src/main/res/values/splash_themes.xml',
      'android/app/src/main/res/values/strings.xml',
      'android/app/src/main/res/values/styles.xml',
      'android/app/src/main/res/xml/file_paths.xml',
      'android/app/src/main/res/xml/widget_categories_info.xml',
      'android/app/src/main/res/xml/widget_multi_info.xml',
      'android/app/src/main/res/xml/widget_single_info.xml',
      'android/app/src/main/res/raw/keep.xml',
    ],
  },
];

/**
 * Formats a file into a delimited block, splitting by lines if a single file
 * would exceed `maxBodyBytes` on its own.
 */
function formatFileChunks(relPath, content, maxBodyBytes) {
  const normalized = content.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const totalLines = lines.length;

  const fullBlock = `===== FILE: ${relPath} (lines 1-${totalLines}) =====\n${normalized}\n===== END FILE: ${relPath} =====\n\n`;
  if (Buffer.byteLength(fullBlock, 'utf8') <= maxBodyBytes) {
    return [{ relPath, startLine: 1, endLine: totalLines, text: fullBlock }];
  }

  // Fallback for an unusually large single source file: split cleanly on line boundaries.
  const chunks = [];
  let startIdx = 0;
  while (startIdx < lines.length) {
    let endIdx = startIdx;
    let body = '';
    while (endIdx < lines.length) {
      const candidateLine = (endIdx > startIdx ? '\n' : '') + lines[endIdx];
      const header = `===== FILE: ${relPath} (lines ${startIdx + 1}-${endIdx + 1} of ${totalLines}) =====\n`;
      const footer = `\n===== END FILE PART: ${relPath} =====\n\n`;
      if (
        endIdx > startIdx &&
        Buffer.byteLength(header + body + candidateLine + footer, 'utf8') > maxBodyBytes
      ) {
        break;
      }
      body += candidateLine;
      endIdx += 1;
    }
    const header = `===== FILE: ${relPath} (lines ${startIdx + 1}-${endIdx} of ${totalLines}) =====\n`;
    const footer = `\n===== END FILE PART: ${relPath} =====\n\n`;
    chunks.push({
      relPath,
      startLine: startIdx + 1,
      endLine: endIdx,
      text: header + body + footer,
    });
    startIdx = endIdx;
  }
  return chunks;
}

/**
 * Packs a category's files into one or more .txt buffers, each <= MAX_BYTES.
 */
async function buildCategoryOutputs(category) {
  const chunks = [];
  const missing = [];

  for (const relPath of category.files) {
    const absPath = path.join(root, relPath);
    let raw;
    try {
      raw = await readFile(absPath, 'utf8');
    } catch {
      missing.push(relPath);
      continue;
    }
    // Reserve ~512 bytes for the part header.
    chunks.push(...formatFileChunks(relPath, raw, MAX_BYTES - 512));
  }

  if (missing.length > 0) {
    console.warn(`[warn] Missing files in category "${category.name}": ${missing.join(', ')}`);
  }

  // Group chunks greedily into parts <= MAX_BYTES.
  const parts = [];
  let currentChunks = [];
  let currentBytes = 0;
  const headerReserve = 512;

  for (const chunk of chunks) {
    const chunkBytes = Buffer.byteLength(chunk.text, 'utf8');
    if (currentChunks.length > 0 && headerReserve + currentBytes + chunkBytes > MAX_BYTES) {
      parts.push(currentChunks);
      currentChunks = [];
      currentBytes = 0;
    }
    currentChunks.push(chunk);
    currentBytes += chunkBytes;
  }
  if (currentChunks.length > 0) {
    parts.push(currentChunks);
  }

  const totalParts = parts.length;
  const outputs = [];

  for (let i = 0; i < totalParts; i += 1) {
    const partChunks = parts[i];
    const filename =
      totalParts === 1 ? `${category.name}.txt` : `${category.name}-part${i + 1}.txt`;
    const partLabel = totalParts === 1 ? '1/1' : `${i + 1}/${totalParts}`;
    const includedFiles = [...new Set(partChunks.map((c) => c.relPath))];
    const banner = [
      `# Category: ${category.name} (part ${partLabel})`,
      `# Description: ${category.description}`,
      `# Included files (${includedFiles.length}): ${includedFiles.join(', ')}`,
      '',
      '',
    ].join('\n');

    const content = banner + partChunks.map((c) => c.text).join('');
    const byteSize = Buffer.byteLength(content, 'utf8');
    if (byteSize > MAX_BYTES) {
      throw new Error(`Output ${filename} exceeded MAX_BYTES (${byteSize} > ${MAX_BYTES})`);
    }
    outputs.push({
      filename,
      content,
      byteSize,
      files: includedFiles,
    });
  }

  return outputs;
}

/**
 * Checks for newly added source/doc files in key directories that are not yet
 * registered in CATEGORIES, so nothing useful is silently left out.
 */
async function findUncategorizedFiles() {
  const registered = new Set(CATEGORIES.flatMap((c) => c.files));
  const watchRoots = ['docs', 'src', 'scripts', 'android/app/src/main/java'];
  const textExt = /\.(md|ts|tsx|js|mjs|css|java|xml|json)$/i;
  const uncategorized = [];

  async function scan(relDir) {
    let entries;
    try {
      entries = await readdir(path.join(root, relDir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = `${relDir}/${entry.name}`;
      if (entry.isDirectory()) {
        await scan(rel);
      } else if (entry.isFile() && textExt.test(entry.name) && !registered.has(rel)) {
        uncategorized.push(rel);
      }
    }
  }

  for (const dir of watchRoots) {
    await scan(dir);
  }
  return uncategorized.sort();
}

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  // 1. Delete all old files and recreate output directory cleanly.
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const manifest = [];

  // 2. Build and write each category's .txt file(s).
  for (const category of CATEGORIES) {
    const outputs = await buildCategoryOutputs(category);
    for (const out of outputs) {
      await writeFile(path.join(OUT_DIR, out.filename), out.content, 'utf8');
      manifest.push({
        category: category.name,
        description: category.description,
        filename: out.filename,
        byteSize: out.byteSize,
        files: out.files,
      });
    }
  }

  // 3. Write export-txt/README.md explaining where each type of file is found.
  const readmeLines = [
    '# Koink Context Export',
    '',
    'This folder contains aggregated `.txt` snapshots of Koink’s source code, documentation, configuration, build scripts, and native Android layer for deep architectural understanding by an AI agent.',
    '',
    `- **Generated at:** ${new Date().toISOString()}`,
    `- **Per-file size limit:** ${formatKB(MAX_BYTES)} (${MAX_BYTES.toLocaleString('en-US')} bytes, strictly under 250 KB)`,
    `- **Total exported files:** ${manifest.length} \`.txt\` files`,
    '',
    '## File Index by Type',
    '',
    '| Exported File | Category | Size | What It Contains |',
    '| :--- | :--- | ---: | :--- |',
    ...manifest.map(
      (m) =>
        `| \`${m.filename}\` | \`${m.category}\` | ${formatKB(m.byteSize)} | ${m.description} |`
    ),
    '',
    '## Original Files Included in Each Export',
    '',
  ];

  for (const m of manifest) {
    readmeLines.push(`### \`${m.filename}\` (${formatKB(m.byteSize)})`);
    readmeLines.push('');
    for (const f of m.files) {
      readmeLines.push(`- \`${f}\``);
    }
    readmeLines.push('');
  }

  readmeLines.push('## Intentionally Excluded');
  readmeLines.push('');
  readmeLines.push(
    '- `node_modules/`, `dist/`, `android/build/`, `android/app/build/` (dependencies and generated build outputs)'
  );
  readmeLines.push('- `package-lock.json` (lockfile noise)');
  readmeLines.push(
    '- Binary and media assets (`public/icons/`, `public/brand/`, `public/downloads/`, `uploads/`, Android `mipmap-*` / `drawable*/*.png`, `gradle-wrapper.jar`)'
  );
  readmeLines.push('- Boilerplate Gradle wrappers (`gradlew*`) and default Capacitor template tests');
  readmeLines.push('');

  const readmeContent = readmeLines.join('\n');
  await writeFile(path.join(OUT_DIR, 'README.md'), readmeContent, 'utf8');

  const uncategorized = await findUncategorizedFiles();
  console.log(`Exported ${manifest.length} .txt files + README.md to export-txt/`);
  for (const m of manifest) {
    const info = await stat(path.join(OUT_DIR, m.filename));
    console.log(`  - ${m.filename.padEnd(42)} ${formatKB(info.size).padStart(9)} (${m.files.length} files)`);
  }
  if (uncategorized.length > 0) {
    console.warn('\n[warn] Uncategorized files found (consider adding to scripts/export-context.mjs):');
    for (const f of uncategorized) console.warn(`  - ${f}`);
  }
}

await main();
