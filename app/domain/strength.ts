import type { WeightBasis, WeightUnit } from './enums.js'
import { effectiveLoad, type LoadContext } from './load.js'
import { isWorkingSet, type SetPerformance } from './performance.js'
import { round } from './units.js'

/**
 * Epley's estimate is only meaningful for low-to-moderate rep sets; past
 * ~12 reps it drifts into fiction, so we refuse rather than guess.
 */
export const E1RM_MAX_REPS = 12

export function estimateOneRepMax(load: number, reps: number): number | null {
  if (load <= 0 || reps < 1 || reps > E1RM_MAX_REPS) return null
  if (reps === 1) return load
  return round(load * (1 + reps / 30), 2)
}

export type SetMetrics = {
  setNumber: number
  load: number | null
  reps: number | null
  basis: WeightBasis
  volume: number | null
  e1rm: number | null
}

export function setMetrics(
  set: SetPerformance,
  context: LoadContext,
  unit: WeightUnit,
  supportsE1rm = true
): SetMetrics {
  const load = effectiveLoad(set, context, unit)
  const reps = set.repetitions
  const volume = load.value !== null && reps !== null ? load.value * reps : null
  const e1rm =
    supportsE1rm && load.value !== null && reps !== null && load.basis !== 'unknown'
      ? estimateOneRepMax(load.value, reps)
      : null
  return { setNumber: set.setNumber, load: load.value, reps, basis: load.basis, volume, e1rm }
}

/**
 * The heaviest working set (ties broken by reps) — the "top set".
 */
export function topSet(
  sets: SetPerformance[],
  context: LoadContext,
  unit: WeightUnit
): SetMetrics | null {
  let best: SetMetrics | null = null
  for (const set of sets) {
    if (!isWorkingSet(set)) continue
    const metrics = setMetrics(set, context, unit)
    if (metrics.load === null || !metrics.reps) continue
    if (
      !best ||
      metrics.load > (best.load ?? 0) ||
      (metrics.load === best.load && (metrics.reps ?? 0) > (best.reps ?? 0))
    ) {
      best = metrics
    }
  }
  return best
}
