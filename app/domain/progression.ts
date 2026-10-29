import type { Equipment, ExerciseType, WeightBasis, WeightUnit } from './enums.js'
import { isWorkingSet, hasEffortData, repsInReserve, type SetPerformance } from './performance.js'
import { convertWeight, round, snapToIncrement } from './units.js'

export const PROGRESSION_ENGINE_VERSION = 'rules-1.0'

/**
 * Every threshold the engine uses. Defaults are conservative; a user or an
 * exercise can override any of them.
 */
export type ProgressionConfig = {
  /** Without RIR/RPE or technique data, only increase after this many sessions at the top of the range. */
  sessionsAtTopWithoutEffortData: number
  /** An increase needs at least this many reps in reserve on the last working set, when logged. */
  minRirForIncrease: number
  /** Reps below the range floor that count as a significant drop. */
  significantDropReps: number
  /** Relative load cut when performance drops significantly. */
  reductionPct: number
  /** Never jump more than this fraction of the current load in one step. */
  maxIncreasePct: number
  restSeconds: { compound: number; isolation: number; afterStruggle: number }
}

export const DEFAULT_PROGRESSION_CONFIG: ProgressionConfig = {
  sessionsAtTopWithoutEffortData: 2,
  minRirForIncrease: 1,
  significantDropReps: 2,
  reductionPct: 0.1,
  maxIncreasePct: 0.25,
  restSeconds: { compound: 150, isolation: 90, afterStruggle: 30 },
}

export type ProgressionExercise = {
  equipment: Equipment
  exerciseType: ExerciseType
  weightBasis: WeightBasis
  loadIncrement: number
  loadIncrementUnit: WeightUnit
  /** Optional explicit loads available (a pin stack, fixed dumbbells). */
  availableLoads?: number[] | null
}

export type ProgressionInput = {
  exercise: ProgressionExercise
  unit: WeightUnit
  targetRepsMin: number
  targetRepsMax: number
  restSeconds?: number | null
  /** Sets already logged for this exercise in the current session. */
  currentSets: SetPerformance[]
  /** Prior sessions of this exercise, newest first. Only real logged sets. */
  history: Array<{ workoutDate: string; sets: SetPerformance[] }>
  /** The user reported discomfort on this exercise. */
  discomfort?: boolean
  config?: Partial<ProgressionConfig>
}

export type ProgressionDecision = 'increase' | 'hold' | 'decrease' | 'no_data'

export type Recommendation = {
  decision: ProgressionDecision
  recommendedWeight: number | null
  unit: WeightUnit
  targetRepsMin: number
  targetRepsMax: number
  restSeconds: number
  rationale: string
  /** 0–1 */
  confidence: number
  warnings: string[]
  engineVersion: string
}

type WorkingSet = SetPerformance & { load: number }

/**
 * Deterministic double-progression engine. Works only from logged sets and
 * never invents a load: with no comparable history it returns no weight.
 */
