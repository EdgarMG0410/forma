import { test } from '@japa/runner'
import { effectiveLoad } from '#domain/load'
import type { SetPerformance } from '#domain/performance'
import { isEffectiveSet, muscleGroupSets, sumVolume } from '#domain/volume'

const set = (overrides: Partial<SetPerformance>): SetPerformance => ({
  setNumber: 1,
  setType: 'working',
  weightValue: 100,
  weightUnit: 'lb',
  weightBasis: 'total',
  repetitions: 10,
  ...overrides,
})

test.group('Domain / volume', () => {
  test('volume is load × reps summed across sets', ({ assert }) => {
    const totals = sumVolume(
      [
        set({ weightValue: 430, repetitions: 12 }),
        set({ setNumber: 2, weightValue: 470, repetitions: 10 }),
      ],
      { perHandMultiplier: null },
      'lb'
    )
    assert.equal(totals.total, 430 * 12 + 470 * 10)
    assert.equal(totals.reps, 22)
    assert.equal(totals.sets, 2)
  })

  test('warm-ups count in total load but not in working volume or effective sets', ({ assert }) => {
    const totals = sumVolume(
      [set({ setType: 'warmup', weightValue: 45, repetitions: 10 }), set({ setNumber: 2 })],
      { perHandMultiplier: null },
      'lb'
    )
    assert.equal(totals.total, 450 + 1000)
    assert.equal(totals.working, 1000)
    assert.equal(totals.workingSets, 1)
    assert.equal(totals.effectiveSets, 1)
  })

  test('per-hand weights are not doubled without an explicit multiplier', ({ assert }) => {
    const perHand = set({ weightValue: 50, weightBasis: 'per_hand', repetitions: 10 })
    const plain = sumVolume([perHand], { perHandMultiplier: null }, 'lb')
    assert.equal(plain.total, 500)
    assert.deepEqual(plain.byBasis, { per_hand: 500 })

    const converted = sumVolume([perHand], { perHandMultiplier: 2 }, 'lb')
    assert.equal(converted.total, 1000)
    assert.deepEqual(converted.byBasis, { total: 1000 })
    assert.isTrue(effectiveLoad(perHand, { perHandMultiplier: 2 }, 'lb').converted)
  })

  test('mixed units are summed in the requested unit', ({ assert }) => {
    const totals = sumVolume(
      [set({ weightValue: 100, weightUnit: 'kg', repetitions: 1 })],
      { perHandMultiplier: null },
      'lb'
    )
    assert.closeTo(totals.total, 220.462, 0.001)
  })

  test('sets with unknown weight or reps are flagged as incomplete, not guessed', ({ assert }) => {
    const totals = sumVolume(
      [set({ weightValue: null, weightUnit: null }), set({ setNumber: 2, repetitions: null })],
      { perHandMultiplier: null },
      'lb'
    )
    assert.equal(totals.total, 0)
    assert.equal(totals.incompleteSets, 2)
  })

  test('effective sets respect logged effort', ({ assert }) => {
    assert.isTrue(isEffectiveSet(set({ rir: 2 })))
    assert.isFalse(isEffectiveSet(set({ rir: 6 })))
    assert.isTrue(isEffectiveSet(set({ rpe: 8 })))
    assert.isFalse(isEffectiveSet(set({ repetitions: 0 })))
  })

  test('muscle group volume counts sets, half for secondary muscles', ({ assert }) => {
    const result = muscleGroupSets([
      {
        sets: [set({}), set({ setNumber: 2 }), set({ setNumber: 3, setType: 'warmup' })],
        muscles: [
          { slug: 'quadriceps', role: 'primary' },
          { slug: 'glutes', role: 'secondary' },
        ],
      },
    ])
    assert.deepEqual(result, { quadriceps: 2, glutes: 1 })
  })
})
