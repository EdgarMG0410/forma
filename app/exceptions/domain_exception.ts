import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * A rule of the training domain was broken (finishing a cancelled session,
 * logging into someone else's workout…). For page visits it flashes the
 * message and goes back; JSON callers get the status and message.
 */
export default class DomainException extends Exception {
  static status = 422
  static code = 'E_DOMAIN'

  async handle(error: this, ctx: HttpContext): Promise<unknown> {
    if (ctx.request.header('x-inertia') || !ctx.request.accepts(['json'])) {
      ctx.session.flash('error', error.message)
      return ctx.response.redirect().back()
    }
    return ctx.response.status(error.status).send({ code: error.code, message: error.message })
  }
}

/**
 * Missing — or not yours, which is reported the same way so ids cannot be
 * probed. Page visits get the 404 page; form submissions go back with a
 * message.
 */
export class NotFoundException extends DomainException {
  static status = 404
  static code = 'E_NOT_FOUND'

  async handle(error: this, ctx: HttpContext): Promise<unknown> {
    if (
      ctx.request.method() === 'GET' &&
      !ctx.request.accepts(['html', 'json'])?.includes('json')
    ) {
      ctx.response.status(404)
      return ctx.inertia.render('errors/not_found', {})
    }
    return super.handle(error, ctx)
  }
}
