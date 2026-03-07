import { useState } from 'react'

const colorStyles = {
  default: 'bg-surface-bright text-text border-surface',
  lavender: 'bg-lavender-light/50 text-lavender-dark border-lavender/40',
  peach: 'bg-peach-light/50 text-peach-dark border-peach/40',
  mint: 'bg-mint-light/50 text-mint-dark border-mint/40',
} as const

export function Collapsible({
  title,
  defaultOpen = true,
  color = 'default',
  children,
}: {
  title: string
  defaultOpen?: boolean
  color?: keyof typeof colorStyles
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-2xl border-2 px-5 py-3 shadow-sm text-left ${colorStyles[color]}`}
      >
        <span className="text-base font-bold leading-relaxed">{title}</span>
        <span className={`transition-transform opacity-60 ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {open && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  )
}
