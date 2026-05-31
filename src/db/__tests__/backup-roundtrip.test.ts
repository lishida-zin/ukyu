import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../index';
import { exportToJson, parseImportData, normalizeImportDataForV2 } from '../../logic/export-import';

describe('バックアップ往復（複数プロフィール）', () => {
  beforeEach(async () => {
    db.close();
    await Dexie.delete('ukyu');
    await db.open();
  });

  it('export→import で全プロフィールの settings が保持される', async () => {
    await db.profiles.bulkAdd([
      { id: 1, name: 'わたし', color: '#C4B5FD', hireDate: '2022-06-01', order: 0, createdAt: '2026-05-31T00:00:00.000Z' },
      { id: 2, name: 'ひろみ', color: '#FBCFE8', hireDate: '2019-04-01', order: 1, createdAt: '2026-05-31T00:00:00.000Z' },
    ]);
    await db.settings.bulkAdd([
      { id: 1, profileId: 1, fiscalYearStart: '04-01', defaultGrantDate: '04-01' },
      { id: 2, profileId: 2, fiscalYearStart: '01-01', defaultGrantDate: '01-01' },
    ]);

    // handleExport 相当: 全テーブルを集めて JSON 化
    const json = exportToJson({
      grants: await db.grants.toArray(),
      usages: await db.usages.toArray(),
      settings: await db.settings.toArray(),
      grantRules: await db.grantRules.toArray(),
      profiles: await db.profiles.toArray(),
      refreshRules: await db.refreshRules.toArray(),
    });

    // handleImport 相当: 全消去 → 正規化して復元
    const normalized = normalizeImportDataForV2(parseImportData(json), '2026-05-31T00:00:00.000Z');
    await db.settings.clear();
    await db.settings.bulkAdd(normalized.settings);

    const restored = (await db.settings.toArray()).sort((a, b) => a.profileId - b.profileId);
    expect(restored).toHaveLength(2);
    expect(restored.map((s) => s.profileId)).toEqual([1, 2]);
    // 非アクティブ側(profile 2)の設定値も失われていないこと
    expect(restored.find((s) => s.profileId === 2)?.fiscalYearStart).toBe('01-01');
  });
});
