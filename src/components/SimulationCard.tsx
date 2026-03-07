import { Card } from './Card'
import { simulateUsage } from '../logic/leave-calculator'

interface Props {
  remainingDays: number
}

export function SimulationCard({ remainingDays }: Props) {
  if (remainingDays <= 0) {
    return (
      <Card>
        <h3 className="text-sm font-medium text-text-sub mb-2">取得シミュレーション</h3>
        <p className="text-sm text-text-sub">残日数がありません</p>
      </Card>
    )
  }

  const patterns = simulateUsage(remainingDays)

  return (
    <Card>
      <h3 className="text-sm font-medium text-text-sub mb-3">取得シミュレーション</h3>
      <ul className="space-y-2">
        {patterns.map((pattern, i) => (
          <li
            key={i}
            className="flex items-center gap-2 text-sm"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-lavender" />
            {pattern.fullDays > 0 && (
              <span>全休 <strong>{pattern.fullDays}</strong> 日</span>
            )}
            {pattern.fullDays > 0 && pattern.halfDays > 0 && (
              <span className="text-text-sub">+</span>
            )}
            {pattern.halfDays > 0 && (
              <span>半休 <strong>{pattern.halfDays}</strong> 回</span>
            )}
            {pattern.fullDays === 0 && pattern.halfDays === 0 && (
              <span className="text-text-sub">なし</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
