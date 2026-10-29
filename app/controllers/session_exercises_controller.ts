import type { HttpContext } from '@adonisjs/core/http'
import {
  addSessionExerciseValidator,
  reorderValidator,
  updateSessionExerciseValidator,
} from '#validators/workout'
import WorkoutLiveService from '#services/workout_live_service'

export default class SessionExercisesController {
  async store({ auth, params, request, response }: HttpContext) {
    const payload = await request.validateUsing(addSessionExerciseValidator)
    const added = await new WorkoutLiveService().addExercise(
      auth.getUserOrFail(),
      Number(params.sessionId),
      payload
    )
    return response
      .redirect()
      .toRoute('workouts.show', { id: Number(params.sessionId) }, { qs: { focus: added.id } })
  }

  async update({ auth, params, request, response }: HttpContext) {
    const payload = await request.validateUsing(updateSessionExerciseValidator)
    await new WorkoutLiveService().updateExercise(auth.getUserOrFail(), Number(params.id), payload)
    return response.redirect().back()
  }

  async destroy({ auth, params, response }: HttpContext) {
    await new WorkoutLiveService().removeExercise(auth.getUserOrFail(), Number(params.id))
    return response.redirect().back()
  }

  async reorder({ auth, params, request, response }: HttpContext) {
    const { order } = await request.validateUsing(reorderValidator)
    await new WorkoutLiveService().reorder(auth.getUserOrFail(), Number(params.sessionId), order)
    return response.redirect().back()
  }
}
