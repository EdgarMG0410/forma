import { useState } from 'react'
import { useRouter } from '@adonisjs/inertia/react'
import { Pencil, Plus, Ruler, Trash2 } from 'lucide-react'
import { BODY_SITES, type BodySite, type LengthUnit, type WeightUnit } from '@domain/enums'
import { convertLength, convertWeight } from '@domain/units'
import AppLayout from '~/layouts/app'
import PageHeader from '~/components/page_header'
import EmptyState from '~/components/empty_state'
import SectionCard from '~/components/section_card'
import { TrendLine } from '~/components/charts'
import Stat from '~/components/stat'
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
import { Textarea } from '~/components/ui/textarea'
import { date, num } from '~/lib/format'
import { cn } from '~/lib/utils'
import type { BodyEntry } from '~/types/views'

type Props = { units: { weight: WeightUnit; length: LengthUnit }; measurements: BodyEntry[] }

const SITE_LABELS: Record<BodySite, string> = {
  waist: 'Cintura',
  chest: 'Pecho',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  forearm: 'Antebrazo',
  hips: 'Cadera',
  thigh: 'Muslo',
  calf: 'Pantorrilla',
  neck: 'Cuello',
}

type Metric = 'bodyWeight' | 'bodyFatPct' | BodySite

export default function Body({ units, measurements }: Props) {
  const [editing, setEditing] = useState<BodyEntry | 'new' | null>(null)
  const [metric, setMetric] = useState<Metric>('bodyWeight')
  const router = useRouter()

  // normalise every entry into the user's units for trends
  const series = [...measurements].reverse().map((m) => ({
    label: date(m.measuredOn),
    bodyWeight:
      m.bodyWeight !== null && m.bodyWeightUnit
        ? Number(convertWeight(m.bodyWeight, m.bodyWeightUnit, units.weight).toFixed(1))
        : null,
    bodyFatPct: m.bodyFatPct,
    ...Object.fromEntries(
      BODY_SITES.map((s) => [
        s,
        m.sites[s] === null
          ? null
          : Number(convertLength(m.sites[s]!, m.lengthUnit, units.length).toFixed(1)),
      ])
    ),
  }))
  const latest = (key: Metric) =>
    [...series].reverse().find((p) => (p as any)[key] !== null)?.[
      key as keyof (typeof series)[number]
    ] as number | undefined
  const first = (key: Metric) =>
    series.find((p) => (p as any)[key] !== null)?.[key as keyof (typeof series)[number]] as
      number | undefined
  const delta = (key: Metric) => {
    const a = first(key)
    const b = latest(key)
    if (a === undefined || b === undefined || series.length < 2) return undefined
    const d = b - a
    return `${d > 0 ? '+' : ''}${num(d)} desde ${date(measurements.at(-1)?.measuredOn)}`
  }
  const metricUnit =
    metric === 'bodyWeight' ? units.weight : metric === 'bodyFatPct' ? '%' : units.length
  const available: Metric[] = (['bodyWeight', 'bodyFatPct', ...BODY_SITES] as Metric[]).filter(
    (k) => series.some((p) => (p as any)[k] !== null)
  )

  return (
    <>
      <PageHeader
        title="Cuerpo"
        description="Tendencias de tus mediciones. No son diagnósticos médicos."
        actions={
          <Button variant="EXEC" onClick={() => setEditing('new')}>
            <Plus className="size-4" /> Nueva medición
          </Button>
        }
      />

      {measurements.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="Sin mediciones"
          action={
            <Button variant="EXEC" onClick={() => setEditing('new')}>
              Registrar la primera
            </Button>
          }
        >
          Registra peso, porcentaje de grasa o medidas para ver su evolución.
        </EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat
              label="Peso corporal"
              value={num(latest('bodyWeight') ?? null)}
              unit={units.weight}
              hint={delta('bodyWeight')}
            />
            <Stat
              label="% grasa"
              value={num(latest('bodyFatPct') ?? null)}
              unit="%"
              hint={delta('bodyFatPct')}
            />
            <Stat
              label="Cintura"
              value={num(latest('waist') ?? null)}
              unit={units.length}
              hint={delta('waist')}
            />
            <Stat
              label="Mediciones"
              value={measurements.length}
              hint={`última ${date(measurements[0].measuredOn)}`}
            />
          </div>

          {available.length > 0 && (
            <SectionCard
              className="mt-4"
              title="Tendencia"
              action={<span className="text-xs text-muted-foreground">{metricUnit}</span>}
            >
              <div className="mb-3 flex flex-wrap gap-1.5">
                {available.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setMetric(k)}
                    className={cn(
                      'h-7 rounded-full border px-2.5 text-xs',
                      metric === k
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border text-muted-foreground'
                    )}
                  >
                    {k === 'bodyWeight' ? 'Peso' : k === 'bodyFatPct' ? '% grasa' : SITE_LABELS[k]}
                  </button>
                ))}
              </div>
              {series.filter((p) => (p as any)[metric] !== null).length < 2 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Se necesitan dos mediciones de este dato para ver la tendencia.
                </p>
              ) : (
                <TrendLine
                  data={series}
                  xKey="label"
                  lines={[{ key: metric, name: '' }]}
                  unit={metricUnit}
                />
              )}
            </SectionCard>
          )}

          <h2 className="mt-8 mb-3 text-base font-semibold">Registros</h2>
          <ul className="grid gap-2">
            {measurements.map((m) => (
              <li
                key={m.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {date(m.measuredOn, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="num mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {m.bodyWeight !== null && (
                      <span>
                        {num(m.bodyWeight)} {m.bodyWeightUnit}
                      </span>
                    )}
                    {m.bodyFatPct !== null && <span>{num(m.bodyFatPct)}%</span>}
                    {BODY_SITES.filter((s) => m.sites[s] !== null).map((s) => (
                      <span key={s}>
                        {SITE_LABELS[s]} {num(m.sites[s])} {m.lengthUnit}
                      </span>
                    ))}
                  </p>
                </div>
                <Button
                  size="ICON"
                  variant="GHOST"
                  onClick={() => setEditing(m)}
                  aria-label="Editar medición"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  size="ICON"
                  variant="GHOST"
                  onClick={() =>
                    window.confirm('¿Eliminar esta medición?') &&
                    router.delete(
                      { route: 'body.destroy', routeParams: { id: m.id } },
                      { preserveScroll: true }
                    )
                  }
                  aria-label="Eliminar medición"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      <MeasurementDialog entry={editing} units={units} onClose={() => setEditing(null)} />
    </>
  )
}

Body.layout = [AppLayout]

function MeasurementDialog({
  entry,
  units,
  onClose,
}: {
  entry: BodyEntry | 'new' | null
  units: Props['units']
  onClose: () => void
}) {
  const router = useRouter()
  const existing = entry && entry !== 'new' ? entry : null
  const [processing, setProcessing] = useState(false)
  const formKey = existing ? `e${existing.id}` : entry ? 'new' : 'closed'

  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form)
    const n = (k: string) => {
      const v = String(data.get(k) ?? '')
        .replace(',', '.')
        .trim()
      return v === '' ? null : Number(v)
    }
    const payload = {
      measuredOn: String(data.get('measuredOn')),
      bodyWeight: n('bodyWeight'),
      bodyWeightUnit: existing?.bodyWeightUnit ?? units.weight,
      bodyFatPct: n('bodyFatPct'),
      lengthUnit: existing?.lengthUnit ?? units.length,
      notes: String(data.get('notes') ?? '') || null,
      ...Object.fromEntries(BODY_SITES.map((s) => [s, n(s)])),
    }
    setProcessing(true)
    const options = {
      preserveScroll: true,
      onSuccess: onClose,
      onFinish: () => setProcessing(false),
    }
    if (existing)
      router.put({ route: 'body.update', routeParams: { id: existing.id } }, payload, options)
    else router.post({ route: 'body.store' }, payload, options)
  }

  const lengthUnit = existing?.lengthUnit ?? units.length
  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? 'Editar medición' : 'Nueva medición'}</DialogTitle>
          <DialogDescription>
            Deja vacío lo que no midas; no se rellena nada por ti.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          <form
            key={formKey}
            id="measurement-form"
            onSubmit={(e) => {
              e.preventDefault()
              submit(e.currentTarget)
            }}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          >
            <div className="col-span-2 grid gap-1.5 sm:col-span-1">
              <Label htmlFor="m-date">Fecha</Label>
              <Input
                id="m-date"
                name="measuredOn"
                type="date"
                required
                defaultValue={existing?.measuredOn ?? new Date().toISOString().slice(0, 10)}
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="m-weight">Peso ({existing?.bodyWeightUnit ?? units.weight})</Label>
              <Input
                id="m-weight"
                name="bodyWeight"
                inputMode="decimal"
                defaultValue={existing?.bodyWeight ?? ''}
                className="num h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="m-fat">% grasa</Label>
              <Input
                id="m-fat"
                name="bodyFatPct"
                inputMode="decimal"
                defaultValue={existing?.bodyFatPct ?? ''}
                className="num h-10"
              />
            </div>
            {BODY_SITES.map((site) => (
              <div key={site} className="grid gap-1.5">
                <Label htmlFor={`m-${site}`}>
                  {SITE_LABELS[site]} ({lengthUnit})
                </Label>
                <Input
                  id={`m-${site}`}
                  name={site}
                  inputMode="decimal"
                  defaultValue={existing?.sites[site] ?? ''}
                  className="num h-10"
                />
              </div>
            ))}
            <div className="col-span-2 grid gap-1.5 sm:col-span-3">
              <Label htmlFor="m-notes">Notas</Label>
              <Textarea id="m-notes" name="notes" rows={2} defaultValue={existing?.notes ?? ''} />
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="GHOST" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="EXEC" type="submit" form="measurement-form" disabled={processing}>
            {processing ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
