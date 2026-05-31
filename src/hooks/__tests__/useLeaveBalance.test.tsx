import 'fake-indexeddb/auto';
import { renderHook, waitFor } from '@testing-library/react';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../db';
import { useLeaveBalance } from '../useLeaveBalance';

vi.mock('../../contexts/ActiveProfileContext', () => ({
  useActiveProfileId: () => 1,
}));

describe('useLeaveBalance', () => {
  beforeEach(async () => {
    db.close();
    await Dexie.delete('ukyu');
    await db.open();
    localStorage.clear();
  });

  it('期限切れ付与の使用日数を有効付与の残日数に転嫁しない', async () => {
    await db.profiles.add({
      id: 1,
      name: 'わたし',
      color: '#C4B5FD',
      hireDate: '1990-04-01',
      order: 0,
      createdAt: '2000-01-01T00:00:00.000Z',
    });
    const expiredId = await db.grants.add({
      profileId: 1,
      leaveKind: 'paid',
      fiscalYear: 1999,
      grantDate: '1999-04-01',
      expiryDate: '2000-12-31', // 過去 = 期限切れ
      totalDays: 10,
      source: 'new',
    });
    const activeId = await db.grants.add({
      profileId: 1,
      leaveKind: 'paid',
      fiscalYear: 2998,
      grantDate: '2998-04-01',
      expiryDate: '2999-12-31', // 未来 = 有効
      totalDays: 20,
      source: 'new',
    });
    // 期限切れ付与に対する過去の消化（1日）
    await db.usages.add({
      profileId: 1,
      date: '2000-06-01',
      type: 'full',
      status: 'used',
      grantId: expiredId,
      memo: '',
    });

    const { result } = renderHook(() => useLeaveBalance());

    await waitFor(() => {
      expect(result.current.balances).toBeDefined();
    });

    const activeBalance = result.current.balances!.find((b) => b.grantId === activeId);
    // 期限切れ付与の使用は有効付与の残に影響してはいけない（19 にならない）
    expect(activeBalance?.remainingDays).toBe(20);
    expect(result.current.totalRemaining).toBe(20);
  });
});
