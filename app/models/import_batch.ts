import { ImportBatchSchema } from '#database/schema'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import ImportRecord from '#models/import_record'

export default class ImportBatch extends ImportBatchSchema {
  @hasMany(() => ImportRecord, { foreignKey: 'batchId' })
  declare records: HasMany<typeof ImportRecord>
}
