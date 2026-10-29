import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { ExerciseRefDTO } from '@domain/dto'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { EQUIPMENT_LABELS } from '~/lib/format'

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Searchable exercise list in a dialog. Used to add or substitute exercises
 * mid-session and while building routines.
 */
export default function ExercisePicker({
  open,
  onOpenChange,
  exercises,
  title,
  description,
  onPick,
  excludeIds = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  exercises: ExerciseRefDTO[] | undefined
  title: string
  description?: string
  onPick: (exercise: ExerciseRefDTO) => void
  excludeIds?: number[]
}) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => {
    const q = normalize(query.trim())
    return (exercises ?? [])
      .filter((e) => !excludeIds.includes(e.id))
      .filter(
        (e) =>
          !q ||
          normalize(e.name).includes(q) ||
          e.slug.includes(q.replace(/\s+/g, '-')) ||
          e.primaryMuscles.some((m) => m.includes(q))
      )
      .slice(0, 60)
  }, [exercises, query, excludeIds])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-3 p-0 sm:max-w-lg">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="relative px-5">
          <Search className="pointer-events-none absolute top-1/2 left-8 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar ejercicio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {exercises === undefined && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Cargando ejercicios…
            </li>
          )}
          {exercises !== undefined && results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">Sin resultados.</li>
          )}
          {results.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(exercise)
                  setQuery('')
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-accent"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{exercise.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {EQUIPMENT_LABELS[exercise.equipment]}
                  </span>
                </span>
                {exercise.isCustom && (
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">
                    propio
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
