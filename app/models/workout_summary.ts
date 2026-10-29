import { WorkoutSummarySchema } from '#database/schema'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import WorkoutSession from '#models/workout_session'

export default class WorkoutSummary extends WorkoutSummarySchema {
  @belongsTo(() => WorkoutSession, { foreignKey: 'sessionId' })
  declare session: BelongsTo<typeof WorkoutSession>
}
