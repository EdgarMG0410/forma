import { BaseSchema } from '@adonisjs/lucid/schema'

const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'smith_machine',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
] as const

const WEIGHT_BASES = ['total', 'per_hand', 'machine_display', 'unknown'] as const

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('muscle_groups', (table) => {
      table.increments('id')
      table.string('slug', 64).notNullable().unique()
      table.string('name', 120).notNullable()
      table.enum('region', ['upper', 'lower', 'core', 'full']).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.schema.createTable('exercises', (table) => {
      table.increments('id')
      // null user_id = shared catalog entry; otherwise a user's own exercise
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('slug', 120).notNullable()
      table.string('name', 160).notNullable()
      table.enum('equipment', EQUIPMENT).notNullable().defaultTo('other')
      table.enum('exercise_type', ['compound', 'isolation']).notNullable().defaultTo('compound')
      table.enum('default_weight_basis', WEIGHT_BASES).notNullable().defaultTo('total')
      // explicit conversion from a per-hand number to total load (e.g. 2 dumbbells)
      table.smallint('per_hand_multiplier').nullable()
      table.decimal('load_increment', 8, 2).notNullable().defaultTo(5)
      table.enum('load_increment_unit', ['lb', 'kg']).notNullable().defaultTo('lb')
      table.boolean('is_unilateral').notNullable().defaultTo(false)
      table.boolean('supports_e1rm').notNullable().defaultTo(true)
      table.text('technique').nullable()
      table.text('tips').nullable()
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['user_id'])
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX exercises_global_slug_unique ON exercises (slug) WHERE user_id IS NULL'
    )
    this.schema.raw(
      'CREATE UNIQUE INDEX exercises_user_slug_unique ON exercises (user_id, slug) WHERE user_id IS NOT NULL'
    )

    this.schema.createTable('exercise_aliases', (table) => {
      table.increments('id')
      table
        .integer('exercise_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('exercises')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('alias', 160).notNullable()
      table.string('normalized_alias', 160).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['normalized_alias'])
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX exercise_aliases_scope_unique ON exercise_aliases (COALESCE(user_id, 0), normalized_alias)'
    )

    this.schema.createTable('exercise_muscle_groups', (table) => {
      table
        .integer('exercise_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('exercises')
        .onDelete('CASCADE')
      table
        .integer('muscle_group_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('muscle_groups')
        .onDelete('CASCADE')
      table.enum('role', ['primary', 'secondary']).notNullable().defaultTo('primary')
      table.primary(['exercise_id', 'muscle_group_id'])
      table.index(['muscle_group_id'])
    })
  }

  async down() {
    this.schema.dropTable('exercise_muscle_groups')
    this.schema.dropTable('exercise_aliases')
    this.schema.dropTable('exercises')
    this.schema.dropTable('muscle_groups')
  }
}
