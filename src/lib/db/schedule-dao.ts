import { BaseDAO } from './base-dao';
import {
  CreateScheduleInput,
  Schedule,
  ScheduleDetail,
  ScheduleWithGrower,
  ScheduleEmployeeWithEmployee,
  RecentEmployeeForGrower,
  UpdateScheduleInput,
} from '@/types/schedule';
import { eachDayOfInterval } from 'date-fns';

export class ScheduleDAO extends BaseDAO<Schedule> {
  constructor() {
    super('dbo.TSchedule');
  }

  /**
   * Normalize a date string to UTC midnight to prevent timezone shifts
   */
  private normalizeDateToUTC(dateString: string): Date {
    const date = new Date(dateString);
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  async findRecentEmployeesForGrower(
    growerId: number,
    daysBack = 60
  ): Promise<RecentEmployeeForGrower[]> {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    since.setHours(0, 0, 0, 0);

    return this.executeQuery<RecentEmployeeForGrower>(
      `SELECT e.ID, e.EmplNo, e.FirstName, e.LastName, e.knownAs,
              MAX(h.Work_Date) AS lastWorkedDate,
              COUNT(DISTINCT h.Work_Date) AS daysWorked
       FROM dbo.THour_Data_View h
       INNER JOIN dbo.TEmployee_Details e ON e.ID = h.Employee_ID_FK
       WHERE h.Grower_ID = @growerId
         AND h.Work_Date >= @since
       GROUP BY e.ID, e.EmplNo, e.FirstName, e.LastName, e.knownAs
       ORDER BY daysWorked DESC`,
      { growerId, since }
    );
  }

  async findAllWithFilters(params: {
    growerId?: number;
    status?: string;
    rangeStart?: Date;
    rangeEnd?: Date;
  }): Promise<ScheduleWithGrower[]> {
    let sql = `
      SELECT s.ID, s.Grower_ID, s.Start_Date, s.End_Date, s.Default_Hours, s.Status,
             s.Created_At, s.Updated_At,
             g.GrowerName,
             (SELECT COUNT(*) FROM dbo.TScheduleEmployee se WHERE se.Schedule_ID = s.ID) AS EmployeeCount
      FROM dbo.TSchedule s
      LEFT JOIN dbo.TGrowers g ON g.ID = s.Grower_ID
      WHERE 1 = 1`;

    const qparams: Record<string, unknown> = {};

    if (params.growerId != null) {
      sql += ` AND s.Grower_ID = @growerId`;
      qparams.growerId = params.growerId;
    }
    if (params.status) {
      sql += ` AND s.Status = @status`;
      qparams.status = params.status;
    }
    if (params.rangeStart && params.rangeEnd) {
      sql += ` AND s.Start_Date <= @rangeEnd AND s.End_Date >= @rangeStart`;
      qparams.rangeStart = params.rangeStart;
      qparams.rangeEnd = params.rangeEnd;
    }

    sql += ` ORDER BY s.Start_Date DESC, s.ID DESC`;

    return this.executeQuery<ScheduleWithGrower>(sql, qparams);
  }

  async findDetailById(id: number): Promise<ScheduleDetail | null> {
    const header = await this.executeQuery<Schedule & { GrowerName: string | null }>(
      `SELECT s.*, g.GrowerName
       FROM dbo.TSchedule s
       LEFT JOIN dbo.TGrowers g ON g.ID = s.Grower_ID
       WHERE s.ID = @id`,
      { id }
    );
    if (!header.length) return null;

    const row = header[0];
    const employees = await this.executeQuery<ScheduleEmployeeWithEmployee>(
      `SELECT se.ID, se.Schedule_ID, se.Employee_ID, se.Added_At,
              e.EmplNo, e.FirstName, e.LastName, e.knownAs
       FROM dbo.TScheduleEmployee se
       INNER JOIN dbo.TEmployee_Details e ON e.ID = se.Employee_ID
       WHERE se.Schedule_ID = @id
       ORDER BY e.EmplNo, e.LastName`,
      { id }
    );

    return {
      ID: row.ID,
      Grower_ID: row.Grower_ID,
      Start_Date: row.Start_Date,
      End_Date: row.End_Date,
      Default_Hours: row.Default_Hours,
      Status: row.Status as ScheduleDetail['Status'],
      Created_At: row.Created_At,
      Updated_At: row.Updated_At,
      GrowerName: row.GrowerName,
      employees,
    };
  }

  async createSchedule(input: CreateScheduleInput): Promise<number> {
    const start = this.normalizeDateToUTC(input.Start_Date);
    const end = this.normalizeDateToUTC(input.End_Date);
    if (end < start) {
      throw new Error('End date must be on or after start date');
    }

    const grower = await this.executeQuery<{ HrsPerDay: number | null }>(
      `SELECT HrsPerDay FROM dbo.TGrowers WHERE ID = @growerId`,
      { growerId: input.Grower_ID }
    );
    const defaultHours = grower[0]?.HrsPerDay ?? null;

    const status = input.status ?? 'draft';

    const inserted = await this.executeQuery<{ ID: number }>(
      `INSERT INTO dbo.TSchedule (Grower_ID, Start_Date, End_Date, Default_Hours, Status, Created_At, Updated_At)
       OUTPUT INSERTED.ID
       VALUES (@growerId, @startDate, @endDate, @defaultHours, @status, SYSDATETIME(), SYSDATETIME())`,
      {
        growerId: input.Grower_ID,
        startDate: start,
        endDate: end,
        defaultHours,
        status,
      }
    );

    const scheduleId = inserted[0].ID;
    const employeeIds = Array.from(new Set(input.employeeIds));

    for (const empId of employeeIds) {
      await this.executeQuery(
        `INSERT INTO dbo.TScheduleEmployee (Schedule_ID, Employee_ID, Added_At)
         VALUES (@scheduleId, @empId, SYSDATETIME())`,
        { scheduleId, empId }
      );
    }

    const days = eachDayOfInterval({ start, end });
    for (const day of days) {
      const normalizedDay = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
      for (const empId of employeeIds) {
        await this.executeQuery(
          `INSERT INTO dbo.TScheduleAttendance
           (Schedule_ID, Employee_ID, Work_Date, Status, Hours_Worked, Overtime_Hours, Absence_Reason, Hour_Record_ID, Marked_At, Marked_By)
           VALUES (@scheduleId, @empId, @workDate, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
          { scheduleId, empId, workDate: normalizedDay }
        );
      }
    }

    return scheduleId;
  }

  async countMarkedAttendance(scheduleId: number): Promise<number> {
    const r = await this.executeQuery<{ c: number }>(
      `SELECT COUNT(*) AS c FROM dbo.TScheduleAttendance
       WHERE Schedule_ID = @scheduleId AND Status IS NOT NULL`,
      { scheduleId }
    );
    return r[0]?.c ?? 0;
  }

  async updateSchedule(id: number, input: UpdateScheduleInput): Promise<void> {
    const current = await this.findById(id);
    if (!current) throw new Error('Schedule not found');
    const marked = await this.countMarkedAttendance(id);

    if (marked > 0) {
      if (input.Start_Date != null || input.End_Date != null || input.employeeIds != null) {
        throw new Error('Cannot change dates or employees after attendance has been recorded');
      }
      if (input.status != null) {
        await this.executeQuery(
          `UPDATE dbo.TSchedule SET Status = @status, Updated_At = SYSDATETIME() WHERE ID = @id`,
          { id, status: input.status }
        );
      }
      return;
    }

    const start = input.Start_Date ? this.normalizeDateToUTC(input.Start_Date) : new Date(current.Start_Date);
    const end = input.End_Date ? this.normalizeDateToUTC(input.End_Date) : new Date(current.End_Date);
    if (end < start) throw new Error('End date must be on or after start date');
    const status = input.status ?? current.Status;

    if (input.employeeIds != null) {
      await this.executeQuery(`DELETE FROM dbo.TScheduleEmployee WHERE Schedule_ID = @id`, { id });
      await this.executeQuery(`DELETE FROM dbo.TScheduleAttendance WHERE Schedule_ID = @id`, { id });

      const employeeIds = Array.from(new Set(input.employeeIds));
      const grower = await this.executeQuery<{ HrsPerDay: number | null }>(
        `SELECT HrsPerDay FROM dbo.TGrowers WHERE ID = @growerId`,
        { growerId: current.Grower_ID }
      );
      const defaultHours = grower[0]?.HrsPerDay ?? null;

      await this.executeQuery(
        `UPDATE dbo.TSchedule
         SET Start_Date = @startDate, End_Date = @endDate, Default_Hours = @defaultHours, Status = @status, Updated_At = SYSDATETIME()
         WHERE ID = @id`,
        { id, startDate: start, endDate: end, defaultHours, status }
      );

      for (const empId of employeeIds) {
        await this.executeQuery(
          `INSERT INTO dbo.TScheduleEmployee (Schedule_ID, Employee_ID, Added_At)
           VALUES (@id, @empId, SYSUTCDATETIME())`,
          { id, empId }
        );
      }

      const days = eachDayOfInterval({ start, end });
      for (const day of days) {
        const normalizedDay = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
        for (const empId of employeeIds) {
          await this.executeQuery(
            `INSERT INTO dbo.TScheduleAttendance
             (Schedule_ID, Employee_ID, Work_Date, Status, Hours_Worked, Overtime_Hours, Absence_Reason, Hour_Record_ID, Marked_At, Marked_By)
             VALUES (@id, @empId, @workDate, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
            { id, empId, workDate: normalizedDay }
          );
        }
      }
      return;
    }

    const currentStart = new Date(current.Start_Date);
    const currentEnd = new Date(current.End_Date);
    const datesChanged =
      start.getTime() !== currentStart.getTime() || end.getTime() !== currentEnd.getTime();

    if (datesChanged) {
      const empRows = await this.executeQuery<{ Employee_ID: number }>(
        `SELECT Employee_ID FROM dbo.TScheduleEmployee WHERE Schedule_ID = @id`,
        { id }
      );
      const employeeIds = empRows.map((r) => r.Employee_ID);
      await this.executeQuery(`DELETE FROM dbo.TScheduleAttendance WHERE Schedule_ID = @id`, { id });
      await this.executeQuery(
        `UPDATE dbo.TSchedule
         SET Start_Date = @startDate, End_Date = @endDate, Status = @status, Updated_At = SYSDATETIME()
         WHERE ID = @id`,
        { id, startDate: start, endDate: end, status }
      );
      const days = eachDayOfInterval({ start, end });
      for (const day of days) {
        const normalizedDay = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
        for (const empId of employeeIds) {
          await this.executeQuery(
            `INSERT INTO dbo.TScheduleAttendance
             (Schedule_ID, Employee_ID, Work_Date, Status, Hours_Worked, Overtime_Hours, Absence_Reason, Hour_Record_ID, Marked_At, Marked_By)
             VALUES (@id, @empId, @workDate, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
            { id, empId, workDate: normalizedDay }
          );
        }
      }
      return;
    }

    await this.executeQuery(
      `UPDATE dbo.TSchedule
       SET Start_Date = @startDate, End_Date = @endDate, Status = @status, Updated_At = SYSUTCDATETIME()
       WHERE ID = @id`,
      { id, startDate: start, endDate: end, status }
    );
  }

  async deleteSchedule(id: number): Promise<void> {
    const row = await this.findById(id);
    if (!row) throw new Error('Schedule not found');
    if (row.Status !== 'draft') {
      throw new Error('Cannot delete a finalized schedule. Only draft schedules can be deleted.');
    }
    await this.executeQuery(`DELETE FROM dbo.TScheduleAttendance WHERE Schedule_ID = @id`, { id });
    await this.executeQuery(`DELETE FROM dbo.TScheduleEmployee WHERE Schedule_ID = @id`, { id });
    await this.executeQuery(`DELETE FROM dbo.TSchedule WHERE ID = @id`, { id });
  }

  async getUnmarkedCount(scheduleId: number): Promise<number> {
    const r = await this.executeQuery<{ c: number }>(
      `SELECT COUNT(*) AS c FROM dbo.TScheduleAttendance
       WHERE Schedule_ID = @scheduleId AND Status IS NULL`,
      { scheduleId }
    );
    return r[0]?.c ?? 0;
  }

  async setStatus(id: number, status: Schedule['Status']): Promise<void> {
    await this.executeQuery(
      `UPDATE dbo.TSchedule SET Status = @status, Updated_At = SYSUTCDATETIME() WHERE ID = @id`,
      { id, status }
    );
  }

  async addEmployeeToSchedule(
    scheduleId: number,
    input: {
      employeeId: number;
      startDate: string;
      endDateOption: 'single' | 'remaining';
    }
  ): Promise<void> {
    const schedule = await this.findById(scheduleId);
    if (!schedule) throw new Error('Schedule not found');

    // Check if employee already on schedule
    const existing = await this.executeQuery<{ c: number }>(
      `SELECT COUNT(*) AS c FROM dbo.TScheduleEmployee
       WHERE Schedule_ID = @scheduleId AND Employee_ID = @employeeId`,
      { scheduleId, employeeId: input.employeeId }
    );
    if ((existing[0]?.c ?? 0) > 0) {
      throw new Error('Employee is already on this schedule');
    }

    // Add to roster
    await this.executeQuery(
      `INSERT INTO dbo.TScheduleEmployee (Schedule_ID, Employee_ID, Added_At)
       VALUES (@scheduleId, @employeeId, SYSUTCDATETIME())`,
      { scheduleId, employeeId: input.employeeId }
    );

    // Determine date range for attendance records
    const startDate = this.normalizeDateToUTC(input.startDate);
    const scheduleEnd = new Date(schedule.End_Date);
    
    let endDate: Date;
    if (input.endDateOption === 'single') {
      endDate = startDate;
    } else {
      endDate = scheduleEnd;
    }

    // Create attendance records
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    for (const day of days) {
      const normalizedDay = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()));
      await this.executeQuery(
        `INSERT INTO dbo.TScheduleAttendance
         (Schedule_ID, Employee_ID, Work_Date, Status, Hours_Worked, Overtime_Hours, Absence_Reason, Hour_Record_ID, Marked_At, Marked_By)
         VALUES (@scheduleId, @employeeId, @workDate, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`,
        { scheduleId, employeeId: input.employeeId, workDate: normalizedDay }
      );
    }
  }
}
