import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type User from '#models/user'
import type { WeightUnit } from '#domain/enums'
import { EFFECTIVE_SET_MAX_RIR } from '#domain/volume'
import { convertWeight, round } from '#domain/units'
import { estimateOneRepMax } from '#domain/strength'
import PreferencesService from '#services/preferences_service'

/**
 * Load per set in lb, honouring the explicit per-hand → total conversion
 * of the exercise (same rule as `effectiveLoad` in the domain).
 */
const LOAD_LB_SQL = `s.weight_lb * CASE WHEN s.weight_basis = 'per_hand' AND e.per_hand_multiplier IS NOT NULL THEN e.per_hand_multiplier ELSE 1 END`
const VOLUME_LB_SQL = `COALESCE(${LOAD_LB_SQL} * s.repetitions, 0)`
const EFFECTIVE_SQL = `(s.set_type <> 'warmup' AND COALESCE(s.repetitions, 0) > 0 AND (COALESCE(s.rir, 10 - s.rpe) IS NULL OR COALESCE(s.rir, 10 - s.rpe) <= ${EFFECTIVE_SET_MAX_RIR}))`

export type HistoryFilters = {
  from?: string | null
  to?: string | null
  exerciseId?: number | null
  muscle?: string | null
  page?: number
}

/**
 * Read-only aggregates for the dashboard, history and exercise pages. Every
 * query is scoped to the user.
 */
