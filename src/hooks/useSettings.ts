import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Settings } from '../db/types';

const DEFAULT_SETTINGS: Omit<Settings, 'id'> = {
  fiscalYearStart: '04-01',
  defaultGrantDate: '04-01',
  hireDate: '',
};

export function useSettings() {
  const settings = useLiveQuery(async () => {
    const row = await db.settings.toCollection().first();
    return row ?? { ...DEFAULT_SETTINGS };
  });

  async function updateSettings(
    changes: Partial<Omit<Settings, 'id'>>,
  ): Promise<void> {
    const existing = await db.settings.toCollection().first();
    if (existing?.id !== undefined) {
      await db.settings.update(existing.id, changes);
    } else {
      await db.settings.add({ ...DEFAULT_SETTINGS, ...changes });
    }
  }

  return { settings, updateSettings };
}
