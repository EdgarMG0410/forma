import env from '#start/env'
import type { AIWorkoutCoach } from '#services/ai/ai_workout_coach'
import { NullCoach } from '#services/ai/ai_workout_coach'
import { AnthropicCoach } from '#services/ai/anthropic_coach'

/**
 * The coach configured for this deployment (AI_PROVIDER). The per-user
 * switch lives in user_preferences.ai_enabled and is checked by callers.
 */
export function makeCoach(): AIWorkoutCoach {
  if (env.get('AI_PROVIDER', 'none') === 'anthropic') {
    return new AnthropicCoach(
      env.get('ANTHROPIC_API_KEY')?.release(),
      env.get('AI_MODEL') ?? 'claude-opus-5-5'
    )
  }
  return new NullCoach()
}
