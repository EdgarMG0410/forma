import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import WorkoutSession from '#models/workout_session'
import WorkoutSet from '#models/workout_set'
import WorkoutSetEdit from '#models/workout_set_edit'
import WorkoutSessionExercise from '#models/workout_session_exercise'
import WorkoutStateService from '#services/workout_state_service'
import WorkoutSummaryService from '#services/workout_summary_service'
import { createUser, liveSessionWith, rid } from '#tests/helpers'

test.group('Workout live / logging sets', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('logs a set with captured and normalised weight', async ({ assert }) => {
    const user = await createUser()
    const { sessionExercise, live } = await liveSessionWith(user)
    const { set, duplicate } = await live.logSet(user, sessionExercise.id, {
      clientRequestId: rid(),
      weightValue: 430,
      weightUnit: 'lb',
      repetitions: 12,
    })
    assert.isFalse(duplicate)
    assert.equal(set.setNumber, 1)
    assert.equal(set.weightValue, 430)
    assert.equal(set.weightUnit, 'lb')
    assert.equal(set.weightLb, 430)
    assert.closeTo(set.weightKg!, 195.0447, 0.0001)
    assert.equal(set.weightBasis, 'machine_display')
    await sessionExercise.refresh()
    assert.equal(sessionExercise.status, 'in_progress')
  })

  test('resubmitting the same request does not duplicate the set', async ({ assert }) => {
    const user = await createUser()
    const { sessionExercise, live } = await liveSessionWith(user)
    const key = rid()
    const first = await live.logSet(user, sessionExercise.id, {
      clientRequestId: key,
      weightValue: 430,
      weightUnit: 'lb',
      repetitions: 12,
    })
    const second = await live.logSet(user, sessionExercise.id, {
      clientRequestId: key,
      weightValue: 430,
      weightUnit: 'lb',
      repetitions: 12,
    })
    assert.isTrue(second.duplicate)
    assert.equal(second.set.id, first.set.id)
    const count = await WorkoutSet.query()
      .where('session_exercise_id', sessionExercise.id)
      .count('* as total')
      .firstOrFail()
    assert.equal(Number(count.$extras.total), 1)
  })

  test('next step and recommendation follow each logged set', async ({ assert }) => {
    const user = await createUser()
    const { session, sessionExercise, live } = await liveSessionWith(user, 'leg-press', 2)
    await live.logSet(user, sessionExercise.id, {
      clientRequestId: rid(),
      weightValue: 430,
      weightUnit: 'lb',
      repetitions: 12,
    })
    const state = await new WorkoutStateService().liveState(user, session.id)
    assert.deepEqual(state.next, {
      kind: 'set',
      sessionExerciseId: sessionExercise.id,
      setNumber: 2,
      totalSets: 2,
    })
    assert.equal(state.recommendation?.recommendedWeight, 430)
    assert.equal(state.totals.volume, 5160)

    await live.logSet(user, sessionExercise.id, {
      clientRequestId: rid(),
      weightValue: 430,
      weightUnit: 'lb',
      repetitions: 11,
    })
    const after = await new WorkoutStateService().liveState(user, session.id)
    assert.deepEqual(after.next, { kind: 'done' })
    assert.equal(after.progress.loggedSets, 2)
  })

  test('correcting a set keeps an audit trail and marks it user-corrected', async ({ assert }) => {
    const user = await createUser()
    const { sessionExercise, live } = await liveSessionWith(user)
    const { set } = await live.logSet(user, sessionExercise.id, {
      clientRequestId: rid(),
      weightValue: 510,
      weightUnit: 'lb',
      repetitions: 12,
    })
    const updated = await live.updateSet(user, set.id, { weightValue: 430 }, 'peso mal capturado')
    assert.equal(updated.weightValue, 430)
    assert.equal(updated.weightLb, 430)
    assert.isTrue(updated.userCorrected)
    const edit = await WorkoutSetEdit.query().where('set_id', set.id).firstOrFail()
    assert.equal(edit.action, 'update')
    assert.equal(edit.before.weightValue, 510)
    assert.equal(edit.after.weightValue, 430)
    assert.equal(edit.reason, 'peso mal capturado')
  })

  test('deleting a set renumbers the following ones', async ({ assert }) => {
    const user = await createUser()
    const { sessionExercise, live } = await liveSessionWith(user)
    const sets = []
    for (const reps of [12, 11, 10]) {
      sets.push(
        (
          await live.logSet(user, sessionExercise.id, {
            clientRequestId: rid(),
            weightValue: 100,
            weightUnit: 'lb',
            repetitions: reps,
          })
        ).set
      )
    }
    await live.deleteSet(user, sets[1].id)
    const remaining = await WorkoutSet.query()
      .where('session_exercise_id', sessionExercise.id)
      .orderBy('set_number')
    assert.deepEqual(
      remaining.map((s) => [s.setNumber, s.repetitions]),
      [
        [1, 12],
        [2, 10],
      ]
    )
    assert.equal(
      (await WorkoutSetEdit.query().where('set_id', sets[1].id).firstOrFail()).action,
      'delete'
    )
  })

  test('repeat logs the same numbers as the next set', async ({ assert }) => {
    const user = await createUser()
    const { sessionExercise, live } = await liveSessionWith(user)
    const { set } = await live.logSet(user, sessionExercise.id, {
      clientRequestId: rid(),
      weightValue: 120,
      weightUnit: 'lb',
      repetitions: 9,
    })
    const { set: copy } = await live.repeatSet(user, set.id, rid())
    assert.equal(copy.setNumber, 2)
    assert.equal(copy.weightValue, 120)
    assert.equal(copy.repetitions, 9)
  })
})

