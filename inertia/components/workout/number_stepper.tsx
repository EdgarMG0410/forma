import { Minus, Plus } from 'lucide-react'
import { useId } from 'react'
import { cn } from '~/lib/utils'

/**
 * Big thumb-sized number entry: −/+ buttons on each side of an editable
 * value. Tapping the number selects it so typing replaces it at once.
 */
export default function NumberStepper({
  label,
  value,
  onChange,
  step,
  min = 0,
  max = 9999,
  decimals = 0,
  suffix,
  placeholder = '0',
  invalid,
}: {
  label: string
  value: number | null
  onChange: (value: number | null) => void
  step: number
  min?: number
  max?: number
  decimals?: number
  suffix?: React.ReactNode
  placeholder?: string
  invalid?: boolean
}) {
  const id = useId()
  const clamp = (v: number) => Math.min(max, Math.max(min, Number(v.toFixed(decimals))))
  const bump = (dir: 1 | -1) => onChange(clamp((value ?? 0) + dir * step))

  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground"
      >
        <span>{label}</span>
        {suffix}
      </label>
      <div
        className={cn(
          'flex h-[72px] items-stretch overflow-hidden rounded-xl border border-input bg-background focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40',
          invalid && 'border-destructive'
        )}
      >
        <button
          type="button"
          onClick={() => bump(-1)}
          className="grid w-14 shrink-0 place-items-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent"
          aria-label={`Restar ${step} a ${label.toLowerCase()}`}
        >
          <Minus className="size-5" />
        </button>
        <input
          id={id}
          inputMode={decimals ? 'decimal' : 'numeric'}
          enterKeyHint="done"
          autoComplete="off"
          value={value === null ? '' : String(value)}
          placeholder={placeholder}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const raw = e.currentTarget.value.replace(',', '.').replace(/[^\d.]/g, '')
            if (raw === '') return onChange(null)
            const parsed = Number(raw)
            if (!Number.isNaN(parsed)) onChange(Math.min(max, parsed))
          }}
          className="num glow-green w-full min-w-0 bg-transparent text-center text-4xl font-bold text-[var(--color-green)] caret-[var(--color-green)] outline-none placeholder:text-[var(--text-muted)]"
        />
        <button
          type="button"
          onClick={() => bump(1)}
          className="grid w-14 shrink-0 place-items-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:bg-accent"
          aria-label={`Sumar ${step} a ${label.toLowerCase()}`}
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  )
}
