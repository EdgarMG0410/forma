import { type ReactNode } from 'react'
import { cn } from '~/lib/utils'

/**
 * A single metric in scificn's stat-card style: tiny uppercase label, big
 * glowing tabular number, optional hint under a hairline.
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
    <div
      className={cn(
        'clip-corner-sm flex flex-col gap-1.5 border bg-[var(--surface)] p-4',
        accent ? 'border-[var(--color-green)]' : 'border-[var(--border)]',
        className
      )}
    >
      <div className="term-label text-[0.6rem]">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'num text-2xl font-bold lg:text-[1.75rem]',
            accent ? 'glow-green text-[var(--color-green)]' : 'text-[var(--color-bone)]'
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[0.7rem] tracking-widest text-[var(--text-muted)] uppercase">
            {unit}
          </span>
        )}
      </div>
      {hint && (
        <div className="mt-auto border-t border-[var(--border)] pt-2 text-[0.65rem] tracking-wide text-[var(--text-muted)]">
          {hint}
        </div>
      )}
    </div>
  )
}
