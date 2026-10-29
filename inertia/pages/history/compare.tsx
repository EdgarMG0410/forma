import { Link } from '@adonisjs/inertia/react'
import { ArrowLeft, GitCompare } from 'lucide-react'
import type { WorkoutSummaryDTO } from '@domain/dto'
import AppLayout from '~/layouts/app'
import PageHeader from '~/components/page_header'
import EmptyState from '~/components/empty_state'
import { Button } from '~/components/ui/button'
import { compact, date, num } from '~/lib/format'
import { cn } from '~/lib/utils'

type Props = { left: WorkoutSummaryDTO | null; right: WorkoutSummaryDTO | null }

/**
 * Two finished sessions side by side, exercise by exercise. Exercises are
 * matched by identity — different machines are never compared as equals.
 */
export default function Compare({ left, right }: Props) {
  if (!left || !right) {
    return (
      <>
        <PageHeader title="Comparar sesiones" />
        <EmptyState
          icon={GitCompare}
          title="No se pudieron comparar"
          action={
            <Button asChild variant="outline">
              <Link route="history.index">Volver al historial</Link>
            </Button>
          }
        >
          Elige dos sesiones terminadas de tu historial.
        </EmptyState>
      </>
    )
  }
  const [a, b] =
    left.session.workoutDate <= right.session.workoutDate ? [left, right] : [right, left]
  const unit = b.unit
  const volume = (s: WorkoutSummaryDTO) => (unit === 'lb' ? s.volumeLb : s.volumeKg)
  const ids = [
    ...new Set(
      [...a.perExercise, ...b.perExercise].filter((e) => e.totals.sets > 0).map((e) => e.exerciseId)
    ),
  ]

  const totals: Array<[string, number, number, (v: number) => string]> = [
    ['Volumen', volume(a), volume(b), (v) => `${compact(v)} ${unit}`],
    ['Series', a.setsCount, b.setsCount, (v) => num(v, 0)],
    ['Repeticiones', a.totalReps, b.totalReps, (v) => num(v, 0)],
    ['Ejercicios', a.exercisesCompleted, b.exercisesCompleted, (v) => num(v, 0)],
  ]

  return (
    <>
      <PageHeader
        title="Comparar sesiones"
        actions={
          <Button asChild variant="ghost">
            <Link route="history.index">
              <ArrowLeft className="size-4" /> Historial
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3">
        {[a, b].map((s) => (
          <Link
            key={s.session.id}
            route="workouts.summary"
            routeParams={{ id: s.session.id }}
            className="rounded-xl border border-border bg-card p-4 hover:bg-accent"
          >
            <p className="text-xs text-muted-foreground">
              {date(s.session.workoutDate, { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="truncate font-semibold">{s.session.name}</p>
          </Link>
        ))}
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <tbody>
            {totals.map(([label, va, vb, fmt]) => (
              <tr key={label} className="border-b border-border last:border-0">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{label}</th>
                <td className="num px-4 py-3 text-right">{fmt(va)}</td>
                <td className="num px-4 py-3 text-right font-semibold">{fmt(vb)}</td>
                <td
                  className={cn(
                    'num w-24 px-4 py-3 text-right text-xs',
                    vb > va
                      ? 'text-primary-ink'
                      : vb < va
                        ? 'text-warning'
                        : 'text-muted-foreground'
                  )}
                >
                  {vb - va > 0 ? '+' : ''}
                  {fmt(vb - va)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <h2 className="mt-8 mb-3 text-base font-semibold">Por ejercicio</h2>
      <div className="grid gap-3">
        {ids.map((id) => {
          const ea = a.perExercise.find((e) => e.exerciseId === id)
          const eb = b.perExercise.find((e) => e.exerciseId === id)
          const name = (eb ?? ea)!.name
          return (
            <section key={id} className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold">{name}</h3>
              <div className="mt-3 grid grid-cols-2 gap-4">
                {[ea, eb].map((e, i) => (
                  <div key={i}>
                    {e && e.sets.length ? (
                      <>
                        <ul className="flex flex-wrap gap-1.5">
                          {e.sets.map((s) => (
                            <li
                              key={s.id}
                              className={cn(
                                'num rounded-md border border-border px-2 py-1 text-xs',
                                s.setType === 'warmup' && 'text-muted-foreground'
                              )}
                            >
                              {s.weightValue === null ? '—' : num(s.weightValue)} ×{' '}
                              {s.repetitions ?? '—'}
                            </li>
                          ))}
                        </ul>
                        <p className="num mt-2 text-xs text-muted-foreground">
                          {compact(unit === 'lb' ? e.totals.volumeLb : e.totals.volumeKg)} {unit} ·
                          top{' '}
                          {e.topSet?.load !== null && e.topSet
                            ? `${num(e.topSet.load)}×${e.topSet.reps}`
                            : '—'}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No se hizo</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}

Compare.layout = [AppLayout]
