# Database Schema Documentation

## Tables

### dbo.TTransport
Transport transaction table. Transport is billed **per day**, but the legacy column
names were never renamed: `KM` holds the number of days and `RatePerKM` holds the
rate per day (copied from `TGrowers.RatePerKM` at capture). The app's
`TransportDAO` aliases them to `Days` / `RatePerDay`.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| ID | int | No | Primary key |
| Grower_ID_FK | int | Yes | Foreign key to grower |
| Date | datetime | Yes | Date of transport |
| KM | float | Yes | Number of days (legacy name) |
| RatePerKM | float | Yes | Rate per day (legacy name) |
| Driver | nvarchar(50) | Yes | Driver name (free text; list comes from `TTransport_Drivers`) |
| Comment | nvarchar(max) | Yes | Additional comments |

### dbo.THours
Hours tracking table that stores employee work hours.

| Column Name      | Data Type       | Constraints   | Description                                    |
|-----------------|-----------------|---------------|------------------------------------------------|
| ID              | int             | PK, not null  | Primary Key (unique identifier)               |
| Work_Date       | datetime        | null          | Date of the work entry                        |
| Hours_Worked    | float           | null          | Number of hours worked                        |
| Employee_ID_FK  | int             | null          | Foreign Key referencing TEmployee_Details ID  |
| Grower_ID       | int             | null          | Foreign Key referencing TGrowers ID           |
| PHoliday        | float           | null          | Public holiday hours                          |
| Emp_Rate        | float           | null          | Employee's rate of pay                        |
| Con_Tot         | float           | null          | Total contribution                            |
| Man_Fee         | float           | null          | Management fee                                |
| Sick_Leave      | float           | null          | Sick leave hours                              |
| Overtime        | float           | null          | Overtime hours                                |

### dbo.TSchedule
Schedule header (grower + date range). Create via `database/schedule_tables.sql`.

| Column | Type | Description |
|--------|------|-------------|
| ID | int PK | Identity |
| Grower_ID | int FK | TGrowers |
| Start_Date / End_Date | date | Selected period |
| Default_Hours | decimal | Snapshot from grower HrsPerDay |
| Status | nvarchar | draft / active / completed |
| Created_At / Updated_At | datetime2 | Audit |

### dbo.TScheduleEmployee
Roster lines linking employees to a schedule.

### dbo.TScheduleAttendance
One row per employee per work day; `Status` null = not marked. Links to `THours` via `Hour_Record_ID` when present/PH/sick/OT.

### dbo.TPPE_Items
PPE (Personal Protective Equipment) items reference table.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| ID | int | No | Primary key |
| PPE_Item | nvarchar(255) | Yes | Name/description of PPE item |
| PPE_Item_Value | float | Yes | Deduction price charged to an employee when the item is issued |

### dbo.TDeductions
Deductions transaction table. Each PPE issue to an employee is one row with `PPE`
set to the amount deducted. `Loans` has not been captured since 2023. 20 legacy loan-only
rows have `PPE = 0` and no `FK_PPE_Item`; the PPE report and stock count exclude them
(an issue is `PPE IS NOT NULL AND (FK_PPE_Item IS NOT NULL OR PPE <> 0)`). There is no FK from
`FK_PPE_Item` to `TPPE_Items`, so the app checks for issues itself before deleting an item.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| ID | int | No | Primary key |
| Loans | money | Yes | Loan amount |
| PPE | money | Yes | PPE deduction amount |
| Date | datetime | Yes | Date of deduction |
| FK_Emp_ID | nvarchar(255) | Yes | `TEmployee_Details.ID` stored as text; join with `TRY_CAST(FK_Emp_ID AS int)`. ~187 legacy rows do not match an employee. |
| FK_PPE_Item | int | Yes | Foreign key to PPE item |

### dbo.TEmployee_Details
| Column Name   | Data Type       | Constraints   | Description                      |
|---------------|-----------------|---------------|----------------------------------|
| ID            | int             | PK, not null  | Primary Key (unique identifier) |
| EmplNo        | nvarchar(255)   | null          | Employee number                 |
| LastName      | nvarchar(255)   | null          | Employee's last name            |
| FirstName     | nvarchar(255)   | null          | Employee's first name           |
| knownAs       | nvarchar(255)   | null          | Nickname or preferred name      |
| RATE          | float           | null          | Hourly or daily rate of pay     |
| IDNumber      | nvarchar(50)    | null          | Employee's ID number            |
| DateEngaged   | date            | null          | Employee's start date           |

### dbo.TGrowers
| Column Name        | Data Type     | Constraints   | Description                                   |
|--------------------|---------------|---------------|-----------------------------------------------|
| ID                 | int           | PK, not null  | Primary Key (unique identifier)              |
| GrowerName         | nvarchar(50)  | null          | Name of the grower                           |
| RatePerKM          | float         | null          | Transport rate per day (legacy name)         |
| HasManFee          | bit           | null          | Indicates if a management fee applies (0/1)  |
| ManFee             | float         | null          | Amount of the management fee                 |
| PaysSickLeave      | bit           | null          | Indicates if sick leave is paid (0/1)        |
| ContPerc           | float         | null          | Contribution percentage                      |
| AnnualLeavePerc    | float         | null          | Annual leave percentage                      |
| SickLeavePerc      | float         | null          | Sick leave percentage                        |
| WMCPerc            | float         | null          | Worker's Medical Contribution percentage     |
| SDLPerc            | float         | null          | Skills Development Levy percentage           |
| PPEPerc            | float         | null          | Personal Protective Equipment percentage     |
| UIFPerc            | float         | null          | Unemployment Insurance Fund percentage       |
| HrsPerDay          | float         | null          | Number of hours worked per day              |

