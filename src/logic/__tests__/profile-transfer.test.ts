import { describe, expect, it, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { UkyuDatabase } from '../../db';
import {
  parseProfileImport,
  remapRuleKey,
  serializeProfileExport,
  exportProfileData,
  importProfileData,
  type ProfileExport,
} from '../profile-transfer';

describe('remapRuleKey', () => {
  it('id 部分を新 id に貼り替える', () => {
    const map = new Map([[5, 9]]);
    expect(remapRuleKey('5#0', map)).toBe('9#0');
    expect(remapRuleKey('5#2', map)).toBe('9#2');
  });
  it('undefined はそのまま返す', () => {
    expect(remapRuleKey(undefined, new Map())).toBeUndefined();
  });
  it('マップに無い id は元のまま', () => {
    expect(remapRuleKey('7#1', new Map([[5, 9]]))).toBe('7#1');
  });
});

describe('parseProfileImport', () => {
  const valid: ProfileExport = {
    kind: 'ukyu-profile',
    version: 1,
    profile: { name: 'ひろみ', color: '#FECDD3', hireDate: '2020-04-01' },
    settings: null,
    grants: [],
    usages: [],
    grantRules: [],
    refreshRules: [],
  };

  it('正しい形式を受理する', () => {
    const parsed = parseProfileImport(serializeProfileExport(valid));
    expect(parsed.profile.name).toBe('ひろみ');
  });
  it('kind が違うと拒否する', () => {
    expect(() =>
      parseProfileImport(JSON.stringify({ ...valid, kind: 'ukyu-backup' })),
    ).toThrow();
  });
  it('壊れた JSON を拒否する', () => {
    expect(() => parseProfileImport('{not json')).toThrow();
  });
  it('grants 配列が無いと拒否する', () => {
    const broken = { ...valid } as Record<string, unknown>;
    delete broken.grants;
    expect(() => parseProfileImport(JSON.stringify(broken))).toThrow();
  });
});

describe('export/import profile (fake-indexeddb)', () => {
  beforeEach(async () => {
    await Dexie.delete('profile-transfer-test');
  });

  it('別タブとして取り込み、usage.grantId と grant.ruleKey を再マッピングする', async () => {
    const db = new UkyuDatabase('profile-transfer-test');
    await db.open();

    // 元プロフィール A を作る
    const profileAId = await db.profiles.add({
      name: 'ひろみ',
      color: '#FECDD3',
      hireDate: '2020-04-01',
      order: 0,
      createdAt: '2026-05-31T00:00:00.000Z',
    });
    await db.settings.add({
      profileId: profileAId,
      fiscalYearStart: '04-01',
      defaultGrantDate: '04-01',
    });
    const ruleId = await db.refreshRules.add({
      profileId: profileAId,
      startDate: '2020-04-01',
      intervalValue: 5,
      intervalUnit: 'year',
      grantDays: 5,
      enabled: true,
    });
    await db.grants.add({
      profileId: profileAId,
      leaveKind: 'refresh',
      fiscalYear: 2020,
      grantDate: '2020-04-01',
      expiryDate: '2025-03-31',
      totalDays: 5,
      source: 'new',
      auto: true,
      ruleKey: `${ruleId}#0`,
    });
    const paidGrantId = await db.grants.add({
      profileId: profileAId,
      leaveKind: 'paid',
      fiscalYear: 2022,
      grantDate: '2022-12-01',
      expiryDate: '2024-11-30',
      totalDays: 10,
      source: 'new',
    });
    await db.usages.add({
      profileId: profileAId,
      date: '2023-01-10',
      type: 'full',
      status: 'planned',
      grantId: paidGrantId,
      memo: '',
    });

    // export → import（別タブとして）
    const exported = await exportProfileData(db, profileAId);
    const newProfileId = await importProfileData(
      db,
      exported,
      '2026-06-01T00:00:00.000Z',
    );

    expect(newProfileId).not.toBe(profileAId);

    const profiles = await db.profiles.toArray();
    expect(profiles).toHaveLength(2);
    const imported = profiles.find((p) => p.id === newProfileId);
    expect(imported?.name).toBe('ひろみ');
    expect(imported?.order).toBe(1);

    const newGrants = await db.grants.where('profileId').equals(newProfileId).toArray();
    expect(newGrants).toHaveLength(2);
    const newUsages = await db.usages.where('profileId').equals(newProfileId).toArray();
    expect(newUsages).toHaveLength(1);
    const newRules = await db.refreshRules.where('profileId').equals(newProfileId).toArray();
    expect(newRules).toHaveLength(1);

    // usage.grantId は新しい paid grant を指す（旧 id ではない）
    const newPaid = newGrants.find((g) => g.leaveKind === 'paid');
    expect(newUsages[0]?.grantId).toBe(newPaid?.id);
    expect(newUsages[0]?.grantId).not.toBe(paidGrantId);

    // refresh grant の ruleKey は新しい refreshRule id を指す
    const newRefreshGrant = newGrants.find((g) => g.leaveKind === 'refresh');
    expect(newRefreshGrant?.ruleKey).toBe(`${newRules[0]?.id}#0`);
    expect(newRefreshGrant?.ruleKey).not.toBe(`${ruleId}#0`);

    // 元 A のデータは保持される
    const aGrants = await db.grants.where('profileId').equals(profileAId).toArray();
    expect(aGrants).toHaveLength(2);

    db.close();
  });
});
