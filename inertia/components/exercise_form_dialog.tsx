import { useState } from 'react'
import { useRouter } from '@adonisjs/inertia/react'
import { usePage } from '@inertiajs/react'
import type { Equipment, ExerciseType, WeightBasis, WeightUnit } from '@domain/enums'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { BASIS_LABELS, EQUIPMENT_LABELS } from '~/lib/format'
import { cn } from '~/lib/utils'
import type { ExerciseDetail, MuscleOption } from '~/types/views'

type FormState = {
  name: string
  equipment: Equipment
  exerciseType: ExerciseType
  defaultWeightBasis: WeightBasis
  perHandMultiplier: number | null
  loadIncrement: number
  loadIncrementUnit: WeightUnit
  primaryMuscles: string[]
  secondaryMuscles: string[]
  technique: string
  tips: string
  aliases: string
}

const blank: FormState = {
  name: '',
  equipment: 'machine',
  exerciseType: 'compound',
  defaultWeightBasis: 'machine_display',
  perHandMultiplier: null,
  loadIncrement: 5,
  loadIncrementUnit: 'lb',
  primaryMuscles: [],
  secondaryMuscles: [],
  technique: '',
  tips: '',
  aliases: '',
}

export default function ExerciseFormDialog({
  open,
  onOpenChange,
  muscles,
  exercise,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  muscles: MuscleOption[]
  exercise?: ExerciseDetail
}) {
  const router = useRouter()
  const { props } = usePage()
  const errors = (props.errors ?? {}) as Record<string, string>
  // callers remount this dialog on open (key), so the form starts from the exercise
  const [form, setForm] = useState<FormState>(() =>
    exercise
      ? {
          name: exercise.name,
          equipment: exercise.equipment,
          exerciseType: exercise.exerciseType,
          defaultWeightBasis: exercise.defaultWeightBasis,
          perHandMultiplier: exercise.perHandMultiplier,
          loadIncrement: exercise.loadIncrement,
          loadIncrementUnit: exercise.loadIncrementUnit,
          primaryMuscles: exercise.primaryMuscles,
          secondaryMuscles: exercise.secondaryMuscles,
          technique: exercise.technique ?? '',
          tips: exercise.tips ?? '',
          aliases: exercise.aliases.join(', '),
        }
      : blank
  )
  const [processing, setProcessing] = useState(false)

  const toggleMuscle = (slug: string) => {
    const inPrimary = form.primaryMuscles.includes(slug)
    const inSecondary = form.secondaryMuscles.includes(slug)
    // cycle: none → primary → secondary → none
    if (!inPrimary && !inSecondary)
      setForm({ ...form, primaryMuscles: [...form.primaryMuscles, slug] })
    else if (inPrimary)
      setForm({
        ...form,
        primaryMuscles: form.primaryMuscles.filter((m) => m !== slug),
        secondaryMuscles: [...form.secondaryMuscles, slug],
      })
    else setForm({ ...form, secondaryMuscles: form.secondaryMuscles.filter((m) => m !== slug) })
  }

  const submit = () => {
    setProcessing(true)
    const payload = {
      ...form,
      perHandMultiplier: form.defaultWeightBasis === 'per_hand' ? form.perHandMultiplier : null,
      technique: form.technique || null,
      tips: form.tips || null,
      aliases: form.aliases
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length >= 2),
    }
    const options = {
      preserveScroll: true,
      onSuccess: () => onOpenChange(false),
      onFinish: () => setProcessing(false),
    }
    if (exercise)
      router.put({ route: 'exercises.update', routeParams: { id: exercise.id } }, payload, options)
    else router.post({ route: 'exercises.store' }, payload, options)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{exercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}</DialogTitle>
          <DialogDescription>
            Define cómo se registra el peso para que volumen y récords sean correctos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ex-name">Nombre</Label>
            <Input
              id="ex-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-11"
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Equipamiento</Label>
              <Select
                value={form.equipment}
                onValueChange={(v) => setForm({ ...form, equipment: v as Equipment })}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EQUIPMENT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.exerciseType}
                onValueChange={(v) => setForm({ ...form, exerciseType: v as ExerciseType })}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compound">Compuesto</SelectItem>
                  <SelectItem value="isolation">Aislamiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Base del peso</Label>
              <Select
                value={form.defaultWeightBasis}
                onValueChange={(v) => setForm({ ...form, defaultWeightBasis: v as WeightBasis })}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BASIS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.defaultWeightBasis === 'per_hand' ? (
              <div className="grid gap-1.5">
                <Label htmlFor="ex-mult">Implementos (para volumen total)</Label>
                <Input
                  id="ex-mult"
                  inputMode="numeric"
                  placeholder="Sin convertir"
                  value={form.perHandMultiplier ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      perHandMultiplier: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="h-11"
                />
              </div>
            ) : (
              <div />
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="ex-inc">Incremento</Label>
              <Input
                id="ex-inc"
                inputMode="decimal"
                value={form.loadIncrement}
                onChange={(e) => setForm({ ...form, loadIncrement: Number(e.target.value) || 0 })}
                className="h-11"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Unidad del incremento</Label>
              <Select
                value={form.loadIncrementUnit}
                onValueChange={(v) => setForm({ ...form, loadIncrementUnit: v as WeightUnit })}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lb">lb</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Músculos</Label>
            <p className="text-xs text-muted-foreground">
              Toca una vez para principal, dos para secundario.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {muscles.map((m) => {
                const role = form.primaryMuscles.includes(m.slug)
                  ? 'primary'
                  : form.secondaryMuscles.includes(m.slug)
                    ? 'secondary'
                    : null
                return (
                  <button
                    key={m.slug}
                    type="button"
                    onClick={() => toggleMuscle(m.slug)}
                    className={cn(
                      'h-8 rounded-full border px-3 text-xs',
                      role === 'primary' && 'border-foreground bg-foreground text-background',
                      role === 'secondary' && 'border-foreground/40 bg-muted text-foreground',
                      !role && 'border-border text-muted-foreground'
                    )}
                  >
                    {m.name}
                    {role === 'secondary' && ' ·2'}
                  </button>
                )
              })}
            </div>
            {errors.primaryMuscles && (
              <p className="text-xs text-destructive">Elige al menos un músculo principal.</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ex-aliases">Otros nombres (separados por coma)</Label>
            <Input
              id="ex-aliases"
              value={form.aliases}
              onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              className="h-11"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ex-tech">Técnica</Label>
            <Textarea
              id="ex-tech"
              rows={3}
              value={form.technique}
              onChange={(e) => setForm({ ...form, technique: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ex-tips">Recomendaciones</Label>
            <Textarea
              id="ex-tips"
              rows={2}
              value={form.tips}
              onChange={(e) => setForm({ ...form, tips: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={processing || form.name.trim().length < 2 || form.primaryMuscles.length === 0}
          >
            {processing ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
