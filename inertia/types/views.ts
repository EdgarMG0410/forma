/**
 * Prop shapes of pages whose data is assembled ad hoc by a controller.
 * (Live session and summary shapes live in @domain/dto, shared with services.)
 */
import type { ExerciseRefDTO } from '@domain/dto'
import type { WeightUnit, LengthUnit, BodySite } from '@domain/enums'

export type WeeklyPoint = {
  week: string
  label: string
  sessions: number
  volume: number
  effectiveSets: number
}
export type MuscleVolume = { slug: string; name: string; region: string; sets: number }

export type DashboardData = {
  greeting: string
  unit: WeightUnit
  live: { id: number; name: string; status: string; startedAt: string | null } | null
  last: {
    id: number
    name: string
    workoutDate: string
    volume: number | null
    sets: number | null
    reps: number | null
    exercises: number | null
    durationSeconds: number | null
  } | null
  week: { sessions: number; goal: number; volume: number }
  weekly: WeeklyPoint[]
  records: Array<{
    id: number
    exerciseId: number
    exerciseName: string
    recordType: string
    value: number
    valueUnit: string
    weightValue: number | null
    weightUnit: string | null
    repetitions: number | null
    achievedOn: string
  }>
  muscles: MuscleVolume[]
  suggested: {
    id: number
    name: string
    focus: string | null
    lastDone: string | null
    exercises: number
  } | null
}

export type HistoryRow = {
  id: number
  name: string
  status: string
  workoutDate: string
  source: string
  dataQuality: string
  dateConfidence: string
  exercises: number
  exerciseNames: string
  sets: number
  reps: number
  volume: number
  incompleteSets: number
}

export type PaginationMeta = {
  total: number
  perPage: number
  currentPage: number
  lastPage: number
  firstPage: number
}

export type CatalogExercise = ExerciseRefDTO & { sessions: number; lastDone: string | null }
export type MuscleOption = { slug: string; name: string; region: string }

export type ExerciseDetail = ExerciseRefDTO & {
  technique: string | null
  tips: string | null
  isUnilateral: boolean
  supportsE1rm: boolean
  aliases: string[]
}

export type TrendPoint = {
  sessionId: number
  date: string
  basis: string
  topLoad: number
  topReps: number
  reps: number
  volume: number
  e1rm: number | null
}

export type RoutineCard = {
  id: number
  name: string
  description: string | null
  focus: string | null
  lastDone: string | null
  times: number
  exercises: Array<{ name: string; sets: number; reps: string }>
}

export type RoutineSetForm = {
  setType: 'warmup' | 'working' | 'dropset'
  targetRepsMin: number
  targetRepsMax: number
  targetWeightValue: number | null
  targetWeightUnit: WeightUnit | null
  restSeconds: number | null
}

export type RoutineForm = {
  id: number
  name: string
  description: string | null
  focus: string | null
  exercises: Array<{
    exerciseId: number
    restSeconds: number | null
    notes: string | null
    sets: RoutineSetForm[]
  }>
}

export type BodyEntry = {
  id: number
  measuredOn: string
  bodyWeight: number | null
  bodyWeightUnit: WeightUnit | null
  bodyFatPct: number | null
  lengthUnit: LengthUnit
  sites: Record<BodySite, number | null>
  notes: string | null
  source: string
}
