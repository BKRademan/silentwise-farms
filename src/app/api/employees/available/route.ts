import { NextResponse } from 'next/server';
import { EmployeeDAO } from '@/lib/db/employee-dao';

export async function GET() {
  try {
    const employeeDao = new EmployeeDAO();
    const availableEmployeeNumbers = await employeeDao.getAvailableEmployeeNumbers();
    return NextResponse.json(availableEmployeeNumbers);
  } catch (error) {
    console.error('Error fetching available employee numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available employee numbers' },
      { status: 500 }
    );
  }
} 