import vine from '@vinejs/vine'
import {
  BODY_SITES,
  EQUIPMENT,
  EXERCISE_TYPES,
  LENGTH_UNITS,
  SET_TYPES,
  THEMES,
  TRAINING_GOALS,
  WEIGHT_BASES,
  WEIGHT_UNITS,
} from '#domain/enums'

export const exerciseValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(160),
  equipment: vine.enum(EQUIPMENT),
  exerciseType: vine.enum(EXERCISE_TYPES),
  defaultWeightBasis: vine.enum(WEIGHT_BASES),
  perHandMultiplier: vine.number().withoutDecimals().min(1).max(4).optional().nullable(),
  loadIncrement: vine.number().min(0.5).max(100).decimal([0, 2]),
  loadIncrementUnit: vine.enum(WEIGHT_UNITS),
  primaryMuscles: vine.array(vine.string().trim().maxLength(64)).minLength(1).maxLength(6),
  secondaryMuscles: vine.array(vine.string().trim().maxLength(64)).maxLength(8).optional(),
  technique: vine.string().trim().maxLength(4000).optional().nullable(),
  tips: vine.string().trim().maxLength(4000).optional().nullable(),
  aliases: vine.array(vine.string().trim().minLength(2).maxLength(160)).maxLength(20).optional(),
})

const templateSet = vine.object({
  setType: vine.enum(SET_TYPES),
  targetRepsMin: vine.number().withoutDecimals().min(1).max(100),
  targetRepsMax: vine.number().withoutDecimals().min(1).max(100),
  targetWeightValue: vine.number().min(0).max(5000).optional().nullable(),
  targetWeightUnit: vine.enum(WEIGHT_UNITS).optional().nullable(),
  restSeconds: vine.number().withoutDecimals().min(0).max(1800).optional().nullable(),
})

export const routineValidator = vine.create({
  name: vine.string().trim().minLength(2).maxLength(160),
  description: vine.string().trim().maxLength(2000).optional().nullable(),
  focus: vine.string().trim().maxLength(64).optional().nullable(),
  exercises: vine
    .array(
      vine.object({
        exerciseId: vine.number().withoutDecimals().positive(),
        restSeconds: vine.number().withoutDecimals().min(0).max(1800).optional().nullable(),
        notes: vine.string().trim().maxLength(1000).optional().nullable(),
        sets: vine.array(templateSet).minLength(1).maxLength(20),
      })
    )
    .minLength(1)
    .maxLength(40),
})

const measurement = () => vine.number().min(0).max(400).decimal([0, 2]).optional().nullable()

export const bodyMeasurementValidator = vine.create({
  measuredOn: vine.date({ formats: ['YYYY-MM-DD'] }),
  bodyWeight: vine.number().min(20).max(1000).decimal([0, 2]).optional().nullable(),
  bodyWeightUnit: vine.enum(WEIGHT_UNITS).optional().nullable(),
  bodyFatPct: vine.number().min(1).max(80).decimal([0, 1]).optional().nullable(),
  lengthUnit: vine.enum(LENGTH_UNITS),
  ...Object.fromEntries(BODY_SITES.map((site) => [site, measurement()])),
  notes: vine.string().trim().maxLength(2000).optional().nullable(),
})

export const profileValidator = vine.create({
  fullName: vine.string().trim().maxLength(120).optional().nullable(),
})

export const preferencesValidator = vine.create({
  weightUnit: vine.enum(WEIGHT_UNITS),
  lengthUnit: vine.enum(LENGTH_UNITS),
  theme: vine.enum(THEMES),
  timezone: vine.string().trim().maxLength(64),
  trainingGoal: vine.enum(TRAINING_GOALS),
  weeklySessionsGoal: vine.number().withoutDecimals().min(1).max(14),
  defaultRestSeconds: vine.number().withoutDecimals().min(15).max(900),
  defaultRepsMin: vine.number().withoutDecimals().min(1).max(50),
  defaultRepsMax: vine.number().withoutDecimals().min(1).max(100),
  trackRir: vine.boolean(),
  autoStartRestTimer: vine.boolean(),
  aiEnabled: vine.boolean(),
  aiShareBodyData: vine.boolean(),
})

export const deleteAccountValidator = vine.create({
  password: vine.string(),
  confirmation: vine.string().in(['ELIMINAR']),
})
