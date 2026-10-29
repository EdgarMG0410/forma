import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import app from '@adonisjs/core/services/app'
import db from '@adonisjs/lucid/services/db'
import BodyMeasurement from '#models/body_measurement'
import ImportBatch from '#models/import_batch'
import WorkoutSession from '#models/workout_session'
import WorkoutSet from '#models/workout_set'
import WorkoutImportService from '#services/import/workout_import_service'
import WorkoutLiveService from '#services/workout_live_service'
import WorkoutSummaryService from '#services/workout_summary_service'
import { createUser } from '#tests/helpers'
import type User from '#models/user'

async function importFixture(user: User, options: { dryRun?: boolean; path?: string } = {}) {
  const path = options.path ?? app.makePath('tests/fixtures/import_sample.json')
  const raw = await readFile(path, 'utf8')
  const service = new WorkoutImportService()
  const file = await service.parse(raw)
  return service.run(user, file, {
    sourceName: 'fixture.json',
    fileHash: WorkoutImportService.hash(raw),
    dryRun: options.dryRun,
    createMissing: true,
  })
}

const setCount = async (user: User) =>
  Number(
    (await WorkoutSet.query().where('user_id', user.id).count('* as c').firstOrFail()).$extras.c
  )

test.group('Import / history JSON', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('rejects files that do not match the schema', async ({ assert }) => {
    const service = new WorkoutImportService()
    await assert.rejects(
      () => service.parse('{"schema":"other","version":1,"sessions":[]}'),
      /Esquema inválido/
    )
    await assert.rejects(() => service.parse('not json'), 'El archivo no es JSON válido.')
  })

  test('imports sessions, resolves aliases and keeps unknowns as null', async ({ assert }) => {
    const user = await createUser()
    const result = await importFixture(user)
    assert.equal(result.counts.session.created, 2)
    assert.equal(result.counts.set.created, 6)
    assert.equal(result.counts.exercise.created, 1)
    assert.equal(result.counts.body_measurement.created, 1)

    const leg = await WorkoutSession.query()
      .where('user_id', user.id)
      .where('external_id', 'test-2026-10-20-pierna')
      .preload('exercises', (q) => q.preload('exercise').preload('sets'))
      .firstOrFail()
    assert.equal(leg.source, 'import')
    assert.equal(leg.status, 'completed')
    assert.equal(leg.dataQuality, 'incomplete')
    // "Prensa" resolved through the catalog alias, not duplicated
    assert.equal(leg.exercises[0].exercise.slug, 'leg-press')
    const unknown = leg.exercises[0].sets[2]
    assert.isNull(unknown.weightValue)
    assert.isNull(unknown.weightUnit)
    assert.equal(unknown.repetitions, 10)
    assert.equal(unknown.confidence, 'low')
    // unit_default fills a weight without an explicit unit
    assert.equal(leg.exercises[0].sets[1].weightUnit, 'lb')
    assert.equal(leg.exercises[1].sets[1].setType, 'warmup')

    const partial = await WorkoutSession.query()
      .where('user_id', user.id)
      .where('external_id', 'test-2026-10-22-parcial')
      .firstOrFail()
    assert.equal(partial.dataQuality, 'partial')
    assert.equal(partial.dateConfidence, 'medium')
    const bench = await WorkoutSet.query()
      .where('user_id', user.id)
      .where('external_id', 't3-1')
      .firstOrFail()
    assert.equal(bench.weightUnit, 'kg')
    assert.closeTo(bench.weightLb!, 132.277, 0.001)

    const summary = await new WorkoutSummaryService().toDTO(user, leg.id)
    // 400×12 + 400×11 + (unknown) + 100×15 + 50×20
    assert.equal(summary.volumeLb, 4800 + 4400 + 1500 + 1000)
    assert.isTrue(summary.observations.some((o) => o.includes('sin peso o repeticiones')))
  })

  test('re-importing the same file is idempotent', async ({ assert }) => {
    const user = await createUser()
    await importFixture(user)
    const before = await setCount(user)
    const again = await importFixture(user)
    assert.equal(again.counts.session.created, 0)
    assert.equal(again.counts.session.updated, 2)
    assert.equal(again.counts.set.created, 0)
    assert.equal(again.counts.exercise.created, 0)
    assert.equal(await setCount(user), before)
    assert.equal(
      await BodyMeasurement.query()
        .where('user_id', user.id)
        .count('* as c')
        .firstOrFail()
        .then((r) => Number(r.$extras.c)),
      1
    )
  })

  test('a dry run writes nothing but reports what would happen', async ({ assert }) => {
    const user = await createUser()
    const result = await importFixture(user, { dryRun: true })
    assert.equal(result.counts.session.created, 2)
    assert.equal(await setCount(user), 0)
    assert.equal((await ImportBatch.findOrFail(result.batchId)).status, 'previewed')
  })

  test('user corrections survive a re-import', async ({ assert }) => {
    const user = await createUser()
    await importFixture(user)
    const set = await WorkoutSet.query()
      .where('user_id', user.id)
      .where('external_id', 't1-1')
      .firstOrFail()
    await new WorkoutLiveService().updateSet(user, set.id, { weightValue: 410 })
    const again = await importFixture(user)
    assert.isAtLeast(again.counts.set.skipped, 1)
    await set.refresh()
    assert.equal(set.weightValue, 410)
  })

  test('reverting a batch removes only what it created', async ({ assert }) => {
    const user = await createUser()
    const other = await createUser()
    await importFixture(other)
    const result = await importFixture(user)
    await new WorkoutImportService().revert(user, result.batchId)
    assert.equal(await setCount(user), 0)
    assert.equal(
      await WorkoutSession.query()
        .where('user_id', user.id)
        .count('* as c')
        .firstOrFail()
        .then((r) => Number(r.$extras.c)),
      0
    )
    assert.equal(await setCount(other), 6)
    assert.equal((await ImportBatch.findOrFail(result.batchId)).status, 'reverted')
    // someone else's batch cannot be reverted
    const othersBatch = await ImportBatch.query().where('user_id', other.id).firstOrFail()
    await assert.rejects(() => new WorkoutImportService().revert(user, othersBatch.id))
  })

  test('historical integrity: imported weights are never altered by derived data', async ({
    assert,
  }) => {
    const user = await createUser()
    await importFixture(user)
    const rows = await db
      .from('workout_sets')
      .where('user_id', user.id)
      .whereNotNull('weight_value')
      .select('external_id', 'weight_value', 'weight_unit')
    const expected: Record<string, [number, string]> = {
      't1-1': [400, 'lb'],
      't1-2': [400, 'lb'],
      't2-1': [100, 'lb'],
      't2-2': [50, 'lb'],
      't3-1': [60, 'kg'],
    }
    for (const row of rows)
      assert.deepEqual([Number(row.weight_value), row.weight_unit], expected[row.external_id])
  })
})

