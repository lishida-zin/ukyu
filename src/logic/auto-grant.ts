import type { Grant } from '../db/types'
import { getGrantDaysByRule, type GrantRuleConfig } from './grant-rules'
import { getGrantMonth } from './grant-cycle'

function toLocalISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 入社日とルールから、付与されるべき Grant 一覧を生成する。
 * 付与は「基準日」方式: 入社日の6ヶ月後の月（getGrantMonth と一致）の1日に初回付与し、
 * 以後は毎年その月の1日に付与する。今日以前の付与のみ生成（未来は含まない）。
 */
export function generateAutoGrants(
  hireDate: string,
  rules: GrantRuleConfig[],
  existingGrants: Grant[],
  today?: string,
): Omit<Grant, 'id' | 'profileId'>[] {
  if (!hireDate || rules.length === 0) return []

  const todayDate = today ? new Date(today + 'T00:00:00') : new Date()
  const hire = new Date(hireDate + 'T00:00:00')

  // 付与月（0-indexed）。サイクル計算 getGrantMonth と同一の「入社月+6ヶ月」。
  const grantMonth0 = getGrantMonth(hireDate) - 1
  // 初回付与 = 入社の6ヶ月後の月の1日
  const firstGrant = new Date(hire.getFullYear(), hire.getMonth() + 6, 1)
  const firstGrantYear = firstGrant.getFullYear()

  const newGrants: Omit<Grant, 'id' | 'profileId'>[] = []
  const existingGrantDates = new Set(
    existingGrants.filter((g) => g.leaveKind === 'paid').map((g) => g.grantDate),
  )

  for (let year = firstGrantYear; ; year++) {
    const grantDateObj = new Date(year, grantMonth0, 1)

    // 今日より後の付与は生成しない
    if (grantDateObj > todayDate) break

    const grantDate = toLocalISO(grantDateObj)

    // 既に同じ付与日の有給があればスキップ
    if (existingGrantDates.has(grantDate)) continue

    // 入社日からの勤続年数
    const yearsOfService =
      (grantDateObj.getTime() - hire.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    const roundedYears = Math.round(yearsOfService * 10) / 10

    const totalDays = getGrantDaysByRule(rules, roundedYears)
    if (totalDays <= 0) continue

    // 消滅日: 付与日から2年後の前日
    const expiry = new Date(grantDateObj)
    expiry.setFullYear(expiry.getFullYear() + 2)
    expiry.setDate(expiry.getDate() - 1)

    newGrants.push({
      leaveKind: 'paid',
      fiscalYear: year,
      grantDate,
      expiryDate: toLocalISO(expiry),
      totalDays,
      source: 'new',
    })
  }

  return newGrants
}
