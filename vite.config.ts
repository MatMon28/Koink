import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Writes dist/offline-worker.js from scripts/offline-worker.template.js once the bundle is on disk:
 * the list of files to precache and a build id (a hash of those files) are filled in, so each build
 * gets its own cache. Skipped for `--mode android`: the APK serves its files itself. See docs/pwa.md.
 */
function offlineWorker(): Plugin {
  const WORKER = 'offline-worker.js'
  let root = process.cwd()
  let outDir = 'dist'
  let skip = false

  const walk = (dir: string, base = ''): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const rel = base ? `${base}/${entry.name}` : entry.name
      return entry.isDirectory() ? walk(path.join(dir, entry.name), rel) : [rel]
    })

  return {
    name: 'koink-offline-worker',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = path.resolve(config.root, config.build.outDir)
      skip = config.mode === 'android'
    },
    closeBundle() {
      if (skip) return
      let files: string[]
      try {
        files = walk(outDir)
          // downloads/ (project archive) and brand/ (brand sheet) are fetched on request, never precached
          .filter((file) => file !== WORKER && file !== 'index.html' && !file.endsWith('.map') && !file.startsWith('downloads/') && !file.startsWith('brand/'))
          .sort()
      } catch {
        return // the build failed before anything was written
      }
      const hash = createHash('sha256')
      for (const file of ['index.html', ...files]) {
        hash.update(file)
        hash.update(readFileSync(path.join(outDir, file)))
      }
      const template = readFileSync(path.join(root, 'scripts/offline-worker.template.js'), 'utf8')
      const worker = template
        .replace("'__BUILD_ID__'", JSON.stringify(hash.digest('hex').slice(0, 12)))
        .replace("['__PRECACHE__']", JSON.stringify(files))
      if (worker.includes('__BUILD_ID__') || worker.includes('__PRECACHE__')) {
        throw new Error('offline-worker.template.js: build tokens were not replaced')
      }
      writeFileSync(path.join(outDir, WORKER), worker)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [react(), tailwindcss(), offlineWorker()];
  try {
    // @ts-ignore
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch {}

  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_']);
  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: processEnvDefines,
  };
})
