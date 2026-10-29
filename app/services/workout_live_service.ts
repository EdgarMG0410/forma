import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import DomainException, { NotFoundException } from '#exceptions/domain_exception'
import Exercise from '#models/exercise'
import type User from '#models/user'
import WorkoutRecommendation from '#models/workout_recommendation'
import WorkoutSession from '#models/workout_session'
import WorkoutSessionExercise from '#models/workout_session_exercise'
import WorkoutSet from '#models/workout_set'
import WorkoutSetEdit from '#models/workout_set_edit'
import WorkoutTemplate from '#models/workout_template'
import type { SetType, WeightBasis, WeightUnit } from '#domain/enums'
import { exerciseStatusAfterChange } from '#domain/session_flow'
import { normalizeWeight } from '#domain/units'
import PreferencesService from '#services/preferences_service'
import { toSetDTO } from '#services/serializers'

export type SetInput = {
  setType?: SetType
  weightValue: number | null
  weightUnit: WeightUnit | null
  weightBasis?: WeightBasis
  repetitions: number | null
  rir?: number | null
  rpe?: number | null
  techniqueOk?: boolean | null
  discomfort?: boolean
  notes?: string | null
}

export type LogSetInput = SetInput & {
  clientRequestId: string
  recommendationId?: number | null
  /** 'ai' only for a set the user confirmed from an LLM interpretation. */
  source?: 'manual' | 'ai'
}

export type StartInput = {
  templateId?: number | null
  fromSessionId?: number | null
  name?: string | null
}

const UNIQUE_VIOLATION = '23505'

function isUniqueViolation(error: unknown, constraint?: string) {
  const e = error as { code?: string; constraint?: string }
  return e?.code === UNIQUE_VIOLATION && (!constraint || e.constraint === constraint)
}

/**
 * Every write of a live workout. Each method authorises by user, runs in a
 * transaction and locks the rows it renumbers, so double taps, retries and
 * two open tabs cannot corrupt a session.
 */
export default class WorkoutLiveService {
  // ── Session lifecycle ──────────────────────────────────────────────────

