import { useState } from 'react'
import { Form, Link, useRouter } from '@adonisjs/inertia/react'
import { Download, Upload } from 'lucide-react'
import type { LengthUnit, Theme, TrainingGoal, WeightUnit } from '@domain/enums'
import AppLayout from '~/layouts/app'
import PageHeader from '~/components/page_header'
import SectionCard from '~/components/section_card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'

type Preferences = {
  weightUnit: WeightUnit
  lengthUnit: LengthUnit
  theme: Theme
  timezone: string
  trainingGoal: TrainingGoal
  weeklySessionsGoal: number
  defaultRestSeconds: number
  defaultRepsMin: number
  defaultRepsMax: number
  trackRir: boolean
  autoStartRestTimer: boolean
  aiEnabled: boolean
  aiShareBodyData: boolean
}

type Props = {
  profile: { fullName: string | null; email: string }
  settings: Preferences
  ai: { providerConfigured: boolean }
}

const GOALS: Record<TrainingGoal, string> = {
  strength: 'Fuerza',
  hypertrophy: 'Hipertrofia',
  recomposition: 'Recomposición',
  general: 'Salud general',
}

export default function Settings({ profile, settings, ai }: Props) {
  const router = useRouter()
  const [prefs, setPrefs] = useState(settings)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) =>
    setPrefs((p) => ({ ...p, [key]: value }))

  const savePrefs = () => {
    setSaving(true)
    router.put({ route: 'settings.preferences' }, prefs, {
      preserveScroll: true,
      onFinish: () => setSaving(false),
    })
  }

  return (
    <>
      <PageHeader title="Ajustes" />
      <div className="grid max-w-3xl gap-4">
        <SectionCard title="Perfil">
          <Form
            route="settings.profile"
            options={{ preserveScroll: true }}
            className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
          >
            {({ processing }) => (
              <>
                <div className="grid gap-1.5">
                  <Label htmlFor="fullName">Nombre</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    defaultValue={profile.fullName ?? ''}
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground">{profile.email}</p>
                </div>
                <Button type="submit" variant="OUTLINE" disabled={processing}>
                  Guardar
                </Button>
              </>
            )}
          </Form>
        </SectionCard>

        <SectionCard title="Objetivos y entrenamiento">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Objetivo">
              <Select
                value={prefs.trainingGoal}
                onValueChange={(v) => set('trainingGoal', v as TrainingGoal)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GOALS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Sesiones por semana">
              <Input
                inputMode="numeric"
                value={prefs.weeklySessionsGoal}
                onChange={(e) => set('weeklySessionsGoal', Number(e.target.value) || 1)}
                className="num h-10"
              />
            </Field>
            <Field label="Rango de reps por defecto">
              <div className="flex items-center gap-2">
                <Input
                  inputMode="numeric"
                  value={prefs.defaultRepsMin}
                  onChange={(e) => set('defaultRepsMin', Number(e.target.value) || 1)}
                  className="num h-10"
                />
                <span className="text-muted-foreground">–</span>
                <Input
                  inputMode="numeric"
                  value={prefs.defaultRepsMax}
                  onChange={(e) => set('defaultRepsMax', Number(e.target.value) || 1)}
                  className="num h-10"
                />
              </div>
            </Field>
            <Field label="Descanso por defecto (s)">
              <Input
                inputMode="numeric"
                value={prefs.defaultRestSeconds}
                onChange={(e) => set('defaultRestSeconds', Number(e.target.value) || 60)}
                className="num h-10"
              />
            </Field>
            <Toggle
              label="Registrar RIR"
              hint="Ayuda al motor a decidir cuándo subir carga."
              checked={prefs.trackRir}
              onChange={(v) => set('trackRir', v)}
            />
            <Toggle
              label="Iniciar descanso automáticamente"
              checked={prefs.autoStartRestTimer}
              onChange={(v) => set('autoStartRestTimer', v)}
            />
          </div>
        </SectionCard>

        <SectionCard title="Unidades">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Peso">
              <Segmented
                value={prefs.weightUnit}
                options={[
                  ['lb', 'lb'],
                  ['kg', 'kg'],
                ]}
                onChange={(v) => set('weightUnit', v as WeightUnit)}
              />
            </Field>
            <Field label="Medidas">
              <Segmented
                value={prefs.lengthUnit}
                options={[
                  ['cm', 'cm'],
                  ['in', 'in'],
                ]}
                onChange={(v) => set('lengthUnit', v as LengthUnit)}
              />
            </Field>
            <Field label="Zona horaria">
              <Input
                value={prefs.timezone}
                onChange={(e) => set('timezone', e.target.value)}
                className="h-10"
              />
            </Field>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Cambiar la unidad no altera tus registros: cada serie conserva el peso y la unidad con
            que se capturó.
          </p>
        </SectionCard>

        <SectionCard title="Inteligencia artificial">
          <div className="grid gap-4">
            <p className="text-sm text-pretty text-muted-foreground">
              Forma funciona completo sin IA. Si la activas, el asistente puede interpretar mensajes
              como «hice 9 con 120», explicar recomendaciones y resumir sesiones. Nunca guarda datos
              sin tu confirmación.
            </p>
            {!ai.providerConfigured && (
              <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                No hay proveedor configurado en el servidor; se usará solo el intérprete local.
              </p>
            )}
            <Toggle
              label="Activar asistente"
              checked={prefs.aiEnabled}
              onChange={(v) => set('aiEnabled', v)}
            />
            <Toggle
              label="Compartir datos corporales con el proveedor"
              hint="Peso, medidas y molestias reportadas. Desactivado, el asistente solo ve tus series."
              checked={prefs.aiShareBodyData}
              disabled={!prefs.aiEnabled}
              onChange={(v) => set('aiShareBodyData', v)}
            />
          </div>
        </SectionCard>

        <div className="flex justify-end">
          <Button variant="EXEC" onClick={savePrefs} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar preferencias'}
          </Button>
        </div>

        <SectionCard title="Tus datos">
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href="/settings/export"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent"
            >
              <Download className="size-4 text-muted-foreground" />
              <span>
                <span className="block font-medium">Exportar todo</span>
                <span className="text-xs text-muted-foreground">
                  JSON versionado, re-importable
                </span>
              </span>
            </a>
            <Link
              route="imports.index"
              className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-accent"
            >
              <Upload className="size-4 text-muted-foreground" />
              <span>
                <span className="block font-medium">Importar historial</span>
                <span className="text-xs text-muted-foreground">Vista previa antes de guardar</span>
              </span>
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Privacidad">
          <ul className="grid gap-1.5 text-sm text-muted-foreground">
            <li>
              Tus datos solo los ves tú. Un resumen compartido es de solo lectura y puedes revocar
              su enlace.
            </li>
            <li>Las mediciones corporales no se envían a la IA sin tu consentimiento explícito.</li>
            <li>Forma muestra tendencias, no diagnósticos médicos.</li>
          </ul>
        </SectionCard>

        <SectionCard title="Eliminar cuenta" className="border-destructive/30">
          <Form
            route="settings.destroy_account"
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          >
            {({ processing, errors }) => (
              <>
                <Field label="Contraseña">
                  <Input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    className="h-10"
                  />
                </Field>
                <Field label="Escribe ELIMINAR">
                  <Input
                    name="confirmation"
                    autoComplete="off"
                    className="h-10"
                    aria-invalid={!!errors.confirmation}
                  />
                </Field>
                <Button type="submit" variant="ABORT" disabled={processing}>
                  Eliminar todo
                </Button>
                <p className="text-xs text-muted-foreground sm:col-span-3">
                  Borra permanentemente tu cuenta, sesiones, mediciones y rutinas. Exporta antes si
                  quieres conservarlos.
                </p>
              </>
            )}
          </Form>
        </SectionCard>
      </div>
    </>
  )
}

Settings.layout = [AppLayout]

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </label>
  )
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string
  options: Array<[string, string]>
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex h-10 rounded-lg border border-border p-0.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`rounded-md px-4 text-sm ${value === v ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
        >
          {l}
        </button>
      ))}
    </div>
  )
}
