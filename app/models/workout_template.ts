import { WorkoutTemplateSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import WorkoutTemplateExercise from '#models/workout_template_exercise'

export default class WorkoutTemplate extends WorkoutTemplateSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @hasMany(() => WorkoutTemplateExercise, {
    foreignKey: 'templateId',
    onQuery: (query) => query.orderBy('order_index', 'asc'),
  })
  declare exercises: HasMany<typeof WorkoutTemplateExercise>
}
