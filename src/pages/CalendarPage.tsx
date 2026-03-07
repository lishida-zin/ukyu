import { useState, useEffect } from 'react'
import { useUsages } from '../hooks/useUsages'
import { useGrants } from '../hooks/useGrants'
import { useLeaveBalance } from '../hooks/useLeaveBalance'
import { Calendar } from '../components/Calendar'
import { CalendarSummary } from '../components/CalendarSummary'
import { SimulationCard } from '../components/SimulationCard'
import { Collapsible } from '../components/Collapsible'
import { Card } from '../components/Card'
import { UsageForm } from '../components/UsageForm'
import { Modal } from '../components/Modal'
import type { Usage } from '../db/types'

const TYPE_LABEL = { full: 'ぜんじつ', am: 'ごぜん半休', pm: 'ごご半休' } as const

function OverdueAlert({ overdueUsages, onDateClick }: { overdueUsages: Usage[]; onDateClick: (date: string) => void }) {
  if (overdueUsages.length === 0) return null

  return (
    <Card className="border-peach border-2 bg-peach-light">
      <p className="text-sm font-bold text-peach-dark mb-2">
        かくにん してね
      </p>
      <p className="text-xs text-text-sub mb-2 leading-relaxed">
        よていの日がすぎたけど、まだ「つかった」になっていないよ
      </p>
      <div className="space-y-1">
        {overdueUsages.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onDateClick(u.date)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-peach-dark hover:bg-surface-bright/40 transition-colors"
          >
            <span>{u.date}</span>
            <span className="rounded bg-surface-bright/60 px-1.5 py-0.5">
              {TYPE_LABEL[u.type]}
            </span>
            <span className="ml-auto text-peach-dark/60">タップでひらく</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

function PlannedList({ usages, onDateClick }: { usages: Usage[]; onDateClick: (date: string) => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const planned = usages
    .filter((u) => u.status === 'planned' && u.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (planned.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-sub text-center">よてい がないよ</p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {planned.map((u) => {
        const d = new Date(u.date + 'T00:00:00')
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
        const isSunday = d.getDay() === 0
        const isSaturday = d.getDay() === 6
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => onDateClick(u.date)}
            className="flex w-full items-center gap-3 rounded-2xl border-l-4 border-lavender bg-lavender-light/40 px-4 py-3 text-left hover:bg-lavender-light/60 transition-colors"
          >
            <span className={`text-sm font-bold ${isSunday ? 'text-red-400' : isSaturday ? 'text-blue-400' : 'text-text'}`}>
              {u.date.slice(5).replace('-', '/')}
              <span className="ml-1 text-xs font-normal">({weekday})</span>
            </span>
            <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-lavender-light text-lavender-dark">
              {TYPE_LABEL[u.type]}
            </span>
            {u.memo && (
              <span className="ml-auto text-xs text-text-sub truncate max-w-[8rem]">
                {u.memo}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function UsageHistory({ usages, onDateClick }: { usages: Usage[]; onDateClick: (date: string) => void }) {
  const used = usages.filter((u) => u.status !== 'planned')
  const sorted = [...used].sort((a, b) => b.date.localeCompare(a.date))
  if (sorted.length === 0) {
    return (
      <Card>
        <p className="text-sm text-text-sub text-center">まだ りれき がないよ</p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map((u) => {
        const d = new Date(u.date + 'T00:00:00')
        const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
        const isSunday = d.getDay() === 0
        const isSaturday = d.getDay() === 6
        return (
          <button
            key={u.id}
            type="button"
            onClick={() => onDateClick(u.date)}
            className="flex w-full items-center gap-3 rounded-2xl border-l-4 border-peach bg-peach-light/40 px-4 py-3 text-left hover:bg-peach-light/60 transition-colors"
          >
            <span className={`text-sm font-bold ${isSunday ? 'text-red-400' : isSaturday ? 'text-blue-400' : 'text-text'}`}>
              {u.date.slice(5).replace('-', '/')}
              <span className="ml-1 text-xs font-normal">({weekday})</span>
            </span>
            <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-peach-light text-peach-dark">
              {TYPE_LABEL[u.type]}
            </span>
            {u.memo && (
              <span className="ml-auto text-xs text-text-sub truncate max-w-[8rem]">
                {u.memo}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface CalendarPageProps {
  initialDate?: string | null
  onInitialDateConsumed?: () => void
}

export function CalendarPage({ initialDate, onInitialDateConsumed }: CalendarPageProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isFromOverdue, setIsFromOverdue] = useState(false)

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate)
      setIsFromOverdue(true)
      onInitialDateConsumed?.()
    }
  }, [initialDate, onInitialDateConsumed])

  const { usages, addUsage, updateUsage, deleteUsage } = useUsages()
  const { grants } = useGrants()
  const { balances, totalRemaining, cycleUsed, cyclePlanned, cycleExpiringDays, cycle } = useLeaveBalance()

  const today = new Date().toISOString().slice(0, 10)
  const activeGrants = (grants ?? [])
    .filter((g) => g.expiryDate >= today)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))

  const existingUsage = selectedDate
    ? usages?.find((u) => u.date === selectedDate)
    : undefined

  const overdueUsages = (usages ?? []).filter(
    (u) => u.status === 'planned' && u.date < today,
  )

  // サイクル内のusagesのみ（リスト表示用）
  const cycleUsages = cycle
    ? (usages ?? []).filter((u) => u.date >= cycle.start && u.date <= cycle.end)
    : usages ?? []

  function handleDateClick(date: string) {
    setSelectedDate(date)
    setIsFromOverdue(false)
  }

  function handleOverdueDateClick(date: string) {
    setSelectedDate(date)
    setIsFromOverdue(true)
  }

  async function handleSubmit(data: {
    date: string
    type: 'full' | 'am' | 'pm'
    status: 'planned' | 'confirmed' | 'used'
    grantId: number
    memo: string
  }) {
    if (existingUsage?.id) {
      await updateUsage(existingUsage.id, data)
    } else {
      await addUsage(data)
    }
    setSelectedDate(null)
  }

  async function handleDelete() {
    if (existingUsage?.id) {
      await deleteUsage(existingUsage.id)
      setSelectedDate(null)
    }
  }

  if (usages === undefined || grants === undefined) {
    return <div role="status" aria-live="polite" className="py-8 text-center text-text-sub">読み込み中...</div>
  }

  return (
    <div className="space-y-4 pb-24">
      <Calendar
        usages={usages}
        onDateClick={handleDateClick}
        initialMonth={initialDate ? {
          year: parseInt(initialDate.slice(0, 4)),
          month: parseInt(initialDate.slice(5, 7)) - 1,
        } : undefined}
      />

      {balances && balances.length > 0 && (
        <CalendarSummary
          totalRemaining={totalRemaining}
          cycleUsed={cycleUsed}
          cyclePlanned={cyclePlanned}
          cycleExpiringDays={cycleExpiringDays}
          cycle={cycle}
        />
      )}

      {/* 過期アラート */}
      <OverdueAlert overdueUsages={overdueUsages} onDateClick={handleOverdueDateClick} />

      {/* 予定 */}
      <Collapsible title={`つぎのよてい（${cyclePlanned}日）`} defaultOpen={true} color="lavender">
        <PlannedList usages={cycleUsages} onDateClick={handleDateClick} />
      </Collapsible>

      {/* 履歴 */}
      <Collapsible title={`つかったりれき（${cycleUsed}日）`} defaultOpen={true} color="peach">
        <UsageHistory usages={cycleUsages} onDateClick={handleDateClick} />
      </Collapsible>

      {/* シミュレーション */}
      <Collapsible title="シミュレーション" defaultOpen={false} color="mint">
        <SimulationCard remainingDays={totalRemaining} />
      </Collapsible>

      <Modal
        open={selectedDate !== null}
        onClose={() => { setSelectedDate(null); setIsFromOverdue(false) }}
        title={existingUsage ? '有給へんしゅう' : '有給とうろく'}
      >
        {selectedDate && activeGrants.length > 0 ? (
          <UsageForm
            date={selectedDate}
            grants={activeGrants}
            existing={existingUsage}
            defaultStatus={isFromOverdue ? 'used' : undefined}
            onSubmit={handleSubmit}
            onDelete={existingUsage ? handleDelete : undefined}
            onClose={() => { setSelectedDate(null); setIsFromOverdue(false) }}
          />
        ) : (
          <div className="py-4 text-center text-text-sub">
            <p className="mb-2 text-3xl">📋</p>
            <p className="text-sm leading-relaxed">
              せっていがめんで ふよじょうほうを とうろくしてください
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
