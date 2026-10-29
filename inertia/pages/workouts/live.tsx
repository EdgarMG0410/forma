import { useMemo, useRef, useState } from 'react'
import { Head, router as inertiaRouter } from '@inertiajs/react'
import { Link, useRouter } from '@adonisjs/inertia/react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  CircleAlert,
  EllipsisVertical,
  Info,
  Pause,
  Play,
  Plus,
  Replace,
  SkipForward,
  Sparkles,
  Square,
  X,
} from 'lucide-react'
import type { ExerciseRefDTO, LiveSessionDTO, SessionExerciseDTO, SetDTO } from '@domain/dto'
import type { SetType, WeightUnit } from '@domain/enums'
import { convertWeight } from '@domain/units'
import FlashToasts from '~/components/flash_toasts'
import ExercisePicker from '~/components/exercise_picker'
import EditSetDialog from '~/components/workout/edit_set_dialog'
import NumberStepper from '~/components/workout/number_stepper'
import SetRow from '~/components/workout/set_row'
import { RestTimer, SessionClock } from '~/components/workout/timers'
import CoachInput from '~/components/workout/coach_input'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Textarea } from '~/components/ui/textarea'
import { compact, date, num, BASIS_LABELS } from '~/lib/format'
import { requestId } from '~/lib/uuid'
import { cn } from '~/lib/utils'

type Props = { session: LiveSessionDTO; catalog?: ExerciseRefDTO[] }

/** Partial reload keeps the deferred catalog and only refreshes the session. */
const visit = { preserveScroll: true, preserveState: true, only: ['session', 'liveSession'] }

