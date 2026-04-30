import { NextRequest } from 'next/server';
import { ScheduleDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';

const scheduleDao = new ScheduleDAO();

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const growerId = request.nextUrl.searchParams.get('growerId');
    const days = request.nextUrl.searchParams.get('days');
    if (!growerId) {
      throw new ValidationError('growerId is required');
    }
    return scheduleDao.findRecentEmployeesForGrower(
      parseInt(growerId, 10),
      days ? parseInt(days, 10) : 60
    );
  });
}
