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
import ThemeToggle from '~/components/theme_toggle'
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
        className="relative -mt-6 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-95"
      >
        {live ? (
          <Activity className="size-6" />
        ) : (
          <Play className="size-6 translate-x-px fill-current" />
        )}
        {live && (
          <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full border-2 border-background bg-primary animate-pulse" />
        )}
      </Link>
    )
  }
  return (
    <Link
      href={href}
      className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.98]"
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex">
        <Link route="dashboard" className="px-2">
          <Logo withSlogan />
        </Link>
        <div className="mt-7">
          <TrainButton />
        </div>
        <nav className="mt-6 flex flex-col gap-0.5" aria-label="Principal">
          {PRIMARY.map((item) => (
            <Link
              key={item.label}
              href={urlFor(item.route as any)}
              aria-current={isActive(item) ? 'page' : undefined}
              className={cn(
                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive(item) && 'bg-sidebar-accent text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-sidebar-border pt-4">
          <div className="min-w-0 px-2">
            <p className="truncate text-sm font-medium">
              {props.user?.fullName ?? props.user?.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">{props.user?.email}</p>
          </div>
          <div className="flex shrink-0 items-center">
            <ThemeToggle />
            <Form route="session.destroy">
              <button
                type="submit"
                className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                aria-label="Cerrar sesión"
              >
                <LogOut className="size-4" />
              </button>
            </Form>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md lg:hidden">
        <Link route="dashboard" aria-label="Forma, inicio">
          <Logo />
        </Link>
        <ThemeToggle />
      </header>

      <main className="pb-28 lg:pb-0 lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-10 sm:px-6 lg:px-10 lg:pt-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Principal"
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-md lg:hidden"
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
                  'flex flex-col items-center gap-1 text-[11px] font-medium text-muted-foreground',
                  more.some(isActive) && 'text-foreground'
                )}
              >
                <Menu className="size-5" />
                Más
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl pb-8">
              <SheetHeader>
                <SheetTitle>Más</SheetTitle>
              </SheetHeader>
              <div className="grid gap-1 px-4">
                {more.map((item) => (
                  <Link
                    key={item.label}
                    href={urlFor(item.route as any)}
                    onClick={() => setMoreOpen(false)}
                    className="flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium hover:bg-accent"
                  >
                    <item.icon className="size-5 text-muted-foreground" />
                    {item.label}
                  </Link>
                ))}
                <Form route="session.destroy" onSuccess={() => setMoreOpen(false)}>
                  <button
                    type="submit"
                    className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-accent"
                  >
                    <LogOut className="size-5" /> Cerrar sesión
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
        'flex flex-col items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors',
        active && 'text-foreground'
      )}
    >
      <item.icon className={cn('size-5', active && 'text-primary-ink')} />
      {item.label}
    </Link>
  )
}
