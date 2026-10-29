import { useMemo, useState } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { ArrowLeft, Pencil } from 'lucide-react'
import AppLayout from '~/layouts/app'
import PageHeader from '~/components/page_header'
import SectionCard from '~/components/section_card'
import ExerciseFormDialog from '~/components/exercise_form_dialog'
import { TrendLine } from '~/components/charts'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { BASIS_LABELS, date, EQUIPMENT_LABELS, num, RECORD_LABELS } from '~/lib/format'
import { cn } from '~/lib/utils'
import type { ExerciseDetail, MuscleOption, TrendPoint } from '~/types/views'

type Props = {
  exercise: ExerciseDetail
  trend: { unit: string; points: TrendPoint[] }
  records: Array<{
    recordType: string
    basis: string
    value: number
    valueUnit: string
    weightValue: number | null
    weightUnit: string | null
    repetitions: number | null
    achievedOn: string
    sessionId: number | null
  }>
  recent: Array<{
    sessionId: number
    sessionName: string
    workoutDate: string
    id: number
    setNumber: number
    setType: string
    weightValue: number | null
    weightUnit: string | null
    weightBasis: string
    repetitions: number | null
    rir: number | null
    source: string
    userCorrected: boolean
  }>
  muscles: MuscleOption[]
}

type Metric = 'topLoad' | 'topReps' | 'volume' | 'e1rm'

export default function ExerciseShow({ exercise, trend, records, recent, muscles }: Props) {
  const [editing, setEditing] = useState(false)
  const bases = [...new Set(trend.points.map((p) => p.basis))]
  const [basis, setBasis] = useState(
    bases.includes(exercise.defaultWeightBasis)
      ? exercise.defaultWeightBasis
      : (bases[0] ?? exercise.defaultWeightBasis)
  )
  const [metric, setMetric] = useState<Metric>('topLoad')
  const muscleName = new Map(muscles.map((m) => [m.slug, m.name]))

  const points = trend.points
    .filter((p) => p.basis === basis)
    .map((p) => ({ ...p, label: date(p.date, { day: 'numeric', month: 'short' }) }))
  const sessions = useMemo(() => {
    const groups = new Map<number, Props['recent']>()
    for (const r of recent) groups.set(r.sessionId, [...(groups.get(r.sessionId) ?? []), r])
    return [...groups.values()]
  }, [recent])

  const metrics: Array<[Metric, string]> = [
    ['topLoad', 'Peso top'],
    ['topReps', 'Reps top'],
    ['volume', 'Volumen'],
    ...(exercise.supportsE1rm ? ([['e1rm', '1RM est.']] as Array<[Metric, string]>) : []),
  ]

  return (
    <>
      <PageHeader
        title={exercise.name}
        eyebrow={
          <Link
            route="exercises.index"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Ejercicios
          </Link>
        }
        description={`${EQUIPMENT_LABELS[exercise.equipment]} · ${exercise.exerciseType === 'compound' ? 'compuesto' : 'aislamiento'} · peso ${BASIS_LABELS[exercise.defaultWeightBasis].toLowerCase()}`}
        actions={
          exercise.isCustom && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4" /> Editar
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {exercise.primaryMuscles.map((m) => (
          <Badge key={m}>{muscleName.get(m) ?? m}</Badge>
        ))}
        {exercise.secondaryMuscles.map((m) => (
          <Badge key={m} variant="outline">
            {muscleName.get(m) ?? m}
          </Badge>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Evolución"
          action={
            <div className="flex gap-1">
              {metrics.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMetric(key)}
                  className={cn(
                    'h-7 rounded-md px-2 text-xs font-medium',
                    metric === key
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          {bases.length > 1 && (
            <div className="mb-3 flex gap-1.5 text-xs">
              {bases.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBasis(b as typeof basis)}
                  className={cn(
                    'rounded-full border px-2.5 py-1',
                    basis === b ? 'border-foreground' : 'border-border text-muted-foreground'
                  )}
                >
                  {BASIS_LABELS[b]}
                </button>
              ))}
            </div>
          )}
          {points.length < 2 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Se necesitan al menos dos sesiones para ver una tendencia.
            </p>
          ) : (
            <TrendLine
              data={points}
              xKey="label"
              lines={[{ key: metric, name: metrics.find(([k]) => k === metric)?.[1] ?? '' }]}
              unit={metric === 'topReps' ? 'reps' : trend.unit}
            />
          )}
        </SectionCard>

        <SectionCard title="Récords">
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún sin récords.</p>
          ) : (
            <ul className="grid gap-3">
              {records
                .sort((a, b) => a.recordType.localeCompare(b.recordType))
                .map((r) => (
                  <li
                    key={`${r.recordType}-${r.basis}`}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span>
                      <span className="block">{RECORD_LABELS[r.recordType]}</span>
                      <span className="text-xs text-muted-foreground">
                        {date(r.achievedOn)}
                        {r.basis !== exercise.defaultWeightBasis &&
                          ` · ${BASIS_LABELS[r.basis].toLowerCase()}`}
                      </span>
                    </span>
                    <span className="num font-semibold">
                      {num(r.value)} {r.valueUnit}
                      {r.recordType === 'max_weight' && r.repetitions ? (
                        <span className="font-normal text-muted-foreground"> ×{r.repetitions}</span>
                      ) : null}
                      {r.recordType === 'max_reps' && r.weightValue ? (
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          @{num(r.weightValue)}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {(exercise.technique || exercise.tips) && (
        <SectionCard title="Técnica" className="mt-4">
          {exercise.technique && <p className="text-sm text-pretty">{exercise.technique}</p>}
          {exercise.tips && (
            <p className="mt-2 text-sm text-pretty text-muted-foreground">{exercise.tips}</p>
          )}
        </SectionCard>
      )}

      <h2 className="mt-8 mb-3 text-base font-semibold">Historial personal</h2>
      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no registras este ejercicio.</p>
      ) : (
        <ul className="grid gap-2">
          {sessions.map((sets) => (
            <li key={sets[0].sessionId} className="rounded-xl border border-border bg-card p-3">
              <Link
                route="workouts.summary"
                routeParams={{ id: sets[0].sessionId }}
                className="flex items-center justify-between text-sm hover:underline"
              >
                <span className="font-medium">{sets[0].sessionName}</span>
                <span className="num text-xs text-muted-foreground">
                  {date(sets[0].workoutDate, { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </Link>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {sets.map((s) => (
                  <li
                    key={s.id}
                    className={cn(
                      'num rounded-md border border-border px-2 py-1 text-xs',
                      s.setType === 'warmup' && 'text-muted-foreground'
                    )}
                    title={s.userCorrected ? 'Corregida' : undefined}
                  >
                    {s.weightValue === null ? '—' : num(s.weightValue)} × {s.repetitions ?? '—'}
                    {s.userCorrected && <span className="ml-1 text-muted-foreground">*</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {exercise.aliases.length > 0 && (
        <p className="mt-6 text-xs text-muted-foreground">
          También conocido como: {exercise.aliases.join(', ')}
        </p>
      )}

      {exercise.isCustom && (
        <ExerciseFormDialog
          key={editing ? 'open' : 'closed'}
          open={editing}
          onOpenChange={setEditing}
          muscles={muscles}
          exercise={exercise}
        />
      )}
    </>
  )
}

ExerciseShow.layout = [AppLayout]
