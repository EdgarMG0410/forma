import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('workout_templates', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('name', 160).notNullable()
      table.text('description').nullable()
      table.string('focus', 64).nullable()
      table.integer('position').notNullable().defaultTo(0)
      table.timestamp('archived_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['user_id', 'archived_at'])
    })

    this.schema.createTable('workout_template_exercises', (table) => {
      table.increments('id')
      table
        .integer('template_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('workout_templates')
        .onDelete('CASCADE')
      table
        .integer('exercise_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('exercises')
        .onDelete('RESTRICT')
      table.integer('order_index').notNullable()
      table.integer('rest_seconds').nullable()
      table.text('notes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['template_id', 'order_index'])
    })

    this.schema.createTable('workout_template_sets', (table) => {
      table.increments('id')
      table
        .integer('template_exercise_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('workout_template_exercises')
        .onDelete('CASCADE')
      table.smallint('set_number').notNullable()
      table.enum('set_type', ['warmup', 'working', 'dropset']).notNullable().defaultTo('working')
      table.smallint('target_reps_min').notNullable()
      table.smallint('target_reps_max').notNullable()
      table.decimal('target_weight_value', 8, 2).nullable()
      table.enum('target_weight_unit', ['lb', 'kg']).nullable()
      table.smallint('target_rir').nullable()
      table.integer('rest_seconds').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.check('target_reps_min > 0 AND target_reps_max >= target_reps_min')
    })
    this.schema.raw(`
      ALTER TABLE workout_template_sets
      ADD CONSTRAINT workout_template_sets_number_unique
      UNIQUE (template_exercise_id, set_number) DEFERRABLE INITIALLY DEFERRED
    `)
  }

  async down() {
    this.schema.dropTable('workout_template_sets')
    this.schema.dropTable('workout_template_exercises')
    this.schema.dropTable('workout_templates')
  }
}
