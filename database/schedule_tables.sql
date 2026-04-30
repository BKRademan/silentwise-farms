-- Employee Schedule & Attendance tables (SQL Server)
--
-- BEFORE RUNNING:
--   1) USE [YourProductionDatabase];   -- same database the app connects to
--   2) Confirm referenced tables exist (run in same DB):
--        SELECT SCHEMA_NAME(schema_id) AS [schema], name
--        FROM sys.tables
--        WHERE name IN ('TGrowers','TEmployee_Details','THours')
--        ORDER BY name;
--
-- If 'TGrowers' is missing here, you are on the wrong database or the table
-- uses a different name/schema — fix that before adding FKs below.
--
-- This script creates TSchedule / TScheduleEmployee / TScheduleAttendance without
-- foreign keys first (so creation succeeds). It then adds FKs only when each
-- parent table exists.

/* ========== 1) Tables (no FKs) ========== */

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TSchedule' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.TSchedule (
    ID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Grower_ID INT NOT NULL,
    Start_Date DATE NOT NULL,
    End_Date DATE NOT NULL,
    Default_Hours DECIMAL(10,2) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'draft',
    Created_At DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Updated_At DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
  CREATE INDEX IX_TSchedule_Grower ON dbo.TSchedule(Grower_ID);
  CREATE INDEX IX_TSchedule_Dates ON dbo.TSchedule(Start_Date, End_Date);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TScheduleEmployee' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.TScheduleEmployee (
    ID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Schedule_ID INT NOT NULL,
    Employee_ID INT NOT NULL,
    Added_At DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_TScheduleEmployee UNIQUE (Schedule_ID, Employee_ID)
  );
  CREATE INDEX IX_TScheduleEmployee_Schedule ON dbo.TScheduleEmployee(Schedule_ID);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TScheduleAttendance' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.TScheduleAttendance (
    ID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Schedule_ID INT NOT NULL,
    Employee_ID INT NOT NULL,
    Work_Date DATE NOT NULL,
    Status NVARCHAR(30) NULL,
    Hours_Worked DECIMAL(10,2) NULL,
    Overtime_Hours DECIMAL(10,2) NULL,
    Absence_Reason NVARCHAR(500) NULL,
    Hour_Record_ID INT NULL,
    Marked_At DATETIME2 NULL,
    Marked_By NVARCHAR(200) NULL,
    CONSTRAINT UQ_TScheduleAttendance UNIQUE (Schedule_ID, Employee_ID, Work_Date)
  );
  CREATE INDEX IX_TScheduleAttendance_Schedule_Date ON dbo.TScheduleAttendance(Schedule_ID, Work_Date);
END
GO

/* ========== 2) Foreign keys (only if parent tables exist) ========== */

IF OBJECT_ID(N'dbo.TGrowers', N'U') IS NULL
  PRINT 'SKIP FK: dbo.TGrowers not found in this database — run script on the DB that contains growers, or create FK manually.';
ELSE IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TSchedule_TGrowers')
BEGIN
  ALTER TABLE dbo.TSchedule WITH CHECK
    ADD CONSTRAINT FK_TSchedule_TGrowers FOREIGN KEY (Grower_ID) REFERENCES dbo.TGrowers(ID);
  PRINT 'Added FK_TSchedule_TGrowers.';
END
GO

IF OBJECT_ID(N'dbo.TSchedule', N'U') IS NULL OR OBJECT_ID(N'dbo.TEmployee_Details', N'U') IS NULL
  PRINT 'SKIP FK: TSchedule or TEmployee_Details missing.';
ELSE IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TScheduleEmployee_Schedule')
BEGIN
  ALTER TABLE dbo.TScheduleEmployee WITH CHECK
    ADD CONSTRAINT FK_TScheduleEmployee_Schedule FOREIGN KEY (Schedule_ID) REFERENCES dbo.TSchedule(ID) ON DELETE CASCADE;
  PRINT 'Added FK_TScheduleEmployee_Schedule.';
END
GO

IF OBJECT_ID(N'dbo.TEmployee_Details', N'U') IS NULL
  PRINT 'SKIP FK: dbo.TEmployee_Details not found.';
ELSE IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TScheduleEmployee_Employee')
BEGIN
  ALTER TABLE dbo.TScheduleEmployee WITH CHECK
    ADD CONSTRAINT FK_TScheduleEmployee_Employee FOREIGN KEY (Employee_ID) REFERENCES dbo.TEmployee_Details(ID);
  PRINT 'Added FK_TScheduleEmployee_Employee.';
END
GO

IF OBJECT_ID(N'dbo.TSchedule', N'U') IS NULL OR OBJECT_ID(N'dbo.TEmployee_Details', N'U') IS NULL
  PRINT 'SKIP FK: schedule/employee attendance FKs need TSchedule and TEmployee_Details.';
ELSE IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TScheduleAttendance_Schedule')
BEGIN
  ALTER TABLE dbo.TScheduleAttendance WITH CHECK
    ADD CONSTRAINT FK_TScheduleAttendance_Schedule FOREIGN KEY (Schedule_ID) REFERENCES dbo.TSchedule(ID) ON DELETE CASCADE;
  PRINT 'Added FK_TScheduleAttendance_Schedule.';
END
GO

IF OBJECT_ID(N'dbo.TEmployee_Details', N'U') IS NULL
  PRINT 'SKIP FK: dbo.TEmployee_Details not found for attendance.';
ELSE IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TScheduleAttendance_Employee')
BEGIN
  ALTER TABLE dbo.TScheduleAttendance WITH CHECK
    ADD CONSTRAINT FK_TScheduleAttendance_Employee FOREIGN KEY (Employee_ID) REFERENCES dbo.TEmployee_Details(ID);
  PRINT 'Added FK_TScheduleAttendance_Employee.';
END
GO

IF OBJECT_ID(N'dbo.THours', N'U') IS NULL
  PRINT 'SKIP FK: dbo.THours not found — Hour_Record_ID will not reference THours until you add this FK.';
ELSE IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TScheduleAttendance_THours')
BEGIN
  ALTER TABLE dbo.TScheduleAttendance WITH CHECK
    ADD CONSTRAINT FK_TScheduleAttendance_THours FOREIGN KEY (Hour_Record_ID) REFERENCES dbo.THours(ID);
  PRINT 'Added FK_TScheduleAttendance_THours.';
END
GO
