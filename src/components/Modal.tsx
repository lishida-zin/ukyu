import { useEffect, useRef, useId, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const [dragY, setDragY] = useState(0)
  const isDragging = useRef(false)
  const startY = useRef(0)

  useEffect(() => {
    if (open) {
      dialogRef.current?.focus()
      setDragY(0)
    }
  }, [open])

  if (!open) return null

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    isDragging.current = true
    startY.current = e.touches[0].clientY
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current) return
    const deltaY = e.touches[0].clientY - startY.current
    if (deltaY > 0) {
      setDragY(deltaY)
    }
  }

  function handleTouchEnd() {
    isDragging.current = false
    if (dragY > 100) {
      onClose()
    } else {
      setDragY(0)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div
        className="absolute inset-0 bg-overlay/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
        className="relative w-full rounded-t-3xl bg-surface-bright pb-[env(safe-area-inset-bottom)] p-6"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-bold leading-relaxed">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="flex h-10 w-10 items-center justify-center rounded-full text-text-sub hover:bg-gray-100 active:scale-95 transition-transform"
          >
            ✕
          </button>
        </div>
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
