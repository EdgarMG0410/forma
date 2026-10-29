import type Exercise from '#models/exercise'
import type WorkoutSession from '#models/workout_session'
import type WorkoutSet from '#models/workout_set'
import type { ExerciseRefDTO, SessionHeaderDTO, SetDTO } from '#domain/dto'
import type { SetPerformance } from '#domain/performance'

export function toSetDTO(set: WorkoutSet): SetDTO {
  return {
    id: set.id,
    setNumber: set.setNumber,
    setType: set.setType,
    weightValue: set.weightValue,
    weightUnit: set.weightUnit,
    weightBasis: set.weightBasis,
    repetitions: set.repetitions,
    rir: set.rir,
    rpe: set.rpe,
    techniqueOk: set.techniqueOk,
    discomfort: set.discomfort,
    notes: set.notes,
    completedAt: set.completedAt?.toISO() ?? null,
    source: set.source,
    confidence: set.confidence,
    userCorrected: set.userCorrected,
  }
}

export function toPerformance(set: Pick<WorkoutSet, keyof SetPerformance>): SetPerformance {
  return {
    setNumber: set.setNumber,
    setType: set.setType,
    weightValue: set.weightValue,
    weightUnit: set.weightUnit,
    weightBasis: set.weightBasis,
    repetitions: set.repetitions,
    rir: set.rir,
    rpe: set.rpe,
    techniqueOk: set.techniqueOk,
    discomfort: set.discomfort,
  }
}

/**
 * Requires `muscleGroups` preloaded for the muscle lists to be filled.
 */
export function toExerciseRef(exercise: Exercise): ExerciseRefDTO {
  const muscles = exercise.$preloaded.muscleGroups ? exercise.muscleGroups : []
  return {
    id: exercise.id,
    slug: exercise.slug,
    name: exercise.name,
    equipment: exercise.equipment,
    exerciseType: exercise.exerciseType,
    defaultWeightBasis: exercise.defaultWeightBasis,
    perHandMultiplier: exercise.perHandMultiplier,
    loadIncrement: exercise.loadIncrement,
    loadIncrementUnit: exercise.loadIncrementUnit,
    isCustom: exercise.userId !== null,
    primaryMuscles: muscles.filter((m) => m.$extras.pivot_role === 'primary').map((m) => m.slug),
    secondaryMuscles: muscles
      .filter((m) => m.$extras.pivot_role === 'secondary')
      .map((m) => m.slug),
  }
}

export function toSessionHeader(session: WorkoutSession): SessionHeaderDTO {
  return {
    id: session.id,
    name: session.name,
    status: session.status,
    workoutDate: session.workoutDate.toISODate()!,
    startedAt: session.startedAt?.toISO() ?? null,
    pausedAt: session.pausedAt?.toISO() ?? null,
    pausedSeconds: session.pausedSeconds,
    completedAt: session.completedAt?.toISO() ?? null,
    notes: session.notes,
    source: session.source,
    dataQuality: session.dataQuality,
    dateConfidence: session.dateConfidence,
    templateId: session.templateId,
  }
}
