/** Pay method display values saved to SQL. */
export const PAY_METHODS = [
  { value: '02.Cash', label: '02.Cash' },
  { value: '03.Electronic Payment', label: '03.Electronic Payment' },
] as const;

/** Bank account type display values saved to SQL. */
export const BANK_ACC_TYPES = [
  { value: 'S.Savings', label: 'S.Savings' },
  { value: 'C.Cheque', label: 'C.Cheque' },
] as const;

/** South African bank names (display labels) — from EMA */
export const BANK_NAMES = [
  'Absa Bank',
  'African Bank',
  'African Bank Business',
  'Bidvest-Old Mutual',
  'Capitec Bank',
  'Discovery Bank',
  'First National Bank',
  'Grindrod Bank',
  'Nedbank',
  'Standard Bank',
  'Tyme Bank',
] as const;

/** Branch code by bank name (EMA-aligned lookup) */
export const BRANCH_CODES: Record<(typeof BANK_NAMES)[number], string> = {
  'Absa Bank': '632005',
  'African Bank': '430000',
  'African Bank Business': '430000',
  'Bidvest-Old Mutual': '462005',
  'Capitec Bank': '470010',
  'Discovery Bank': '679000',
  'First National Bank': '250655',
  'Grindrod Bank': '223626',
  Nedbank: '198765',
  'Standard Bank': '051001',
  'Tyme Bank': '678910',
};

/** Account holder relationship display values saved to SQL. */
export const ACC_RELATIONSHIPS = [
  { value: 'O.Own', label: 'O.Own' },
  { value: 'T.3rd Party', label: 'T.3rd Party' },
] as const;

const BANK_NAME_LOOKUP = new Map(
  BANK_NAMES.map((name) => [name.toLowerCase(), name])
);

export function canonicalBankName(input: string | null | undefined): string | null {
  if (input == null || input === '') return null;
  const canonical = BANK_NAME_LOOKUP.get(input.toLowerCase().trim());
  return canonical ?? null;
}

export function branchCodeForBankName(bankName: string | null | undefined): string | null {
  const c = canonicalBankName(bankName ?? '');
  if (!c) return null;
  return BRANCH_CODES[c as keyof typeof BRANCH_CODES] ?? null;
}
