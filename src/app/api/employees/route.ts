import { NextRequest } from 'next/server';
import { EmployeeDAO } from '@/lib/db/employee-dao';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  employeeCaptureBodySchema,
  normalizeCapturedFields,
  validateCreatePayload,
  mergeCreateDefaults,
} from '@/lib/validations/employee-capture';

export async function GET() {
  try {
    const employeeDao = new EmployeeDAO();
    const employees = await employeeDao.findAllWithLastWorkedDate();
    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const employeeDao = new EmployeeDAO();
  return handleApiRoute(async () => {
    const raw = await request.json();
    let parsed;
    try {
      parsed = employeeCaptureBodySchema.parse(raw);
    } catch (e) {
      if (e instanceof ZodError) {
        const msg = e.errors[0]?.message ?? 'Validation failed';
        throw new ValidationError(msg);
      }
      throw e;
    }

    const normalized = normalizeCapturedFields(parsed);
    validateCreatePayload(normalized);

    if (normalized.IDNumber && /^\d{13}$/.test(normalized.IDNumber)) {
      const dup = await employeeDao.findByIdNumber(normalized.IDNumber);
      if (dup) {
        throw new ValidationError(
          'An employee with this ID number already exists.'
        );
      }
    }

    const row = mergeCreateDefaults(normalized);
    return employeeDao.addEmployee(row);
  });
}
