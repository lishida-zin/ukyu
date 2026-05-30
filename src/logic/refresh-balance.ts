import type { Grant, Usage } from '../db/types';
import { getUsageDays } from './leave-calculator';

const EXPIRY_WARNING_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RefreshGrantBalance {
  grantId: number | undefined;
  fiscalYear: number;
  grantDate: string;
  expiryDate: string;
  totalDays: number;
  plannedDays: number;
  usedDays: number;
  remainingDays: number;
  expiredDays: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

export interface RefreshSummary {
  totalRemaining: number;
  totalUsed: number;
  totalPlanned: number;
  expiringSoonDays: number;
  expiredDays: number;
  perGrant: RefreshGrantBalance[];
}

function daysUntil(expiryDate: string, now: string): number {
  const expiry = new Date(expiryDate + 'T00:00:00');
  const today = new Date(now + 'T00:00:00');
  return Math.ceil((expiry.getTime() - today.getTime()) / DAY_MS);
}

export function computeRefreshSummary(
  grants: Grant[],
  usages: Usage[],
  now: string,
): RefreshSummary {
  const usageByGrantId = new Map<number, Usage[]>();
  for (const usage of usages) {
    const grantUsages = usageByGrantId.get(usage.grantId) ?? [];
    grantUsages.push(usage);
    usageByGrantId.set(usage.grantId, grantUsages);
  }

  const perGrant = grants.map((grant) => {
    const grantUsages = grant.id === undefined ? [] : usageByGrantId.get(grant.id) ?? [];
    let plannedDays = 0;
    let usedDays = 0;

    for (const usage of grantUsages) {
      const days = getUsageDays(usage.type);
      if (usage.status === 'planned') plannedDays += days;
      else usedDays += days;
    }

    const rawRemainingDays = grant.totalDays - usedDays;
    const isExpired = grant.expiryDate < now;
    const remainingDays = isExpired ? 0 : rawRemainingDays;
    const expiredDays = isExpired ? Math.max(0, rawRemainingDays) : 0;
    const isExpiringSoon =
      !isExpired && daysUntil(grant.expiryDate, now) <= EXPIRY_WARNING_DAYS;

    return {
      grantId: grant.id,
      fiscalYear: grant.fiscalYear,
      grantDate: grant.grantDate,
      expiryDate: grant.expiryDate,
      totalDays: grant.totalDays,
      plannedDays,
      usedDays,
      remainingDays,
      expiredDays,
      isExpired,
      isExpiringSoon,
    };
  });

  perGrant.sort((a, b) => b.grantDate.localeCompare(a.grantDate));

  return {
    totalRemaining: perGrant.reduce((sum, grant) => sum + grant.remainingDays, 0),
    totalUsed: perGrant.reduce((sum, grant) => sum + grant.usedDays, 0),
    totalPlanned: perGrant.reduce((sum, grant) => sum + grant.plannedDays, 0),
    expiringSoonDays: perGrant
      .filter((grant) => grant.isExpiringSoon)
      .reduce((sum, grant) => sum + grant.remainingDays, 0),
    expiredDays: perGrant.reduce((sum, grant) => sum + grant.expiredDays, 0),
    perGrant,
  };
}
