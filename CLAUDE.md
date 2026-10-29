# Forma

Workout tracker: AdonisJS 7 + Inertia/React + Postgres. Read `docs/architecture.md` before changing domain or data code.

- Domain math lives in `app/domain/*` (pure, relative imports, shared with the client via `@domain`). Never put training logic in controllers or components.
- Every query is scoped by `user_id`; foreign rows answer like missing ones (`NotFoundException`).
- Never overwrite captured weights; never invent weights or reps (unknown = `null`). User corrections (`user_corrected`) win over imports and AI.
- `database/schema.ts` is generated (`node ace migration:run` / `node ace schema:generate`); type rules in `database/schema_rules.ts`. JSONB columns use `@jsonColumn`.
- Page prop types are the source of truth for `inertia.render`; non-serialisable types (e.g. `unknown`) silently turn props into `never`.
- Tests: `pnpm test` (needs Postgres DB `forma_test`; `.env.test` sets it and PORT=3334). Services use `db.transaction(cb)` — never the manual form, it escapes the test's global transaction.
- UI is scificn/ui (Terminal theme only): components copied into `inertia/components/ui/` (header comment marks them; variants are uppercase — `EXEC`/`OUTLINE`/`GHOST`/`ABORT`). Tokens live in `inertia/css/scificn.css`; its base reset must stay inside `@layer base` or it overrides Tailwind utilities. Menu/sheet are leftover shadcn primitives restyled through the token bridge in `app.css`.
- UI copy is Spanish.
