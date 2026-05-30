import { useState } from 'react'
import type { Grant, Usage, UsageType, UsageStatus } from '../db/types'

interface Props {
  date: string
  grants: Grant[]
  existing?: Usage
  defaultStatus?: UsageStatus
  onSubmit: (data: {
    date: string
    type: UsageType
    status: UsageStatus
    grantId: number
    memo: string
  }) => void
  onDelete?: () => void
  onClose: () => void
}

const USAGE_TYPES: { value: UsageType; icon: string; label: string }[] = [
  { value: 'full', icon: '🌴', label: 'ぜんじつ' },
  { value: 'am', icon: '🌤️', label: 'ごぜん半休' },
  { value: 'pm', icon: '🌙', label: 'ごご半休' },
]

const USAGE_STATUSES: { value: UsageStatus; icon: string; label: string }[] = [
  { value: 'planned', icon: '📝', label: 'よてい' },
  { value: 'used', icon: '🎉', label: 'つかった' },
]

export function UsageForm({ date, grants, existing, defaultStatus, onSubmit, onDelete, onClose }: Props) {
  const [type, setType] = useState<UsageType>(existing?.type ?? 'full')
  const [status, setStatus] = useState<UsageStatus>(defaultStatus ?? existing?.status ?? 'planned')
  const [memo, setMemo] = useState(existing?.memo ?? '')

  // 古い付与（期限が近い順）から自動選択
  const grantId = existing?.grantId ?? grants[0]?.id

  const dateObj = new Date(date + 'T00:00:00')
  const displayDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`

  function handleSubmit() {
    if (grantId === undefined) return
    onSubmit({ date, type, status, grantId, memo })
  }

  return (
    <div className="space-y-5">
      <p className="text-center text-lg font-bold leading-relaxed">
        📅 {displayDate}
      </p>

      {/* Usage type */}
      <div>
        <div className="grid grid-cols-3 gap-2">
          {USAGE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              aria-pressed={type === t.value}
              className={`rounded-xl py-3 text-base font-medium leading-relaxed transition-colors ${
                type === t.value
                  ? 'bg-lavender text-surface-bright'
                  : 'bg-lavender-light text-text'
              }`}
            >
              <span className="block text-lg">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status */}
      <div>
        <div className="grid grid-cols-2 gap-2">
          {USAGE_STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setStatus(s.value)}
              aria-pressed={status === s.value}
              className={`rounded-xl py-3 text-base font-medium leading-relaxed transition-colors ${
                status === s.value
                  ? 'bg-mint text-surface-bright'
                  : 'bg-mint-light text-text'
              }`}
            >
              <span className="block text-lg">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Memo */}
      <div>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="りゆうなど"
          aria-label="メモ"
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base leading-relaxed focus:border-lavender focus:outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {existing && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl bg-peach-light px-4 py-3 text-base font-medium text-peach-dark transition-colors hover:bg-peach"
          >
            けす
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl bg-gray-100 py-3 text-base font-medium text-text-sub transition-colors hover:bg-gray-200"
        >
          やめる
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={grantId === undefined}
          className="flex-1 rounded-xl bg-lavender-dark py-3 text-base font-medium text-surface-bright transition-colors hover:opacity-90 disabled:opacity-40"
        >
          {existing ? 'こうしん' : 'とうろく'}
        </button>
      </div>
    </div>
  )
}
