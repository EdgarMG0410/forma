# Forma

**Train. Track. Progress.** Seguimiento de entrenamiento de fuerza: registro en vivo de series, progresión de cargas basada en resultados reales, historial corregible y resúmenes por sesión. La IA es una capa opcional; todo funciona sin ella.

## Stack

AdonisJS 7 · Inertia + React 19 · Tailwind CSS v4 · shadcn/ui · Lucid + PostgreSQL · VineJS · AdonisJS Auth (sesión) · Recharts · TanStack Table · PWA (vite-plugin-pwa).

## Puesta en marcha

```bash
pnpm install
cp .env.example .env          # y genera APP_KEY con: node ace generate:key
createdb forma && createdb forma_test
node ace migration:run
node ace db:seed               # catálogo de ejercicios (+ usuario dev en desarrollo)
pnpm dev                       # http://localhost:3333
```

Usuario local de desarrollo: ver `database/seeders/dev_user_seeder.ts` (solo se crea en `NODE_ENV=development`).

### Supabase

Forma usa Postgres estándar. Para Supabase basta con definir en `.env`:

```
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
DB_SSL=true
```

`DATABASE_URL` tiene prioridad sobre las variables `DB_*`. Corre `node ace migration:run` y `node ace db:seed` contra esa base. La autenticación sigue siendo AdonisJS Auth (no Supabase Auth).

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor con HMR |
| `pnpm test` | Pruebas unitarias (dominio) y funcionales (Postgres `forma_test`) |
| `pnpm typecheck` | TypeScript del servidor y del cliente |
| `node ace build` | Build de producción (genera también `public/sw.js`) |
| `node ace workouts:import <archivo.json> --user=<id\|email> [--dry-run] [--create-missing]` | Importa historial (idempotente por `external_id`) |

## Importar historial

Formato `forma.workouts` v1, documentado en [docs/import-format.md](docs/import-format.md). También se puede importar desde **Ajustes → Importar historial**, con vista previa, corrección de asociaciones de ejercicios y reversión por lote.

El historial inicial va en `database/data/seed-workouts.json`; al existir, se activa la prueba de aceptación de la sesión de pierna del 27-10-2026 (`tests/functional/import.spec.ts`).

## IA (opcional)

```
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
# AI_MODEL=claude-opus-5-5   (por defecto)
```

Además, cada usuario la activa en Ajustes. La IA solo interpreta mensajes («hice 9 con 120») y redacta resúmenes; nada se guarda sin confirmación y los datos corporales no se envían sin consentimiento explícito.

Más detalle en [docs/architecture.md](docs/architecture.md).
