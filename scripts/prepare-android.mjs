/*
 * Builds the web app for the Android shell and copies it into the native project:
 *
 *   node scripts/prepare-android.mjs      (npm run android:prepare)
 *
 * 1. checks that capacitor.config.json describes a self-contained release (files from the APK,
 *    no live-reload server),
 * 2. type-checks and builds with `--mode android` (no offline worker: the APK serves its files),
 * 3. runs `cap sync android` (web files + plugin list into android/),
 * 4. verifies what was synced.
 *
 * Then open android/ in Android Studio, or run Gradle. See docs/prepare-apps.md.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Use Node.js 22 or newer.');
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

const config = JSON.parse(await readFile('capacitor.config.json', 'utf8'));
if (config.webDir !== 'dist' || config.server?.url || config.server?.allowNavigation?.length) {
  throw new Error('A release must load dist from the APK, without a remote or live-reload URL in capacitor.config.json.');
}
if (!existsSync('android')) throw new Error('android/ is missing. Create it once with: npx cap add android');

const bin = (name) => path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);
function run(label, command, args) {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) throw new Error(`${label} failed.`);
}

run('Type check', bin('tsc'), ['-b']);
run('Web build (mode: android)', bin('vite'), ['build', '--mode', 'android']);
if (existsSync('dist/offline-worker.js')) throw new Error('The offline worker must not be part of the Android build.');
// The project archive (public/downloads/) and the brand sheet (public/brand/) are website files;
// they do not belong in the APK.
await rm('dist/downloads', { recursive: true, force: true });
await rm('dist/brand', { recursive: true, force: true });
run('Capacitor sync', bin('cap'), ['sync', 'android']);

const assets = 'android/app/src/main/assets/';
const html = await readFile('dist/index.html', 'utf8');
if ((await readFile(`${assets}public/index.html`, 'utf8')) !== html) throw new Error('The synced web bundle does not match dist/.');
const plugins = JSON.parse(await readFile(`${assets}capacitor.plugins.json`, 'utf8')).map((plugin) => plugin.pkg);
for (const needed of ['@capacitor/app', '@capacitor/filesystem', '@capacitor/local-notifications', '@capacitor/share']) {
  if (!plugins.includes(needed)) throw new Error(`Android plugin missing: ${needed}. Run npm ci and try again.`);
}

// Native pieces the web side counts on (docs/android.md).
for (const needed of [
  'android/app/src/main/res/drawable-xxhdpi/ic_stat_koink.png', // notification icon, found by name
  'android/app/src/main/res/drawable/splash_blank.xml', // the launch screen shows a colour only
  'android/app/src/main/java/com/koink/app/KoinkDevicePlugin.java', // setLaunchBackground
]) {
  if (!existsSync(needed)) throw new Error(`${needed} is missing. Run npm run brand, or see docs/android.md.`);
}
// One launch-screen style per app background, or the launch screen cannot follow the theme.
run('Launch-screen styles', process.execPath, ['scripts/generate-splash-themes.mjs', '--check']);

console.log(`\nAndroid assets ready (${config.appName}, ${config.appId}). index.html SHA-256: ${createHash('sha256').update(html).digest('hex').slice(0, 16)}`);
console.log('Next: npm run android:open (Android Studio), or see docs/prepare-apps.md for the command line.');
