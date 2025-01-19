# Database Schema Documentation

## Tables

### dbo.TTransport
Transport transaction table that stores transportation data.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| ID | int | No | Primary key |
| Grower_ID_FK | int | Yes | Foreign key to grower |
| Date | datetime | Yes | Date of transport |
| KM | float | Yes | Distance in kilometers |
| RatePerKM | float | Yes | Rate per kilometer |
| Driver | nvarchar(50) | Yes | Driver name |
| Comment | nvarchar(max) | Yes | Additional comments |

### dbo.TPPE_Items
PPE (Personal Protective Equipment) items reference table.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| ID | int | No | Primary key |
| PPE_Item | nvarchar(255) | Yes | Name/description of PPE item |
| PPE_Item_Value | float | Yes | Value/cost of PPE item |

### dbo.TDeductions
Deductions transaction table.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| ID | int | No | Primary key |
| Loans | money | Yes | Loan amount |
| PPE | money | Yes | PPE deduction amount |
| Date | datetime | Yes | Date of deduction |
| FK_Emp_ID | nvarchar(255) | Yes | Foreign key to employee |
| FK_PPE_Item | int | Yes | Foreign key to PPE item |

### dbo.TEmployee_Details
| Column Name   | Data Type       | Constraints   | Description                      |
|---------------|-----------------|---------------|----------------------------------|
| ID            | int             | PK, not null  | Primary Key (unique identifier) |
| Employee      | nvarchar(255)   | null          | Employee's full name            |
| Surname       | nvarchar(255)   | null          | Employee's surname              |
| First name    | nvarchar(255)   | null          | Employee's first name           |
| Known as      | nvarchar(255)   | null          | Nickname or preferred name      |
| RATE          | float           | null          | Hourly or daily rate of pay     |
| IDNumber      | nvarchar(50)    | null          | Employee's ID number            |
| StartDate     | date            | null          | Employee's start date           |

### dbo.TGrowers
| Column Name        | Data Type     | Constraints   | Description                                   |
|--------------------|---------------|---------------|-----------------------------------------------|
| ID                 | int           | PK, not null  | Primary Key (unique identifier)              |
| GrowerName         | nvarchar(50)  | null          | Name of the grower                           |
| RatePerKM          | float         | null          | Rate per kilometer                           |
| HasManFee          | bit           | null          | Indicates if a management fee applies (0/1)  |
| ManFee             | float         | null          | Amount of the management fee                 |
| PaysSickLeave      | bit           | null          | Indicates if sick leave is paid (0/1)        |
| ContPerc           | float         | null          | Contribution percentage                      |
| AnnualLeavePerc    | float         | null          | Annual leave percentage                      |
| SickLeavePerc      | float         | null          | Sick leave percentage                        |
| WMCPerc            | float         | null          | Worker’s Medical Contribution percentage     |
| SDLPerc            | float         | null          | Skills Development Levy percentage           |
| PPEPerc            | float         | null          | Personal Protective Equipment percentage     |
| UIFPerc            | float         | null          | Unemployment Insurance Fund percentage       |
| HrsPerDay          | float         | null          | Number of hours worked per day              |


## Views

### dbo.TTransport_Data_View
Detailed view of transport data including grower information.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| ID | int | No | Primary key |
| Grower_ID_FK | int | Yes | Foreign key to grower |
| GrowerName | nvarchar(50) | Yes | Name of the grower |
| KM | float | Yes | Distance in kilometers |
| datetime | datetime | Yes | Date and time of transport |
| RatePerKM | float | Yes | Rate per kilometer |
| Driver | nvarchar(50) | Yes | Driver name |
| Comment | nvarchar(max) | Yes | Additional comments |

### dbo.TDeductions_Data_View
Detailed view of deductions including employee and PPE information.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| ID | int | No | Primary key |
| Loans | money | Yes | Loan amount |
| PPE | money | Yes | PPE deduction amount |
| Date | datetime | Yes | Date of deduction |
| EmpID | int | Yes | Employee ID |
| Employee | nvarchar(255) | Yes | Employee name |
| PPE_ID | int | Yes | PPE item ID |
| PPE_Item | nvarchar(255) | Yes | PPE item name/description | 

### dbo.THour_Data_View
| Column Name      | Data Type       | Constraints   | Description                                    |
|------------------|-----------------|---------------|------------------------------------------------|
| ID               | int             | not null      | Identifier for the view                       |
| Work_Date        | datetime2(7)    | null          | Date of the work entry                        |
| Hours_Worked     | float           | null          | Total hours worked                            |
| Employee_ID_FK   | int             | null          | Foreign Key referencing TEmployee_Details ID  |
| Employee         | nvarchar(255)   | null          | Employee's name                               |
| Grower_ID        | int             | null          | Foreign Key referencing TGrowers ID           |
| GrowerName       | nvarchar(50)    | null          | Name of the grower                            |
| Overtime         | float           | null          | Overtime hours                                |
| PHoliday         | float           | null          | Public holiday hours                          |
| Emp_Rate         | float           | null          | Employee's rate of pay                        |
| Con_Tot          | float           | null          | Total contribution                            |
| Man_Fee          | float           | null          | Management fee                                |
| Sick_Leave       | float           | null          | Sick leave hours                              |