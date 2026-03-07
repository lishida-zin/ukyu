import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { GrantRule } from '../db/types';
import {
  calculateYearsOfService,
  getGrantDaysByRule,
  getDefaultGrantRules,
} from '../logic/grant-rules';

export function useGrantRules() {
  const rules = useLiveQuery(() =>
    db.grantRules.orderBy('yearsOfService').toArray(),
  );

  async function addRule(rule: Omit<GrantRule, 'id'>): Promise<number> {
    return db.grantRules.add(rule);
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
    await db.grantRules.clear();
    const defaults = getDefaultGrantRules();
    await db.grantRules.bulkAdd(defaults);
  }

  function getRecommendedDays(hireDate: string, targetDate?: string): number {
    const target = targetDate ?? new Date().toISOString().slice(0, 10);
    const years = calculateYearsOfService(hireDate, target);
    return getGrantDaysByRule(rules ?? [], years);
  }

  return { rules, addRule, updateRule, deleteRule, loadDefaults, getRecommendedDays };
}
