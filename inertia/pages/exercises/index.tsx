import { useMemo, useState } from 'react'
import { Link } from '@adonisjs/inertia/react'
import { Plus, Search } from 'lucide-react'
import AppLayout from '~/layouts/app'
import PageHeader from '~/components/page_header'
import ExerciseFormDialog from '~/components/exercise_form_dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { date, EQUIPMENT_LABELS } from '~/lib/format'
import { cn } from '~/lib/utils'
import type { CatalogExercise, MuscleOption } from '~/types/views'

type Props = { exercises: CatalogExercise[]; muscles: MuscleOption[] }

const normalize = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Exercises({ exercises, muscles }: Props) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<string | null>(null)
  const [mineOnly, setMineOnly] = useState(false)
  const [creating, setCreating] = useState(false)
  const muscleName = new Map(muscles.map((m) => [m.slug, m.name]))

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    return exercises
      .filter((e) => !q || normalize(e.name).includes(q))
      .filter(
        (e) => !muscle || e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle)
      )
      .filter((e) => !mineOnly || e.sessions > 0)
  }, [exercises, query, muscle, mineOnly])

  return (
    <>
      <PageHeader
        title="Ejercicios"
        description={`${exercises.length} en tu biblioteca`}
        actions={
          <Button variant="EXEC" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Nuevo ejercicio
          </Button>
        }
      />

      <div className="mb-4 grid gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={mineOnly} onClick={() => setMineOnly((v) => !v)}>
            Con historial
          </Chip>
          {muscles.map((m) => (
            <Chip
              key={m.slug}
              active={muscle === m.slug}
              onClick={() => setMuscle(muscle === m.slug ? null : m.slug)}
            >
              {m.name}
            </Chip>
          ))}
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((e) => (
          <li key={e.id}>
            <Link
              route="exercises.show"
              routeParams={{ id: e.id }}
              className="flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{e.name}</span>
                {e.isCustom && <Badge variant="OFFLINE">Propio</Badge>}
              </div>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {EQUIPMENT_LABELS[e.equipment]} ·{' '}
                {e.primaryMuscles.map((m) => muscleName.get(m) ?? m).join(', ')}
              </span>
              <span className="mt-auto pt-3 text-xs text-muted-foreground">
                {e.sessions > 0
                  ? `${e.sessions} sesiones · última ${date(e.lastDone)}`
                  : 'Sin registros'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">Sin resultados.</p>
      )}

      <ExerciseFormDialog
        key={creating ? 'open' : 'closed'}
        open={creating}
        onOpenChange={setCreating}
        muscles={muscles}
      />
    </>
  )
}

Exercises.layout = [AppLayout]

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-8 shrink-0 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}
