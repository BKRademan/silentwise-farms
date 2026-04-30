import { BaseDAO } from './base-dao';
import { HoursDAO } from './hours-dao';
import { MarkAttendanceInput, Schedule, ScheduleAttendance, AttendanceStatus } from '@/types/schedule';

const hoursDao = new HoursDAO();

export class AttendanceDAO extends BaseDAO<ScheduleAttendance> {
  constructor() {
    super('dbo.TScheduleAttendance');
  }

  /**
   * Normalize a date to UTC midnight to prevent timezone shifts
   */
  private normalizeDateToUTC(dateInput: string | Date): Date {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  }

  async findBySchedule(
    scheduleId: number,
    workDate?: Date
  ): Promise<ScheduleAttendance[]> {
    if (workDate) {
      return this.executeQuery<ScheduleAttendance>(
        `SELECT * FROM dbo.TScheduleAttendance
         WHERE Schedule_ID = @scheduleId AND Work_Date = @workDate
         ORDER BY Employee_ID`,
        { scheduleId, workDate }
      );
    }
    return this.executeQuery<ScheduleAttendance>(
      `SELECT * FROM dbo.TScheduleAttendance
       WHERE Schedule_ID = @scheduleId
       ORDER BY Work_Date, Employee_ID`,
      { scheduleId }
    );
  }

  async findById(id: number): Promise<ScheduleAttendance | null> {
    const rows = await this.executeQuery<ScheduleAttendance>(
      `SELECT * FROM dbo.TScheduleAttendance WHERE ID = @id`,
      { id }
    );
    return rows[0] ?? null;
  }

  /** Ensures employee is on the schedule roster */
  private async assertEmployeeOnSchedule(
    scheduleId: number,
    employeeId: number
  ): Promise<void> {
    const r = await this.executeQuery<{ c: number }>(
      `SELECT COUNT(*) AS c FROM dbo.TScheduleEmployee
       WHERE Schedule_ID = @scheduleId AND Employee_ID = @employeeId`,
      { scheduleId, employeeId }
    );
    if ((r[0]?.c ?? 0) === 0) {
      throw new Error('Employee is not on this schedule');
    }
  }