test.group('Workout live / session lifecycle', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('only one live session per user; starting again resumes it', async ({ assert }) => {
    const user = await createUser()
    const { session, live } = await liveSessionWith(user)
    const again = await live.start(user, { name: 'Otra' })
    assert.isTrue(again.resumed)
    assert.equal(again.session.id, session.id)

    // the database itself refuses a second live session
    await assert.rejects(() =>
      db.table('workout_sessions').insert({
        user_id: user.id,
        name: 'x',
        status: 'active',
        workout_date: '2026-10-28',
        created_at: new Date(),
      })
    )
  })

  test('pause and resume track paused time; logging resumes a paused session', async ({
    assert,
  }) => {
    const user = await createUser()
    const { session, sessionExercise, live } = await liveSessionWith(user)
    const paused = await live.pause(user, session.id)
    assert.equal(paused.status, 'paused')
    assert.isNotNull(paused.pausedAt)
    await assert.rejects(
      () => live.pause(user, session.id),
      'Solo se puede pausar una sesión activa.'
    )

    const resumed = await live.resume(user, session.id)
    assert.equal(resumed.status, 'active')
    assert.isNull(resumed.pausedAt)

    await live.pause(user, session.id)
    await live.logSet(user, sessionExercise.id, {
      clientRequestId: rid(),
      weightValue: 100,
      weightUnit: 'lb',
      repetitions: 10,
    })
    await session.refresh()
    assert.equal(session.status, 'active')
  })

  test('finishing requires sets, skips untouched exercises and builds the summary', async ({
    assert,
  }) => {
    const user = await createUser()
    const { session, sessionExercise, live } = await liveSessionWith(user)
    await assert.rejects(
      () => live.finish(user, session.id),
      'Registra al menos una serie o cancela la sesión.'
    )

    const calf = await live.addExercise(user, session.id, {
      exerciseId: (await import('#tests/helpers').then((h) => h.exercise('standing-calf-raise')))
        .id,
    })
    await live.logSet(user, sessionExercise.id, {
      clientRequestId: rid(),
      weightValue: 430,
      weightUnit: 'lb',
      repetitions: 12,
    })
    const finished = await live.finish(user, session.id, 'Buena sesión')
    assert.equal(finished.status, 'completed')
    assert.isNotNull(finished.completedAt)
    await calf.refresh()
    assert.equal(calf.status, 'skipped')

    const summary = await new WorkoutSummaryService().generate(user, session.id)
    assert.equal(summary.setsCount, 1)
    assert.equal(summary.totalReps, 12)
    assert.equal(summary.volumeLb, 5160)
    assert.closeTo(summary.volumeKg, 2340.54, 0.01)
    await assert.rejects(() =>
      live.logSet(user, sessionExercise.id, {
        clientRequestId: rid(),
        weightValue: 1,
        weightUnit: 'lb',
        repetitions: 1,
      })
    )
  })

  test('corrections after finishing regenerate summary and records', async ({ assert }) => {
    const user = await createUser()
    const { session, sessionExercise, live } = await liveSessionWith(user)
    const { set } = await live.logSet(user, sessionExercise.id, {
      clientRequestId: rid(),
      weightValue: 510,
      weightUnit: 'lb',
      repetitions: 12,
    })
    await live.finish(user, session.id)
    const summaries = new WorkoutSummaryService()
    await summaries.generate(user, session.id)

    await live.updateSet(user, set.id, { weightValue: 430 })
    const regenerated = await summaries.generate(user, session.id)
    assert.equal(regenerated.volumeLb, 5160)
    const record = await db
      .from('personal_records')
      .where('user_id', user.id)
      .where('record_type', 'max_weight')
      .firstOrFail()
    assert.equal(Number(record.value), 430)
  })

  test('cancelled sessions stay out of history comparisons', async ({ assert }) => {
    const user = await createUser()
    const { session, sessionExercise, live } = await liveSessionWith(user)
    await live.logSet(user, sessionExercise.id, {
      clientRequestId: rid(),
      weightValue: 100,
      weightUnit: 'lb',
      repetitions: 10,
    })
    await live.cancel(user, session.id)
    const reloaded = await WorkoutSession.findOrFail(session.id)
    assert.equal(reloaded.status, 'cancelled')
    const next = await liveSessionWith(user)
    const state = await new WorkoutStateService().liveState(user, next.session.id)
    assert.isNull(state.lastResult)
  })

  test('reorder and substitution respect logged sets', async ({ assert }) => {
    const user = await createUser()
    const { session, sessionExercise, live } = await liveSessionWith(user)
    const { exercise } = await import('#tests/helpers')
    const second = await live.addExercise(user, session.id, {
      exerciseId: (await exercise('leg-extension')).id,
    })
    await live.reorder(user, session.id, [second.id, sessionExercise.id])
    const ordered = await WorkoutSessionExercise.query()
      .where('session_id', session.id)
      .orderBy('order_index')
    assert.deepEqual(
      ordered.map((e) => e.id),
      [second.id, sessionExercise.id]
    )

    await live.updateExercise(user, second.id, {
      substituteExerciseId: (await exercise('hack-squat')).id,
    })
    await second.refresh()
    assert.equal(second.exerciseId, (await exercise('hack-squat')).id)

    await live.logSet(user, sessionExercise.id, {
      clientRequestId: rid(),
      weightValue: 100,
      weightUnit: 'lb',
      repetitions: 10,
    })
    const squat = await exercise('back-squat')
    await assert.rejects(() =>
      live.updateExercise(user, sessionExercise.id, { substituteExerciseId: squat.id })
    )
  })
})
