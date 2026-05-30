import type { Grant } from '../db/types'
import { getGrantDaysByRule, type GrantRuleConfig } from './grant-rules'

/**
 * 入社日とルールから、付与されるべきGrant一覧を生成する。
 * 付与月は毎年12月（入社から0.5年後の12月が最初）。
 * 今日以前の付与のみ生成（未来の付与は含まない）。
 */
export function generateAutoGrants(
  hireDate: string,
  rules: GrantRuleConfig[],
  existingGrants: Grant[],
  today?: string,
): Omit<Grant, 'id' | 'profileId'>[] {
  if (!hireDate || rules.length === 0) return []

  const todayDate = today ? new Date(today) : new Date()
  const hire = new Date(hireDate)
  const hireYear = hire.getFullYear()
  const hireMonth = hire.getMonth() // 0-indexed

  // 最初の付与: 入社から約0.5年後の12月
  // 例: 2022年6月入社 → 2022年12月（6ヶ月後）
  // 例: 2022年1月入社 → 2022年12月（11ヶ月後、0.5年は超えている）
  // ルール: 入社年の12月が入社から6ヶ月以上後なら入社年12月、そうでなければ翌年12月
  let firstGrantYear: number
  const decemberOfHireYear = new Date(hireYear, 11, 1) // 12月1日
  const monthsDiff = (decemberOfHireYear.getFullYear() - hire.getFullYear()) * 12
    + decemberOfHireYear.getMonth() - hireMonth

  if (monthsDiff >= 6) {
    firstGrantYear = hireYear
  } else {
    firstGrantYear = hireYear + 1
  }

  const newGrants: Omit<Grant, 'id' | 'profileId'>[] = []
  const existingGrantDates = new Set(
    existingGrants.filter((g) => g.leaveKind === 'paid').map((g) => g.grantDate),
  )

  for (let year = firstGrantYear; ; year++) {
    const grantDate = `${year}-12-01`
    const grantDateObj = new Date(grantDate)

    // 今日より後の付与は生成しない
    if (grantDateObj > todayDate) break

    // 既に同じ付与日のGrantがあればスキップ
    if (existingGrantDates.has(grantDate)) continue

    // 入社日からの年数を計算
    const yearsOfService = (grantDateObj.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    const roundedYears = Math.round(yearsOfService * 10) / 10

    const totalDays = getGrantDaysByRule(rules, roundedYears)
    if (totalDays <= 0) continue

    // 消滅日: 付与日から2年後の前日
    const expiry = new Date(grantDateObj)
    expiry.setFullYear(expiry.getFullYear() + 2)
    expiry.setDate(expiry.getDate() - 1)

    // 年度: 付与月が12月なので、4月始まりなら同年度
    const fiscalYear = year

    newGrants.push({
      leaveKind: 'paid',
      fiscalYear,
      grantDate,
      expiryDate: expiry.toISOString().split('T')[0],
      totalDays,
      source: 'new',
    })
  }

  return newGrants
}
