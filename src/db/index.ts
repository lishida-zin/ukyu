import Dexie, { type Table } from 'dexie';
import type { Grant, Usage, Settings, GrantRule, Profile, RefreshRule } from './types';
import { buildDefaultProfile } from '../logic/migration';

export class UkyuDatabase extends Dexie {
  grants!: Table<Grant, number>;
  usages!: Table<Usage, number>;
  settings!: Table<Settings, number>;
  grantRules!: Table<GrantRule, number>;
  profiles!: Table<Profile, number>;
  refreshRules!: Table<RefreshRule, number>;

  constructor(name = 'ukyu') {
    super(name);
    this.version(1).stores({
      grants: '++id, fiscalYear, grantDate, expiryDate, source',
      usages: '++id, date, grantId, status',
      settings: '++id',
      grantRules: '++id, yearsOfService',
    });

    this.version(2)
      .stores({
        grants: '++id, profileId, fiscalYear, grantDate, expiryDate, source, leaveKind, ruleKey',
        usages: '++id, profileId, date, grantId, status',
        settings: '++id, profileId',
        grantRules: '++id, profileId, yearsOfService',
        profiles: '++id, order',
        refreshRules: '++id, profileId',
      })
      .upgrade(async (tx) => {
        const oldSettings = await tx.table('settings').toCollection().first();
        const hireDate: string | undefined = oldSettings?.hireDate;
        const profileId = await tx
          .table('profiles')
          .add(buildDefaultProfile(hireDate, new Date().toISOString()));

        await tx.table('grants').toCollection().modify((g: Grant) => {
          g.profileId = profileId;
          if (!g.leaveKind) g.leaveKind = 'paid';
        });
        await tx.table('usages').toCollection().modify((u: Usage) => {
          u.profileId = profileId;
        });
        await tx.table('grantRules').toCollection().modify((r: GrantRule) => {
          r.profileId = profileId;
        });
        await tx.table('settings').toCollection().modify((s: Settings & { hireDate?: string }) => {
          s.profileId = profileId;
          delete s.hireDate;
        });
      });
  }
}

export const db = new UkyuDatabase();
