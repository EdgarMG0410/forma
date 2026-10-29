import { type ReactNode, useState } from 'react'
import { usePage } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import {
  Activity,
  CalendarDays,
  Dumbbell,
  House,
  ListChecks,
  LogOut,
  Menu,
  Play,
  Ruler,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import { urlFor } from '~/client'
import Logo from '~/components/logo'
import FlashToasts from '~/components/flash_toasts'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet'
import { cn } from '~/lib/utils'

type NavRoute = Parameters<typeof urlFor>[0]
type NavItem = { label: string; route: NavRoute; icon: LucideIcon; exact?: boolean }

const PRIMARY: NavItem[] = [
  { label: 'Inicio', route: 'dashboard', icon: House, exact: true },
  { label: 'Historial', route: 'history.index', icon: CalendarDays },
  { label: 'Rutinas', route: 'routines.index', icon: ListChecks },
  { label: 'Ejercicios', route: 'exercises.index', icon: Dumbbell },
  { label: 'Cuerpo', route: 'body.index', icon: Ruler },
  { label: 'Ajustes', route: 'settings.show', icon: Settings },
]

function useActive() {
  const { url } = usePage()
  const path = url.split('?')[0]
  return (item: NavItem) => {
    const href = urlFor(item.route as any)
    return item.exact ? path === href : path === href || path.startsWith(`${href}/`)
  }
}

function TrainButton({ compact = false }: { compact?: boolean }) {
  const { props } = usePage()
  const live = props.liveSession
  const href = live ? urlFor('workouts.show', { id: live.id }) : urlFor('workouts.create')
  if (compact) {
    return (
      <Link
        href={href}
        aria-label={live ? 'Volver a la sesión en curso' : 'Iniciar entrenamiento'}
        className="clip-corner-sm relative -mt-5 grid size-14 place-items-center border border-[var(--color-green)] bg-[var(--color-green)] text-[var(--color-bg)] shadow-[var(--glow-green)] transition-transform active:scale-95"
      >
        {live ? (
          <Activity className="size-6" />
        ) : (
          <Play className="size-6 translate-x-px fill-current" />
        )}
        {live && <span className="pulse-glow absolute top-1 right-1 size-2 bg-[var(--color-bg)]" />}
      </Link>
    )
  }
  return (
    <Link
      href={href}
      className="flex h-11 items-center justify-center gap-2 border border-[var(--color-green)] px-4 text-[0.75rem] font-medium tracking-widest text-[var(--color-green)] uppercase transition-all hover:bg-[var(--color-green)] hover:text-[var(--color-bg)] hover:shadow-[var(--glow-green)]"
    >
      {live ? <Activity className="size-4" /> : <Play className="size-4 fill-current" />}
      {live
        ? live.status === 'paused'
          ? 'Sesión en pausa'
          : 'Sesión en curso'
        : 'Iniciar entrenamiento'}
    </Link>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const isActive = useActive()
  const { props } = usePage()
  const [moreOpen, setMoreOpen] = useState(false)
  const mobileTabs = [PRIMARY[0], PRIMARY[1]]
  const mobileTabsRight = [PRIMARY[2]]
  const more = PRIMARY.slice(3)

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <Link route="dashboard">
            <Logo withSlogan />
          </Link>
        </div>
        <div className="px-4 pt-5">
          <TrainButton />
        </div>
        <p className="term-label px-5 pt-6 pb-2">[ Navegación ]</p>
        <nav className="flex flex-col" aria-label="Principal">
          {PRIMARY.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.label}
                href={urlFor(item.route as any)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-3 border-l-2 border-transparent px-5 text-[0.75rem] tracking-widest uppercase transition-colors',
                  active
                    ? 'border-[var(--color-green)] bg-[var(--surface-raised)] text-[var(--color-green)] glow-green'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--color-green)]'
                )}
              >
                <span aria-hidden="true" className="w-3 text-[var(--color-green)]">
                  {active ? '>' : ''}
                </span>
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--surface-raised)] px-5 py-3">
          <div className="min-w-0">
            <p className="term-label">Operador</p>
            <p className="truncate text-[0.75rem] text-[var(--color-bone)]">
              {props.user?.fullName ?? props.user?.email}
            </p>
          </div>
          <Form route="session.destroy">
            <button
              type="submit"
              className="grid size-9 place-items-center border border-transparent text-[var(--text-muted)] hover:border-[var(--color-red)] hover:text-[var(--color-red)]"
              aria-label="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </Form>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/90 px-4 backdrop-blur-md lg:hidden">
        <Link route="dashboard" aria-label="Forma, inicio">
          <Logo />
        </Link>
        <span className="term-label flex items-center gap-1.5">
          <span className="pulse-glow size-1.5 bg-[var(--color-green)]" /> Online
        </span>
      </header>

      <main className="pb-28 lg:pb-0 lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-10 sm:px-6 lg:px-10 lg:pt-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Principal"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center">
          {mobileTabs.map((item) => (
            <MobileTab key={item.label} item={item} active={isActive(item)} />
          ))}
          <div className="flex justify-center">
            <TrainButton compact />
          </div>
          {mobileTabsRight.map((item) => (
            <MobileTab key={item.label} item={item} active={isActive(item)} />
          ))}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex flex-col items-center gap-1 text-[0.6rem] tracking-widest text-[var(--text-muted)] uppercase',
                  more.some(isActive) && 'text-[var(--color-green)]'
                )}
              >
                <Menu className="size-5" />
                Más
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="border-t border-[var(--border)] bg-[var(--surface-raised)] pb-8"
            >
              <SheetHeader>
                <SheetTitle className="term-label">[ Más ]</SheetTitle>
              </SheetHeader>
              <div className="grid px-4">
                {more.map((item) => (
                  <Link
                    key={item.label}
                    href={urlFor(item.route as any)}
                    onClick={() => setMoreOpen(false)}
                    className="flex h-12 items-center gap-3 border-b border-[var(--border)] px-2 text-[0.75rem] tracking-widest text-[var(--text-secondary)] uppercase hover:text-[var(--color-green)]"
                  >
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                ))}
                <Form route="session.destroy" onSuccess={() => setMoreOpen(false)}>
                  <button
                    type="submit"
                    className="flex h-12 w-full items-center gap-3 px-2 text-[0.75rem] tracking-widest text-[var(--color-red)] uppercase"
                  >
                    <LogOut className="size-4" /> Cerrar sesión
                  </button>
                </Form>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      <FlashToasts />
    </div>
  )
}

function MobileTab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={urlFor(item.route as any)}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center gap-1 text-[0.6rem] tracking-widest uppercase transition-colors',
        active ? 'text-[var(--color-green)] glow-green' : 'text-[var(--text-muted)]'
      )}
    >
      <item.icon className="size-5" />
      {item.label}
    </Link>
  )
}
