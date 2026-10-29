import { ExerciseAliasSchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Exercise from '#models/exercise'

export default class ExerciseAlias extends ExerciseAliasSchema {
  @belongsTo(() => Exercise)
  declare exercise: BelongsTo<typeof Exercise>
}
