import { cn } from '~/lib/utils'

/**
 * The Forma mark: three rising bars in a notched frame — progress on a
 * phosphor screen.
 */
export function FormaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn('size-7', className)}
      style={{ filter: 'drop-shadow(0 0 4px #00ed3f88)' }}
    >
      <path d="M5 1h26v25l-5 5H1V5z" fill="none" stroke="var(--color-green)" strokeWidth="1.5" />
      <path d="M8 23h4v-6H8zM14 23h4V12h-4zM20 23h4V7h-4z" fill="var(--color-green)" />
    </svg>
  )
}

export default function Logo({
  withSlogan = false,
  className,
}: {
  withSlogan?: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <FormaMark />
      <span className="flex flex-col leading-none">
        <span className="glow-green text-[1rem] font-bold tracking-[0.3em] text-[var(--color-green)]">
          FORMA
        </span>
        {withSlogan && (
          <span className="term-label mt-1.5 text-[0.55rem]">Train. Track. Progress.</span>
        )}
      </span>
    </span>
  )
}
