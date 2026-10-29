import type { HttpContext } from '@adonisjs/core/http'
import AnalyticsService from '#services/analytics_service'

export default class DashboardController {
  async index({ inertia, auth }: HttpContext) {
    const dashboard = await new AnalyticsService().dashboard(auth.getUserOrFail())
    return inertia.render('dashboard', { dashboard })
  }
}
