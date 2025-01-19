import { NextRequest } from 'next/server';
import { EmployeeDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { Employee } from '@/types/database';
import { NextResponse } from 'next/server';

const employeeDao = new EmployeeDAO();

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting employee fetch request...');
    const employees = await employeeDao.findActive();
    console.log('✅ Successfully fetched employees from database');

    return NextResponse.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('❌ Error in /api/employees GET:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch employees',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
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