/**
 * Acceptance test for the user's real history. It runs once
 * database/data/seed-workouts.json (the source of truth for the first
 * seed) is in place; until then it is skipped, never faked.
 */
test.group('Import / acceptance — leg session 2026-10-27', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  const seedPath = app.makePath('database/data/seed-workouts.json')

  test('6 exercises, 22 sets, 236 reps, 37,060 lb and the corrected sets', async ({ assert }) => {
    const user = await createUser()
    await importFixture(user, { path: seedPath })
    const session = await WorkoutSession.query()
      .where('user_id', user.id)
      .where('workout_date', '2026-10-27')
      .preload('exercises', (q) => q.preload('exercise').preload('sets'))
      .firstOrFail()
    const withSets = session.exercises.filter((e) => e.sets.length)
    const sets = withSets.flatMap((e) => e.sets)
    assert.equal(withSets.length, 6)
    assert.equal(sets.length, 22)
    assert.equal(
      sets.reduce((sum, s) => sum + (s.repetitions ?? 0), 0),
      236
    )

    const summary = await new WorkoutSummaryService().toDTO(user, session.id)
    assert.equal(summary.volumeLb, 37060)

    const press = withSets.find((e) => e.exercise.slug === 'leg-press')!
    assert.deepInclude(press.sets[0].$attributes, {
      weightValue: 430,
      weightUnit: 'lb',
      repetitions: 12,
    })
    const calf = withSets.find((e) => /pantorrilla|calf/i.test(e.exercise.name))!
    assert.deepInclude(calf.sets[2].$attributes, { weightValue: 120, repetitions: 9 })
    assert.deepInclude(calf.sets[3].$attributes, { weightValue: 110, repetitions: 8 })
  }).skip(!existsSync(seedPath), 'database/data/seed-workouts.json todavía no existe')
})
