import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import string from '@adonisjs/core/helpers/string'
import type User from '#models/user'
import type WorkoutSession from '#models/workout_session'
import WorkoutSummary from '#models/workout_summary'
import DomainException from '#exceptions/domain_exception'
import type { SummaryExerciseDTO, SummaryRecordDTO, WorkoutSummaryDTO } from '#domain/dto'
import type { WeightUnit } from '#domain/enums'
import { compareExercise } from '#domain/comparison'
import { isWorkingSet } from '#domain/performance'
import { WorkoutProgressionService } from '#domain/progression'
import { newRecords } from '#domain/records'
import { activeSeconds } from '#domain/session_flow'
import { bestMarks } from '#domain/records'
import { topSet } from '#domain/strength'
import { round } from '#domain/units'
import { sumVolume } from '#domain/volume'
import ExerciseHistoryService from '#services/exercise_history_service'
import { makeCoach } from '#services/ai/coach_factory'
import PreferencesService from '#services/preferences_service'
import RecordsService from '#services/records_service'
import { toPerformance, toSessionHeader, toSetDTO } from '#services/serializers'
import WorkoutStateService, { loadContext } from '#services/workout_state_service'

const engine = new WorkoutProgressionService()

const RECORD_LABELS: Record<string, string> = {
  max_weight: 'Peso máximo',
  max_reps: 'Más repeticiones',
  best_set_volume: 'Mejor serie (volumen)',
  estimated_1rm: '1RM estimado',
}

/**
 * Turns a finished session into its summary: totals in lb and kg, a table per
 * exercise, comparison with the previous time each exercise was trained,
 * records, plain-language observations and the targets for next time.
 * Re-runnable: correcting a set of a finished session regenerates it.
 */
export default class WorkoutSummaryService {
  async generate(user: User, sessionId: number): Promise<WorkoutSummary> {
    const session = await new WorkoutStateService().loadSession(user, sessionId)
    if (session.status !== 'completed') {
      throw new DomainException('El resumen se genera al finalizar la sesión.')
    }
    const preferences = await PreferencesService.for(user)
    const unit: WeightUnit =
      session.exercises.flatMap((e) => e.sets).find((s) => s.weightUnit)?.weightUnit ??
      preferences.weightUnit
    const workoutDate = session.workoutDate.toISODate()!
    const exerciseIds = [...new Set(session.exercises.map((e) => e.exerciseId))]

    const history = new ExerciseHistoryService()
    const previous = await history.previousFor(user.id, exerciseIds, {
      excludeSessionId: session.id,
      beforeDate: workoutDate,
    })
    const records = new RecordsService()
    const priorBest = await records.bestByExercise(user.id, exerciseIds, unit, {
      excludeSessionId: session.id,
      beforeDate: workoutDate,
    })

    const perExercise: SummaryExerciseDTO[] = []
    const newMarks: SummaryRecordDTO[] = []
    const observations: string[] = []
    let volumeLb = 0
    let volumeKg = 0
    let totalReps = 0
    let setsCount = 0
    let workingSetsCount = 0
    let incomplete = 0

    for (const se of session.exercises) {
      const perf = se.sets.map(toPerformance)
      const ctx = loadContext(se)
      const lb = sumVolume(perf, ctx, 'lb')
      const kg = sumVolume(perf, ctx, 'kg')
      const inUnit = unit === 'lb' ? lb : kg
      volumeLb += lb.total
      volumeKg += kg.total
      totalReps += lb.reps
      setsCount += lb.sets
      workingSetsCount += lb.workingSets
      incomplete += lb.incompleteSets

      const prev = previous.get(se.exerciseId)
      const comparison =
        prev && perf.length
          ? { ...compareExercise(perf, prev.sets, ctx, unit), previousDate: prev.workoutDate }
          : null
      const top = topSet(perf, ctx, unit)

      if (perf.length) {
        const candidates = bestMarks(perf, ctx, unit, se.exercise.supportsE1Rm)
        const existing = (priorBest.get(se.exerciseId) ?? []).map((m) => ({
          recordType: m.recordType,
          basis: m.basis,
          value: m.value,
        }))
        // with no prior history every mark is trivially a "record" — not worth celebrating
        if (existing.length) {
          for (const mark of newRecords(candidates, existing)) {
            newMarks.push({
              exerciseId: se.exerciseId,
              exerciseName: se.exercise.name,
              recordType: mark.recordType,
              basis: mark.basis,
              value: round(mark.value, 2),
              valueUnit: mark.valueUnit,
              previous: mark.previous === null ? null : round(mark.previous, 2),
              load: mark.load === null ? null : round(mark.load, 2),
              reps: mark.reps,
            })
          }
        }
      }

      const nextHistory = [
        { workoutDate, sets: perf },
        ...(prev ? [{ workoutDate: prev.workoutDate, sets: prev.sets }] : []),
      ]
      const next = perf.length
        ? engine.recommend({
            exercise: {
              equipment: se.exercise.equipment,
              exerciseType: se.exercise.exerciseType,
              weightBasis: se.exercise.defaultWeightBasis,
              loadIncrement: se.exercise.loadIncrement,
              loadIncrementUnit: se.exercise.loadIncrementUnit,
            },
            unit,
            targetRepsMin: se.targetRepsMin,
            targetRepsMax: se.targetRepsMax,
            currentSets: [],
            history: nextHistory,
            discomfort: perf.some((s) => s.discomfort),
          })
        : null

      perExercise.push({
        sessionExerciseId: se.id,
        exerciseId: se.exerciseId,
        name: se.exercise.name,
        status: se.status,
        basis: se.exercise.defaultWeightBasis,
        sets: se.sets.map(toSetDTO),
        totals: {
          sets: inUnit.sets,
          workingSets: inUnit.workingSets,
          reps: inUnit.reps,
          volume: round(inUnit.total, 2),
          incompleteSets: inUnit.incompleteSets,
          volumeLb: round(lb.total, 2),
          volumeKg: round(kg.total, 2),
        },
        topSet: top
          ? { load: top.load === null ? null : round(top.load, 2), reps: top.reps }
          : null,
        comparison,
        nextTarget: next && {
          decision: next.decision,
          recommendedWeight: next.recommendedWeight,
          unit: next.unit,
          targetRepsMin: next.targetRepsMin,
          targetRepsMax: next.targetRepsMax,
          rationale: next.rationale,
        },
      })

      observations.push(
        ...this.#observe(se.exercise.name, se.status, perf, comparison?.note, comparison?.signal)
      )
    }

    if (incomplete > 0) {
      observations.unshift(
        `${incomplete} ${incomplete === 1 ? 'serie' : 'series'} sin peso o repeticiones: no cuentan en el volumen.`
      )
    }
    if (newMarks.length) {
      observations.unshift(
        `${newMarks.length} ${newMarks.length === 1 ? 'nueva marca personal' : 'nuevas marcas personales'}.`
      )
    }

    const sessionComparison = await this.#compareSession(
      user,
      session,
      volumeLb,
      totalReps,
      setsCount
    )

