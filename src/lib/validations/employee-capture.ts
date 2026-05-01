import { z } from 'zod';
import { requireSouthAfricaDateOnly, toSouthAfricaDateOnly } from '@/lib/date-time/south-africa';
import {
  canonicalBankName,
  branchCodeForBankName,
} from '@/lib/constants/bankDetails';
import type { Employee } from '@/types/database';
import {
  computeFullNames,
  computeNewUifStartDateOnly,
  computeRepAddressFromResidential,
  computeTaxYearStartDateOnly,
} from '@/lib/employee/derived-fields';

const optionalString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((s) => {
    if (s === undefined || s === null) return undefined;
    const t = String(s).trim();
    return t === '' ? undefined : t;
  });

const optionalNullableString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((s) => {
    if (s === undefined) return undefined;
    if (s === null) return null;
    const t = String(s).trim();
    return t === '' ? null : t;
  });

const idNumberSchema = optionalString.refine(
  (v) => v === undefined || /^\d{13}$/.test(v),
  'ID number must be exactly 13 digits'
);

const phoneSchema = optionalString.refine(
  (v) => v === undefined || /^\d{10}$/.test(v),
  'Phone number must be exactly 10 digits'
);

/** Optional date: accepts YYYY-MM-DD or ISO; outputs YYYY-MM-DD for SQL */
const optionalDateOnlyString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((s) => {
    if (s === undefined || s === null || s === '') return undefined;
    return requireSouthAfricaDateOnly(s, 'date');
  });

function uppercaseNameish(v: string | undefined): string | undefined {
  if (v === undefined) return undefined;
  return v.toUpperCase();
}

function uppercaseNullableString<T extends string | null | undefined>(v: T): T {
  if (typeof v !== 'string') return v;
  return v.toUpperCase() as T;
}

/**
 * Raw API / form body (allows `DateRegistered` alias for `Date_Registered`).
 */
export const employeeCaptureBodySchema = z
  .object({
    EmplNo: optionalString,
    FirstName: optionalString,
    LastName: optionalString,
    Initials: optionalString,
    SecondName: optionalString,
    knownAs: optionalString,
    Title: optionalString,
    IDNumber: idNumberSchema,
    DateOfBirth: optionalDateOnlyString,
    DateEngaged: optionalDateOnlyString,
    LastDateWorked: optionalDateOnlyString,
    Language: optionalString,
    EthnicGroup: optionalString,
    Gender: optionalString,
    MaritalStatus: optionalString,
    CellNumber: phoneSchema,
    BusinessNUmber: optionalString,
    AlternativeNumber: phoneSchema,
    TaxNumber: optionalString,
    TaxStatus: optionalString,
    UIFStatus: optionalString,
    TaxYearStart: optionalDateOnlyString,
    UIFEndDate: optionalDateOnlyString,
    NewUIFStartDate: optionalDateOnlyString,
    PayMethod: optionalString,
    BankAccType: optionalString,
    BankAccNo: optionalString,
    BranchCode: optionalString,
    BankName: optionalString,
    AccHolder: optionalString,
    AccRelationship: optionalString,
    HrsPerPeriod: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.coerce.number().optional()
    ),
    HoursPerDay: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.coerce.number().optional()
    ),
    WorkAddressCode: optionalString,
    RepAddr1: optionalNullableString,
    RepAddr2: optionalNullableString,
    RepAddr3: optionalNullableString,
    RepPostCode: optionalNullableString,
    ResUnit: optionalNullableString,
    ResComplex: optionalNullableString,
    ResStreetNo: optionalNullableString,
    ResStreetName: optionalNullableString,
    ResSuburb: optionalNullableString,
    ResCity: optionalNullableString,
    ResPostCode: optionalNullableString,
    ResidentialCountry: optionalString,
    LinkPostalTo: optionalString,
    FullNames: optionalNullableString,
    RATE: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.coerce.number().nullable().optional()
    ),
    Date_Registered: optionalDateOnlyString,
    DateRegistered: optionalDateOnlyString,
  })
  .transform((data) => {
    const { DateRegistered, ...rest } = data as typeof data & {
      DateRegistered?: string;
    };
    return {
      ...rest,
      Date_Registered: rest.Date_Registered ?? DateRegistered,
    };
  });

export type EmployeeCaptureBody = z.infer<typeof employeeCaptureBodySchema>;

function normalizeEnumCase(
  v: string | undefined,
  keys: readonly string[]
): string | undefined {
  if (v === undefined) return undefined;
  const u = v.toUpperCase();
  if (keys.includes(u)) return u;
  return v;
}

