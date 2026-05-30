import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { GrantRule } from '../db/types';
import { useActiveProfileId } from '../contexts/ActiveProfileContext';
import {
  calculateYearsOfService,
  getGrantDaysByRule,
  getDefaultGrantRules,
} from '../logic/grant-rules';

export function useGrantRules() {
  const profileId = useActiveProfileId();
  const rules = useLiveQuery(() => {
    if (profileId === undefined) return [];
    return db.grantRules
      .where('profileId')
      .equals(profileId)
      .sortBy('yearsOfService');
  }, [profileId]);

  async function addRule(rule: Omit<GrantRule, 'id' | 'profileId'>): Promise<number> {
    if (profileId === undefined) throw new Error('アクティブプロフィールがありません');
    return db.grantRules.add({ ...rule, profileId });
  }

  async function updateRule(
    id: number,
    changes: Partial<GrantRule>,
  ): Promise<void> {
    await db.grantRules.update(id, changes);
  }

  async function deleteRule(id: number): Promise<void> {
    await db.grantRules.delete(id);
  }

  async function loadDefaults(): Promise<void> {
    if (profileId === undefined) throw new Error('アクティブプロフィールがありません');
    await db.grantRules.where('profileId').equals(profileId).delete();
    const defaults = getDefaultGrantRules();
    await db.grantRules.bulkAdd(defaults.map((rule) => ({ ...rule, profileId })));
  }

  function getRecommendedDays(hireDate: string, targetDate?: string): number {
    const target = targetDate ?? new Date().toISOString().slice(0, 10);
    const years = calculateYearsOfService(hireDate, target);
    return getGrantDaysByRule(rules ?? [], years);
  }

  return { rules, addRule, updateRule, deleteRule, loadDefaults, getRecommendedDays };
}
