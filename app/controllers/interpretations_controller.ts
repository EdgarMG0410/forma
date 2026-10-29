import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { SET_TYPES, WEIGHT_UNITS } from '#domain/enums'
import InterpretationService from '#services/ai/interpretation_service'

const interpretValidator = vine.create({
  message: vine.string().trim().minLength(1).maxLength(280),
})

const confirmValidator = vine.create({
  weightValue: vine.number().min(0).max(5000).optional().nullable(),
  weightUnit: vine.enum(WEIGHT_UNITS).optional().nullable(),
  repetitions: vine.number().withoutDecimals().min(0).max(500).optional(),
  setType: vine.enum(SET_TYPES).optional(),
})

export default class InterpretationsController {
  /**
   * The proposal comes back as flash data so the live page shows it for
   * confirmation; nothing is saved here.
   */
  async store({ auth, params, request, response, session }: HttpContext) {
    const { message } = await request.validateUsing(interpretValidator)
    const view = await new InterpretationService().interpret(
      auth.getUserOrFail(),
      Number(params.sessionExerciseId),
      message
    )
    session.flash('interpretation', view)
    return response.redirect().back()
  }

  async confirm({ auth, params, request, response }: HttpContext) {
    const overrides = await request.validateUsing(confirmValidator)
    await new InterpretationService().confirm(auth.getUserOrFail(), Number(params.id), overrides)
    return response.redirect().back()
  }

  async reject({ auth, params, response }: HttpContext) {
    await new InterpretationService().reject(auth.getUserOrFail(), Number(params.id))
    return response.redirect().back()
  }
}
