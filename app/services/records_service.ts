import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'
import PersonalRecord from '#models/personal_record'
import type { SetPerformance } from '#domain/performance'
import type { WeightBasis, WeightUnit, SetType, RecordType } from '#domain/enums'
import { bestMarks, type RecordCandidate } from '#domain/records'

type Row = {
  set_id: number
  session_id: number
  exercise_id: number
  per_hand_multiplier: number | null
  supports_e1rm: boolean
  workout_date: string
  set_number: number
  set_type: SetType
  weight_value: number | null
  weight_unit: WeightUnit | null
  weight_basis: WeightBasis
  repetitions: number | null
}

/**
 * Personal records are derived data: recomputed from every completed set of
 * an exercise, so a corrected or deleted set can never leave a phantom PR.
 */
export default class RecordsService {
  constructor(private client: TransactionClientContract | typeof db = db) {}

  /**
   * Best marks per exercise/basis across completed sessions, optionally
   * only those dated before `beforeDate` (or excluding one session).
   */
  async bestByExercise(
    userId: number,
    exerciseIds: number[],
    unit: WeightUnit,
    options: { excludeSessionId?: number; beforeDate?: string } = {}
  ) {
    const rows = await this.#rows(userId, exerciseIds, options)
    const grouped = new Map<number, Row[]>()
    for (const row of rows)
      grouped.set(row.exercise_id, [...(grouped.get(row.exercise_id) ?? []), row])

    const result = new Map<
      number,
      Array<RecordCandidate & { setId: number; sessionId: number; date: string }>
    >()
    for (const [exerciseId, list] of grouped) {
      const first = list[0]
      const perf: Array<SetPerformance & { setId: number; sessionId: number; date: string }> =
        list.map((r, i) => ({
          setNumber: i + 1,
          setType: r.set_type,
          weightValue: r.weight_value,
          weightUnit: r.weight_unit,
          weightBasis: r.weight_basis,
          repetitions: r.repetitions,
          setId: r.set_id,
          sessionId: r.session_id,
          date: r.workout_date,
        }))
      const marks = bestMarks(
        perf,
        { perHandMultiplier: first.per_hand_multiplier },
        unit,
        first.supports_e1rm
      )
      result.set(
        exerciseId,
        marks.map((m) => {
          const source = perf[m.setNumber - 1]
          return { ...m, setId: source.setId, sessionId: source.sessionId, date: source.date }
        })
      )
    }
    return result
  }

  /**
   * Rewrites the stored personal_records of these exercises from history.
   */
  async recompute(userId: number, exerciseIds: number[], unit: WeightUnit) {
    if (exerciseIds.length === 0) return
    const best = await this.bestByExercise(userId, exerciseIds, unit)
    await PersonalRecord.query({ client: this.client as TransactionClientContract })
      .where('user_id', userId)
      .whereIn('exercise_id', exerciseIds)
      .delete()
    const rows = []
    for (const [exerciseId, marks] of best) {
      for (const mark of marks) {
        rows.push({
          userId,
          exerciseId,
          recordType: mark.recordType as RecordType,
          weightBasis: mark.basis,
          value: mark.value,
          valueUnit: mark.valueUnit,
          weightValue: mark.load,
          weightUnit: mark.load === null ? null : unit,
          repetitions: mark.reps,
          setId: mark.setId,
          sessionId: mark.sessionId,
          achievedOn: DateTime.fromISO(mark.date),
        })
      }
    }
    if (rows.length)
      await PersonalRecord.createMany(rows, { client: this.client as TransactionClientContract })
  }

  async #rows(
    userId: number,
    exerciseIds: number[],
    options: { excludeSessionId?: number; beforeDate?: string }
  ) {
    if (exerciseIds.length === 0) return []
    const query = this.client
      .from('workout_sets as s')
      .join('workout_session_exercises as wse', 'wse.id', 's.session_exercise_id')
      .join('workout_sessions as ws', 'ws.id', 'wse.session_id')
      .join('exercises as e', 'e.id', 'wse.exercise_id')
      .where('ws.user_id', userId)
      .where('ws.status', 'completed')
      .whereIn('wse.exercise_id', exerciseIds)
      .select(
        's.id as set_id',
        'ws.id as session_id',
        'wse.exercise_id',
        'e.per_hand_multiplier',
        'e.supports_e1rm',
        'ws.workout_date',
        's.set_number',
        's.set_type',
        's.weight_value',
        's.weight_unit',
        's.weight_basis',
        's.repetitions'
      )
      .orderBy('ws.workout_date')
      .orderBy('ws.id')
      .orderBy('s.set_number')
    if (options.excludeSessionId) query.whereNot('ws.id', options.excludeSessionId)
    if (options.beforeDate) query.where('ws.workout_date', '<=', options.beforeDate)
    return (await query) as Row[]
  }
}
