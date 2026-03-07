import { useState, useEffect, useRef } from 'react'

export type TabId = 'calendar' | 'settings'

interface Props {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

const tabs: { id: TabId; icon: string; label: string }[] = [
  { id: 'calendar', icon: '🏠', label: 'ホーム' },
  { id: 'settings', icon: '⚙️', label: '設定' },
]

export function BottomNav({ activeTab, onTabChange }: Props) {
  const [visible, setVisible] = useState(true)
  const prevScrollY = useRef(0)

  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY
      const delta = currentY - prevScrollY.current
      if (Math.abs(delta) < 5) return
      setVisible(delta < 0)
      prevScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav aria-label="メインナビゲーション" className={`fixed bottom-0 left-0 right-0 bg-surface-bright pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${visible ? '' : 'translate-y-full'}`}>
      <ul className="flex justify-around">
        {tabs.map((tab) => (
          <li key={tab.id} className="flex-1">
            <button
              type="button"
              onClick={() => onTabChange(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`flex w-full flex-col items-center gap-0.5 py-3 min-h-[3.5rem] text-sm leading-relaxed active:scale-95 transition-all ${
                activeTab === tab.id
                  ? 'bg-lavender-light text-lavender-dark'
                  : 'text-text-sub'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
