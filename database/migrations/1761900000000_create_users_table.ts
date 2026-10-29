import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('users', (table) => {
      table.increments('id').notNullable()
      table.string('full_name').nullable()
      table.string('email', 254).notNullable().unique()
      table.string('password').notNullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.schema.createTable('user_preferences', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enum('weight_unit', ['lb', 'kg']).notNullable().defaultTo('lb')
      table.enum('length_unit', ['cm', 'in']).notNullable().defaultTo('cm')
      table.enum('theme', ['dark', 'light', 'system']).notNullable().defaultTo('dark')
      table.string('timezone', 64).notNullable().defaultTo('America/Mexico_City')
      table.string('locale', 16).notNullable().defaultTo('es')
      table
        .enum('training_goal', ['strength', 'hypertrophy', 'recomposition', 'general'])
        .notNullable()
        .defaultTo('hypertrophy')
      table.smallint('weekly_sessions_goal').notNullable().defaultTo(4)
      table.integer('default_rest_seconds').notNullable().defaultTo(120)
      table.smallint('default_reps_min').notNullable().defaultTo(8)
      table.smallint('default_reps_max').notNullable().defaultTo(12)
      table.boolean('track_rir').notNullable().defaultTo(false)
      table.boolean('auto_start_rest_timer').notNullable().defaultTo(true)
      // AI is an opt-in interpretation layer; body/health data needs its own consent
      table.boolean('ai_enabled').notNullable().defaultTo(false)
      table.boolean('ai_share_body_data').notNullable().defaultTo(false)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable('user_preferences')
    this.schema.dropTable('users')
  }
}
