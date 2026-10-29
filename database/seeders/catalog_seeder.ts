import { BaseSeeder } from '@adonisjs/lucid/seeders'
import db from '@adonisjs/lucid/services/db'
import { EXERCISES, MUSCLE_GROUPS } from '#database/data/catalog'
import ExerciseCatalogService from '#services/exercise_catalog_service'

/**
 * The shared exercise catalog. Idempotent: re-running updates names and
 * metadata in place, by slug, and never touches users' own exercises.
 */
export default class extends BaseSeeder {
  static environment = ['development', 'production', 'test']

  async run() {
    await db.transaction(async (trx) => {
      const now = new Date()
      await trx
        .table('muscle_groups')
        .insert(MUSCLE_GROUPS.map((m) => ({ ...m, created_at: now, updated_at: now })))
        .onConflict('slug')
        .merge(['name', 'region', 'updated_at'])
      const muscleRows = await trx.from('muscle_groups').select('id', 'slug')
      const muscles = new Map<string, number>(muscleRows.map((r: any) => [r.slug, r.id]))

      for (const item of EXERCISES) {
        const values = {
          name: item.name,
          equipment: item.equipment,
          exercise_type: item.exerciseType,
          default_weight_basis: item.basis,
          per_hand_multiplier: item.perHandMultiplier ?? null,
          load_increment: item.increment ?? 5,
          load_increment_unit: 'lb',
          supports_e1rm: item.supportsE1rm ?? true,
          technique: item.technique ?? null,
          tips: item.tips ?? null,
          updated_at: now,
        }
        const existing = await trx
          .from('exercises')
          .whereNull('user_id')
          .where('slug', item.slug)
          .first()
        let id: number
        if (existing) {
          await trx.from('exercises').where('id', existing.id).update(values)
          id = existing.id
        } else {
          const [row] = await trx
            .table('exercises')
            .insert({ ...values, slug: item.slug, user_id: null, created_at: now })
            .returning('id')
          id = row.id
        }

        await trx.from('exercise_muscle_groups').where('exercise_id', id).delete()
        const links = [
          ...item.primary.map((slug) => ({ slug, role: 'primary' })),
          ...(item.secondary ?? []).map((slug) => ({ slug, role: 'secondary' })),
        ]
        await trx.table('exercise_muscle_groups').insert(
          links.map((l) => ({
            exercise_id: id,
            muscle_group_id: muscles.get(l.slug)!,
            role: l.role,
          }))
        )

        const aliases = [item.name, ...(item.aliases ?? [])]
        for (const alias of aliases) {
          await trx.rawQuery(
            `INSERT INTO exercise_aliases (exercise_id, user_id, alias, normalized_alias, created_at, updated_at)
             VALUES (?, NULL, ?, ?, ?, ?)
             ON CONFLICT ((COALESCE(user_id, 0)), normalized_alias) DO NOTHING`,
            [id, alias, ExerciseCatalogService.normalize(alias), now, now]
          )
        }
      }
    })
  }
}
