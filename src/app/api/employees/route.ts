import { NextRequest } from 'next/server';
import { EmployeeDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { Employee } from '@/types/database';
import { NextResponse } from 'next/server';

const employeeDao = new EmployeeDAO();

export async function GET() {
  const employees = await employeeDao.findActive();
  return NextResponse.json(employees);
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    
    if (!body.Employee || !body.Surname || !body.FirstName) {
      throw new ValidationError('Missing required fields');
    }

    const employee: Omit<Employee, 'ID'> = {
      Employee: body.Employee,
      Surname: body.Surname,
      FirstName: body.FirstName,
      KnownAs: body.KnownAs || null,
      RATE: body.RATE || null,
      IDNumber: body.IDNumber || null,
      StartDate: body.StartDate ? new Date(body.StartDate) : null
    };

    return employeeDao.addEmployee(employee);
  });
}

export async function PUT(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = await request.json();
    
    if (!body.id) {
      throw new ValidationError('Missing employee ID');
    }

    const updates: Partial<Employee> = {
      Employee: body.Employee,
      Surname: body.Surname,
      FirstName: body.FirstName,
      KnownAs: body.KnownAs,
      RATE: body.RATE,
      IDNumber: body.IDNumber,
      StartDate: body.StartDate ? new Date(body.StartDate) : undefined
    };

    await employeeDao.updateEmployee(body.id, updates);
    return { message: 'Employee updated successfully' };
  });
} 