import { useState } from 'react'
import { Form, Link, useRouter } from '@adonisjs/inertia/react'
import { ArrowLeft, CircleAlert, FileJson, RotateCcw, Upload } from 'lucide-react'
import AppLayout from '~/layouts/app'
import PageHeader from '~/components/page_header'
import SectionCard from '~/components/section_card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { date, num } from '~/lib/format'

type Preview = {
  batchId: number | null
  fileHash: string
  sourceName: string
  sessions: Array<{
    externalId: string | null
    name: string
    date: string
    dateConfidence: string
    status: string
    exercises: number
    sets: number
    reps: number
    action: 'create' | 'update' | 'skip'
    warnings: string[]
  }>
  exercises: Array<{
    key: string
    label: string
    resolvedId: number | null
    resolvedName: string | null
    canCreate: boolean
    sets: number
  }>
  bodyMeasurements: number
  totals: { sessions: number; sets: number; reps: number; volumeByUnit: Record<string, number> }
  errors: string[]
}

type Props = {
  preview: Preview | null
  catalog: Array<{ id: number; name: string }>
  batches: Array<{
    id: number
    sourceName: string
    status: string
    createdAt: string
    stats: Record<string, Record<string, number>>
    errors: string[]
  }>
}

const ACTION_LABEL = { create: 'Nueva', update: 'Actualiza', skip: 'Duplicada' }
const STATUS_LABEL: Record<string, string> = {
  imported: 'Importado',
  reverted: 'Revertido',
  failed: 'Falló',
  importing: 'En proceso',
  previewed: 'Simulado',
}

export default function ImportPage({ preview, catalog, batches }: Props) {
  const router = useRouter()
  const [mapping, setMapping] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (preview?.exercises ?? []).map((e) => [e.key, e.resolvedId ? String(e.resolvedId) : 'create'])
    )
  )
  const [processing, setProcessing] = useState(false)

  return (
    <>
      <PageHeader
        title="Importar historial"
        description="Archivo JSON con formato forma.workouts v1. Nada se guarda hasta que confirmes."
        eyebrow={
          <Link
            route="settings.show"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Ajustes
          </Link>
        }
      />

      {!preview ? (
        <div className="grid max-w-3xl gap-4">
          <SectionCard title="Subir archivo">
            <Form route="imports.preview" encType="multipart/form-data" className="grid gap-3">
              {({ processing: uploading, errors }) => (
                <>
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-10 text-center hover:bg-accent/50">
                    <FileJson className="size-8 text-muted-foreground" />
                    <span className="text-sm font-medium">Elige un archivo .json</span>
                    <span className="text-xs text-muted-foreground">
                      Hasta 10 MB. Puedes reimportar el mismo archivo: se actualiza, no se duplica.
                    </span>
                    <input
                      type="file"
                      name="file"
                      accept="application/json,.json"
                      className="mt-2 text-sm"
                      required
                    />
                  </label>
                  {(errors as Record<string, string>).file && (
                    <p className="text-sm text-destructive">
                      {(errors as Record<string, string>).file}
                    </p>
                  )}
                  <Button type="submit" disabled={uploading}>
                    <Upload className="size-4" /> {uploading ? 'Analizando…' : 'Ver vista previa'}
                  </Button>
                </>
              )}
            </Form>
          </SectionCard>

          <SectionCard title="Lotes importados">
            {batches.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no has importado nada.</p>
            ) : (
              <ul className="divide-y divide-border">
                {batches.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{b.sourceName}</p>
                      <p className="text-xs text-muted-foreground">
                        #{b.id} ·{' '}
                        {date(b.createdAt, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        · {b.stats.session?.created ?? 0} sesiones, {b.stats.set?.created ?? 0}{' '}
                        series nuevas
                      </p>
                      {b.errors.length > 0 && (
                        <p className="mt-1 text-xs text-warning">{b.errors[0]}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={b.status === 'imported' ? 'default' : 'outline'}>
                        {STATUS_LABEL[b.status] ?? b.status}
                      </Badge>
                      {b.status === 'imported' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            window.confirm(
                              '¿Revertir este lote? Se borra lo que creó; lo que hayas corregido después se conserva.'
                            ) &&
                            router.post({ route: 'imports.revert', routeParams: { id: b.id } }, {})
                          }
                        >
                          <RotateCcw className="size-4" /> Revertir
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Sesiones', num(preview.totals.sessions, 0)],
              ['Series', num(preview.totals.sets, 0)],
              ['Repeticiones', num(preview.totals.reps, 0)],
              [
                'Volumen',
                Object.entries(preview.totals.volumeByUnit)
                  .map(([u, v]) => `${num(v, 0)} ${u}`)
                  .join(' + ') || '—',
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="num mt-1 text-xl font-semibold">{value}</div>
              </div>
            ))}
          </div>

          {preview.errors.length > 0 && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
              {preview.errors.map((e) => (
                <p key={e} className="flex gap-2">
                  <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" /> {e}
                </p>
              ))}
            </div>
          )}

          <SectionCard
            title="Ejercicios del archivo"
            action={
              <span className="text-xs text-muted-foreground">
                corrige las asociaciones antes de importar
              </span>
            }
          >
            <ul className="grid gap-2">
              {preview.exercises.map((e) => (
                <li key={e.key} className="grid items-center gap-2 sm:grid-cols-[1fr_280px]">
                  <span className="text-sm">
                    <span className="font-medium">{e.label}</span>{' '}
                    <span className="text-xs text-muted-foreground">· {e.sets} series</span>
                  </span>
                  <Select
                    value={mapping[e.key]}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [e.key]: v }))}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">Crear como ejercicio propio</SelectItem>
                      {catalog.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="Sesiones">
            <ul className="divide-y divide-border">
              {preview.sessions.map((s, i) => (
                <li
                  key={`${s.externalId ?? i}`}
                  className="flex flex-wrap items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {s.name}{' '}
                      <span className="num font-normal text-muted-foreground">
                        · {date(s.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </p>
                    <p className="num text-xs text-muted-foreground">
                      {s.exercises} ejercicios · {s.sets} series · {s.reps} reps
                    </p>
                    {s.warnings.map((w) => (
                      <p key={w} className="text-xs text-warning">
                        {w}
                      </p>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={s.action === 'skip' ? 'outline' : 'secondary'}>
                      {ACTION_LABEL[s.action]}
                    </Badge>
                    {s.status === 'partial' && <Badge variant="outline">Parcial</Badge>}
                    {s.dateConfidence !== 'exact' && (
                      <Badge variant="outline">Fecha {s.dateConfidence}</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <div className="flex flex-wrap justify-end gap-2">
            <Button asChild variant="ghost">
              <Link route="imports.index">Cancelar</Link>
            </Button>
            <Button
              disabled={processing}
              onClick={() => {
                setProcessing(true)
                router.post(
                  { route: 'imports.store' },
                  { hash: preview.fileHash, sourceName: preview.sourceName, mapping },
                  { onFinish: () => setProcessing(false) }
                )
              }}
            >
              {processing ? 'Importando…' : `Importar ${preview.totals.sessions} sesiones`}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

ImportPage.layout = [AppLayout]
