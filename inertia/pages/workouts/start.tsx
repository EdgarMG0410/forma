import { Form, Link } from '@adonisjs/inertia/react'
import { ArrowRight, History, ListChecks, Play, Plus } from 'lucide-react'
import AppLayout from '~/layouts/app'
import PageHeader from '~/components/page_header'
import { Button } from '~/components/ui/button'
import { date } from '~/lib/format'

type Props = {
  routines: Array<{ id: number; name: string; focus: string | null; exercises: number }>
  recent: Array<{ id: number; name: string; workoutDate: string }>
}

export default function StartWorkout({ routines, recent }: Props) {
  return (
    <>
      <PageHeader
        title="Iniciar entrenamiento"
        description="Elige una rutina, repite una sesión anterior o empieza libre."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="size-4 text-muted-foreground" /> Rutinas
          </h2>
          {routines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              Aún no tienes rutinas.{' '}
              <Link
                route="routines.create"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Crea una
              </Link>{' '}
              para que Forma prepare tus series.
            </div>
          ) : (
            <ul className="grid gap-2">
              {routines.map((r) => (
                <li key={r.id}>
                  <Form route="workouts.store">
                    {({ processing }) => (
                      <>
                        <input type="hidden" name="templateId" value={r.id} />
                        <button
                          type="submit"
                          disabled={processing}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/40 active:scale-[0.99] disabled:opacity-60"
                        >
                          <span>
                            <span className="block font-medium">{r.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {r.exercises} ejercicios{r.focus ? ` · ${r.focus}` : ''}
                            </span>
                          </span>
                          <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
                            <Play className="size-4 translate-x-px fill-current" />
                          </span>
                        </button>
                      </>
                    )}
                  </Form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <History className="size-4 text-muted-foreground" /> Repetir una sesión
          </h2>
          {recent.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              Tus sesiones terminadas aparecerán aquí.
            </p>
          ) : (
            <ul className="grid gap-2">
              {recent.map((s) => (
                <li key={s.id}>
                  <Form route="workouts.store">
                    {({ processing }) => (
                      <>
                        <input type="hidden" name="fromSessionId" value={s.id} />
                        <button
                          type="submit"
                          disabled={processing}
                          className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 text-left hover:bg-accent disabled:opacity-60"
                        >
                          <span>
                            <span className="block font-medium">{s.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {date(s.workoutDate, {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </span>
                          <ArrowRight className="size-4 text-muted-foreground" />
                        </button>
                      </>
                    )}
                  </Form>
                </li>
              ))}
            </ul>
          )}

          <Form route="workouts.store" className="mt-4">
            {({ processing }) => (
              <Button
                type="submit"
                variant="OUTLINE"
                size="LG"
                className="h-12 w-full"
                disabled={processing}
              >
                <Plus className="size-4" /> Sesión libre
              </Button>
            )}
          </Form>
        </section>
      </div>
    </>
  )
}

StartWorkout.layout = [AppLayout]
