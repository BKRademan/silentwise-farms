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
    
    if (!body.EmplNo || !body.LastName || !body.FirstName) {
      throw new ValidationError('Missing required fields');
    }

    const employee: Omit<Employee, 'ID'> = {
      EmplNo: body.EmplNo,
      LastName: body.LastName,
      FirstName: body.FirstName,
      knownAs: body.knownAs || null,
      RATE: body.RATE || null,
      IDNumber: body.IDNumber || null,
      DateEngaged: body.DateEngaged ? new Date(body.DateEngaged) : null
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
      EmplNo: body.EmplNo,
      LastName: body.LastName,
      FirstName: body.FirstName,
      knownAs: body.knownAs,
      RATE: body.RATE,
      IDNumber: body.IDNumber,
      DateEngaged: body.DateEngaged ? new Date(body.DateEngaged) : undefined
    };

    await employeeDao.updateEmployee(body.id, updates);
    return { message: 'Employee updated successfully' };
  });
} 