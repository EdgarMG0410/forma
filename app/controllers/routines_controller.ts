import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Exercise from '#models/exercise'
import WorkoutSession from '#models/workout_session'
import WorkoutTemplate from '#models/workout_template'
import WorkoutTemplateExercise from '#models/workout_template_exercise'
import WorkoutTemplateSet from '#models/workout_template_set'
import type User from '#models/user'
import { routineValidator } from '#validators/library'
import { NotFoundException } from '#exceptions/domain_exception'
import DomainException from '#exceptions/domain_exception'
import { toExerciseRef } from '#services/serializers'
import type { Infer } from '@vinejs/vine/types'

type RoutinePayload = Infer<typeof routineValidator>

export default class RoutinesController {
  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const routines = await WorkoutTemplate.query()
      .where('user_id', user.id)
      .whereNull('archived_at')
      .preload('exercises', (q) => q.preload('exercise').preload('sets'))
      .orderBy('position')
      .orderBy('name')
    const lastDone = await db
      .from('workout_sessions')
      .where('user_id', user.id)
      .where('status', 'completed')
      .whereNotNull('template_id')
      .groupBy('template_id')
      .select(
        'template_id',
        db.raw('MAX(workout_date)::text as last_done'),
        db.raw('COUNT(*)::int as times')
      )
    const byTemplate = new Map(lastDone.map((r: any) => [r.template_id, r]))
    return inertia.render('routines/index', {
      routines: routines.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        focus: r.focus,
        lastDone: (byTemplate.get(r.id) as any)?.last_done ?? null,
        times: (byTemplate.get(r.id) as any)?.times ?? 0,
        exercises: r.exercises.map((e) => ({
          name: e.exercise.name,
          sets: e.sets.length,
          reps: e.sets[0] ? `${e.sets[0].targetRepsMin}–${e.sets[0].targetRepsMax}` : '',
        })),
      })),
    })
  }

  async create({ inertia, auth }: HttpContext) {
    return inertia.render('routines/form', {
      routine: null,
      catalog: await this.#catalog(auth.getUserOrFail()),
    })
  }

  async edit({ inertia, auth, params }: HttpContext) {
    const user = auth.getUserOrFail()
    const routine = await this.#owned(user, Number(params.id))
    await routine.load('exercises', (q) => q.preload('sets'))
    return inertia.render('routines/form', {
      routine: {
        id: routine.id,
        name: routine.name,
        description: routine.description,
        focus: routine.focus,
        exercises: routine.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          restSeconds: e.restSeconds,
          notes: e.notes,
          sets: e.sets.map((s) => ({
            setType: s.setType,
            targetRepsMin: s.targetRepsMin,
            targetRepsMax: s.targetRepsMax,
            targetWeightValue: s.targetWeightValue,
            targetWeightUnit: s.targetWeightUnit,
            restSeconds: s.restSeconds,
          })),
        })),
      },
      catalog: await this.#catalog(user),
    })
  }

  async store({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(routineValidator)
    const routine = await db.transaction(async (trx) => {
      const position = await trx
        .from('workout_templates')
        .where('user_id', user.id)
        .max('position as max')
        .first()
      const created = await WorkoutTemplate.create(
        {
          userId: user.id,
          name: payload.name,
          description: payload.description ?? null,
          focus: payload.focus ?? null,
          position: (position?.max ?? -1) + 1,
        },
        { client: trx }
      )
      await this.#writeExercises(user, created, payload, trx)
      return created
    })
    session.flash('success', 'Rutina creada.')
    return response.redirect().toRoute('routines.index', {}, { qs: { highlight: routine.id } })
  }

  async update({ auth, params, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const routine = await this.#owned(user, Number(params.id))
    const payload = await request.validateUsing(routineValidator)
    await db.transaction(async (trx) => {
      routine.merge({
        name: payload.name,
        description: payload.description ?? null,
        focus: payload.focus ?? null,
      })
      await routine.useTransaction(trx).save()
      // live/past sessions keep their own copy; the template link is only informative
      await trx.from('workout_template_exercises').where('template_id', routine.id).delete()
      await this.#writeExercises(user, routine, payload, trx)
    })
    session.flash('success', 'Rutina guardada.')
    return response.redirect().toRoute('routines.index')
  }

  async destroy({ auth, params, response, session }: HttpContext) {
    const routine = await this.#owned(auth.getUserOrFail(), Number(params.id))
    routine.archivedAt = DateTime.now()
    await routine.save()
    session.flash('success', 'Rutina archivada.')
    return response.redirect().toRoute('routines.index')
  }

  /**
   * Saves a finished session as a reusable routine.
   */
  async fromSession({ auth, params, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const source = await WorkoutSession.query()
      .where('id', Number(params.sessionId))
      .where('user_id', user.id)
      .preload('exercises', (q) => q.preload('sets'))
      .first()
    if (!source) throw new NotFoundException('Sesión no encontrada.')
    const exercises = source.exercises.filter((e) => e.sets.length > 0)
    if (!exercises.length)
      throw new DomainException('La sesión no tiene series para convertir en rutina.')
    const routine = await db.transaction(async (trx) => {
      const created = await WorkoutTemplate.create(
        { userId: user.id, name: source.name, focus: null },
        { client: trx }
      )
      await this.#writeExercises(
        user,
        created,
        {
          name: source.name,
          exercises: exercises.map((e) => ({
            exerciseId: e.exerciseId,
            restSeconds: e.restSeconds,
            notes: null,
            sets: e.sets.map((s) => ({
              setType: s.setType,
              targetRepsMin: e.targetRepsMin,
              targetRepsMax: e.targetRepsMax,
              targetWeightValue: null,
              targetWeightUnit: null,
              restSeconds: null,
            })),
          })),
        },
        trx
      )
      return created
    })
    session.flash('success', `Rutina «${routine.name}» creada desde la sesión.`)
    return response.redirect().toRoute('routines.edit', { id: routine.id })
  }

  async #owned(user: User, id: number) {
    const routine = await WorkoutTemplate.query()
      .where('id', id)
      .where('user_id', user.id)
      .whereNull('archived_at')
      .first()
    if (!routine) throw new NotFoundException('Rutina no encontrada.')
    return routine
  }

  async #catalog(user: User) {
    const exercises = await Exercise.query()
      .withScopes((s) => s.visibleTo(user.id))
      .whereNull('archived_at')
      .preload('muscleGroups')
      .orderBy('name')
    return exercises.map(toExerciseRef)
  }

  async #writeExercises(
    user: User,
    routine: WorkoutTemplate,
    payload: RoutinePayload,
    trx: TransactionClientContract
  ) {
    const ids = [...new Set(payload.exercises.map((e) => e.exerciseId))]
    const visible = await Exercise.query({ client: trx })
      .whereIn('id', ids)
      .withScopes((s) => s.visibleTo(user.id))
    if (visible.length !== ids.length)
      throw new NotFoundException('Uno de los ejercicios no existe.')
    for (const [index, item] of payload.exercises.entries()) {
      const te = await WorkoutTemplateExercise.create(
        {
          templateId: routine.id,
          exerciseId: item.exerciseId,
          orderIndex: index,
          restSeconds: item.restSeconds ?? null,
          notes: item.notes ?? null,
        },
        { client: trx }
      )
      await WorkoutTemplateSet.createMany(
        item.sets.map((s, i) => {
          if (s.targetRepsMax < s.targetRepsMin)
            throw new DomainException('El rango de repeticiones no es válido.')
          return {
            templateExerciseId: te.id,
            setNumber: i + 1,
            setType: s.setType,
            targetRepsMin: s.targetRepsMin,
            targetRepsMax: s.targetRepsMax,
            targetWeightValue: s.targetWeightValue ?? null,
            targetWeightUnit: s.targetWeightValue ? (s.targetWeightUnit ?? 'lb') : null,
            restSeconds: s.restSeconds ?? null,
          }
        }),
        { client: trx }
      )
    }
  }
}
