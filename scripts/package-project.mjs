/*
 * Packs the whole project into one archive, so it can be downloaded from the running app:
 *
 *   node scripts/package-project.mjs      (npm run package)
 *   -> public/downloads/koink-project.zip
 *
 * In the archive: the source, the Android project, the PWA files, the scripts and the documentation,
 * under a top-level `koink/` folder. Left out: everything that is installed or generated again
 * (node_modules, dist, the web files `cap sync` copies into android/) and the archive itself.
 *
 * The zip is written here with Node's own zlib, so no extra tool or package is needed. Run this
 * before `npm run build` whenever the download should match the current files.
 * See docs/prepare-apps.md.
 */
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const OUT = 'public/downloads/koink-project.zip';
const TOP = 'koink/';

/** Folder and file names skipped wherever they appear. */
const SKIP_NAMES = new Set(['node_modules', 'dist', '.git', '.gradle', '.idea', '.shots', '.agon-env', '.agon-writes', '.DS_Store', 'local.properties', 'uploads', 'export-txt']);
/** Paths (from the project root) skipped together with everything below them. */
const SKIP_PATHS = [
  'public/downloads', // the archive must not contain itself
  '.vite-source-tags.js', // preview-tool helper, optional for the build
  // Written again by `npm run android:prepare` (the same list as android/.gitignore):
  'android/build',
  'android/app/build',
  'android/capacitor-cordova-android-plugins',
  'android/app/src/main/assets/public',
  'android/app/src/main/assets/capacitor.config.json',
  'android/app/src/main/assets/capacitor.plugins.json',
  'android/app/src/main/res/xml/config.xml',
];

async function walk(dir = '') {
  const files = [];
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (SKIP_NAMES.has(entry.name) || SKIP_PATHS.includes(rel)) continue;
    if (entry.isDirectory()) files.push(...(await walk(rel)));
    else if (entry.isFile()) files.push(rel);
  }
  return files;
}

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** MS-DOS time and date, the format a zip stores. */
function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return [time, day];
}

const files = (await walk()).sort();
if (!files.includes('package.json') || !files.includes('android/app/build.gradle') || !files.includes('docs/README.md')) {
  throw new Error('The project looks incomplete: package.json, android/ or docs/ is missing.');
}

const locals = [];
const central = [];
let offset = 0;
for (const file of files) {
  const data = await readFile(path.join(root, file));
  const info = await stat(path.join(root, file));
  const name = Buffer.from(TOP + file, 'utf8');
  const deflated = deflateRawSync(data, { level: 9 });
  const stored = deflated.length >= data.length; // already-compressed files (PNG, jar) are kept as they are
  const body = stored ? data : deflated;
  const [time, day] = dosDateTime(info.mtime);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(stored ? 0 : 8, 8);
  local.writeUInt16LE(time, 10);
  local.writeUInt16LE(day, 12);
  local.writeUInt32LE(crc32(data), 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(name.length, 26);
  locals.push(local, name, body);

  const entry = Buffer.alloc(46);
  entry.writeUInt32LE(0x02014b50, 0);
  entry.writeUInt16LE((3 << 8) | 20, 4); // made on Unix: the file mode below is kept (gradlew stays executable)
  local.copy(entry, 6, 4, 30); // version needed ... name length, extra length
  entry.writeUInt32LE((((info.mode & 0o777) | 0o100000) << 16) >>> 0, 38);
  entry.writeUInt32LE(offset, 42);
  central.push(entry, name);

  offset += local.length + name.length + body.length;
}

const directory = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(directory.length, 12);
end.writeUInt32LE(offset, 16);

const zip = Buffer.concat([...locals, directory, end]);
await mkdir(path.join(root, path.dirname(OUT)), { recursive: true });
await writeFile(path.join(root, OUT), zip);

const count = (prefix) => files.filter((file) => file.startsWith(prefix)).length;
console.log(`${OUT}: ${files.length} files, ${(zip.length / 1024).toFixed(0)} kB`);
console.log(`  src ${count('src/')} | android ${count('android/')} | docs ${count('docs/')} | public ${count('public/')} | scripts ${count('scripts/')}`);
