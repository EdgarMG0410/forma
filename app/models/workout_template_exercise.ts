import { WorkoutTemplateExerciseSchema } from '#database/schema'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Exercise from '#models/exercise'
import WorkoutTemplate from '#models/workout_template'
import WorkoutTemplateSet from '#models/workout_template_set'

export default class WorkoutTemplateExercise extends WorkoutTemplateExerciseSchema {
  @belongsTo(() => WorkoutTemplate, { foreignKey: 'templateId' })
  declare template: BelongsTo<typeof WorkoutTemplate>

  @belongsTo(() => Exercise)
  declare exercise: BelongsTo<typeof Exercise>

  @hasMany(() => WorkoutTemplateSet, {
    foreignKey: 'templateExerciseId',
    onQuery: (query) => query.orderBy('set_number', 'asc'),
  })
  declare sets: HasMany<typeof WorkoutTemplateSet>
}
