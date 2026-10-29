import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import UserPreference from '#models/user_preference'

/**
 * Local-only account for trying the app. Never runs in production.
 * Sign in with dev@forma.test / forma-dev-2026.
 */
export default class extends BaseSeeder {
  static environment = ['development']

  async run() {
    const user = await User.firstOrCreate(
      { email: 'dev@forma.test' },
      { fullName: 'Atleta Dev', password: 'forma-dev-2026' }
    )
    await UserPreference.firstOrCreate({ userId: user.id }, {})
  }
}
