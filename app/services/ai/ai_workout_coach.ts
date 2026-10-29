import type { ParsedSet } from '#domain/set_parser'
import type { WeightUnit } from '#domain/enums'

/**
 * What the coach may see about the moment. Deliberately small: exercise
 * names and the user's own logged numbers. Body data and discomfort notes
 * are only included when the user consented to share them.
 */
export type CoachContext = {
  exerciseName: string
  unit: WeightUnit
  targetRepsMin: number
  targetRepsMax: number
  lastSet: {
    weightValue: number | null
    weightUnit: WeightUnit | null
    repetitions: number | null
  } | null
}

export type CoachInterpretation = {
  parsed: ParsedSet
  confidence: number
  ambiguities: string[]
}

export type SummaryDigest = {
  sessionName: string
  unit: WeightUnit
  volume: number
  sets: number
  reps: number
  exercises: Array<{
    name: string
    sets: string
    comparison: string | null
    nextTarget: string | null
  }>
  records: string[]
  observations: string[]
}

/**
 * Optional interpretation layer. Implementations explain and propose; they
 * never write data — every result goes through validation and, when
 * ambiguous, an explicit user confirmation before anything is saved.
 */
export interface AIWorkoutCoach {
  readonly name: string
  readonly available: boolean
  /** Reads a free-text set message the rules could not pin down. */
  interpret(message: string, context: CoachContext): Promise<CoachInterpretation | null>
  /** A short plain-language narrative of a finished session. */
  summarize(digest: SummaryDigest): Promise<string | null>
}

/**
 * The default: no provider. The app works fully without it.
 */
export class NullCoach implements AIWorkoutCoach {
  readonly name = 'none'
  readonly available = false
  async interpret() {
    return null
  }
  async summarize() {
    return null
  }
}
