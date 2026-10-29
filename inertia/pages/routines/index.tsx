import { Form, Link } from '@adonisjs/inertia/react'
import { ListChecks, Pencil, Play, Plus } from 'lucide-react'
import AppLayout from '~/layouts/app'
import PageHeader from '~/components/page_header'
import EmptyState from '~/components/empty_state'
import { Button } from '~/components/ui/button'
import { date } from '~/lib/format'
import type { RoutineCard } from '~/types/views'

export default function Routines({ routines }: { routines: RoutineCard[] }) {
  return (
    <>
      <PageHeader
        title="Rutinas"
        description="Plantillas que Forma usa para preparar tus series."
        actions={
          <Button asChild>
            <Link route="routines.create">
              <Plus className="size-4" /> Nueva rutina
            </Link>
          </Button>
        }
      />
      {routines.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Sin rutinas todavía"
          action={
            <Button asChild>
              <Link route="routines.create">Crear rutina</Link>
            </Button>
          }
        >
          Crea una desde cero o guarda una sesión terminada como rutina desde su resumen.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {routines.map((r) => (
            <li key={r.id} className="flex flex-col rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold">{r.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {r.exercises.length} ejercicios{r.focus ? ` · ${r.focus}` : ''} ·{' '}
                    {r.lastDone ? `última ${date(r.lastDone)}` : 'sin usar'}
                    {r.times > 0 && ` · ${r.times}×`}
                  </p>
                </div>
                <Button asChild size="icon" variant="ghost" aria-label={`Editar ${r.name}`}>
                  <Link route="routines.edit" routeParams={{ id: r.id }}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
              </div>
              <ol className="mt-3 grid gap-1 text-sm">
                {r.exercises.map((e, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="truncate">{e.name}</span>
                    <span className="num shrink-0 text-muted-foreground">
                      {e.sets} × {e.reps}
                    </span>
                  </li>
                ))}
              </ol>
              <Form route="workouts.store" className="mt-4">
                {({ processing }) => (
                  <>
                    <input type="hidden" name="templateId" value={r.id} />
                    <Button type="submit" className="h-11 w-full" disabled={processing}>
                      <Play className="size-4 fill-current" /> Empezar
                    </Button>
                  </>
                )}
              </Form>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

Routines.layout = [AppLayout]
