import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import { Link, useRouter } from '@adonisjs/inertia/react'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import type { ExerciseRefDTO } from '@domain/dto'
import AppLayout from '~/layouts/app'
import PageHeader from '~/components/page_header'
import ExercisePicker from '~/components/exercise_picker'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { cn } from '~/lib/utils'
import type { RoutineForm, RoutineSetForm } from '~/types/views'

type Props = { routine: RoutineForm | null; catalog: ExerciseRefDTO[] }
type Item = RoutineForm['exercises'][number] & { key: string }

const defaultSet = (prev?: RoutineSetForm): RoutineSetForm =>
  prev
    ? { ...prev }
    : {
        setType: 'working',
        targetRepsMin: 8,
        targetRepsMax: 12,
        targetWeightValue: null,
        targetWeightUnit: null,
        restSeconds: null,
      }

let seq = 0
const key = () => `i${++seq}`

export default function RoutineEditor({ routine, catalog }: Props) {
  const router = useRouter()
  const { props } = usePage()
  const errors = (props.errors ?? {}) as Record<string, string>
  const byId = new Map(catalog.map((e) => [e.id, e]))
  const [name, setName] = useState(routine?.name ?? '')
  const [focus, setFocus] = useState(routine?.focus ?? '')
  const [description, setDescription] = useState(routine?.description ?? '')
  const [items, setItems] = useState<Item[]>(() =>
    (routine?.exercises ?? []).map((e) => ({ ...e, key: key() }))
  )
  const [picking, setPicking] = useState(false)
  const [processing, setProcessing] = useState(false)

  const update = (k: string, change: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === k ? { ...i, ...change } : i)))
  const move = (index: number, dir: -1 | 1) =>
    setItems((list) => {
      const next = [...list]
      const j = index + dir
      if (j < 0 || j >= next.length) return list
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })

  const save = () => {
    setProcessing(true)
    const payload = {
      name,
      focus: focus || null,
      description: description || null,
      exercises: items.map(({ key: _k, ...rest }) => rest),
    }
    const options = { onFinish: () => setProcessing(false) }
    if (routine)
      router.put({ route: 'routines.update', routeParams: { id: routine.id } }, payload, options)
    else router.post({ route: 'routines.store' }, payload, options)
  }

  return (
    <>
      <PageHeader
        title={routine ? 'Editar rutina' : 'Nueva rutina'}
        eyebrow={
          <Link
            route="routines.index"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Rutinas
          </Link>
        }
      />

      <div className="grid max-w-3xl gap-6">
        <section className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 sm:p-5">
          <div className="grid gap-1.5">
            <Label htmlFor="r-name">Nombre</Label>
            <Input
              id="r-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Pierna A"
              className="h-11"
              aria-invalid={!!errors.name}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="r-focus">Enfoque</Label>
            <Input
              id="r-focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Cuádriceps, empuje…"
              className="h-11"
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="r-desc">Notas</Label>
            <Textarea
              id="r-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </section>

        <section className="grid gap-3">
          {items.map((item, index) => {
            const exercise = byId.get(item.exerciseId)
            return (
              <div key={item.key} className="rounded-xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <span className="num grid size-6 place-items-center rounded-md bg-muted text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {exercise?.name ?? 'Ejercicio'}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => move(index, -1)}
                    aria-label="Subir"
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => move(index, 1)}
                    aria-label="Bajar"
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setItems((l) => l.filter((i) => i.key !== item.key))}
                    aria-label="Quitar ejercicio"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <div className="grid gap-2 p-3">
                  <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2.25rem] items-center gap-2 px-1 text-xs text-muted-foreground">
                    <span>#</span>
                    <span>Tipo</span>
                    <span>Reps mín</span>
                    <span>Reps máx</span>
                    <span />
                  </div>
                  {item.sets.map((set, si) => (
                    <div
                      key={si}
                      className="grid grid-cols-[2rem_1fr_1fr_1fr_2.25rem] items-center gap-2"
                    >
                      <span className="num px-1 text-sm text-muted-foreground">{si + 1}</span>
                      <select
                        value={set.setType}
                        onChange={(e) =>
                          update(item.key, {
                            sets: item.sets.map((s, i) =>
                              i === si
                                ? { ...s, setType: e.target.value as RoutineSetForm['setType'] }
                                : s
                            ),
                          })
                        }
                        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <option value="working">Efectiva</option>
                        <option value="warmup">Calentamiento</option>
                        <option value="dropset">Drop set</option>
                      </select>
                      {(['targetRepsMin', 'targetRepsMax'] as const).map((field) => (
                        <Input
                          key={field}
                          inputMode="numeric"
                          value={set[field]}
                          onChange={(e) =>
                            update(item.key, {
                              sets: item.sets.map((s, i) =>
                                i === si ? { ...s, [field]: Number(e.target.value) || 0 } : s
                              ),
                            })
                          }
                          className={cn(
                            'num h-10',
                            set.targetRepsMax < set.targetRepsMin && 'border-destructive'
                          )}
                        />
                      ))}
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={item.sets.length <= 1}
                        onClick={() =>
                          update(item.key, { sets: item.sets.filter((_, i) => i !== si) })
                        }
                        aria-label="Quitar serie"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        update(item.key, { sets: [...item.sets, defaultSet(item.sets.at(-1))] })
                      }
                    >
                      <Plus className="size-4" /> Serie
                    </Button>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Descanso (s)
                      <Input
                        inputMode="numeric"
                        value={item.restSeconds ?? ''}
                        placeholder="auto"
                        onChange={(e) =>
                          update(item.key, {
                            restSeconds: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="num h-8 w-20"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )
          })}
          <Button
            variant="outline"
            size="lg"
            className="h-12 border-dashed"
            onClick={() => setPicking(true)}
          >
            <Plus className="size-4" /> Agregar ejercicio
          </Button>
          {errors.exercises && (
            <p className="text-sm text-destructive">Agrega al menos un ejercicio.</p>
          )}
        </section>

        <div className="flex flex-wrap justify-between gap-2">
          {routine ? (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() =>
                window.confirm('¿Archivar esta rutina? Las sesiones pasadas no cambian.') &&
                router.delete({ route: 'routines.destroy', routeParams: { id: routine.id } })
              }
            >
              Archivar rutina
            </Button>
          ) : (
            <span />
          )}
          <Button
            size="lg"
            onClick={save}
            disabled={processing || name.trim().length < 2 || items.length === 0}
          >
            {processing ? 'Guardando…' : 'Guardar rutina'}
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={picking}
        onOpenChange={setPicking}
        exercises={catalog}
        title="Agregar ejercicio"
        onPick={(exercise) => {
          setItems((list) => [
            ...list,
            {
              key: key(),
              exerciseId: exercise.id,
              restSeconds: null,
              notes: null,
              sets: [defaultSet(), defaultSet(), defaultSet()],
            },
          ])
          setPicking(false)
        }}
      />
    </>
  )
}

RoutineEditor.layout = [AppLayout]
