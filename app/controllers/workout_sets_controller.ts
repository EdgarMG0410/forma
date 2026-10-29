import type { HttpContext } from '@adonisjs/core/http'
import WorkoutSession from '#models/workout_session'
import { logSetValidator, repeatSetValidator, updateSetValidator } from '#validators/workout'
import WorkoutLiveService from '#services/workout_live_service'
import WorkoutSummaryService from '#services/workout_summary_service'
import type User from '#models/user'

export default class WorkoutSetsController {
  async store({ auth, params, request, response }: HttpContext) {
    const payload = await request.validateUsing(logSetValidator)
    await new WorkoutLiveService().logSet(
      auth.getUserOrFail(),
      Number(params.sessionExerciseId),
      payload
    )
    return response.redirect().back()
  }

  async update({ auth, params, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { reason, ...changes } = await request.validateUsing(updateSetValidator)
    const set = await new WorkoutLiveService().updateSet(user, Number(params.id), changes, reason)
    await this.#refreshSummary(user, set.sessionExerciseId)
    session.flash('success', 'Serie corregida.')
    return response.redirect().back()
  }

  async destroy({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const sessionExercise = await new WorkoutLiveService().deleteSet(user, Number(params.id), null)
    await this.#refreshSummary(user, sessionExercise.id)
    session.flash('success', 'Serie eliminada.')
    return response.redirect().back()
  }

  async repeat({ auth, params, request, response }: HttpContext) {
    const { clientRequestId } = await request.validateUsing(repeatSetValidator)
    await new WorkoutLiveService().repeatSet(
      auth.getUserOrFail(),
      Number(params.id),
      clientRequestId
    )
    return response.redirect().back()
  }

  /**
   * Corrections to a finished session keep its summary and records true.
   */
  async #refreshSummary(user: User, sessionExerciseId: number) {
    const workout = await WorkoutSession.query()
      .where('user_id', user.id)
      .whereHas('exercises', (q) => q.where('id', sessionExerciseId))
      .first()
    if (workout?.status === 'completed')
      await new WorkoutSummaryService().generate(user, workout.id)
  }
}