const TITLE = ['MR', 'MISS', 'MRS', 'MS', 'DR', 'PROF', 'REV'] as const;
const GENDER = ['M', 'F'] as const;
const ETHNIC = ['A', 'C', 'W', 'I', 'B'] as const;
const MARITAL = [
  'SINGLE',
  'MARRIED',
  'DIVORCED',
  'WIDOWED',
  'SEPARATED',
] as const;
const PAY_DISPLAY_BY_CODE: Record<string, string> = {
  '02': '02.Cash',
  '03': '03.Electronic Payment',
};
const BANK_ACC_DISPLAY_BY_CODE: Record<string, string> = {
  S: 'S.Savings',
  C: 'C.Cheque',
};
const ACC_REL_DISPLAY_BY_CODE: Record<string, string> = {
  O: 'O.Own',
  T: 'T.3rd Party',
};

function normalizeDisplayValue(
  v: string | undefined,
  displayByCode: Record<string, string>
): string | undefined {
  if (v === undefined) return undefined;
  return displayByCode[v.toUpperCase()] ?? v;
}

/**
 * Apply EMA-style uppercase for name fields and enum normalization.
 */
export function normalizeCapturedFields(
  input: EmployeeCaptureBody
): Partial<Employee> {
  const out: Record<string, unknown> = { ...input };

  out.FirstName = uppercaseNameish(input.FirstName);
  out.LastName = uppercaseNameish(input.LastName);
  out.knownAs = uppercaseNameish(input.knownAs);
  out.Initials = uppercaseNameish(input.Initials);
  out.SecondName = uppercaseNameish(input.SecondName);
  out.ResUnit = uppercaseNullableString(input.ResUnit);
  out.ResComplex = uppercaseNullableString(input.ResComplex);
  out.ResStreetNo = uppercaseNullableString(input.ResStreetNo);
  out.ResStreetName = uppercaseNullableString(input.ResStreetName);
  out.ResSuburb = uppercaseNullableString(input.ResSuburb);
  out.ResCity = uppercaseNullableString(input.ResCity);

  out.Title = normalizeEnumCase(input.Title, TITLE);
  out.Gender = normalizeEnumCase(input.Gender, GENDER);
  out.EthnicGroup = normalizeEnumCase(input.EthnicGroup, ETHNIC);
  out.MaritalStatus = normalizeEnumCase(input.MaritalStatus, MARITAL);
  out.PayMethod = normalizeDisplayValue(input.PayMethod, PAY_DISPLAY_BY_CODE);
  out.BankAccType = normalizeDisplayValue(input.BankAccType, BANK_ACC_DISPLAY_BY_CODE);
  out.AccRelationship = normalizeDisplayValue(input.AccRelationship, ACC_REL_DISPLAY_BY_CODE);

  if (input.BankName) {
    const canon = canonicalBankName(input.BankName);
    out.BankName = canon ?? input.BankName;
    if (canon && !input.BranchCode) {
      const bc = branchCodeForBankName(canon);
      if (bc) out.BranchCode = bc;
    }
  }

  return out as Partial<Employee>;
}

/**
 * Recompute derived columns from current field values (EMA-aligned).
 */
export function applyDerivedFields(
  row: Partial<Employee>
): Partial<Employee> {
  const dateEngaged = row.DateEngaged ?? null;
  const rep = computeRepAddressFromResidential({
    ResStreetNo: row.ResStreetNo,
    ResStreetName: row.ResStreetName,
    ResCity: row.ResCity,
    ResPostCode: row.ResPostCode,
  });
  const fullNames = computeFullNames(row.FirstName ?? null, row.LastName ?? null);
  const taxYear = computeTaxYearStartDateOnly(dateEngaged);
  const newUif = computeNewUifStartDateOnly(dateEngaged);

  return {
    ...row,
    TaxYearStart: taxYear ?? row.TaxYearStart,
    NewUIFStartDate: newUif ?? row.NewUIFStartDate,
    RepAddr1: rep.RepAddr1,
    RepAddr2: rep.RepAddr2,
    RepAddr3: rep.RepAddr3,
    RepPostCode: rep.RepPostCode,
    FullNames: fullNames,
  };
}

const createRequired = z.object({
  EmplNo: z.string().min(1, 'EmplNo is required'),
  FirstName: z.string().min(1, 'First name is required'),
  LastName: z.string().min(1, 'Last name is required'),
});

export function validateCreatePayload(
  normalized: Partial<Employee>
): void {
  createRequired.parse({
    EmplNo: normalized.EmplNo,
    FirstName: normalized.FirstName,
    LastName: normalized.LastName,
  });
}

