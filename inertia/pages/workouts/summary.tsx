import { useState, type ReactNode } from 'react'
import { Head, usePage } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Link2,
  ListPlus,
  Minus,
  Share2,
  Sparkles,
  Trophy,
} from 'lucide-react'
import type { SetDTO, SummaryExerciseDTO, WorkoutSummaryDTO } from '@domain/dto'
import AppLayout from '~/layouts/app'
import FlashToasts from '~/components/flash_toasts'
import Logo from '~/components/logo'
import { VolumeBars } from '~/components/charts'
import SectionCard from '~/components/section_card'
import Stat from '~/components/stat'
import EditSetDialog from '~/components/workout/edit_set_dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { compact, date, duration, longDate, num, RECORD_LABELS } from '~/lib/format'
import { cn } from '~/lib/utils'

type Props = { summary: WorkoutSummaryDTO; shared: boolean; aiAvailable: boolean }

const SIGNAL: Record<string, { label: string; icon: typeof ArrowUpRight; tone: string }> = {
  load_up: { label: 'Más carga', icon: ArrowUpRight, tone: 'text-primary-ink' },
  reps_up: { label: 'Más reps', icon: ArrowUpRight, tone: 'text-primary-ink' },
  volume_up: { label: 'Más volumen', icon: ArrowUpRight, tone: 'text-primary-ink' },
  steady: { label: 'Igual', icon: Minus, tone: 'text-muted-foreground' },
  down: { label: 'Por debajo', icon: ArrowDownRight, tone: 'text-warning' },
  not_comparable: { label: 'No comparable', icon: Minus, tone: 'text-muted-foreground' },
}

