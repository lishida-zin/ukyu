import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Grant } from '../db/types';

export function useGrants(fiscalYear?: number) {
  const grants = useLiveQuery(() => {
    if (fiscalYear !== undefined) {
      return db.grants.where('fiscalYear').equals(fiscalYear).toArray();
    }
    return db.grants.toArray();
  }, [fiscalYear]);

  async function addGrant(grant: Omit<Grant, 'id'>): Promise<number> {
    return db.grants.add(grant);
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
