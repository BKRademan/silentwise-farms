import type { Employee } from './database';

/** Matches dbo.TSchedule.Status */
export type ScheduleStatus = 'draft' | 'active' | 'completed';

/** Matches dbo.TScheduleAttendance.Status (NULL = unmarked in DB) */
export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'overtime'
  | 'public_holiday'
  | 'sick_leave'
  | null;

export interface Schedule {
  ID: number;
  Grower_ID: number;
  Start_Date: Date;
  End_Date: Date;
  Default_Hours: number | null;
  Status: ScheduleStatus;
  Created_At: Date;
  Updated_At: Date;
}

export interface ScheduleEmployee {
  ID: number;
  Schedule_ID: number;
  Employee_ID: number;
  Added_At: Date;
}

export interface ScheduleAttendance {
  ID: number;
  Schedule_ID: number;
  Employee_ID: number;
  Work_Date: Date;
  Status: AttendanceStatus;
  Hours_Worked: number | null;
  Overtime_Hours: number | null;
  Absence_Reason: string | null;
  Hour_Record_ID: number | null;
  Marked_At: Date | null;
  Marked_By: string | null;
}

export interface ScheduleWithGrower extends Schedule {
  GrowerName: string | null;
  EmployeeCount: number;
}

export interface ScheduleDetail extends Schedule {
  GrowerName: string | null;
  employees: ScheduleEmployeeWithEmployee[];
}

export interface ScheduleEmployeeWithEmployee extends ScheduleEmployee {
  EmplNo: string | null;
  FirstName: string | null;
  LastName: string | null;
  knownAs: string | null;
}

export interface RecentEmployeeForGrower extends Pick<Employee, 'ID' | 'EmplNo' | 'FirstName' | 'LastName' | 'knownAs'> {
  lastWorkedDate: Date | null;
  daysWorked: number;
}

export interface CreateScheduleInput {
  Grower_ID: number;
  Start_Date: string;
  End_Date: string;
  employeeIds: number[];
  status?: ScheduleStatus;
}

export interface UpdateScheduleInput {
  Start_Date?: string;
  End_Date?: string;
  employeeIds?: number[];
  status?: ScheduleStatus;
}

export interface MarkAttendanceInput {
  /** Required when marking by employee+date; omitted when updating by attendance row id */
  employeeId?: number;
  workDate?: string;
  /** Use `unmarked` to clear the cell */
  status: AttendanceStatus | 'unmarked';
  overtimeHours?: number | null;
  absenceReason?: string | null;
  isPublicHoliday?: boolean;
  isSickLeave?: boolean;
  markedBy?: string | null;
}
