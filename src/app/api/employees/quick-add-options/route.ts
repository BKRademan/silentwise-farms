import { NextResponse } from 'next/server';
import { EmployeeDAO } from '@/lib/db/employee-dao';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const employeeDao = new EmployeeDAO();
    
    const [availableNumbers, defaultRate] = await Promise.all([
      employeeDao.getAvailableEmployeeNumbers(),
      employeeDao.getMostCommonRate(),
    ]);

    return NextResponse.json({
      availableNumbers,
      defaultRate,
    });
  } catch (error) {
    console.error('Error fetching quick-add options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick-add options' },
      { status: 500 }
    );
  }
}
