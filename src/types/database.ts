/** Matches `dbo.TEmployee_Details` (51 columns). */
export interface Employee {
  ID: number;
  EmplNo: string | null;
  FirstName: string | null;
  LastName: string | null;
  Initials: string | null;
  SecondName: string | null;
  knownAs: string | null;
  Title: string | null;
  IDNumber: string | null;
  DateOfBirth: Date | string | null;
  DateEngaged: Date | string | null;
  LastDateWorked: Date | string | null;
  Language: string;
  EthnicGroup: string | null;
  Gender: string | null;
  MaritalStatus: string;
  CellNumber: string | null;
  /** DB column spelling */
  BusinessNUmber: string;
  AlternativeNumber: string | null;
  TaxNumber: string | null;
  TaxStatus: string;
  UIFStatus: string;
  TaxYearStart: Date | string | null;
  UIFEndDate: Date | string | null;
  NewUIFStartDate: Date | string | null;
  PayMethod: string | null;
  BankAccType: string | null;
  BankAccNo: string | null;
  BranchCode: string | null;
  BankName: string | null;
  AccHolder: string | null;
  AccRelationship: string | null;
  HrsPerPeriod: number;
  HoursPerDay: number;
  WorkAddressCode: string;
  RepAddr1: string | null;
  RepAddr2: string | null;
  RepAddr3: string | null;
  RepPostCode: string | null;
  ResUnit: string | null;
  ResComplex: string | null;
  ResStreetNo: string | null;
  ResStreetName: string | null;
  ResSuburb: string | null;
  ResCity: string | null;
  ResPostCode: string | null;
  ResidentialCountry: string;
  LinkPostalTo: string;
  FullNames: string | null;
  RATE: number | null;
  Date_Registered: Date | string | null;
}

export interface Grower {
  ID: number;
  GrowerName: string | null;
  RatePerKM: number | null;
  HasManFee: boolean | null;
  ManFee: number | null;
  PaysSickLeave: boolean | null;
  ContPerc: number | null;
  AnnualLeavePerc: number | null;
  SickLeavePerc: number | null;
  WMCPerc: number | null;
  SDLPerc: number | null;
  PPEPerc: number | null;
  UIFPerc: number | null;
  HrsPerDay: number | null;
}

/**
 * Row from `dbo.TTransport`. The table's `KM` column holds the number of days and
 * `RatePerKM` holds the rate per day; the DAO aliases them to `Days` / `RatePerDay`.
 */
export interface TransportRecord {
  ID: number;
  Grower_ID_FK: number;
  GrowerName: string | null;
  Date: Date | string;
  Days: number;
  RatePerDay: number | null;
  Driver: string | null;
  Comment: string | null;
}

/** Matches `dbo.TPPE_Items`. `PPE_Item_Value` is the price deducted from an employee. */
export interface PPEItem {
  ID: number;
  PPE_Item: string | null;
  PPE_Item_Value: number | null;
}

export interface PPEItemWithUsage extends PPEItem {
  IssueCount: number;
  LastIssued: Date | string | null;
}

/** PPE issued to an employee, stored as a `dbo.TDeductions` row with `PPE` set. */
export interface PPEIssue {
  ID: number;
  Date: Date | string;
  EmployeeID: number | null;
  Employee: string | null;
  PPEItemID: number | null;
  PPE_Item: string | null;
  Amount: number;
}

export interface HourRecord {
  ID: number;
  Work_Date: Date | string | null;
  Hours_Worked: number | null;
  Employee_ID_FK: number | null;
  Employee: string | null;
  Grower_ID: number | null;
  GrowerName: string | null;
  Overtime: number | null;
  PHoliday: number | null;
  Emp_Rate: number | null;
  Con_Tot: number | null;
  Man_Fee: number | null;
  Sick_Leave: number | null;
} 