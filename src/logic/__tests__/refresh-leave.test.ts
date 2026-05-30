import { describe, expect, it } from 'vitest';
import { addInterval, generateRefreshGrants } from '../refresh-leave';
import type { RefreshRule, Grant } from '../../db/types';

const baseRule: RefreshRule = {
  id: 1, profileId: 1, startDate: '2020-04-01',
  intervalValue: 5, intervalUnit: 'year', grantDays: 5, enabled: true,
};

describe('addInterval', () => {
  it('年単位で加算する', () => {
    expect(addInterval(new Date('2020-04-01T00:00:00'), 5, 'year').getFullYear()).toBe(2025);
  });
  it('月単位で加算する', () => {
    const d = addInterval(new Date('2020-01-01T00:00:00'), 18, 'month');
    expect(d.getFullYear()).toBe(2021);
    expect(d.getMonth()).toBe(6); // 7月(0-indexed)
  });
});

describe('generateRefreshGrants', () => {
  it('起点日から周期ごとに asOf までの付与を生成し、消滅日=次回付与日の前日', () => {
    const grants = generateRefreshGrants(baseRule, '2026-05-31', []);
    // 2020-04-01, 2025-04-01 の 2 件（2030 は未来）
    expect(grants.map((g) => g.grantDate)).toEqual(['2020-04-01', '2025-04-01']);
    expect(grants[0].leaveKind).toBe('refresh');
    expect(grants[0].totalDays).toBe(5);
    expect(grants[0].expiryDate).toBe('2025-03-31'); // 次回(2025-04-01)の前日
    expect(grants[0].ruleKey).toBe('1#0');
    expect(grants[0].auto).toBe(true);
  });

  it('enabled=false なら空', () => {
    expect(generateRefreshGrants({ ...baseRule, enabled: false }, '2026-05-31', [])).toEqual([]);
  });

  it('overridden な ruleKey は再生成からスキップする', () => {
    const existing: Grant[] = [{
      id: 9, profileId: 1, leaveKind: 'refresh', fiscalYear: 2020,
      grantDate: '2020-04-01', expiryDate: '2025-03-31', totalDays: 7,
      source: 'new', auto: true, ruleKey: '1#0', overridden: true,
    }];
    const grants = generateRefreshGrants(baseRule, '2026-05-31', existing);
    expect(grants.map((g) => g.ruleKey)).toEqual(['1#1']); // 1#0 は保護されスキップ
  });
});
