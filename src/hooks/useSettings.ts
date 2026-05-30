import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Settings } from '../db/types';
import { useActiveProfileId } from '../contexts/ActiveProfileContext';

const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'profileId'> = {
  fiscalYearStart: '04-01',
  defaultGrantDate: '04-01',
};

export function useSettings() {
  const profileId = useActiveProfileId();
  const settings = useLiveQuery(async () => {
    if (profileId === undefined) return undefined;
    const row = await db.settings.where('profileId').equals(profileId).first();
    return row ?? { ...DEFAULT_SETTINGS, profileId };
  }, [profileId]);

  async function updateSettings(
    changes: Partial<Omit<Settings, 'id' | 'profileId'>>,
  ): Promise<void> {
    if (profileId === undefined) throw new Error('アクティブプロフィールがありません');
    const existing = await db.settings.where('profileId').equals(profileId).first();
    if (existing?.id !== undefined) {
      await db.settings.update(existing.id, changes);
    } else {
      await db.settings.add({ ...DEFAULT_SETTINGS, profileId, ...changes });
    }
  }

  return { settings, updateSettings };
}
