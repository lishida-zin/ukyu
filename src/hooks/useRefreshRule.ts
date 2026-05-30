import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { RefreshRule } from '../db/types';
import { useActiveProfileId } from '../contexts/ActiveProfileContext';
import { generateRefreshGrants } from '../logic/refresh-leave';

type RefreshRuleChanges = Partial<Omit<RefreshRule, 'id' | 'profileId'>>;

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDefaultRefreshRule(): Omit<RefreshRule, 'id' | 'profileId'> {
  return {
    startDate: todayISO(),
    intervalValue: 5,
    intervalUnit: 'year',
    grantDays: 5,
    enabled: false,
  } satisfies Omit<RefreshRule, 'id' | 'profileId'>;
}

export function useRefreshRule() {
  const profileId = useActiveProfileId();
  const rule = useLiveQuery(() => {
    if (profileId === undefined) return undefined;
    return db.refreshRules.where('profileId').equals(profileId).first();
  }, [profileId]);

  async function upsertRule(changes: RefreshRuleChanges): Promise<void> {
    if (profileId === undefined) throw new Error('アクティブプロフィールがありません');
    const existing = await db.refreshRules.where('profileId').equals(profileId).first();
    if (existing?.id !== undefined) {
      await db.refreshRules.update(existing.id, changes);
      return;
    }
    await db.refreshRules.add({ ...buildDefaultRefreshRule(), ...changes, profileId });
  }

  async function syncRefreshGrants(): Promise<void> {
    if (profileId === undefined) return;
    await db.transaction('rw', [db.refreshRules, db.grants], async () => {
      const currentRule = await db.refreshRules.where('profileId').equals(profileId).first();
      if (!currentRule?.enabled) return;

      const existing = await db.grants
        .where('profileId')
        .equals(profileId)
        .filter((grant) => grant.leaveKind === 'refresh')
        .toArray();
      const desired = generateRefreshGrants(currentRule, todayISO(), existing);

      for (const grant of desired) {
        if (!grant.ruleKey) continue;
        const currentGrant = existing.find((item) => item.ruleKey === grant.ruleKey);
        if (currentGrant?.overridden) continue;
        if (currentGrant?.id !== undefined) {
          await db.grants.update(currentGrant.id, grant);
        } else {
          await db.grants.add(grant);
        }
      }
    });
  }

  return { rule, upsertRule, syncRefreshGrants };
}
