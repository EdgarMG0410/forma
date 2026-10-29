import { column } from '@adonisjs/lucid/orm'

/**
 * JSONB column. `pg` would otherwise send a JS array as a Postgres array
 * literal (`{a,b}`), which is not valid JSON; values are stringified on the
 * way in, and parsed on the way out when the driver hands back a string.
 */
export function jsonColumn(options: Parameters<typeof column>[0] = {}) {
  return column({
    prepare: (value: unknown) =>
      value === null || value === undefined ? value : JSON.stringify(value),
    consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
    ...options,
  })
}
