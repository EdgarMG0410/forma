import type { WeightUnit } from './enums.js'
import type { LoadContext } from './load.js'
import type { SetPerformance } from './performance.js'
import { topSet } from './strength.js'
import { round } from './units.js'
import { sumVolume } from './volume.js'

export type ProgressSignal =
  'load_up' | 'reps_up' | 'volume_up' | 'steady' | 'down' | 'not_comparable'

export type ExerciseComparison = {
  signal: ProgressSignal
  topLoadDelta: number | null
  topRepsDelta: number | null
  workingVolumeDelta: number | null
  workingRepsDelta: number
  note: string
}

/**
 * Compares the same exercise across two sessions. Load volume of different
 * machines is never compared; callers only pass two performances of the
 * same exercise, and a basis change between them is reported as not
 * comparable instead of a fake delta.
 */
export function compareExercise(
  current: SetPerformance[],
  previous: SetPerformance[],
  context: LoadContext,
  unit: WeightUnit
): ExerciseComparison {
  const nowTop = topSet(current, context, unit)
  const prevTop = topSet(previous, context, unit)
  const nowTotals = sumVolume(current, context, unit)
  const prevTotals = sumVolume(previous, context, unit)
  const workingRepsDelta = nowTotals.workingReps - prevTotals.workingReps

  if (!nowTop || !prevTop || nowTop.basis !== prevTop.basis) {
    return {
      signal: 'not_comparable',
      topLoadDelta: null,
      topRepsDelta: null,
      workingVolumeDelta: null,
      workingRepsDelta,
      note: !nowTop || !prevTop ? 'Sin datos suficientes' : 'Base de peso distinta',
    }
  }

  const topLoadDelta = round((nowTop.load ?? 0) - (prevTop.load ?? 0), 2)
  const topRepsDelta = (nowTop.reps ?? 0) - (prevTop.reps ?? 0)
  const workingVolumeDelta = round(nowTotals.working - prevTotals.working, 2)

  let signal: ProgressSignal = 'steady'
  let note = 'Rendimiento similar'
  if (topLoadDelta > 0 && topRepsDelta >= -2) {
    signal = 'load_up'
    note = `+${topLoadDelta} ${unit} en la serie principal`
  } else if (topLoadDelta === 0 && topRepsDelta > 0) {
    signal = 'reps_up'
    note = `+${topRepsDelta} reps con el mismo peso`
  } else if (topLoadDelta >= 0 && workingVolumeDelta > 0) {
    signal = 'volume_up'
    note = 'Más volumen de trabajo'
  } else if (topLoadDelta < 0 || (topLoadDelta === 0 && topRepsDelta < 0)) {
    signal = 'down'
    note = 'Por debajo de la sesión anterior'
  }

  return { signal, topLoadDelta, topRepsDelta, workingVolumeDelta, workingRepsDelta, note }
}
