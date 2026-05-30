import { useState } from 'react'
import type { Usage, UsageType, UsageStatus } from '../db/types'
import { getHolidayMap } from '../logic/japanese-holidays'
import { useSwipe } from '../hooks/useSwipe'

interface Props {
  usages: Usage[]
  onDateClick: (date: string) => void
  initialMonth?: { year: number; month: number }
}

const WEEKDAYS = [
  { label: '日', className: 'text-red-500' },
  { label: '月', className: 'text-text-sub' },
  { label: '火', className: 'text-text-sub' },
  { label: '水', className: 'text-text-sub' },
  { label: '木', className: 'text-text-sub' },
  { label: '金', className: 'text-text-sub' },
  { label: '土', className: 'text-blue-500' },
]

const TYPE_LABEL: Record<UsageType, string> = {
  full: '全',
  am: '午前',
  pm: '午後',
}

const STATUS_STYLE: Record<UsageStatus, string> = {
  planned: 'bg-lavender-light text-lavender-dark border border-lavender',
  confirmed: 'bg-peach-light text-peach-dark border border-peach',
  used: 'bg-peach-light text-peach-dark border border-peach',
}

const STATUS_LABEL: Record<UsageStatus, string> = {
  planned: '予',
  confirmed: '済',
  used: '済',
}

function formatDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function Calendar({ usages, onDateClick, initialMonth }: Props) {
  const now = new Date()
  const [currentMonth, setCurrentMonth] = useState(
    initialMonth ?? { year: now.getFullYear(), month: now.getMonth() }
  )

  const { year, month } = currentMonth
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const usageMap = new Map<string, Usage[]>()
  for (const u of usages) {
    const list = usageMap.get(u.date) ?? []
    list.push(u)
    usageMap.set(u.date, list)
  }

  const holidayMap = getHolidayMap(year, month)
  const todayStr = formatDate(now.getFullYear(), now.getMonth(), now.getDate())

  function handlePrev() {
    setCurrentMonth((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 }
    )
  }

  function handleNext() {
    setCurrentMonth((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 }
    )
  }

  const swipeHandlers = useSwipe(handleNext, handlePrev)

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="rounded-2xl bg-surface-bright p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-lg text-text-sub hover:bg-lavender-light active:scale-95 transition-transform"
          aria-label="前月"
        >
          ←
        </button>
        <h2 className="text-xl font-bold leading-relaxed">
          {year}年 {month + 1}月
        </h2>
        <button
          type="button"
          onClick={handleNext}
          className="flex h-12 w-12 items-center justify-center rounded-xl text-lg text-text-sub hover:bg-lavender-light active:scale-95 transition-transform"
          aria-label="翌月"
        >
          →
        </button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 text-center text-lg font-bold">
        {WEEKDAYS.map((w) => (
          <div key={w.label} className={`py-1 ${w.className}`}>{w.label}</div>
        ))}
      </div>

      {/* Day cells */}
      <div
        className="grid grid-cols-7 gap-1"
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchEnd={swipeHandlers.onTouchEnd}
      >
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="min-h-[4.25rem]" />

          const dateStr = formatDate(year, month, day)
          const dayUsages = usageMap.get(dateStr)
          const isToday = dateStr === todayStr
          const dayOfWeek = (firstDay + day - 1) % 7
          const isSunday = dayOfWeek === 0
          const isSaturday = dayOfWeek === 6
          const holidayName = holidayMap.get(dateStr)
          const isHoliday = !!holidayName
          const isOff = isSunday || isSaturday || isHoliday

          // Day number color
          let dayColor = 'text-text'
          if (isSunday || isHoliday) dayColor = 'text-red-500'
          else if (isSaturday) dayColor = 'text-blue-500'

          // Background
          let bgClass = ''
          if (isToday) bgClass = 'bg-lavender-light ring-2 ring-lavender-dark'
          else if (isOff) bgClass = 'bg-gray-50'

          const usageInfo = dayUsages
            ? dayUsages.map((u) => `${TYPE_LABEL[u.type]}${STATUS_LABEL[u.status]}`).join(' ')
            : ''
          const ariaLabel = `${month + 1}月${day}日${holidayName ? ` ${holidayName}` : ''}${usageInfo ? ` ${usageInfo}` : ''}`

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDateClick(dateStr)}
              aria-label={ariaLabel}
              className={`flex min-h-[4.25rem] flex-col items-center justify-start gap-0.5 rounded-xl py-1 text-base active:scale-95 transition-all hover:bg-lavender-light ${bgClass}`}
            >
              <span className={`text-lg leading-tight font-bold ${dayColor}`}>{day}</span>
              {holidayName && !dayUsages && (
                <span className="text-[11px] leading-tight text-red-300 truncate max-w-full px-0.5">
                  {holidayName}
                </span>
              )}
              {dayUsages && dayUsages.map((u) => (
                <span
                  key={u.id}
                  className={`rounded px-1 text-sm font-bold leading-tight ${STATUS_STYLE[u.status]}`}
                >
                  {TYPE_LABEL[u.type]}{STATUS_LABEL[u.status]}
                </span>
              ))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
