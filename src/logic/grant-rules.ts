import type { GrantRule } from '../db/types';

export type GrantRuleConfig = Pick<GrantRule, 'yearsOfService' | 'grantDays'>;

export function calculateYearsOfService(
  hireDate: string,
  targetDate: string,
): number {
  const hire = new Date(hireDate);
  const target = new Date(targetDate);
  const diffMs = target.getTime() - hire.getTime();
  const diffYears = diffMs / (365.25 * 24 * 60 * 60 * 1000);
  // Round to 1 decimal place to avoid floating-point noise
  return Math.round(diffYears * 10) / 10;
}

export function getGrantDaysByRule(
  rules: GrantRuleConfig[],
  yearsOfService: number,
): number {
  // Sort rules descending by yearsOfService, find first that applies
  const sorted = [...rules].sort(
    (a, b) => b.yearsOfService - a.yearsOfService,
  );
  for (const rule of sorted) {
    if (yearsOfService >= rule.yearsOfService) {
      return rule.grantDays;
    }
  }
  return 0;
}

export function getDefaultGrantRules(): GrantRuleConfig[] {
  return [
    { yearsOfService: 0.5, grantDays: 10 },
    { yearsOfService: 1.5, grantDays: 11 },
    { yearsOfService: 2.5, grantDays: 12 },
    { yearsOfService: 3.5, grantDays: 14 },
    { yearsOfService: 4.5, grantDays: 16 },
    { yearsOfService: 5.5, grantDays: 18 },
    { yearsOfService: 6.5, grantDays: 20 },
  ];
}
