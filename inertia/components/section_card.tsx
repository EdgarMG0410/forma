import { type ReactNode } from 'react'
import { Panel, PanelContent, PanelHeader, PanelTitle } from '~/components/ui/panel'
import { cn } from '~/lib/utils'

/**
 * A titled block of a page, on scificn's notched Panel.
 */
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
    <Panel notch="md" className={className}>
      {(title || action) && (
        <PanelHeader className="justify-between">
          {title && <PanelTitle>{title}</PanelTitle>}
          {action && (
            <span className="flex items-center gap-2 text-[0.65rem] text-[var(--text-muted)]">
              {action}
            </span>
          )}
        </PanelHeader>
      )}
      <PanelContent className={cn('p-4 sm:p-5', bodyClassName)}>{children}</PanelContent>
    </Panel>
  )
}
