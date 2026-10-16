import { z } from 'zod';
import { toSouthAfricaDateOnly } from '@/lib/date-time/south-africa';

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
        if (result) return result;
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

const positiveId = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} is required` }).int().positive(`${label} is required`);

const money = (label: string) =>
  z.coerce.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} cannot be negative`);

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

export type TransportInputBody = z.input<typeof transportInputSchema>;
export type PPEItemInputBody = z.input<typeof ppeItemInputSchema>;
export type PPEIssueInputBody = z.input<typeof ppeIssueInputSchema>;
