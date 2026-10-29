# Arquitectura

## Capas

| Capa | Dónde | Regla |
| --- | --- | --- |
| Dominio | `app/domain/*` | TypeScript puro, sin base de datos ni framework. Unidades, carga efectiva, volumen, series efectivas, récords, e1RM, comparaciones, flujo de sesión, parser de mensajes y `WorkoutProgressionService`. Lo usa también el cliente vía el alias `@domain`. |
| Servicios | `app/services/*` | Orquestan lecturas y escrituras. Toda escritura relacionada va en una transacción y toda consulta filtra por usuario. |
| HTTP | `app/controllers`, `app/validators`, `start/routes.ts` | Validan con VineJS y delegan en servicios. |
| UI | `inertia/pages`, `inertia/components`, `inertia/hooks` | Sin lógica de negocio; los tipos de props salen de `@domain/dto` o `inertia/types/views.ts`. |

## Integridad de datos

- **Peso capturado intacto**: `weight_value` + `weight_unit` + `weight_basis` tal como se registraron; `weight_kg` / `weight_lb` son copias normalizadas para comparar.
- **Por mano ≠ total**: un peso `per_hand` solo se convierte a total si el ejercicio declara `per_hand_multiplier`. Volúmenes y récords se separan por base (total / por mano / pantalla de máquina).
- **Idempotencia**: cada toque de «Registrar serie» envía un `client_request_id` (UUID único); un reenvío devuelve la serie ya guardada.
- **Concurrencia**: índice único parcial que permite una sola sesión `active|paused` por usuario; `SELECT … FOR UPDATE` al numerar series; restricción única `(session_exercise_id, set_number)` diferida para renumerar al borrar.
- **Auditoría**: cada corrección o borrado deja el antes y el después en `workout_set_edits`; la serie queda como `user_corrected`.
- **Derivados recalculables**: `personal_records` y `workout_summaries` se regeneran desde las series reales, así que una corrección nunca deja un récord fantasma.
- **IDOR**: todo se busca por `id` más `user_id`; lo ajeno responde igual que lo inexistente (404).

## Motor de progresión (`app/domain/progression.ts`)

Doble progresión determinista y configurable (`DEFAULT_PROGRESSION_CONFIG`):

- Sin historial comparable, no sugiere peso (`no_data`).
- Todas las series en el tope del rango y RIR suficiente: sube un incremento, redondeado a lo que el equipo permite.
- Sin datos de esfuerzo: solo sube cuando el tope del rango se repite en N sesiones (2 por defecto) y lo avisa.
- Caída importante de repeticiones: baja la carga; si queda cerca del rango, la mantiene y alarga el descanso.
- Molestia reportada: nunca sube.
- Ignora calentamientos y drop sets, y no mezcla bases de peso distintas.

## IA

`AIWorkoutCoach` (`app/services/ai/ai_workout_coach.ts`) con dos implementaciones: `NullCoach` (por defecto) y `AnthropicCoach` (SDK oficial, salida estructurada validada con Zod). El flujo de mensajes es: reglas deterministas → (si no bastan y el usuario activó IA) LLM → propuesta → confirmación del usuario → serie. Lo ambiguo nunca se guarda.

## PWA

`public/manifest.webmanifest` es estático. `vite-plugin-pwa` genera `public/sw.js` con scope `/`: precachea los assets con hash y las páginas van network-first. El registro de series necesita conexión.
