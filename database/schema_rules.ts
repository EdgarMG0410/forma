import { type SchemaRules, type ColumnInfo } from '@adonisjs/lucid/types/schema_generator'

/**
 * Types an enum column with the union exported from app/domain/enums.ts so
 * models, services and pages agree on the vocabulary.
 */
function enumOf(typeName: string, nullable = false): ColumnInfo {
  return {
    tsType: nullable ? `${typeName} | null` : typeName,
    imports: [{ source: '#domain/enums', typeImports: [typeName] }],
    decorators: [{ name: '@column' }],
  }
}

function json(tsType = 'any'): ColumnInfo {
  return {
    tsType,
    imports: [{ source: '#database/json_column', namedImports: ['jsonColumn'] }],
    decorators: [{ name: '@jsonColumn' }],
  }
}

const weightUnit = enumOf('WeightUnit', true)
const weightBasis = enumOf('WeightBasis')
const confidence = enumOf('ConfidenceLevel')

/**
 * NUMERIC columns are parsed into JS numbers at the driver level
 * (see start/database.ts), so the generated models type them as numbers.
 * Weights and measurements carry at most 4 decimals, well inside double
 * precision.
 */
export default {
  types: {
    decimal: { tsType: 'number', imports: [], decorators: [{ name: '@column' }] },
    json: json(),
    jsonb: json(),
  },
  tables: {
    user_preferences: {
      columns: {
        weight_unit: enumOf('WeightUnit'),
        length_unit: enumOf('LengthUnit'),
        theme: enumOf('Theme'),
        training_goal: enumOf('TrainingGoal'),
      },
    },
    muscle_groups: { columns: { region: enumOf('MuscleRegion') } },
    exercises: {
      columns: {
        equipment: enumOf('Equipment'),
        exercise_type: enumOf('ExerciseType'),
        default_weight_basis: weightBasis,
        load_increment_unit: enumOf('WeightUnit'),
      },
    },
    exercise_muscle_groups: { columns: { role: enumOf('MuscleRole') } },
    workout_template_sets: {
      columns: { set_type: enumOf('SetType'), target_weight_unit: weightUnit },
    },
    workout_sessions: {
      columns: {
        status: enumOf('SessionStatus'),
        source: enumOf('SessionSource'),
        date_confidence: confidence,
        data_quality: enumOf('DataQuality'),
      },
    },
    workout_session_exercises: { columns: { status: enumOf('SessionExerciseStatus') } },
    workout_sets: {
      columns: {
        set_type: enumOf('SetType'),
        weight_unit: weightUnit,
        weight_basis: weightBasis,
        source: enumOf('SetSource'),
        confidence,
      },
    },
    body_measurements: {
      columns: {
        body_weight_unit: weightUnit,
        length_unit: enumOf('LengthUnit'),
        photos: json('string[]'),
      },
    },
    personal_records: {
      columns: {
        record_type: enumOf('RecordType'),
        weight_basis: weightBasis,
        weight_unit: weightUnit,
      },
    },
    workout_recommendations: {
      columns: {
        weight_unit: weightUnit,
        outcome: enumOf('RecommendationOutcome', true),
        warnings: json('string[]'),
      },
    },
    import_batches: { columns: { status: enumOf('ImportStatus') } },
    import_records: {
      columns: {
        entity_type: enumOf('ImportEntity'),
        action: enumOf('ImportAction'),
        confidence,
      },
    },
    ai_interpretations: { columns: { status: enumOf('InterpretationStatus') } },
  },
} satisfies SchemaRules
