import { NextResponse } from 'next/server';
import { EmployeeDAO } from '@/lib/db/employee-dao';

export async function GET() {
  try {
    const employeeDao = new EmployeeDAO();
    const availableEmployeeNumbers = await employeeDao.getAvailableEmployeeNumbers();
    
    // Return with cache control headers to prevent caching
    return new NextResponse(JSON.stringify(availableEmployeeNumbers), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Error fetching available employee numbers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available employee numbers' },
      { status: 500 }
    );
  }
} 