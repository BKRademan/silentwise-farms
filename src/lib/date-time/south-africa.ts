export const APP_TIME_ZONE = 'Africa/Johannesburg';
export const SQL_SOUTH_AFRICA_NOW =
  "CAST(SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'South Africa Standard Time' AS datetime2)";

type DateInput = string | Date | null | undefined;

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function assertValidDate(date: Date, value: DateInput): void {
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }
}

function getSouthAfricaParts(date: Date): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: byType.get('year') ?? '',
    month: byType.get('month') ?? '',
    day: byType.get('day') ?? '',
    hour: byType.get('hour') ?? '00',
    minute: byType.get('minute') ?? '00',
    second: byType.get('second') ?? '00',
  };
}

export function toSouthAfricaDateOnly(value: DateInput): string | null {
  if (value == null || value === '') return null;

  if (typeof value === 'string') {
    const dateOnly = value.match(dateOnlyPattern);
    if (dateOnly) return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  assertValidDate(date, value);

  const { year, month, day } = getSouthAfricaParts(date);
  return `${year}-${month}-${day}`;
}

export function toSouthAfricaDateTime(value: DateInput): string | null {
  if (value == null || value === '') return null;

  const date = value instanceof Date ? value : new Date(value);
  assertValidDate(date, value);

  const { year, month, day, hour, minute, second } = getSouthAfricaParts(date);
  return `${year}-${month}-${day} ${hour}:${minute}:${second}.000`;
}

export function toSqlDateTimeStartOfDay(value: DateInput): string | null {
  const dateOnly = toSouthAfricaDateOnly(value);
  return dateOnly ? `${dateOnly} 00:00:00.000` : null;
}

export function toSqlDateOnly(value: DateInput): string | null {
  return toSouthAfricaDateOnly(value);
}

export function requireSouthAfricaDateOnly(value: DateInput, fieldName = 'date'): string {
  const dateOnly = toSouthAfricaDateOnly(value);
  if (!dateOnly) throw new Error(`${fieldName} is required`);
  return dateOnly;
}

export function addDaysToDateOnly(dateOnly: string, days: number): string {
  const match = dateOnly.match(dateOnlyPattern);
  if (!match) throw new Error(`Invalid date-only value: ${dateOnly}`);

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) + days));

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function toDateOnlyFromDateParts(date: Date): string {
  assertValidDate(date, date);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
