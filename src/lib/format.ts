import { format } from 'date-fns';

const currencyFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined): string {
  return currencyFormatter.format(value ?? 0);
}

export function formatDisplayDate(value: Date | string | null | undefined): string {
  return value ? format(new Date(value), 'dd MMM yyyy') : '-';
}
