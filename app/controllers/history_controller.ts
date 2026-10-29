import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import vine from '@vinejs/vine'
import Exercise from '#models/exercise'
import MuscleGroup from '#models/muscle_group'
import WorkoutSession from '#models/workout_session'
import AnalyticsService from '#services/analytics_service'
import WorkoutSummaryService from '#services/workout_summary_service'

const filtersValidator = vine.create({
  from: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  to: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  exercise: vine.number().withoutDecimals().positive().optional(),
  muscle: vine.string().trim().maxLength(64).optional(),
  month: vine
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
  page: vine.number().withoutDecimals().min(1).optional(),
})

const compareValidator = vine.create({
  a: vine.number().withoutDecimals().positive(),
  b: vine.number().withoutDecimals().positive(),
})

export default class HistoryController {
  async index({ inertia, auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const filters = await filtersValidator.validate(request.qs())
    const analytics = new AnalyticsService()
    const month =
      filters.month ??
      (filters.from ? filters.from.toFormat('yyyy-MM') : DateTime.now().toFormat('yyyy-MM'))

    const [history, calendar, exercises, muscles] = await Promise.all([
      analytics.history(user, {
        from: filters.from?.toISODate(),
        to: filters.to?.toISODate(),
        exerciseId: filters.exercise,
        muscle: filters.muscle,
        page: filters.page,
      }),
      analytics.calendar(user.id, month),
      Exercise.query()
        .withScopes((s) => s.visibleTo(user.id))
        .whereExists((q) =>
          q
            .from('workout_session_exercises as wse')
            .join('workout_sessions as ws', 'ws.id', 'wse.session_id')
            .whereColumn('wse.exercise_id', 'exercises.id')
            .where('ws.user_id', user.id)
        )
        .orderBy('name')
        .select('id', 'name'),
      MuscleGroup.query().orderBy('name').select('slug', 'name'),
    ])

    return inertia.render('history/index', {
      history,
      calendar: { month, sessions: calendar },
      filters: {
        from: filters.from?.toISODate() ?? null,
        to: filters.to?.toISODate() ?? null,
        exercise: filters.exercise ?? null,
        muscle: filters.muscle ?? null,
      },
      exercises: exercises.map((e) => ({ id: e.id, name: e.name })),
      muscles: muscles.map((m) => ({ slug: m.slug, name: m.name })),
    })
  }

  async compare({ inertia, auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { a, b } = await compareValidator.validate(request.qs())
    const owned = await WorkoutSession.query()
      .where('user_id', user.id)
      .whereIn('id', [a, b])
      .where('status', 'completed')
    if (owned.length !== 2) {
      return inertia.render('history/compare', { left: null, right: null })
    }
    const summaries = new WorkoutSummaryService()
    const [left, right] = await Promise.all([summaries.toDTO(user, a), summaries.toDTO(user, b)])
    return inertia.render('history/compare', { left, right })
  }
}
