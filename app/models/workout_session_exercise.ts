import { WorkoutSessionExerciseSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Exercise from '#models/exercise'
import WorkoutSession from '#models/workout_session'
import WorkoutSet from '#models/workout_set'

export default class WorkoutSessionExercise extends WorkoutSessionExerciseSchema {
  @belongsTo(() => WorkoutSession, { foreignKey: 'sessionId' })
  declare session: BelongsTo<typeof WorkoutSession>

  @belongsTo(() => Exercise)
  declare exercise: BelongsTo<typeof Exercise>

  @hasMany(() => WorkoutSet, {
    foreignKey: 'sessionExerciseId',
    onQuery: (query) => query.orderBy('set_number', 'asc'),
  })
  declare sets: HasMany<typeof WorkoutSet>
}
