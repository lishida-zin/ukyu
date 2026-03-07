interface Props {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = '' }: Props) {
  return (
    <div className={`rounded-2xl border border-surface bg-surface-bright p-5 shadow-sm ${className}`}>
      {children}
    </div>
  )
}
