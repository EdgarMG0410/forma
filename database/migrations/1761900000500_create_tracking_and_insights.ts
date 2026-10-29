import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // one row per measuring moment — history, never columns on the user
    this.schema.createTable('body_measurements', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.date('measured_on').notNullable()
      table.decimal('body_weight', 6, 2).nullable()
      table.enum('body_weight_unit', ['lb', 'kg']).nullable()
      table.decimal('body_fat_pct', 4, 1).nullable()
      table.enum('length_unit', ['cm', 'in']).notNullable().defaultTo('cm')
      for (const site of [
        'waist',
        'chest',
        'shoulders',
        'biceps',
        'forearm',
        'hips',
        'thigh',
        'calf',
        'neck',
      ]) {
        table.decimal(site, 6, 2).nullable()
      }
      table.jsonb('photos').notNullable().defaultTo('[]')
      table.text('notes').nullable()
      table.enum('source', ['manual', 'import']).notNullable().defaultTo('manual')
      table.string('external_id', 191).nullable()
      table
        .integer('import_batch_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('import_batches')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['user_id', 'measured_on'])
      table.check('body_fat_pct IS NULL OR (body_fat_pct >= 0 AND body_fat_pct <= 80)')
      table.check('(body_weight IS NULL) = (body_weight_unit IS NULL)')
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX body_measurements_external_unique ON body_measurements (user_id, external_id) WHERE external_id IS NOT NULL'
    )

    this.schema.createTable('personal_records', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('exercise_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('exercises')
        .onDelete('CASCADE')
      table
        .enum('record_type', ['max_weight', 'max_reps', 'best_set_volume', 'estimated_1rm'])
        .notNullable()
      // the basis the record is comparable within (per-hand ≠ total ≠ machine display)
      table.enum('weight_basis', ['total', 'per_hand', 'machine_display', 'unknown']).notNullable()
      table.decimal('value', 12, 4).notNullable()
      table.string('value_unit', 16).notNullable()
      table.decimal('weight_value', 8, 2).nullable()
      table.enum('weight_unit', ['lb', 'kg']).nullable()
      table.smallint('repetitions').nullable()
      table
        .integer('set_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('workout_sets')
        .onDelete('SET NULL')
      table
        .integer('session_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('workout_sessions')
        .onDelete('SET NULL')
      table.decimal('previous_value', 12, 4).nullable()
      table.date('achieved_on').notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.unique(['user_id', 'exercise_id', 'record_type', 'weight_basis'])
      table.index(['user_id', 'achieved_on'])
    })

    this.schema.createTable('workout_recommendations', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('session_exercise_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('workout_session_exercises')
        .onDelete('CASCADE')
      table.smallint('set_number').notNullable()
      table.decimal('recommended_weight', 8, 2).nullable()
      table.enum('weight_unit', ['lb', 'kg']).nullable()
      table.smallint('target_reps_min').notNullable()
      table.smallint('target_reps_max').notNullable()
      table.integer('rest_seconds').notNullable()
      table.text('rationale').notNullable()
      table.decimal('confidence', 3, 2).notNullable()
      table.jsonb('warnings').notNullable().defaultTo('[]')
      table.jsonb('inputs').notNullable().defaultTo('{}')
      table.string('engine_version', 32).notNullable()
      table.enum('outcome', ['accepted', 'modified', 'ignored']).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['session_exercise_id', 'set_number'])
    })

    this.schema.createTable('workout_summaries', (table) => {
      table.increments('id')
      table
        .integer('session_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('workout_sessions')
        .onDelete('CASCADE')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.smallint('exercises_completed').notNullable()
      table.smallint('sets_count').notNullable()
      table.smallint('working_sets_count').notNullable()
      table.integer('total_reps').notNullable()
      table.decimal('volume_lb', 14, 2).notNullable()
      table.decimal('volume_kg', 14, 2).notNullable()
      table.integer('duration_seconds').nullable()
      table.jsonb('per_exercise').notNullable().defaultTo('[]')
      table.jsonb('comparison').notNullable().defaultTo('{}')
      table.jsonb('records').notNullable().defaultTo('[]')
      table.jsonb('observations').notNullable().defaultTo('[]')
      table.text('ai_narrative').nullable()
      table.string('share_token', 64).nullable().unique()
      table.timestamp('generated_at', { useTz: true }).notNullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })

    this.schema.createTable('ai_interpretations', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('session_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('workout_sessions')
        .onDelete('CASCADE')
      table.text('input_text').notNullable()
      table.jsonb('parsed').notNullable()
      table
        .enum('status', ['pending', 'confirmed', 'rejected', 'needs_clarification'])
        .notNullable()
      table.enum('interpreter', ['rules', 'llm']).notNullable()
      table.decimal('confidence', 3, 2).notNullable()
      table.text('clarification').nullable()
      table.integer('applied_set_id').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['user_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable('ai_interpretations')
    this.schema.dropTable('workout_summaries')
    this.schema.dropTable('workout_recommendations')
    this.schema.dropTable('personal_records')
    this.schema.dropTable('body_measurements')
  }
}
