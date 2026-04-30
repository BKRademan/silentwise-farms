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

    const schedules = await this.executeQuery<Schedule>(
      `SELECT * FROM dbo.TSchedule WHERE ID = @scheduleId`,
      { scheduleId }
    );
    const schedule = schedules[0];
    if (!schedule) throw new Error('Schedule not found');
    if (schedule.Status !== 'active') {
      throw new Error('Cannot mark attendance on a schedule that is not active. Finalize the schedule first.');
    }

    const roster = await this.executeQuery<{ Employee_ID: number }>(
      `SELECT Employee_ID FROM dbo.TScheduleEmployee WHERE Schedule_ID = @scheduleId`,
      { scheduleId }
    );
    const rosterSet = new Set(roster.map((r) => r.Employee_ID));

    const allRows = await this.executeQuery<ScheduleAttendance>(
      `SELECT * FROM dbo.TScheduleAttendance WHERE Schedule_ID = @scheduleId`,
      { scheduleId }
    );
    const rowLookup = new Map<string, ScheduleAttendance>();
    for (const r of allRows) {
      const d = this.normalizeDateToUTC(r.Work_Date);
      const key = `${r.Employee_ID}-${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
      rowLookup.set(key, r);
    }

    const defaultHrs = schedule.Default_Hours ?? 0;
    const growerId = schedule.Grower_ID;
    const results: ScheduleAttendance[] = [];

    for (const input of inputs) {
      if (input.employeeId == null || !input.workDate) {
        throw new Error('employeeId and workDate are required for each mark');
      }
      if (!rosterSet.has(input.employeeId)) {
        throw new Error(`Employee ${input.employeeId} is not on this schedule`);
      }

      const workDate = this.normalizeDateToUTC(input.workDate);
      const key = `${input.employeeId}-${workDate.getUTCFullYear()}-${workDate.getUTCMonth()}-${workDate.getUTCDate()}`;
      const att = rowLookup.get(key);
      if (!att) {
        throw new Error(`No attendance slot for employee ${input.employeeId} on ${input.workDate}`);
      }

      let resolvedStatus: AttendanceStatus | null =
        input.status === 'unmarked' ? null : (input.status as AttendanceStatus);

      if (input.isPublicHoliday) {
        resolvedStatus = 'public_holiday';
      } else if (input.isSickLeave) {
        resolvedStatus = 'sick_leave';
      } else if (resolvedStatus === 'present' && (input.overtimeHours ?? 0) > 0) {
        resolvedStatus = 'overtime';
      }

      // --- Clear / Unmarked ---
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
        if (cleared) results.push(cleared);
        continue;
      }

      // --- Absent ---
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
        if (updated) results.push(updated);
        continue;
      }

      // --- Present / OT / PH / Sick ---
      const ot = Math.max(0, input.overtimeHours ?? 0);
      let hourRecordId = att.Hour_Record_ID;
      const empId = input.employeeId;

      const buildPayload = () => {
        if (resolvedStatus === 'public_holiday') {
          return { Work_Date: workDate, Hours_Worked: 0, Employee_ID_FK: empId, Grower_ID: growerId, Overtime: 0, PHoliday: defaultHrs, Sick_Leave: 0, Employee: null, GrowerName: null, Emp_Rate: null, Con_Tot: null, Man_Fee: null };
        }
        if (resolvedStatus === 'sick_leave') {
          return { Work_Date: workDate, Hours_Worked: 0, Employee_ID_FK: empId, Grower_ID: growerId, Overtime: 0, PHoliday: 0, Sick_Leave: defaultHrs, Employee: null, GrowerName: null, Emp_Rate: null, Con_Tot: null, Man_Fee: null };
        }
        return { Work_Date: workDate, Hours_Worked: defaultHrs, Employee_ID_FK: empId, Grower_ID: growerId, Overtime: ot, PHoliday: 0, Sick_Leave: 0, Employee: null, GrowerName: null, Emp_Rate: null, Con_Tot: null, Man_Fee: null };
      };

      const payload = buildPayload();

      const existsOther = await hoursDao.checkEmployeeRecordExists(empId, workDate, hourRecordId ?? undefined);
      if (existsOther && !hourRecordId) {
        throw new Error(`Employee ${empId} already has hours for ${input.workDate} outside this schedule.`);
      }

      if (hourRecordId) {
        await hoursDao.updateHourRecord(hourRecordId, {
          Work_Date: payload.Work_Date, Hours_Worked: payload.Hours_Worked,
          Employee_ID_FK: payload.Employee_ID_FK, Grower_ID: payload.Grower_ID,
          Overtime: payload.Overtime, PHoliday: payload.PHoliday, Sick_Leave: payload.Sick_Leave,
        });
      } else {
        const created = await hoursDao.addHourRecord(payload);
        hourRecordId = created.ID;
      }

      const hw = resolvedStatus === 'public_holiday' || resolvedStatus === 'sick_leave' ? 0 : defaultHrs;

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
      if (updated) results.push(updated);
    }

    return results;
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
