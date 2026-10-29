import { type ReactNode } from 'react'
import { cn } from '~/lib/utils'

/**
 * A single metric: small label, big tabular number, optional unit and hint.
 */
export default function Stat({
  label,
  value,
  unit,
  hint,
  accent = false,
  className,
}: {
  label: string
  value: ReactNode
  unit?: string
  hint?: ReactNode
  accent?: boolean
  className?: string
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={cn('num text-2xl font-semibold lg:text-3xl', accent && 'text-primary-ink')}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
