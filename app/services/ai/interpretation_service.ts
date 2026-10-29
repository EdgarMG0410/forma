import { randomUUID } from 'node:crypto'
import AiInterpretation from '#models/ai_interpretation'
import type User from '#models/user'
import WorkoutSessionExercise from '#models/workout_session_exercise'
import DomainException, { NotFoundException } from '#exceptions/domain_exception'
import { parseSetMessage, type ParsedSet } from '#domain/set_parser'
import type { WeightUnit } from '#domain/enums'
import { makeCoach } from '#services/ai/coach_factory'
import PreferencesService from '#services/preferences_service'
import WorkoutLiveService from '#services/workout_live_service'

export type ProposedSet = {
  weightValue: number | null
  weightUnit: WeightUnit | null
  repetitions: number | null
  setType: 'warmup' | 'working' | 'dropset'
  rir: number | null
  discomfort: boolean
}

export type InterpretationView = {
  id: number
  sessionExerciseId: number
  exerciseName: string
  input: string
  status: 'pending' | 'needs_clarification'
  interpreter: 'rules' | 'llm'
  proposal: ProposedSet | null
  clarification: string | null
}

/**
 * Natural-language set entry: message → structured proposal → user
 * confirmation → saved set. Deterministic rules run first; the LLM is only
 * asked when the rules cannot read the message and the user turned AI on.
 * Nothing is persisted as a set until the user confirms.
 */
export default class InterpretationService {
  async interpret(
    user: User,
    sessionExerciseId: number,
    message: string
  ): Promise<InterpretationView> {
    const se = await WorkoutSessionExercise.query()
      .where('id', sessionExerciseId)
      .whereHas('session', (q) =>
        q.where('user_id', user.id).whereIn('status', ['active', 'paused'])
      )
      .preload('exercise')
      .preload('sets')
      .first()
    if (!se) throw new NotFoundException('Ejercicio no encontrado en una sesión en curso.')
    const preferences = await PreferencesService.for(user)
    const last = se.sets[se.sets.length - 1] ?? null

    let result = parseSetMessage(message)
    let interpreter: 'rules' | 'llm' = 'rules'
    const coach = makeCoach()
    if (result.ambiguities.length && preferences.aiEnabled && coach.available) {
      const ai = await coach.interpret(message, {
        exerciseName: se.exercise.name,
        unit: last?.weightUnit ?? preferences.weightUnit,
        targetRepsMin: se.targetRepsMin,
        targetRepsMax: se.targetRepsMax,
        lastSet: last
          ? {
              weightValue: last.weightValue,
              weightUnit: last.weightUnit,
              repetitions: last.repetitions,
            }
          : null,
      })
      if (ai) {
        result = ai
        interpreter = 'llm'
      }
    }

    const { proposal, problems } = this.#resolve(result.parsed, last, preferences.weightUnit)
    const ambiguities = [...result.ambiguities, ...problems]
    const status = ambiguities.length || !proposal ? 'needs_clarification' : 'pending'

    const row = await AiInterpretation.create({
      userId: user.id,
      sessionId: se.sessionId,
      inputText: message,
      parsed: { sessionExerciseId: se.id, raw: result.parsed, proposal, requestId: randomUUID() },
      status,
      interpreter,
      confidence: Math.round(result.confidence * 100) / 100,
      clarification: ambiguities.length ? ambiguities.join(' ') : null,
    })

    return {
      id: row.id,
      sessionExerciseId: se.id,
      exerciseName: se.exercise.name,
      input: message,
      status,
      interpreter,
      proposal: status === 'pending' ? proposal : null,
      clarification: row.clarification,
    }
  }

  /**
   * Saves the proposal (optionally corrected by the user) as a set.
   * Idempotent: the interpretation carries its own request id.
   */
  async confirm(user: User, interpretationId: number, overrides: Partial<ProposedSet> = {}) {
    const row = await AiInterpretation.query()
      .where('id', interpretationId)
      .where('user_id', user.id)
      .first()
    if (!row) throw new NotFoundException('Interpretación no encontrada.')
    if (row.status === 'rejected') throw new DomainException('Esa interpretación fue descartada.')
    const proposal = { ...(row.parsed.proposal as ProposedSet | null), ...overrides } as ProposedSet
    if (proposal.repetitions === null || proposal.repetitions === undefined) {
      throw new DomainException('Faltan las repeticiones para registrar la serie.')
    }
    const { set } = await new WorkoutLiveService().logSet(user, row.parsed.sessionExerciseId, {
      clientRequestId: row.parsed.requestId,
      weightValue: proposal.weightValue,
      weightUnit: proposal.weightValue === null ? null : (proposal.weightUnit ?? 'lb'),
      repetitions: proposal.repetitions,
      setType: proposal.setType,
      rir: proposal.rir,
      discomfort: proposal.discomfort,
      source: row.interpreter === 'llm' ? 'ai' : 'manual',
    })
    row.merge({ status: 'confirmed', appliedSetId: set.id })
    await row.save()
    return set
  }

  async reject(user: User, interpretationId: number) {
    await AiInterpretation.query()
      .where('id', interpretationId)
      .where('user_id', user.id)
      .whereNot('status', 'confirmed')
      .update({ status: 'rejected' })
  }

  /**
   * Fills "mismo peso" / "otra igual" from the last set of the exercise —
   * an explicit reference by the user, not a guess — and a missing unit from
   * the unit that exercise is logged in.
   */
  #resolve(
    parsed: ParsedSet,
    last: {
      weightValue: number | null
      weightUnit: WeightUnit | null
      repetitions: number | null
      setType: string
    } | null,
    preferred: WeightUnit
  ) {
    const problems: string[] = []
    if (parsed.repeatLast) {
      if (!last)
        return {
          proposal: null,
          problems: ['Aún no hay una serie anterior que repetir en este ejercicio.'],
        }
      return {
        proposal: {
          weightValue: last.weightValue,
          weightUnit: last.weightUnit,
          repetitions: last.repetitions,
          setType: last.setType as ProposedSet['setType'],
          rir: null,
          discomfort: parsed.discomfort,
        },
        problems,
      }
    }
    let weightValue = parsed.weightValue
    let weightUnit = parsed.weightUnit
    if (parsed.sameWeightAsLast && weightValue === null) {
      if (!last || last.weightValue === null)
        problems.push('No hay un peso anterior en este ejercicio.')
      else {
        weightValue = last.weightValue
        weightUnit = last.weightUnit
      }
    }
    if (weightValue !== null && weightUnit === null) weightUnit = last?.weightUnit ?? preferred
    if (parsed.repetitions === null) return { proposal: null, problems }
    return {
      proposal: {
        weightValue,
        weightUnit,
        repetitions: parsed.repetitions,
        setType: parsed.setType ?? 'working',
        rir: parsed.rir,
        discomfort: parsed.discomfort,
      },
      problems,
    }
  }
}