  /**
   * Marks attendance and syncs dbo.THours for present / PH / sick / OT.
   */
  async markAttendance(
    scheduleId: number,
    input: MarkAttendanceInput
  ): Promise<ScheduleAttendance> {
    if (input.employeeId == null || input.workDate == null || input.workDate === '') {
      throw new Error('employeeId and workDate are required');
    }
    await this.assertEmployeeOnSchedule(scheduleId, input.employeeId);

    const schedules = await this.executeQuery<Schedule>(
      `SELECT * FROM dbo.TSchedule WHERE ID = @scheduleId`,
      { scheduleId }
    );
    const schedule = schedules[0];
    if (!schedule) throw new Error('Schedule not found');
    if (schedule.Status !== 'active') {
      throw new Error('Cannot mark attendance on a schedule that is not active. Finalize the schedule first.');
    }

    const workDate = this.normalizeDateToUTC(input.workDate);

    if (
      input.status === 'unmarked' &&
      !input.isPublicHoliday &&
      !input.isSickLeave
    ) {
      const rows = await this.executeQuery<ScheduleAttendance>(
        `SELECT * FROM dbo.TScheduleAttendance
         WHERE Schedule_ID = @scheduleId AND Employee_ID = @employeeId AND Work_Date = @workDate`,
        { scheduleId, employeeId: input.employeeId, workDate }
      );
      const att0 = rows[0];
      if (!att0) throw new Error('No attendance slot for this employee and date');
      if (att0.Hour_Record_ID) {
        // First clear the foreign key reference
        await this.executeQuery(
          `UPDATE dbo.TScheduleAttendance SET Hour_Record_ID = NULL WHERE ID = @id`,
          { id: att0.ID }
        );
        // Then delete the hours record
        await hoursDao.deleteHourRecord(att0.Hour_Record_ID);
      }
      await this.executeQuery(
        `UPDATE dbo.TScheduleAttendance
         SET Status = NULL, Hours_Worked = NULL, Overtime_Hours = NULL, Absence_Reason = NULL,
             Hour_Record_ID = NULL, Marked_At = NULL, Marked_By = NULL
         WHERE ID = @id`,
        { id: att0.ID }
      );
      const cleared = await this.findById(att0.ID);
      if (!cleared) throw new Error('Attendance row missing after clear');
      return cleared;
    }

    const rows = await this.executeQuery<ScheduleAttendance>(
      `SELECT * FROM dbo.TScheduleAttendance
       WHERE Schedule_ID = @scheduleId AND Employee_ID = @employeeId AND Work_Date = @workDate`,
      { scheduleId, employeeId: input.employeeId, workDate }
    );
    const att = rows[0];
    if (!att) {
      throw new Error('No attendance slot for this employee and date');
    }

    const defaultHrs = schedule.Default_Hours ?? 0;
    const growerId = schedule.Grower_ID;

    let resolvedStatus: AttendanceStatus | null =
      input.status === 'unmarked' ? null : (input.status as AttendanceStatus);

    if (input.isPublicHoliday) {
      resolvedStatus = 'public_holiday';
    } else if (input.isSickLeave) {
      resolvedStatus = 'sick_leave';
    } else if (
      resolvedStatus === 'present' &&
      (input.overtimeHours ?? 0) > 0
    ) {
      resolvedStatus = 'overtime';
    }

    // Clear
    if (resolvedStatus === null) {
      if (att.Hour_Record_ID) {
        // First clear the foreign key reference
        await this.executeQuery(
          `UPDATE dbo.TScheduleAttendance SET Hour_Record_ID = NULL WHERE ID = @id`,
          { id: att.ID }
        );
        // Then delete the hours record
        await hoursDao.deleteHourRecord(att.Hour_Record_ID);
      }
      await this.executeQuery(
        `UPDATE dbo.TScheduleAttendance
         SET Status = NULL, Hours_Worked = NULL, Overtime_Hours = NULL, Absence_Reason = NULL,
             Hour_Record_ID = NULL, Marked_At = NULL, Marked_By = NULL
         WHERE ID = @id`,
        { id: att.ID }
      );
      const cleared = await this.findById(att.ID);
      if (!cleared) throw new Error('Attendance row missing after clear');
      return cleared;
    }

    // Absent — no THours row
    if (resolvedStatus === 'absent') {
      if (att.Hour_Record_ID) {
        // First clear the foreign key reference
        await this.executeQuery(
          `UPDATE dbo.TScheduleAttendance SET Hour_Record_ID = NULL WHERE ID = @id`,
          { id: att.ID }
        );
        // Then delete the hours record
        await hoursDao.deleteHourRecord(att.Hour_Record_ID);
      }
      await this.executeQuery(
        `UPDATE dbo.TScheduleAttendance
         SET Status = 'absent', Hours_Worked = NULL, Overtime_Hours = NULL,
             Absence_Reason = @absenceReason, Hour_Record_ID = NULL,
             Marked_At = SYSDATETIME(), Marked_By = @markedBy
         WHERE ID = @id`,
        {
          id: att.ID,
          absenceReason: input.absenceReason ?? null,
          markedBy: input.markedBy ?? null,
        }
      );
      const updated = await this.findById(att.ID);
      if (!updated) throw new Error('Attendance row missing');
      return updated;
    }

    const ot = Math.max(0, input.overtimeHours ?? 0);

    let hourRecordId = att.Hour_Record_ID;

    const empId = input.employeeId!;

    const buildHourPayload = () => {
      if (resolvedStatus === 'public_holiday') {
        return {
          Work_Date: workDate,
          Hours_Worked: 0,
          Employee_ID_FK: empId,
          Grower_ID: growerId,
          Overtime: 0,
          PHoliday: defaultHrs,
          Sick_Leave: 0,
          Employee: null,
          GrowerName: null,
          Emp_Rate: null,
          Con_Tot: null,
          Man_Fee: null,
        };
      }
      if (resolvedStatus === 'sick_leave') {
        return {
          Work_Date: workDate,
          Hours_Worked: 0,
          Employee_ID_FK: empId,
          Grower_ID: growerId,
          Overtime: 0,
          PHoliday: 0,
          Sick_Leave: defaultHrs,
          Employee: null,
          GrowerName: null,
          Emp_Rate: null,
          Con_Tot: null,
          Man_Fee: null,
        };
      }
      // present / overtime
      return {
        Work_Date: workDate,
        Hours_Worked: defaultHrs,
        Employee_ID_FK: empId,
        Grower_ID: growerId,
        Overtime: ot,
        PHoliday: 0,
        Sick_Leave: 0,
        Employee: null,
        GrowerName: null,
        Emp_Rate: null,
        Con_Tot: null,
        Man_Fee: null,
      };
    };

    const payload = buildHourPayload();

    const existsOther = await hoursDao.checkEmployeeRecordExists(
      empId,
      workDate,
      hourRecordId ?? undefined
    );
    if (existsOther && !hourRecordId) {
      throw new Error(
        'This employee already has hours recorded for this date (outside this schedule). Remove or edit that entry first.'
      );
    }

    if (hourRecordId) {
      await hoursDao.updateHourRecord(hourRecordId, {
        Work_Date: payload.Work_Date,
        Hours_Worked: payload.Hours_Worked,
        Employee_ID_FK: payload.Employee_ID_FK,
        Grower_ID: payload.Grower_ID,
        Overtime: payload.Overtime,
        PHoliday: payload.PHoliday,
        Sick_Leave: payload.Sick_Leave,
      });
    } else {
      const created = await hoursDao.addHourRecord(payload);
      hourRecordId = created.ID;
    }

    const hw =
      resolvedStatus === 'public_holiday' || resolvedStatus === 'sick_leave'
        ? 0
        : defaultHrs;

    await this.executeQuery(
      `UPDATE dbo.TScheduleAttendance
       SET Status = @status, Hours_Worked = @hoursWorked, Overtime_Hours = @ot,
           Absence_Reason = NULL, Hour_Record_ID = @hourRecordId,
           Marked_At = SYSDATETIME(), Marked_By = @markedBy
       WHERE ID = @id`,
      {
        id: att.ID,
        status: resolvedStatus,
        hoursWorked: hw,
        ot: resolvedStatus === 'present' || resolvedStatus === 'overtime' ? ot : null,
        hourRecordId,
        markedBy: input.markedBy ?? null,
      }
    );

    const updated = await this.findById(att.ID);
    if (!updated) throw new Error('Attendance row missing');
    return updated;
  }

