# Formato de importación `forma.workouts` v1

Archivo JSON validado con VineJS (`app/services/import/schema.ts`). Es el mismo formato que produce **Ajustes → Exportar**, así que una exportación se puede volver a importar.

```jsonc
{
  "schema": "forma.workouts",
  "version": 1,
  "unit_default": "lb",              // opcional: unidad para pesos sin "unit"
  "exercises": [                     // opcional: definiciones de ejercicios propios
    {
      "slug": "smith-calf-raise",
      "name": "Pantorrilla en Smith",
      "equipment": "smith_machine",  // barbell | dumbbell | machine | cable | smith_machine | bodyweight | kettlebell | band | other
      "exercise_type": "isolation",  // compound | isolation
      "weight_basis": "total",       // total | per_hand | machine_display | unknown
      "per_hand_multiplier": null,   // p. ej. 2 para contar dos mancuernas como carga total
      "aliases": ["pantorrilla smith"],
      "primary_muscles": ["calves"],
      "secondary_muscles": []
    }
  ],
  "sessions": [
    {
      "external_id": "2026-10-27-pierna",   // clave para upsert idempotente
      "name": "Pierna",
      "date": "2026-10-27",
      "date_confidence": "exact",           // exact | high | medium | low | unknown
      "status": "completed",                // completed | partial
      "started_at": null,
      "completed_at": null,
      "notes": null,
      "exercises": [
        {
          "external_id": "2026-10-27-pierna-1",
          "exercise": "leg-press",          // slug del catálogo o de "exercises"
          "exercise_name": "Prensa",        // alternativa: se resuelve por alias
          "order": 0,
          "target_reps_min": 8,
          "target_reps_max": 12,
          "sets": [
            {
              "external_id": "2026-10-27-pierna-1-1",
              "set_number": 1,
              "set_type": "working",        // warmup | working | dropset
              "weight": 430,                // null si se desconoce: nunca se inventa
              "unit": "lb",
              "weight_basis": "machine_display",
              "reps": 12,                   // null si se desconoce
              "rir": null,
              "rpe": null,
              "confidence": "exact"
            }
          ]
        }
      ]
    }
  ],
  "body_measurements": [
    { "external_id": "b-2026-10-20", "date": "2026-10-20", "body_weight": 180.5, "body_weight_unit": "lb", "length_unit": "cm", "waist": 84 }
  ]
}
```

## Reglas

- **Idempotencia**: sesiones, ejercicios de sesión y series se emparejan por `external_id` (o por posición dentro de la sesión). Reimportar actualiza y no duplica.
- **Sin `external_id`**: una sesión con el mismo nombre y fecha se marca como duplicada y se omite.
- **Desconocidos**: un `weight` o `reps` en `null` se guarda como `null`, con su `confidence`; esas series no suman volumen y la sesión queda como «incompleta».
- **Correcciones del usuario**: una serie corregida en la app nunca se sobrescribe al reimportar.
- **Ejercicios**: se resuelven por slug, luego por alias (normalizado, sin acentos). Los que no se encuentran se crean como ejercicios propios con `--create-missing`, o se asignan a mano en la vista previa web.
- **Procedencia**: todo lo importado lleva `source = import`, `import_batch_id` y un registro por fila en `import_records`.
- **Reversión**: revertir un lote borra lo que creó y restaura lo que actualizó; conserva las filas que el usuario corrigió después.
