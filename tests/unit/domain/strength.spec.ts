import { test } from '@japa/runner'
import { compareExercise } from '#domain/comparison'
import type { SetPerformance } from '#domain/performance'
import { bestMarks, newRecords } from '#domain/records'
import { estimateOneRepMax, topSet } from '#domain/strength'

const ctx = { perHandMultiplier: null }
const set = (
  n: number,
  weightValue: number,
  repetitions: number,
  extra: Partial<SetPerformance> = {}
): SetPerformance => ({
  setNumber: n,
  setType: 'working',
  weightValue,
  weightUnit: 'lb',
  weightBasis: 'total',
  repetitions,
  ...extra,
})

test.group('Domain / strength & records', () => {
  test('e1RM only where it makes sense', ({ assert }) => {
    assert.equal(estimateOneRepMax(200, 1), 200)
    assert.equal(estimateOneRepMax(200, 5), 233.33)
    assert.isNull(estimateOneRepMax(200, 15))
    assert.isNull(estimateOneRepMax(0, 5))
  })

  test('top set is the heaviest working set', ({ assert }) => {
    const top = topSet(
      [set(1, 135, 10, { setType: 'warmup' }), set(2, 185, 8), set(3, 185, 9)],
      ctx,
      'lb'
    )
    assert.equal(top?.load, 185)
    assert.equal(top?.reps, 9)
  })

  test('best marks ignore warm-ups and unknown basis', ({ assert }) => {
    const marks = bestMarks(
      [
        set(1, 300, 3, { setType: 'warmup' }),
        set(2, 200, 8),
        set(3, 999, 1, { weightBasis: 'unknown' }),
      ],
      ctx,
      'lb'
    )
    const maxWeight = marks.find((m) => m.recordType === 'max_weight')
    assert.equal(maxWeight?.value, 200)
    assert.isFalse(marks.some((m) => m.basis === 'unknown'))
  })

  test('new records only beat the same basis, and high reps at a light load are not a record', ({
    assert,
  }) => {
    const marks = bestMarks([set(1, 100, 20)], ctx, 'lb')
    const records = newRecords(marks, [
      { recordType: 'max_weight', basis: 'total', value: 200 },
      { recordType: 'max_reps', basis: 'total', value: 10 },
      { recordType: 'max_weight', basis: 'per_hand', value: 50 },
    ])
    assert.isFalse(records.some((r) => r.recordType === 'max_weight'))
    assert.isFalse(records.some((r) => r.recordType === 'max_reps'))
  })

  test('comparison detects load and rep progress and refuses mismatched bases', ({ assert }) => {
    assert.equal(compareExercise([set(1, 190, 8)], [set(1, 185, 8)], ctx, 'lb').signal, 'load_up')
    assert.equal(compareExercise([set(1, 185, 10)], [set(1, 185, 8)], ctx, 'lb').signal, 'reps_up')
    assert.equal(compareExercise([set(1, 180, 8)], [set(1, 185, 8)], ctx, 'lb').signal, 'down')
    assert.equal(
      compareExercise([set(1, 50, 8, { weightBasis: 'per_hand' })], [set(1, 100, 8)], ctx, 'lb')
        .signal,
      'not_comparable'
    )
  })
})