export class WorkoutProgressionService {
  recommend(input: ProgressionInput): Recommendation {
    const config = { ...DEFAULT_PROGRESSION_CONFIG, ...input.config }
    const warnings: string[] = []
    const { targetRepsMin: min, targetRepsMax: max, unit } = input
    const baseRest =
      input.restSeconds ??
      (input.exercise.exerciseType === 'compound'
        ? config.restSeconds.compound
        : config.restSeconds.isolation)

    const increment = this.#increment(input.exercise, unit)
    const current = this.#working(input.currentSets, input.exercise.weightBasis, unit)
    const history = input.history
      .map((h) => ({ ...h, sets: this.#working(h.sets, input.exercise.weightBasis, unit) }))
      .filter((h) => h.sets.length > 0)

    const skippedBasis = input.history.some((h) =>
      h.sets.some((s) => isWorkingSet(s) && s.weightBasis !== input.exercise.weightBasis)
    )
    if (skippedBasis) {
      warnings.push(
        'Se ignoraron series registradas con otra base de peso (por mano / total / máquina).'
      )
    }

    const result = (
      decision: ProgressionDecision,
      weight: number | null,
      rationale: string,
      confidence: number,
      rest = baseRest
    ): Recommendation => ({
      decision,
      recommendedWeight:
        weight === null
          ? null
          : this.#snap(
              weight,
              input.exercise,
              increment,
              decision === 'decrease' ? 'down' : 'nearest'
            ),
      unit,
      targetRepsMin: min,
      targetRepsMax: max,
      restSeconds: rest,
      rationale,
      confidence: round(Math.max(0.05, Math.min(0.95, confidence)), 2),
      warnings,
      engineVersion: PROGRESSION_ENGINE_VERSION,
    })

    if (input.discomfort) {
      warnings.push(
        'Reportaste molestias: no se sugiere subir carga. Si el dolor persiste, detente y consulta a un profesional.'
      )
    }

    // ── Within the session: react to the set just done ────────────────────
    if (current.length > 0) {
      const last = current[current.length - 1]
      const reps = last.repetitions ?? 0
      const rir = repsInReserve(last)

      if (input.discomfort) {
        return result(
          'decrease',
          last.load * (1 - config.reductionPct),
          'Bajamos la carga por las molestias reportadas; prioriza técnica y rango sin dolor.',
          0.6,
          baseRest
        )
      }
      if (reps < min - config.significantDropReps) {
        return result(
          'decrease',
          last.load * (1 - config.reductionPct),
          `Hiciste ${reps} reps, por debajo de ${min}: baja la carga para volver al rango.`,
          0.7,
          baseRest + config.restSeconds.afterStruggle
        )
      }
      if (reps < min) {
        return result(
          'hold',
          last.load,
          `Quedaste a ${min - reps} rep del rango. Mantén ${round(last.load)} ${unit} y descansa un poco más.`,
          0.65,
          baseRest + config.restSeconds.afterStruggle
        )
      }
      const clearlyEasy = reps >= max + 2 && rir !== null && rir >= config.minRirForIncrease + 1
      if (clearlyEasy && !input.discomfort) {
        const next = this.#raise(last.load, increment, config)
        if (next.raised) {
          return result(
            'increase',
            next.load,
            `${reps} reps con ${rir} en reserva supera el rango: sube a ${next.load} ${unit} en la siguiente serie.`,
            0.7
          )
        }
      }
      return result(
        'hold',
        last.load,
        reps >= max
          ? `Llegaste al tope del rango (${reps}). Mantén el peso y busca las mismas reps.`
          : `Dentro del rango (${reps}). Mantén ${round(last.load)} ${unit}.`,
        0.75
      )
    }

    // ── First set: decide from the previous sessions ──────────────────────
    if (history.length === 0) {
      return result(
        'no_data',
        null,
        `Sin historial comparable. Elige un peso que te permita ${min}–${max} reps con buena técnica.`,
        0.2
      )
    }

    const [last, ...older] = history
    const reference = this.#referenceLoad(last.sets)
    const atReference = last.sets.filter((s) => Math.abs(s.load - reference) < 1e-6)
    const allAtTop = atReference.every((s) => (s.repetitions ?? 0) >= max)
    const avgReps =
      atReference.reduce((sum, s) => sum + (s.repetitions ?? 0), 0) / atReference.length
    const effortKnown =
      atReference.some(hasEffortData) ||
      atReference.some((s) => s.techniqueOk !== null && s.techniqueOk !== undefined)
    const techniqueFlag = atReference.some((s) => s.techniqueOk === false)
    const lastRir = repsInReserve(atReference[atReference.length - 1])
    const baseConfidence = Math.min(0.85, 0.45 + 0.1 * history.length) + (effortKnown ? 0.1 : 0)

    if (input.discomfort) {
      return result(
        'hold',
        reference,
        'Mantén la carga de la última sesión por las molestias reportadas.',
        baseConfidence - 0.2
      )
    }

    if (
      avgReps < min - config.significantDropReps / 2 &&
      atReference.every((s) => (s.repetitions ?? 0) < min)
    ) {
      return result(
        'decrease',
        reference * (1 - config.reductionPct),
        `La última vez todas las series quedaron bajo ${min} reps con ${round(reference)} ${unit}. Baja la carga y reconstruye.`,
        baseConfidence
      )
    }

    if (allAtTop && !techniqueFlag) {
      if (effortKnown) {
        if (lastRir !== null && lastRir < config.minRirForIncrease) {
          return result(
            'hold',
            reference,
            `Llegaste a ${max} reps pero sin reps en reserva. Repite ${round(reference)} ${unit} antes de subir.`,
            baseConfidence
          )
        }
        const next = this.#raise(reference, increment, config)
        if (next.raised) {
          return result(
            'increase',
            next.load,
            `Completaste ${max}+ reps en todas las series con ${round(reference)} ${unit}. Sube a ${next.load} ${unit}.`,
            baseConfidence
          )
        }
        warnings.push(next.note)
        return result(
          'hold',
          reference,
          `Tope del rango alcanzado; el siguiente incremento sería demasiado grande. Busca más reps con ${round(reference)} ${unit}.`,
          baseConfidence - 0.1
        )
      }

      // No effort/technique data: require the top of the range to repeat.
      const confirmations = this.#sessionsAtTop([last, ...older], reference, max)
      if (confirmations >= config.sessionsAtTopWithoutEffortData) {
        const next = this.#raise(reference, increment, config)
        if (next.raised) {
          warnings.push(
            'Sin RIR/RPE registrado: el incremento se basa en repetir el tope del rango.'
          )
          return result(
            'increase',
            next.load,
            `${confirmations} sesiones seguidas en ${max}+ reps con ${round(reference)} ${unit}. Sube a ${next.load} ${unit}.`,
            baseConfidence - 0.1
          )
        }
      }
      warnings.push('Registra RIR o técnica para confirmar el incremento.')
      return result(
        'hold',
        reference,
        `Llegaste a ${max} reps. Sin datos de esfuerzo, repite ${round(reference)} ${unit} y confirma antes de subir.`,
        baseConfidence - 0.1
      )
    }

    if (techniqueFlag) warnings.push('La última sesión marcó técnica mejorable: mantener carga.')
    return result(
      'hold',
      reference,
      `Mantén ${round(reference)} ${unit} y busca sumar reps dentro de ${min}–${max}.`,
      baseConfidence
    )
  }

  /** Working sets with a known load, same basis, in the display unit. */
  #working(sets: SetPerformance[], basis: WeightBasis, unit: WeightUnit): WorkingSet[] {
    return sets
      .filter((s) => isWorkingSet(s) && s.setType !== 'dropset')
      .filter(
        (s) =>
          s.weightBasis === basis &&
          s.weightValue !== null &&
          s.weightUnit !== null &&
          s.repetitions !== null
      )
      .map((s) => ({ ...s, load: round(convertWeight(s.weightValue!, s.weightUnit!, unit), 2) }))
  }

  /** The load most working sets used (ties → heaviest): the straight-set weight. */
  #referenceLoad(sets: WorkingSet[]): number {
    const counts = new Map<number, number>()
    for (const s of sets) counts.set(s.load, (counts.get(s.load) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0]
  }

  #sessionsAtTop(history: Array<{ sets: WorkingSet[] }>, load: number, max: number): number {
    let count = 0
    for (const session of history) {
      const atLoad = session.sets.filter((s) => Math.abs(s.load - load) < 1e-6)
      if (atLoad.length === 0 || !atLoad.every((s) => (s.repetitions ?? 0) >= max)) break
      count += 1
    }
    return count
  }

  #increment(exercise: ProgressionExercise, unit: WeightUnit): number {
    return round(convertWeight(exercise.loadIncrement, exercise.loadIncrementUnit, unit), 2)
  }

  #raise(load: number, increment: number, config: ProgressionConfig) {
    const next = round(load + increment, 2)
    if (load > 0 && increment / load > config.maxIncreasePct) {
      return {
        raised: false,
        load,
        note: `El incremento mínimo (${increment}) supera el ${config.maxIncreasePct * 100}% de la carga.`,
      }
    }
    return { raised: true, load: next, note: '' }
  }

  #snap(
    load: number,
    exercise: ProgressionExercise,
    increment: number,
    direction: 'nearest' | 'down'
  ): number {
    if (exercise.availableLoads?.length) {
      const candidates =
        direction === 'down'
          ? exercise.availableLoads.filter((candidate) => candidate <= load + 1e-9)
          : exercise.availableLoads
      const pool = candidates.length ? candidates : exercise.availableLoads
      return pool.reduce((best, candidate) =>
        Math.abs(candidate - load) < Math.abs(best - load) ? candidate : best
      )
    }
    return snapToIncrement(Math.max(0, load), increment, direction)
  }
}
