/**
 * Numeric coercion shared by the history-driven agents.
 *
 * PostgREST returns numeric columns as strings, and a deployed Postgres
 * function that predates a schema change can omit a column entirely. Coercing
 * through this helper guarantees agents always compute on finite numbers
 * instead of letting NaN silently disable a detection rule.
 */

/**
 * Coerces an arbitrary PostgREST value to a finite number.
 *
 * @param value    The raw value from a PostgREST row (string, number, or absent).
 * @param fallback Returned when the value is missing or not a finite number.
 * @returns The parsed finite number, or the fallback.
 */
export function coerce_finite_number(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
