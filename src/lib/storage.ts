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

/**
 * When the user last saved a backup file from this device (epoch milliseconds, as text). It lives under
 * its own key, outside the journal, so restoring or erasing the journal never rewrites it.
 */
export const LAST_BACKUP_KEY = 'koink_last_backup';

const backupListeners = new Set<() => void>();

/** Epoch ms of the last saved backup, or 0 when none was saved here. */
export function readLastBackup(): number {
  try {
    const value = Number(localStorage.getItem(LAST_BACKUP_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function recordBackup(at = Date.now()): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(at));
  } catch {
    /* storage full or blocked: the date is just not remembered */
  }
  backupListeners.forEach((listener) => listener());
}

/** For `useSyncExternalStore`. */
export function subscribeLastBackup(listener: () => void): () => void {
  backupListeners.add(listener);
  return () => backupListeners.delete(listener);
}

/**
 * Whether the journal could be written to this device the last time we tried. Kept outside React (a tiny
 * external store read with `useSyncExternalStore`): the write happens in an effect, and its outcome must be
 * shown without re-rendering the pages. Shown by StorageBanner and Settings > Your data.
 */
export interface SaveState {
  /** False when the last write failed: what is on screen is not on the device. */
  ok: boolean;
  /** Epoch ms of the last successful write, or 0 if none happened in this visit. */
  savedAt: number;
  /** Why the last write failed: the storage is full, or it is blocked / unavailable. */
  reason: 'full' | 'blocked' | null;
}

let saveState: SaveState = { ok: true, savedAt: 0, reason: null };
const saveListeners = new Set<() => void>();

export const getSaveState = (): SaveState => saveState;

export function subscribeSaveState(listener: () => void): () => void {
  saveListeners.add(listener);
  return () => saveListeners.delete(listener);
}

function setSaveState(next: SaveState): void {
  saveState = next;
  saveListeners.forEach((listener) => listener());
}

/** Writes the journal text; never throws. The outcome lands in `getSaveState()`. Returns whether it worked. */
export function writeJournal(json: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, json);
    setSaveState({ ok: true, savedAt: Date.now(), reason: null });
    return true;
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    const reason = name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' ? 'full' : 'blocked';
    // Keep the same object while nothing changed, so a failing write does not wake every listener again.
    if (saveState.ok || saveState.reason !== reason) setSaveState({ ok: false, savedAt: saveState.savedAt, reason });
    return false;
  }
}
