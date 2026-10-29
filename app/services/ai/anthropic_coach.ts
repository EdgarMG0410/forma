import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import logger from '@adonisjs/core/services/logger'
import type {
  AIWorkoutCoach,
  CoachContext,
  CoachInterpretation,
  SummaryDigest,
} from '#services/ai/ai_workout_coach'

const InterpretationSchema = z.object({
  weight: z.number().nullable().describe('Weight stated in the message, or null if not stated'),
  unit: z
    .enum(['lb', 'kg'])
    .nullable()
    .describe('Unit stated in the message, or null if not stated'),
  reps: z
    .number()
    .int()
    .nullable()
    .describe('Repetitions stated in the message, or null if not stated'),
  set_type: z.enum(['warmup', 'working', 'dropset']).nullable(),
  rir: z.number().nullable(),
  same_weight_as_last: z.boolean(),
  repeat_last: z.boolean(),
  discomfort: z.boolean(),
  ambiguities: z
    .array(z.string())
    .describe('Spanish, one short sentence per thing that is unclear'),
})

const INTERPRET_SYSTEM = `Extraes datos de una serie de entrenamiento a partir de un mensaje corto en español o inglés.
Reglas:
- Usa solo lo que el mensaje dice. Si un dato no aparece, devuélvelo como null. Nunca completes con valores típicos ni con la serie anterior.
- Si no está claro qué número es el peso y cuál las repeticiones, deja ambos en null y explica la duda en "ambiguities".
- "mismo peso" activa same_weight_as_last; "otra igual" o "repite" activa repeat_last.
- Marca discomfort si el mensaje menciona dolor o molestia. No interpretes ni diagnostiques nada médico.`

const SUMMARY_SYSTEM = `Escribes el resumen de una sesión de fuerza para su autor, en español neutro, en 2 a 4 frases.
Usa solo los datos proporcionados; no inventes cifras ni compares con nada que no esté en ellos.
Tono directo y sobrio, sin exclamaciones ni emojis. No des consejos médicos.
Termina con lo más útil para la próxima sesión.`

/**
 * Claude-backed coach (official SDK). Structured output is schema-validated;
 * a refusal or any API error returns null and the app carries on with the
 * deterministic path.
 */
export class AnthropicCoach implements AIWorkoutCoach {
  readonly name = 'anthropic'
  readonly available = true
  #client: Anthropic

  constructor(
    apiKey: string | undefined,
    private model: string
  ) {
    this.#client = new Anthropic(apiKey ? { apiKey } : {})
  }

  async interpret(message: string, context: CoachContext): Promise<CoachInterpretation | null> {
    try {
      const response = await this.#client.beta.messages.parse({
        model: this.model,
        max_tokens: 1024,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: betaZodOutputFormat(InterpretationSchema) },
        system: INTERPRET_SYSTEM,
        messages: [
          {
            role: 'user',
            content: `Ejercicio: ${context.exerciseName} (objetivo ${context.targetRepsMin}–${context.targetRepsMax} reps, unidad habitual ${context.unit}).\nMensaje: ${message}`,
          },
        ],
      })
      if (response.stop_reason === 'refusal' || !response.parsed_output) return null
      const out = response.parsed_output
      return {
        parsed: {
          weightValue: out.weight,
          weightUnit: out.unit,
          repetitions: out.reps,
          setType: out.set_type,
          rir: out.rir,
          sameWeightAsLast: out.same_weight_as_last,
          repeatLast: out.repeat_last,
          discomfort: out.discomfort,
        },
        confidence: out.ambiguities.length ? 0.4 : 0.75,
        ambiguities: out.ambiguities,
      }
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        logger.warn({ status: error.status }, 'AI coach interpret failed')
        return null
      }
      throw error
    }
  }

  async summarize(digest: SummaryDigest): Promise<string | null> {
    try {
      const response = await this.#client.beta.messages.create({
        model: this.model,
        max_tokens: 2048,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: SUMMARY_SYSTEM,
        messages: [{ role: 'user', content: JSON.stringify(digest) }],
      })
      if (response.stop_reason === 'refusal') return null
      const text = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim()
      return text || null
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        logger.warn({ status: error.status }, 'AI coach summary failed')
        return null
      }
      throw error
    }
  }
}
