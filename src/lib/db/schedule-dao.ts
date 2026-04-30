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
import {
  addDaysToDateOnly,
  SQL_SOUTH_AFRICA_NOW,
  toSouthAfricaDateOnly,
} from '@/lib/date-time/south-africa';

export class ScheduleDAO extends BaseDAO<Schedule> {
  constructor() {
    super('dbo.TSchedule');
  }

  private normalizeDateOnly(dateInput: string | Date): string {
    const dateOnly = toSouthAfricaDateOnly(dateInput);
    if (!dateOnly) throw new Error('Date is required');
    return dateOnly;
  }

  private dateRangeJson(start: string, end: string): string {
    const days: string[] = [];
    for (let day = start; day <= end; day = addDaysToDateOnly(day, 1)) {
      days.push(day);
    }
    return JSON.stringify(days);
  }

  async findRecentEmployeesForGrower(
    growerId: number,
    daysBack = 60
  ): Promise<RecentEmployeeForGrower[]> {
    const today = this.normalizeDateOnly(new Date());
    const since = `${addDaysToDateOnly(today, -daysBack)} 00:00:00.000`;

    return this.executeQuery<RecentEmployeeForGrower>(
      `SELECT e.ID, e.EmplNo, e.FirstName, e.LastName, e.knownAs,
              MAX(h.Work_Date) AS lastWorkedDate,
              COUNT(DISTINCT h.Work_Date) AS daysWorked
       FROM dbo.THour_Data_View h
       INNER JOIN dbo.TEmployee_Details e ON e.ID = h.Employee_ID_FK
       WHERE h.Grower_ID = @growerId
         AND h.Work_Date >= CONVERT(datetime2, @since, 121)
       GROUP BY e.ID, e.EmplNo, e.FirstName, e.LastName, e.knownAs
       ORDER BY daysWorked DESC`,
      { growerId, since }
    );
  }

