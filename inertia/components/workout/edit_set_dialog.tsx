import { useState } from 'react'
import { useRouter } from '@adonisjs/inertia/react'
import type { SetDTO } from '@domain/dto'
import type { SetType, WeightBasis, WeightUnit } from '@domain/enums'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogBody,
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
import { BASIS_LABELS, SET_TYPE_LABELS } from '~/lib/format'

/**
 * Corrects a logged set. The server keeps the original values in an audit
 * trail and marks the set as corrected by the user.
 */
export default function EditSetDialog({
  set,
  exerciseName,
  open,
  onOpenChange,
}: {
  set: SetDTO | null
  exerciseName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  // callers key this component by set id, so the form starts from the set
  const [form, setForm] = useState({
    weightValue: set?.weightValue === null || !set ? '' : String(set.weightValue),
    weightUnit: (set?.weightUnit ?? 'lb') as WeightUnit,
    weightBasis: (set?.weightBasis ?? 'total') as WeightBasis,
    repetitions: set?.repetitions === null || !set ? '' : String(set.repetitions),
    setType: (set?.setType ?? 'working') as SetType,
    rir: set?.rir === null || !set ? '' : String(set.rir),
    reason: '',
  })
  const [processing, setProcessing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!set) return null
  const toNumber = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))

  const save = () => {
    setProcessing(true)
    router.patch(
      { route: 'workout_sets.update', routeParams: { id: set.id } },
      {
        weightValue: toNumber(form.weightValue),
        weightUnit: toNumber(form.weightValue) === null ? null : form.weightUnit,
        weightBasis: form.weightBasis,
        repetitions: toNumber(form.repetitions),
        setType: form.setType,
        rir: toNumber(form.rir),
        reason: form.reason || null,
      },
      {
        preserveScroll: true,
        onSuccess: () => onOpenChange(false),
        onFinish: () => setProcessing(false),
      }
    )
  }

  const remove = () => {
    setProcessing(true)
    router.delete(
      { route: 'workout_sets.destroy', routeParams: { id: set.id } },
      {
        preserveScroll: true,
        onSuccess: () => onOpenChange(false),
        onFinish: () => setProcessing(false),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Corregir serie {set.setNumber}</DialogTitle>
          <DialogDescription>
            {exerciseName}. El valor original queda guardado en el historial de cambios.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-weight">Peso</Label>
              <Input
                id="edit-weight"
                inputMode="decimal"
                value={form.weightValue}
                onChange={(e) => setForm({ ...form, weightValue: e.target.value })}
                className="num h-11 text-lg"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Unidad</Label>
              <Select
                value={form.weightUnit}
                onValueChange={(v) => setForm({ ...form, weightUnit: v as WeightUnit })}
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
            <div className="grid gap-1.5">
              <Label htmlFor="edit-reps">Repeticiones</Label>
              <Input
                id="edit-reps"
                inputMode="numeric"
                value={form.repetitions}
                onChange={(e) => setForm({ ...form, repetitions: e.target.value })}
                className="num h-11 text-lg"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-rir">RIR</Label>
              <Input
                id="edit-rir"
                inputMode="decimal"
                placeholder="—"
                value={form.rir}
                onChange={(e) => setForm({ ...form, rir: e.target.value })}
                className="num h-11 text-lg"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.setType}
                onValueChange={(v) => setForm({ ...form, setType: v as SetType })}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SET_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Base del peso</Label>
              <Select
                value={form.weightBasis}
                onValueChange={(v) => setForm({ ...form, weightBasis: v as WeightBasis })}
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
            <div className="col-span-2 grid gap-1.5">
              <Label htmlFor="edit-reason">Motivo (opcional)</Label>
              <Input
                id="edit-reason"
                placeholder="Ej. registré mal el peso"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="h-11"
              />
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="gap-2 sm:justify-between">
          {confirmDelete ? (
            <Button variant="ABORT" onClick={remove} disabled={processing}>
              Confirmar eliminación
            </Button>
          ) : (
            <Button
              variant="GHOST"
              className="text-destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={processing}
            >
              Eliminar serie
            </Button>
          )}
          <Button variant="EXEC" onClick={save} disabled={processing}>
            {processing ? 'Guardando…' : 'Guardar corrección'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
