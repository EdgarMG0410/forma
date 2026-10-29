import type User from '#models/user'
import WorkoutRecommendation from '#models/workout_recommendation'
import WorkoutSession from '#models/workout_session'
import type WorkoutSessionExercise from '#models/workout_session_exercise'
import { NotFoundException } from '#exceptions/domain_exception'
import type { LiveSessionDTO, RecommendationDTO, SessionExerciseDTO } from '#domain/dto'
import type { WeightUnit } from '#domain/enums'
import type { LoadContext } from '#domain/load'
import { WorkoutProgressionService } from '#domain/progression'
import { nextStep, sessionProgress, type FlowExercise } from '#domain/session_flow'
import { round } from '#domain/units'
import { roundTotals, sumVolume, emptyTotals } from '#domain/volume'
import ExerciseHistoryService from '#services/exercise_history_service'
import PreferencesService from '#services/preferences_service'
import { toExerciseRef, toPerformance, toSessionHeader, toSetDTO } from '#services/serializers'

const engine = new WorkoutProgressionService()

export function loadContext(se: WorkoutSessionExercise): LoadContext {
  return { perHandMultiplier: se.exercise.perHandMultiplier }
}

/**
 * Builds what the Workout Live screen shows: every exercise with its sets,
 * the next set to do, the engine's recommendation for it and the last time
 * that exercise was trained.
 */
export default class WorkoutStateService {
  async loadSession(user: User, sessionId: number) {
    const session = await WorkoutSession.query()
      .where('id', sessionId)
      .where('user_id', user.id)
      .preload('exercises', (q) =>
        q.preload('exercise', (e) => e.preload('muscleGroups')).preload('sets')
      )
      .first()
    if (!session) throw new NotFoundException('Sesión no encontrada.')
    return session
  }

  async liveState(user: User, sessionId: number, focusId?: number | null): Promise<LiveSessionDTO> {
    const session = await this.loadSession(user, sessionId)
    const preferences = await PreferencesService.for(user)
    const unit = this.#displayUnit(session, preferences.weightUnit)

    const exercises = session.exercises.map((se) => this.exerciseDTO(se, unit))
    const flow: FlowExercise[] = exercises.map((e) => ({
      id: e.id,
      orderIndex: e.orderIndex,
      status: e.status,
      targetSets: e.targetSets,
      loggedSets: e.sets.length,
    }))
    const next = session.isLive ? nextStep(flow, focusId) : ({ kind: 'done' } as const)

    const totals = emptyTotals(unit)
    for (const se of session.exercises)
      sumVolume(se.sets.map(toPerformance), loadContext(se), unit, totals)
    const rounded = roundTotals(totals)

    let recommendation: RecommendationDTO | null = null
    let lastResult: LiveSessionDTO['lastResult'] = null
    let restSeconds = preferences.defaultRestSeconds
    if (next.kind === 'set') {
      const current = session.exercises.find((se) => se.id === next.sessionExerciseId)!
      const history = await new ExerciseHistoryService().forExercise(user.id, current.exerciseId, {
        excludeSessionId: session.id,
        limit: 4,
      })
      recommendation = await this.#recommend(user, current, next.setNumber, unit, history)
      restSeconds = recommendation.restSeconds
      const previous = history[0]
      if (previous) {
        lastResult = {
          sessionId: previous.sessionId,
          workoutDate: previous.workoutDate,
          sets: previous.sets.map((s) => ({
            setNumber: s.setNumber,
            setType: s.setType,
            weightValue: s.weightValue,
            weightUnit: s.weightUnit,
            weightBasis: s.weightBasis,
            repetitions: s.repetitions,
          })),
        }
      }
    }

    const allSets = session.exercises.flatMap((se) => se.sets)
    const lastSetAt = allSets
      .map((s) => s.completedAt)
      .filter((d) => d !== null)
      .sort((a, b) => b!.toMillis() - a!.toMillis())[0]

    return {
      ...toSessionHeader(session),
      unit,
      exercises,
      next,
      progress: sessionProgress(flow),
      totals: {
        unit,
        volume: rounded.total,
        workingVolume: rounded.working,
        sets: rounded.sets,
        workingSets: rounded.workingSets,
        effectiveSets: rounded.effectiveSets,
        reps: rounded.reps,
        incompleteSets: rounded.incompleteSets,
      },
      recommendation,
      lastResult,
      lastSetAt: lastSetAt?.toISO() ?? null,
      restSeconds,
    }
  }

  exerciseDTO(se: WorkoutSessionExercise, unit: WeightUnit): SessionExerciseDTO {
    const totals = sumVolume(se.sets.map(toPerformance), loadContext(se), unit)
    return {
      id: se.id,
      orderIndex: se.orderIndex,
      status: se.status,
      targetSets: se.targetSets,
      targetRepsMin: se.targetRepsMin,
      targetRepsMax: se.targetRepsMax,
      restSeconds: se.restSeconds,
      notes: se.notes,
      substitutedFrom: null,
      exercise: toExerciseRef(se.exercise),
      sets: se.sets.map(toSetDTO),
      totals: {
        sets: totals.sets,
        workingSets: totals.workingSets,
        reps: totals.reps,
        volume: round(totals.total, 2),
        incompleteSets: totals.incompleteSets,
      },
    }
  }

  /**
   * The unit the session is displayed in: whatever its sets were logged in,
   * falling back to the user's preference.
   */
  #displayUnit(session: WorkoutSession, preferred: WeightUnit): WeightUnit {
    const first = session.exercises.flatMap((e) => e.sets).find((s) => s.weightUnit)
    return first?.weightUnit ?? preferred
  }

  async #recommend(
    user: User,
    se: WorkoutSessionExercise,
    setNumber: number,
    unit: WeightUnit,
    history: Awaited<ReturnType<ExerciseHistoryService['forExercise']>>
  ): Promise<RecommendationDTO> {
    // the unit this exercise is actually logged in wins over the session unit
    const exerciseUnit =
      se.sets.find((s) => s.weightUnit)?.weightUnit ??
      history[0]?.sets.find((s) => s.weightUnit)?.weightUnit ??
      unit
    const result = engine.recommend({
      exercise: {
        equipment: se.exercise.equipment,
        exerciseType: se.exercise.exerciseType,
        weightBasis: se.exercise.defaultWeightBasis,
        loadIncrement: se.exercise.loadIncrement,
        loadIncrementUnit: se.exercise.loadIncrementUnit,
      },
      unit: exerciseUnit,
      targetRepsMin: se.targetRepsMin,
      targetRepsMax: se.targetRepsMax,
      restSeconds: se.restSeconds,
      currentSets: se.sets.map(toPerformance),
      history: history.map((h) => ({ workoutDate: h.workoutDate, sets: h.sets })),
      discomfort: se.sets.some((s) => s.discomfort),
    })

    // one stored recommendation per (exercise, set): refreshed when inputs change
    const stored = await WorkoutRecommendation.updateOrCreate(
      { sessionExerciseId: se.id, setNumber, userId: user.id },
      {
        recommendedWeight: result.recommendedWeight,
        weightUnit: result.recommendedWeight === null ? null : result.unit,
        targetRepsMin: result.targetRepsMin,
        targetRepsMax: result.targetRepsMax,
        restSeconds: result.restSeconds,
        rationale: result.rationale,
        confidence: result.confidence,
        warnings: result.warnings,
        inputs: {
          decision: result.decision,
          historySessions: history.length,
          currentSets: se.sets.length,
        },
        engineVersion: result.engineVersion,
      }
    )
    return { ...result, id: stored.id, sessionExerciseId: se.id, setNumber }
  }
}
