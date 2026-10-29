import { WorkoutSessionSchema } from '#database/schema'
import { belongsTo, hasMany, hasOne, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { LIVE_STATUSES } from '#domain/enums'
import User from '#models/user'
import WorkoutTemplate from '#models/workout_template'
import WorkoutSessionExercise from '#models/workout_session_exercise'
import WorkoutSummary from '#models/workout_summary'

export default class WorkoutSession extends WorkoutSessionSchema {
  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => WorkoutTemplate, { foreignKey: 'templateId' })
  declare template: BelongsTo<typeof WorkoutTemplate>

  @hasMany(() => WorkoutSessionExercise, {
    foreignKey: 'sessionId',
    onQuery: (query) => query.orderBy('order_index', 'asc'),
  })
  declare exercises: HasMany<typeof WorkoutSessionExercise>

  @hasOne(() => WorkoutSummary, { foreignKey: 'sessionId' })
  declare summary: HasOne<typeof WorkoutSummary>

  static live = scope((query) => {
    query.whereIn('status', [...LIVE_STATUSES])
  })

  get isLive() {
    return LIVE_STATUSES.includes(this.status)
  }
}