  async start(
    user: User,
    input: StartInput = {}
  ): Promise<{ session: WorkoutSession; resumed: boolean }> {
    const existing = await WorkoutSession.query()
      .where('user_id', user.id)
      .withScopes((s) => s.live())
      .first()
    if (existing) return { session: existing, resumed: true }

    try {
      const session = await db.transaction(async (trx) => {
        const preferences = await PreferencesService.for(user, trx)
        const now = DateTime.now()
        const created = await WorkoutSession.create(
          {
            userId: user.id,
            name: input.name?.trim() || 'Entrenamiento',
            status: 'active',
            workoutDate: DateTime.fromISO(PreferencesService.today(preferences)),
            startedAt: now,
            source: 'manual',
          },
          { client: trx }
        )

        if (input.templateId) {
          await this.#copyTemplate(
            user,
            created,
            input.templateId,
            preferences.defaultRestSeconds,
            trx
          )
        } else if (input.fromSessionId) {
          await this.#copySession(user, created, input.fromSessionId, trx)
        }
        return created
      })
      return { session, resumed: false }
    } catch (error) {
      // a second tap raced the first one past the check above
      if (isUniqueViolation(error, 'workout_sessions_one_live')) {
        const live = await WorkoutSession.query()
          .where('user_id', user.id)
          .withScopes((s) => s.live())
          .firstOrFail()
        return { session: live, resumed: true }
      }
      throw error
    }
  }

  async pause(user: User, sessionId: number) {
    return this.#transition(user, sessionId, async (session) => {
      if (session.status !== 'active')
        throw new DomainException('Solo se puede pausar una sesión activa.')
      session.status = 'paused'
      session.pausedAt = DateTime.now()
    })
  }

  async resume(user: User, sessionId: number) {
    return this.#transition(user, sessionId, async (session) => {
      if (session.status !== 'paused') throw new DomainException('La sesión no está en pausa.')
      this.#closePause(session)
      session.status = 'active'
    })
  }

  async finish(user: User, sessionId: number, notes?: string | null) {
    return this.#transition(user, sessionId, async (session, trx) => {
      if (!session.isLive) throw new DomainException('La sesión ya no está en curso.')
      const logged = await WorkoutSet.query({ client: trx })
        .whereIn('session_exercise_id', (q) =>
          q.from('workout_session_exercises').where('session_id', session.id).select('id')
        )
        .count('* as total')
        .first()
      if (Number(logged?.$extras.total ?? 0) === 0) {
        throw new DomainException('Registra al menos una serie o cancela la sesión.')
      }
      this.#closePause(session)
      session.status = 'completed'
      session.completedAt = DateTime.now()
      if (notes !== undefined) session.notes = notes
      // exercises never started are recorded as skipped, not silently dropped
      await WorkoutSessionExercise.query({ client: trx })
        .where('session_id', session.id)
        .where('status', 'pending')
        .update({ status: 'skipped' })
    })
  }

  async cancel(user: User, sessionId: number) {
    return this.#transition(user, sessionId, async (session) => {
      if (!session.isLive) throw new DomainException('La sesión ya no está en curso.')
      this.#closePause(session)
      session.status = 'cancelled'
      session.completedAt = DateTime.now()
    })
  }

  // ── Sets ───────────────────────────────────────────────────────────────

  /**
   * Logs a set. Idempotent on `clientRequestId`: resubmitting the same tap
   * returns the set already saved instead of creating a second one.
   */
  async logSet(
    user: User,
    sessionExerciseId: number,
    input: LogSetInput
  ): Promise<{ set: WorkoutSet; duplicate: boolean }> {
    const replay = await this.#findByRequestId(user, input.clientRequestId)
    if (replay) return { set: replay, duplicate: true }

    try {
      const logged = await db.transaction(async (trx) => {
        const { sessionExercise, session } = await this.#lockSessionExercise(
          user,
          sessionExerciseId,
          trx,
          { live: true }
        )
        if (session.status === 'paused') {
          // logging a set is the clearest "I'm back" signal there is
          this.#closePause(session)
          session.status = 'active'
          await session.useTransaction(trx).save()
        }

        const next = await this.#nextSetNumber(sessionExercise.id, trx)
        const set = await WorkoutSet.create(
          {
            ...this.#setColumns(input, sessionExercise.exercise.defaultWeightBasis),
            sessionExerciseId: sessionExercise.id,
            userId: user.id,
            setNumber: next,
            completedAt: DateTime.now(),
            source: input.source ?? 'manual',
            confidence: 'exact',
            clientRequestId: input.clientRequestId,
          },
          { client: trx }
        )
        await this.#syncExerciseStatus(sessionExercise, trx)
        if (input.recommendationId)
          await this.#recordOutcome(user, input.recommendationId, set, trx)
        return set
      })
      return { set: logged, duplicate: false }
    } catch (error) {
      if (isUniqueViolation(error, 'workout_sets_client_request_id_unique')) {
        const set = await this.#findByRequestId(user, input.clientRequestId)
        if (set) return { set, duplicate: true }
      }
      throw error
    }
  }

  /**
   * Corrects a logged set, in a live or a finished session. The previous
   * values go to the audit table and the set is marked as user-corrected,
   * which imports and the AI layer must never overwrite.
   */
  async updateSet(user: User, setId: number, input: Partial<SetInput>, reason?: string | null) {
    return db.transaction(async (trx) => {
      const set = await this.#lockSet(user, setId, trx)
      const before = toSetDTO(set)
      const merged: SetInput = {
        setType: input.setType ?? set.setType,
        weightValue: input.weightValue !== undefined ? input.weightValue : set.weightValue,
        weightUnit: input.weightUnit !== undefined ? input.weightUnit : set.weightUnit,
        weightBasis: input.weightBasis ?? set.weightBasis,
        repetitions: input.repetitions !== undefined ? input.repetitions : set.repetitions,
        rir: input.rir !== undefined ? input.rir : set.rir,
        rpe: input.rpe !== undefined ? input.rpe : set.rpe,
        techniqueOk: input.techniqueOk !== undefined ? input.techniqueOk : set.techniqueOk,
        discomfort: input.discomfort ?? set.discomfort,
        notes: input.notes !== undefined ? input.notes : set.notes,
      }
      set.merge({ ...this.#setColumns(merged, set.weightBasis), userCorrected: true })
      if (!set.$isDirty || Object.keys(set.$dirty).every((k) => k === 'userCorrected')) {
        return set
      }
      await set.useTransaction(trx).save()
      await WorkoutSetEdit.create(
        {
          setId: set.id,
          sessionExerciseId: set.sessionExerciseId,
          userId: user.id,
          action: 'update',
          before,
          after: toSetDTO(set),
          reason: reason ?? null,
        },
        { client: trx }
      )
      return set
    })
  }

  /**
   * Deletes a set and closes the gap in numbering (sets 1,2,3 → delete 2 →
   * 1,2). The unique (exercise, number) constraint is deferred, so the shift
   * happens inside one transaction without collisions.
   */
  async deleteSet(user: User, setId: number, reason?: string | null) {
    return db.transaction(async (trx) => {
      const set = await this.#lockSet(user, setId, trx)
      const sessionExercise = await WorkoutSessionExercise.query({ client: trx })
        .where('id', set.sessionExerciseId)
        .forUpdate()
        .firstOrFail()

      await WorkoutSetEdit.create(
        {
          setId: set.id,
          sessionExerciseId: set.sessionExerciseId,
          userId: user.id,
          action: 'delete',
          before: toSetDTO(set),
          after: null,
          reason: reason ?? null,
        },
        { client: trx }
      )
      await set.useTransaction(trx).delete()
      await trx
        .from('workout_sets')
        .where('session_exercise_id', set.sessionExerciseId)
        .where('set_number', '>', set.setNumber)
        .decrement('set_number', 1)
      await this.#syncExerciseStatus(sessionExercise, trx)
      return sessionExercise
    })
  }

  /**
   * Logs the same numbers again as the next set of that exercise.
   */
  async repeatSet(user: User, setId: number, clientRequestId: string) {
    const source = await this.#ownedSet(user, setId)
    return this.logSet(user, source.sessionExerciseId, {
      clientRequestId,
      setType: source.setType,
      weightValue: source.weightValue,
      weightUnit: source.weightUnit,
      weightBasis: source.weightBasis,
      repetitions: source.repetitions,
    })
  }

  // ── Exercises inside a session ─────────────────────────────────────────

  async addExercise(
    user: User,
    sessionId: number,
    input: {
      exerciseId: number
      targetSets?: number
      targetRepsMin?: number
      targetRepsMax?: number
      restSeconds?: number | null
    }
  ) {
    return db.transaction(async (trx) => {
      const session = await this.#lockSession(user, sessionId, trx)
      if (session.status === 'cancelled') throw new DomainException('La sesión está cancelada.')
      const exercise = await this.#visibleExercise(user, input.exerciseId, trx)
      const preferences = await PreferencesService.for(user, trx)
      const last = await trx
        .from('workout_session_exercises')
        .where('session_id', session.id)
        .max('order_index as max')
        .first()
      return WorkoutSessionExercise.create(
        {
          sessionId: session.id,
          exerciseId: exercise.id,
          orderIndex: (last?.max ?? -1) + 1,
          targetSets: input.targetSets ?? 3,
          targetRepsMin: input.targetRepsMin ?? preferences.defaultRepsMin,
          targetRepsMax: input.targetRepsMax ?? preferences.defaultRepsMax,
          restSeconds: input.restSeconds ?? null,
          status: 'pending',
        },
        { client: trx }
      )
    })
  }

  async updateExercise(
    user: User,
    sessionExerciseId: number,
    input: {
      targetSets?: number
      targetRepsMin?: number
      targetRepsMax?: number
      restSeconds?: number | null
      notes?: string | null
      skip?: boolean
      substituteExerciseId?: number
    }
  ) {
    return db.transaction(async (trx) => {
      const { sessionExercise } = await this.#lockSessionExercise(user, sessionExerciseId, trx)
      if (input.substituteExerciseId && input.substituteExerciseId !== sessionExercise.exerciseId) {
        const replacement = await this.#visibleExercise(user, input.substituteExerciseId, trx)
        const logged = await this.#loggedCount(sessionExercise.id, trx)
        if (logged > 0) {
          throw new DomainException(
            'Ya hay series registradas: agrega el nuevo ejercicio en lugar de sustituirlo.'
          )
        }
        sessionExercise.substitutedFromExerciseId = sessionExercise.exerciseId
        sessionExercise.exerciseId = replacement.id
      }
      const min = input.targetRepsMin ?? sessionExercise.targetRepsMin
      const max = input.targetRepsMax ?? sessionExercise.targetRepsMax
      if (max < min)
        throw new DomainException('El máximo de repeticiones no puede ser menor que el mínimo.')
      sessionExercise.merge({
        targetSets: input.targetSets ?? sessionExercise.targetSets,
        targetRepsMin: min,
        targetRepsMax: max,
        restSeconds:
          input.restSeconds !== undefined ? input.restSeconds : sessionExercise.restSeconds,
        notes: input.notes !== undefined ? input.notes : sessionExercise.notes,
      })
      if (input.skip === true) sessionExercise.status = 'skipped'
      if (input.skip === false && sessionExercise.status === 'skipped')
        sessionExercise.status = 'pending'
      await sessionExercise.useTransaction(trx).save()
      await this.#syncExerciseStatus(sessionExercise, trx)
      return sessionExercise
    })
  }

  async reorder(user: User, sessionId: number, orderedIds: number[]) {
    return db.transaction(async (trx) => {
      const session = await this.#lockSession(user, sessionId, trx)
      const rows = await WorkoutSessionExercise.query({ client: trx })
        .where('session_id', session.id)
        .forUpdate()
      const known = new Set(rows.map((r) => r.id))
      if (orderedIds.length !== rows.length || !orderedIds.every((id) => known.has(id))) {
        throw new DomainException('El nuevo orden no coincide con los ejercicios de la sesión.')
      }
      for (const [index, id] of orderedIds.entries()) {
        await trx
          .from('workout_session_exercises')
          .where('id', id)
          .update({ order_index: index, updated_at: new Date() })
      }
    })
  }

  async removeExercise(user: User, sessionExerciseId: number) {
    return db.transaction(async (trx) => {
      const { sessionExercise } = await this.#lockSessionExercise(user, sessionExerciseId, trx)
      if ((await this.#loggedCount(sessionExercise.id, trx)) > 0) {
        throw new DomainException('Elimina primero sus series, o márcalo como omitido.')
      }
      await sessionExercise.useTransaction(trx).delete()
    })
  }

  // ── Internals ──────────────────────────────────────────────────────────

  #setColumns(input: SetInput, defaultBasis: WeightBasis) {
    const hasWeight = input.weightValue !== null && input.weightValue !== undefined
    const weightUnit = hasWeight ? (input.weightUnit ?? 'lb') : null
    const weightValue = hasWeight ? input.weightValue : null
    return {
      setType: input.setType ?? 'working',
      weightValue,
      weightUnit,
      weightBasis: input.weightBasis ?? defaultBasis,
      ...normalizeWeight(weightValue, weightUnit),
      repetitions: input.repetitions,
      rir: input.rir ?? null,
      rpe: input.rpe ?? null,
      techniqueOk: input.techniqueOk ?? null,
      discomfort: input.discomfort ?? false,
      notes: input.notes ?? null,
    }
  }

  async #transition(
    user: User,
    sessionId: number,
    apply: (session: WorkoutSession, trx: TransactionClientContract) => Promise<void>
  ) {
    return db.transaction(async (trx) => {
      const session = await this.#lockSession(user, sessionId, trx)
      await apply(session, trx)
      await session.useTransaction(trx).save()
      return session
    })
  }

  #closePause(session: WorkoutSession) {
    if (!session.pausedAt) return
    session.pausedSeconds += Math.max(
      0,
      Math.round(DateTime.now().diff(session.pausedAt, 'seconds').seconds)
    )
    session.pausedAt = null
  }

  async #lockSession(user: User, sessionId: number, trx: TransactionClientContract) {
    const session = await WorkoutSession.query({ client: trx })
      .where('id', sessionId)
      .where('user_id', user.id)
      .forUpdate()
      .first()
    if (!session) throw new NotFoundException('Sesión no encontrada.')
    return session
  }

  async #lockSessionExercise(
    user: User,
    sessionExerciseId: number,
    trx: TransactionClientContract,
    options: { live?: boolean } = {}
  ) {
    const sessionExercise = await WorkoutSessionExercise.query({ client: trx })
      .where('id', sessionExerciseId)
      .whereHas('session', (q) => q.where('user_id', user.id))
      .preload('exercise')
      .forUpdate()
      .first()
    if (!sessionExercise) throw new NotFoundException('Ejercicio no encontrado en tus sesiones.')
    const session = await this.#lockSession(user, sessionExercise.sessionId, trx)
    if (options.live && !session.isLive) {
      throw new DomainException('La sesión ya terminó. Corrige sus series desde el historial.')
    }
    return { sessionExercise, session }
  }

  async #lockSet(user: User, setId: number, trx: TransactionClientContract) {
    const set = await WorkoutSet.query({ client: trx })
      .where('id', setId)
      .where('user_id', user.id)
      .forUpdate()
      .first()
    if (!set) throw new NotFoundException('Serie no encontrada.')
    return set
  }

  async #ownedSet(user: User, setId: number) {
    const set = await WorkoutSet.query().where('id', setId).where('user_id', user.id).first()
    if (!set) throw new NotFoundException('Serie no encontrada.')
    return set
  }

  async #findByRequestId(user: User, clientRequestId: string) {
    return WorkoutSet.query()
      .where('client_request_id', clientRequestId)
      .where('user_id', user.id)
      .first()
  }

  async #visibleExercise(user: User, exerciseId: number, trx: TransactionClientContract) {
    const exercise = await Exercise.query({ client: trx })
      .where('id', exerciseId)
      .withScopes((s) => s.visibleTo(user.id))
      .whereNull('archived_at')
      .first()
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado.')
    return exercise
  }

  async #nextSetNumber(sessionExerciseId: number, trx: TransactionClientContract) {
    const row = await trx
      .from('workout_sets')
      .where('session_exercise_id', sessionExerciseId)
      .max('set_number as max')
      .first()
    return (row?.max ?? 0) + 1
  }

  async #loggedCount(sessionExerciseId: number, trx: TransactionClientContract) {
    const row = await trx
      .from('workout_sets')
      .where('session_exercise_id', sessionExerciseId)
      .count('* as total')
      .first()
    return Number(row?.total ?? 0)
  }

  async #syncExerciseStatus(
    sessionExercise: WorkoutSessionExercise,
    trx: TransactionClientContract
  ) {
    const logged = await this.#loggedCount(sessionExercise.id, trx)
    const status = exerciseStatusAfterChange(
      sessionExercise.status,
      logged,
      sessionExercise.targetSets
    )
    if (status !== sessionExercise.status) {
      sessionExercise.status = status
      await sessionExercise.useTransaction(trx).save()
    }
  }

  async #recordOutcome(
    user: User,
    recommendationId: number,
    set: WorkoutSet,
    trx: TransactionClientContract
  ) {
    const rec = await WorkoutRecommendation.query({ client: trx })
      .where('id', recommendationId)
      .where('user_id', user.id)
      .where('session_exercise_id', set.sessionExerciseId)
      .first()
    if (!rec) return
    const sameWeight =
      rec.recommendedWeight === null ||
      (set.weightValue !== null &&
        set.weightUnit === rec.weightUnit &&
        Math.abs(set.weightValue - rec.recommendedWeight) < 1e-6)
    rec.outcome = sameWeight ? 'accepted' : 'modified'
    await rec.useTransaction(trx).save()
  }

  async #copyTemplate(
    user: User,
    session: WorkoutSession,
    templateId: number,
    defaultRest: number,
    trx: TransactionClientContract
  ) {
    const template = await WorkoutTemplate.query({ client: trx })
      .where('id', templateId)
      .where('user_id', user.id)
      .preload('exercises', (q) => q.preload('sets'))
      .first()
    if (!template) throw new NotFoundException('Rutina no encontrada.')
    session.merge({ templateId: template.id, name: template.name, source: 'template' })
    await session.useTransaction(trx).save()
    for (const [index, item] of template.exercises.entries()) {
      const working = item.sets.filter((s) => s.setType !== 'warmup')
      const reference = working[0] ?? item.sets[0]
      await WorkoutSessionExercise.create(
        {
          sessionId: session.id,
          exerciseId: item.exerciseId,
          templateExerciseId: item.id,
          orderIndex: index,
          targetSets: Math.max(1, item.sets.length),
          targetRepsMin: reference?.targetRepsMin ?? 8,
          targetRepsMax: reference?.targetRepsMax ?? 12,
          restSeconds: item.restSeconds ?? reference?.restSeconds ?? defaultRest,
          notes: item.notes,
          status: 'pending',
        },
        { client: trx }
      )
    }
  }

  async #copySession(
    user: User,
    session: WorkoutSession,
    sourceId: number,
    trx: TransactionClientContract
  ) {
    const source = await WorkoutSession.query({ client: trx })
      .where('id', sourceId)
      .where('user_id', user.id)
      .preload('exercises', (q) => q.preload('sets'))
      .first()
    if (!source) throw new NotFoundException('Sesión no encontrada.')
    session.merge({ name: source.name, templateId: source.templateId })
    await session.useTransaction(trx).save()
    for (const [index, item] of source.exercises.filter((e) => e.status !== 'skipped').entries()) {
      await WorkoutSessionExercise.create(
        {
          sessionId: session.id,
          exerciseId: item.exerciseId,
          templateExerciseId: item.templateExerciseId,
          orderIndex: index,
          targetSets: Math.max(
            1,
            item.sets.filter((s) => s.setType !== 'warmup').length || item.targetSets
          ),
          targetRepsMin: item.targetRepsMin,
          targetRepsMax: item.targetRepsMax,
          restSeconds: item.restSeconds,
          status: 'pending',
        },
        { client: trx }
      )
    }
  }
}