  /**
   * Batch-marks multiple attendance entries in a single call.
   * Pre-loads shared data (schedule, roster, all attendance rows) once
   * to minimise SQL round-trips compared to calling markAttendance N times.
   */
  async markBatch(
    scheduleId: number,
    inputs: MarkAttendanceInput[]
  ): Promise<ScheduleAttendance[]> {
    if (inputs.length === 0) return [];

    const preparedMarks = new Map<string, {
      employeeId: number;
      workDate: string;
      status: AttendanceStatus;
      overtimeHours: number;
      absenceReason: string | null;
      markedBy: string | null;
    }>();

    for (const input of inputs) {
      if (input.employeeId == null || !input.workDate) {
        throw new Error('employeeId and workDate are required for each mark');
      }

      const workDate = this.normalizeDateToUTC(input.workDate);
      let resolvedStatus: AttendanceStatus | null =
        input.status === 'unmarked' ? null : (input.status as AttendanceStatus);

      if (input.isPublicHoliday) {
        resolvedStatus = 'public_holiday';
      } else if (input.isSickLeave) {
        resolvedStatus = 'sick_leave';
      } else if (resolvedStatus === 'present' && (input.overtimeHours ?? 0) > 0) {
        resolvedStatus = 'overtime';
      }

      const workDateKey = workDate.toISOString().slice(0, 10);
      preparedMarks.set(`${input.employeeId}-${workDateKey}`, {
        employeeId: input.employeeId,
        workDate: workDateKey,
        status: resolvedStatus,
        overtimeHours: Math.max(0, input.overtimeHours ?? 0),
        absenceReason: input.absenceReason ?? null,
        markedBy: input.markedBy ?? null,
      });
    }

    return this.executeQuery<ScheduleAttendance>(
      `SET XACT_ABORT ON;

       DECLARE @scheduleStatus NVARCHAR(20);
       DECLARE @defaultHours DECIMAL(10, 2);
       DECLARE @growerId INT;
       DECLARE @growerManFee DECIMAL(18, 4);
       DECLARE @growerHasManFee BIT;
       DECLARE @growerContPerc DECIMAL(18, 4);

       SELECT
         @scheduleStatus = s.Status,
         @defaultHours = COALESCE(s.Default_Hours, 0),
         @growerId = s.Grower_ID,
         @growerManFee = g.ManFee,
         @growerHasManFee = g.HasManFee,
         @growerContPerc = g.ContPerc
       FROM dbo.TSchedule s
       LEFT JOIN dbo.TGrowers g ON g.ID = s.Grower_ID
       WHERE s.ID = @scheduleId;

       IF @scheduleStatus IS NULL
         THROW 50000, 'Schedule not found', 1;

       IF @scheduleStatus <> 'active'
         THROW 50000, 'Cannot mark attendance on a schedule that is not active. Finalize the schedule first.', 1;

       DECLARE @Marks TABLE (
         Employee_ID INT NOT NULL,
         Work_Date DATE NOT NULL,
         Status NVARCHAR(50) NULL,
         Overtime_Hours DECIMAL(10, 2) NOT NULL,
         Absence_Reason NVARCHAR(4000) NULL,
         Marked_By NVARCHAR(255) NULL,
         PRIMARY KEY (Employee_ID, Work_Date)
       );

       INSERT INTO @Marks (Employee_ID, Work_Date, Status, Overtime_Hours, Absence_Reason, Marked_By)
       SELECT Employee_ID, Work_Date, Status, COALESCE(Overtime_Hours, 0), Absence_Reason, Marked_By
       FROM OPENJSON(@marksJson)
       WITH (
         Employee_ID INT '$.employeeId',
         Work_Date DATE '$.workDate',
         Status NVARCHAR(50) '$.status',
         Overtime_Hours DECIMAL(10, 2) '$.overtimeHours',
         Absence_Reason NVARCHAR(4000) '$.absenceReason',
         Marked_By NVARCHAR(255) '$.markedBy'
       );

       IF EXISTS (
         SELECT 1
         FROM @Marks m
         LEFT JOIN dbo.TScheduleEmployee se
           ON se.Schedule_ID = @scheduleId AND se.Employee_ID = m.Employee_ID
         WHERE se.Employee_ID IS NULL
       )
         THROW 50000, 'One or more employees are not on this schedule', 1;

       DECLARE @Work TABLE (
         Attendance_ID INT NOT NULL PRIMARY KEY,
         Employee_ID INT NOT NULL,
         Work_Date DATE NOT NULL,
         Status NVARCHAR(50) NULL,
         Overtime_Hours DECIMAL(10, 2) NOT NULL,
         Absence_Reason NVARCHAR(4000) NULL,
         Marked_By NVARCHAR(255) NULL,
         Existing_Hour_Record_ID INT NULL
       );

       INSERT INTO @Work (
         Attendance_ID, Employee_ID, Work_Date, Status, Overtime_Hours,
         Absence_Reason, Marked_By, Existing_Hour_Record_ID
       )
       SELECT
         a.ID, m.Employee_ID, m.Work_Date, m.Status, m.Overtime_Hours,
         m.Absence_Reason, m.Marked_By, a.Hour_Record_ID
       FROM @Marks m
       INNER JOIN dbo.TScheduleAttendance a
         ON a.Schedule_ID = @scheduleId
        AND a.Employee_ID = m.Employee_ID
        AND CONVERT(DATE, a.Work_Date) = m.Work_Date;

       IF (SELECT COUNT(*) FROM @Work) <> (SELECT COUNT(*) FROM @Marks)
         THROW 50000, 'One or more attendance slots are missing for this schedule', 1;

       IF EXISTS (
         SELECT 1
         FROM @Work w
         INNER JOIN dbo.THours h
           ON h.Employee_ID_FK = w.Employee_ID
          AND CONVERT(DATE, h.Work_Date) = w.Work_Date
         WHERE w.Status IS NOT NULL
           AND w.Status <> 'absent'
           AND w.Existing_Hour_Record_ID IS NULL
       )
         THROW 50000, 'One or more employees already have hours recorded for the selected date outside this schedule.', 1;

       BEGIN TRANSACTION;

       DECLARE @HoursToDelete TABLE (ID INT NOT NULL PRIMARY KEY);

       INSERT INTO @HoursToDelete (ID)
       SELECT DISTINCT Existing_Hour_Record_ID
       FROM @Work
       WHERE Existing_Hour_Record_ID IS NOT NULL
         AND (Status IS NULL OR Status = 'absent');

       UPDATE a
       SET Hour_Record_ID = NULL
       FROM dbo.TScheduleAttendance a
       INNER JOIN @Work w ON w.Attendance_ID = a.ID
       WHERE w.Existing_Hour_Record_ID IS NOT NULL
         AND (w.Status IS NULL OR w.Status = 'absent');

       DELETE h
       FROM dbo.THours h
       INNER JOIN @HoursToDelete d ON d.ID = h.ID;

       UPDATE a
       SET Status = NULL,
           Hours_Worked = NULL,
           Overtime_Hours = NULL,
           Absence_Reason = NULL,
           Hour_Record_ID = NULL,
           Marked_At = NULL,
           Marked_By = NULL
       FROM dbo.TScheduleAttendance a
       INNER JOIN @Work w ON w.Attendance_ID = a.ID
       WHERE w.Status IS NULL;

       UPDATE a
       SET Status = 'absent',
           Hours_Worked = NULL,
           Overtime_Hours = NULL,
           Absence_Reason = w.Absence_Reason,
           Hour_Record_ID = NULL,
           Marked_At = SYSDATETIME(),
           Marked_By = w.Marked_By
       FROM dbo.TScheduleAttendance a
       INNER JOIN @Work w ON w.Attendance_ID = a.ID
       WHERE w.Status = 'absent';

       UPDATE h
       SET Work_Date = w.Work_Date,
           Hours_Worked = CASE WHEN w.Status IN ('public_holiday', 'sick_leave') THEN 0 ELSE @defaultHours END,
           Employee_ID_FK = w.Employee_ID,
           Grower_ID = @growerId,
           Overtime = CASE WHEN w.Status IN ('present', 'overtime') THEN w.Overtime_Hours ELSE 0 END,
           PHoliday = CASE WHEN w.Status = 'public_holiday' THEN @defaultHours ELSE 0 END,
           Sick_Leave = CASE WHEN w.Status = 'sick_leave' THEN @defaultHours ELSE 0 END
       FROM dbo.THours h
       INNER JOIN @Work w ON w.Existing_Hour_Record_ID = h.ID
       WHERE w.Status IS NOT NULL
         AND w.Status <> 'absent';

       DECLARE @CreatedHours TABLE (
         Attendance_ID INT NOT NULL PRIMARY KEY,
         Hour_Record_ID INT NOT NULL
       );

       MERGE dbo.THours AS target
       USING (
         SELECT
           w.Attendance_ID,
           w.Work_Date,
           CASE WHEN w.Status IN ('public_holiday', 'sick_leave') THEN 0 ELSE @defaultHours END AS Hours_Worked,
           w.Employee_ID,
           @growerId AS Grower_ID,
           CASE WHEN w.Status IN ('present', 'overtime') THEN w.Overtime_Hours ELSE 0 END AS Overtime,
           CASE WHEN w.Status = 'public_holiday' THEN @defaultHours ELSE 0 END AS PHoliday,
           CASE WHEN w.Status = 'sick_leave' THEN @defaultHours ELSE 0 END AS Sick_Leave,
           e.RATE AS Emp_Rate,
           @growerContPerc AS Con_Tot,
           CASE WHEN @growerHasManFee = 1 THEN @growerManFee ELSE NULL END AS Man_Fee
         FROM @Work w
         INNER JOIN dbo.TEmployee_Details e ON e.ID = w.Employee_ID
         WHERE w.Status IS NOT NULL
           AND w.Status <> 'absent'
           AND w.Existing_Hour_Record_ID IS NULL
       ) AS source
       ON 1 = 0
       WHEN NOT MATCHED THEN
         INSERT (
           Work_Date, Hours_Worked, Employee_ID_FK, Grower_ID, Overtime,
           PHoliday, Sick_Leave, Emp_Rate, Con_Tot, Man_Fee
         )
         VALUES (
           source.Work_Date, source.Hours_Worked, source.Employee_ID, source.Grower_ID, source.Overtime,
           source.PHoliday, source.Sick_Leave, source.Emp_Rate, source.Con_Tot, source.Man_Fee
         )
       OUTPUT source.Attendance_ID, INSERTED.ID INTO @CreatedHours;

       UPDATE a
       SET Status = w.Status,
           Hours_Worked = CASE WHEN w.Status IN ('public_holiday', 'sick_leave') THEN 0 ELSE @defaultHours END,
           Overtime_Hours = CASE WHEN w.Status IN ('present', 'overtime') THEN w.Overtime_Hours ELSE NULL END,
           Absence_Reason = NULL,
           Hour_Record_ID = COALESCE(c.Hour_Record_ID, w.Existing_Hour_Record_ID),
           Marked_At = SYSDATETIME(),
           Marked_By = w.Marked_By
       FROM dbo.TScheduleAttendance a
       INNER JOIN @Work w ON w.Attendance_ID = a.ID
       LEFT JOIN @CreatedHours c ON c.Attendance_ID = w.Attendance_ID
       WHERE w.Status IS NOT NULL
         AND w.Status <> 'absent';

       COMMIT TRANSACTION;

       SELECT a.*
       FROM dbo.TScheduleAttendance a
       INNER JOIN @Work w ON w.Attendance_ID = a.ID
       ORDER BY a.Work_Date, a.Employee_ID;`,
      {
        scheduleId,
        marksJson: JSON.stringify(Array.from(preparedMarks.values())),
      }
    );
  }

  async updateAttendanceById(
    attendanceId: number,
    input: MarkAttendanceInput
  ): Promise<ScheduleAttendance> {
    const att = await this.findById(attendanceId);
    if (!att) throw new Error('Attendance record not found');
    const d = new Date(att.Work_Date as Date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return this.markAttendance(att.Schedule_ID, {
      ...input,
      employeeId: att.Employee_ID,
      workDate: input.workDate ?? `${y}-${m}-${day}`,
    });
  }
}
