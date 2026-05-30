import type { Grant, RefreshRule, IntervalUnit } from '../db/types';

export function addInterval(date: Date, value: number, unit: IntervalUnit): Date {
  const d = new Date(date);
  if (unit === 'year') d.setFullYear(d.getFullYear() + value);
  else d.setMonth(d.getMonth() + value);
  return d;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * リフレッシュ休暇ルールから付与 Grant を生成（ハイブリッド）。
 * - grantDate(k) = startDate + intervalValue*k（asOf 以前のみ）
 * - expiryDate(k) = grantDate(k+1) の前日（= 次回更新でリセット）
 * - ruleKey = `${rule.id}#${k}`（冪等キー）
 * - existing 内で overridden=true の ruleKey はスキップ（手動修正を保護）
 * - now/asOf は呼び出し側が 'YYYY-MM-DD' で注入（DI、テスト容易性）
 */
export function generateRefreshGrants(
  rule: RefreshRule,
  asOf: string,
  existing: Grant[],
): Omit<Grant, 'id'>[] {
  if (!rule.enabled || !rule.startDate || rule.grantDays <= 0 || rule.id === undefined) {
    return [];
  }
  const asOfDate = new Date(asOf + 'T00:00:00');
  const start = new Date(rule.startDate + 'T00:00:00');
  const overriddenKeys = new Set(
    existing.filter((g) => g.overridden && g.ruleKey).map((g) => g.ruleKey),
  );

  const out: Omit<Grant, 'id'>[] = [];
  for (let k = 0; k < 500; k++) {
    const grantDate = addInterval(start, rule.intervalValue * k, rule.intervalUnit);
    if (grantDate > asOfDate) break;

    const next = addInterval(start, rule.intervalValue * (k + 1), rule.intervalUnit);
    const expiry = new Date(next);
    expiry.setDate(expiry.getDate() - 1); // 次回付与日の前日

    const ruleKey = `${rule.id}#${k}`;
    if (overriddenKeys.has(ruleKey)) continue;

    out.push({
      profileId: rule.profileId,
      leaveKind: 'refresh',
      fiscalYear: grantDate.getFullYear(),
      grantDate: toISO(grantDate),
      expiryDate: toISO(expiry),
      totalDays: rule.grantDays,
      source: 'new',
      auto: true,
      ruleKey,
    });
  }
  return out;
}
