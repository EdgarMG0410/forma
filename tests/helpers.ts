import User from '#models/user'
import UserPreference from '#models/user_preference'
import Exercise from '#models/exercise'
import WorkoutLiveService from '#services/workout_live_service'
import { randomUUID } from 'node:crypto'

let seq = 0

export async function createUser(overrides: Partial<{ email: string; fullName: string }> = {}) {
  seq += 1
  const user = await User.create({
    email: overrides.email ?? `athlete${seq}-${Date.now()}@forma.test`,
    fullName: overrides.fullName ?? `Atleta ${seq}`,
    password: 'secret-password-1',
  })
  await UserPreference.create({ userId: user.id })
  return user
}

export async function exercise(slug: string) {
  return Exercise.query().whereNull('user_id').where('slug', slug).firstOrFail()
}

/**
 * A live session with one exercise added, ready for sets.
 */
export async function liveSessionWith(user: User, slug = 'leg-press', targetSets = 3) {
  const live = new WorkoutLiveService()
  const { session } = await live.start(user, { name: 'Pierna' })
  const ex = await exercise(slug)
  const se = await live.addExercise(user, session.id, {
    exerciseId: ex.id,
    targetSets,
    targetRepsMin: 8,
    targetRepsMax: 12,
  })
  return { session, sessionExercise: se, exercise: ex, live }
}

export const rid = () => randomUUID()
