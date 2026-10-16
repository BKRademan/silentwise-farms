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
  InvoiceLineCount: number;
  AdjustmentCount: number;
}

/** Matches `dbo.TTransport_Drivers`. `TTransport.Driver` stores `Driver_Name` as text. */
export interface TransportDriver {
  ID: number;
  Driver_Name: string;
  Is_Active: boolean;
}

export interface TransportDriverWithUsage extends TransportDriver {
  UsageCount: number;
  LastUsed: Date | string | null;
}

/** Matches `dbo.TPPE_Suppliers`. */
export interface PPESupplier {
  ID: number;
  Supplier_Name: string;
  Contact_Details: string | null;
  Is_Active: boolean;
}

export interface PPESupplierWithUsage extends PPESupplier {
  InvoiceCount: number;
  LastInvoiceDate: string | null;
}

/** Supplier invoice header with line totals. Money is excluding VAT; dates are `yyyy-MM-dd`. */
export interface PPEInvoiceSummary {
  ID: number;
  Supplier_ID: number;
  Supplier_Name: string;
  Invoice_No: string;
  Invoice_Date: string;
  Notes: string | null;
  LineCount: number;
  Total_Excl_VAT: number;
}

export interface PPEInvoiceLine {
  ID: number;
  PPE_Item_ID: number;
  PPE_Item: string | null;
  Quantity: number;
  Unit_Cost_Excl_VAT: number;
  Line_Total_Excl_VAT: number;
}

export interface PPEInvoiceDetail extends PPEInvoiceSummary {
  Supplier_Is_Active: boolean;
  Lines: PPEInvoiceLine[];
}

/** Matches `dbo.TPPE_Grower_Charges`, joined to the grower name. */
export interface PPEGrowerCharge {
  ID: number;
  Grower_ID: number;
  GrowerName: string | null;
  Charge_Date: string;
  Reference: string | null;
  Amount_Excl_VAT: number;
  Notes: string | null;
}

/** Matches `dbo.TPPE_Stock_Adjustments`, joined to the item name. `Quantity` is signed. */
export interface PPEStockAdjustment {
  ID: number;
  PPE_Item_ID: number;
  PPE_Item: string | null;
  Adjustment_Date: string;
  Quantity: number;
  Reason: string;
  Notes: string | null;
}

/** Per-item stock movement since `PPE_STOCK_TRACKING_START`. */
export interface PPEStockLevel {
  ID: number;
  PPE_Item: string | null;
  Adjustments: number;
  Purchased: number;
  Issued: number;
  OnHand: number;
}

export interface PPEReportSummary {
  Purchased: number;
  Deducted: number;
  ChargedToGrowers: number;
  NetCost: number;
}

/** `PPE_Item_ID` is null for issues captured without an item. */
export interface PPEReportItemRow {
  PPE_Item_ID: number | null;
  PPE_Item: string | null;
  QtyPurchased: number;
  PurchaseCost: number;
  AverageUnitCost: number | null;
  QtyIssued: number;
  AmountDeducted: number;
  /** Deducted minus cost of issued items at the average unit cost; null without purchases. */
  Difference: number | null;
}

export interface PPEReportGrowerRow {
  Grower_ID: number;
  GrowerName: string | null;
  ChargeCount: number;
  Amount: number;
}

export interface PPEReportMonth {
  Month: string;
  Purchased: number;
  Deducted: number;
  ChargedToGrowers: number;
}

export interface PPEReport {
  summary: PPEReportSummary;
  items: PPEReportItemRow[];
  growers: PPEReportGrowerRow[];
  months: PPEReportMonth[];
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