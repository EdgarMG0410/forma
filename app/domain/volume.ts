import type { WeightBasis, WeightUnit } from './enums.js'
import { effectiveLoad, type LoadContext } from './load.js'
import { isWorkingSet, repsInReserve, type SetPerformance } from './performance.js'
import { round } from './units.js'

/**
 * A set counts as effective when it is not a warm-up, has reps, and — when
 * effort was logged — finished within `maxRir` reps of failure. Without effort
 * data a working set is assumed effective; it is the user's own label.
 */
export const EFFECTIVE_SET_MAX_RIR = 4

export function isEffectiveSet(set: SetPerformance, maxRir = EFFECTIVE_SET_MAX_RIR): boolean {
  if (!isWorkingSet(set)) return false
  if (!set.repetitions || set.repetitions <= 0) return false
  const rir = repsInReserve(set)
  return rir === null || rir <= maxRir
}

/**
 * Load × reps for one set, or null when either side is unknown.
 */
export function setVolume(set: SetPerformance, context: LoadContext, unit: WeightUnit) {
  const load = effectiveLoad(set, context, unit)
  if (load.value === null || set.repetitions === null) return null
  return { value: load.value * set.repetitions, basis: load.basis }
}

export type VolumeTotals = {
  unit: WeightUnit
  /** Load moved across every set with a known weight (warm-ups included). */
  total: number
  /** Same, excluding warm-ups. */
  working: number
  /** Split by basis so per-hand and machine-display numbers are never mistaken for total load. */
  byBasis: Partial<Record<WeightBasis, number>>
  sets: number
  workingSets: number
  effectiveSets: number
  reps: number
  workingReps: number
  /** Sets whose volume could not be computed (missing weight or reps). */
  incompleteSets: number
}

export function emptyTotals(unit: WeightUnit): VolumeTotals {
  return {
    unit,
    total: 0,
    working: 0,
    byBasis: {},
    sets: 0,
    workingSets: 0,
    effectiveSets: 0,
    reps: 0,
    workingReps: 0,
    incompleteSets: 0,
  }
}

export function sumVolume(
  sets: SetPerformance[],
  context: LoadContext,
  unit: WeightUnit,
  into: VolumeTotals = emptyTotals(unit)
): VolumeTotals {
  for (const set of sets) {
    into.sets += 1
    into.reps += set.repetitions ?? 0
    const working = isWorkingSet(set)
    if (working) {
      into.workingSets += 1
      into.workingReps += set.repetitions ?? 0
    }
    if (isEffectiveSet(set)) into.effectiveSets += 1

    const volume = setVolume(set, context, unit)
    if (volume === null) {
      into.incompleteSets += 1
      continue
    }
    into.total += volume.value
    if (working) into.working += volume.value
    into.byBasis[volume.basis] = (into.byBasis[volume.basis] ?? 0) + volume.value
  }
  return into
}

export function roundTotals(totals: VolumeTotals): VolumeTotals {
  const byBasis: VolumeTotals['byBasis'] = {}
  for (const [basis, value] of Object.entries(totals.byBasis)) {
    byBasis[basis as WeightBasis] = round(value, 2)
  }
  return { ...totals, total: round(totals.total, 2), working: round(totals.working, 2), byBasis }
}

/**
 * Training volume per muscle group, counted in effective sets — not load.
 * Primary muscles get a full set, secondary muscles half a set. This is the
 * number that compares across machines and implements; load volume does not.
 */
export function muscleGroupSets(
  exercises: Array<{
    sets: SetPerformance[]
    muscles: Array<{ slug: string; role: 'primary' | 'secondary' }>
  }>
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const exercise of exercises) {
    const effective = exercise.sets.filter((set) => isEffectiveSet(set)).length
    if (!effective) continue
    for (const muscle of exercise.muscles) {
      const weight = muscle.role === 'primary' ? 1 : 0.5
      result[muscle.slug] = (result[muscle.slug] ?? 0) + effective * weight
    }
  }
  return result
}
