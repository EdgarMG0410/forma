import { MuscleGroupSchema } from '#database/schema'
import { manyToMany } from '@adonisjs/lucid/orm'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'
import Exercise from '#models/exercise'

export default class MuscleGroup extends MuscleGroupSchema {
  @manyToMany(() => Exercise, {
    pivotTable: 'exercise_muscle_groups',
    pivotColumns: ['role'],
  })
  declare exercises: ManyToMany<typeof Exercise>
}
