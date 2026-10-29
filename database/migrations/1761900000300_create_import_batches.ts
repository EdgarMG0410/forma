import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Created before the workout tables so imported rows can point back to the
 * batch that produced them (and a batch can be reverted precisely).
 */
export default class extends BaseSchema {
  async up() {
    this.schema.createTable('import_batches', (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('source_name', 255).notNullable()
      table.string('schema_version', 16).notNullable()
      table.string('file_hash', 64).notNullable()
      table
        .enum('status', ['previewed', 'importing', 'imported', 'failed', 'reverted'])
        .notNullable()
        .defaultTo('previewed')
      table.boolean('dry_run').notNullable().defaultTo(false)
      table.jsonb('stats').notNullable().defaultTo('{}')
      table.jsonb('errors').notNullable().defaultTo('[]')
      table.jsonb('mappings').notNullable().defaultTo('{}')
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('reverted_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
      table.index(['user_id', 'created_at'])
    })

    this.schema.createTable('import_records', (table) => {
      table.increments('id')
      table
        .integer('batch_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('import_batches')
        .onDelete('CASCADE')
      table
        .enum('entity_type', ['exercise', 'session', 'session_exercise', 'set', 'body_measurement'])
        .notNullable()
      table.integer('entity_id').nullable()
      table.string('external_id', 191).nullable()
      table.enum('action', ['created', 'updated', 'skipped', 'failed']).notNullable()
      table
        .enum('confidence', ['exact', 'high', 'medium', 'low', 'unknown'])
        .notNullable()
        .defaultTo('unknown')
      // what the row looked like before an update, so revert can restore it
      table.jsonb('previous').nullable()
      table.text('message').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.index(['batch_id', 'entity_type'])
    })
  }

  async down() {
    this.schema.dropTable('import_records')
    this.schema.dropTable('import_batches')
  }
}
