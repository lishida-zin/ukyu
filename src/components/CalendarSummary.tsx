interface Props {
  totalRemaining: number
  totalPlanned: number
  cycleUsed: number
  cyclePlanned: number
  cycleExpiringDays: number
  cycle?: { start: string; end: string }
}

export function CalendarSummary({ totalRemaining, totalPlanned, cycleUsed, cyclePlanned, cycleExpiringDays, cycle }: Props) {
  // サイクル期間の消滅期限表示
  const expiryLabel = cycle ? `${cycle.end}まで` : undefined
  // 予定をすべて消化したと仮定したときの、じっさいに自由につかえるのこり
  const remainingAfterPlanned = totalRemaining - totalPlanned

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* のこりカードには「現在の残り」と「予定を引いた残り」の 2 つを表示 */}
      <StatCard
        icon="✨"
        label="のこり"
        value={totalRemaining}
        unit="日"
        color="lavender"
        secondary={
          totalPlanned > 0
            ? { label: 'よていをひくと', value: remainingAfterPlanned, unit: '日' }
            : undefined
        }
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
  secondary,
}: {
  icon: string
  label: string
  value: number
  unit: string
  color: 'lavender' | 'peach' | 'mint' | 'warn'
  sub?: string
  secondary?: { label: string; value: number; unit: string }
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
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-bold opacity-80">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold">{value}</span>
        <span className="text-base font-medium opacity-70">{unit}</span>
      </div>
      {secondary && (
        <div className="mt-1.5 flex items-baseline gap-1 border-t border-current/15 pt-1.5">
          <span className="text-xs font-medium opacity-70">{secondary.label}</span>
          <span className="text-xl font-bold">{secondary.value}</span>
          <span className="text-xs font-medium opacity-70">{secondary.unit}</span>
        </div>
      )}
      {sub && (
        <p className="mt-0.5 text-xs opacity-60">{sub}</p>
      )}
    </div>
  )
}
