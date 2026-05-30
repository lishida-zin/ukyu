import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { UkyuDatabase } from '../index';

async function seedV1(name: string) {
  const v1 = new Dexie(name);
  v1.version(1).stores({
    grants: '++id, fiscalYear, grantDate, expiryDate, source',
    usages: '++id, date, grantId, status',
    settings: '++id',
    grantRules: '++id, yearsOfService',
  });
  await v1.open();
  await v1
    .table('settings')
    .add({ fiscalYearStart: '04-01', defaultGrantDate: '04-01', hireDate: '2022-06-01' });
  await v1.table('grants').add({
    fiscalYear: 2022,
    grantDate: '2022-12-01',
    expiryDate: '2024-11-30',
    totalDays: 10,
    source: 'new',
  });
  await v1
    .table('usages')
    .add({ date: '2023-01-10', type: 'full', status: 'planned', grantId: 1, memo: '' });
  await v1.table('grantRules').add({ yearsOfService: 0.5, grantDays: 10 });
  v1.close();
}

describe('Dexie v1 -> v2 migration', () => {
  beforeEach(async () => {
    await Dexie.delete('migrate-test');
  });

  it('既定プロフィールを作り、既存行へ profileId を backfill する', async () => {
    await seedV1('migrate-test');

    const db = new UkyuDatabase('migrate-test');
    await db.open();

    const profiles = await db.profiles.toArray();
    expect(profiles).toHaveLength(1);
    const pid = profiles[0].id!;
    expect(profiles[0].hireDate).toBe('2022-06-01');

    const grants = await db.grants.toArray();
    expect(grants[0].profileId).toBe(pid);
    expect(grants[0].leaveKind).toBe('paid');

    const usages = await db.usages.toArray();
    expect(usages[0].profileId).toBe(pid);

    const rules = await db.grantRules.toArray();
    expect(rules[0].profileId).toBe(pid);

    const settings = await db.settings.toArray();
    expect(settings[0].profileId).toBe(pid);
    expect((settings[0] as unknown as Record<string, unknown>).hireDate).toBeUndefined();

    db.close();
  });
});
