import pg from 'pg'

/**
 * Postgres returns NUMERIC as strings to protect arbitrary precision. Our
 * numerics are weights, measurements and volumes with ≤ 4 decimals, so a
 * double is exact enough and keeps the domain math free of string parsing.
 */
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number.parseFloat(value))

/**
 * DATE columns stay ISO strings at the driver; Lucid's @column.date turns
 * them into Luxon dates without a timezone shift.
 */
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value)
