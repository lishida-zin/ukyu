import type {
  Grant,
  Usage,
  Settings,
  GrantRule,
  Profile,
  RefreshRule,
} from '../db/types';
import type { UkyuDatabase } from '../db';

const PROFILE_EXPORT_KIND = 'ukyu-profile';

/** 1 プロフィール分のデータ（タブ）を丸ごと表す書き出し形式。 */
export interface ProfileExport {
  kind: 'ukyu-profile';
  version: 1;
  profile: Pick<Profile, 'name' | 'color' | 'hireDate'>;
  settings: Pick<Settings, 'fiscalYearStart' | 'defaultGrantDate'> | null;
  // grants/refreshRules は元の id を「結合キー」として保持し、import 時に再割当する
  grants: Grant[];
  usages: Usage[];
  grantRules: GrantRule[];
  refreshRules: RefreshRule[];
}

export function serializeProfileExport(data: ProfileExport): string {
  return JSON.stringify(data, null, 2);
}

/** ruleKey `${refreshRuleId}#${k}` の id 部分を新 id に貼り替える（純粋）。 */
export function remapRuleKey(
  ruleKey: string | undefined,
  ruleIdMap: Map<number, number>,
): string | undefined {
  if (!ruleKey) return ruleKey;
  const hashIndex = ruleKey.indexOf('#');
  if (hashIndex < 0) return ruleKey;
  const oldId = Number(ruleKey.slice(0, hashIndex));
  const suffix = ruleKey.slice(hashIndex + 1);
  const newId = ruleIdMap.get(oldId);
  if (newId === undefined) return ruleKey;
  return `${newId}#${suffix}`;
}

/** 読み込んだ JSON をプロフィール書き出し形式として検証する（純粋）。 */
export function parseProfileImport(json: string): ProfileExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('JSONの形式が正しくありません');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('データの形式が正しくありません');
  }

  const data = parsed as Record<string, unknown>;

  if (data.kind !== PROFILE_EXPORT_KIND) {
    throw new Error('プロフィール用のファイルではありません');
  }
  if (data.version !== 1) {
    throw new Error('対応していないバージョンのファイルです');
  }
  if (typeof data.profile !== 'object' || data.profile === null) {
    throw new Error('profile がありません');
  }
  if (typeof (data.profile as Record<string, unknown>).name !== 'string') {
    throw new Error('profile.name がありません');
  }
  for (const key of ['grants', 'usages', 'grantRules', 'refreshRules'] as const) {
    if (!Array.isArray(data[key])) {
      throw new Error(`${key} が配列ではありません`);
    }
  }

  return parsed as ProfileExport;
}

/** 指定プロフィールのデータを DB から集めて書き出し形式にする。 */
export async function exportProfileData(
  database: UkyuDatabase,
  profileId: number,
): Promise<ProfileExport> {
  const profile = await database.profiles.get(profileId);
  if (!profile) {
    throw new Error('プロフィールが見つかりません');
  }

  const [grants, usages, grantRules, refreshRules, settingsRow] = await Promise.all([
    database.grants.where('profileId').equals(profileId).toArray(),
    database.usages.where('profileId').equals(profileId).toArray(),
    database.grantRules.where('profileId').equals(profileId).toArray(),
    database.refreshRules.where('profileId').equals(profileId).toArray(),
    database.settings.where('profileId').equals(profileId).first(),
  ]);

  return {
    kind: 'ukyu-profile',
    version: 1,
    profile: {
      name: profile.name,
      color: profile.color,
      hireDate: profile.hireDate,
    },
    settings: settingsRow
      ? {
          fiscalYearStart: settingsRow.fiscalYearStart,
          defaultGrantDate: settingsRow.defaultGrantDate,
        }
      : null,
    grants,
    usages,
    grantRules,
    refreshRules,
  };
}

/**
 * 書き出し形式を「新しいプロフィール（タブ）」として DB に取り込む。
 * id は全て再割当し、参照（usage.grantId / grant.ruleKey）を新 id へ再マッピングする。
 * 戻り値は新しい profileId。now は createdAt 用に注入（DI）。
 */
export async function importProfileData(
  database: UkyuDatabase,
  data: ProfileExport,
  now: string,
): Promise<number> {
  return database.transaction(
    'rw',
    [
      database.profiles,
      database.grants,
      database.usages,
      database.settings,
      database.grantRules,
      database.refreshRules,
    ],
    async () => {
      const order = await database.profiles.count();
      const newProfileId = await database.profiles.add({
        name: data.profile.name,
        color: data.profile.color,
        hireDate: data.profile.hireDate,
        order,
        createdAt: now,
      });

      if (data.settings) {
        await database.settings.add({
          profileId: newProfileId,
          fiscalYearStart: data.settings.fiscalYearStart,
          defaultGrantDate: data.settings.defaultGrantDate,
        });
      }

      if (data.grantRules.length > 0) {
        await database.grantRules.bulkAdd(
          data.grantRules.map((rule) => ({
            profileId: newProfileId,
            yearsOfService: rule.yearsOfService,
            grantDays: rule.grantDays,
          })),
        );
      }

      // refreshRules を先に追加し、旧 id → 新 id を作る（grant.ruleKey 再マップに必要）
      const ruleIdMap = new Map<number, number>();
      for (const rule of data.refreshRules) {
        const newId = await database.refreshRules.add({
          profileId: newProfileId,
          startDate: rule.startDate,
          intervalValue: rule.intervalValue,
          intervalUnit: rule.intervalUnit,
          grantDays: rule.grantDays,
          enabled: rule.enabled,
        });
        if (rule.id !== undefined) ruleIdMap.set(rule.id, newId);
      }

      // grants を追加し、ruleKey を再マップ。旧 grantId → 新 grantId を作る
      const grantIdMap = new Map<number, number>();
      for (const grant of data.grants) {
        const newId = await database.grants.add({
          profileId: newProfileId,
          leaveKind: grant.leaveKind ?? 'paid',
          fiscalYear: grant.fiscalYear,
          grantDate: grant.grantDate,
          expiryDate: grant.expiryDate,
          totalDays: grant.totalDays,
          source: grant.source,
          auto: grant.auto,
          ruleKey: remapRuleKey(grant.ruleKey, ruleIdMap),
          overridden: grant.overridden,
        });
        if (grant.id !== undefined) grantIdMap.set(grant.id, newId);
      }

      // usages の grantId を新 id へ再マップ
      for (const usage of data.usages) {
        await database.usages.add({
          profileId: newProfileId,
          date: usage.date,
          type: usage.type,
          status: usage.status,
          grantId: grantIdMap.get(usage.grantId) ?? usage.grantId,
          memo: usage.memo,
        });
      }

      return newProfileId;
    },
  );
}
