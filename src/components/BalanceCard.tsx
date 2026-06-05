import { Card } from './Card'
import { ProgressBar } from './ProgressBar'
import type { GrantBalance } from '../hooks/useLeaveBalance'

interface Props {
  balance: GrantBalance
}

export function BalanceCard({ balance }: Props) {
  const { source, fiscalYear, totalDays, plannedDays, usedDays, remainingDays, expiredDays, expiryDate, isExpired, isExpiringSoon } = balance
  const consumedDays = plannedDays + usedDays
  // 予定をすべて消化したと仮定したときの、じっさいに自由につかえるのこり
  const remainingAfterPlanned = remainingDays - plannedDays

  const borderColor = isExpired
    ? 'border-gray-300 border opacity-60'
    : isExpiringSoon
      ? 'border-peach border-2'
      : source === 'new'
        ? 'border-lavender border'
        : 'border-mint border'

  const sourceLabel = source === 'new' ? '新規付与' : '繰越'

  return (
    <Card className={borderColor}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            source === 'new'
              ? 'bg-lavender-light text-lavender-dark'
              : 'bg-mint-light text-mint-dark'
          }`}>
            {sourceLabel}
          </span>
          <span className="text-sm text-text-sub">{fiscalYear}年度</span>
        </div>
        {isExpired && (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            期限切れ
          </span>
        )}
        {isExpiringSoon && (
          <span className="text-xs font-medium text-peach-dark bg-peach-light px-2 py-0.5 rounded-full">
            まもなく消滅
          </span>
        )}
      </div>

      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-text">{remainingDays}</span>
          <span className="text-sm text-text-sub">/ {totalDays} 日のこり</span>
        </div>
        {plannedDays > 0 && (
          <p className="mt-1 text-xs text-text-sub">
            よていをひくと {remainingAfterPlanned}日
          </p>
        )}
      </div>

      <ProgressBar
        value={consumedDays + expiredDays}
        max={totalDays}
        color={source === 'new' ? 'bg-lavender' : 'bg-mint'}
        label=""
      />

      {/* Status breakdown */}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {usedDays > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-peach" />
            つかった {usedDays}日
          </span>
        )}
        {plannedDays > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-lavender" />
            よてい {plannedDays}日
          </span>
        )}
        {expiredDays > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
            消滅 {expiredDays}日
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-text-sub">
        有効期限: {expiryDate}
      </p>
    </Card>
  )
}
