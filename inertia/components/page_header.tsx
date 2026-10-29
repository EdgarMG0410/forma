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
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-[var(--border)] pb-4 lg:mb-8">
        <div className="min-w-0">
          {eyebrow && <div className="term-label mb-2">{eyebrow}</div>}
          <h1 className="glow-green text-xl font-bold tracking-[0.15em] text-balance text-[var(--color-green)] uppercase lg:text-2xl">
            <span aria-hidden="true" className="mr-2 opacity-60">
              &gt;
            </span>
            {title}
            <span
              aria-hidden="true"
              className="ml-1 inline-block animate-[blink-cursor_1s_step-end_infinite]"
            >
              _
            </span>
          </h1>
          {description && (
            <p className="mt-1.5 text-[0.8rem] text-pretty text-[var(--text-muted)]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
    </>
  )
}
