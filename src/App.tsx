import { useState, useEffect, useRef } from 'react'
import { BottomNav, type TabId } from './components/BottomNav'
import { CalendarPage } from './pages/CalendarPage'
import { SettingsPage } from './pages/SettingsPage'
import { useGrants } from './hooks/useGrants'
import { useSettings } from './hooks/useSettings'
import { useGrantRules } from './hooks/useGrantRules'
import { checkExpiringGrants, showExpiryNotification } from './logic/notifications'
import { generateAutoGrants } from './logic/auto-grant'
import { getDefaultGrantRules } from './logic/grant-rules'

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('calendar')
  const [calendarTarget, setCalendarTarget] = useState<string | null>(null)
  const { grants, addGrant } = useGrants()
  const { settings } = useSettings()
  const { rules } = useGrantRules()
  const autoGrantRan = useRef(false)

  // Expiry notifications
  useEffect(() => {
    if (!grants || !grants.length) return
    const expiring = checkExpiringGrants(grants)
    expiring.forEach(showExpiryNotification)
  }, [grants])

  // Auto-grant on app load
  useEffect(() => {
    if (autoGrantRan.current) return
    if (grants === undefined || settings === undefined || rules === undefined) return
    if (!settings.hireDate) return

    autoGrantRan.current = true
    const activeRules = (rules && rules.length > 0) ? rules : getDefaultGrantRules()
    const newGrants = generateAutoGrants(settings.hireDate, activeRules, grants)
    if (newGrants.length > 0) {
      Promise.all(newGrants.map((g) => addGrant(g)))
    }
  }, [grants, settings, rules, addGrant])

  return (
    <div className="min-h-screen bg-bg text-text font-sans leading-relaxed">
      <main className="pb-20 px-4 pt-4">
        {activeTab === 'calendar' && (
          <CalendarPage
            initialDate={calendarTarget}
            onInitialDateConsumed={() => setCalendarTarget(null)}
          />
        )}
        {activeTab === 'settings' && <SettingsPage />}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
