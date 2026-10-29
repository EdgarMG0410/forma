import vine from '@vinejs/vine'
import { SET_TYPES, WEIGHT_BASES, WEIGHT_UNITS } from '#domain/enums'

const weight = () => vine.number().min(0).max(5000).decimal([0, 2])
const reps = () => vine.number().withoutDecimals().min(0).max(500)
const effort = () => vine.number().min(0).max(10).decimal([0, 1])

export const startWorkoutValidator = vine.create({
  templateId: vine.number().withoutDecimals().positive().optional().nullable(),
  fromSessionId: vine.number().withoutDecimals().positive().optional().nullable(),
  name: vine.string().trim().maxLength(160).optional().nullable(),
})

export const finishWorkoutValidator = vine.create({
  notes: vine.string().trim().maxLength(4000).optional().nullable(),
})

export const logSetValidator = vine.create({
  clientRequestId: vine.string().uuid(),
  recommendationId: vine.number().withoutDecimals().positive().optional().nullable(),
  setType: vine.enum(SET_TYPES).optional(),
  weightValue: weight().nullable(),
  weightUnit: vine.enum(WEIGHT_UNITS).nullable(),
  weightBasis: vine.enum(WEIGHT_BASES).optional(),
  repetitions: reps().nullable(),
  rir: effort().optional().nullable(),
  rpe: vine.number().min(1).max(10).decimal([0, 1]).optional().nullable(),
  techniqueOk: vine.boolean().optional().nullable(),
  discomfort: vine.boolean().optional(),
  notes: vine.string().trim().maxLength(1000).optional().nullable(),
})

export const updateSetValidator = vine.create({
  setType: vine.enum(SET_TYPES).optional(),
  weightValue: weight().optional().nullable(),
  weightUnit: vine.enum(WEIGHT_UNITS).optional().nullable(),
  weightBasis: vine.enum(WEIGHT_BASES).optional(),
  repetitions: reps().optional().nullable(),
  rir: effort().optional().nullable(),
  rpe: vine.number().min(1).max(10).decimal([0, 1]).optional().nullable(),
  techniqueOk: vine.boolean().optional().nullable(),
  discomfort: vine.boolean().optional(),
  notes: vine.string().trim().maxLength(1000).optional().nullable(),
  reason: vine.string().trim().maxLength(255).optional().nullable(),
})

export const repeatSetValidator = vine.create({
  clientRequestId: vine.string().uuid(),
})

export const addSessionExerciseValidator = vine.create({
  exerciseId: vine.number().withoutDecimals().positive(),
  targetSets: vine.number().withoutDecimals().min(1).max(20).optional(),
  targetRepsMin: vine.number().withoutDecimals().min(1).max(100).optional(),
  targetRepsMax: vine.number().withoutDecimals().min(1).max(100).optional(),
  restSeconds: vine.number().withoutDecimals().min(0).max(1800).optional().nullable(),
})

export const updateSessionExerciseValidator = vine.create({
  targetSets: vine.number().withoutDecimals().min(1).max(20).optional(),
  targetRepsMin: vine.number().withoutDecimals().min(1).max(100).optional(),
  targetRepsMax: vine.number().withoutDecimals().min(1).max(100).optional(),
  restSeconds: vine.number().withoutDecimals().min(0).max(1800).optional().nullable(),
  notes: vine.string().trim().maxLength(1000).optional().nullable(),
  skip: vine.boolean().optional(),
  substituteExerciseId: vine.number().withoutDecimals().positive().optional(),
})

export const reorderValidator = vine.create({
  order: vine.array(vine.number().withoutDecimals().positive()).minLength(1).maxLength(60),
})
