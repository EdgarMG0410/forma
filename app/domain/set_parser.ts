import type { SetType, WeightUnit } from './enums.js'

/**
 * What a free-text message like "hice 9 con 120" says about a set. Fields
 * the message does not state stay null — they are never guessed.
 */
export type ParsedSet = {
  weightValue: number | null
  weightUnit: WeightUnit | null
  repetitions: number | null
  setType: SetType | null
  rir: number | null
  sameWeightAsLast: boolean
  repeatLast: boolean
  discomfort: boolean
}

export type ParseResult = {
  parsed: ParsedSet
  /** 0–1: how sure the rules are about the reading. */
  confidence: number
  /** Why the result cannot be saved as is; empty when it can. */
  ambiguities: string[]
}

const NUM = String.raw`(\d+(?:[.,]\d+)?)`
const UNIT = String.raw`(lbs?|libras?|kgs?|kilos?|kilogramos?)`

function toNumber(raw: string) {
  return Number(raw.replace(',', '.'))
}

function toUnit(raw: string | undefined): WeightUnit | null {
  if (!raw) return null
  return raw.toLowerCase().startsWith('k') ? 'kg' : 'lb'
}

/**
 * Deterministic Spanish/English parser for set messages. Handles the common
 * shapes — "hice 9 con 120", "120 x 9", "9 reps a 50 kg", "otra igual",
 * "mismo peso, 8" — and reports anything it cannot pin down instead of
 * guessing which number is the weight.
 */
export function parseSetMessage(input: string): ParseResult {
  const text = input.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

  const parsed: ParsedSet = {
    weightValue: null,
    weightUnit: null,
    repetitions: null,
    setType: null,
    rir: null,
    sameWeightAsLast: /\b(mismo peso|same weight|igual peso)\b/.test(text),
    repeatLast: /\b(otra igual|lo mismo|repite|repeat|same again|igual que la anterior)\b/.test(
      text
    ),
    discomfort: /\b(dolor|molestia|me dolio|lesion|pain)\b/.test(text),
  }
  const ambiguities: string[] = []
  let confidence = 0.9

  if (/\b(calentamiento|warm ?up)\b/.test(text)) parsed.setType = 'warmup'
  else if (/\b(drop ?set|dropset)\b/.test(text)) parsed.setType = 'dropset'

  const rir = text.match(
    new RegExp(
      String.raw`\b(?:rir|en reserva|quedaban?|me quedaban?)\s*${NUM}|${NUM}\s*(?:en reserva|de reserva)`
    )
  )
  if (rir) parsed.rir = toNumber(rir[1] ?? rir[2])

  // strip the RIR clause so its number is not read as reps or weight
  const body = rir ? text.replace(rir[0], ' ') : text

  const patterns: Array<{ re: RegExp; weight: number; reps: number; unit?: number }> = [
    // 120 x 9 / 120x9 / 120 lb x 9 / 120 por 9
    {
      re: new RegExp(String.raw`${NUM}\s*${UNIT}?\s*(?:x|×|por)\s*(\d+)\b`),
      weight: 1,
      unit: 2,
      reps: 3,
    },
    // 9 con 120 / 9 reps con 120 lb / 9 a 120 / 9 @ 120
    {
      re: new RegExp(
        String.raw`(\d+)\s*(?:reps?|repeticiones)?\s*(?:con|a|@|de)\s*${NUM}\s*${UNIT}?`
      ),
      reps: 1,
      weight: 2,
      unit: 3,
    },
    // con 120 hice 9 / 120 lb 9 reps
    {
      re: new RegExp(
        String.raw`(?:con\s*)?${NUM}\s*${UNIT}\s*(?:hice\s*)?(\d+)\s*(?:reps?|repeticiones)?\b`
      ),
      weight: 1,
      unit: 2,
      reps: 3,
    },
    {
      re: new RegExp(String.raw`con\s*${NUM}\s*${UNIT}?\s*(?:hice|,)?\s*(\d+)`),
      weight: 1,
      unit: 2,
      reps: 3,
    },
  ]

  for (const p of patterns) {
    const m = body.match(p.re)
    if (!m) continue
    parsed.weightValue = toNumber(m[p.weight])
    parsed.repetitions = Number(m[p.reps])
    parsed.weightUnit = p.unit ? toUnit(m[p.unit]) : null
    break
  }

  if (parsed.repetitions === null) {
    // "hice 9" / "9 reps" / "mismo peso, 8"
    const reps =
      body.match(/(?:hice|saque|logre|did)\s*(\d+)\b|(\d+)\s*(?:reps?|repeticiones)\b/) ??
      (parsed.sameWeightAsLast ? body.match(/(\d+)/) : null)
    if (reps) parsed.repetitions = Number(reps[1] ?? reps[2])
  }

  if (parsed.weightValue === null) {
    const weight = body.match(new RegExp(String.raw`${NUM}\s*${UNIT}`))
    if (weight) {
      parsed.weightValue = toNumber(weight[1])
      parsed.weightUnit = toUnit(weight[2])
    }
  }

  if (parsed.repeatLast) {
    return { parsed, confidence: 0.85, ambiguities }
  }

  if (parsed.repetitions === null && parsed.weightValue === null) {
    const numbers = body.match(/\d+(?:[.,]\d+)?/g) ?? []
    ambiguities.push(
      numbers.length >= 2
        ? `No sé cuál número es el peso y cuál las repeticiones (${numbers.slice(0, 2).join(' y ')}).`
        : 'No encontré peso ni repeticiones en el mensaje.'
    )
    return { parsed, confidence: 0.1, ambiguities }
  }
  if (parsed.repetitions === null) {
    ambiguities.push('Faltan las repeticiones.')
    confidence = 0.4
  }
  if (parsed.weightValue === null && !parsed.sameWeightAsLast) {
    ambiguities.push('Falta el peso (di «mismo peso» si no cambió).')
    confidence = Math.min(confidence, 0.5)
  }
  if (parsed.repetitions !== null && parsed.repetitions > 100) {
    ambiguities.push(`${parsed.repetitions} repeticiones parece un error.`)
    confidence = 0.3
  }
  if (parsed.weightValue !== null && parsed.weightUnit === null) {
    // a missing unit is filled from the exercise's own unit at confirmation time
    confidence = Math.min(confidence, 0.8)
  }

  return { parsed, confidence, ambiguities }
}
