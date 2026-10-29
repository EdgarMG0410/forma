import { useEffect, useRef } from 'react'
import { Timer, X } from 'lucide-react'
import { useNow } from '~/hooks/use_now'
import { clock } from '~/lib/format'
import { cn } from '~/lib/utils'

export function SessionClock({
  startedAt,
  pausedAt,
  pausedSeconds,
  className,
}: {
  startedAt: string | null
  pausedAt: string | null
  pausedSeconds: number
  className?: string
}) {
  const now = useNow(1000, !pausedAt)
  if (!startedAt) return null
  const end = pausedAt ? new Date(pausedAt).getTime() : now
  const seconds = (end - new Date(startedAt).getTime()) / 1000 - pausedSeconds
  const h = Math.floor(seconds / 3600)
  return (
    <span className={cn('num', className)}>
      {h > 0 ? `${h}:${clock(seconds % 3600).padStart(5, '0')}` : clock(seconds)}
    </span>
  )
}

/**
 * Counts down from the last logged set. It derives from server time
 * (`since`), so a reload or a second device shows the same rest.
 */
export function RestTimer({
  since,
  seconds,
  onDismiss,
  onExtend,
}: {
  since: string
  seconds: number
  onDismiss: () => void
  onExtend: () => void
}) {
  const now = useNow(250)
  const elapsed = (now - new Date(since).getTime()) / 1000
  const remaining = seconds - elapsed
  const done = remaining <= 0
  const buzzed = useRef(false)

  useEffect(() => {
    if (done && !buzzed.current) {
      buzzed.current = true
      if ('vibrate' in navigator) navigator.vibrate?.([120, 80, 120])
    }
  }, [done])

  if (remaining < -90) return null
  const ratio = Math.min(1, Math.max(0, elapsed / seconds))

  return (
    <div
      role="timer"
      aria-live="polite"
      className={cn(
        'relative overflow-hidden rounded-xl border px-4 py-3 transition-colors',
        done ? 'border-primary/50 bg-primary/10' : 'border-border bg-card'
      )}
    >
      <span
        className="absolute inset-y-0 left-0 bg-primary/10 transition-[width] duration-300"
        style={{ width: `${ratio * 100}%` }}
        aria-hidden="true"
      />
      <div className="relative flex items-center gap-3">
        <Timer
          className={cn('size-5 shrink-0', done ? 'text-primary-ink' : 'text-muted-foreground')}
        />
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">
            {done ? 'Descanso cumplido' : 'Descanso'}
          </div>
          <div className={cn('num text-2xl font-semibold', done && 'text-primary-ink')}>
            {done ? `+${clock(-remaining)}` : clock(remaining)}
          </div>
        </div>
        <button
          type="button"
          onClick={onExtend}
          className="h-9 rounded-lg border border-border px-3 text-sm font-medium hover:bg-accent"
        >
          +30 s
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
          aria-label="Ocultar descanso"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
