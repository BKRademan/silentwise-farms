import { format } from 'date-fns';
import { fromDateOnly } from '@/lib/date-time/south-africa';

const currencyFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat('en-ZA', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined): string {
  return currencyFormatter.format(value ?? 0);
}

export function formatQuantity(value: number | null | undefined): string {
  return quantityFormatter.format(value ?? 0);
}

export function formatDisplayDate(value: Date | string | null | undefined): string {
  if (!value) return '-';
  const date = typeof value === 'string' ? fromDateOnly(value) ?? new Date(value) : value;
  return format(date, 'dd MMM yyyy');
}
