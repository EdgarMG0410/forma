import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { SetPerformance } from '#domain/performance'
import type { SetType, WeightBasis, WeightUnit } from '#domain/enums'

export type ExerciseSessionHistory = {
  sessionId: number
  sessionExerciseId: number
  workoutDate: string
  sets: SetPerformance[]
}

type Row = {
  session_id: number
  session_exercise_id: number
  workout_date: string
  set_number: number
  set_type: SetType
  weight_value: number | null
  weight_unit: WeightUnit | null
  weight_basis: WeightBasis
  repetitions: number | null
  rir: number | null
  rpe: number | null
  technique_ok: boolean | null
  discomfort: boolean
}

/**
 * Reads a user's real logged history for exercises — the only input the
 * progression engine, comparisons and records are allowed to use.
 */
export default class ExerciseHistoryService {
  constructor(private client: TransactionClientContract | typeof db = db) {}

  /**
   * Completed sessions of `exerciseId`, newest first, excluding
   * `excludeSessionId` (the session being trained or summarised) and anything
   * dated after `beforeDate` when given.
   */
  async forExercise(
    userId: number,
    exerciseId: number,
    options: { excludeSessionId?: number; beforeDate?: string; limit?: number } = {}
  ): Promise<ExerciseSessionHistory[]> {
    const sessions = this.client
      .from('workout_sessions as ws')
      .join('workout_session_exercises as wse', 'wse.session_id', 'ws.id')
      .where('ws.user_id', userId)
      .where('ws.status', 'completed')
      .where('wse.exercise_id', exerciseId)
      .whereExists((q) => q.from('workout_sets').whereColumn('session_exercise_id', 'wse.id'))
      .select('ws.id as session_id', 'ws.workout_date', 'ws.completed_at')
      .groupBy('ws.id')
      .orderBy('ws.workout_date', 'desc')
      .orderBy('ws.completed_at', 'desc')
      .limit(options.limit ?? 6)
    if (options.excludeSessionId) sessions.whereNot('ws.id', options.excludeSessionId)
    if (options.beforeDate) sessions.where('ws.workout_date', '<=', options.beforeDate)

    const picked = (await sessions) as Array<{ session_id: number }>
    if (picked.length === 0) return []
    return this.#load(
      userId,
      [exerciseId],
      picked.map((p) => p.session_id)
    ).then((map) => map.get(exerciseId) ?? [])
  }

  /**
   * The most recent completed appearance of each exercise before a date —
   * what a summary compares against.
   */
  async previousFor(
    userId: number,
    exerciseIds: number[],
    options: { excludeSessionId: number; beforeDate: string }
  ): Promise<Map<number, ExerciseSessionHistory>> {
    if (exerciseIds.length === 0) return new Map()
    const rows = (await this.client
      .from('workout_sessions as ws')
      .join('workout_session_exercises as wse', 'wse.session_id', 'ws.id')
      .where('ws.user_id', userId)
      .where('ws.status', 'completed')
      .whereNot('ws.id', options.excludeSessionId)
      .where('ws.workout_date', '<=', options.beforeDate)
      .whereIn('wse.exercise_id', exerciseIds)
      .whereExists((q) => q.from('workout_sets').whereColumn('session_exercise_id', 'wse.id'))
      .distinctOn('wse.exercise_id')
      .select('wse.exercise_id', 'ws.id as session_id')
      .orderBy('wse.exercise_id')
      .orderBy('ws.workout_date', 'desc')
      .orderBy('ws.completed_at', 'desc')) as Array<{ exercise_id: number; session_id: number }>

    const result = new Map<number, ExerciseSessionHistory>()
    for (const row of rows) {
      const loaded = await this.#load(userId, [row.exercise_id], [row.session_id])
      const history = loaded.get(row.exercise_id)?.[0]
      if (history) result.set(row.exercise_id, history)
    }
    return result
  }

  async #load(userId: number, exerciseIds: number[], sessionIds: number[]) {
    const rows = (await this.client
      .from('workout_sets as s')
      .join('workout_session_exercises as wse', 'wse.id', 's.session_exercise_id')
      .join('workout_sessions as ws', 'ws.id', 'wse.session_id')
      .where('ws.user_id', userId)
      .whereIn('wse.exercise_id', exerciseIds)
      .whereIn('ws.id', sessionIds)
      .select(
        'wse.exercise_id',
        'ws.id as session_id',
        'wse.id as session_exercise_id',
        'ws.workout_date',
        's.set_number',
        's.set_type',
        's.weight_value',
        's.weight_unit',
        's.weight_basis',
        's.repetitions',
        's.rir',
        's.rpe',
        's.technique_ok',
        's.discomfort'
      )
      .orderBy('ws.workout_date', 'desc')
      .orderBy('ws.id', 'desc')
      .orderBy('wse.order_index')
      .orderBy('s.set_number')) as Array<Row & { exercise_id: number }>

    const byExercise = new Map<number, ExerciseSessionHistory[]>()
    for (const row of rows) {
      const list = byExercise.get(row.exercise_id) ?? []
      // an exercise can appear twice in a session; merge its sets per session
      let entry = list.find((h) => h.sessionId === row.session_id)
      if (!entry) {
        entry = {
          sessionId: row.session_id,
          sessionExerciseId: row.session_exercise_id,
          workoutDate: String(row.workout_date),
          sets: [],
        }
        list.push(entry)
      }
      entry.sets.push({
        setNumber: entry.sets.length + 1,
        setType: row.set_type,
        weightValue: row.weight_value,
        weightUnit: row.weight_unit,
        weightBasis: row.weight_basis,
        repetitions: row.repetitions,
        rir: row.rir,
        rpe: row.rpe,
        techniqueOk: row.technique_ok,
        discomfort: row.discomfort,
      })
      byExercise.set(row.exercise_id, list)
    }
    return byExercise
  }
}
