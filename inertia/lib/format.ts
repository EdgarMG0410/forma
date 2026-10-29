import type { WeightUnit } from '@domain/enums'

const nf = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 })
const nf0 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })

export function num(value: number | null | undefined, decimals: 0 | 1 = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return (decimals === 0 ? nf0 : nf).format(value)
}

export function weight(
  value: number | null | undefined,
  unit: WeightUnit | string | null | undefined
): string {
  if (value === null || value === undefined) return '—'
  return `${num(value)} ${unit ?? ''}`.trim()
}

export function compact(value: number): string {
  if (Math.abs(value) >= 1000) return `${nf.format(value / 1000)}k`
  return nf0.format(value)
}

export function date(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
) {
  if (!iso) return '—'
  // date-only strings are calendar dates, not instants: render them in UTC
  const d = iso.length === 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso)
  return d.toLocaleDateString('es-MX', { ...opts, timeZone: iso.length === 10 ? 'UTC' : undefined })
}

export function longDate(iso: string | null | undefined) {
  return date(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function duration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  machine: 'Máquina',
  cable: 'Polea',
  smith_machine: 'Smith',
  bodyweight: 'Peso corporal',
  kettlebell: 'Kettlebell',
  band: 'Banda',
  other: 'Otro',
}

export const BASIS_LABELS: Record<string, string> = {
  total: 'Total',
  per_hand: 'Por mano',
  machine_display: 'Pantalla de máquina',
  unknown: 'Desconocida',
}

export const SET_TYPE_LABELS: Record<string, string> = {
  warmup: 'Calentamiento',
  working: 'Efectiva',
  dropset: 'Drop set',
}

export const RECORD_LABELS: Record<string, string> = {
  max_weight: 'Peso máximo',
  max_reps: 'Más repeticiones',
  best_set_volume: 'Mejor serie',
  estimated_1rm: '1RM estimado',
}
