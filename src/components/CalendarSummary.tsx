interface Props {
  totalRemaining: number
  cycleUsed: number
  cyclePlanned: number
  cycleExpiringDays: number
  cycle?: { start: string; end: string }
}

export function CalendarSummary({ totalRemaining, cycleUsed, cyclePlanned, cycleExpiringDays, cycle }: Props) {
  // サイクル期間の消滅期限表示
  const expiryLabel = cycle ? `${cycle.end}まで` : undefined

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard
        icon="✨"
        label="のこり"
        value={totalRemaining}
        unit="日"
        color="lavender"
      />
      <StatCard
        icon="🎉"
        label="つかった"
        value={cycleUsed}
        unit="日"
        color="peach"
      />
      <StatCard
        icon="⏳"
        label="しょうめつ"
        value={cycleExpiringDays}
        unit="日"
        color={cycleExpiringDays > 0 ? 'warn' : 'mint'}
        sub={cycleExpiringDays > 0 ? expiryLabel : undefined}
      />
      <StatCard
        icon="📝"
        label="よてい"
        value={cyclePlanned}
        unit="日"
        color="mint"
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  unit,
  color,
  sub,
}: {
  icon: string
  label: string
  value: number
  unit: string
  color: 'lavender' | 'peach' | 'mint' | 'warn'
  sub?: string
}) {
  const styles = {
    lavender: 'bg-lavender-light/40 text-lavender-dark border-lavender/50',
    peach: 'bg-peach-light/40 text-peach-dark border-peach/50',
    mint: 'bg-mint-light/40 text-mint-dark border-mint/50',
    warn: 'bg-amber-50 text-amber-600 border-amber-300/50',
  }

  return (
    <div className={`rounded-2xl border-2 px-4 py-3 ${styles[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-bold opacity-80">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm font-medium opacity-70">{unit}</span>
      </div>
      {sub && (
        <p className="mt-0.5 text-[10px] opacity-60">{sub}</p>
      )}
    </div>
  )
}
