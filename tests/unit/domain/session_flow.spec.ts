import { test } from '@japa/runner'
import {
  activeSeconds,
  exerciseStatusAfterChange,
  nextStep,
  sessionProgress,
} from '#domain/session_flow'

const ex = (
  id: number,
  orderIndex: number,
  loggedSets: number,
  status: any = 'pending',
  targetSets = 3
) => ({
  id,
  orderIndex,
  status,
  targetSets,
  loggedSets,
})

test.group('Domain / session flow', () => {
  test('continues the exercise in progress, then the next pending one', ({ assert }) => {
    assert.deepEqual(nextStep([ex(1, 0, 1, 'in_progress'), ex(2, 1, 0)]), {
      kind: 'set',
      sessionExerciseId: 1,
      setNumber: 2,
      totalSets: 3,
    })
    assert.deepEqual(nextStep([ex(1, 0, 3, 'completed'), ex(2, 1, 0)]), {
      kind: 'set',
      sessionExerciseId: 2,
      setNumber: 1,
      totalSets: 3,
    })
  })

  test('a reordered or skipped exercise is respected', ({ assert }) => {
    const step = nextStep([ex(1, 1, 0), ex(2, 0, 0, 'skipped'), ex(3, 2, 0)])
    assert.equal(step.kind === 'set' && step.sessionExerciseId, 1)
  })

  test('focus keeps the chosen exercise selected', ({ assert }) => {
    const step = nextStep([ex(1, 0, 1, 'in_progress'), ex(2, 1, 0)], 2)
    assert.equal(step.kind === 'set' && step.sessionExerciseId, 2)
  })

  test('done when every exercise is complete or skipped', ({ assert }) => {
    assert.deepEqual(nextStep([ex(1, 0, 3, 'completed'), ex(2, 1, 0, 'skipped')]), { kind: 'done' })
  })

  test('status follows logged sets', ({ assert }) => {
    assert.equal(exerciseStatusAfterChange('pending', 1, 3), 'in_progress')
    assert.equal(exerciseStatusAfterChange('in_progress', 3, 3), 'completed')
    assert.equal(exerciseStatusAfterChange('completed', 2, 3), 'in_progress')
    assert.equal(exerciseStatusAfterChange('skipped', 2, 3), 'skipped')
  })

  test('progress counts extra sets and ignores skipped exercises', ({ assert }) => {
    const p = sessionProgress([
      ex(1, 0, 4, 'completed'),
      ex(2, 1, 1, 'in_progress'),
      ex(3, 2, 0, 'skipped'),
    ])
    assert.equal(p.loggedSets, 5)
    assert.equal(p.targetSets, 7)
  })

  test('active time excludes pauses', ({ assert }) => {
    const startedAt = new Date('2026-10-27T10:00:00Z')
    const seconds = activeSeconds({
      startedAt,
      endedAt: new Date('2026-10-27T11:00:00Z'),
      pausedAt: null,
      pausedSeconds: 600,
      now: new Date('2026-10-27T12:00:00Z'),
    })
    assert.equal(seconds, 3000)
    const open = activeSeconds({
      startedAt,
      endedAt: null,
      pausedAt: new Date('2026-10-27T10:30:00Z'),
      pausedSeconds: 0,
      now: new Date('2026-10-27T10:40:00Z'),
    })
    assert.equal(open, 1800)
  })
})
