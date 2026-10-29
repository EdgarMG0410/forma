import { test } from '@japa/runner'
import { parseSetMessage } from '#domain/set_parser'

test.group('Domain / set message parser', () => {
  test('reads "{reps} con {weight}"', ({ assert }) => {
    const { parsed, ambiguities } = parseSetMessage('hice 9 con 120')
    assert.equal(parsed.repetitions, 9)
    assert.equal(parsed.weightValue, 120)
    assert.isNull(parsed.weightUnit)
    assert.isEmpty(ambiguities)
  })

  test('reads "{weight} x {reps}" with unit', ({ assert }) => {
    const { parsed } = parseSetMessage('430 lb x 12')
    assert.deepInclude(parsed, { weightValue: 430, weightUnit: 'lb', repetitions: 12 })
  })

  test('reads kilos and decimals', ({ assert }) => {
    const { parsed } = parseSetMessage('8 reps a 52,5 kg')
    assert.deepInclude(parsed, { weightValue: 52.5, weightUnit: 'kg', repetitions: 8 })
  })

  test('reads RIR without mistaking it for reps or weight', ({ assert }) => {
    const { parsed } = parseSetMessage('110 x 8, rir 2')
    assert.deepInclude(parsed, { weightValue: 110, repetitions: 8, rir: 2 })
  })

  test('"mismo peso" with reps only is valid', ({ assert }) => {
    const { parsed, ambiguities } = parseSetMessage('mismo peso, 8')
    assert.isTrue(parsed.sameWeightAsLast)
    assert.equal(parsed.repetitions, 8)
    assert.isEmpty(ambiguities)
  })

  test('"otra igual" repeats the last set', ({ assert }) => {
    const { parsed, ambiguities } = parseSetMessage('otra igual')
    assert.isTrue(parsed.repeatLast)
    assert.isEmpty(ambiguities)
  })

  test('two bare numbers are ambiguous, never guessed', ({ assert }) => {
    const { parsed, ambiguities, confidence } = parseSetMessage('9 120')
    assert.isNull(parsed.repetitions)
    assert.isNull(parsed.weightValue)
    assert.isNotEmpty(ambiguities)
    assert.isBelow(confidence, 0.5)
  })

  test('missing weight asks instead of assuming', ({ assert }) => {
    const { ambiguities } = parseSetMessage('hice 10')
    assert.isTrue(ambiguities.some((a) => a.includes('peso')))
  })

  test('flags warm-ups and discomfort', ({ assert }) => {
    const { parsed } = parseSetMessage('calentamiento 135 x 10, sentí molestia')
    assert.equal(parsed.setType, 'warmup')
    assert.isTrue(parsed.discomfort)
  })
})
