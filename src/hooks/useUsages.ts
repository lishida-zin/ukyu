import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Usage } from '../db/types';
import { useActiveProfileId } from '../contexts/ActiveProfileContext';

export function useUsages(grantId?: number) {
  const profileId = useActiveProfileId();
  const usages = useLiveQuery(() => {
    if (profileId === undefined) return [];
    if (grantId !== undefined) {
      return db.usages
        .where('profileId')
        .equals(profileId)
        .filter((usage) => usage.grantId === grantId)
        .toArray();
    }
    return db.usages.where('profileId').equals(profileId).toArray();
  }, [profileId, grantId]);

  async function addUsage(usage: Omit<Usage, 'id' | 'profileId'>): Promise<number> {
    if (profileId === undefined) throw new Error('アクティブプロフィールがありません');
    return db.usages.add({ ...usage, profileId });
  }

  async function updateUsage(
    id: number,
    changes: Partial<Usage>,
  ): Promise<void> {
    await db.usages.update(id, changes);
  }

  async function deleteUsage(id: number): Promise<void> {
    await db.usages.delete(id);
  }

  return { usages, addUsage, updateUsage, deleteUsage };
}
