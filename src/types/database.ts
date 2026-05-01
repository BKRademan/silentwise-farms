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

export interface Deduction {
  ID: number;
  Loans: number | null;
  PPE: number | null;
  Date: Date | string | null;
  FK_Emp_ID: string | null;
  FK_PPE_Item: number | null;
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