  async findAllWithFilters(params: {
    growerId?: number;
    status?: string;
    rangeStart?: Date | string;
    rangeEnd?: Date | string;
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
      sql += ` AND s.Start_Date <= CONVERT(date, @rangeEnd, 23)
               AND s.End_Date >= CONVERT(date, @rangeStart, 23)`;
      qparams.rangeStart = this.normalizeDateOnly(params.rangeStart);
      qparams.rangeEnd = this.normalizeDateOnly(params.rangeEnd);
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
    const start = this.normalizeDateOnly(input.Start_Date);
    const end = this.normalizeDateOnly(input.End_Date);
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
      `DECLARE @insertedSchedule TABLE (ID INT);

       INSERT INTO dbo.TSchedule (Grower_ID, Start_Date, End_Date, Default_Hours, Status, Created_At, Updated_At)
       OUTPUT INSERTED.ID INTO @insertedSchedule
       VALUES (@growerId, CONVERT(date, @startDate, 23), CONVERT(date, @endDate, 23), @defaultHours, @status, ${SQL_SOUTH_AFRICA_NOW}, ${SQL_SOUTH_AFRICA_NOW});

       DECLARE @scheduleId INT = (SELECT TOP 1 ID FROM @insertedSchedule);

       ;WITH EmployeeIds AS (
         SELECT DISTINCT TRY_CONVERT(INT, [value]) AS Employee_ID
         FROM OPENJSON(@employeeIdsJson)
         WHERE TRY_CONVERT(INT, [value]) IS NOT NULL
       ),
       WorkDates AS (
         SELECT CONVERT(DATE, [value]) AS Work_Date
         FROM OPENJSON(@workDatesJson)
       )
       INSERT INTO dbo.TScheduleEmployee (Schedule_ID, Employee_ID, Added_At)
       SELECT @scheduleId, Employee_ID, ${SQL_SOUTH_AFRICA_NOW}
       FROM EmployeeIds;

       ;WITH EmployeeIds AS (
         SELECT DISTINCT TRY_CONVERT(INT, [value]) AS Employee_ID
         FROM OPENJSON(@employeeIdsJson)
         WHERE TRY_CONVERT(INT, [value]) IS NOT NULL
       ),
       WorkDates AS (
         SELECT CONVERT(DATE, [value]) AS Work_Date
         FROM OPENJSON(@workDatesJson)
       )
       INSERT INTO dbo.TScheduleAttendance
         (Schedule_ID, Employee_ID, Work_Date, Status, Hours_Worked, Overtime_Hours, Absence_Reason, Hour_Record_ID, Marked_At, Marked_By)
       SELECT @scheduleId, e.Employee_ID, d.Work_Date, NULL, NULL, NULL, NULL, NULL, NULL, NULL
       FROM EmployeeIds e
       CROSS JOIN WorkDates d;

       SELECT @scheduleId AS ID;`,
      {
        growerId: input.Grower_ID,
        startDate: start,
        endDate: end,
        defaultHours,
        status,
        employeeIdsJson: JSON.stringify(Array.from(new Set(input.employeeIds))),
        workDatesJson: this.dateRangeJson(start, end),
      }
    );

    const scheduleId = inserted[0].ID;
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
          `UPDATE dbo.TSchedule SET Status = @status, Updated_At = ${SQL_SOUTH_AFRICA_NOW} WHERE ID = @id`,
          { id, status: input.status }
        );
      }
      return;
    }

    const start = input.Start_Date ? this.normalizeDateOnly(input.Start_Date) : this.normalizeDateOnly(current.Start_Date);
    const end = input.End_Date ? this.normalizeDateOnly(input.End_Date) : this.normalizeDateOnly(current.End_Date);
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
         SET Start_Date = CONVERT(date, @startDate, 23), End_Date = CONVERT(date, @endDate, 23), Default_Hours = @defaultHours, Status = @status, Updated_At = ${SQL_SOUTH_AFRICA_NOW}
         WHERE ID = @id`,
        { id, startDate: start, endDate: end, defaultHours, status }
      );

      await this.insertRosterAndAttendance(id, employeeIds, start, end);
      return;
    }

    const currentStart = this.normalizeDateOnly(current.Start_Date);
    const currentEnd = this.normalizeDateOnly(current.End_Date);
    const datesChanged =
      start !== currentStart || end !== currentEnd;

    if (datesChanged) {
      const empRows = await this.executeQuery<{ Employee_ID: number }>(
        `SELECT Employee_ID FROM dbo.TScheduleEmployee WHERE Schedule_ID = @id`,
        { id }
      );
      const employeeIds = empRows.map((r) => r.Employee_ID);
      await this.executeQuery(`DELETE FROM dbo.TScheduleAttendance WHERE Schedule_ID = @id`, { id });
      await this.executeQuery(
        `UPDATE dbo.TSchedule
         SET Start_Date = CONVERT(date, @startDate, 23), End_Date = CONVERT(date, @endDate, 23), Status = @status, Updated_At = ${SQL_SOUTH_AFRICA_NOW}
         WHERE ID = @id`,
        { id, startDate: start, endDate: end, status }
      );
      await this.insertAttendanceRows(id, employeeIds, start, end);
      return;
    }

    await this.executeQuery(
      `UPDATE dbo.TSchedule
       SET Start_Date = CONVERT(date, @startDate, 23), End_Date = CONVERT(date, @endDate, 23), Status = @status, Updated_At = ${SQL_SOUTH_AFRICA_NOW}
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
    const current = await this.findById(id);
    if (!current) throw new Error('Schedule not found');

    if (current.Status === 'completed' && status !== 'completed') {
      throw new Error('Completed schedules cannot be reopened.');
    }

    if (current.Status === 'active' && status === 'draft') {
      const marked = await this.countMarkedAttendance(id);
      if (marked > 0) {
        throw new Error('Cannot set schedule back to draft while attendance has been marked.');
      }
    }

    await this.executeQuery(
      `UPDATE dbo.TSchedule SET Status = @status, Updated_At = ${SQL_SOUTH_AFRICA_NOW} WHERE ID = @id`,
      { id, status }
    );
  }

  private async insertRosterAndAttendance(
    scheduleId: number,
    employeeIds: number[],
    start: string,
    end: string
  ): Promise<void> {
    await this.executeQuery(
      `;WITH EmployeeIds AS (
         SELECT DISTINCT TRY_CONVERT(INT, [value]) AS Employee_ID
         FROM OPENJSON(@employeeIdsJson)
         WHERE TRY_CONVERT(INT, [value]) IS NOT NULL
       ),
       WorkDates AS (
         SELECT CONVERT(DATE, [value]) AS Work_Date
         FROM OPENJSON(@workDatesJson)
       )
       INSERT INTO dbo.TScheduleEmployee (Schedule_ID, Employee_ID, Added_At)
       SELECT @scheduleId, Employee_ID, ${SQL_SOUTH_AFRICA_NOW}
       FROM EmployeeIds;

       ;WITH EmployeeIds AS (
         SELECT DISTINCT TRY_CONVERT(INT, [value]) AS Employee_ID
         FROM OPENJSON(@employeeIdsJson)
         WHERE TRY_CONVERT(INT, [value]) IS NOT NULL
       ),
       WorkDates AS (
         SELECT CONVERT(DATE, [value]) AS Work_Date
         FROM OPENJSON(@workDatesJson)
       )
       INSERT INTO dbo.TScheduleAttendance
         (Schedule_ID, Employee_ID, Work_Date, Status, Hours_Worked, Overtime_Hours, Absence_Reason, Hour_Record_ID, Marked_At, Marked_By)
       SELECT @scheduleId, e.Employee_ID, d.Work_Date, NULL, NULL, NULL, NULL, NULL, NULL, NULL
       FROM EmployeeIds e
       CROSS JOIN WorkDates d;`,
      {
        scheduleId,
        employeeIdsJson: JSON.stringify(Array.from(new Set(employeeIds))),
        workDatesJson: this.dateRangeJson(start, end),
      }
    );
  }

  private async insertAttendanceRows(
    scheduleId: number,
    employeeIds: number[],
    start: string,
    end: string
  ): Promise<void> {
    await this.executeQuery(
      `;WITH EmployeeIds AS (
         SELECT DISTINCT TRY_CONVERT(INT, [value]) AS Employee_ID
         FROM OPENJSON(@employeeIdsJson)
         WHERE TRY_CONVERT(INT, [value]) IS NOT NULL
       ),
       WorkDates AS (
         SELECT CONVERT(DATE, [value]) AS Work_Date
         FROM OPENJSON(@workDatesJson)
       )
       INSERT INTO dbo.TScheduleAttendance
         (Schedule_ID, Employee_ID, Work_Date, Status, Hours_Worked, Overtime_Hours, Absence_Reason, Hour_Record_ID, Marked_At, Marked_By)
       SELECT @scheduleId, e.Employee_ID, d.Work_Date, NULL, NULL, NULL, NULL, NULL, NULL, NULL
       FROM EmployeeIds e
       CROSS JOIN WorkDates d;`,
      {
        scheduleId,
        employeeIdsJson: JSON.stringify(Array.from(new Set(employeeIds))),
        workDatesJson: this.dateRangeJson(start, end),
      }
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
    // Determine date range for attendance records
    const startDate = this.normalizeDateOnly(input.startDate);
    const scheduleEnd = this.normalizeDateOnly(schedule.End_Date);
    
    let endDate: string;
    if (input.endDateOption === 'single') {
      endDate = startDate;
    } else {
      endDate = scheduleEnd;
    }

    await this.insertRosterAndAttendance(scheduleId, [input.employeeId], startDate, endDate);
  }
}
