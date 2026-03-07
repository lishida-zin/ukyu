/**
 * Japanese national holidays calculator.
 * Covers 2020-2099. Includes substitute holidays.
 */

interface Holiday {
  date: string // YYYY-MM-DD
  name: string
}

/** Spring equinox approximation (valid ~2000-2099) */
function springEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

/** Autumn equinox approximation (valid ~2000-2099) */
function autumnEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4))
}

/** Get the Nth weekday of a month (e.g., 2nd Monday) */
function nthWeekday(year: number, month: number, weekday: number, n: number): number {
  const first = new Date(year, month - 1, 1).getDay()
  let day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7
  return day
}

function fmt(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Get all Japanese national holidays for a given year */
export function getHolidaysForYear(year: number): Holiday[] {
  const holidays: Holiday[] = []

  const add = (m: number, d: number, name: string) => {
    holidays.push({ date: fmt(year, m, d), name })
  }

  // Fixed holidays
  add(1, 1, '\u5143\u65e5')           // 元日
  add(2, 11, '\u5efa\u56fd\u8a18\u5ff5\u306e\u65e5') // 建国記念の日
  add(2, 23, '\u5929\u7687\u8a95\u751f\u65e5')       // 天皇誕生日
  add(4, 29, '\u662d\u548c\u306e\u65e5')             // 昭和の日
  add(5, 3, '\u61b2\u6cd5\u8a18\u5ff5\u65e5')        // 憲法記念日
  add(5, 4, '\u307f\u3069\u308a\u306e\u65e5')        // みどりの日
  add(5, 5, '\u3053\u3069\u3082\u306e\u65e5')        // こどもの日
  add(8, 11, '\u5c71\u306e\u65e5')                   // 山の日
  add(11, 3, '\u6587\u5316\u306e\u65e5')             // 文化の日
  add(11, 23, '\u52e4\u52b4\u611f\u8b1d\u306e\u65e5') // 勤労感謝の日

  // Happy Monday holidays
  add(1, nthWeekday(year, 1, 1, 2), '\u6210\u4eba\u306e\u65e5')   // 成人の日 (1月第2月曜)
  add(7, nthWeekday(year, 7, 1, 3), '\u6d77\u306e\u65e5')         // 海の日 (7月第3月曜)
  add(9, nthWeekday(year, 9, 1, 3), '\u656c\u8001\u306e\u65e5')   // 敬老の日 (9月第3月曜)
  add(10, nthWeekday(year, 10, 1, 2), '\u30b9\u30dd\u30fc\u30c4\u306e\u65e5') // スポーツの日 (10月第2月曜)

  // Equinox holidays
  add(3, springEquinoxDay(year), '\u6625\u5206\u306e\u65e5')  // 春分の日
  add(9, autumnEquinoxDay(year), '\u79cb\u5206\u306e\u65e5')  // 秋分の日

  // Substitute holidays (振替休日): when a holiday falls on Sunday, next Monday is off
  const holidayDates = new Set(holidays.map((h) => h.date))
  const substitutes: Holiday[] = []
  for (const h of holidays) {
    const d = new Date(h.date + 'T00:00:00')
    if (d.getDay() === 0) {
      // Find next non-holiday weekday
      let sub = new Date(d)
      do {
        sub.setDate(sub.getDate() + 1)
      } while (
        holidayDates.has(fmt(sub.getFullYear(), sub.getMonth() + 1, sub.getDate()))
      )
      const subStr = fmt(sub.getFullYear(), sub.getMonth() + 1, sub.getDate())
      substitutes.push({ date: subStr, name: '\u632f\u66ff\u4f11\u65e5' }) // 振替休日
      holidayDates.add(subStr)
    }
  }

  // National holiday between two holidays (国民の休日)
  // If a non-holiday weekday is sandwiched between two holidays, it becomes a holiday
  const allDates = new Set([...holidayDates, ...substitutes.map((s) => s.date)])
  for (const h of holidays) {
    const d = new Date(h.date + 'T00:00:00')
    const next = new Date(d)
    next.setDate(next.getDate() + 2)
    const nextStr = fmt(next.getFullYear(), next.getMonth() + 1, next.getDate())
    const between = new Date(d)
    between.setDate(between.getDate() + 1)
    const betweenStr = fmt(between.getFullYear(), between.getMonth() + 1, between.getDate())
    if (allDates.has(nextStr) && !allDates.has(betweenStr) && between.getDay() !== 0) {
      substitutes.push({ date: betweenStr, name: '\u56fd\u6c11\u306e\u4f11\u65e5' }) // 国民の休日
    }
  }

  return [...holidays, ...substitutes].sort((a, b) => a.date.localeCompare(b.date))
}

/** Get holidays for a specific month as a Map<dateStr, holidayName> */
export function getHolidayMap(year: number, month: number): Map<string, string> {
  const holidays = getHolidaysForYear(year)
  const map = new Map<string, string>()
  const prefix = fmt(year, month + 1, 1).slice(0, 7) // "YYYY-MM"
  for (const h of holidays) {
    if (h.date.startsWith(prefix)) {
      map.set(h.date, h.name)
    }
  }
  return map
}
