import type { RecordType, WeightBasis, WeightUnit } from './enums.js'
import type { LoadContext } from './load.js'
import { isWorkingSet, type SetPerformance } from './performance.js'
import { setMetrics } from './strength.js'

export type RecordCandidate = {
  recordType: RecordType
  basis: WeightBasis
  value: number
  valueUnit: string
  load: number | null
  reps: number | null
  setNumber: number
}

/**
 * Best marks inside one list of sets, per basis. Records are only ever
 * compared within the same basis: a per-hand dumbbell number and a machine
 * display are different scales.
 */
export function bestMarks(
  sets: SetPerformance[],
  context: LoadContext,
  unit: WeightUnit,
  supportsE1rm = true
): RecordCandidate[] {
  const best = new Map<string, RecordCandidate>()
  const consider = (candidate: RecordCandidate) => {
    const key = `${candidate.recordType}:${candidate.basis}`
    const current = best.get(key)
    if (!current || candidate.value > current.value) best.set(key, candidate)
  }

  for (const set of sets) {
    if (!isWorkingSet(set)) continue
    const m = setMetrics(set, context, unit, supportsE1rm)
    if (m.load === null || !m.reps || m.basis === 'unknown') continue
    const base = { basis: m.basis, load: m.load, reps: m.reps, setNumber: m.setNumber }
    consider({ ...base, recordType: 'max_weight', value: m.load, valueUnit: unit })
    consider({ ...base, recordType: 'max_reps', value: m.reps, valueUnit: 'reps' })
    if (m.volume !== null) {
      consider({ ...base, recordType: 'best_set_volume', value: m.volume, valueUnit: unit })
    }
    if (m.e1rm !== null) {
      consider({ ...base, recordType: 'estimated_1rm', value: m.e1rm, valueUnit: unit })
    }
  }
  return [...best.values()]
}

export type ExistingRecord = { recordType: RecordType; basis: WeightBasis; value: number }

/**
 * Which of a session's marks beat the stored records. `max_reps` only counts
 * as a record at a load no lighter than the current max-weight record, so
 * banging out 30 reps with an empty bar is not celebrated as progress.
 */
export function newRecords(
  candidates: RecordCandidate[],
  existing: ExistingRecord[]
): Array<RecordCandidate & { previous: number | null }> {
  const lookup = new Map(existing.map((r) => [`${r.recordType}:${r.basis}`, r.value]))
  const result: Array<RecordCandidate & { previous: number | null }> = []
  for (const candidate of candidates) {
    const previous = lookup.get(`${candidate.recordType}:${candidate.basis}`) ?? null
    if (candidate.recordType === 'max_reps') {
      const maxWeight = lookup.get(`max_weight:${candidate.basis}`)
      if (maxWeight !== undefined && (candidate.load ?? 0) < maxWeight) continue
    }
    if (previous === null || candidate.value > previous + 1e-9) {
      result.push({ ...candidate, previous })
    }
  }
  return result
}
