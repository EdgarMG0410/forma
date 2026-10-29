import { createHash } from 'node:crypto'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { errors as vineErrors } from '@vinejs/vine'
import { DateTime } from 'luxon'
import BodyMeasurement from '#models/body_measurement'
import Exercise from '#models/exercise'
import ImportBatch from '#models/import_batch'
import ImportRecord from '#models/import_record'
import MuscleGroup from '#models/muscle_group'
import type User from '#models/user'
import WorkoutSession from '#models/workout_session'
import WorkoutSessionExercise from '#models/workout_session_exercise'
import WorkoutSet from '#models/workout_set'
import DomainException from '#exceptions/domain_exception'
import {
  BODY_SITES,
  type ConfidenceLevel,
  type ImportAction,
  type ImportEntity,
  type WeightUnit,
} from '#domain/enums'
import { normalizeWeight } from '#domain/units'
import ExerciseCatalogService from '#services/exercise_catalog_service'
import PreferencesService from '#services/preferences_service'
import RecordsService from '#services/records_service'
import WorkoutSummaryService from '#services/workout_summary_service'
import {
  importFileValidator,
  type ImportExercise,
  type ImportFile,
  type ImportSession,
} from '#services/import/schema'

/**
 * Exercise name in the file → exercise in the catalog. `create` means a
 * custom exercise is created for the user from the file's definition.
 */
export type ExerciseMapping = Record<string, { exerciseId: number } | { create: true }>

export type ImportPreview = {
  batchId: number | null
  fileHash: string
  sessions: Array<{
    externalId: string | null
    name: string
    date: string
    dateConfidence: ConfidenceLevel
    status: 'completed' | 'partial'
    exercises: number
    sets: number
    reps: number
    action: 'create' | 'update' | 'skip'
    warnings: string[]
  }>
  exercises: Array<{
    key: string
    label: string
    resolvedId: number | null
    resolvedName: string | null
    canCreate: boolean
    sets: number
  }>
  bodyMeasurements: number
  totals: { sessions: number; sets: number; reps: number; volumeByUnit: Record<string, number> }
  errors: string[]
}

export type ImportResult = {
  batchId: number
  dryRun: boolean
  counts: Record<ImportEntity, Record<ImportAction, number>>
  errors: string[]
}

class DryRunRollback extends Error {}

const emptyCounts = (): ImportResult['counts'] => {
  const row = () => ({ created: 0, updated: 0, skipped: 0, failed: 0 })
  return {
    exercise: row(),
    session: row(),
    session_exercise: row(),
    set: row(),
    body_measurement: row(),
  }
}

/**
 * Imports the versioned Forma history JSON. Idempotent by `external_id`
 * (re-running the same file updates in place), keeps provenance on every
 * row, never invents values and never overwrites a set the user corrected.
 * A dry run executes everything inside a transaction and rolls it back.
 */
export default class WorkoutImportService {
  static hash(raw: string) {
    return createHash('sha256').update(raw).digest('hex')
  }

