import string from '@adonisjs/core/helpers/string'
import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Exercise from '#models/exercise'

/**
 * Finding exercises by the many names people give them.
 */
export default class ExerciseCatalogService {
  constructor(private client: TransactionClientContract | typeof db = db) {}

  /**
   * "Extensión de Cuádriceps " → "extension de cuadriceps".
   */
  static normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  }

  static slugify(value: string): string {
    return string.slug(ExerciseCatalogService.normalize(value))
  }

  /**
   * Resolves an exercise visible to the user by slug first, then alias. The
   * user's own exercises and aliases win over the shared catalog.
   */
  async resolve(userId: number, input: { slug?: string | null; name?: string | null }) {
    const options = { client: this.client as TransactionClientContract }
    if (input.slug) {
      const bySlug = await Exercise.query(options)
        .where('slug', input.slug)
        .where((q) => q.whereNull('user_id').orWhere('user_id', userId))
        .orderByRaw('user_id IS NULL')
        .first()
      if (bySlug) return bySlug
    }
    for (const candidate of [input.name, input.slug?.replace(/-/g, ' ')]) {
      if (!candidate) continue
      const normalized = ExerciseCatalogService.normalize(candidate)
      const alias = await this.client
        .from('exercise_aliases as a')
        .join('exercises as e', 'e.id', 'a.exercise_id')
        .where('a.normalized_alias', normalized)
        .where((q) => q.whereNull('a.user_id').orWhere('a.user_id', userId))
        .where((q) => q.whereNull('e.user_id').orWhere('e.user_id', userId))
        .orderByRaw('a.user_id IS NULL')
        .select('e.id')
        .first()
      if (alias) return Exercise.query(options).where('id', alias.id).firstOrFail()
    }
    return null
  }
}
