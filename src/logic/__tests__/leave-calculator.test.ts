import { describe, it, expect } from 'vitest';
import {
  getUsageDays,
  calculateRemainingDays,
  simulateUsage,
} from '../leave-calculator';
import type { Grant, Usage } from '../../db/types';

describe('getUsageDays', () => {
  it('should return 1.0 for full day', () => {
    expect(getUsageDays('full')).toBe(1.0);
  });

  it('should return 0.5 for am', () => {
    expect(getUsageDays('am')).toBe(0.5);
  });

  it('should return 0.5 for pm', () => {
    expect(getUsageDays('pm')).toBe(0.5);
  });
});

describe('calculateRemainingDays', () => {
  const grant: Grant = {
    profileId: 1,
    leaveKind: 'paid',
    fiscalYear: 2025,
    grantDate: '2025-04-01',
    expiryDate: '2027-03-31',
    totalDays: 20,
    source: 'new',
  };

  it('should return totalDays when no usages', () => {
    expect(calculateRemainingDays(grant, [])).toBe(20);
  });

  it('should subtract full day usages', () => {
    const usages: Usage[] = [
      { profileId: 1, date: '2025-05-01', type: 'full', status: 'used', grantId: 1, memo: '' },
      { profileId: 1, date: '2025-05-02', type: 'full', status: 'used', grantId: 1, memo: '' },
    ];
    expect(calculateRemainingDays(grant, usages)).toBe(18);
  });

  it('should subtract half day usages', () => {
    const usages: Usage[] = [
      { profileId: 1, date: '2025-05-01', type: 'am', status: 'used', grantId: 1, memo: '' },
      { profileId: 1, date: '2025-05-02', type: 'pm', status: 'used', grantId: 1, memo: '' },
    ];
    expect(calculateRemainingDays(grant, usages)).toBe(19);
  });

  it('should handle mixed usages', () => {
    const usages: Usage[] = [
      { profileId: 1, date: '2025-05-01', type: 'full', status: 'used', grantId: 1, memo: '' },
      { profileId: 1, date: '2025-05-02', type: 'am', status: 'planned', grantId: 1, memo: '' },
    ];
    expect(calculateRemainingDays(grant, usages)).toBe(18.5);
  });
});

describe('simulateUsage', () => {
  it('should return all combinations for integer remaining days', () => {
    const patterns = simulateUsage(2);
    expect(patterns).toEqual([
      { fullDays: 2, halfDays: 0 },
      { fullDays: 1, halfDays: 2 },
      { fullDays: 0, halfDays: 4 },
    ]);
  });

  it('should handle 0.5 remaining days', () => {
    const patterns = simulateUsage(0.5);
    expect(patterns).toEqual([{ fullDays: 0, halfDays: 1 }]);
  });

  it('should handle 0 remaining days', () => {
    const patterns = simulateUsage(0);
    expect(patterns).toEqual([{ fullDays: 0, halfDays: 0 }]);
  });

  it('should handle 1.5 remaining days', () => {
    const patterns = simulateUsage(1.5);
    expect(patterns).toEqual([
      { fullDays: 1, halfDays: 1 },
      { fullDays: 0, halfDays: 3 },
    ]);
  });
});
