import { NextRequest } from 'next/server';
import { ScheduleDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { ScheduleStatus, UpdateScheduleInput } from '@/types/schedule';
import { requireSouthAfricaDateOnly } from '@/lib/date-time/south-africa';

const scheduleDao = new ScheduleDAO();
const validStatuses = new Set<ScheduleStatus>(['draft', 'active', 'completed']);

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, context: RouteContext) {
  return handleApiRoute(async () => {
    const id = parseInt(context.params.id, 10);
    if (Number.isNaN(id)) throw new ValidationError('Invalid id');
    const detail = await scheduleDao.findDetailById(id);
    if (!detail) throw new ValidationError('Schedule not found');
    return detail;
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleApiRoute(async () => {
    const id = parseInt(context.params.id, 10);
    if (Number.isNaN(id)) throw new ValidationError('Invalid id');
    const body = (await request.json()) as UpdateScheduleInput;
    await scheduleDao.updateSchedule(id, {
      ...body,
      Start_Date: body.Start_Date
        ? requireSouthAfricaDateOnly(body.Start_Date, 'Start_Date')
        : undefined,
      End_Date: body.End_Date
        ? requireSouthAfricaDateOnly(body.End_Date, 'End_Date')
        : undefined,
    });
    return { message: 'Schedule updated' };
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleApiRoute(async () => {
    const id = parseInt(context.params.id, 10);
    if (Number.isNaN(id)) throw new ValidationError('Invalid id');
    const body = await request.json();
    if (!body.status) throw new ValidationError('Status is required');
    if (!validStatuses.has(body.status)) throw new ValidationError('Invalid status');

    if (body.status === 'completed' && !body.force) {
      const unmarked = await scheduleDao.getUnmarkedCount(id);
      if (unmarked > 0) {
        throw new ValidationError(
          `Cannot complete: ${unmarked} attendance slot${unmarked === 1 ? '' : 's'} not yet marked. Mark all days or complete anyway.`
        );
      }
    }

    await scheduleDao.setStatus(id, body.status);
    return { message: 'Schedule status updated' };
  });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  return handleApiRoute(async () => {
    const id = parseInt(context.params.id, 10);
    if (Number.isNaN(id)) throw new ValidationError('Invalid id');
    await scheduleDao.deleteSchedule(id);
    return { message: 'Schedule deleted' };
  });
}
