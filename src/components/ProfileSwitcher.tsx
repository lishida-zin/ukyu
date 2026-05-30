import { useActiveProfileId, useSetActiveProfile } from '../contexts/ActiveProfileContext'
import { useProfiles } from '../hooks/useProfiles'

interface ProfileSwitcherProps {
  onAddProfileClick?: () => void
}

export function ProfileSwitcher({ onAddProfileClick }: ProfileSwitcherProps) {
  const { profiles } = useProfiles()
  const activeProfileId = useActiveProfileId()
  const setActiveProfile = useSetActiveProfile()

  const visibleProfiles = profiles ?? []

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <div role="tablist" className="flex min-w-max gap-1.5 rounded-2xl bg-surface p-1.5">
        {visibleProfiles.map((profile) => {
          const selected = profile.id === activeProfileId
          return (
            <button
              key={profile.id ?? profile.name}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-pressed={selected}
              onClick={() => {
                if (profile.id !== undefined) setActiveProfile(profile.id)
              }}
              className={`flex min-h-[54px] items-center gap-2 rounded-xl border-2 px-3 text-base font-bold leading-relaxed transition-colors ${
                selected
                  ? 'border-lavender-dark bg-surface-bright text-lavender-dark shadow-sm'
                  : 'border-transparent bg-surface text-text-sub hover:border-lavender/60 hover:bg-surface-bright'
              }`}
            >
              <span
                aria-hidden="true"
                className="h-5 w-5 shrink-0 rounded-full border-2 border-surface-bright shadow-sm"
                style={{ backgroundColor: profile.color }}
              />
              <span>{profile.name}</span>
              {selected && (
                <span className="rounded-full border border-lavender px-1.5 py-0.5 text-xs leading-relaxed">
                  せんたく中
                </span>
              )}
            </button>
          )
        })}

        <button
          type="button"
          role="tab"
          aria-selected={false}
          aria-pressed={false}
          onClick={onAddProfileClick}
          className="flex min-h-[54px] items-center rounded-xl border-2 border-dashed border-lavender/70 bg-surface px-3 text-base font-bold leading-relaxed text-lavender-dark transition-colors hover:bg-surface-bright"
        >
          ＋ ついか
        </button>
      </div>
    </div>
  )
}
