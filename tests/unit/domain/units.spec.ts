import { test } from '@japa/runner'
import { convertWeight, normalizeWeight, round, snapToIncrement } from '#domain/units'

test.group('Domain / units', () => {
  test('converts between lb and kg symmetrically', ({ assert }) => {
    assert.equal(round(convertWeight(100, 'kg', 'lb'), 2), 220.46)
    assert.equal(round(convertWeight(220.462262185, 'lb', 'kg'), 4), 100)
    assert.equal(convertWeight(135, 'lb', 'lb'), 135)
  })

  test('normalizes without touching the captured value', ({ assert }) => {
    assert.deepEqual(normalizeWeight(430, 'lb'), { weightKg: 195.0447, weightLb: 430 })
    assert.deepEqual(normalizeWeight(null, null), { weightKg: null, weightLb: null })
  })

  test('rounds without float drift', ({ assert }) => {
    assert.equal(round(1.005, 2), 1.01)
    assert.equal(round(0.1 + 0.2, 2), 0.3)
  })

  test('snaps loads to the available increment', ({ assert }) => {
    assert.equal(snapToIncrement(132, 5), 130)
    assert.equal(snapToIncrement(133, 5), 135)
    assert.equal(snapToIncrement(134, 5, 'down'), 130)
    assert.equal(snapToIncrement(131, 2.5, 'up'), 132.5)
  })
})
