import { z } from 'zod';
import { isValidDateOnly, toSouthAfricaDateOnly } from '@/lib/date-time/south-africa';
import { MAX_INVOICE_LINES, PPE_STOCK_TRACKING_START, STOCK_ADJUSTMENT_REASON_VALUES } from '@/lib/constants/ppe';
import { formatDisplayDate } from '@/lib/format';
import { hasAtMostTwoDecimals } from '@/lib/money';

const dateOnly = (label: string) =>
  z
    .preprocess(
      (value) => (value === null || value === '' ? undefined : value),
      z.union([z.string(), z.date()], {
        errorMap: (issue, ctx) => ({
          message: ctx.data === undefined ? `${label} is required` : `${label} is invalid`,
        }),
      })
    )
    .transform((value, ctx) => {
      try {
        const result = toSouthAfricaDateOnly(value);
        if (result && isValidDateOnly(result)) return result;
      } catch {
        // fall through to the issue below
      }
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} is invalid` });
      return z.NEVER;
    });

const optionalText = (max: number, label: string) =>
  z
    .string()
    .max(max, `${label} must be ${max} characters or fewer`)
    .nullish()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed ? trimmed : null;
    });

const requiredText = (max: number, label: string) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

const positiveId = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} is required` }).int().positive(`${label} is required`);

const money = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} cannot be negative`);

/**
 * A number stored in a DECIMAL(…,2) column. Rejects blanks (rather than coercing them to 0)
 * and more than 2 decimal places (rather than letting SQL Server round silently).
 */
const decimal2 = (label: string, max: number) =>
  z
    .preprocess(
      (value) => (value === null || value === '' ? undefined : value),
      z.coerce
        .number({ invalid_type_error: `${label} is required` })
        .finite(`${label} must be a number`)
        .refine(hasAtMostTwoDecimals, `${label} can have at most 2 decimal places`)
        .refine((value) => Math.abs(value) <= max, `${label} must be ${max.toLocaleString('en-ZA')} or less`)
    );

const amountExclVat = (label: string, max: number) =>
  decimal2(label, max).refine((value) => value >= 0, `${label} cannot be negative`);

/** Omitted means "new records are active; edits keep the current status". */
const activeFlag = z.boolean({ invalid_type_error: 'Active must be true or false' }).optional();

export const dateRangeQuerySchema = z
  .object({
    startDate: dateOnly('Start date'),
    endDate: dateOnly('End date'),
  })
  .refine((range) => range.startDate <= range.endDate, 'Start date must be on or before end date');

export const transportInputSchema = z.object({
  Grower_ID_FK: positiveId('Grower'),
  Date: dateOnly('Date'),
  Days: z.coerce.number({ invalid_type_error: 'Days must be a number' }).positive('Days must be greater than 0').max(31),
  RatePerDay: money('Rate per day').nullable(),
  Driver: optionalText(50, 'Driver'),
  Comment: optionalText(4000, 'Comment'),
});

export const driverInputSchema = z.object({
  Driver_Name: requiredText(50, 'Driver name'),
  Is_Active: activeFlag,
});

export const ppeItemInputSchema = z.object({
  PPE_Item: z.string().trim().min(1, 'Item name is required').max(255),
  PPE_Item_Value: money('Deduction price'),
});

export const ppeIssueInputSchema = z.object({
  Date: dateOnly('Date'),
  EmployeeID: positiveId('Employee'),
  PPEItemID: positiveId('PPE item'),
  Amount: money('Amount'),
});

export const supplierInputSchema = z.object({
  Supplier_Name: requiredText(150, 'Supplier name'),
  Contact_Details: optionalText(500, 'Contact details'),
  Is_Active: activeFlag,
});

export const invoiceLineInputSchema = z.object({
  PPE_Item_ID: positiveId('PPE item'),
  Quantity: decimal2('Quantity', 100_000).refine((value) => value > 0, 'Quantity must be greater than 0'),
  Unit_Cost_Excl_VAT: amountExclVat('Unit cost', 1_000_000),
});

export const invoiceInputSchema = z.object({
  Supplier_ID: positiveId('Supplier'),
  Invoice_No: requiredText(50, 'Invoice number'),
  Invoice_Date: dateOnly('Invoice date'),
  Notes: optionalText(1000, 'Notes'),
  Lines: z
    .array(invoiceLineInputSchema, { invalid_type_error: 'Add at least one line' })
    .min(1, 'Add at least one line')
    .max(MAX_INVOICE_LINES, `An invoice can have at most ${MAX_INVOICE_LINES} lines`),
});

export const growerChargeInputSchema = z.object({
  Grower_ID: positiveId('Grower'),
  Charge_Date: dateOnly('Date'),
  Reference: optionalText(50, 'Reference'),
  Amount_Excl_VAT: amountExclVat('Amount', 100_000_000),
  Notes: optionalText(500, 'Notes'),
});

export const stockAdjustmentInputSchema = z.object({
  PPE_Item_ID: positiveId('PPE item'),
  Adjustment_Date: dateOnly('Date').refine(
    (value) => value >= PPE_STOCK_TRACKING_START,
    `Stock is tracked from ${formatDisplayDate(PPE_STOCK_TRACKING_START)}; use a date on or after that`
  ),
  Quantity: decimal2('Quantity', 100_000).refine((value) => value !== 0, 'Quantity cannot be 0'),
  Reason: z.enum(STOCK_ADJUSTMENT_REASON_VALUES, { errorMap: () => ({ message: 'Select a reason' }) }),
  Notes: optionalText(500, 'Notes'),
});

export type TransportInputBody = z.input<typeof transportInputSchema>;
export type DriverInputBody = z.input<typeof driverInputSchema>;
export type PPEItemInputBody = z.input<typeof ppeItemInputSchema>;
export type PPEIssueInputBody = z.input<typeof ppeIssueInputSchema>;
export type SupplierInputBody = z.input<typeof supplierInputSchema>;
export type InvoiceInputBody = z.input<typeof invoiceInputSchema>;
export type InvoiceInput = z.output<typeof invoiceInputSchema>;
export type GrowerChargeInputBody = z.input<typeof growerChargeInputSchema>;
export type GrowerChargeInput = z.output<typeof growerChargeInputSchema>;
export type StockAdjustmentInputBody = z.input<typeof stockAdjustmentInputSchema>;
export type StockAdjustmentInput = z.output<typeof stockAdjustmentInputSchema>;
export type SupplierInput = z.output<typeof supplierInputSchema>;
export type DriverInput = z.output<typeof driverInputSchema>;
