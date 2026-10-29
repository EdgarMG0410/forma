import { WorkoutTemplateSetSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import WorkoutTemplateExercise from '#models/workout_template_exercise'

export default class WorkoutTemplateSet extends WorkoutTemplateSetSchema {
  @belongsTo(() => WorkoutTemplateExercise, { foreignKey: 'templateExerciseId' })
  declare templateExercise: BelongsTo<typeof WorkoutTemplateExercise>
}
