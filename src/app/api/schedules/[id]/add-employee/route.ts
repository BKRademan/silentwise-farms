import { NextRequest } from 'next/server';
import { ScheduleDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';

const scheduleDao = new ScheduleDAO();

type RouteContext = { params: { id: string } };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleApiRoute(async () => {
    const scheduleId = parseInt(context.params.id, 10);
    if (Number.isNaN(scheduleId)) throw new ValidationError('Invalid schedule id');

    const body = await request.json();
    const { employeeId, startDate, endDateOption } = body;

    if (!employeeId) {
      throw new ValidationError('employeeId is required');
    }
    if (!startDate) {
      throw new ValidationError('startDate is required');
    }
    if (!endDateOption || !['single', 'remaining'].includes(endDateOption)) {
      throw new ValidationError('endDateOption must be "single" or "remaining"');
    }

    await scheduleDao.addEmployeeToSchedule(scheduleId, {
      employeeId,
      startDate,
      endDateOption,
    });

    return { message: 'Employee added to schedule' };
  });
}
