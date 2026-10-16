import { toDateOnlyFromDateParts } from '@/lib/date-time/south-africa';

/**
 * Stock on hand only counts adjustments, purchases and issues dated on or after this day
 * (the day the business confirmed it held no PPE stock). Supplier invoices and grower
 * charges were first captured in the app from this date too.
 */
export const PPE_STOCK_TRACKING_START = '2026-10-16';

/** Keeps one invoice save well under SQL Server's 2,100 parameter limit (3 params per line). */
export const MAX_INVOICE_LINES = 200;

/** 1-based month the financial year starts in (South African default: March). */
export const FINANCIAL_YEAR_START_MONTH = 3;

export const STOCK_ADJUSTMENT_REASONS = {
  opening: 'Opening stock',
  stock_take: 'Stock take',
  write_off: 'Write-off',
} as const;

export type StockAdjustmentReason = keyof typeof STOCK_ADJUSTMENT_REASONS;

export const STOCK_ADJUSTMENT_REASON_VALUES = Object.keys(STOCK_ADJUSTMENT_REASONS) as [
  StockAdjustmentReason,
  ...StockAdjustmentReason[],
];

/** First day of the financial year containing `date`, as a local date. */
export function getFinancialYearStart(date: Date): Date {
  const startMonthIndex = FINANCIAL_YEAR_START_MONTH - 1;
  const year = date.getMonth() >= startMonthIndex ? date.getFullYear() : date.getFullYear() - 1;
  return new Date(year, startMonthIndex, 1);
}

export function isBeforeStockTracking(date: Date | undefined): boolean {
  return Boolean(date && toDateOnlyFromDateParts(date) < PPE_STOCK_TRACKING_START);
}
