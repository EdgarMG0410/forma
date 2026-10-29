import { type ReactNode } from 'react'
import { cn } from '~/lib/utils'

export default function SectionCard({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-card', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
