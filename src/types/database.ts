export interface Employee {
  ID: number;
  EmplNo: string | null;
  LastName: string | null;
  FirstName: string | null;
  knownAs: string | null;
  RATE: number | null;
  IDNumber: string | null;
  DateEngaged: Date | null;
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

export interface Transport {
  ID: number;
  Grower_ID_FK: number | null;
  Date: Date | null;
  KM: number | null;
  RatePerKM: number | null;
  Driver: string | null;
  Comment: string | null;
}

export interface PPEItem {
  ID: number;
  PPE_Item: string | null;
  PPE_Item_Value: number | null;
}

export interface Deduction {
  ID: number;
  Loans: number | null;
  PPE: number | null;
  Date: Date | null;
  FK_Emp_ID: string | null;
  FK_PPE_Item: number | null;
}

export interface HourRecord {
  ID: number;
  Work_Date: Date | null;
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