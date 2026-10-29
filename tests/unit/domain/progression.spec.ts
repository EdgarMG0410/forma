import { test } from '@japa/runner'
import type { SetPerformance } from '#domain/performance'
import { WorkoutProgressionService, type ProgressionInput } from '#domain/progression'

const engine = new WorkoutProgressionService()
const s = (
  n: number,
  weightValue: number,
  repetitions: number,
  extra: Partial<SetPerformance> = {}
): SetPerformance => ({
  setNumber: n,
  setType: 'working',
  weightValue,
  weightUnit: 'lb',
  weightBasis: 'machine_display',
  repetitions,
  ...extra,
})
const input = (overrides: Partial<ProgressionInput>): ProgressionInput => ({
  exercise: {
    equipment: 'machine',
    exerciseType: 'compound',
    weightBasis: 'machine_display',
    loadIncrement: 10,
    loadIncrementUnit: 'lb',
  },
  unit: 'lb',
  targetRepsMin: 8,
  targetRepsMax: 12,
  currentSets: [],
  history: [],
  ...overrides,
})

test.group('Domain / progression engine', () => {
  test('never invents a weight without history', ({ assert }) => {
    const r = engine.recommend(input({}))
    assert.equal(r.decision, 'no_data')
    assert.isNull(r.recommendedWeight)
    assert.isBelow(r.confidence, 0.3)
  })

  test('increases when every set hit the top of the range with reps in reserve', ({ assert }) => {
    const r = engine.recommend(
      input({
        history: [
          {
            workoutDate: '2026-10-20',
            sets: [s(1, 430, 12, { rir: 2 }), s(2, 430, 12, { rir: 1 }), s(3, 430, 12, { rir: 1 })],
          },
        ],
      })
    )
    assert.equal(r.decision, 'increase')
    assert.equal(r.recommendedWeight, 440)
  })

  test('holds an increase when effort data is missing, until the top repeats', ({ assert }) => {
    const once = engine.recommend(
      input({ history: [{ workoutDate: '2026-10-20', sets: [s(1, 430, 12), s(2, 430, 12)] }] })
    )
    assert.equal(once.decision, 'hold')
    assert.equal(once.recommendedWeight, 430)
    assert.isNotEmpty(once.warnings)

    const twice = engine.recommend(
      input({
        history: [
          { workoutDate: '2026-10-20', sets: [s(1, 430, 12), s(2, 430, 12)] },
          { workoutDate: '2026-10-13', sets: [s(1, 430, 12), s(2, 430, 13)] },
        ],
      })
    )
    assert.equal(twice.decision, 'increase')
    assert.equal(twice.recommendedWeight, 440)
  })

  test('holds within the range', ({ assert }) => {
    const r = engine.recommend(
      input({ history: [{ workoutDate: '2026-10-20', sets: [s(1, 430, 10), s(2, 430, 9)] }] })
    )
    assert.equal(r.decision, 'hold')
    assert.equal(r.recommendedWeight, 430)
  })

  test('reduces after a significant drop', ({ assert }) => {
    const r = engine.recommend(
      input({ history: [{ workoutDate: '2026-10-20', sets: [s(1, 430, 5), s(2, 430, 4)] }] })
    )
    assert.equal(r.decision, 'decrease')
    assert.isBelow(r.recommendedWeight!, 430)
  })

  test('reacts to the set just logged inside the session', ({ assert }) => {
    const drop = engine.recommend(input({ currentSets: [s(1, 140, 5)] }))
    assert.equal(drop.decision, 'decrease')
    assert.equal(drop.recommendedWeight, 120)
    assert.isAbove(drop.restSeconds, 150)

    const near = engine.recommend(input({ currentSets: [s(1, 140, 7)] }))
    assert.equal(near.decision, 'hold')
    assert.equal(near.recommendedWeight, 140)
  })

  test('warm-ups never drive the recommendation', ({ assert }) => {
    const r = engine.recommend(input({ currentSets: [s(1, 200, 3, { setType: 'warmup' })] }))
    assert.equal(r.decision, 'no_data')
  })

  test('discomfort blocks increases', ({ assert }) => {
    const r = engine.recommend(
      input({
        discomfort: true,
        history: [
          {
            workoutDate: '2026-10-20',
            sets: [s(1, 430, 12, { rir: 3 }), s(2, 430, 12, { rir: 3 })],
          },
        ],
      })
    )
    assert.notEqual(r.decision, 'increase')
    assert.isTrue(r.warnings.some((w) => w.includes('molestias')))
  })

  test('ignores history with a different weight basis', ({ assert }) => {
    const r = engine.recommend(
      input({
        history: [
          { workoutDate: '2026-10-20', sets: [s(1, 100, 10, { weightBasis: 'per_hand' })] },
        ],
      })
    )
    assert.equal(r.decision, 'no_data')
    assert.isNotEmpty(r.warnings)
  })

  test('converts kg history into the display unit and snaps to the increment', ({ assert }) => {
    const r = engine.recommend(
      input({
        history: [{ workoutDate: '2026-10-20', sets: [s(1, 100, 10, { weightUnit: 'kg' })] }],
      })
    )
    assert.equal(r.recommendedWeight, 220)
  })
})
