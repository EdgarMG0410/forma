/**
 * Closed vocabularies shared by migrations-backed models, validators, the
 * domain services and (through generated types) the React pages.
 */

export const WEIGHT_UNITS = ['lb', 'kg'] as const
export type WeightUnit = (typeof WEIGHT_UNITS)[number]

export const LENGTH_UNITS = ['cm', 'in'] as const
export type LengthUnit = (typeof LENGTH_UNITS)[number]

export const WEIGHT_BASES = ['total', 'per_hand', 'machine_display', 'unknown'] as const
export type WeightBasis = (typeof WEIGHT_BASES)[number]

export const SET_TYPES = ['warmup', 'working', 'dropset'] as const
export type SetType = (typeof SET_TYPES)[number]

export const SESSION_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled'] as const
export type SessionStatus = (typeof SESSION_STATUSES)[number]
export const LIVE_STATUSES: readonly SessionStatus[] = ['active', 'paused']

export const SESSION_EXERCISE_STATUSES = ['pending', 'in_progress', 'completed', 'skipped'] as const
export type SessionExerciseStatus = (typeof SESSION_EXERCISE_STATUSES)[number]

export const SESSION_SOURCES = ['manual', 'template', 'import', 'ai'] as const
export type SessionSource = (typeof SESSION_SOURCES)[number]

export const SET_SOURCES = ['manual', 'import', 'ai'] as const
export type SetSource = (typeof SET_SOURCES)[number]

export const CONFIDENCE_LEVELS = ['exact', 'high', 'medium', 'low', 'unknown'] as const
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number]

export const DATA_QUALITY = ['complete', 'partial', 'incomplete'] as const
export type DataQuality = (typeof DATA_QUALITY)[number]

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'smith_machine',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
] as const
export type Equipment = (typeof EQUIPMENT)[number]

export const EXERCISE_TYPES = ['compound', 'isolation'] as const
export type ExerciseType = (typeof EXERCISE_TYPES)[number]

export const MUSCLE_ROLES = ['primary', 'secondary'] as const
export type MuscleRole = (typeof MUSCLE_ROLES)[number]

export const MUSCLE_REGIONS = ['upper', 'lower', 'core', 'full'] as const
export type MuscleRegion = (typeof MUSCLE_REGIONS)[number]

export const TRAINING_GOALS = ['strength', 'hypertrophy', 'recomposition', 'general'] as const
export type TrainingGoal = (typeof TRAINING_GOALS)[number]

export const THEMES = ['dark', 'light', 'system'] as const
export type Theme = (typeof THEMES)[number]

export const RECORD_TYPES = ['max_weight', 'max_reps', 'best_set_volume', 'estimated_1rm'] as const
export type RecordType = (typeof RECORD_TYPES)[number]

export const IMPORT_STATUSES = ['previewed', 'importing', 'imported', 'failed', 'reverted'] as const
export type ImportStatus = (typeof IMPORT_STATUSES)[number]

export const IMPORT_ACTIONS = ['created', 'updated', 'skipped', 'failed'] as const
export type ImportAction = (typeof IMPORT_ACTIONS)[number]

export const IMPORT_ENTITIES = [
  'exercise',
  'session',
  'session_exercise',
  'set',
  'body_measurement',
] as const
export type ImportEntity = (typeof IMPORT_ENTITIES)[number]

export const BODY_SITES = [
  'waist',
  'chest',
  'shoulders',
  'biceps',
  'forearm',
  'hips',
  'thigh',
  'calf',
  'neck',
] as const
export type BodySite = (typeof BODY_SITES)[number]

export const INTERPRETATION_STATUSES = [
  'pending',
  'confirmed',
  'rejected',
  'needs_clarification',
] as const
export type InterpretationStatus = (typeof INTERPRETATION_STATUSES)[number]

export const RECOMMENDATION_OUTCOMES = ['accepted', 'modified', 'ignored'] as const
export type RecommendationOutcome = (typeof RECOMMENDATION_OUTCOMES)[number]
