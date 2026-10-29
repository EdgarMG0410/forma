import vine from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'
import {
  BODY_SITES,
  CONFIDENCE_LEVELS,
  EQUIPMENT,
  EXERCISE_TYPES,
  LENGTH_UNITS,
  SET_TYPES,
  WEIGHT_BASES,
  WEIGHT_UNITS,
} from '#domain/enums'

export const IMPORT_SCHEMA = 'forma.workouts'
export const IMPORT_SCHEMA_VERSION = 1

/**
 * Version 1 of the Forma history format (documented in docs/import-format.md).
 * Unknown numbers are `null`, never guessed; every row may carry an
 * `external_id` so re-importing the same file updates instead of duplicating.
 */
const nullableNumber = (max: number) => vine.number().min(0).max(max).nullable().optional()
const externalId = () => vine.string().trim().minLength(1).maxLength(191).optional()

const setSchema = vine.object({
  external_id: externalId(),
  set_number: vine.number().withoutDecimals().min(1).max(100).optional(),
  set_type: vine.enum(SET_TYPES).optional(),
  weight: nullableNumber(5000),
  unit: vine.enum(WEIGHT_UNITS).nullable().optional(),
  weight_basis: vine.enum(WEIGHT_BASES).optional(),
  reps: vine.number().withoutDecimals().min(0).max(500).nullable().optional(),
  rir: vine.number().min(0).max(10).nullable().optional(),
  rpe: vine.number().min(1).max(10).nullable().optional(),
  confidence: vine.enum(CONFIDENCE_LEVELS).optional(),
  notes: vine.string().trim().maxLength(1000).nullable().optional(),
})

const sessionExerciseSchema = vine.object({
  external_id: externalId(),
  exercise: vine.string().trim().maxLength(160).optional(),
  exercise_name: vine.string().trim().maxLength(160).optional(),
  order: vine.number().withoutDecimals().min(0).max(100).optional(),
  target_reps_min: vine.number().withoutDecimals().min(1).max(100).optional(),
  target_reps_max: vine.number().withoutDecimals().min(1).max(100).optional(),
  notes: vine.string().trim().maxLength(1000).nullable().optional(),
  sets: vine.array(setSchema).maxLength(100),
})

const sessionSchema = vine.object({
  external_id: externalId(),
  name: vine.string().trim().minLength(1).maxLength(160),
  date: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  date_confidence: vine.enum(CONFIDENCE_LEVELS).optional(),
  status: vine.enum(['completed', 'partial'] as const).optional(),
  started_at: vine.string().trim().nullable().optional(),
  completed_at: vine.string().trim().nullable().optional(),
  notes: vine.string().trim().maxLength(4000).nullable().optional(),
  exercises: vine.array(sessionExerciseSchema).maxLength(60),
})

const exerciseSchema = vine.object({
  slug: vine
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/)
    .maxLength(120),
  name: vine.string().trim().minLength(2).maxLength(160),
  equipment: vine.enum(EQUIPMENT).optional(),
  exercise_type: vine.enum(EXERCISE_TYPES).optional(),
  weight_basis: vine.enum(WEIGHT_BASES).optional(),
  per_hand_multiplier: vine.number().withoutDecimals().min(1).max(4).nullable().optional(),
  aliases: vine.array(vine.string().trim().minLength(1).maxLength(160)).maxLength(30).optional(),
  primary_muscles: vine.array(vine.string().trim().maxLength(64)).maxLength(6).optional(),
  secondary_muscles: vine.array(vine.string().trim().maxLength(64)).maxLength(8).optional(),
})

const bodySchema = vine.object({
  external_id: externalId(),
  date: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  body_weight: nullableNumber(1000),
  body_weight_unit: vine.enum(WEIGHT_UNITS).nullable().optional(),
  body_fat_pct: nullableNumber(80),
  length_unit: vine.enum(LENGTH_UNITS).optional(),
  ...Object.fromEntries(BODY_SITES.map((site) => [site, nullableNumber(400)])),
  notes: vine.string().trim().maxLength(2000).nullable().optional(),
})

export const importFileValidator = vine.create({
  schema: vine.literal(IMPORT_SCHEMA),
  version: vine.literal(IMPORT_SCHEMA_VERSION),
  exported_at: vine.string().optional(),
  unit_default: vine.enum(WEIGHT_UNITS).optional(),
  exercises: vine.array(exerciseSchema).maxLength(500).optional(),
  sessions: vine.array(sessionSchema).maxLength(5000),
  body_measurements: vine.array(bodySchema).maxLength(5000).optional(),
})

export type ImportFile = Infer<typeof importFileValidator>
export type ImportSession = ImportFile['sessions'][number]
export type ImportSessionExercise = ImportSession['exercises'][number]
export type ImportSet = ImportSessionExercise['sets'][number]
export type ImportExercise = NonNullable<ImportFile['exercises']>[number]
