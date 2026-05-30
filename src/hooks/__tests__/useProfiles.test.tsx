import 'fake-indexeddb/auto';
import { act, renderHook, waitFor } from '@testing-library/react';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../db';
import { useProfiles } from '../useProfiles';

describe('useProfiles', () => {
  beforeEach(async () => {
    db.close();
    await Dexie.delete('ukyu');
    await db.open();
    localStorage.clear();
  });

  it('追加したプロフィールを order 順で返す', async () => {
    const { result } = renderHook(() => useProfiles());

    await act(async () => {
      await result.current.addProfile({
        name: 'あと',
        color: '#C4B5FD',
        hireDate: '2022-06-01',
        order: 1,
      });
      await result.current.addProfile({
        name: 'まえ',
        color: '#FBCFE8',
        hireDate: '2021-04-01',
        order: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.profiles?.map((p) => p.name)).toEqual(['まえ', 'あと']);
    });
  });

  it('最後の1件は削除を拒否する', async () => {
    const { result } = renderHook(() => useProfiles());

    await act(async () => {
      await result.current.addProfile({
        name: 'わたし',
        color: '#C4B5FD',
        hireDate: '',
        order: 0,
      });
    });

    await waitFor(() => {
      expect(result.current.profiles).toHaveLength(1);
    });

    await expect(result.current.deleteProfile(result.current.profiles![0].id!)).rejects.toThrow(
      '最後のプロフィールは削除できません',
    );
  });
});
