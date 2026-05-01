import { toSouthAfricaDateOnly } from '@/lib/date-time/south-africa';

/**
 * EMA-aligned: tax year start = max(dateEngaged, March 1 of current tax year).
 * Before March, March 1 is in the previous calendar year.
 */
export function computeTaxYearStartDateOnly(
  dateEngaged: Date | string | null | undefined
): string | undefined {
  const d = toSouthAfricaDateOnly(dateEngaged);
  if (!d) return undefined;
  const [y, m, day] = d.split('-').map(Number);
  const engagedMs = Date.UTC(y, m - 1, day);
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const marchFirst =
    month < 3 ? Date.UTC(year - 1, 2, 1) : Date.UTC(year, 2, 1);
  const maxMs = Math.max(engagedMs, marchFirst);
  const out = new Date(maxMs);
  return `${out.getUTCFullYear()}-${String(out.getUTCMonth() + 1).padStart(2, '0')}-${String(out.getUTCDate()).padStart(2, '0')}`;
}

/** EMA-aligned: new UIF start = date engaged (as calendar date). */
export function computeNewUifStartDateOnly(
  dateEngaged: Date | string | null | undefined
): string | undefined {
  const d = toSouthAfricaDateOnly(dateEngaged);
  return d ?? undefined;
}

/** EMA-aligned representative address from residential fields. */
export function computeRepAddressFromResidential(input: {
  ResStreetNo?: string | null;
  ResStreetName?: string | null;
  ResCity?: string | null;
  ResPostCode?: string | null;
}): {
  RepAddr1: string | null;
  RepAddr2: string | null;
  RepAddr3: string | null;
  RepPostCode: string | null;
} {
  return {
    RepAddr1: input.ResStreetNo ?? null,
    RepAddr2: input.ResStreetName ?? null,
    RepAddr3: input.ResCity ?? null,
    RepPostCode: input.ResPostCode ?? null,
  };
}

/** EMA-aligned full name from first + last. */
export function computeFullNames(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string | null {
  const fn = (firstName ?? '').trim();
  const ln = (lastName ?? '').trim();
  const s = `${fn} ${ln}`.trim();
  return s === '' ? null : s;
}
