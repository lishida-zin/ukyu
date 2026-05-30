import { describe, expect, it } from 'vitest';
import type { Grant, Usage } from '../../db/types';
import { computeRefreshSummary } from '../refresh-balance';

describe('computeRefreshSummary', () => {
  it('付与5日から使用2日を引いて残り3日にする', () => {
    const grants: Grant[] = [
      {
        id: 1,
        profileId: 1,
        leaveKind: 'refresh',
        fiscalYear: 2026,
        grantDate: '2026-04-01',
        expiryDate: '2027-03-31',
        totalDays: 5,
        source: 'new',
      },
    ];
    const usages: Usage[] = [
      { id: 1, profileId: 1, date: '2026-05-01', type: 'full', status: 'used', grantId: 1, memo: '' },
      { id: 2, profileId: 1, date: '2026-05-02', type: 'full', status: 'confirmed', grantId: 1, memo: '' },
      { id: 3, profileId: 1, date: '2026-05-03', type: 'full', status: 'planned', grantId: 1, memo: '' },
    ];

    const summary = computeRefreshSummary(grants, usages, '2026-05-31');

    expect(summary.totalRemaining).toBe(3);
    expect(summary.totalUsed).toBe(2);
    expect(summary.totalPlanned).toBe(1);
    expect(summary.perGrant[0]).toMatchObject({
      grantId: 1,
      remainingDays: 3,
      usedDays: 2,
      plannedDays: 1,
      isExpired: false,
    });
  });

  it('期限切れ付与は残り0にして expiredDays に計上する', () => {
    const grants: Grant[] = [
      {
        id: 1,
        profileId: 1,
        leaveKind: 'refresh',
        fiscalYear: 2025,
        grantDate: '2025-04-01',
        expiryDate: '2026-03-31',
        totalDays: 5,
        source: 'new',
      },
    ];

    const summary = computeRefreshSummary(grants, [], '2026-05-31');

    expect(summary.totalRemaining).toBe(0);
    expect(summary.expiredDays).toBe(5);
    expect(summary.perGrant[0]).toMatchObject({
      grantId: 1,
      remainingDays: 0,
      expiredDays: 5,
      isExpired: true,
    });
  });
});
