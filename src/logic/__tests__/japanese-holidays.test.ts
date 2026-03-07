import { describe, it, expect } from 'vitest'
import { getHolidaysForYear, getHolidayMap } from '../japanese-holidays'

describe('getHolidaysForYear', () => {
  it('includes fixed holidays for 2026', () => {
    const holidays = getHolidaysForYear(2026)
    const dates = holidays.map((h) => h.date)
    expect(dates).toContain('2026-01-01') // 元日
    expect(dates).toContain('2026-02-11') // 建国記念の日
    expect(dates).toContain('2026-02-23') // 天皇誕生日
    expect(dates).toContain('2026-04-29') // 昭和の日
    expect(dates).toContain('2026-05-03') // 憲法記念日
    expect(dates).toContain('2026-05-04') // みどりの日
    expect(dates).toContain('2026-05-05') // こどもの日
    expect(dates).toContain('2026-08-11') // 山の日
    expect(dates).toContain('2026-11-03') // 文化の日
    expect(dates).toContain('2026-11-23') // 勤労感謝の日
  })

  it('calculates Happy Monday holidays for 2026', () => {
    const holidays = getHolidaysForYear(2026)
    const map = new Map(holidays.map((h) => [h.date, h.name]))
    // 2026-01-12 is 2nd Monday of January
    expect(map.get('2026-01-12')).toBe('\u6210\u4eba\u306e\u65e5')
    // 2026-07-20 is 3rd Monday of July
    expect(map.get('2026-07-20')).toBe('\u6d77\u306e\u65e5')
  })

  it('calculates spring equinox for 2026', () => {
    const holidays = getHolidaysForYear(2026)
    const map = new Map(holidays.map((h) => [h.date, h.name]))
    expect(map.get('2026-03-20')).toBe('\u6625\u5206\u306e\u65e5')
  })

  it('generates substitute holidays when holiday falls on Sunday', () => {
    // 2026-09-23 is Wednesday, so no substitute
    // Check 2023: 2023-02-11 (Sat), 2023-02-23 (Thu) - no substitutes
    // 2023-01-01 is Sunday -> substitute on 2023-01-02
    const holidays2023 = getHolidaysForYear(2023)
    const map = new Map(holidays2023.map((h) => [h.date, h.name]))
    expect(map.get('2023-01-02')).toBe('\u632f\u66ff\u4f11\u65e5')
  })

  it('returns sorted holidays', () => {
    const holidays = getHolidaysForYear(2026)
    for (let i = 1; i < holidays.length; i++) {
      expect(holidays[i].date >= holidays[i - 1].date).toBe(true)
    }
  })
})

describe('getHolidayMap', () => {
  it('returns only holidays for the specified month', () => {
    const map = getHolidayMap(2026, 0) // January (0-indexed)
    expect(map.size).toBeGreaterThanOrEqual(2) // 元日 + 成人の日
    for (const [date] of map) {
      expect(date.startsWith('2026-01')).toBe(true)
    }
  })

  it('returns empty map for months with no holidays', () => {
    // June typically has no holidays
    const map = getHolidayMap(2026, 5) // June
    expect(map.size).toBe(0)
  })
})
