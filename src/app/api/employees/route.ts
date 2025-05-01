import { NextRequest } from 'next/server';
import { EmployeeDAO } from '@/lib/db/employee-dao';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { Employee } from '@/types/database';
import { NextResponse } from 'next/server';
import { HoursDAO } from '@/lib/db/hours-dao';

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
  const employeeDao = new EmployeeDAO();
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