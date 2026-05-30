import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useActiveProfileId } from '../contexts/ActiveProfileContext';
import { computeRefreshSummary, type RefreshSummary } from '../logic/refresh-balance';

function emptySummary(): RefreshSummary {
  return {
    totalRemaining: 0,
    totalUsed: 0,
    totalPlanned: 0,
    expiringSoonDays: 0,
    expiredDays: 0,
    perGrant: [],
  };
}

export function useRefreshBalance(): RefreshSummary {
  const profileId = useActiveProfileId();
  const summary = useLiveQuery(async () => {
    if (profileId === undefined) return emptySummary();

    const allGrants = await db.grants.where('profileId').equals(profileId).toArray();
    const grants = allGrants.filter((grant) => grant.leaveKind === 'refresh');
    const grantIds = new Set(
      grants.flatMap((grant) => (grant.id === undefined ? [] : [grant.id])),
    );
    const allUsages = await db.usages.where('profileId').equals(profileId).toArray();
    const usages = allUsages.filter((usage) => grantIds.has(usage.grantId));
    const now = new Date().toISOString().slice(0, 10);

    return computeRefreshSummary(grants, usages, now);
  }, [profileId]);

  return summary ?? emptySummary();
}