/** Merge partial update with existing row, then derived fields (for updates). */
export function mergeEmployeeUpdate(
  existing: Employee,
  patch: Partial<Employee>
): Partial<Employee> {
  const merged: Employee = { ...existing, ...patch };
  const derived = applyDerivedFields({
    DateEngaged: merged.DateEngaged,
    FirstName: merged.FirstName,
    LastName: merged.LastName,
    ResStreetNo: merged.ResStreetNo,
    ResStreetName: merged.ResStreetName,
    ResCity: merged.ResCity,
    ResPostCode: merged.ResPostCode,
  });
  return omitUndefined({
    ...patch,
    TaxYearStart: derived.TaxYearStart,
    NewUIFStartDate: derived.NewUIFStartDate,
    RepAddr1: derived.RepAddr1,
    RepAddr2: derived.RepAddr2,
    RepAddr3: derived.RepAddr3,
    RepPostCode: derived.RepPostCode,
    FullNames: derived.FullNames,
  });
}

/** Strip undefined so SQL update only sets provided keys (EMA-style). */
export function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}

/**
 * Only include fields that were present on the request body (EMA-style partial update).
 */
export function pickPatchFromRequest(
  raw: Record<string, unknown>,
  normalized: Partial<Employee>
): Partial<Employee> {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (key === 'id' || key === 'ID') continue;
    const mapKey = key === 'DateRegistered' ? 'Date_Registered' : key;
    const v = (normalized as Record<string, unknown>)[mapKey];
    if (v !== undefined) {
      patch[mapKey] = v;
    }
  }
  return patch as Partial<Employee>;
}

export function dateStringOrNull(
  v: Date | string | null | undefined
): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return toSouthAfricaDateOnly(v) ?? undefined;
}

/**
 * Merge create payload with NOT NULL column defaults, then EMA-aligned derived fields.
 */
export function mergeCreateDefaults(n: Partial<Employee>): Omit<Employee, 'ID'> {
  const row: Omit<Employee, 'ID'> = {
    EmplNo: n.EmplNo ?? null,
    FirstName: n.FirstName ?? null,
    LastName: n.LastName ?? null,
    Initials: n.Initials ?? null,
    SecondName: n.SecondName ?? null,
    knownAs: n.knownAs ?? null,
    Title: n.Title ?? null,
    IDNumber: n.IDNumber ?? null,
    DateOfBirth: n.DateOfBirth ?? null,
    DateEngaged: n.DateEngaged ?? null,
    LastDateWorked: n.LastDateWorked ?? null,
    Language: n.Language ?? 'E',
    EthnicGroup: n.EthnicGroup ?? null,
    Gender: n.Gender ?? null,
    MaritalStatus: n.MaritalStatus ?? 'SINGLE',
    CellNumber: n.CellNumber ?? null,
    BusinessNUmber: n.BusinessNUmber ?? '0460040041',
    AlternativeNumber: n.AlternativeNumber ?? null,
    TaxNumber: n.TaxNumber ?? null,
    TaxStatus: n.TaxStatus ?? 'N.Statutory Tables',
    UIFStatus: n.UIFStatus ?? 'R.UIF',
    TaxYearStart: n.TaxYearStart ?? null,
    UIFEndDate: n.UIFEndDate ?? null,
    NewUIFStartDate: n.NewUIFStartDate ?? null,
    PayMethod: n.PayMethod ?? '03.Electronic Payment',
    BankAccType: n.BankAccType ?? 'S.Savings',
    BankAccNo: n.BankAccNo ?? null,
    BranchCode: n.BranchCode ?? null,
    BankName: n.BankName ?? null,
    AccHolder: n.AccHolder ?? null,
    AccRelationship: n.AccRelationship ?? 'O.Own',
    HrsPerPeriod: n.HrsPerPeriod ?? 0,
    HoursPerDay: n.HoursPerDay ?? 0,
    WorkAddressCode: n.WorkAddressCode ?? '001',
    RepAddr1: n.RepAddr1 ?? null,
    RepAddr2: n.RepAddr2 ?? null,
    RepAddr3: n.RepAddr3 ?? null,
    RepPostCode: n.RepPostCode ?? null,
    ResUnit: n.ResUnit ?? null,
    ResComplex: n.ResComplex ?? null,
    ResStreetNo: n.ResStreetNo ?? null,
    ResStreetName: n.ResStreetName ?? null,
    ResSuburb: n.ResSuburb ?? null,
    ResCity: n.ResCity ?? null,
    ResPostCode: n.ResPostCode ?? null,
    ResidentialCountry: n.ResidentialCountry ?? 'ZA',
    LinkPostalTo: n.LinkPostalTo ?? 'R',
    FullNames: n.FullNames ?? null,
    RATE: n.RATE ?? null,
    Date_Registered: n.Date_Registered ?? null,
  };
  return applyDerivedFields(row) as Omit<Employee, 'ID'>;
}
