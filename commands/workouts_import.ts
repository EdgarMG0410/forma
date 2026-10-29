import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { args, BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import User from '#models/user'
import WorkoutImportService from '#services/import/workout_import_service'

/**
 * node ace workouts:import path/to/seed-workouts.json --user=1 --dry-run
 */
export default class WorkoutsImport extends BaseCommand {
  static commandName = 'workouts:import'
  static description =
    'Import a versioned Forma history JSON for a user (idempotent by external_id)'
  static options: CommandOptions = { startApp: true }

  @args.string({ description: 'Path to the JSON file' })
  declare file: string

  @flags.string({ description: 'Id or email of the user that owns the history', required: true })
  declare user: string

  @flags.boolean({
    description: 'Validate and simulate everything, then roll back',
    default: false,
  })
  declare dryRun: boolean

  @flags.boolean({
    description: 'Create custom exercises for names not found in the catalog',
    default: false,
  })
  declare createMissing: boolean

  async run() {
    const user = /^\d+$/.test(this.user)
      ? await User.find(Number(this.user))
      : await User.findBy('email', this.user)
    if (!user) {
      this.logger.error(`User "${this.user}" not found`)
      this.exitCode = 1
      return
    }

    const raw = await readFile(this.file, 'utf8')
    const service = new WorkoutImportService()
    const file = await service.parse(raw)
    const fileHash = WorkoutImportService.hash(raw)

    const preview = await service.preview(user, file, fileHash)
    const unresolved = preview.exercises.filter((e) => e.resolvedId === null)
    this.logger.info(
      `${preview.totals.sessions} sessions · ${preview.totals.sets} sets · ${preview.totals.reps} reps · volume ${
        Object.entries(preview.totals.volumeByUnit)
          .map(([u, v]) => `${v.toLocaleString('en-US')} ${u}`)
          .join(' + ') || '0'
      }`
    )
    const table = this.ui.table()
    table.head(['Date', 'Session', 'Exercises', 'Sets', 'Reps', 'Action'])
    for (const s of preview.sessions)
      table.row([s.date, s.name, String(s.exercises), String(s.sets), String(s.reps), s.action])
    table.render()
    for (const e of preview.exercises) {
      this.logger.log(
        `  ${e.resolvedId ? this.colors.green('✓') : this.colors.yellow('?')} ${e.label} → ${e.resolvedName ?? (this.createMissing ? 'will be created' : 'UNRESOLVED')}`
      )
    }
    if (unresolved.length && !this.createMissing) {
      this.logger.warning(
        `${unresolved.length} exercise(s) unresolved: their sets will fail. Use --create-missing or add aliases.`
      )
    }

    const result = await service.run(user, file, {
      sourceName: basename(this.file),
      fileHash,
      dryRun: this.dryRun,
      createMissing: this.createMissing,
    })

    const summary = this.ui.table()
    summary.head(['Entity', 'created', 'updated', 'skipped', 'failed'])
    for (const [entity, c] of Object.entries(result.counts)) {
      summary.row([
        entity,
        String(c.created),
        String(c.updated),
        String(c.skipped),
        String(c.failed),
      ])
    }
    summary.render()
    for (const error of result.errors) this.logger.warning(error)
    this.logger.success(
      `${this.dryRun ? 'Dry run (rolled back)' : 'Imported'} — batch #${result.batchId}`
    )
  }
}