    await records.recompute(user.id, exerciseIds, unit)

    const existing = await WorkoutSummary.findBy('session_id', session.id)
    const payload = {
      userId: user.id,
      exercisesCompleted: session.exercises.filter((e) => e.sets.length > 0).length,
      setsCount,
      workingSetsCount,
      totalReps,
      volumeLb: round(volumeLb, 2),
      volumeKg: round(volumeKg, 2),
      durationSeconds: activeSeconds({
        startedAt: session.startedAt?.toJSDate() ?? null,
        endedAt: session.completedAt?.toJSDate() ?? null,
        pausedAt: null,
        pausedSeconds: session.pausedSeconds,
        now: new Date(),
      }),
      perExercise,
      comparison: sessionComparison,
      records: newMarks,
      observations,
      generatedAt: DateTime.now(),
    }
    if (existing) {
      existing.merge(payload)
      await existing.save()
      return existing
    }
    return WorkoutSummary.create({ ...payload, sessionId: session.id })
  }

  async toDTO(user: User, sessionId: number): Promise<WorkoutSummaryDTO> {
    let summary = await WorkoutSummary.query()
      .where('session_id', sessionId)
      .where('user_id', user.id)
      .preload('session')
      .first()
    if (!summary) {
      summary = await this.generate(user, sessionId)
      await summary.load('session')
    }
    return this.serialize(summary, summary.session)
  }

  serialize(summary: WorkoutSummary, session: WorkoutSession): WorkoutSummaryDTO {
    const unit = (summary.perExercise[0]?.nextTarget?.unit ?? 'lb') as WeightUnit
    return {
      session: toSessionHeader(session),
      unit,
      exercisesCompleted: summary.exercisesCompleted,
      setsCount: summary.setsCount,
      workingSetsCount: summary.workingSetsCount,
      totalReps: summary.totalReps,
      volumeLb: summary.volumeLb,
      volumeKg: summary.volumeKg,
      durationSeconds: summary.durationSeconds,
      perExercise: summary.perExercise,
      comparison: summary.comparison,
      records: summary.records,
      observations: summary.observations,
      aiNarrative: summary.aiNarrative,
      shareToken: summary.shareToken,
      generatedAt: summary.generatedAt.toISO()!,
    }
  }

  /**
   * Optional AI narrative. Only the summary's own numbers are sent — no
   * notes, body data or discomfort reports.
   */
  async narrate(user: User, sessionId: number) {
    const preferences = await PreferencesService.for(user)
    const coach = makeCoach()
    if (!preferences.aiEnabled || !coach.available) {
      throw new DomainException(
        'Activa el asistente de IA en Ajustes para generar el resumen narrado.'
      )
    }
    const summary = await WorkoutSummary.query()
      .where('session_id', sessionId)
      .where('user_id', user.id)
      .preload('session')
      .firstOrFail()
    const dto = this.serialize(summary, summary.session)
    const text = await coach.summarize({
      sessionName: dto.session.name,
      unit: dto.unit,
      volume: dto.unit === 'lb' ? dto.volumeLb : dto.volumeKg,
      sets: dto.setsCount,
      reps: dto.totalReps,
      exercises: dto.perExercise.map((e) => ({
        name: e.name,
        sets: e.sets.map((s) => `${s.weightValue ?? '?'}×${s.repetitions ?? '?'}`).join(', '),
        comparison: e.comparison?.note ?? null,
        nextTarget: e.nextTarget?.rationale ?? null,
      })),
      records: dto.records.map(
        (r) => `${r.exerciseName}: ${r.recordType} ${r.value} ${r.valueUnit}`
      ),
      observations: dto.observations.filter((o) => !o.includes('molestias')),
    })
    if (!text)
      throw new DomainException(
        'El asistente no pudo generar el resumen ahora. Tus datos no cambiaron.'
      )
    summary.aiNarrative = text
    await summary.save()
  }

  async share(user: User, sessionId: number) {
    const summary = await WorkoutSummary.query()
      .where('session_id', sessionId)
      .where('user_id', user.id)
      .firstOrFail()
    if (!summary.shareToken) {
      summary.shareToken = string.random(32)
      await summary.save()
    }
    return summary.shareToken
  }

  async unshare(user: User, sessionId: number) {
    await WorkoutSummary.query()
      .where('session_id', sessionId)
      .where('user_id', user.id)
      .update({ shareToken: null })
  }

  #observe(
    name: string,
    status: string,
    perf: ReturnType<typeof toPerformance>[],
    note?: string,
    signal?: string
  ) {
    const out: string[] = []
    if (status === 'skipped' && perf.length === 0) out.push(`Omitiste ${name}.`)
    if (signal && signal !== 'steady' && signal !== 'not_comparable' && note)
      out.push(`${name}: ${note.toLowerCase()}.`)
    const working = perf.filter(isWorkingSet).filter((s) => s.repetitions !== null)
    if (working.length >= 3) {
      const first = working[0].repetitions!
      const last = working[working.length - 1].repetitions!
      const sameLoad = working[0].weightValue === working[working.length - 1].weightValue
      if (sameLoad && first > 0 && last / first <= 0.7) {
        out.push(
          `${name}: las reps cayeron de ${first} a ${last} con el mismo peso; prueba más descanso entre series.`
        )
      }
    }
    if (perf.some((s) => s.discomfort)) {
      out.push(
        `Marcaste molestias en ${name}. Si persisten, consulta a un profesional de la salud.`
      )
    }
    return out
  }

  async #compareSession(
    user: User,
    session: WorkoutSession,
    volumeLb: number,
    reps: number,
    sets: number
  ) {
    const previousQuery = db
      .from('workout_sessions as ws')
      .leftJoin('workout_summaries as sm', 'sm.session_id', 'ws.id')
      .where('ws.user_id', user.id)
      .where('ws.status', 'completed')
      .whereNot('ws.id', session.id)
      .where('ws.workout_date', '<=', session.workoutDate.toISODate()!)
      .select('ws.id', 'ws.workout_date', 'sm.volume_lb', 'sm.total_reps', 'sm.sets_count')
      .orderBy('ws.workout_date', 'desc')
      .orderBy('ws.id', 'desc')
    // compare like with like: the previous session of the same routine, else of the same name
    if (session.templateId) previousQuery.where('ws.template_id', session.templateId)
    else previousQuery.where('ws.name', session.name)
    const previous = await previousQuery.first()
    if (!previous || previous.volume_lb === null) {
      return {
        previousSessionId: previous?.id ?? null,
        previousDate: previous?.workout_date ?? null,
        volumeDeltaLb: null,
        repsDelta: null,
        setsDelta: null,
      }
    }
    return {
      previousSessionId: previous.id,
      previousDate: String(previous.workout_date),
      volumeDeltaLb: round(volumeLb - Number(previous.volume_lb), 2),
      repsDelta: reps - Number(previous.total_reps),
      setsDelta: sets - Number(previous.sets_count),
    }
  }

  static RECORD_LABELS = RECORD_LABELS
}
