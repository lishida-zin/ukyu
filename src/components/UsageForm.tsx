import { useState } from 'react'
import type { Grant, Usage, UsageType, UsageStatus, LeaveKind } from '../db/types'

interface Props {
  date: string
  paidGrants: Grant[]
  refreshGrants: Grant[]
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
  onOpenSettings?: () => void
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

const LEAVE_KINDS: { value: LeaveKind; icon: string; label: string }[] = [
  { value: 'paid', icon: '🏖️', label: '有給' },
  { value: 'refresh', icon: '🌿', label: 'リフレッシュ' },
]

export function UsageForm({ date, paidGrants, refreshGrants, existing, defaultStatus, onSubmit, onDelete, onClose, onOpenSettings }: Props) {
  const initialKind: LeaveKind = existing
    ? refreshGrants.some((g) => g.id === existing.grantId)
      ? 'refresh'
      : 'paid'
    : paidGrants.length > 0
      ? 'paid'
      : 'refresh'
  const [kind, setKind] = useState<LeaveKind>(initialKind)
  const [type, setType] = useState<UsageType>(existing?.type ?? 'full')
  const [status, setStatus] = useState<UsageStatus>(defaultStatus ?? existing?.status ?? 'planned')
  const [memo, setMemo] = useState(existing?.memo ?? '')

  const showKindToggle = refreshGrants.length > 0
  const pool = kind === 'refresh' ? refreshGrants : paidGrants
  // 選択中の種別に既存付与があればそれを、無ければ期限が近い付与を自動選択
  const grantId =
    existing && pool.some((g) => g.id === existing.grantId)
      ? existing.grantId
      : pool[0]?.id

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

      {/* リフレッシュ休暇が未設定のときは、設定への導線を出す */}
      {!showKindToggle && onOpenSettings && (
        <div className="rounded-xl border-2 border-mint/60 bg-mint-light/40 px-3 py-2.5 leading-relaxed text-mint-dark">
          <p className="text-sm font-bold">🌿 リフレッシュ休暇も とうろくできます</p>
          <p className="mt-1 text-sm text-text-sub">
            せっていで「ゆうこうにする」をオンにすると、ここで有給とえらべるようになります。
          </p>
          <button
            type="button"
            onClick={onOpenSettings}
            className="mt-2 rounded-lg border border-mint-dark bg-surface-bright px-3 py-1.5 text-sm font-bold text-mint-dark transition-transform active:scale-95"
          >
            せっていをひらく →
          </button>
        </div>
      )}

      {/* 休暇の種類（リフレッシュ休暇がある場合のみ選択可） */}
      {showKindToggle && (
        <div>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="きゅうかの種類">
            {LEAVE_KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                aria-pressed={kind === k.value}
                className={`rounded-xl border-2 py-3 text-base font-medium leading-relaxed transition-colors ${
                  kind === k.value
                    ? 'border-lavender-dark bg-surface-bright text-lavender-dark shadow-sm'
                    : 'border-surface bg-surface text-text-sub'
                }`}
              >
                <span className="block text-lg">{k.icon}</span>
                {k.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
