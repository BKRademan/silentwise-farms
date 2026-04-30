import { NextRequest } from 'next/server';
import { AttendanceDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { MarkAttendanceInput } from '@/types/schedule';

const attendanceDao = new AttendanceDAO();

type RouteContext = { params: { id: string } };

export async function GET(request: NextRequest, context: RouteContext) {
  return handleApiRoute(async () => {
    const scheduleId = parseInt(context.params.id, 10);
    if (Number.isNaN(scheduleId)) throw new ValidationError('Invalid schedule id');
    const workDateStr = request.nextUrl.searchParams.get('workDate');
    const workDate = workDateStr ? new Date(workDateStr) : undefined;
    if (workDateStr && Number.isNaN(workDate!.getTime())) {
      throw new ValidationError('Invalid workDate');
    }
    return attendanceDao.findBySchedule(scheduleId, workDate);
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleApiRoute(async () => {
    const scheduleId = parseInt(context.params.id, 10);
    if (Number.isNaN(scheduleId)) throw new ValidationError('Invalid schedule id');
    const body = (await request.json()) as MarkAttendanceInput;
    if (body.employeeId == null || !body.workDate || body.status === undefined) {
      throw new ValidationError('employeeId, workDate, and status are required');
    }
    return attendanceDao.markAttendance(scheduleId, body);
  });
}
