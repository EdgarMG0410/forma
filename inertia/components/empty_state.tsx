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
    <div className="scanlines flex flex-col items-center border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
      <div className="grid size-11 place-items-center border border-[var(--border)] text-[var(--color-green)]">
        <Icon className="size-5" />
      </div>
      <h2 className="mt-4 text-[0.85rem] font-bold tracking-[0.12em] text-[var(--color-bone)] uppercase">
        {title}
      </h2>
      {children && (
        <p className="mt-1.5 max-w-sm text-[0.8rem] text-pretty text-[var(--text-muted)]">
          {children}
        </p>
      )}
      {action && <div className="relative z-20 mt-5">{action}</div>}
    </div>
  )
}
