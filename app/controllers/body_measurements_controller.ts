import type { HttpContext } from '@adonisjs/core/http'
import BodyMeasurement from '#models/body_measurement'
import { bodyMeasurementValidator } from '#validators/library'
import { BODY_SITES } from '#domain/enums'
import PreferencesService from '#services/preferences_service'
import { NotFoundException } from '#exceptions/domain_exception'

export default class BodyMeasurementsController {
  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const preferences = await PreferencesService.for(user)
    const rows = await BodyMeasurement.query()
      .where('user_id', user.id)
      .orderBy('measured_on', 'desc')
      .orderBy('id', 'desc')
      .limit(200)
    return inertia.render('body/index', {
      units: { weight: preferences.weightUnit, length: preferences.lengthUnit },
      measurements: rows.map((m) => ({
        id: m.id,
        measuredOn: m.measuredOn.toISODate()!,
        bodyWeight: m.bodyWeight,
        bodyWeightUnit: m.bodyWeightUnit,
        bodyFatPct: m.bodyFatPct,
        lengthUnit: m.lengthUnit,
        sites: Object.fromEntries(BODY_SITES.map((site) => [site, m[site]])) as Record<
          (typeof BODY_SITES)[number],
          number | null
        >,
        notes: m.notes,
        source: m.source,
      })),
    })
  }

  async store({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const payload = await request.validateUsing(bodyMeasurementValidator)
    await BodyMeasurement.create({ ...this.#columns(payload), userId: user.id, source: 'manual' })
    session.flash('success', 'Medición guardada.')
    return response.redirect().back()
  }

  async update({ auth, params, request, response, session }: HttpContext) {
    const measurement = await this.#owned(auth.getUserOrFail().id, Number(params.id))
    const payload = await request.validateUsing(bodyMeasurementValidator)
    measurement.merge(this.#columns(payload))
    await measurement.save()
    session.flash('success', 'Medición actualizada.')
    return response.redirect().back()
  }

  async destroy({ auth, params, response, session }: HttpContext) {
    const measurement = await this.#owned(auth.getUserOrFail().id, Number(params.id))
    await measurement.delete()
    session.flash('success', 'Medición eliminada.')
    return response.redirect().back()
  }

  #columns(payload: Record<string, any>) {
    return {
      measuredOn: payload.measuredOn,
      bodyWeight: payload.bodyWeight ?? null,
      bodyWeightUnit: payload.bodyWeight ? (payload.bodyWeightUnit ?? 'lb') : null,
      bodyFatPct: payload.bodyFatPct ?? null,
      lengthUnit: payload.lengthUnit,
      notes: payload.notes ?? null,
      ...Object.fromEntries(BODY_SITES.map((site) => [site, payload[site] ?? null])),
    }
  }

  async #owned(userId: number, id: number) {
    const m = await BodyMeasurement.query().where('id', id).where('user_id', userId).first()
    if (!m) throw new NotFoundException('Medición no encontrada.')
    return m
  }
}
