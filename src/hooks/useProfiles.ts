import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Profile } from '../db/types';
import { buildDefaultProfile } from '../logic/migration';

type ProfileDraft = Pick<Profile, 'name' | 'color' | 'hireDate'> &
  Partial<Pick<Profile, 'order' | 'createdAt'>>;

export async function ensureDefaultProfile(): Promise<number> {
  return db.transaction('rw', db.profiles, async () => {
    const existing = await db.profiles.orderBy('order').first();
    if (existing?.id !== undefined) {
      return existing.id;
    }
    return db.profiles.add(buildDefaultProfile(undefined, new Date().toISOString()));
  });
}

export function useProfiles() {
  const profiles = useLiveQuery(() => db.profiles.orderBy('order').toArray());

  async function addProfile(profile: ProfileDraft): Promise<number> {
    const order = profile.order ?? (await db.profiles.count());
    return db.profiles.add({
      name: profile.name,
      color: profile.color,
      hireDate: profile.hireDate,
      order,
      createdAt: profile.createdAt ?? new Date().toISOString(),
    });
  }

  async function updateProfile(
    id: number,
    changes: Partial<Omit<Profile, 'id'>>,
  ): Promise<void> {
    await db.profiles.update(id, changes);
  }

  async function deleteProfile(id: number): Promise<void> {
    await db.transaction(
      'rw',
      [db.profiles, db.grants, db.usages, db.settings, db.grantRules, db.refreshRules],
      async () => {
        const count = await db.profiles.count();
        if (count <= 1) {
          throw new Error('最後のプロフィールは削除できません');
        }
        await db.usages.where('profileId').equals(id).delete();
        await db.grants.where('profileId').equals(id).delete();
        await db.settings.where('profileId').equals(id).delete();
        await db.grantRules.where('profileId').equals(id).delete();
        await db.refreshRules.where('profileId').equals(id).delete();
        await db.profiles.delete(id);
      },
    );
  }

  return { profiles, addProfile, updateProfile, deleteProfile, ensureDefaultProfile };
}
