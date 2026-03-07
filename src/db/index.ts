import Dexie, { type Table } from 'dexie';
import type { Grant, Usage, Settings, GrantRule } from './types';

export class UkyuDatabase extends Dexie {
  grants!: Table<Grant, number>;
  usages!: Table<Usage, number>;
  settings!: Table<Settings, number>;
  grantRules!: Table<GrantRule, number>;

  constructor(name = 'ukyu') {
    super(name);
    this.version(1).stores({
      grants: '++id, fiscalYear, grantDate, expiryDate, source',
      usages: '++id, date, grantId, status',
      settings: '++id',
      grantRules: '++id, yearsOfService',
    });
  }
}

export const db = new UkyuDatabase();