  async parse(raw: string): Promise<ImportFile> {
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      throw new DomainException('El archivo no es JSON válido.')
    }
    try {
      return await importFileValidator.validate(json)
    } catch (error) {
      if (error instanceof vineErrors.E_VALIDATION_ERROR) {
        const messages = (error.messages as Array<{ field: string; message: string }>).slice(0, 8)
        throw new DomainException(
          `Esquema inválido: ${messages.map((m) => `${m.field}: ${m.message}`).join('; ')}`
        )
      }
      throw error
    }
  }

  /**
   * What would happen, without writing anything.
   */
  async preview(
    user: User,
    file: ImportFile,
    fileHash: string,
    mapping: ExerciseMapping = {}
  ): Promise<ImportPreview> {
    const catalog = new ExerciseCatalogService()
    const definitions = new Map((file.exercises ?? []).map((e) => [e.slug, e]))
    const exerciseStats = new Map<
      string,
      { label: string; sets: number; slug?: string; name?: string }
    >()
    const errors: string[] = []
    const volumeByUnit: Record<string, number> = {}

    const sessions: ImportPreview['sessions'] = []
    for (const session of file.sessions) {
      const warnings: string[] = []
      let sets = 0
      let reps = 0
      for (const item of session.exercises) {
        const key = this.#exerciseKey(item)
        if (!key) {
          errors.push(
            `${session.date} ${session.name}: un ejercicio no tiene "exercise" ni "exercise_name".`
          )
          continue
        }
        const stat = exerciseStats.get(key) ?? {
          label: item.exercise_name ?? item.exercise ?? key,
          sets: 0,
          slug: item.exercise,
          name: item.exercise_name,
        }
        stat.sets += item.sets.length
        exerciseStats.set(key, stat)
        for (const set of item.sets) {
          sets += 1
          reps += set.reps ?? 0
          if (
            set.weight === null ||
            set.weight === undefined ||
            set.reps === null ||
            set.reps === undefined
          ) {
            warnings.push('Hay series sin peso o reps (se guardan como desconocidas).')
          }
          const unit = set.unit ?? file.unit_default ?? null
          if (set.weight !== null && set.weight !== undefined && !unit)
            warnings.push('Hay pesos sin unidad.')
          if (
            set.weight !== null &&
            set.weight !== undefined &&
            set.reps !== null &&
            set.reps !== undefined &&
            unit
          ) {
            volumeByUnit[unit] = (volumeByUnit[unit] ?? 0) + set.weight * set.reps
          }
        }
      }
      const existing = session.external_id
        ? await WorkoutSession.query()
            .where('user_id', user.id)
            .where('external_id', session.external_id)
            .first()
        : null
      sessions.push({
        externalId: session.external_id ?? null,
        name: session.name,
        date: session.date,
        dateConfidence: session.date_confidence ?? 'exact',
        status: session.status ?? 'completed',
        exercises: session.exercises.length,
        sets,
        reps,
        action: existing ? 'update' : 'create',
        warnings: [...new Set(warnings)],
      })
      if (!session.external_id) {
        const duplicate = await WorkoutSession.query()
          .where('user_id', user.id)
          .where('workout_date', session.date)
          .where('name', session.name)
          .first()
        if (duplicate) {
          sessions[sessions.length - 1].action = 'skip'
          sessions[sessions.length - 1].warnings.push(
            'Ya existe una sesión con el mismo nombre y fecha; agrega external_id para actualizarla.'
          )
        }
      }
    }

    const exercises: ImportPreview['exercises'] = []
    for (const [key, stat] of exerciseStats) {
      const mapped = mapping[key]
      let resolved: Exercise | null = null
      if (mapped && 'exerciseId' in mapped) {
        resolved = await Exercise.query()
          .where('id', mapped.exerciseId)
          .withScopes((s) => s.visibleTo(user.id))
          .first()
      } else if (!mapped) {
        resolved = await catalog.resolve(user.id, { slug: stat.slug, name: stat.name })
      }
      exercises.push({
        key,
        label: stat.label,
        resolvedId: resolved?.id ?? null,
        resolvedName: resolved?.name ?? null,
        canCreate: !!(stat.slug && definitions.has(stat.slug)) || !!stat.name || !!stat.slug,
        sets: stat.sets,
      })
    }

    return {
      batchId: null,
      fileHash,
      sessions,
      exercises,
      bodyMeasurements: file.body_measurements?.length ?? 0,
      totals: {
        sessions: sessions.length,
        sets: sessions.reduce((s, x) => s + x.sets, 0),
        reps: sessions.reduce((s, x) => s + x.reps, 0),
        volumeByUnit,
      },
      errors,
    }
  }

  async run(
    user: User,
    file: ImportFile,
    options: {
      sourceName: string
      fileHash: string
      dryRun?: boolean
      mapping?: ExerciseMapping
      createMissing?: boolean
    }
  ): Promise<ImportResult> {
    const counts = emptyCounts()
    const errors: string[] = []
    const preferences = await PreferencesService.for(user)
    const touchedExercises = new Set<number>()
    const completedSessions: number[] = []

    const batch = await ImportBatch.create({
      userId: user.id,
      sourceName: options.sourceName.slice(0, 255),
      schemaVersion: String(file.version),
      fileHash: options.fileHash,
      status: 'importing',
      dryRun: !!options.dryRun,
      mappings: options.mapping ?? {},
    })

    try {
      await db.transaction(async (trx) => {
        const log = async (
          entity: ImportEntity,
          action: ImportAction,
          data: {
            entityId?: number | null
            externalId?: string | null
            confidence?: ConfidenceLevel
            previous?: unknown
            message?: string
          }
        ) => {
          counts[entity][action] += 1
          await ImportRecord.create(
            {
              batchId: batch.id,
              entityType: entity,
              entityId: data.entityId ?? null,
              externalId: data.externalId ?? null,
              action,
              confidence: data.confidence ?? 'unknown',
              previous: data.previous ?? null,
              message: data.message ?? null,
            },
            { client: trx }
          )
        }

        const resolver = new ExerciseCatalogService(trx)
        const definitions = new Map((file.exercises ?? []).map((e) => [e.slug, e]))
        const exerciseCache = new Map<string, Exercise | null>()

        const resolveExercise = async (item: ImportSession['exercises'][number]) => {
          const key = this.#exerciseKey(item)
          if (!key) return null
          if (exerciseCache.has(key)) return exerciseCache.get(key)!
          const mapped = options.mapping?.[key]
          let exercise: Exercise | null = null
          if (mapped && 'exerciseId' in mapped) {
            exercise = await Exercise.query({ client: trx })
              .where('id', mapped.exerciseId)
              .withScopes((s) => s.visibleTo(user.id))
              .first()
          } else if (!mapped) {
            exercise = await resolver.resolve(user.id, {
              slug: item.exercise,
              name: item.exercise_name,
            })
          }
          if (!exercise && (options.createMissing || (mapped && 'create' in mapped))) {
            const definition = item.exercise ? definitions.get(item.exercise) : undefined
            exercise = await this.#createExercise(
              user,
              trx,
              definition,
              item.exercise_name ?? item.exercise ?? key
            )
            await log('exercise', 'created', {
              entityId: exercise.id,
              externalId: exercise.slug,
              confidence: definition ? 'high' : 'low',
            })
          }
          exerciseCache.set(key, exercise)
          return exercise
        }

        for (const session of file.sessions) {
          await this.#importSession(
            user,
            trx,
            session,
            file.unit_default ?? null,
            batch.id,
            resolveExercise,
            log,
            errors,
            touchedExercises,
            completedSessions
          )
        }

        for (const entry of file.body_measurements ?? []) {
          const values = {
            measuredOn: DateTime.fromISO(entry.date),
            bodyWeight: entry.body_weight ?? null,
            bodyWeightUnit:
              entry.body_weight === null || entry.body_weight === undefined
                ? null
                : (entry.body_weight_unit ?? file.unit_default ?? preferences.weightUnit),
            bodyFatPct: entry.body_fat_pct ?? null,
            lengthUnit: entry.length_unit ?? preferences.lengthUnit,
            notes: entry.notes ?? null,
            ...Object.fromEntries(
              BODY_SITES.map((site) => [site, (entry as Record<string, unknown>)[site] ?? null])
            ),
          }
          const existing = entry.external_id
            ? await BodyMeasurement.query({ client: trx })
                .where('user_id', user.id)
                .where('external_id', entry.external_id)
                .first()
            : null
          if (existing) {
            const previous = this.#snapshot(existing)
            existing.merge(values as any)
            await existing.useTransaction(trx).save()
            await log('body_measurement', 'updated', {
              entityId: existing.id,
              externalId: entry.external_id,
              previous,
            })
          } else {
            const created = await BodyMeasurement.create(
              {
                ...(values as any),
                userId: user.id,
                source: 'import',
                externalId: entry.external_id ?? null,
                importBatchId: batch.id,
              },
              { client: trx }
            )
            await log('body_measurement', 'created', {
              entityId: created.id,
              externalId: entry.external_id,
            })
          }
        }

        // a dry run does everything for real, then throws to roll it all back
        if (options.dryRun) throw new DryRunRollback()
      })
    } catch (error) {
      if (!(error instanceof DryRunRollback)) {
        batch.merge({
          status: 'failed',
          errors: [...errors, (error as Error).message],
          stats: counts,
          completedAt: DateTime.now(),
        })
        await batch.save()
        throw error
      }
    }

    // derived data (summaries, records) is rebuilt only for a real import
    if (!options.dryRun) {
      const summaries = new WorkoutSummaryService()
      for (const id of completedSessions) await summaries.generate(user, id)
      await new RecordsService().recompute(user.id, [...touchedExercises], preferences.weightUnit)
    }

    batch.merge({
      status: options.dryRun ? 'previewed' : 'imported',
      stats: counts,
      errors,
      completedAt: DateTime.now(),
    })
    await batch.save()
    return { batchId: batch.id, dryRun: !!options.dryRun, counts, errors }
  }

  /**
   * Undoes a batch: deletes what it created, restores what it updated.
   * Rows created by the batch but corrected by the user afterwards are kept
   * (they are the user's data now) and reported.
   */
  async revert(user: User, batchId: number) {
    const batch = await ImportBatch.query().where('id', batchId).where('user_id', user.id).first()
    if (!batch) throw new DomainException('Lote no encontrado.')
    if (batch.status !== 'imported')
      throw new DomainException('Solo se puede revertir un lote importado.')

    const kept: string[] = []
    const touchedExercises = new Set<number>()
    await db.transaction(async (trx) => {
      const records = await ImportRecord.query({ client: trx })
        .where('batch_id', batch.id)
        .orderBy('id', 'desc')
      for (const record of records) {
        if (record.entityId === null) continue
        if (record.entityType === 'set') {
          const set = await WorkoutSet.query({ client: trx })
            .where('id', record.entityId)
            .where('user_id', user.id)
            .first()
          if (!set) continue
          if (set.userCorrected) {
            kept.push(`Serie ${set.id} (corregida por ti)`)
            continue
          }
          if (record.action === 'created') await set.useTransaction(trx).delete()
          else if (record.action === 'updated' && record.previous) {
            set.merge(this.#restorable(record.previous, WorkoutSet.$columns))
            await set.useTransaction(trx).save()
          }
        } else if (record.entityType === 'session') {
          const session = await WorkoutSession.query({ client: trx })
            .where('id', record.entityId)
            .where('user_id', user.id)
            .preload('exercises')
            .first()
          if (!session) continue
          session.exercises.forEach((e) => touchedExercises.add(e.exerciseId))
          if (record.action === 'created') {
            const remaining = await trx
              .from('workout_sets as s')
              .join('workout_session_exercises as wse', 'wse.id', 's.session_exercise_id')
              .where('wse.session_id', session.id)
              .count('* as total')
              .first()
            if (Number(remaining?.total ?? 0) > 0) {
              kept.push(
                `Sesión «${session.name}» (${session.workoutDate.toISODate()}) conserva series corregidas`
              )
              continue
            }
            await session.useTransaction(trx).delete()
          } else if (record.action === 'updated' && record.previous) {
            session.merge(this.#restorable(record.previous, WorkoutSession.$columns))
            await session.useTransaction(trx).save()
          }
        } else if (record.entityType === 'session_exercise' && record.action === 'created') {
          const se = await WorkoutSessionExercise.query({ client: trx })
            .where('id', record.entityId)
            .whereHas('session', (q) => q.where('user_id', user.id))
            .first()
          if (!se) continue
          const remaining = await trx
            .from('workout_sets')
            .where('session_exercise_id', se.id)
            .count('* as total')
            .first()
          if (Number(remaining?.total ?? 0) === 0) await se.useTransaction(trx).delete()
        } else if (record.entityType === 'body_measurement') {
          const m = await BodyMeasurement.query({ client: trx })
            .where('id', record.entityId)
            .where('user_id', user.id)
            .first()
          if (!m) continue
          if (record.action === 'created') await m.useTransaction(trx).delete()
          else if (record.action === 'updated' && record.previous) {
            m.merge(this.#restorable(record.previous, BodyMeasurement.$columns))
            await m.useTransaction(trx).save()
          }
        } else if (record.entityType === 'exercise' && record.action === 'created') {
          const inUse = await trx
            .from('workout_session_exercises')
            .where('exercise_id', record.entityId)
            .first()
          const inTemplates = await trx
            .from('workout_template_exercises')
            .where('exercise_id', record.entityId)
            .first()
          if (!inUse && !inTemplates) {
            await trx
              .from('exercises')
              .where('id', record.entityId)
              .where('user_id', user.id)
              .delete()
          }
        }
      }
      batch.merge({
        status: 'reverted',
        revertedAt: DateTime.now(),
        errors: [...(batch.errors ?? []), ...kept.map((k) => `Conservado: ${k}`)],
      })
      await batch.useTransaction(trx).save()
    })

    const preferences = await PreferencesService.for(user)
    await new RecordsService().recompute(user.id, [...touchedExercises], preferences.weightUnit)
    return { kept }
  }

  // ── internals ────────────────────────────────────────────────────────

  #exerciseKey(item: { exercise?: string; exercise_name?: string }) {
    if (item.exercise) return `slug:${item.exercise}`
    if (item.exercise_name) return `name:${ExerciseCatalogService.normalize(item.exercise_name)}`
    return null
  }

  #snapshot(model: { $attributes: Record<string, unknown> }) {
    return JSON.parse(JSON.stringify(model.$attributes)) as Record<string, unknown>
  }

  /**
   * Only plain columns from a snapshot go back into a model.
   */
  #restorable(previous: Record<string, unknown>, columns: readonly string[]) {
    const out: Record<string, unknown> = {}
    for (const column of columns) {
      if (['id', 'createdAt', 'updatedAt', 'userId'].includes(column)) continue
      if (column in previous) out[column] = previous[column]
    }
    for (const key of ['workoutDate', 'measuredOn']) {
      if (typeof out[key] === 'string') out[key] = DateTime.fromISO(out[key] as string)
    }
    for (const key of ['startedAt', 'completedAt', 'pausedAt']) {
      if (typeof out[key] === 'string') out[key] = DateTime.fromISO(out[key] as string)
    }
    return out
  }

  async #createExercise(
    user: User,
    trx: TransactionClientContract,
    definition: ImportExercise | undefined,
    label: string
  ) {
    const baseSlug = definition?.slug ?? ExerciseCatalogService.slugify(label)
    let slug = baseSlug
    for (
      let i = 2;
      await trx.from('exercises').where('user_id', user.id).where('slug', slug).first();
      i++
    )
      slug = `${baseSlug}-${i}`
    const exercise = await Exercise.create(
      {
        userId: user.id,
        slug,
        name: definition?.name ?? label,
        equipment: definition?.equipment ?? 'other',
        exerciseType: definition?.exercise_type ?? 'compound',
        defaultWeightBasis: definition?.weight_basis ?? 'unknown',
        perHandMultiplier: definition?.per_hand_multiplier ?? null,
      },
      { client: trx }
    )
    await exercise.refresh()
    const muscles = await MuscleGroup.query({ client: trx }).whereIn('slug', [
      ...(definition?.primary_muscles ?? []),
      ...(definition?.secondary_muscles ?? []),
    ])
    const pivot: Record<number, { role: string }> = {}
    for (const m of muscles) {
      pivot[m.id] = {
        role: definition?.primary_muscles?.includes(m.slug) ? 'primary' : 'secondary',
      }
    }
    if (Object.keys(pivot).length)
      await exercise.useTransaction(trx).related('muscleGroups').sync(pivot)
    const now = new Date()
    for (const alias of new Set([exercise.name, label, ...(definition?.aliases ?? [])])) {
      await trx.rawQuery(
        `INSERT INTO exercise_aliases (exercise_id, user_id, alias, normalized_alias, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT ((COALESCE(user_id, 0)), normalized_alias) DO NOTHING`,
        [exercise.id, user.id, alias, ExerciseCatalogService.normalize(alias), now, now]
      )
    }
    return exercise
  }

  async #importSession(
    user: User,
    trx: TransactionClientContract,
    input: ImportSession,
    unitDefault: WeightUnit | null,
    batchId: number,
    resolveExercise: (item: ImportSession['exercises'][number]) => Promise<Exercise | null>,
    log: (entity: ImportEntity, action: ImportAction, data: any) => Promise<void>,
    errors: string[],
    touchedExercises: Set<number>,
    completedSessions: number[]
  ) {
    const label = `${input.date} «${input.name}»`
    const dateConfidence = input.date_confidence ?? 'exact'
    const partial = input.status === 'partial'
    const hasUnknowns = input.exercises.some((e) =>
      e.sets.some(
        (s) =>
          s.weight === null || s.weight === undefined || s.reps === null || s.reps === undefined
      )
    )
    const header = {
      name: input.name,
      workoutDate: DateTime.fromISO(input.date),
      dateConfidence,
      startedAt: input.started_at ? DateTime.fromISO(input.started_at) : null,
      completedAt: input.completed_at ? DateTime.fromISO(input.completed_at) : null,
      notes: input.notes ?? null,
      dataQuality: partial
        ? ('partial' as const)
        : hasUnknowns
          ? ('incomplete' as const)
          : ('complete' as const),
    }

    let session: WorkoutSession | null = null
    if (input.external_id) {
      session = await WorkoutSession.query({ client: trx })
        .where('user_id', user.id)
        .where('external_id', input.external_id)
        .forUpdate()
        .first()
    } else {
      const duplicate = await WorkoutSession.query({ client: trx })
        .where('user_id', user.id)
        .where('workout_date', input.date)
        .where('name', input.name)
        .first()
      if (duplicate) {
        await log('session', 'skipped', {
          entityId: duplicate.id,
          message: `${label}: duplicada (sin external_id)`,
          confidence: dateConfidence,
        })
        return
      }
    }

    if (session) {
      if (session.isLive) {
        errors.push(`${label}: hay una sesión en curso con ese external_id; se omitió.`)
        await log('session', 'skipped', {
          entityId: session.id,
          externalId: input.external_id,
          message: 'sesión en curso',
        })
        return
      }
      const previous = this.#snapshot(session)
      session.merge(header)
      await session.useTransaction(trx).save()
      await log('session', 'updated', {
        entityId: session.id,
        externalId: input.external_id,
        previous,
        confidence: dateConfidence,
      })
    } else {
      session = await WorkoutSession.create(
        {
          ...header,
          userId: user.id,
          status: 'completed',
          source: 'import',
          externalId: input.external_id ?? null,
          importBatchId: batchId,
        },
        { client: trx }
      )
      await log('session', 'created', {
        entityId: session.id,
        externalId: input.external_id,
        confidence: dateConfidence,
      })
    }

    for (const [index, item] of input.exercises.entries()) {
      const exercise = await resolveExercise(item)
      if (!exercise) {
        errors.push(
          `${label}: no se encontró el ejercicio «${item.exercise_name ?? item.exercise}». Asígnalo en la vista previa o usa --create-missing.`
        )
        await log('session_exercise', 'failed', {
          externalId: item.external_id,
          message: `ejercicio sin resolver: ${item.exercise_name ?? item.exercise}`,
        })
        for (const set of item.sets)
          await log('set', 'failed', {
            externalId: set.external_id,
            message: 'ejercicio sin resolver',
          })
        continue
      }
      touchedExercises.add(exercise.id)

      // match by external id, else by position — so a re-import updates rather than appends
      const seExternal = item.external_id ?? null
      let se = seExternal
        ? await WorkoutSessionExercise.query({ client: trx })
            .where('session_id', session.id)
            .where('external_id', seExternal)
            .first()
        : await WorkoutSessionExercise.query({ client: trx })
            .where('session_id', session.id)
            .where('order_index', item.order ?? index)
            .where('exercise_id', exercise.id)
            .first()
      const seValues = {
        exerciseId: exercise.id,
        orderIndex: item.order ?? index,
        targetSets: Math.max(
          1,
          item.sets.filter((s) => (s.set_type ?? 'working') !== 'warmup').length
        ),
        targetRepsMin: item.target_reps_min ?? 8,
        targetRepsMax: Math.max(item.target_reps_max ?? 12, item.target_reps_min ?? 8),
        notes: item.notes ?? null,
        status: item.sets.length ? ('completed' as const) : ('skipped' as const),
      }
      if (se) {
        se.merge(seValues)
        await se.useTransaction(trx).save()
        await log('session_exercise', 'updated', { entityId: se.id, externalId: seExternal })
      } else {
        se = await WorkoutSessionExercise.create(
          { ...seValues, sessionId: session.id, externalId: seExternal },
          { client: trx }
        )
        await log('session_exercise', 'created', { entityId: se.id, externalId: seExternal })
      }

      for (const [setIndex, row] of item.sets.entries()) {
        const setNumber = row.set_number ?? setIndex + 1
        const unit =
          row.weight === null || row.weight === undefined ? null : (row.unit ?? unitDefault)
        if (row.weight !== null && row.weight !== undefined && !unit) {
          errors.push(
            `${label} ${exercise.name} serie ${setNumber}: peso sin unidad; se guardó sin peso.`
          )
        }
        const weightValue = unit ? row.weight! : null
        const values = {
          setNumber,
          setType: row.set_type ?? 'working',
          weightValue,
          weightUnit: unit,
          weightBasis:
            row.weight_basis ??
            (exercise.defaultWeightBasis === 'unknown' ? 'unknown' : exercise.defaultWeightBasis),
          ...normalizeWeight(weightValue, unit),
          repetitions: row.reps ?? null,
          rir: row.rir ?? null,
          rpe: row.rpe ?? null,
          notes: row.notes ?? null,
          confidence:
            row.confidence ?? (row.weight === null || row.reps === null ? 'unknown' : 'high'),
        }

        const existing = row.external_id
          ? await WorkoutSet.query({ client: trx })
              .where('session_exercise_id', se.id)
              .where('external_id', row.external_id)
              .first()
          : await WorkoutSet.query({ client: trx })
              .where('session_exercise_id', se.id)
              .where('set_number', setNumber)
              .first()
        if (existing?.userCorrected) {
          await log('set', 'skipped', {
            entityId: existing.id,
            externalId: row.external_id,
            message: 'corregida por el usuario; no se sobrescribe',
          })
          continue
        }
        if (existing) {
          const previous = this.#snapshot(existing)
          existing.merge(values)
          if (existing.$isDirty) {
            await existing.useTransaction(trx).save()
            await log('set', 'updated', {
              entityId: existing.id,
              externalId: row.external_id,
              previous,
              confidence: values.confidence,
            })
          } else {
            await log('set', 'skipped', {
              entityId: existing.id,
              externalId: row.external_id,
              message: 'sin cambios',
            })
          }
        } else {
          const created = await WorkoutSet.create(
            {
              ...values,
              sessionExerciseId: se.id,
              userId: user.id,
              source: 'import',
              externalId: row.external_id ?? null,
              importBatchId: batchId,
              completedAt: header.completedAt ?? null,
            },
            { client: trx }
          )
          await log('set', 'created', {
            entityId: created.id,
            externalId: row.external_id,
            confidence: values.confidence,
          })
        }
      }
    }
    completedSessions.push(session.id)
  }
}
