import type { LengthUnit, WeightUnit } from './enums.js'

export const LB_PER_KG = 2.20462262185
export const CM_PER_IN = 2.54

/**
 * Rounds to a fixed number of decimals without the binary-float drift
 * `Math.round(x * 100) / 100` shows on values like 1.005.
 */
export function round(value: number, decimals = 2): number {
  return Number(`${Math.round(Number(`${value}e${decimals}`))}e-${decimals}`)
}

export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value
  return from === 'kg' ? value * LB_PER_KG : value / LB_PER_KG
}

export function toKg(value: number, unit: WeightUnit): number {
  return convertWeight(value, unit, 'kg')
}

export function toLb(value: number, unit: WeightUnit): number {
  return convertWeight(value, unit, 'lb')
}

/**
 * The normalised copies stored next to a captured weight. The captured value
 * and unit are never rewritten; these exist so comparisons and sums across
 * units are exact enough without re-deriving them on every read.
 */
export function normalizeWeight(
  value: number | null,
  unit: WeightUnit | null
): { weightKg: number | null; weightLb: number | null } {
  if (value === null || unit === null) return { weightKg: null, weightLb: null }
  return { weightKg: round(toKg(value, unit), 4), weightLb: round(toLb(value, unit), 4) }
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  if (from === to) return value
  return from === 'in' ? value * CM_PER_IN : value / CM_PER_IN
}

/**
 * Snaps a load to the closest step a gym can actually load (5 lb plates,
 * 2.5 kg plates, a pin stack…). `direction` picks the side of the step when
 * the value falls between two.
 */
export function snapToIncrement(
  value: number,
  increment: number,
  direction: 'nearest' | 'down' | 'up' = 'nearest'
): number {
  if (increment <= 0) return round(value, 2)
  const steps = value / increment
  const snapped =
    direction === 'down'
      ? Math.floor(steps + 1e-9)
      : direction === 'up'
        ? Math.ceil(steps - 1e-9)
        : Math.round(steps)
  return round(snapped * increment, 2)
}

export function formatWeight(value: number | null, unit: WeightUnit | null): string {
  if (value === null || unit === null) return '—'
  return `${round(value, 2).toLocaleString('en-US')} ${unit}`
}
