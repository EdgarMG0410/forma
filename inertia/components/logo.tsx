import { cn } from '~/lib/utils'

/**
 * The Forma mark: a rising bar inside a rounded square — progress, one rep at a time.
 */
export function FormaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-7', className)}>
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <path
        d="M9 22h3.2v-5H9zM14.4 22h3.2V13h-3.2zM19.8 22H23V9h-3.2z"
        className="fill-primary-foreground"
      />
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
        <span className="text-[17px] font-semibold tracking-tight">Forma</span>
        {withSlogan && (
          <span className="mt-1 text-[11px] font-medium tracking-wide text-muted-foreground">
            Train. Track. Progress.
          </span>
        )}
      </span>
    </span>
  )
}
