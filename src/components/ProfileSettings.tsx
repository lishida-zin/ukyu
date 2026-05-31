import { useRef, useState } from 'react'
import type { Profile } from '../db/types'
import { useProfiles } from '../hooks/useProfiles'
import { useSetActiveProfile } from '../contexts/ActiveProfileContext'

const PROFILE_COLORS = ['#C4B5FD', '#A7F3D0', '#FECDD3', '#FDE68A', '#BFDBFE'] as const

// iOS 風のフォーム入力スタイル（大きめタップ領域・角丸・明確なフォーカスリング）
const FIELD_CLASS =
  'mt-1 w-full rounded-xl border border-surface bg-surface-bright px-4 py-3 text-base leading-relaxed text-text focus:border-lavender focus:outline-none focus:ring-2 focus:ring-lavender/40'

function ProfileRow({
  profile,
  canDelete,
  onUpdate,
  onDelete,
  onExport,
}: {
  profile: Profile
  canDelete: boolean
  onUpdate: (id: number, changes: Partial<Omit<Profile, 'id'>>) => void
  onDelete: (id: number, name: string) => void
  onExport: (id: number, name: string) => void
}) {
  const id = profile.id
  // ローカル state で入力（IME 変換中に DB へ書かず composition を壊さない）
  const [name, setName] = useState(profile.name)
  const [hireDate, setHireDate] = useState(profile.hireDate)
  const [order, setOrder] = useState(String(profile.order))
  const deleteDisabled = !canDelete || id === undefined

  function commitName() {
    if (id !== undefined && name.trim() && name !== profile.name) {
      onUpdate(id, { name: name.trim() })
    }
  }
  function commitOrder() {
    if (id === undefined) return
    const n = Number(order)
    if (!Number.isNaN(n) && n !== profile.order) onUpdate(id, { order: n })
  }

  return (
    <div className="rounded-2xl border-2 border-surface bg-surface p-3">
      <div className="grid gap-3">
        <div>
          <label htmlFor={`profile-name-${id}`} className="block text-sm font-bold leading-relaxed">
            なまえ
          </label>
          <input
            id={`profile-name-${id}`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            enterKeyHint="done"
            className={FIELD_CLASS}
          />
        </div>

        <div>
          <p className="text-sm font-bold leading-relaxed">いろ</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {PROFILE_COLORS.map((color) => {
              const selected = profile.color === color
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`${profile.name} の色 ${color}`}
                  aria-pressed={selected}
                  onClick={() => {
                    if (id !== undefined) onUpdate(id, { color })
                  }}
                  className={`min-h-11 min-w-11 rounded-full border-2 transition-colors ${
                    selected ? 'border-lavender-dark shadow-sm' : 'border-surface-bright'
                  }`}
                  style={{ backgroundColor: color }}
                />
              )
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={`profile-hire-date-${id}`} className="block text-sm font-bold leading-relaxed">
              にゅうしゃ日
            </label>
            <input
              id={`profile-hire-date-${id}`}
              type="date"
              value={hireDate}
              onChange={(e) => {
                setHireDate(e.target.value)
                if (id !== undefined) onUpdate(id, { hireDate: e.target.value })
              }}
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor={`profile-order-${id}`} className="block text-sm font-bold leading-relaxed">
              ならび順
            </label>
            <input
              id={`profile-order-${id}`}
              type="number"
              inputMode="numeric"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              onBlur={commitOrder}
              className={FIELD_CLASS}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            aria-label={`${profile.name} を書き出す`}
            onClick={() => {
              if (id !== undefined) onExport(id, profile.name)
            }}
            className="min-h-[44px] flex-1 rounded-xl border border-lavender-dark px-3 py-2 text-base font-bold leading-relaxed text-lavender-dark transition-colors hover:bg-lavender-light active:scale-95"
          >
            書き出す
          </button>
          <button
            type="button"
            aria-label={`${profile.name} を削除`}
            disabled={deleteDisabled}
            onClick={() => {
              if (id !== undefined) onDelete(id, profile.name)
            }}
            className="min-h-[44px] flex-1 rounded-xl border border-peach px-3 py-2 text-base font-bold leading-relaxed text-peach-dark transition-colors hover:bg-peach-light disabled:cursor-not-allowed disabled:border-surface disabled:text-text-sub disabled:opacity-60"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProfileSettings() {
  const { profiles, addProfile, updateProfile, deleteProfile, exportProfile, importProfile } =
    useProfiles()
  const setActiveProfile = useSetActiveProfile()
  const [newName, setNewName] = useState('')
  const importInputRef = useRef<HTMLInputElement>(null)

  const visibleProfiles = profiles ?? []
  const canDelete = visibleProfiles.length > 1

  async function handleAddProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    await addProfile({
      name,
      color: PROFILE_COLORS[visibleProfiles.length % PROFILE_COLORS.length],
      hireDate: '',
    })
    setNewName('')
  }

  async function handleDeleteProfile(id: number, name: string) {
    const confirmed = window.confirm(`${name} を削除しますか？`)
    if (!confirmed) return
    await deleteProfile(id)
  }

  async function handleExportProfile(id: number, name: string) {
    const json = await exportProfile(id)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ukyu-profile-${name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const newId = await importProfile(text)
      setActiveProfile(newId)
      window.alert('プロフィールを読み込んで、そのタブに切り替えました')
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '読み込みに失敗しました')
    }
    if (importInputRef.current) importInputRef.current.value = ''
  }

  if (profiles === undefined) {
    return (
      <p role="status" aria-live="polite" className="text-sm leading-relaxed text-text-sub">
        読み込み中...
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {visibleProfiles.map((profile) => (
          <ProfileRow
            key={profile.id ?? profile.name}
            profile={profile}
            canDelete={canDelete}
            onUpdate={(id, changes) => void updateProfile(id, changes)}
            onDelete={(id, name) => void handleDeleteProfile(id, name)}
            onExport={(id, name) => void handleExportProfile(id, name)}
          />
        ))}
      </div>

      <form onSubmit={handleAddProfile} className="rounded-2xl border-2 border-dashed border-lavender/70 bg-surface p-3">
        <label htmlFor="new-profile-name" className="block text-sm font-bold leading-relaxed">
          プロフィールをついか
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="new-profile-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="なまえ"
            enterKeyHint="done"
            className="min-w-0 flex-1 rounded-xl border border-surface bg-surface-bright px-4 py-3 text-base leading-relaxed text-text focus:border-lavender focus:outline-none focus:ring-2 focus:ring-lavender/40"
          />
          <button
            type="submit"
            disabled={newName.trim().length === 0}
            className="min-h-[44px] rounded-xl bg-lavender-dark px-4 py-2 text-base font-bold leading-relaxed text-surface-bright transition-transform active:scale-95 disabled:bg-surface disabled:text-text-sub"
          >
            ついか
          </button>
        </div>
      </form>

      <div className="rounded-2xl border-2 border-dashed border-mint/70 bg-surface p-3">
        <p className="text-sm font-bold leading-relaxed">プロフィールを読み込む</p>
        <p className="mt-1 text-xs leading-relaxed text-text-sub">
          書き出したファイルを読み込むと、新しいタブとして追加して そのタブに切り替えます
        </p>
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="mt-2 min-h-[44px] rounded-xl bg-mint-dark px-4 py-2 text-base font-bold leading-relaxed text-surface-bright transition-transform active:scale-95"
        >
          ファイルを読み込む
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>
    </div>
  )
}