export default class AnalyticsService {
  #fromLb(value: number, unit: WeightUnit) {
    return round(convertWeight(value, 'lb', unit), 0)
  }

  async dashboard(user: User) {
    const preferences = await PreferencesService.for(user)
    const unit = preferences.weightUnit
    const now = DateTime.now().setZone(preferences.timezone)
    const weekStart = now.startOf('week').toISODate()!

    const [live, last, weekly, records, muscles, suggested] = await Promise.all([
      db
        .from('workout_sessions')
        .where('user_id', user.id)
        .whereIn('status', ['active', 'paused'])
        .select('id', 'name', 'status', 'started_at')
        .first(),
      this.#lastSession(user.id, unit),
      this.weeklyTrend(user, 8),
      db
        .from('personal_records as pr')
        .join('exercises as e', 'e.id', 'pr.exercise_id')
        .where('pr.user_id', user.id)
        .whereIn('pr.record_type', ['max_weight', 'estimated_1rm'])
        .select(
          'pr.id',
          'pr.record_type',
          'pr.value',
          'pr.value_unit',
          'pr.repetitions',
          'pr.weight_value',
          'pr.weight_unit',
          'pr.weight_basis',
          'pr.achieved_on',
          'e.id as exercise_id',
          'e.name as exercise_name'
        )
        .orderBy('pr.achieved_on', 'desc')
        .orderBy('pr.id', 'desc')
        .limit(5),
      this.muscleSets(user.id, weekStart),
      this.#suggestedRoutine(user.id),
    ])

    const thisWeek = weekly[weekly.length - 1]
    const hour = now.hour
    const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'

    return {
      greeting: `${greeting}, ${user.firstName}`,
      unit,
      live: live
        ? {
            id: live.id as number,
            name: live.name as string,
            status: live.status as string,
            startedAt: live.started_at ? DateTime.fromJSDate(live.started_at).toISO() : null,
          }
        : null,
      last,
      week: {
        sessions: thisWeek?.sessions ?? 0,
        goal: preferences.weeklySessionsGoal,
        volume: thisWeek?.volume ?? 0,
      },
      weekly,
      records: records.map((r: any) => ({
        id: r.id as number,
        exerciseId: r.exercise_id as number,
        exerciseName: r.exercise_name as string,
        recordType: r.record_type as string,
        value: Number(r.value),
        valueUnit: r.value_unit as string,
        weightValue: r.weight_value === null ? null : Number(r.weight_value),
        weightUnit: r.weight_unit as string | null,
        repetitions: r.repetitions as number | null,
        achievedOn: String(r.achieved_on),
      })),
      muscles,
      suggested,
    }
  }

  /**
   * Sessions and load volume per week (oldest first), in the user's unit.
   */
  async weeklyTrend(user: User, weeks: number) {
    const preferences = await PreferencesService.for(user)
    const start = DateTime.now()
      .setZone(preferences.timezone)
      .startOf('week')
      .minus({ weeks: weeks - 1 })
    const rows = await db
      .from('workout_sessions as ws')
      .leftJoin('workout_session_exercises as wse', 'wse.session_id', 'ws.id')
      .leftJoin('exercises as e', 'e.id', 'wse.exercise_id')
      .leftJoin('workout_sets as s', 's.session_exercise_id', 'wse.id')
      .where('ws.user_id', user.id)
      .where('ws.status', 'completed')
      .where('ws.workout_date', '>=', start.toISODate()!)
      .select(db.raw(`date_trunc('week', ws.workout_date)::date::text as week`))
      .select(db.raw('COUNT(DISTINCT ws.id)::int as sessions'))
      .select(db.raw(`COALESCE(SUM(${VOLUME_LB_SQL}), 0)::float as volume_lb`))
      .select(db.raw(`COUNT(s.id) FILTER (WHERE ${EFFECTIVE_SQL})::int as effective_sets`))
      .groupByRaw(`date_trunc('week', ws.workout_date)`)

    const byWeek = new Map(rows.map((r: any) => [r.week as string, r]))
    return Array.from({ length: weeks }, (_, i) => {
      const week = start.plus({ weeks: i }).toISODate()!
      const row: any = byWeek.get(week)
      return {
        week,
        label: start.plus({ weeks: i }).setLocale('es').toFormat('d LLL'),
        sessions: row?.sessions ?? 0,
        volume: this.#fromLb(row?.volume_lb ?? 0, preferences.weightUnit),
        effectiveSets: row?.effective_sets ?? 0,
      }
    })
  }

  /**
   * Training volume per muscle group as effective sets (secondary = ½).
   */
  async muscleSets(userId: number, fromDate: string, toDate?: string) {
    const query = db
      .from('workout_sets as s')
      .join('workout_session_exercises as wse', 'wse.id', 's.session_exercise_id')
      .join('workout_sessions as ws', 'ws.id', 'wse.session_id')
      .join('exercises as e', 'e.id', 'wse.exercise_id')
      .join('exercise_muscle_groups as emg', 'emg.exercise_id', 'e.id')
      .join('muscle_groups as mg', 'mg.id', 'emg.muscle_group_id')
      .where('ws.user_id', userId)
      .whereIn('ws.status', ['completed', 'active', 'paused'])
      .where('ws.workout_date', '>=', fromDate)
      .whereRaw(EFFECTIVE_SQL)
      .select('mg.slug', 'mg.name', 'mg.region')
      .select(db.raw(`SUM(CASE WHEN emg.role = 'primary' THEN 1 ELSE 0.5 END)::float as sets`))
      .groupBy('mg.slug', 'mg.name', 'mg.region')
      .orderBy('sets', 'desc')
    if (toDate) query.where('ws.workout_date', '<=', toDate)
    const rows = await query
    return rows.map((r: any) => ({
      slug: r.slug as string,
      name: r.name as string,
      region: r.region as string,
      sets: Number(r.sets),
    }))
  }

  async calendar(userId: number, month: string) {
    const start = DateTime.fromISO(`${month}-01`)
    const rows = await db
      .from('workout_sessions')
      .where('user_id', userId)
      .whereIn('status', ['completed', 'active', 'paused'])
      .whereBetween('workout_date', [start.toISODate()!, start.endOf('month').toISODate()!])
      .select('id', 'name', 'status', 'workout_date', 'data_quality', 'source')
      .orderBy('workout_date')
    return rows.map((r: any) => ({
      id: r.id as number,
      name: r.name as string,
      status: r.status as string,
      date: String(r.workout_date),
      dataQuality: r.data_quality as string,
      source: r.source as string,
    }))
  }

  async history(user: User, filters: HistoryFilters) {
    const preferences = await PreferencesService.for(user)
    const perPage = 20
    const query = db
      .from('workout_sessions as ws')
      .where('ws.user_id', user.id)
      .whereIn('ws.status', ['completed', 'active', 'paused'])
      .select(
        'ws.id',
        'ws.name',
        'ws.status',
        'ws.workout_date',
        'ws.source',
        'ws.data_quality',
        'ws.date_confidence',
        'ws.started_at',
        'ws.completed_at',
        'ws.paused_seconds'
      )
      .select(
        db.raw(
          `(SELECT COUNT(DISTINCT wse.id) FROM workout_session_exercises wse JOIN workout_sets s ON s.session_exercise_id = wse.id WHERE wse.session_id = ws.id)::int as exercises`
        ),
        db.raw(
          `(SELECT COUNT(*) FROM workout_session_exercises wse JOIN workout_sets s ON s.session_exercise_id = wse.id WHERE wse.session_id = ws.id)::int as sets`
        ),
        db.raw(
          `(SELECT COALESCE(SUM(s.repetitions), 0) FROM workout_session_exercises wse JOIN workout_sets s ON s.session_exercise_id = wse.id WHERE wse.session_id = ws.id)::int as reps`
        ),
        db.raw(
          `(SELECT COALESCE(SUM(${VOLUME_LB_SQL}), 0) FROM workout_session_exercises wse JOIN exercises e ON e.id = wse.exercise_id JOIN workout_sets s ON s.session_exercise_id = wse.id WHERE wse.session_id = ws.id)::float as volume_lb`
        ),
        db.raw(
          `(SELECT COUNT(*) FROM workout_session_exercises wse JOIN workout_sets s ON s.session_exercise_id = wse.id WHERE wse.session_id = ws.id AND (s.weight_value IS NULL OR s.repetitions IS NULL))::int as incomplete_sets`
        ),
        db.raw(
          `(SELECT string_agg(e.name, ' · ' ORDER BY wse.order_index) FROM workout_session_exercises wse JOIN exercises e ON e.id = wse.exercise_id WHERE wse.session_id = ws.id AND EXISTS (SELECT 1 FROM workout_sets s WHERE s.session_exercise_id = wse.id)) as exercise_names`
        )
      )
      .orderBy('ws.workout_date', 'desc')
      .orderBy('ws.id', 'desc')

    if (filters.from) query.where('ws.workout_date', '>=', filters.from)
    if (filters.to) query.where('ws.workout_date', '<=', filters.to)
    if (filters.exerciseId) {
      query.whereExists((q) =>
        q
          .from('workout_session_exercises as f')
          .whereColumn('f.session_id', 'ws.id')
          .where('f.exercise_id', filters.exerciseId!)
      )
    }
    if (filters.muscle) {
      query.whereExists((q) =>
        q
          .from('workout_session_exercises as f')
          .join('exercise_muscle_groups as emg', 'emg.exercise_id', 'f.exercise_id')
          .join('muscle_groups as mg', 'mg.id', 'emg.muscle_group_id')
          .whereColumn('f.session_id', 'ws.id')
          .where('mg.slug', filters.muscle!)
      )
    }

    const page = await query.paginate(filters.page ?? 1, perPage)
    return {
      unit: preferences.weightUnit,
      meta: page.getMeta(),
      data: page.all().map((r: any) => ({
        id: r.id as number,
        name: r.name as string,
        status: r.status as string,
        workoutDate: String(r.workout_date),
        source: r.source as string,
        dataQuality: r.data_quality as string,
        dateConfidence: r.date_confidence as string,
        exercises: r.exercises as number,
        exerciseNames: (r.exercise_names as string | null) ?? '',
        sets: r.sets as number,
        reps: r.reps as number,
        volume: this.#fromLb(r.volume_lb, preferences.weightUnit),
        incompleteSets: r.incomplete_sets as number,
      })),
    }
  }

  /**
   * One point per session for an exercise: top working set, reps, load
   * volume and an e1RM when it makes sense. Per basis, never mixed.
   */
  async exerciseTrend(user: User, exerciseId: number) {
    const preferences = await PreferencesService.for(user)
    const unit = preferences.weightUnit
    const rows = await db
      .from('workout_sets as s')
      .join('workout_session_exercises as wse', 'wse.id', 's.session_exercise_id')
      .join('workout_sessions as ws', 'ws.id', 'wse.session_id')
      .join('exercises as e', 'e.id', 'wse.exercise_id')
      .where('ws.user_id', user.id)
      .where('ws.status', 'completed')
      .where('wse.exercise_id', exerciseId)
      .whereNot('s.set_type', 'warmup')
      .whereNotNull('s.weight_lb')
      .whereNotNull('s.repetitions')
      .select(
        'ws.id as session_id',
        'ws.workout_date',
        's.weight_basis',
        's.repetitions',
        'e.supports_e1rm'
      )
      .select(db.raw(`${LOAD_LB_SQL} as load_lb`))
      .orderBy('ws.workout_date')
      .orderBy('ws.id')

    type Point = {
      sessionId: number
      date: string
      basis: string
      topLoad: number
      topReps: number
      reps: number
      volume: number
      e1rm: number | null
    }
    const points = new Map<string, Point>()
    for (const r of rows as any[]) {
      const key = `${r.session_id}:${r.weight_basis}`
      const load = convertWeight(Number(r.load_lb), 'lb', unit)
      const point = points.get(key) ?? {
        sessionId: r.session_id,
        date: String(r.workout_date),
        basis: r.weight_basis,
        topLoad: 0,
        topReps: 0,
        reps: 0,
        volume: 0,
        e1rm: null,
      }
      if (load > point.topLoad || (load === point.topLoad && r.repetitions > point.topReps)) {
        point.topLoad = load
        point.topReps = r.repetitions
      }
      point.reps += r.repetitions
      point.volume += load * r.repetitions
      const e1rm =
        r.supports_e1rm && r.weight_basis !== 'unknown'
          ? estimateOneRepMax(load, r.repetitions)
          : null
      if (e1rm !== null && (point.e1rm === null || e1rm > point.e1rm)) point.e1rm = e1rm
      points.set(key, point)
    }
    return {
      unit,
      points: [...points.values()].map((p) => ({
        ...p,
        topLoad: round(p.topLoad, 1),
        volume: round(p.volume, 0),
        e1rm: p.e1rm === null ? null : round(p.e1rm, 1),
      })),
    }
  }

  async #lastSession(userId: number, unit: WeightUnit) {
    const row = await db
      .from('workout_sessions as ws')
      .leftJoin('workout_summaries as sm', 'sm.session_id', 'ws.id')
      .where('ws.user_id', userId)
      .where('ws.status', 'completed')
      .select(
        'ws.id',
        'ws.name',
        'ws.workout_date',
        'sm.volume_lb',
        'sm.sets_count',
        'sm.total_reps',
        'sm.exercises_completed',
        'sm.duration_seconds'
      )
      .orderBy('ws.workout_date', 'desc')
      .orderBy('ws.id', 'desc')
      .first()
    if (!row) return null
    return {
      id: row.id as number,
      name: row.name as string,
      workoutDate: String(row.workout_date),
      volume: row.volume_lb === null ? null : this.#fromLb(Number(row.volume_lb), unit),
      sets: row.sets_count as number | null,
      reps: row.total_reps as number | null,
      exercises: row.exercises_completed as number | null,
      durationSeconds: row.duration_seconds as number | null,
    }
  }

  /**
   * The routine done longest ago (never-used first) — a simple rotation.
   */
  async #suggestedRoutine(userId: number) {
    const row = await db
      .from('workout_templates as t')
      .where('t.user_id', userId)
      .whereNull('t.archived_at')
      .select('t.id', 't.name', 't.focus')
      .select(
        db.raw(
          `(SELECT MAX(ws.workout_date) FROM workout_sessions ws WHERE ws.template_id = t.id AND ws.status = 'completed')::text as last_done`
        ),
        db.raw(
          `(SELECT COUNT(*) FROM workout_template_exercises te WHERE te.template_id = t.id)::int as exercises`
        )
      )
      .orderByRaw('last_done ASC NULLS FIRST')
      .orderBy('t.position')
      .first()
    if (!row) return null
    return {
      id: row.id as number,
      name: row.name as string,
      focus: row.focus as string | null,
      lastDone: row.last_done as string | null,
      exercises: row.exercises as number,
    }
  }
}
