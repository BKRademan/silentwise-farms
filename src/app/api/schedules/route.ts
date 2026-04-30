import { NextRequest } from 'next/server';
import { ScheduleDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { CreateScheduleInput } from '@/types/schedule';
import { requireSouthAfricaDateOnly } from '@/lib/date-time/south-africa';

const scheduleDao = new ScheduleDAO();

export async function GET(request: NextRequest) {
  return handleApiRoute(async () => {
    const sp = request.nextUrl.searchParams;
    const growerId = sp.get('growerId');
    const status = sp.get('status');
    const rangeStart = sp.get('rangeStart');
    const rangeEnd = sp.get('rangeEnd');

    return scheduleDao.findAllWithFilters({
      growerId: growerId ? parseInt(growerId, 10) : undefined,
      status: status ?? undefined,
      rangeStart:
        rangeStart && rangeEnd ? requireSouthAfricaDateOnly(rangeStart, 'rangeStart') : undefined,
      rangeEnd:
        rangeStart && rangeEnd ? requireSouthAfricaDateOnly(rangeEnd, 'rangeEnd') : undefined,
    });
  });
}

export async function POST(request: NextRequest) {
  return handleApiRoute(async () => {
    const body = (await request.json()) as CreateScheduleInput;
    if (!body.Grower_ID || !body.Start_Date || !body.End_Date) {
      throw new ValidationError('Grower_ID, Start_Date, and End_Date are required');
    }
    if (!Array.isArray(body.employeeIds)) {
      throw new ValidationError('employeeIds must be an array');
    }
    if (body.employeeIds.length === 0) {
      throw new ValidationError('At least one employee is required');
    }
    const id = await scheduleDao.createSchedule({
      ...body,
      Start_Date: requireSouthAfricaDateOnly(body.Start_Date, 'Start_Date'),
      End_Date: requireSouthAfricaDateOnly(body.End_Date, 'End_Date'),
    });
    return { id };
  });
}
