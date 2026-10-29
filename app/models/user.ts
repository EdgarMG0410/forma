import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import UserPreference from '#models/user_preference'
import WorkoutSession from '#models/workout_session'
import WorkoutTemplate from '#models/workout_template'
import BodyMeasurement from '#models/body_measurement'
import Exercise from '#models/exercise'

export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  @hasOne(() => UserPreference)
  declare preferences: HasOne<typeof UserPreference>

  @hasMany(() => WorkoutSession)
  declare workoutSessions: HasMany<typeof WorkoutSession>

  @hasMany(() => WorkoutTemplate)
  declare workoutTemplates: HasMany<typeof WorkoutTemplate>

  @hasMany(() => BodyMeasurement)
  declare bodyMeasurements: HasMany<typeof BodyMeasurement>

  @hasMany(() => Exercise)
  declare customExercises: HasMany<typeof Exercise>

  get firstName() {
    return this.fullName?.split(' ')[0] ?? this.email.split('@')[0]
  }

  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
