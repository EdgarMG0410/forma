import { WorkoutSetSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import WorkoutSessionExercise from '#models/workout_session_exercise'

export default class WorkoutSet extends WorkoutSetSchema {
  @belongsTo(() => WorkoutSessionExercise, { foreignKey: 'sessionExerciseId' })
  declare sessionExercise: BelongsTo<typeof WorkoutSessionExercise>
}
