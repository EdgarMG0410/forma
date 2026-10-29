import type { HttpContext } from '@adonisjs/core/http'
import WorkoutSession from '#models/workout_session'
import WorkoutSummary from '#models/workout_summary'
import Exercise from '#models/exercise'
import WorkoutTemplate from '#models/workout_template'
import { finishWorkoutValidator, startWorkoutValidator } from '#validators/workout'
import WorkoutLiveService from '#services/workout_live_service'
import WorkoutStateService from '#services/workout_state_service'
import WorkoutSummaryService from '#services/workout_summary_service'
import { toExerciseRef } from '#services/serializers'
import PreferencesService from '#services/preferences_service'
import { makeCoach } from '#services/ai/coach_factory'

export default class WorkoutsController {
  /**
   * The "Iniciar entrenamiento" page: pick a routine, repeat a past session
   * or start empty. Jumps straight to the live session when one exists.
   */
  async create({ inertia, auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const live = await WorkoutSession.query()
      .where('user_id', user.id)
      .withScopes((s) => s.live())
      .first()
    if (live) return response.redirect().toRoute('workouts.show', { id: live.id })

    const [routines, recent] = await Promise.all([
      WorkoutTemplate.query()
        .where('user_id', user.id)
        .whereNull('archived_at')
        .withCount('exercises')
        .orderBy('position')
        .orderBy('name'),
      WorkoutSession.query()
        .where('user_id', user.id)
        .where('status', 'completed')
        .orderBy('workout_date', 'desc')
        .limit(6),
    ])
    return inertia.render('workouts/start', {
      routines: routines.map((r) => ({
        id: r.id,
        name: r.name,
        focus: r.focus,
        exercises: Number(r.$extras.exercises_count),
      })),
      recent: recent.map((s) => ({
        id: s.id,
        name: s.name,
        workoutDate: s.workoutDate.toISODate()!,
      })),
    })
  }

  async store({ request, auth, response, session }: HttpContext) {
    const payload = await request.validateUsing(startWorkoutValidator)
    const { session: workout, resumed } = await new WorkoutLiveService().start(
      auth.getUserOrFail(),
      payload
    )
    if (resumed) session.flash('success', 'Ya tenías una sesión en curso: continúa aquí.')
    return response.redirect().toRoute('workouts.show', { id: workout.id })
  }

  /**
   * Live screen while the session runs; summary once it is finished.
   */
  async show({ inertia, auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const state = new WorkoutStateService()
    const focus = request.input('focus') ? Number(request.input('focus')) : null
    const live = await state.liveState(user, Number(params.id), focus)
    if (live.status === 'completed')
      return response.redirect().toRoute('workouts.summary', { id: live.id })

    const catalog = await Exercise.query()
      .withScopes((s) => s.visibleTo(user.id))
      .whereNull('archived_at')
      .preload('muscleGroups')
      .orderBy('name')
    return inertia.render('workouts/live', {
      session: live,
      catalog: inertia.defer(async () => catalog.map(toExerciseRef)),
    })
  }

  async pause({ auth, params, response }: HttpContext) {
    await new WorkoutLiveService().pause(auth.getUserOrFail(), Number(params.id))
    return response.redirect().back()
  }

  async resume({ auth, params, response }: HttpContext) {
    await new WorkoutLiveService().resume(auth.getUserOrFail(), Number(params.id))
    return response.redirect().back()
  }

  async finish({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { notes } = await request.validateUsing(finishWorkoutValidator)
    const workout = await new WorkoutLiveService().finish(user, Number(params.id), notes)
    await new WorkoutSummaryService().generate(user, workout.id)
    return response.redirect().toRoute('workouts.summary', { id: workout.id })
  }

  async cancel({ auth, params, response, session }: HttpContext) {
    await new WorkoutLiveService().cancel(auth.getUserOrFail(), Number(params.id))
    session.flash('success', 'Sesión cancelada.')
    return response.redirect().toRoute('dashboard')
  }

  async summary({ inertia, auth, params, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const workout = await WorkoutSession.query()
      .where('id', Number(params.id))
      .where('user_id', user.id)
      .firstOrFail()
    if (workout.isLive) return response.redirect().toRoute('workouts.show', { id: workout.id })
    const summary = await new WorkoutSummaryService().toDTO(user, workout.id)
    const preferences = await PreferencesService.for(user)
    return inertia.render('workouts/summary', {
      summary,
      shared: false,
      aiAvailable: preferences.aiEnabled && makeCoach().available,
    })
  }

  async narrate({ auth, params, response }: HttpContext) {
    await new WorkoutSummaryService().narrate(auth.getUserOrFail(), Number(params.id))
    return response.redirect().back()
  }

  async share({ auth, params, response, session }: HttpContext) {
    await new WorkoutSummaryService().share(auth.getUserOrFail(), Number(params.id))
    session.flash('success', 'Enlace para compartir creado.')
    return response.redirect().back()
  }

  async unshare({ auth, params, response, session }: HttpContext) {
    await new WorkoutSummaryService().unshare(auth.getUserOrFail(), Number(params.id))
    session.flash('success', 'El enlace dejó de funcionar.')
    return response.redirect().back()
  }

  /**
   * Public, read-only summary behind an unguessable token. No notes, no
   * account data — only what the summary shows.
   */
  async shared({ inertia, params }: HttpContext) {
    const summary = await WorkoutSummary.query()
      .where('share_token', String(params.token))
      .preload('session')
      .firstOrFail()
    const dto = new WorkoutSummaryService().serialize(summary, summary.session)
    return inertia.render('workouts/summary', {
      summary: { ...dto, session: { ...dto.session, notes: null } },
      shared: true,
      aiAvailable: false,
    })
  }
}
