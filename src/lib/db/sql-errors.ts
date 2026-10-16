const SQL_ERROR_NUMBERS = {
  constraintConflict: 547,
  uniqueIndex: 2601,
  uniqueConstraint: 2627,
} as const;

function getSqlErrorNumber(error: unknown): number | undefined {
  const candidate = error as { number?: unknown; originalError?: { info?: { number?: unknown } } } | null;
  const value = candidate?.number ?? candidate?.originalError?.info?.number;
  return typeof value === 'number' ? value : undefined;
}

function getSqlErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

/** Violation of a UNIQUE constraint or unique index, optionally a specific one by name. */
export function isUniqueViolation(error: unknown, constraintName?: string): boolean {
  const number = getSqlErrorNumber(error);
  const isUnique = number === SQL_ERROR_NUMBERS.uniqueConstraint || number === SQL_ERROR_NUMBERS.uniqueIndex;
  return isUnique && (!constraintName || getSqlErrorMessage(error).includes(constraintName));
}

/** Error 547 covers both FOREIGN KEY and CHECK conflicts; the constraint name tells them apart. */
export function isConstraintConflict(error: unknown, constraintName?: string): boolean {
  return (
    getSqlErrorNumber(error) === SQL_ERROR_NUMBERS.constraintConflict &&
    (!constraintName || getSqlErrorMessage(error).includes(constraintName))
  );
}
