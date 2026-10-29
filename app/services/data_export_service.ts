import { DateTime } from 'luxon'
import type User from '#models/user'
import BodyMeasurement from '#models/body_measurement'
import Exercise from '#models/exercise'
import WorkoutSession from '#models/workout_session'
import WorkoutTemplate from '#models/workout_template'
import { BODY_SITES } from '#domain/enums'
import { IMPORT_SCHEMA, IMPORT_SCHEMA_VERSION, type ImportFile } from '#services/import/schema'

/**
 * Everything a user owns, in the same versioned format the importer reads,
 * so an export can be re-imported (idempotently) into another account or
 * instance.
 */
export default class DataExportService {
  async export(user: User): Promise<ImportFile & { profile: object; routines: object[] }> {
    const [sessions, custom, measurements, routines] = await Promise.all([
      WorkoutSession.query()
        .where('user_id', user.id)
        .whereIn('status', ['completed', 'active', 'paused'])
        .preload('exercises', (q) => q.preload('exercise').preload('sets'))
        .orderBy('workout_date'),
      Exercise.query().where('user_id', user.id).preload('muscleGroups').preload('aliases'),
      BodyMeasurement.query().where('user_id', user.id).orderBy('measured_on'),
      WorkoutTemplate.query()
        .where('user_id', user.id)
        .whereNull('archived_at')
        .preload('exercises', (q) => q.preload('exercise').preload('sets')),
    ])

    return {
      schema: IMPORT_SCHEMA,
      version: IMPORT_SCHEMA_VERSION,
      exported_at: DateTime.now().toISO()!,
      profile: { full_name: user.fullName, email: user.email },
      exercises: custom.map((e) => ({
        slug: e.slug,
        name: e.name,
        equipment: e.equipment,
        exercise_type: e.exerciseType,
        weight_basis: e.defaultWeightBasis,
        per_hand_multiplier: e.perHandMultiplier,
        aliases: e.aliases.map((a) => a.alias),
        primary_muscles: e.muscleGroups
          .filter((m) => m.$extras.pivot_role === 'primary')
          .map((m) => m.slug),
        secondary_muscles: e.muscleGroups
          .filter((m) => m.$extras.pivot_role === 'secondary')
          .map((m) => m.slug),
      })),
      sessions: sessions.map((s) => ({
        external_id: s.externalId ?? `forma-session-${s.id}`,
        name: s.name,
        date: s.workoutDate.toISODate()!,
        date_confidence: s.dateConfidence,
        status: s.dataQuality === 'complete' ? 'completed' : 'partial',
        started_at: s.startedAt?.toISO() ?? null,
        completed_at: s.completedAt?.toISO() ?? null,
        notes: s.notes,
        exercises: s.exercises.map((se) => ({
          external_id: se.externalId ?? `forma-se-${se.id}`,
          exercise: se.exercise.slug,
          exercise_name: se.exercise.name,
          order: se.orderIndex,
          target_reps_min: se.targetRepsMin,
          target_reps_max: se.targetRepsMax,
          notes: se.notes,
          sets: se.sets.map((set) => ({
            external_id: set.externalId ?? `forma-set-${set.id}`,
            set_number: set.setNumber,
            set_type: set.setType,
            weight: set.weightValue,
            unit: set.weightUnit,
            weight_basis: set.weightBasis,
            reps: set.repetitions,
            rir: set.rir,
            rpe: set.rpe,
            confidence: set.confidence,
            notes: set.notes,
          })),
        })),
      })),
      body_measurements: measurements.map((m) => ({
        external_id: m.externalId ?? `forma-body-${m.id}`,
        date: m.measuredOn.toISODate()!,
        body_weight: m.bodyWeight,
        body_weight_unit: m.bodyWeightUnit,
        body_fat_pct: m.bodyFatPct,
        length_unit: m.lengthUnit,
        ...Object.fromEntries(BODY_SITES.map((site) => [site, m[site]])),
        notes: m.notes,
      })),
      routines: routines.map((r) => ({
        name: r.name,
        description: r.description,
        focus: r.focus,
        exercises: r.exercises.map((e) => ({
          exercise: e.exercise.slug,
          rest_seconds: e.restSeconds,
          sets: e.sets.map((s) => ({
            set_type: s.setType,
            reps_min: s.targetRepsMin,
            reps_max: s.targetRepsMax,
          })),
        })),
      })),
    }
  }
}
