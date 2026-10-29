import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import User from '#models/user'
import { deleteAccountValidator, preferencesValidator, profileValidator } from '#validators/library'
import PreferencesService from '#services/preferences_service'
import DataExportService from '#services/data_export_service'
import DomainException from '#exceptions/domain_exception'

export default class SettingsController {
  async show({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const p = await PreferencesService.for(user)
    return inertia.render('settings/index', {
      profile: { fullName: user.fullName, email: user.email },
      settings: {
        weightUnit: p.weightUnit,
        lengthUnit: p.lengthUnit,
        theme: p.theme,
        timezone: p.timezone,
        trainingGoal: p.trainingGoal,
        weeklySessionsGoal: p.weeklySessionsGoal,
        defaultRestSeconds: p.defaultRestSeconds,
        defaultRepsMin: p.defaultRepsMin,
        defaultRepsMax: p.defaultRepsMax,
        trackRir: p.trackRir,
        autoStartRestTimer: p.autoStartRestTimer,
        aiEnabled: p.aiEnabled,
        aiShareBodyData: p.aiShareBodyData,
      },
      ai: { providerConfigured: (process.env.AI_PROVIDER ?? 'none') !== 'none' },
    })
  }

  async updateProfile({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { fullName } = await request.validateUsing(profileValidator)
    user.fullName = fullName ?? null
    await user.save()
    session.flash('success', 'Perfil actualizado.')
    return response.redirect().back()
  }

  async updatePreferences({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(preferencesValidator)
    if (payload.defaultRepsMax < payload.defaultRepsMin)
      throw new DomainException('El rango de repeticiones no es válido.')
    if (!DateTime.now().setZone(payload.timezone).isValid)
      throw new DomainException('Zona horaria no válida.')
    const preferences = await PreferencesService.for(user)
    preferences.merge({ ...payload, aiShareBodyData: payload.aiEnabled && payload.aiShareBodyData })
    await preferences.save()
    session.flash('success', 'Preferencias guardadas.')
    return response.redirect().back()
  }

  async export({ auth, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const data = await new DataExportService().export(user)
    response.header('content-type', 'application/json; charset=utf-8')
    response.attachment(`forma-export-${DateTime.now().toISODate()}.json`)
    return response.send(JSON.stringify(data, null, 2))
  }

  async destroyAccount({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { password } = await request.validateUsing(deleteAccountValidator)
    await User.verifyCredentials(user.email, password)
    await auth.use('web').logout()
    // every table hangs off users with ON DELETE CASCADE
    await user.delete()
    session.flash('success', 'Tu cuenta y todos tus datos fueron eliminados.')
    return response.redirect().toRoute('session.create')
  }
}
