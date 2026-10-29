import type { SetType, WeightBasis, WeightUnit } from './enums.js'
import type { LoadContext } from './load.js'

/**
 * The shape every pure calculation works on — decoupled from Lucid models so
 * services, imports, tests and the client can all feed it.
 */
export type SetPerformance = {
  setNumber: number
  setType: SetType
  weightValue: number | null
  weightUnit: WeightUnit | null
  weightBasis: WeightBasis
  repetitions: number | null
  rir?: number | null
  rpe?: number | null
  techniqueOk?: boolean | null
  discomfort?: boolean
}

export type ExercisePerformance = {
  exerciseId: number
  exerciseName?: string
  context: LoadContext
  sets: SetPerformance[]
}

export type SessionPerformance = {
  sessionId: number
  workoutDate: string
  exercises: ExercisePerformance[]
}

export function isWorkingSet(set: Pick<SetPerformance, 'setType'>): boolean {
  return set.setType !== 'warmup'
}

export function hasEffortData(set: SetPerformance): boolean {
  return (set.rir ?? null) !== null || (set.rpe ?? null) !== null
}

/**
 * Reps in reserve, from RIR when logged or derived from RPE (RPE 10 = 0 RIR).
 */
export function repsInReserve(set: SetPerformance): number | null {
  if (set.rir !== null && set.rir !== undefined) return set.rir
  if (set.rpe !== null && set.rpe !== undefined) return Math.max(0, 10 - set.rpe)
  return null
}
