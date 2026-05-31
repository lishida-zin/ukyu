import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Profile } from '../db/types';
import { buildDefaultProfile } from '../logic/migration';
import {
  exportProfileData,
  importProfileData,
  parseProfileImport,
  serializeProfileExport,
} from '../logic/profile-transfer';

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

  /** 指定プロフィールのデータ一式を JSON 文字列として書き出す。 */
  async function exportProfile(id: number): Promise<string> {
    return serializeProfileExport(await exportProfileData(db, id));
  }

  /** JSON を新しいプロフィール（タブ）として取り込み、新 profileId を返す。 */
  async function importProfile(json: string): Promise<number> {
    const data = parseProfileImport(json);
    return importProfileData(db, data, new Date().toISOString());
  }

  return {
    profiles,
    addProfile,
    updateProfile,
    deleteProfile,
    ensureDefaultProfile,
    exportProfile,
    importProfile,
  };
}
