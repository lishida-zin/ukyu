/**
 * 付与サイクル（付与月〜翌年の付与月前月末）を計算する。
 * 付与月は入社日の6ヶ月後の月。
 * 例: 6月入社→12月付与、4月入社→10月付与、8月入社→2月付与
 */

function fmt(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** 入社日から付与月を計算する（1-indexed）。入社から6ヶ月後の月。 */
export function getGrantMonth(hireDate?: string): number {
  if (!hireDate) return 12 // デフォルト12月
  const hire = new Date(hireDate + 'T00:00:00')
  const hireMonth0 = hire.getMonth() // 0-indexed
  return ((hireMonth0 + 6) % 12) + 1
}

/** 現在の付与サイクル期間を計算する */
export function getCurrentCycle(grantMonth: number, today?: string): { start: string; end: string } {
  const now = today ? new Date(today + 'T00:00:00') : new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-indexed

  const cycleStartYear = month >= grantMonth ? year : year - 1
  const start = fmt(cycleStartYear, grantMonth, 1)

  // end = サイクル開始の翌年の付与月前月の末日
  const endDate = new Date(cycleStartYear + 1, grantMonth - 1, 0)
  const end = fmt(endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate())

  return { start, end }
}
