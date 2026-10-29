import { Link } from '@adonisjs/inertia/react'
import { Head } from '@inertiajs/react'
import { Activity, ArrowRight, CalendarDays, Dumbbell, Play, Trophy } from 'lucide-react'
import AppLayout from '~/layouts/app'
import { VolumeBars } from '~/components/charts'
import EmptyState from '~/components/empty_state'
import SectionCard from '~/components/section_card'
import Stat from '~/components/stat'
import { Button } from '~/components/ui/button'
import { Form } from '@adonisjs/inertia/react'
import { compact, date, duration, num, RECORD_LABELS } from '~/lib/format'
import { cn } from '~/lib/utils'
import type { DashboardData } from '~/types/views'

export default function Dashboard({ dashboard }: { dashboard: DashboardData }) {
  const { live, last, week, weekly, records, muscles, suggested, unit } = dashboard
  const weekRatio = week.goal ? Math.min(1, week.sessions / week.goal) : 0
  const maxMuscle = Math.max(1, ...muscles.map((m) => m.sets))
  const hasHistory = weekly.some((w) => w.sessions > 0) || last !== null

  return (
    <>
      <Head title="Inicio" />
      <header className="mb-6 border-b border-[var(--border)] pb-4 lg:mb-8">
        <p className="term-label">
          {date(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}
          {' // sistema listo'}
        </p>
        <h1 className="glow-green mt-2 text-xl font-bold tracking-[0.12em] text-[var(--color-green)] uppercase lg:text-2xl">
          <span aria-hidden="true" className="mr-2 opacity-60">
            &gt;
          </span>
          {dashboard.greeting}
          <span
            aria-hidden="true"
            className="ml-1 inline-block animate-[blink-cursor_1s_step-end_infinite]"
          >
            _
          </span>
        </h1>
      </header>

      {/* Primary action */}
      <section className="clip-corner-md mb-6 overflow-hidden border border-[var(--border-active)] bg-[var(--surface)] shadow-[var(--glow-green)]">
        {live ? (
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <span className="relative grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Activity className="size-5" />
                <span className="absolute -top-1 -right-1 size-3 animate-pulse rounded-full border-2 border-card bg-primary" />
              </span>
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {live.status === 'paused' ? 'En pausa' : 'En curso'}
                </p>
                <p className="text-lg font-semibold">{live.name}</p>
              </div>
            </div>
            <Button
              variant="EXEC"
              asChild
              size="LG"
              className="h-12 w-full px-6 text-base sm:w-auto"
            >
              <Link route="workouts.show" routeParams={{ id: live.id }}>
                Continuar <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {suggested ? 'Rutina sugerida' : 'Listo para entrenar'}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {suggested ? suggested.name : 'Empieza una sesión libre'}
              </p>
              {suggested && (
                <p className="text-sm text-muted-foreground">
                  {suggested.exercises} ejercicios ·{' '}
                  {suggested.lastDone ? `última vez ${date(suggested.lastDone)}` : 'aún sin hacer'}
                </p>
              )}
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              {suggested ? (
                <Form route="workouts.store" className="flex-1 sm:flex-none">
                  <input type="hidden" name="templateId" value={suggested.id} />
                  <Button
                    variant="EXEC"
                    type="submit"
                    size="LG"
                    className="h-12 w-full px-6 text-base"
                  >
                    <Play className="size-4 fill-current" /> Iniciar entrenamiento
                  </Button>
                </Form>
              ) : (
                <Button
                  variant="EXEC"
                  asChild
                  size="LG"
                  className="h-12 flex-1 px-6 text-base sm:flex-none"
                >
                  <Link route="workouts.create">
                    <Play className="size-4 fill-current" /> Iniciar entrenamiento
                  </Link>
                </Button>
              )}
              {suggested && (
                <Button asChild size="LG" variant="OUTLINE" className="h-12">
                  <Link route="workouts.create">Otra</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </section>

      {!hasHistory ? (
        <EmptyState
          icon={Dumbbell}
          title="Tu historial empieza hoy"
          action={
            <Button asChild variant="OUTLINE">
              <Link route="routines.create">Crear una rutina</Link>
            </Button>
          }
        >
          Registra tu primera sesión o importa tu historial desde Ajustes. Aquí verás tu volumen
          semanal, récords y músculos trabajados.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Esta semana"
              value={week.sessions}
              unit={`/ ${week.goal}`}
              accent={week.sessions >= week.goal}
              hint={
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary transition-all"
                    style={{ width: `${weekRatio * 100}%` }}
                  />
                </span>
              }
            />
            <Stat label="Volumen semanal" value={compact(week.volume)} unit={unit} />
            <Stat
              label="Último entrenamiento"
              value={last ? date(last.workoutDate) : '—'}
              hint={last ? last.name : undefined}
              className="col-span-2 lg:col-span-1"
            />
            <Stat
              label="Duración"
              value={last?.durationSeconds ? duration(last.durationSeconds) : '—'}
              hint={last ? `${last.sets ?? '—'} series · ${last.reps ?? '—'} reps` : undefined}
              className="hidden lg:block"
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="Volumen por semana"
              className="lg:col-span-2"
              action={
                <span className="text-xs text-muted-foreground">{unit} · últimas 8 semanas</span>
              }
            >
              <VolumeBars data={weekly} dataKey="volume" xKey="label" unit={unit} />
            </SectionCard>

            <SectionCard title="Músculos · semana" action="series ef.">
              {muscles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay series esta semana.</p>
              ) : (
                <ul className="grid gap-2.5">
                  {muscles.slice(0, 8).map((m) => (
                    <li
                      key={m.slug}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-sm"
                    >
                      <span className="truncate">{m.name}</span>
                      <span className="num text-xs text-muted-foreground">{num(m.sets)}</span>
                      <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-primary/80"
                          style={{ width: `${(m.sets / maxMuscle) * 100}%` }}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <SectionCard
              title="Récords recientes"
              className="lg:col-span-2"
              action={<Trophy className="size-4 text-muted-foreground" />}
            >
              {records.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Los récords aparecen cuando superas tus marcas anteriores.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {records.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <Link
                          route="exercises.show"
                          routeParams={{ id: r.exerciseId }}
                          className="block truncate text-sm font-medium hover:underline"
                        >
                          {r.exerciseName}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {RECORD_LABELS[r.recordType]} · {date(r.achievedOn)}
                        </span>
                      </div>
                      <span className="num shrink-0 text-sm font-semibold">
                        {num(r.value)} {r.valueUnit}
                        {r.recordType === 'max_weight' && r.repetitions ? (
                          <span className="font-normal text-muted-foreground">
                            {' '}
                            × {r.repetitions}
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Historial">
              <div className="grid gap-2">
                {last && (
                  <Link
                    route="workouts.summary"
                    routeParams={{ id: last.id }}
                    className="flex items-center justify-between rounded-lg border border-border p-3 text-sm hover:bg-accent"
                  >
                    <span>
                      <span className="block font-medium">{last.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {date(last.workoutDate)} ·{' '}
                        {last.volume !== null ? `${compact(last.volume)} ${unit}` : 'sin resumen'}
                      </span>
                    </span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </Link>
                )}
                <Link
                  route="history.index"
                  className={cn(
                    'flex items-center gap-2 rounded-lg p-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <CalendarDays className="size-4" /> Ver todo el historial
                </Link>
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </>
  )
}

Dashboard.layout = [AppLayout]
