import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Grant } from '../db/types';
import { useActiveProfileId } from '../contexts/ActiveProfileContext';

export function useGrants(fiscalYear?: number) {
  const profileId = useActiveProfileId();
  const grants = useLiveQuery(() => {
    if (profileId === undefined) return [];
    if (fiscalYear !== undefined) {
      return db.grants
        .where('profileId')
        .equals(profileId)
        .filter((grant) => grant.fiscalYear === fiscalYear)
        .toArray();
    }
    return db.grants.where('profileId').equals(profileId).toArray();
  }, [profileId, fiscalYear]);

  async function addGrant(grant: Omit<Grant, 'id' | 'profileId'>): Promise<number> {
    if (profileId === undefined) throw new Error('アクティブプロフィールがありません');
    return db.grants.add({ ...grant, profileId });
  }

  async function updateGrant(
    id: number,
    changes: Partial<Grant>,
  ): Promise<void> {
    await db.grants.update(id, changes);
  }

  async function deleteGrant(id: number): Promise<void> {
    await db.usages.where('grantId').equals(id).delete();
    await db.grants.delete(id);
  }

  return { grants, addGrant, updateGrant, deleteGrant };
}
