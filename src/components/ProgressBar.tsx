interface Props {
  value: number
  max: number
  color?: string
  label?: string
}

export function ProgressBar({ value, max, color = 'bg-lavender', label }: Props) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0

  return (
    <div className="leading-relaxed">
      {label && <p className="mb-1 text-sm text-text-sub">{label}</p>}
      <div
        className="h-3 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? '進捗'}
      >
        <div
          className={`h-full rounded-full ${color} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
