import { NextRequest } from 'next/server';
import { EmployeeDAO } from '@/lib/db/employee-dao';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { ZodError } from 'zod';
import {
  employeeCaptureBodySchema,
  normalizeCapturedFields,
  mergeEmployeeUpdate,
  pickPatchFromRequest,
} from '@/lib/validations/employee-capture';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10);

    if (isNaN(id)) {
      return Response.json({ error: 'Invalid employee ID' }, { status: 400 });
    }

    const employeeDao = new EmployeeDAO();
    const employee = await employeeDao.findByIdWithDetails(id);

    if (!employee) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    return Response.json(employee);
  } catch (error) {
    console.error('Error fetching employee by ID:', error);
    return Response.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return Response.json({ error: 'Invalid employee ID' }, { status: 400 });
  }

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

    const existing = await employeeDao.findById(id);
    if (!existing) {
      throw new ValidationError('Employee not found');
    }

    const normalized = normalizeCapturedFields(parsed);
    const patch = pickPatchFromRequest(
      raw as Record<string, unknown>,
      normalized
    );

    const nextIdNumber =
      patch.IDNumber !== undefined ? patch.IDNumber : existing.IDNumber;
    if (nextIdNumber && /^\d{13}$/.test(String(nextIdNumber))) {
      const dup = await employeeDao.findByIdNumber(String(nextIdNumber), id);
      if (dup) {
        throw new ValidationError(
          'Another employee already has this ID number.'
        );
      }
    }

    const mergedPatch = mergeEmployeeUpdate(existing, patch);
    await employeeDao.updateEmployee(id, mergedPatch);
    return { message: 'Employee updated successfully' };
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return Response.json({ error: 'Invalid employee ID' }, { status: 400 });
  }

  const employeeDao = new EmployeeDAO();
  return handleApiRoute(async () => {
    const existing = await employeeDao.findById(id);
    if (!existing) {
      throw new ValidationError('Employee not found');
    }
    try {
      await employeeDao.deleteEmployee(id);
    } catch (e) {
      if (e instanceof Error && e.message.includes('Cannot delete')) {
        throw new ValidationError(e.message);
      }
      throw e;
    }
    return { message: 'Employee deleted successfully' };
  });
}
