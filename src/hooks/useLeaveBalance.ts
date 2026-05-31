import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { getUsageDays } from '../logic/leave-calculator';
import { getGrantMonth, getCurrentCycle } from '../logic/grant-cycle';
import { useActiveProfileId } from '../contexts/ActiveProfileContext';

const EXPIRY_WARNING_DAYS = 30;

export interface GrantBalance {
  grantId: number;
  fiscalYear: number;
  grantDate: string;
  source: string;
  totalDays: number;
  plannedDays: number;
  usedDays: number;
  remainingDays: number;
  expiredDays: number;
  expiryDate: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export function useLeaveBalance() {
  const profileId = useActiveProfileId();
  const result = useLiveQuery(async () => {
    const now = new Date().toISOString().slice(0, 10);
    if (profileId === undefined) {
      return {
        balances: [],
        cycleUsed: 0,
        cyclePlanned: 0,
        cycleExpiringDays: 0,
        cycle: getCurrentCycle(12, now),
      };
    }

    const allGrants = await db.grants.where('profileId').equals(profileId).toArray();
    const grants = allGrants.filter((grant) => grant.leaveKind === 'paid');
    const allUsages = await db.usages.where('profileId').equals(profileId).toArray();
    const paidGrantIds = new Set(grants.flatMap((grant) => (grant.id === undefined ? [] : [grant.id])));
    const allGrantIds = new Set(
      allGrants.flatMap((grant) => (grant.id === undefined ? [] : [grant.id])),
    );
    const usages = allUsages.filter(
      (usage) => paidGrantIds.has(usage.grantId) || !allGrantIds.has(usage.grantId),
    );

    const grantIds = new Set(grants.map((g) => g.id));

    // 各 usage はそれが紐づく付与にのみ計上する。
    // 期限切れ付与の使用日数も元の付与に留め、他の（有効な）付与の残日数へ転嫁しない。
    // 付与が削除済み（grantId が存在しない）usage は、どの付与の残日数にも影響させない。
    const usagesByGrant = new Map<number, typeof usages>();
    for (const grant of grants) {
      usagesByGrant.set(grant.id!, []);
    }
    for (const u of usages) {
      if (grantIds.has(u.grantId)) {
        usagesByGrant.get(u.grantId)?.push(u);
      }
    }

    const balances: GrantBalance[] = grants.map((grant) => {
      const grantUsages = usagesByGrant.get(grant.id!) ?? [];

      let plannedDays = 0;
      let usedDays = 0;
      for (const u of grantUsages) {
        const days = getUsageDays(u.type);
        if (u.status === 'planned') plannedDays += days;
        else usedDays += days;
      }
      const remainingDays = grant.totalDays - usedDays;

      const expiryDate = new Date(grant.expiryDate);
      const today = new Date(now);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
      );

      const isExpired = daysUntilExpiry < 0;
      const effectiveRemaining = isExpired ? 0 : remainingDays;
      const expiredDays = isExpired ? Math.max(0, remainingDays) : 0;

      return {
        grantId: grant.id!,
        fiscalYear: grant.fiscalYear,
        grantDate: grant.grantDate,
        source: grant.source,
        totalDays: grant.totalDays,
        plannedDays,
        usedDays,
        remainingDays: effectiveRemaining,
        expiredDays,
        expiryDate: grant.expiryDate,
        isExpired,
        isExpiringSoon:
          !isExpired &&
          daysUntilExpiry <= EXPIRY_WARNING_DAYS,
      };
    });

    balances.sort((a, b) => b.grantDate.localeCompare(a.grantDate));

    // サイクル計算（入社日から付与月を動的に決定）
    const activeProfile = await db.profiles.get(profileId);
    const grantMonth = getGrantMonth(activeProfile?.hireDate);
    const cycle = getCurrentCycle(grantMonth, now);

    const cycleUsages = usages.filter(
      (u) => u.date >= cycle.start && u.date <= cycle.end,
    );
    const cycleUsed = cycleUsages
      .filter((u) => u.status !== 'planned')
      .reduce((sum, u) => sum + getUsageDays(u.type), 0);
    const cyclePlanned = cycleUsages
      .filter((u) => u.status === 'planned')
      .reduce((sum, u) => sum + getUsageDays(u.type), 0);

    // サイクル内に消滅する付与の残日数
    const cycleExpiringDays = balances
      .filter(
        (b) =>
          !b.isExpired &&
          b.expiryDate >= cycle.start &&
          b.expiryDate <= cycle.end &&
          b.remainingDays > 0,
      )
      .reduce((sum, b) => sum + b.remainingDays, 0);

    return { balances, cycleUsed, cyclePlanned, cycleExpiringDays, cycle };
  }, [profileId]);

  const balances = result?.balances;
  const totalRemaining =
    balances?.reduce((sum, b) => sum + b.remainingDays, 0) ?? 0;
  const totalPlanned = balances?.reduce((sum, b) => sum + b.plannedDays, 0) ?? 0;
  const totalUsed = balances?.reduce((sum, b) => sum + b.usedDays, 0) ?? 0;

  return {
    balances,
    totalRemaining,
    totalPlanned,
    totalUsed,
    cycleUsed: result?.cycleUsed ?? 0,
    cyclePlanned: result?.cyclePlanned ?? 0,
    cycleExpiringDays: result?.cycleExpiringDays ?? 0,
    cycle: result?.cycle,
  };
}
