import { type ReactNode } from 'react'
import { Head } from '@inertiajs/react'

export default function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <>
      <Head title={title} />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 lg:mb-8">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {eyebrow}
            </div>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-balance lg:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    </>
  )
}
