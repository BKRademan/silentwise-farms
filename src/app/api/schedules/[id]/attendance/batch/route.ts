import { NextRequest } from 'next/server';
import { AttendanceDAO } from '@/lib/db';
import { handleApiRoute, ValidationError } from '@/lib/api-utils';
import { MarkAttendanceInput } from '@/types/schedule';
import { requireSouthAfricaDateOnly } from '@/lib/date-time/south-africa';

const attendanceDao = new AttendanceDAO();

type RouteContext = { params: { id: string } };

export async function POST(request: NextRequest, context: RouteContext) {
  return handleApiRoute(async () => {
    const scheduleId = parseInt(context.params.id, 10);
    if (Number.isNaN(scheduleId)) throw new ValidationError('Invalid schedule id');

    const body = await request.json();
    const marks: MarkAttendanceInput[] = body.marks;

    if (!Array.isArray(marks) || marks.length === 0) {
      throw new ValidationError('marks must be a non-empty array');
    }

    for (const m of marks) {
      if (m.employeeId == null || !m.workDate || m.status === undefined) {
        throw new ValidationError('Each mark requires employeeId, workDate, and status');
      }
    }

    return attendanceDao.markBatch(
      scheduleId,
      marks.map((mark) => ({
        ...mark,
        workDate: requireSouthAfricaDateOnly(mark.workDate, 'workDate'),
      }))
    );
  });
}
