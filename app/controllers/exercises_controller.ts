import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Exercise from '#models/exercise'
import MuscleGroup from '#models/muscle_group'
import PersonalRecord from '#models/personal_record'
import { exerciseValidator } from '#validators/library'
import AnalyticsService from '#services/analytics_service'
import ExerciseCatalogService from '#services/exercise_catalog_service'
import { toExerciseRef } from '#services/serializers'
import { NotFoundException } from '#exceptions/domain_exception'
import type User from '#models/user'

export default class ExercisesController {
  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const [exercises, muscles, usage] = await Promise.all([
      Exercise.query()
        .withScopes((s) => s.visibleTo(user.id))
        .whereNull('archived_at')
        .preload('muscleGroups')
        .orderBy('name'),
      MuscleGroup.query().orderBy('name'),
      db
        .from('workout_session_exercises as wse')
        .join('workout_sessions as ws', 'ws.id', 'wse.session_id')
        .where('ws.user_id', user.id)
        .where('ws.status', 'completed')
        .groupBy('wse.exercise_id')
        .select('wse.exercise_id')
        .select(
          db.raw('COUNT(DISTINCT ws.id)::int as sessions'),
          db.raw('MAX(ws.workout_date)::text as last_done')
        ),
    ])
    const byExercise = new Map(usage.map((u: any) => [u.exercise_id, u]))
    return inertia.render('exercises/index', {
      exercises: exercises.map((e) => {
        const u: any = byExercise.get(e.id)
        return { ...toExerciseRef(e), sessions: u?.sessions ?? 0, lastDone: u?.last_done ?? null }
      }),
      muscles: muscles.map((m) => ({ slug: m.slug, name: m.name, region: m.region })),
    })
  }

  async show({ inertia, auth, params }: HttpContext) {
    const user = auth.getUserOrFail()
    const exercise = await this.#visible(user, Number(params.id))
    await exercise.load('muscleGroups')
    await exercise.load('aliases', (q) =>
      q.where((w) => w.whereNull('user_id').orWhere('user_id', user.id))
    )
    const [trend, records, recent, muscles] = await Promise.all([
      new AnalyticsService().exerciseTrend(user, exercise.id),
      PersonalRecord.query().where('user_id', user.id).where('exercise_id', exercise.id),
      db
        .from('workout_sets as s')
        .join('workout_session_exercises as wse', 'wse.id', 's.session_exercise_id')
        .join('workout_sessions as ws', 'ws.id', 'wse.session_id')
        .where('ws.user_id', user.id)
        .where('wse.exercise_id', exercise.id)
        .where('ws.status', 'completed')
        .select(
          'ws.id as session_id',
          'ws.workout_date',
          'ws.name',
          's.id',
          's.set_number',
          's.set_type',
          's.weight_value',
          's.weight_unit',
          's.weight_basis',
          's.repetitions',
          's.rir',
          's.source',
          's.user_corrected'
        )
        .orderBy('ws.workout_date', 'desc')
        .orderBy('ws.id', 'desc')
        .orderBy('s.set_number')
        .limit(60),
      MuscleGroup.query().orderBy('name'),
    ])
    return inertia.render('exercises/show', {
      exercise: {
        ...toExerciseRef(exercise),
        technique: exercise.technique,
        tips: exercise.tips,
        isUnilateral: exercise.isUnilateral,
        supportsE1rm: exercise.supportsE1Rm,
        aliases: exercise.aliases.map((a) => a.alias).filter((a) => a !== exercise.name),
      },
      trend,
      records: records.map((r) => ({
        recordType: r.recordType,
        basis: r.weightBasis,
        value: r.value,
        valueUnit: r.valueUnit,
        weightValue: r.weightValue,
        weightUnit: r.weightUnit,
        repetitions: r.repetitions,
        achievedOn: r.achievedOn.toISODate()!,
        sessionId: r.sessionId,
      })),
      recent: recent.map((r: any) => ({
        sessionId: r.session_id as number,
        sessionName: r.name as string,
        workoutDate: String(r.workout_date),
        id: r.id as number,
        setNumber: r.set_number as number,
        setType: r.set_type as string,
        weightValue: r.weight_value === null ? null : Number(r.weight_value),
        weightUnit: r.weight_unit as string | null,
        weightBasis: r.weight_basis as string,
        repetitions: r.repetitions as number | null,
        rir: r.rir === null ? null : Number(r.rir),
        source: r.source as string,
        userCorrected: r.user_corrected as boolean,
      })),
      muscles: muscles.map((m) => ({ slug: m.slug, name: m.name, region: m.region })),
    })
  }

  async store({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(exerciseValidator)
    const exercise = await db.transaction(async (trx) => {
      const baseSlug = ExerciseCatalogService.slugify(payload.name)
      let slug = baseSlug
      for (
        let i = 2;
        await trx.from('exercises').where('user_id', user.id).where('slug', slug).first();
        i++
      )
        slug = `${baseSlug}-${i}`
      const created = await Exercise.create(
        {
          userId: user.id,
          slug,
          name: payload.name,
          equipment: payload.equipment,
          exerciseType: payload.exerciseType,
          defaultWeightBasis: payload.defaultWeightBasis,
          perHandMultiplier: payload.perHandMultiplier ?? null,
          loadIncrement: payload.loadIncrement,
          loadIncrementUnit: payload.loadIncrementUnit,
          technique: payload.technique ?? null,
          tips: payload.tips ?? null,
        },
        { client: trx }
      )
      await this.#syncMuscles(created, payload.primaryMuscles, payload.secondaryMuscles ?? [], trx)
      await this.#syncAliases(user, created, [payload.name, ...(payload.aliases ?? [])], trx)
      return created
    })
    session.flash('success', 'Ejercicio creado.')
    return response.redirect().toRoute('exercises.show', { id: exercise.id })
  }

  async update({ auth, params, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const exercise = await Exercise.query()
      .where('id', Number(params.id))
      .where('user_id', user.id)
      .first()
    if (!exercise) throw new NotFoundException('Solo puedes editar tus propios ejercicios.')
    const payload = await request.validateUsing(exerciseValidator)
    await db.transaction(async (trx) => {
      exercise.merge({
        name: payload.name,
        equipment: payload.equipment,
        exerciseType: payload.exerciseType,
        defaultWeightBasis: payload.defaultWeightBasis,
        perHandMultiplier: payload.perHandMultiplier ?? null,
        loadIncrement: payload.loadIncrement,
        loadIncrementUnit: payload.loadIncrementUnit,
        technique: payload.technique ?? null,
        tips: payload.tips ?? null,
      })
      await exercise.useTransaction(trx).save()
      await this.#syncMuscles(exercise, payload.primaryMuscles, payload.secondaryMuscles ?? [], trx)
      await trx
        .from('exercise_aliases')
        .where('exercise_id', exercise.id)
        .where('user_id', user.id)
        .delete()
      await this.#syncAliases(user, exercise, [payload.name, ...(payload.aliases ?? [])], trx)
    })
    session.flash('success', 'Ejercicio actualizado.')
    return response.redirect().back()
  }

  async #visible(user: User, id: number) {
    const exercise = await Exercise.query()
      .where('id', id)
      .withScopes((s) => s.visibleTo(user.id))
      .first()
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado.')
    return exercise
  }

  async #syncMuscles(exercise: Exercise, primary: string[], secondary: string[], trx: any) {
    const groups = await MuscleGroup.query({ client: trx }).whereIn('slug', [
      ...primary,
      ...secondary,
    ])
    const bySlug = new Map(groups.map((g) => [g.slug, g.id]))
    const pivot: Record<number, { role: string }> = {}
    for (const slug of secondary)
      if (bySlug.has(slug)) pivot[bySlug.get(slug)!] = { role: 'secondary' }
    for (const slug of primary) if (bySlug.has(slug)) pivot[bySlug.get(slug)!] = { role: 'primary' }
    await exercise.useTransaction(trx).related('muscleGroups').sync(pivot)
  }

  async #syncAliases(user: User, exercise: Exercise, aliases: string[], trx: any) {
    const now = new Date()
    for (const alias of new Set(aliases)) {
      await trx.rawQuery(
        `INSERT INTO exercise_aliases (exercise_id, user_id, alias, normalized_alias, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT ((COALESCE(user_id, 0)), normalized_alias) DO NOTHING`,
        [exercise.id, user.id, alias, ExerciseCatalogService.normalize(alias), now, now]
      )
    }
  }
}