## Phase 2 tables (PPE purchasing, stock, grower recovery, drivers)
Created by `database/phase2_ppe_transport_tables.sql` (applied to the live DB on 2026-10-16).
All money columns are **excluding VAT**. See `docs/plans/phase-2-ppe-invoices.md` for how they are used.

### dbo.TTransport_Drivers
| Column | Type | Description |
|--------|------|-------------|
| ID | int PK | Identity |
| Driver_Name | nvarchar(50), unique | Matches the text stored in `TTransport.Driver` (no FK). The app's rename updates matching `TTransport.Driver` rows in the same transaction. |
| Is_Active | bit | Inactive drivers are hidden from capture but kept for history |
| Created_At | datetime2 | Audit |

### dbo.TPPE_Suppliers
| Column | Type | Description |
|--------|------|-------------|
| ID | int PK | Identity |
| Supplier_Name | nvarchar(150), unique | |
| Contact_Details | nvarchar(500) | Optional |
| Is_Active | bit | |
| Created_At | datetime2 | Audit |

### dbo.TPPE_Invoices
Supplier invoice header. Unique on (`Supplier_ID`, `Invoice_No`).

| Column | Type | Description |
|--------|------|-------------|
| ID | int PK | Identity |
| Supplier_ID | int FK | `TPPE_Suppliers` |
| Invoice_No | nvarchar(50) | Supplier's invoice number |
| Invoice_Date | date | |
| Notes | nvarchar(1000) | |
| Created_At / Updated_At | datetime2 | Audit |

### dbo.TPPE_Invoice_Lines
| Column | Type | Description |
|--------|------|-------------|
| ID | int PK | Identity |
| Invoice_ID | int FK | `TPPE_Invoices`, ON DELETE CASCADE |
| PPE_Item_ID | int FK | `TPPE_Items` |
| Quantity | decimal(10,2) | > 0 |
| Unit_Cost_Excl_VAT | decimal(12,2) | >= 0 |
| Line_Total_Excl_VAT | decimal(14,2) | Computed, persisted: Quantity × Unit_Cost_Excl_VAT |

### dbo.TPPE_Stock_Adjustments
Manual stock corrections. `Quantity` is signed (+ adds stock, − removes it).

| Column | Type | Description |
|--------|------|-------------|
| ID | int PK | Identity |
| PPE_Item_ID | int FK | `TPPE_Items` |
| Adjustment_Date | date | |
| Quantity | decimal(10,2) | Non-zero, signed |
| Reason | nvarchar(30) | `opening` / `stock_take` / `write_off` |
| Notes | nvarchar(500) | |
| Created_At | datetime2 | Audit |

### dbo.TPPE_Grower_Charges
PPE amounts invoiced on to growers (a total per charge, not per item).

| Column | Type | Description |
|--------|------|-------------|
| ID | int PK | Identity |
| Grower_ID | int FK | `TGrowers` |
| Charge_Date | date | |
| Reference | nvarchar(50) | Grower invoice number |
| Amount_Excl_VAT | decimal(12,2) | >= 0 |
| Notes | nvarchar(500) | |
| Created_At | datetime2 | Audit |


## Views

### dbo.TTransport_Data_View
Transport rows joined to grower name, **limited to the last 60 days** (`DATEDIFF(d, Date, GETDATE()) <= 60`).
Used by the Retool app; the Next.js app queries `TTransport` directly.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| ID | int | No | Primary key |
| Grower_ID_FK | int | Yes | Foreign key to grower |
| GrowerName | nvarchar(50) | Yes | Name of the grower |
| Date | datetime | Yes | Date of transport |
| KM | float | Yes | Number of days (legacy name) |
| RatePerKM | float | Yes | Rate per day (legacy name) |
| Driver | nvarchar(50) | Yes | Driver name |
| Comment | nvarchar(max) | Yes | Additional comments |

### dbo.TDeductions_Data_View
Deductions joined to employee and PPE item. Uses INNER JOINs, so rows whose
`FK_Emp_ID` does not match an employee are excluded. Used by the Retool app.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| ID | int | No | Primary key |
| Loans | money | Yes | Loan amount |
| PPE | money | Yes | PPE deduction amount |
| DeductionDate | datetime | Yes | Date of deduction |
| EmpID | int | No | Employee ID |
| Employee | nvarchar(10) | Yes | Employee number (`EmplNo`) |
| PPE_ID | int | No | PPE item ID |
| PPE_Item | nvarchar(255) | Yes | PPE item name/description | 

### dbo.THour_Data_View
| Column Name      | Data Type       | Constraints   | Description                                    |
|------------------|-----------------|---------------|------------------------------------------------|
| ID               | int             | not null      | Identifier for the view                       |
| Work_Date        | datetime2(7)    | null          | Date of the work entry                        |
| Hours_Worked     | float           | null          | Total hours worked                            |
| Employee_ID_FK   | int             | null          | Foreign Key referencing TEmployee_Details ID  |
| EmplNo           | nvarchar(255)   | null          | Employee number                               |
| Grower_ID        | int             | null          | Foreign Key referencing TGrowers ID           |
| GrowerName       | nvarchar(50)    | null          | Name of the grower                            |
| Overtime         | float           | null          | Overtime hours                                |
| PHoliday         | float           | null          | Public holiday hours                          |
| Emp_Rate         | float           | null          | Employee's rate of pay                        |
| Con_Tot          | float           | null          | Total contribution                            |
| Man_Fee          | float           | null          | Management fee                                |
| Sick_Leave       | float           | null          | Sick leave hours                              |