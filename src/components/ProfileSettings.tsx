import { useState } from 'react'
import { useProfiles } from '../hooks/useProfiles'

const PROFILE_COLORS = ['#C4B5FD', '#A7F3D0', '#FECDD3', '#FDE68A', '#BFDBFE'] as const

export function ProfileSettings() {
  const { profiles, addProfile, updateProfile, deleteProfile } = useProfiles()
  const [newName, setNewName] = useState('')

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
        {visibleProfiles.map((profile) => {
          const deleteDisabled = !canDelete || profile.id === undefined
          return (
            <div
              key={profile.id ?? profile.name}
              className="rounded-2xl border-2 border-surface bg-surface p-3"
            >
              <div className="grid gap-3">
                <div>
                  <label
                    htmlFor={`profile-name-${profile.id ?? profile.order}`}
                    className="block text-sm font-bold leading-relaxed"
                  >
                    なまえ
                  </label>
                  <input
                    id={`profile-name-${profile.id ?? profile.order}`}
                    type="text"
                    value={profile.name}
                    onChange={(e) => {
                      if (profile.id !== undefined) {
                        void updateProfile(profile.id, { name: e.target.value })
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-surface bg-surface-bright px-3 py-2 text-base leading-relaxed text-text"
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
                            if (profile.id !== undefined) {
                              void updateProfile(profile.id, { color })
                            }
                          }}
                          className={`min-h-10 min-w-10 rounded-full border-2 transition-colors ${
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
                    <label
                      htmlFor={`profile-hire-date-${profile.id ?? profile.order}`}
                      className="block text-sm font-bold leading-relaxed"
                    >
                      にゅうしゃ日
                    </label>
                    <input
                      id={`profile-hire-date-${profile.id ?? profile.order}`}
                      type="date"
                      value={profile.hireDate}
                      onChange={(e) => {
                        if (profile.id !== undefined) {
                          void updateProfile(profile.id, { hireDate: e.target.value })
                        }
                      }}
                      className="mt-1 w-full rounded-xl border border-surface bg-surface-bright px-3 py-2 text-base leading-relaxed text-text"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor={`profile-order-${profile.id ?? profile.order}`}
                      className="block text-sm font-bold leading-relaxed"
                    >
                      ならび順
                    </label>
                    <input
                      id={`profile-order-${profile.id ?? profile.order}`}
                      type="number"
                      value={profile.order}
                      onChange={(e) => {
                        if (profile.id !== undefined) {
                          void updateProfile(profile.id, { order: Number(e.target.value) })
                        }
                      }}
                      className="mt-1 w-full rounded-xl border border-surface bg-surface-bright px-3 py-2 text-base leading-relaxed text-text"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={`${profile.name} を削除`}
                  disabled={deleteDisabled}
                  onClick={() => {
                    if (profile.id !== undefined) {
                      void handleDeleteProfile(profile.id, profile.name)
                    }
                  }}
                  className="min-h-[44px] rounded-xl border border-peach px-3 py-2 text-base font-bold leading-relaxed text-peach-dark transition-colors hover:bg-peach-light disabled:cursor-not-allowed disabled:border-surface disabled:text-text-sub disabled:opacity-60"
                >
                  削除
                </button>
              </div>
            </div>
          )
        })}
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
            className="min-w-0 flex-1 rounded-xl border border-surface bg-surface-bright px-3 py-2 text-base leading-relaxed text-text"
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
    </div>
  )
}
