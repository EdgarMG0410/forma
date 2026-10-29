import User from '#models/user'
import UserPreference from '#models/user_preference'
import db from '@adonisjs/lucid/services/db'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

export default class NewAccountController {
  async create({ inertia }: HttpContext) {
    return inertia.render('auth/signup', {})
  }

  async store({ request, response, auth }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(signupValidator)
    const user = await db.transaction(async (trx) => {
      const created = await User.create({ fullName, email, password }, { client: trx })
      await UserPreference.create({ userId: created.id }, { client: trx })
      return created
    })

    await auth.use('web').login(user)
    response.redirect().toRoute('dashboard')
  }
}
