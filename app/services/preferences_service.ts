import type User from '#models/user'
import UserPreference from '#models/user_preference'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

export default class PreferencesService {
  /**
   * The user's preferences, created with defaults on first access.
   */
  static async for(user: User, client?: TransactionClientContract): Promise<UserPreference> {
    const query = client ? UserPreference.query({ client }) : UserPreference.query()
    const existing = await query.where('user_id', user.id).first()
    if (existing) return existing
    const created = await UserPreference.firstOrCreate({ userId: user.id }, {}, { client })
    // pull the column defaults the database filled in
    await created.refresh()
    return created
  }

  /**
   * "Today" in the user's own timezone — what a workout date means to them.
   */
  static today(preferences: Pick<UserPreference, 'timezone'>): string {
    return DateTime.now().setZone(preferences.timezone).toISODate()!
  }
}
