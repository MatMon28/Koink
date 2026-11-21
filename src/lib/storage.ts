/** Where the whole journal lives in localStorage. */
export const STORAGE_KEY = 'koink_journal_v1';

/** The app was called Koins before: its keys had this prefix. */
const LEGACY_PREFIX = 'koins_';
const PREFIX = 'koink_';

/**
 * Moves everything stored under the old name to the new keys, once. Called before anything reads
 * storage (lib/earlyStart.ts), so a journal written by a Koins build simply carries on.
 */
export function migrateLegacyStorage(): void {
  try {
    const legacy: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(LEGACY_PREFIX)) legacy.push(key);
    }
    for (const key of legacy) {
      const next = PREFIX + key.slice(LEGACY_PREFIX.length);
      const value = localStorage.getItem(key);
      // Never overwrite something the new name already wrote.
      if (value !== null && localStorage.getItem(next) === null) localStorage.setItem(next, value);
      localStorage.removeItem(key);
    }
  } catch {
    /* storage blocked: nothing to move */
  }
}
