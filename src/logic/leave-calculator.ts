import type { UsageType, Grant, Usage } from '../db/types';

export interface UsagePattern {
  fullDays: number;
  halfDays: number;
}

export function getUsageDays(type: UsageType): number {
  return type === 'full' ? 1.0 : 0.5;
}

export function calculateRemainingDays(grant: Grant, usages: Usage[]): number {
  const used = usages.reduce((sum, u) => sum + getUsageDays(u.type), 0);
  return grant.totalDays - used;
}

/**
 * Generate possible combinations of full-day and half-day leaves
 * that use up the remaining days.
 */
export function simulateUsage(remainingDays: number): UsagePattern[] {
  const patterns: UsagePattern[] = [];

  // halfDays must be 0 or 1 when remainingDays is integer,
  // or we iterate through all combinations
  const maxFullDays = Math.floor(remainingDays);
  for (let fullDays = maxFullDays; fullDays >= 0; fullDays--) {
    const leftover = remainingDays - fullDays;
    // leftover should be expressible as halfDays * 0.5
    const halfDays = leftover / 0.5;
    if (Number.isInteger(halfDays) && halfDays >= 0) {
      patterns.push({ fullDays, halfDays });
    }
  }

  return patterns;
}
