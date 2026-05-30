import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db';
import { useRefreshRule } from '../useRefreshRule';

vi.mock('../../contexts/ActiveProfileContext', () => ({
  useActiveProfileId: () => 1,
}));

describe('useRefreshRule', () => {
  beforeEach(async () => {
    db.close();
    await Dexie.delete('ukyu');
    await db.open();
    localStorage.clear();
  });

  it('アクティブプロフィールのルールを upsert する', async () => {
    const { result } = renderHook(() => useRefreshRule());

    await act(async () => {
      await result.current.upsertRule({
        startDate: '2020-04-01',
        intervalValue: 5,
        intervalUnit: 'year',
        grantDays: 5,
        enabled: true,
      });
    });

    await waitFor(() => {
      expect(result.current.rule?.startDate).toBe('2020-04-01');
    });

    await act(async () => {
      await result.current.upsertRule({ grantDays: 7 });
    });

    const rules = await db.refreshRules.where('profileId').equals(1).toArray();
    expect(rules).toHaveLength(1);
    expect(rules[0].grantDays).toBe(7);
  });

  it('syncRefreshGrants は overridden を保護し、同じ ruleKey の非 overridden を更新する', async () => {
    const ruleId = await db.refreshRules.add({
      profileId: 1,
      startDate: '2000-04-01',
      intervalValue: 5,
      intervalUnit: 'year',
      grantDays: 5,
      enabled: true,
    });
    await db.grants.bulkAdd([
      {
        profileId: 1,
        leaveKind: 'refresh',
        fiscalYear: 2000,
        grantDate: '2000-04-01',
        expiryDate: '2005-03-31',
        totalDays: 7,
        source: 'new',
        auto: true,
        ruleKey: `${ruleId}#0`,
        overridden: true,
      },
      {
        profileId: 1,
        leaveKind: 'refresh',
        fiscalYear: 2005,
        grantDate: '2005-04-01',
        expiryDate: '2005-12-31',
        totalDays: 3,
        source: 'new',
        auto: true,
        ruleKey: `${ruleId}#1`,
      },
    ]);

    const { result } = renderHook(() => useRefreshRule());

    await waitFor(() => {
      expect(result.current.rule?.id).toBe(ruleId);
    });

    await act(async () => {
      await result.current.syncRefreshGrants();
    });

    const grants = await db.grants.where('profileId').equals(1).toArray();
    const protectedGrant = grants.find((grant) => grant.ruleKey === `${ruleId}#0`);
    const updatedGrant = grants.find((grant) => grant.ruleKey === `${ruleId}#1`);

    expect(protectedGrant).toMatchObject({
      ruleKey: `${ruleId}#0`,
      totalDays: 7,
      overridden: true,
    });
    expect(updatedGrant).toMatchObject({
      ruleKey: `${ruleId}#1`,
      totalDays: 5,
      expiryDate: '2010-03-31',
    });
    expect(updatedGrant?.overridden).toBeUndefined();
  });
});