export default function WorkoutLive({ session, catalog }: Props) {
  const router = useRouter()
  const { next, exercises, lastResult } = session
  const current =
    next.kind === 'set' ? exercises.find((e) => e.id === next.sessionExerciseId) : undefined
  const paused = session.status === 'paused'

  const [editing, setEditing] = useState<{ set: SetDTO; exercise: string } | null>(null)
  const [picker, setPicker] = useState<
    null | { mode: 'add' } | { mode: 'substitute'; sessionExerciseId: number }
  >(null)
  const [finishing, setFinishing] = useState(false)
  const [restHidden, setRestHidden] = useState<string | null>(null)
  // extra rest belongs to one set; a new set starts from zero again
  const [restExtension, setRestExtension] = useState<{ at: string | null; seconds: number }>({
    at: null,
    seconds: 0,
  })
  const restExtra = restExtension.at === session.lastSetAt ? restExtension.seconds : 0

  const pending = exercises.filter(
    (e) => e.id !== current?.id && (e.status === 'pending' || e.status === 'in_progress')
  )
  const done = exercises.filter(
    (e) => e.id !== current?.id && (e.status === 'completed' || e.status === 'skipped')
  )

  const focus = (id: number) =>
    inertiaRouter.get(window.location.pathname, { focus: id }, { ...visit, replace: true })

  const repeat = (set: SetDTO) =>
    router.post(
      { route: 'workout_sets.repeat', routeParams: { id: set.id } },
      { clientRequestId: requestId() },
      visit
    )

  const move = (id: number, dir: -1 | 1) => {
    const ids = [...exercises].sort((a, b) => a.orderIndex - b.orderIndex).map((e) => e.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    router.put(
      { route: 'session_exercises.reorder', routeParams: { sessionId: session.id } },
      { order: ids },
      visit
    )
  }

  const updateExercise = (id: number, data: Record<string, unknown>) =>
    router.patch({ route: 'session_exercises.update', routeParams: { id } }, data, visit)

  return (
    <div className="min-h-dvh bg-background pb-10">
      <Head title={`${session.name} · En vivo`} />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-3">
          <Link
            route="dashboard"
            className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
            aria-label="Volver al inicio"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{session.name}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  paused ? 'bg-warning' : 'animate-pulse bg-primary'
                )}
              />
              {paused ? 'En pausa' : 'En curso'} ·{' '}
              <SessionClock
                startedAt={session.startedAt}
                pausedAt={session.pausedAt}
                pausedSeconds={session.pausedSeconds}
              />
            </p>
          </div>
          {paused ? (
            <Button
              size="sm"
              onClick={() =>
                router.post(
                  { route: 'workouts.resume', routeParams: { id: session.id } },
                  {},
                  visit
                )
              }
            >
              <Play className="size-4 fill-current" /> Reanudar
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                router.post({ route: 'workouts.pause', routeParams: { id: session.id } }, {}, visit)
              }
              aria-label="Pausar"
            >
              <Pause className="size-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Opciones de la sesión">
                <EllipsisVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => setPicker({ mode: 'add' })}>
                <Plus /> Agregar ejercicio
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setFinishing(true)}>
                <Check /> Finalizar sesión
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  if (
                    window.confirm(
                      '¿Cancelar la sesión? Las series registradas no contarán en tu historial.'
                    )
                  ) {
                    router.post({ route: 'workouts.cancel', routeParams: { id: session.id } }, {})
                  }
                }}
              >
                <X /> Cancelar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* session progress */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{ width: `${session.progress.ratio * 100}%` }}
          />
        </div>
      </header>

      <main className="mx-auto grid max-w-2xl gap-4 px-3 pt-4 sm:px-4">
        {paused && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
            <span>Sesión en pausa. El tiempo no corre.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                router.post(
                  { route: 'workouts.resume', routeParams: { id: session.id } },
                  {},
                  visit
                )
              }
            >
              Reanudar
            </Button>
          </div>
        )}

        {session.lastSetAt &&
          next.kind === 'set' &&
          !paused &&
          restHidden !== session.lastSetAt && (
            <RestTimer
              since={session.lastSetAt}
              seconds={session.restSeconds + restExtra}
              onDismiss={() => setRestHidden(session.lastSetAt)}
              onExtend={() => setRestExtension({ at: session.lastSetAt, seconds: restExtra + 30 })}
            />
          )}

        {current && next.kind === 'set' ? (
          <CurrentExercise
            key={`${current.id}-${next.setNumber}`}
            session={session}
            exercise={current}
            setNumber={next.setNumber}
            totalSets={next.totalSets}
            onEdit={(set) => setEditing({ set, exercise: current.exercise.name })}
            onRepeat={repeat}
            onSubstitute={() => setPicker({ mode: 'substitute', sessionExerciseId: current.id })}
            onSkip={() => updateExercise(current.id, { skip: true })}
            onAddSet={() =>
              updateExercise(current.id, {
                targetSets: Math.max(current.targetSets, current.sets.length) + 1,
              })
            }
            onRemoveSet={() =>
              updateExercise(current.id, { targetSets: Math.max(1, current.targetSets - 1) })
            }
          />
        ) : (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">
              {exercises.length ? 'Todo completado' : 'Agrega tu primer ejercicio'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {exercises.length
                ? 'Finaliza para ver tu resumen, o agrega otro ejercicio.'
                : 'Elige un ejercicio del catálogo para empezar a registrar.'}
            </p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              {exercises.length > 0 && (
                <Button size="lg" className="h-12" onClick={() => setFinishing(true)}>
                  Finalizar sesión
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                className="h-12"
                onClick={() => setPicker({ mode: 'add' })}
              >
                <Plus className="size-4" /> Agregar ejercicio
              </Button>
            </div>
          </section>
        )}

        {current && <CoachInput sessionId={session.id} sessionExerciseId={current.id} />}

        {lastResult && current && (
          <section className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">
              Última vez ·{' '}
              {date(lastResult.workoutDate, { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {lastResult.sets.map((s) => (
                <li
                  key={s.setNumber}
                  className={cn(
                    'num rounded-md border border-border px-2 py-1 text-sm',
                    s.setNumber === (next.kind === 'set' ? next.setNumber : -1) &&
                      'border-primary/50 bg-primary/10',
                    s.setType === 'warmup' && 'text-muted-foreground'
                  )}
                >
                  {s.weightValue === null ? '—' : num(s.weightValue)} × {s.repetitions ?? '—'}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Pending exercises stay visible after every set */}
        <section>
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">
              Pendientes{' '}
              <span className="font-normal text-muted-foreground">· {pending.length}</span>
            </h2>
            <Button size="sm" variant="ghost" onClick={() => setPicker({ mode: 'add' })}>
              <Plus className="size-4" /> Agregar
            </Button>
          </div>
          {pending.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">
              No quedan ejercicios pendientes.
            </p>
          ) : (
            <ul className="grid gap-2">
              {pending.map((e) => (
                <PendingExercise
                  key={e.id}
                  exercise={e}
                  onFocus={() => focus(e.id)}
                  onUp={() => move(e.id, -1)}
                  onDown={() => move(e.id, 1)}
                  onSkip={() => updateExercise(e.id, { skip: true })}
                  onSubstitute={() => setPicker({ mode: 'substitute', sessionExerciseId: e.id })}
                  onRemove={() =>
                    router.delete(
                      { route: 'session_exercises.destroy', routeParams: { id: e.id } },
                      visit
                    )
                  }
                />
              ))}
            </ul>
          )}
        </section>

        {done.length > 0 && (
          <section>
            <h2 className="mb-2 px-1 text-sm font-semibold">
              Hechos <span className="font-normal text-muted-foreground">· {done.length}</span>
            </h2>
            <ul className="grid gap-2">
              {done.map((e) => (
                <DoneExercise
                  key={e.id}
                  exercise={e}
                  onEdit={(set) => setEditing({ set, exercise: e.exercise.name })}
                  onReopen={() =>
                    e.status === 'skipped' ? updateExercise(e.id, { skip: false }) : focus(e.id)
                  }
                />
              ))}
            </ul>
          </section>
        )}

        {/* Totals */}
        <section className="grid grid-cols-3 gap-2">
          {[
            ['Series', `${session.progress.loggedSets}/${session.progress.targetSets}`],
            ['Reps', num(session.totals.reps, 0)],
            [`Volumen ${session.unit}`, compact(session.totals.volume)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3 text-center">
              <div className="num text-lg font-semibold">{value}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </section>
        {session.totals.incompleteSets > 0 && (
          <p className="px-1 text-xs text-muted-foreground">
            {session.totals.incompleteSets} serie(s) sin peso o reps no cuentan en el volumen.
          </p>
        )}

        <Button variant="outline" size="lg" className="h-12" onClick={() => setFinishing(true)}>
          <Square className="size-4" /> Finalizar sesión
        </Button>
      </main>

      <EditSetDialog
        key={editing?.set.id ?? 'none'}
        set={editing?.set ?? null}
        exerciseName={editing?.exercise ?? ''}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />

      <ExercisePicker
        open={!!picker}
        onOpenChange={(o) => !o && setPicker(null)}
        exercises={catalog}
        title={picker?.mode === 'substitute' ? 'Sustituir ejercicio' : 'Agregar ejercicio'}
        description={
          picker?.mode === 'substitute'
            ? 'Solo se puede sustituir un ejercicio sin series registradas.'
            : undefined
        }
        onPick={(exercise) => {
          if (picker?.mode === 'substitute') {
            updateExercise(picker.sessionExerciseId, { substituteExerciseId: exercise.id })
          } else {
            router.post(
              { route: 'session_exercises.store', routeParams: { sessionId: session.id } },
              { exerciseId: exercise.id },
              { preserveScroll: true }
            )
          }
          setPicker(null)
        }}
      />

      <FinishDialog open={finishing} onOpenChange={setFinishing} session={session} />
      <FlashToasts />
    </div>
  )
}

WorkoutLive.layout = null

// ─────────────────────────────────────────────────────────────────────────

function CurrentExercise({
  session,
  exercise,
  setNumber,
  totalSets,
  onEdit,
  onRepeat,
  onSubstitute,
  onSkip,
  onAddSet,
  onRemoveSet,
}: {
  session: LiveSessionDTO
  exercise: SessionExerciseDTO
  setNumber: number
  totalSets: number
  onEdit: (set: SetDTO) => void
  onRepeat: (set: SetDTO) => void
  onSubstitute: () => void
  onSkip: () => void
  onAddSet: () => void
  onRemoveSet: () => void
}) {
  const router = useRouter()
  const rec =
    session.recommendation?.sessionExerciseId === exercise.id ? session.recommendation : null
  const lastHere = exercise.sets[exercise.sets.length - 1]
  const lastTime =
    session.lastResult?.sets.find((s) => s.setNumber === setNumber) ??
    session.lastResult?.sets.at(-1)

  // Prefill: recommendation → previous set today → same set last time
  const initial = useMemo(() => {
    const unit: WeightUnit =
      rec?.unit ?? lastHere?.weightUnit ?? lastTime?.weightUnit ?? session.unit
    const weight = rec?.recommendedWeight ?? lastHere?.weightValue ?? lastTime?.weightValue ?? null
    const reps = lastHere?.repetitions ?? lastTime?.repetitions ?? exercise.targetRepsMin
    return { unit, weight, reps }
  }, [rec, lastHere, lastTime, session.unit, exercise.targetRepsMin])

  const [weight, setWeight] = useState<number | null>(initial.weight)
  const [unit, setUnit] = useState<WeightUnit>(initial.unit)
  const [reps, setReps] = useState<number | null>(initial.reps)
  const [setType, setSetType] = useState<SetType>('working')
  const [rir, setRir] = useState<number | null>(null)
  const [discomfort, setDiscomfort] = useState(false)
  const [more, setMore] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [showWhy, setShowWhy] = useState(false)
  // reused across retries of the same tap so a resend never duplicates
  const pendingKey = useRef<string | null>(null)

  const step =
    exercise.exercise.loadIncrementUnit === unit
      ? exercise.exercise.loadIncrement
      : Number(
          convertWeight(
            exercise.exercise.loadIncrement,
            exercise.exercise.loadIncrementUnit,
            unit
          ).toFixed(1)
        )
  const switchUnit = (to: WeightUnit) => {
    if (to === unit) return
    if (weight !== null) setWeight(Number(convertWeight(weight, unit, to).toFixed(1)))
    setUnit(to)
  }

  const submit = () => {
    if (processing || reps === null) return
    pendingKey.current ??= requestId()
    setProcessing(true)
    router.post(
      { route: 'workout_sets.store', routeParams: { sessionExerciseId: exercise.id } },
      {
        clientRequestId: pendingKey.current,
        recommendationId: rec?.id ?? null,
        setType,
        weightValue: weight,
        weightUnit: weight === null ? null : unit,
        repetitions: reps,
        rir,
        discomfort,
      },
      {
        ...visit,
        onSuccess: () => {
          pendingKey.current = null
          if ('vibrate' in navigator) navigator.vibrate?.(30)
        },
        onFinish: () => setProcessing(false),
      }
    )
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">
            Serie <span className="num text-foreground">{setNumber}</span> de{' '}
            <span className="num">{totalSets}</span> · {exercise.targetRepsMin}–
            {exercise.targetRepsMax} reps
          </p>
          <h1 className="mt-1 text-xl leading-tight font-semibold tracking-tight text-balance">
            {exercise.exercise.name}
          </h1>
          {exercise.exercise.defaultWeightBasis !== 'total' && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Peso: {BASIS_LABELS[exercise.exercise.defaultWeightBasis].toLowerCase()}
            </p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Opciones del ejercicio">
              <EllipsisVertical className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={onAddSet}>
              <Plus /> Agregar serie
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={onRemoveSet}
              disabled={exercise.targetSets <= Math.max(1, exercise.sets.length)}
            >
              <X /> Quitar una serie
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onSubstitute} disabled={exercise.sets.length > 0}>
              <Replace /> Sustituir ejercicio
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onSkip}>
              <SkipForward /> Omitir ejercicio
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link route="exercises.show" routeParams={{ id: exercise.exercise.id }}>
                <Info /> Técnica e historial
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Recommendation */}
      {rec && (
        <div className="mx-4 mt-3 rounded-xl border border-border bg-background/60 sm:mx-5">
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
          >
            <Sparkles className="size-4 shrink-0 text-primary-ink" />
            <span className="flex-1 text-sm">
              {rec.recommendedWeight !== null ? (
                <>
                  Recomendado{' '}
                  <span className="num font-semibold">
                    {num(rec.recommendedWeight)} {rec.unit}
                  </span>{' '}
                  · {rec.targetRepsMin}–{rec.targetRepsMax} reps
                </>
              ) : (
                'Sin historial para recomendar peso'
              )}
            </span>
            <ChevronDown
              className={cn(
                'size-4 text-muted-foreground transition-transform',
                showWhy && 'rotate-180'
              )}
            />
          </button>
          {showWhy && (
            <div className="border-t border-border px-3 py-2.5 text-sm text-muted-foreground">
              <p className="text-pretty">{rec.rationale}</p>
              {rec.warnings.map((w) => (
                <p key={w} className="mt-1.5 flex gap-1.5 text-xs">
                  <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" /> {w}
                </p>
              ))}
              <p className="mt-1.5 text-xs">
                Confianza {Math.round(rec.confidence * 100)}% · descanso{' '}
                {Math.round((rec.restSeconds / 60) * 10) / 10} min
              </p>
            </div>
          )}
        </div>
      )}

      {/* Inputs */}
      <div className="grid grid-cols-1 gap-3 px-4 pt-4 min-[380px]:grid-cols-2 sm:px-5">
        <NumberStepper
          label="Peso"
          value={weight}
          onChange={setWeight}
          step={step || 5}
          decimals={1}
          placeholder="—"
          suffix={
            <span className="inline-flex overflow-hidden rounded-md border border-border text-[11px]">
              {(['lb', 'kg'] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => switchUnit(u)}
                  className={cn(
                    'px-2 py-0.5 font-semibold',
                    unit === u ? 'bg-foreground text-background' : 'text-muted-foreground'
                  )}
                  aria-pressed={unit === u}
                >
                  {u}
                </button>
              ))}
            </span>
          }
        />
        <NumberStepper
          label="Repeticiones"
          value={reps}
          onChange={setReps}
          step={1}
          max={500}
          invalid={reps === null}
        />
      </div>

      <div className="px-4 pt-3 sm:px-5">
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn('size-3.5 transition-transform', more && 'rotate-180')} />
          {setType !== 'working' || rir !== null || discomfort
            ? 'Detalles de la serie (editados)'
            : 'Detalles de la serie'}
        </button>
        {more && (
          <div className="mt-3 grid gap-3">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de serie">
              {(
                [
                  ['working', 'Efectiva'],
                  ['warmup', 'Calentamiento'],
                  ['dropset', 'Drop set'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={setType === value}
                  onClick={() => setSetType(value)}
                  className={cn(
                    'h-9 rounded-lg border px-3 text-sm',
                    setType === value
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-muted-foreground'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">Repeticiones en reserva (RIR)</p>
              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setRir(rir === v ? null : v)}
                    className={cn(
                      'num h-9 min-w-10 rounded-lg border px-2 text-sm',
                      rir === v
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    {v === 4 ? '4+' : v}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={discomfort}
                onChange={(e) => setDiscomfort(e.target.checked)}
                className="size-4 accent-[var(--primary)]"
              />
              Sentí molestia o dolor
            </label>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <Button
          size="lg"
          className="h-14 w-full text-base font-semibold"
          onClick={submit}
          disabled={processing || reps === null}
        >
          {processing ? (
            'Guardando…'
          ) : (
            <>
              <Check className="size-5" /> Registrar serie
            </>
          )}
        </Button>
      </div>

      {exercise.sets.length > 0 && (
        <div className="border-t border-border px-2 py-2 sm:px-3">
          <ul>
            {exercise.sets.map((set) => (
              <SetRow
                key={set.id}
                set={set}
                onEdit={() => onEdit(set)}
                onRepeat={() => onRepeat(set)}
                highlight={set.id === lastHere?.id}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function PendingExercise({
  exercise,
  onFocus,
  onUp,
  onDown,
  onSkip,
  onSubstitute,
  onRemove,
}: {
  exercise: SessionExerciseDTO
  onFocus: () => void
  onUp: () => void
  onDown: () => void
  onSkip: () => void
  onSubstitute: () => void
  onRemove: () => void
}) {
  return (
    <li className="flex items-center gap-2 rounded-xl border border-border bg-card p-2 pl-3">
      <button type="button" onClick={onFocus} className="min-w-0 flex-1 py-1 text-left">
        <span className="block truncate text-sm font-medium">{exercise.exercise.name}</span>
        <span className="text-xs text-muted-foreground">
          {exercise.sets.length > 0
            ? `${exercise.sets.length}/${exercise.targetSets} series`
            : `${exercise.targetSets} × ${exercise.targetRepsMin}–${exercise.targetRepsMax}`}
        </span>
      </button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onUp}
        aria-label={`Subir ${exercise.exercise.name}`}
      >
        <ArrowUp className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={onDown}
        aria-label={`Bajar ${exercise.exercise.name}`}
      >
        <ArrowDown className="size-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" aria-label={`Opciones de ${exercise.exercise.name}`}>
            <EllipsisVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onFocus}>
            <Play /> Hacer ahora
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSubstitute} disabled={exercise.sets.length > 0}>
            <Replace /> Sustituir
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSkip}>
            <SkipForward /> Omitir
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={onRemove}
            disabled={exercise.sets.length > 0}
          >
            <X /> Quitar de la sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

function DoneExercise({
  exercise,
  onEdit,
  onReopen,
}: {
  exercise: SessionExerciseDTO
  onEdit: (set: SetDTO) => void
  onReopen: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <li className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <span
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full',
            exercise.status === 'skipped'
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary text-primary-foreground'
          )}
        >
          {exercise.status === 'skipped' ? (
            <SkipForward className="size-3" />
          ) : (
            <Check className="size-3.5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{exercise.exercise.name}</span>
          <span className="text-xs text-muted-foreground">
            {exercise.status === 'skipped'
              ? 'Omitido'
              : `${exercise.sets.length} series · ${num(exercise.totals.reps, 0)} reps`}
          </span>
        </span>
        <ChevronDown
          className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="border-t border-border px-2 pb-2">
          <ul className="pt-1">
            {exercise.sets.map((set) => (
              <SetRow key={set.id} set={set} onEdit={() => onEdit(set)} />
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="mt-1" onClick={onReopen}>
            {exercise.status === 'skipped' ? 'Retomar ejercicio' : 'Hacer otra serie'}
          </Button>
        </div>
      )}
    </li>
  )
}

function FinishDialog({
  open,
  onOpenChange,
  session,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  session: LiveSessionDTO
}) {
  const router = useRouter()
  const [notes, setNotes] = useState(session.notes ?? '')
  const [processing, setProcessing] = useState(false)
  const unfinished = session.exercises.filter(
    (e) => e.status === 'pending' || e.status === 'in_progress'
  )
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar sesión</DialogTitle>
          <DialogDescription>
            {session.progress.loggedSets} series registradas
            {unfinished.length > 0 &&
              ` · ${unfinished.length} ejercicio(s) sin terminar se marcarán como omitidos si no tienen series`}
            .
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Notas de la sesión (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
        {unfinished.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {unfinished.map((e) => (
              <Badge key={e.id} variant="secondary">
                {e.exercise.name}
              </Badge>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Seguir entrenando
          </Button>
          <Button
            disabled={processing || session.progress.loggedSets === 0}
            onClick={() => {
              setProcessing(true)
              router.post(
                { route: 'workouts.finish', routeParams: { id: session.id } },
                { notes: notes || null },
                { onFinish: () => setProcessing(false) }
              )
            }}
          >
            {processing ? 'Generando resumen…' : 'Finalizar y ver resumen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
