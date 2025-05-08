import { NextRequest } from 'next/server';
import { HoursDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';

const hoursDao = new HoursDAO();

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get('employeeId');
    const workDate = searchParams.get('workDate');
    const recordId = searchParams.get('recordId');
    
    if (!employeeId || !workDate) {
      throw new ValidationError('Employee ID and work date are required');
    }

    const exists = await hoursDao.checkEmployeeRecordExists(
      parseInt(employeeId),
      new Date(workDate),
      recordId ? parseInt(recordId) : undefined
    );

    return { exists };
  });
} 