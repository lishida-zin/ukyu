import type { Grant, Usage, Settings, GrantRule, Profile, RefreshRule } from '../db/types';
import { buildDefaultProfile } from './migration';

export interface ExportData {
  grants: Grant[];
  usages: Usage[];
  // v2 は全プロフィールの settings を配列で持つ。単一オブジェクトは旧バックアップ互換。
  settings: Settings | Settings[];
  grantRules?: GrantRule[];
  profiles?: Profile[];
  refreshRules?: RefreshRule[];
}

export interface NormalizedImportData {
  grants: Grant[];
  usages: Usage[];
  settings: Settings[];
  grantRules: GrantRule[];
  profiles: Profile[];
  refreshRules: RefreshRule[];
}

export function exportToJson(data: ExportData): string {
  return JSON.stringify(data, null, 2);
}

function validateGrants(grants: unknown[]): void {
  const requiredFields = ['fiscalYear', 'grantDate', 'expiryDate', 'totalDays'] as const;
  for (let i = 0; i < grants.length; i++) {
    const g = grants[i];
    if (typeof g !== 'object' || g === null) {
      throw new Error(`grants[${i}] がオブジェクトではありません`);
    }
    for (const field of requiredFields) {
      if (!(field in g)) {
        throw new Error(`grants[${i}] に必須フィールド「${field}」がありません`);
      }
    }
  }
}

function validateUsages(usages: unknown[]): void {
  const requiredFields = ['date', 'type', 'status'] as const;
  for (let i = 0; i < usages.length; i++) {
    const u = usages[i];
    if (typeof u !== 'object' || u === null) {
      throw new Error(`usages[${i}] がオブジェクトではありません`);
    }
    for (const field of requiredFields) {
      if (!(field in u)) {
        throw new Error(`usages[${i}] に必須フィールド「${field}」がありません`);
      }
    }
  }
}

export function parseImportData(json: string): ExportData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('JSONの形式が正しくありません');
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as ExportData).grants) ||
    !Array.isArray((parsed as ExportData).usages) ||
    typeof (parsed as ExportData).settings !== 'object'
  ) {
    throw new Error('データの形式が正しくありません');
  }

  const data = parsed as ExportData;

  // Validate required fields
  validateGrants(data.grants);
  validateUsages(data.usages);

  // Validate grantRules if present (optional field)
  if ('grantRules' in data) {
    if (!Array.isArray(data.grantRules)) {
      throw new Error('grantRules が配列ではありません');
    }
  }
  if ('profiles' in data) {
    if (!Array.isArray(data.profiles)) {
      throw new Error('profiles が配列ではありません');
    }
  }
  if ('refreshRules' in data) {
    if (!Array.isArray(data.refreshRules)) {
      throw new Error('refreshRules が配列ではありません');
    }
  }

  return data;
}

export function normalizeImportDataForV2(
  data: ExportData,
  now: string,
): NormalizedImportData {
  if (data.profiles) {
    return {
      grants: data.grants,
      usages: data.usages,
      // 新形式は配列。旧v2(単一オブジェクト)は配列に正規化する。
      settings: Array.isArray(data.settings) ? data.settings : [data.settings],
      grantRules: data.grantRules ?? [],
      profiles: data.profiles,
      refreshRules: data.refreshRules ?? [],
    };
  }

  const profileId = 1;
  // v1 バックアップは単一 settings オブジェクト（hireDate を内包しうる）。
  const legacySettings = (Array.isArray(data.settings) ? data.settings[0] : data.settings) as
    (Settings & { hireDate?: string }) | undefined;
  const profile: Profile = {
    id: profileId,
    ...buildDefaultProfile(legacySettings?.hireDate, now),
  };
  const settings: Settings = {
    id: legacySettings?.id,
    profileId,
    fiscalYearStart: legacySettings?.fiscalYearStart ?? '',
    defaultGrantDate: legacySettings?.defaultGrantDate ?? '',
  };

  return {
    grants: data.grants.map((grant) => ({
      ...grant,
      profileId,
      leaveKind: grant.leaveKind ?? 'paid',
    })),
    usages: data.usages.map((usage) => ({
      ...usage,
      profileId,
    })),
    settings: [settings],
    grantRules: (data.grantRules ?? []).map((rule) => ({
      ...rule,
      profileId,
    })),
    profiles: [profile],
    refreshRules: [],
  };
}
