import { useCallback, useSyncExternalStore } from 'react';
import { todayStr } from './dates';
import { t } from './i18n';
import { saveTextFile } from './platform';
import { useApp } from './store';
import { readLastBackup, recordBackup, subscribeLastBackup } from './storage';

/**
 * Saving a backup file, shared by Settings > Your data, the "not saved" banner and the restore preview.
 * `saveBackup` resolves to whether the file was handed over (downloaded, or passed to the share sheet);
 * it also remembers the moment, which Settings shows as "Last backup".
 */
export function useBackup(): { saveBackup: () => Promise<boolean>; lastBackup: number } {
  const { exportData, showToast } = useApp();
  const lastBackup = useSyncExternalStore(subscribeLastBackup, readLastBackup, () => 0);

  const saveBackup = useCallback(async () => {
    try {
      const result = await saveTextFile(`koink_backup_${todayStr()}.json`, exportData());
      if (result === 'cancelled') return false;
      recordBackup();
      showToast(result === 'downloaded' ? t('Backup saved to your downloads') : t('Backup handed to the app you chose'));
      return true;
    } catch {
      showToast(t('The backup could not be saved'));
      return false;
    }
  }, [exportData, showToast]);

  return { saveBackup, lastBackup };
}
