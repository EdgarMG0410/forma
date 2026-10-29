import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'

/**
 * Two ways to point at Postgres:
 *
 * - `DATABASE_URL` (Supabase, Render, …) wins when set. Supabase needs TLS, so
 *   `DB_SSL=true` turns it on; the pooler (port 6543) works too because `pg`
 *   does not use named prepared statements.
 * - Otherwise the discrete `DB_*` variables, which is what local dev uses.
 */
const databaseUrl = env.get('DATABASE_URL')
const ssl = env.get('DB_SSL', false) ? { rejectUnauthorized: false } : undefined

const dbConfig = defineConfig({
  connection: 'pg',

  connections: {
    pg: {
      client: 'pg',
      connection: databaseUrl
        ? { connectionString: databaseUrl, ssl }
        : {
            host: env.get('DB_HOST'),
            port: env.get('DB_PORT'),
            user: env.get('DB_USER'),
            password: env.get('DB_PASSWORD'),
            database: env.get('DB_DATABASE'),
            ssl,
          },
      pool: { min: 0, max: 10 },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      schemaGeneration: {
        enabled: true,
        rulesPaths: ['./database/schema_rules.js'],
      },
      debug: app.inDev && env.get('DB_DEBUG', false),
    },
  },
})

export default dbConfig
