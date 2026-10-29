import type { WeightBasis, WeightUnit } from './enums.js'
import { convertWeight } from './units.js'

/**
 * A captured weight, exactly as logged.
 */
export type CapturedWeight = {
  weightValue: number | null
  weightUnit: WeightUnit | null
  weightBasis: WeightBasis
}

/**
 * What the exercise says about turning a captured number into load.
 * `perHandMultiplier` is the only way a per-hand number becomes a total:
 * a pair of 50 lb dumbbells is 100 lb of load *only* when the exercise
 * explicitly says two implements are moved.
 */
export type LoadContext = {
  perHandMultiplier: number | null
}

export type EffectiveLoad = {
  value: number | null
  unit: WeightUnit
  /** The basis the value is expressed in after conversion. */
  basis: WeightBasis
  /** True when the number came from an explicit per-hand → total conversion. */
  converted: boolean
}

export function effectiveLoad(
  set: CapturedWeight,
  context: LoadContext,
  unit: WeightUnit
): EffectiveLoad {
  if (set.weightValue === null || set.weightUnit === null) {
    return { value: null, unit, basis: set.weightBasis, converted: false }
  }

  const value = convertWeight(set.weightValue, set.weightUnit, unit)

  if (set.weightBasis === 'per_hand' && context.perHandMultiplier) {
    return { value: value * context.perHandMultiplier, unit, basis: 'total', converted: true }
  }

  return { value, unit, basis: set.weightBasis, converted: false }
}
