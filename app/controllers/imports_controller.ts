import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import vine from '@vinejs/vine'
import Exercise from '#models/exercise'
import ImportBatch from '#models/import_batch'
import type User from '#models/user'
import DomainException from '#exceptions/domain_exception'
import WorkoutImportService, { type ExerciseMapping } from '#services/import/workout_import_service'

const uploadValidator = vine.create({
  file: vine.file({ size: '10mb', extnames: ['json'] }),
})

const commitValidator = vine.create({
  hash: vine.string().regex(/^[a-f0-9]{64}$/),
  sourceName: vine.string().trim().maxLength(255),
  mapping: vine.record(vine.string()).optional(),
})

/**
 * Upload → preview (nothing written) → fix exercise matches → import.
 * Between preview and import the file waits in storage under its hash.
 */
export default class ImportsController {
  #path(user: User, hash: string) {
    return app.makePath('storage', 'imports', `${user.id}-${hash}.json`)
  }

  async index({ inertia, auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const batches = await ImportBatch.query()
      .where('user_id', user.id)
      .where('dry_run', false)
      .orderBy('created_at', 'desc')
      .limit(30)
    return inertia.render('settings/import', {
      preview: null,
      catalog: [],
      batches: batches.map((b) => ({
        id: b.id,
        sourceName: b.sourceName,
        status: b.status,
        createdAt: b.createdAt.toISO()!,
        stats: b.stats as Record<string, Record<string, number>>,
        errors: (b.errors as string[]).slice(0, 20),
      })),
    })
  }

  async preview({ inertia, auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { file } = await request.validateUsing(uploadValidator)
    const raw = await readFile(file.tmpPath!, 'utf8')
    const service = new WorkoutImportService()
    const parsed = await service.parse(raw)
    const hash = WorkoutImportService.hash(raw)
    await mkdir(app.makePath('storage', 'imports'), { recursive: true })
    await writeFile(this.#path(user, hash), raw, 'utf8')

    const preview = await service.preview(user, parsed, hash)
    const catalog = await Exercise.query()
      .withScopes((s) => s.visibleTo(user.id))
      .whereNull('archived_at')
      .orderBy('name')
      .select('id', 'name')
    return inertia.render('settings/import', {
      preview: { ...preview, sourceName: file.clientName },
      catalog: catalog.map((e) => ({ id: e.id, name: e.name })),
      batches: [],
    })
  }

  async store({ auth, request, response, session }: HttpContext) {
    const user = auth.getUserOrFail()
    const { hash, sourceName, mapping } = await request.validateUsing(commitValidator)
    let raw: string
    try {
      raw = await readFile(this.#path(user, hash), 'utf8')
    } catch {
      throw new DomainException('La vista previa expiró. Vuelve a subir el archivo.')
    }
    const exerciseMapping: ExerciseMapping = {}
    for (const [key, value] of Object.entries(mapping ?? {})) {
      if (value === 'create') exerciseMapping[key] = { create: true }
      else if (/^\d+$/.test(value)) exerciseMapping[key] = { exerciseId: Number(value) }
    }
    const service = new WorkoutImportService()
    const result = await service.run(user, await service.parse(raw), {
      sourceName,
      fileHash: hash,
      mapping: exerciseMapping,
    })
    const sets = result.counts.set
    session.flash(
      'success',
      `Importado: ${result.counts.session.created} sesiones nuevas, ${result.counts.session.updated} actualizadas, ${sets.created} series nuevas.`
    )
    return response.redirect().toRoute('imports.index')
  }

  async revert({ auth, params, response, session }: HttpContext) {
    const { kept } = await new WorkoutImportService().revert(
      auth.getUserOrFail(),
      Number(params.id)
    )
    session.flash(
      'success',
      kept.length
        ? `Lote revertido. Se conservaron ${kept.length} registros que corregiste.`
        : 'Lote revertido.'
    )
    return response.redirect().toRoute('imports.index')
  }
}
