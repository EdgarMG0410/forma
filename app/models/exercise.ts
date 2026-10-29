import { ExerciseSchema } from '#database/schema'
import { belongsTo, hasMany, manyToMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import MuscleGroup from '#models/muscle_group'
import ExerciseAlias from '#models/exercise_alias'

export default class Exercise extends ExerciseSchema {
  @belongsTo(() => User)
  declare owner: BelongsTo<typeof User>

  @hasMany(() => ExerciseAlias)
  declare aliases: HasMany<typeof ExerciseAlias>

  @manyToMany(() => MuscleGroup, {
    pivotTable: 'exercise_muscle_groups',
    pivotColumns: ['role'],
  })
  declare muscleGroups: ManyToMany<typeof MuscleGroup>

  /**
   * The exercises a user can see: the shared catalog plus their own.
   */
  static visibleTo = scope((query, userId: number) => {
    query.where((q) => q.whereNull('user_id').orWhere('user_id', userId))
  })

  get isCustom() {
    return this.userId !== null
  }
}
