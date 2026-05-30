import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { UkyuDatabase } from '../index';
import type { Grant, Usage, Settings, GrantRule } from '../types';

let dbCounter = 0;

function makeGrant(overrides?: Partial<Grant>): Grant {
  return {
    profileId: 1,
    leaveKind: 'paid',
    fiscalYear: 2025,
    grantDate: '2025-04-01',
    expiryDate: '2027-03-31',
    totalDays: 20,
    source: 'new',
    ...overrides,
  };
}

function makeUsage(overrides?: Partial<Usage>): Usage {
  return {
    profileId: 1,
    date: '2025-06-15',
    type: 'full',
    status: 'planned',
    grantId: 1,
    memo: 'Test leave',
    ...overrides,
  };
}

describe('UkyuDatabase', () => {
  let db: UkyuDatabase;

  beforeEach(async () => {
    db = new UkyuDatabase('test-' + (++dbCounter));
  });

  describe('grants', () => {
    it('should add and retrieve a grant', async () => {
      const grant = makeGrant();
      const id = await db.grants.add(grant);
      const result = await db.grants.get(id);
      expect(result).toMatchObject({ fiscalYear: 2025, totalDays: 20 });
      expect(result!.id).toBeDefined();
    });

    it('should update a grant', async () => {
      const id = await db.grants.add(makeGrant());
      await db.grants.update(id, { totalDays: 15 });
      const result = await db.grants.get(id);
      expect(result!.totalDays).toBe(15);
    });

    it('should delete a grant', async () => {
      const id = await db.grants.add(makeGrant());
      await db.grants.delete(id);
      const result = await db.grants.get(id);
      expect(result).toBeUndefined();
    });

    it('should filter grants by fiscalYear', async () => {
      await db.grants.add(makeGrant({ fiscalYear: 2024 }));
      await db.grants.add(makeGrant({ fiscalYear: 2025 }));
      await db.grants.add(makeGrant({ fiscalYear: 2025 }));
      const results = await db.grants.where('fiscalYear').equals(2025).toArray();
      expect(results).toHaveLength(2);
    });
  });

  describe('usages', () => {
    it('should add and retrieve a usage', async () => {
      const usage = makeUsage();
      const id = await db.usages.add(usage);
      const result = await db.usages.get(id);
      expect(result).toMatchObject({ date: '2025-06-15', type: 'full' });
    });

    it('should update a usage', async () => {
      const id = await db.usages.add(makeUsage());
      await db.usages.update(id, { status: 'confirmed' });
      const result = await db.usages.get(id);
      expect(result!.status).toBe('confirmed');
    });

    it('should delete a usage', async () => {
      const id = await db.usages.add(makeUsage());
      await db.usages.delete(id);
      const result = await db.usages.get(id);
      expect(result).toBeUndefined();
    });

    it('should filter usages by grantId', async () => {
      await db.usages.add(makeUsage({ grantId: 1 }));
      await db.usages.add(makeUsage({ grantId: 2 }));
      await db.usages.add(makeUsage({ grantId: 1 }));
      const results = await db.usages.where('grantId').equals(1).toArray();
      expect(results).toHaveLength(2);
    });
  });

  describe('settings', () => {
    it('should add and retrieve settings', async () => {
      const settings: Settings = {
        profileId: 1,
        fiscalYearStart: '04-01',
        defaultGrantDate: '04-01',
      };
      const id = await db.settings.add(settings);
      const result = await db.settings.get(id);
      expect(result).toMatchObject({ fiscalYearStart: '04-01' });
    });

    it('should update settings', async () => {
      const settings: Settings = {
        profileId: 1,
        fiscalYearStart: '04-01',
        defaultGrantDate: '04-01',
      };
      const id = await db.settings.add(settings);
      await db.settings.update(id, { fiscalYearStart: '01-01' });
      const result = await db.settings.get(id);
      expect(result!.fiscalYearStart).toBe('01-01');
    });
  });

  describe('grantRules', () => {
    it('should add and retrieve a grant rule', async () => {
      const rule: GrantRule = { profileId: 1, yearsOfService: 0.5, grantDays: 10 };
      const id = await db.grantRules.add(rule);
      const result = await db.grantRules.get(id);
      expect(result).toMatchObject({ yearsOfService: 0.5, grantDays: 10 });
    });

    it('should filter rules by yearsOfService', async () => {
      await db.grantRules.add({ profileId: 1, yearsOfService: 0.5, grantDays: 10 });
      await db.grantRules.add({ profileId: 1, yearsOfService: 1.5, grantDays: 11 });
      await db.grantRules.add({ profileId: 1, yearsOfService: 2.5, grantDays: 12 });
      const results = await db.grantRules
        .where('yearsOfService')
        .belowOrEqual(1.5)
        .toArray();
      expect(results).toHaveLength(2);
    });

    it('should delete a grant rule', async () => {
      const rule: GrantRule = { profileId: 1, yearsOfService: 0.5, grantDays: 10 };
      const id = await db.grantRules.add(rule);
      await db.grantRules.delete(id);
      const result = await db.grantRules.get(id);
      expect(result).toBeUndefined();
    });
  });
});
