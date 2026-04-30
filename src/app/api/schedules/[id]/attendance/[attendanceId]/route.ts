import { NextRequest } from 'next/server';
import { AttendanceDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { MarkAttendanceInput } from '@/types/schedule';
import { requireSouthAfricaDateOnly } from '@/lib/date-time/south-africa';

const attendanceDao = new AttendanceDAO();

type RouteContext = {
  params: { id: string; attendanceId: string };
};

export async function PUT(request: NextRequest, context: RouteContext) {
  return handleApiRoute(async () => {
    const attendanceId = parseInt(context.params.attendanceId, 10);
    if (Number.isNaN(attendanceId)) {
      throw new ValidationError('Invalid attendanceId');
    }
    const body = (await request.json()) as MarkAttendanceInput;
    if (body.status === undefined) {
      throw new ValidationError('status is required');
    }
    return attendanceDao.updateAttendanceById(attendanceId, {
      ...body,
      workDate: body.workDate
        ? requireSouthAfricaDateOnly(body.workDate, 'workDate')
        : undefined,
    });
  });
}
