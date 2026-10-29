import { BaseSchema } from '@adonisjs/lucid/schema'

const SOURCES = ['manual', 'template', 'import', 'ai'] as const
const CONFIDENCE = ['exact', 'high', 'medium', 'low', 'unknown'] as const

export default class extends BaseSchema {
  async up() {
    this.schema.createTable('workout_sessions', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('template_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('workout_templates')
        .onDelete('SET NULL')
      table.string('name', 160).notNullable()
      table
        .enum('status', ['draft', 'active', 'paused', 'completed', 'cancelled'])
        .notNullable()
        .defaultTo('draft')
      table.date('workout_date').notNullable()
      table.enum('date_confidence', CONFIDENCE).notNullable().defaultTo('exact')
      table.timestamp('started_at', { useTz: true }).nullable()
      table.timestamp('paused_at', { useTz: true }).nullable()
      table.integer('paused_seconds').notNullable().defaultTo(0)
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.text('notes').nullable()
      table.enum('source', SOURCES).notNullable().defaultTo('manual')
      table.string('external_id', 191).nullable()
      table
        .enum('data_quality', ['complete', 'partial', 'incomplete'])
        .notNullable()
        .defaultTo('complete')
      table
        .integer('import_batch_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('import_batches')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['user_id', 'workout_date'])
      table.index(['user_id', 'status'])
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX workout_sessions_external_unique ON workout_sessions (user_id, external_id) WHERE external_id IS NOT NULL'
    )
    // at most one live session per user — the race-proof guard for "Iniciar entrenamiento"
    this.schema.raw(
      "CREATE UNIQUE INDEX workout_sessions_one_live ON workout_sessions (user_id) WHERE status IN ('active', 'paused')"
    )

    this.schema.createTable('workout_session_exercises', (table) => {
      table.increments('id')
      table
        .integer('session_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('workout_sessions')
        .onDelete('CASCADE')
      table
        .integer('exercise_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('exercises')
        .onDelete('RESTRICT')
      table
        .integer('template_exercise_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('workout_template_exercises')
        .onDelete('SET NULL')
      table
        .integer('substituted_from_exercise_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('exercises')
        .onDelete('SET NULL')
      table.integer('order_index').notNullable()
      table
        .enum('status', ['pending', 'in_progress', 'completed', 'skipped'])
        .notNullable()
        .defaultTo('pending')
      table.smallint('target_sets').notNullable().defaultTo(3)
      table.smallint('target_reps_min').notNullable().defaultTo(8)
      table.smallint('target_reps_max').notNullable().defaultTo(12)
      table.integer('rest_seconds').nullable()
      table.text('notes').nullable()
      table.string('external_id', 191).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['session_id', 'order_index'])
      table.index(['exercise_id'])
      table.check('target_reps_min > 0 AND target_reps_max >= target_reps_min')
    })
    this.schema.raw(
      'CREATE UNIQUE INDEX workout_session_exercises_external_unique ON workout_session_exercises (session_id, external_id) WHERE external_id IS NOT NULL'
    )

    this.schema.createTable('workout_sets', (table) => {
      table.increments('id')
      table
        .integer('session_exercise_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('workout_session_exercises')
        .onDelete('CASCADE')
      // denormalised owner for fast per-user analytics; always written by the service
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.smallint('set_number').notNullable()
      table.enum('set_type', ['warmup', 'working', 'dropset']).notNullable().defaultTo('working')
      // what was captured, untouched
      table.decimal('weight_value', 8, 2).nullable()
      table.enum('weight_unit', ['lb', 'kg']).nullable()
      table
        .enum('weight_basis', ['total', 'per_hand', 'machine_display', 'unknown'])
        .notNullable()
        .defaultTo('total')
      // normalised copies of weight_value (same basis), for comparisons
      table.decimal('weight_kg', 10, 4).nullable()
      table.decimal('weight_lb', 10, 4).nullable()
      table.smallint('repetitions').nullable()
      table.decimal('rir', 3, 1).nullable()
      table.decimal('rpe', 3, 1).nullable()
      table.boolean('technique_ok').nullable()
      table.boolean('discomfort').notNullable().defaultTo(false)
      table.text('notes').nullable()
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.enum('source', ['manual', 'import', 'ai']).notNullable().defaultTo('manual')
      table
        .enum('confidence', ['exact', 'high', 'medium', 'low', 'unknown'])
        .notNullable()
        .defaultTo('exact')
      table.string('external_id', 191).nullable()
      // idempotency key sent by the client for each "Registrar serie" tap
      table.uuid('client_request_id').nullable().unique()
      // a user correction is the final word: imports and AI never overwrite it
      table.boolean('user_corrected').notNullable().defaultTo(false)
      table
        .integer('import_batch_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('import_batches')
        .onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['user_id', 'completed_at'])
      table.check('repetitions IS NULL OR repetitions >= 0')
      table.check('weight_value IS NULL OR weight_value >= 0')
      table.check('rir IS NULL OR (rir >= 0 AND rir <= 10)')
      table.check('rpe IS NULL OR (rpe >= 1 AND rpe <= 10)')
      table.check('(weight_value IS NULL) = (weight_unit IS NULL)')
    })
    this.schema.raw(`
      ALTER TABLE workout_sets
      ADD CONSTRAINT workout_sets_number_unique
      UNIQUE (session_exercise_id, set_number) DEFERRABLE INITIALLY DEFERRED
    `)
    this.schema.raw(
      'CREATE UNIQUE INDEX workout_sets_external_unique ON workout_sets (session_exercise_id, external_id) WHERE external_id IS NOT NULL'
    )

    this.schema.createTable('workout_set_edits', (table) => {
      table.increments('id')
      // no FK: the audit row must outlive a deleted set
      table.integer('set_id').notNullable()
      table.integer('session_exercise_id').notNullable()
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.enum('action', ['update', 'delete']).notNullable()
      table.jsonb('before').notNullable()
      table.jsonb('after').nullable()
      table.string('reason', 255).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.index(['set_id'])
      table.index(['session_exercise_id'])
    })
  }

  async down() {
    this.schema.dropTable('workout_set_edits')
    this.schema.dropTable('workout_sets')
    this.schema.dropTable('workout_session_exercises')
    this.schema.dropTable('workout_sessions')
  }
}
