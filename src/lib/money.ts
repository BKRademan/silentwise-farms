/**
 * Money and quantities are stored as DECIMAL(…,2). Doing arithmetic in whole cents avoids
 * floating point drift (e.g. 0.1 + 0.2) so totals shown in the app match SQL Server's.
 */
export function toCents(value: number | null | undefined): number {
  return Math.round((value ?? 0) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function sumMoney(values: Array<number | null | undefined>): number {
  return fromCents(values.reduce<number>((total, value) => total + toCents(value), 0));
}

/** Quantity × unit cost rounded to cents, matching `CAST(Quantity * Unit_Cost AS DECIMAL(14,2))`. */
export function lineTotal(quantity: number, unitCost: number): number {
  return fromCents(Math.round((toCents(quantity) * toCents(unitCost)) / 100));
}

export function hasAtMostTwoDecimals(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
}
