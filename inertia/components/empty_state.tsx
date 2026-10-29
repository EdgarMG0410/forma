import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

export default function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <div className="grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      {children && (
        <p className="mt-1.5 max-w-sm text-sm text-pretty text-muted-foreground">{children}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