export default function WorkoutSummary({ summary, shared, aiAvailable }: Props) {
  const { session, unit } = summary
  const [editing, setEditing] = useState<{ set: SetDTO; exercise: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const volume = unit === 'lb' ? summary.volumeLb : summary.volumeKg
  const chart = summary.perExercise
    .filter((e) => e.totals.sets > 0)
    .map((e) => ({
      name: e.name.length > 14 ? `${e.name.slice(0, 13)}…` : e.name,
      volume: unit === 'lb' ? e.totals.volumeLb : e.totals.volumeKg,
    }))
  const shareUrl = summary.shareToken ? `${window.location.origin}/s/${summary.shareToken}` : null

  const copy = async () => {
    if (!shareUrl) return
    if (navigator.share) {
      await navigator.share({ title: `${session.name} · Forma`, url: shareUrl }).catch(() => {})
      return
    }
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Head title={`Resumen · ${session.name}`} />
      {shared && (
        <div className="mb-6 flex items-center justify-between">
          <Logo withSlogan />
        </div>
      )}

      <header className="mb-6">
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {longDate(session.workoutDate)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight lg:text-3xl">{session.name}</h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {session.source === 'import' && <Badge variant="OFFLINE">Importada</Badge>}
          {session.dataQuality !== 'complete' && (
            <Badge variant="OFFLINE">
              Datos {session.dataQuality === 'partial' ? 'parciales' : 'incompletos'}
            </Badge>
          )}
          {session.dateConfidence !== 'exact' && <Badge variant="OFFLINE">Fecha aproximada</Badge>}
        </div>
        {!shared && (
          <div className="mt-4 flex flex-wrap gap-2">
            {shareUrl ? (
              <>
                <Button variant="OUTLINE" onClick={copy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}{' '}
                  {copied ? 'Copiado' : 'Copiar enlace'}
                </Button>
                <Form route="workouts.unshare" routeParams={{ id: session.id }}>
                  <Button variant="GHOST" type="submit">
                    <Link2 className="size-4" /> Dejar de compartir
                  </Button>
                </Form>
              </>
            ) : (
              <Form
                route="workouts.share"
                routeParams={{ id: session.id }}
                options={{ preserveScroll: true }}
              >
                <Button variant="OUTLINE" type="submit">
                  <Share2 className="size-4" /> Compartir resumen
                </Button>
              </Form>
            )}
            {aiAvailable && !summary.aiNarrative && (
              <Form
                route="workouts.narrate"
                routeParams={{ id: session.id }}
                options={{ preserveScroll: true }}
              >
                {({ processing }) => (
                  <Button variant="GHOST" type="submit" disabled={processing}>
                    <Sparkles className="size-4" /> {processing ? 'Redactando…' : 'Resumen con IA'}
                  </Button>
                )}
              </Form>
            )}
            <Form route="routines.from_session" routeParams={{ sessionId: session.id }}>
              <Button variant="GHOST" type="submit">
                <ListPlus className="size-4" /> Guardar como rutina
              </Button>
            </Form>
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Volumen total"
          value={compact(volume)}
          unit={unit}
          accent
          hint={unit === 'lb' ? `${num(summary.volumeKg, 0)} kg` : `${num(summary.volumeLb, 0)} lb`}
        />
        <Stat
          label="Series"
          value={summary.setsCount}
          hint={`${summary.workingSetsCount} efectivas`}
        />
        <Stat
          label="Repeticiones"
          value={num(summary.totalReps, 0)}
          hint={`${summary.exercisesCompleted} ejercicios`}
        />
        <Stat
          label="Duración"
          value={summary.durationSeconds ? duration(summary.durationSeconds) : '—'}
          hint={comparisonHint(summary)}
        />
      </div>

      {(summary.observations.length > 0 || summary.aiNarrative) && (
        <SectionCard title="Observaciones" className="mt-4">
          {summary.aiNarrative && <p className="mb-3 text-sm text-pretty">{summary.aiNarrative}</p>}
          <ul className="grid gap-2 text-sm">
            {summary.observations.map((o) => (
              <li key={o} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-pretty">{o}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <SectionCard
          title="Volumen por ejercicio"
          className="lg:col-span-2"
          action={<span className="text-xs text-muted-foreground">{unit}</span>}
        >
          <VolumeBars
            data={chart}
            dataKey="volume"
            xKey="name"
            unit={unit}
            highlightLast={false}
            height={200}
          />
        </SectionCard>
        <SectionCard
          title="Mejores marcas"
          action={<Trophy className="size-4 text-muted-foreground" />}
        >
          {summary.records.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin marcas nuevas esta vez. Las marcas se comparan solo contra tu historial real.
            </p>
          ) : (
            <ul className="grid gap-3">
              {summary.records.map((r) => (
                <li key={`${r.exerciseId}-${r.recordType}-${r.basis}`} className="text-sm">
                  <div className="font-medium">{r.exerciseName}</div>
                  <div className="text-muted-foreground">
                    {RECORD_LABELS[r.recordType]}:{' '}
                    <span className="num font-semibold text-foreground">
                      {num(r.value)} {r.valueUnit}
                    </span>
                    {r.previous !== null && <span className="num"> (antes {num(r.previous)})</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <h2 className="mt-8 mb-3 text-base font-semibold">Detalle por ejercicio</h2>
      <div className="grid gap-3">
        {summary.perExercise.map((e) => (
          <ExerciseBlock
            key={e.sessionExerciseId}
            exercise={e}
            unit={unit}
            shared={shared}
            onEdit={(set) => setEditing({ set, exercise: e.name })}
          />
        ))}
      </div>

      {!shared && (
        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild variant="OUTLINE">
            <Link route="history.index">Ver historial</Link>
          </Button>
          {summary.comparison.previousSessionId && (
            <Button asChild variant="GHOST">
              <Link
                route="history.compare"
                qs={{ a: summary.comparison.previousSessionId, b: session.id }}
              >
                Comparar con la sesión anterior <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </div>
      )}

      {!shared && (
        <EditSetDialog
          key={editing?.set.id ?? 'none'}
          set={editing?.set ?? null}
          exerciseName={editing?.exercise ?? ''}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
      {shared && <FlashToasts />}
    </>
  )
}

/** Public shared summaries render without the app chrome. */
function SummaryLayout({ children }: { children: ReactNode }) {
  const { props } = usePage<{ shared?: boolean }>()
  return props.shared ? (
    <div className="mx-auto max-w-4xl px-4 py-8">{children}</div>
  ) : (
    <AppLayout>{children}</AppLayout>
  )
}

WorkoutSummary.layout = [SummaryLayout]

function comparisonHint(summary: WorkoutSummaryDTO) {
  const c = summary.comparison
  if (c.volumeDeltaLb === null || !c.previousDate) return undefined
  const delta = summary.unit === 'lb' ? c.volumeDeltaLb : c.volumeDeltaLb / 2.20462262185
  const sign = delta > 0 ? '+' : ''
  return `${sign}${compact(delta)} ${summary.unit} vs ${date(c.previousDate)}`
}

function ExerciseBlock({
  exercise,
  unit,
  shared,
  onEdit,
}: {
  exercise: SummaryExerciseDTO
  unit: string
  shared: boolean
  onEdit: (set: SetDTO) => void
}) {
  const signal = exercise.comparison ? SIGNAL[exercise.comparison.signal] : null
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 pb-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{exercise.name}</h3>
          <p className="num text-xs text-muted-foreground">
            {exercise.status === 'skipped' && exercise.totals.sets === 0
              ? 'Omitido'
              : `${exercise.totals.sets} series · ${exercise.totals.reps} reps · ${compact(unit === 'lb' ? exercise.totals.volumeLb : exercise.totals.volumeKg)} ${unit}`}
          </p>
        </div>
        {signal && exercise.comparison && (
          <span
            className={cn('flex items-center gap-1 text-xs font-medium', signal.tone)}
            title={exercise.comparison.note}
          >
            <signal.icon className="size-4" /> {signal.label}
            <span className="font-normal text-muted-foreground">
              vs {date(exercise.comparison.previousDate)}
            </span>
          </span>
        )}
      </div>

      {exercise.sets.length > 0 && (
        <div className="overflow-x-auto px-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">#</th>
                <th className="px-2 py-1.5 font-medium">Peso</th>
                <th className="px-2 py-1.5 font-medium">Reps</th>
                <th className="px-2 py-1.5 text-right font-medium">Volumen</th>
                {!shared && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {exercise.sets.map((set) => (
                <tr key={set.id} className="border-t border-border">
                  <td className="num px-2 py-2 text-muted-foreground">
                    {set.setNumber}
                    {set.setType === 'warmup' && <span className="ml-1 text-[10px]">C</span>}
                  </td>
                  <td className="num px-2 py-2 font-medium">
                    {set.weightValue === null ? '—' : `${num(set.weightValue)} ${set.weightUnit}`}
                    {set.weightBasis === 'per_hand' && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">/mano</span>
                    )}
                  </td>
                  <td className="num px-2 py-2 font-medium">{set.repetitions ?? '—'}</td>
                  <td className="num px-2 py-2 text-right text-muted-foreground">
                    {set.weightValue !== null && set.repetitions !== null
                      ? num(set.weightValue * set.repetitions, 0)
                      : '—'}
                  </td>
                  {!shared && (
                    <td className="py-1 text-right">
                      <button
                        type="button"
                        onClick={() => onEdit(set)}
                        className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {exercise.nextTarget && (
        <div className="m-2 mt-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm">
          <span className="font-medium">Próxima sesión: </span>
          {exercise.nextTarget.recommendedWeight !== null ? (
            <span className="num">
              {num(exercise.nextTarget.recommendedWeight)} {exercise.nextTarget.unit} ·{' '}
              {exercise.nextTarget.targetRepsMin}–{exercise.nextTarget.targetRepsMax} reps
            </span>
          ) : (
            'elige un peso para el rango objetivo'
          )}
          <p className="mt-0.5 text-xs text-pretty text-muted-foreground">
            {exercise.nextTarget.rationale}
          </p>
        </div>
      )}
      {exercise.sets.length === 0 && <div className="h-2" />}
    </section>
  )
}
