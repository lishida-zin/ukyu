import type { Grant, Usage, Settings, GrantRule } from '../db/types';

export interface ExportData {
  grants: Grant[];
  usages: Usage[];
  settings: Settings;
  grantRules?: GrantRule[];
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

  return data;
}
