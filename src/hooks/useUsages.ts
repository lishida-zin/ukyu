import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Usage } from '../db/types';

export function useUsages(grantId?: number) {
  const usages = useLiveQuery(() => {
    if (grantId !== undefined) {
      return db.usages.where('grantId').equals(grantId).toArray();
    }
    return db.usages.toArray();
  }, [grantId]);

  async function addUsage(usage: Omit<Usage, 'id'>): Promise<number> {
    return db.usages.add(usage);
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
