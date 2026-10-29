import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import WorkoutSet from '#models/workout_set'
import WorkoutLiveService from '#services/workout_live_service'
import WorkoutStateService from '#services/workout_state_service'
import { createUser, liveSessionWith, rid } from '#tests/helpers'

test.group('Authorization / services', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('a user cannot read or write another user’s workout', async ({ assert }) => {
    const owner = await createUser()
    const intruder = await createUser()
    const { session, sessionExercise, live } = await liveSessionWith(owner)
    const { set } = await live.logSet(owner, sessionExercise.id, {
      clientRequestId: rid(),
      weightValue: 100,
      weightUnit: 'lb',
      repetitions: 10,
    })

    const service = new WorkoutLiveService()
    await assert.rejects(
      () => new WorkoutStateService().liveState(intruder, session.id),
      'Sesión no encontrada.'
    )
    await assert.rejects(() =>
      service.logSet(intruder, sessionExercise.id, {
        clientRequestId: rid(),
        weightValue: 1,
        weightUnit: 'lb',
        repetitions: 1,
      })
    )
    await assert.rejects(
      () => service.updateSet(intruder, set.id, { weightValue: 1 }),
      'Serie no encontrada.'
    )
    await assert.rejects(() => service.deleteSet(intruder, set.id), 'Serie no encontrada.')
    await assert.rejects(() => service.pause(intruder, session.id), 'Sesión no encontrada.')
    await assert.rejects(() => service.finish(intruder, session.id))

    await set.refresh()
    assert.equal(set.weightValue, 100)
  })

  test('replaying another user’s request id does not leak their set', async ({ assert }) => {
    const owner = await createUser()
    const intruder = await createUser()
    const { sessionExercise, live } = await liveSessionWith(owner)
    const key = rid()
    await live.logSet(owner, sessionExercise.id, {
      clientRequestId: key,
      weightValue: 100,
      weightUnit: 'lb',
      repetitions: 10,
    })
    const other = await liveSessionWith(intruder)
    // the key is globally unique, so the intruder's attempt fails instead of returning the owner's set
    await assert.rejects(() =>
      other.live.logSet(intruder, other.sessionExercise.id, {
        clientRequestId: key,
        weightValue: 1,
        weightUnit: 'lb',
        repetitions: 1,
      })
    )
    assert.equal(
      await WorkoutSet.query()
        .where('user_id', intruder.id)
        .count('* as c')
        .firstOrFail()
        .then((r) => Number(r.$extras.c)),
      0
    )
  })
})

test.group('Authorization / HTTP', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('guests are redirected to login', async ({ client }) => {
    const response = await client.get('/').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('IDOR: another user’s session, summary and sets answer 404', async ({ client }) => {
    const owner = await createUser()
    const intruder = await createUser()
    const { session, sessionExercise, live } = await liveSessionWith(owner)
    const { set } = await live.logSet(owner, sessionExercise.id, {
      clientRequestId: rid(),
      weightValue: 100,
      weightUnit: 'lb',
      repetitions: 10,
    })

    const show = await client.get(`/workouts/${session.id}`).loginAs(intruder).withInertia()
    show.assertStatus(404)

    const patch = await client
      .patch(`/sets/${set.id}`)
      .loginAs(intruder)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ weightValue: 1 })
    patch.assertStatus(404)

    const del = await client
      .delete(`/sets/${set.id}`)
      .loginAs(intruder)
      .withCsrfToken()
      .header('accept', 'application/json')
    del.assertStatus(404)
  })

  test('the owner can log a set over HTTP, idempotently', async ({ client, assert }) => {
    const owner = await createUser()
    const { session, sessionExercise } = await liveSessionWith(owner)
    const payload = { clientRequestId: rid(), weightValue: 430, weightUnit: 'lb', repetitions: 12 }
    for (let i = 0; i < 2; i++) {
      const response = await client
        .post(`/session-exercises/${sessionExercise.id}/sets`)
        .loginAs(owner)
        .withCsrfToken()
        .header('referer', `/workouts/${session.id}`)
        .json(payload)
        .redirects(0)
      response.assertStatus(302)
    }
    const count = await WorkoutSet.query()
      .where('session_exercise_id', sessionExercise.id)
      .count('* as c')
      .firstOrFail()
    assert.equal(Number(count.$extras.c), 1)
  })

  test('invalid set payloads are rejected by validation', async ({ client }) => {
    const owner = await createUser()
    const { sessionExercise } = await liveSessionWith(owner)
    const response = await client
      .post(`/session-exercises/${sessionExercise.id}/sets`)
      .loginAs(owner)
      .withCsrfToken()
      .header('accept', 'application/json')
      .json({ clientRequestId: 'not-a-uuid', weightValue: -5, weightUnit: 'lb', repetitions: 3.5 })
    response.assertStatus(422)
  })
})
