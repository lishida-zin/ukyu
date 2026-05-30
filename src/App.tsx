import { useState, useEffect, useRef } from 'react'
import { BottomNav, type TabId } from './components/BottomNav'
import { CalendarPage } from './pages/CalendarPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProfileSwitcher } from './components/ProfileSwitcher'
import { useGrants } from './hooks/useGrants'
import { useGrantRules } from './hooks/useGrantRules'
import { useActiveProfile, useActiveProfileId } from './contexts/ActiveProfileContext'
import { checkExpiringGrants, showExpiryNotification } from './logic/notifications'
import { generateAutoGrants } from './logic/auto-grant'
import { getDefaultGrantRules } from './logic/grant-rules'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('calendar')
  const [calendarTarget, setCalendarTarget] = useState<string | null>(null)
  const { grants, addGrant } = useGrants()
  const { rules } = useGrantRules()
  const activeProfile = useActiveProfile()
  const activeProfileId = useActiveProfileId()
  const autoGrantRan = useRef<number | undefined>(undefined)

  // Expiry notifications
  useEffect(() => {
    if (!grants || !grants.length) return
    const expiring = checkExpiringGrants(grants.filter((g) => g.leaveKind === 'paid'))
    expiring.forEach(showExpiryNotification)
  }, [grants])

  // Auto-grant on app load
  useEffect(() => {
    if (activeProfileId === undefined) return
    if (autoGrantRan.current === activeProfileId) return
    if (grants === undefined || rules === undefined) return
    if (!activeProfile?.hireDate) return

    autoGrantRan.current = activeProfileId
    const activeRules = (rules && rules.length > 0) ? rules : getDefaultGrantRules()
    const newGrants = generateAutoGrants(activeProfile.hireDate, activeRules, grants)
    if (newGrants.length > 0) {
      Promise.all(newGrants.map((g) => addGrant(g)))
    }
  }, [activeProfileId, activeProfile, grants, rules, addGrant])

  return (
    <div className="min-h-screen bg-bg text-text font-sans leading-relaxed">
      <main className="pb-20 px-4 pt-4">
        {activeTab === 'calendar' && (
          <>
            <ProfileSwitcher onAddProfileClick={() => setActiveTab('settings')} />
            <div className="mt-3">
              <CalendarPage
                initialDate={calendarTarget}
                onInitialDateConsumed={() => setCalendarTarget(null)}
              />
            </div>
          </>
        )}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
