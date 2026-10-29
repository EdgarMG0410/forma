/**
 * Plain shapes the server hands to Inertia pages. Type-only; dates are ISO
 * strings. The pages import these through the `@domain/*` alias.
 */
import type {
  ConfidenceLevel,
  DataQuality,
  Equipment,
  ExerciseType,
  SessionExerciseStatus,
  SessionSource,
  SessionStatus,
  SetSource,
  SetType,
  WeightBasis,
  WeightUnit,
} from './enums.js'
import type { ExerciseComparison } from './comparison.js'
import type { Recommendation } from './progression.js'
import type { NextStep } from './session_flow.js'

export type SetDTO = {
  id: number
  setNumber: number
  setType: SetType
  weightValue: number | null
  weightUnit: WeightUnit | null
  weightBasis: WeightBasis
  repetitions: number | null
  rir: number | null
  rpe: number | null
  techniqueOk: boolean | null
  discomfort: boolean
  notes: string | null
  completedAt: string | null
  source: SetSource
  confidence: ConfidenceLevel
  userCorrected: boolean
}

export type ExerciseRefDTO = {
  id: number
  slug: string
  name: string
  equipment: Equipment
  exerciseType: ExerciseType
  defaultWeightBasis: WeightBasis
  perHandMultiplier: number | null
  loadIncrement: number
  loadIncrementUnit: WeightUnit
  isCustom: boolean
  primaryMuscles: string[]
  secondaryMuscles: string[]
}

export type ExerciseTotalsDTO = {
  sets: number
  workingSets: number
  reps: number
  volume: number
  incompleteSets: number
}

export type SessionExerciseDTO = {
  id: number
  orderIndex: number
  status: SessionExerciseStatus
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  restSeconds: number | null
  notes: string | null
  substitutedFrom: string | null
  exercise: ExerciseRefDTO
  sets: SetDTO[]
  totals: ExerciseTotalsDTO
}

export type RecommendationDTO = Recommendation & {
  id: number | null
  sessionExerciseId: number
  setNumber: number
}

export type LastResultDTO = {
  sessionId: number
  workoutDate: string
  sets: Array<
    Pick<
      SetDTO,
      'setNumber' | 'setType' | 'weightValue' | 'weightUnit' | 'weightBasis' | 'repetitions'
    >
  >
} | null

export type SessionTotalsDTO = {
  unit: WeightUnit
  volume: number
  workingVolume: number
  sets: number
  workingSets: number
  effectiveSets: number
  reps: number
  incompleteSets: number
}

export type SessionProgressDTO = {
  loggedSets: number
  targetSets: number
  ratio: number
  completedExercises: number
  totalExercises: number
}

export type SessionHeaderDTO = {
  id: number
  name: string
  status: SessionStatus
  workoutDate: string
  startedAt: string | null
  pausedAt: string | null
  pausedSeconds: number
  completedAt: string | null
  notes: string | null
  source: SessionSource
  dataQuality: DataQuality
  dateConfidence: ConfidenceLevel
  templateId: number | null
}

export type LiveSessionDTO = SessionHeaderDTO & {
  unit: WeightUnit
  exercises: SessionExerciseDTO[]
  next: NextStep
  progress: SessionProgressDTO
  totals: SessionTotalsDTO
  recommendation: RecommendationDTO | null
  lastResult: LastResultDTO
  lastSetAt: string | null
  restSeconds: number
}

export type SummaryExerciseDTO = {
  sessionExerciseId: number
  exerciseId: number
  name: string
  status: SessionExerciseStatus
  basis: WeightBasis
  sets: SetDTO[]
  totals: ExerciseTotalsDTO & { volumeKg: number; volumeLb: number }
  topSet: { load: number | null; reps: number | null } | null
  comparison: (ExerciseComparison & { previousDate: string }) | null
  nextTarget: Pick<
    Recommendation,
    'decision' | 'recommendedWeight' | 'unit' | 'targetRepsMin' | 'targetRepsMax' | 'rationale'
  > | null
}

export type SummaryRecordDTO = {
  exerciseId: number
  exerciseName: string
  recordType: string
  basis: WeightBasis
  value: number
  valueUnit: string
  previous: number | null
  load: number | null
  reps: number | null
}

export type WorkoutSummaryDTO = {
  session: SessionHeaderDTO
  unit: WeightUnit
  exercisesCompleted: number
  setsCount: number
  workingSetsCount: number
  totalReps: number
  volumeLb: number
  volumeKg: number
  durationSeconds: number | null
  perExercise: SummaryExerciseDTO[]
  comparison: {
    previousSessionId: number | null
    previousDate: string | null
    volumeDeltaLb: number | null
    repsDelta: number | null
    setsDelta: number | null
  }
  records: SummaryRecordDTO[]
  observations: string[]
  aiNarrative: string | null
  shareToken: string | null
  generatedAt: string
}
