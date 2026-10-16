import { BaseDAO } from './base-dao';
import { addDaysToDateOnly, toSqlDateTimeStartOfDay } from '@/lib/date-time/south-africa';
import { fromCents, sumMoney, toCents } from '@/lib/money';
import type { PPEReport, PPEReportGrowerRow, PPEReportItemRow, PPEReportMonth } from '@/types/database';

export interface PPEReportFilters {
  startDate: string;
  endDate: string;
}

interface ItemPurchaseRow {
  PPE_Item_ID: number;
  PPE_Item: string | null;
  QtyPurchased: number;
  PurchaseCost: number;
}

interface ItemIssueRow {
  PPE_Item_ID: number | null;
  PPE_Item: string | null;
  QtyIssued: number;
  AmountDeducted: number;
}

/**
 * A PPE issue is a `TDeductions` row with `PPE` set. Legacy rows with `PPE = 0` and no item are
 * loan-only rows from the old combined deductions screen, so they are not counted as issues.
 */
const IS_PPE_ISSUE = 'd.PPE IS NOT NULL AND (d.FK_PPE_Item IS NOT NULL OR d.PPE <> 0)';

const INVOICE_IN_RANGE = `v.Invoice_Date >= CONVERT(date, @startDate, 23) AND v.Invoice_Date <= CONVERT(date, @endDate, 23)`;
const DEDUCTION_IN_RANGE = `d.Date >= CONVERT(datetime2, @startDateTime, 121) AND d.Date < CONVERT(datetime2, @endDateTimeExclusive, 121)`;
const CHARGE_IN_RANGE = `c.Charge_Date >= CONVERT(date, @startDate, 23) AND c.Charge_Date <= CONVERT(date, @endDate, 23)`;

/** PPE money report: purchases and grower charges are excluding VAT; employee deductions have no VAT. */
export class PPEReportDAO extends BaseDAO<PPEReport> {
  constructor() {
    super('dbo.TPPE_Invoices');
  }

  async getReport({ startDate, endDate }: PPEReportFilters): Promise<PPEReport> {
    const params = {
      startDate,
      endDate,
      startDateTime: toSqlDateTimeStartOfDay(startDate),
      endDateTimeExclusive: `${addDaysToDateOnly(endDate, 1)} 00:00:00.000`,
    };

    const [purchases, issues, growers, months] = await Promise.all([
      this.executeQuery<ItemPurchaseRow>(
        `SELECT l.PPE_Item_ID, p.PPE_Item,
                SUM(l.Quantity) AS QtyPurchased,
                SUM(l.Line_Total_Excl_VAT) AS PurchaseCost
         FROM dbo.TPPE_Invoice_Lines l
         INNER JOIN dbo.TPPE_Invoices v ON v.ID = l.Invoice_ID
         LEFT JOIN dbo.TPPE_Items p ON p.ID = l.PPE_Item_ID
         WHERE ${INVOICE_IN_RANGE}
         GROUP BY l.PPE_Item_ID, p.PPE_Item`,
        params
      ),
      this.executeQuery<ItemIssueRow>(
        `SELECT d.FK_PPE_Item AS PPE_Item_ID, p.PPE_Item,
                COUNT(*) AS QtyIssued,
                CAST(SUM(d.PPE) AS decimal(19, 2)) AS AmountDeducted
         FROM dbo.TDeductions d
         LEFT JOIN dbo.TPPE_Items p ON p.ID = d.FK_PPE_Item
         WHERE ${IS_PPE_ISSUE} AND ${DEDUCTION_IN_RANGE}
         GROUP BY d.FK_PPE_Item, p.PPE_Item`,
        params
      ),
      this.executeQuery<PPEReportGrowerRow>(
        `SELECT c.Grower_ID, g.GrowerName,
                COUNT(*) AS ChargeCount,
                SUM(c.Amount_Excl_VAT) AS Amount
         FROM dbo.TPPE_Grower_Charges c
         LEFT JOIN dbo.TGrowers g ON g.ID = c.Grower_ID
         WHERE ${CHARGE_IN_RANGE}
         GROUP BY c.Grower_ID, g.GrowerName
         ORDER BY Amount DESC, g.GrowerName`,
        params
      ),
      this.executeQuery<PPEReportMonth>(
        `SELECT Month,
                SUM(Purchased) AS Purchased,
                SUM(Deducted) AS Deducted,
                SUM(ChargedToGrowers) AS ChargedToGrowers
         FROM (
           SELECT CONVERT(char(7), v.Invoice_Date, 126) AS Month,
                  CAST(l.Line_Total_Excl_VAT AS decimal(19, 2)) AS Purchased,
                  CAST(0 AS decimal(19, 2)) AS Deducted,
                  CAST(0 AS decimal(19, 2)) AS ChargedToGrowers
           FROM dbo.TPPE_Invoice_Lines l
           INNER JOIN dbo.TPPE_Invoices v ON v.ID = l.Invoice_ID
           WHERE ${INVOICE_IN_RANGE}
           UNION ALL
           SELECT CONVERT(char(7), d.Date, 126), 0, CAST(d.PPE AS decimal(19, 2)), 0
           FROM dbo.TDeductions d
           WHERE ${IS_PPE_ISSUE} AND ${DEDUCTION_IN_RANGE}
           UNION ALL
           SELECT CONVERT(char(7), c.Charge_Date, 126), 0, 0, CAST(c.Amount_Excl_VAT AS decimal(19, 2))
           FROM dbo.TPPE_Grower_Charges c
           WHERE ${CHARGE_IN_RANGE}
         ) movements
         GROUP BY Month
         ORDER BY Month`,
        params
      ),
    ]);

    const items = mergeItemRows(purchases, issues);
    const purchased = sumMoney(items.map((row) => row.PurchaseCost));
    const deducted = sumMoney(items.map((row) => row.AmountDeducted));
    const chargedToGrowers = sumMoney(growers.map((row) => row.Amount));

    return {
      summary: {
        Purchased: purchased,
        Deducted: deducted,
        ChargedToGrowers: chargedToGrowers,
        NetCost: fromCents(toCents(purchased) - toCents(deducted) - toCents(chargedToGrowers)),
      },
      items,
      growers,
      months,
    };
  }
}

function mergeItemRows(purchases: ItemPurchaseRow[], issues: ItemIssueRow[]): PPEReportItemRow[] {
  const rows = new Map<string, PPEReportItemRow>();
  const rowFor = (itemId: number | null, itemName: string | null): PPEReportItemRow => {
    const key = String(itemId ?? 'none');
    const existing = rows.get(key);
    if (existing) return existing;
    const created: PPEReportItemRow = {
      PPE_Item_ID: itemId,
      PPE_Item: itemName,
      QtyPurchased: 0,
      PurchaseCost: 0,
      AverageUnitCost: null,
      QtyIssued: 0,
      AmountDeducted: 0,
      Difference: null,
    };
    rows.set(key, created);
    return created;
  };

  purchases.forEach((purchase) => {
    const row = rowFor(purchase.PPE_Item_ID, purchase.PPE_Item);
    row.QtyPurchased = purchase.QtyPurchased;
    row.PurchaseCost = purchase.PurchaseCost;
  });
  issues.forEach((issue) => {
    const row = rowFor(issue.PPE_Item_ID, issue.PPE_Item);
    row.QtyIssued = issue.QtyIssued;
    row.AmountDeducted = issue.AmountDeducted;
  });

  return Array.from(rows.values())
    .map((row) => {
      if (row.QtyPurchased <= 0) return row;
      const averageUnitCost = row.PurchaseCost / row.QtyPurchased;
      const costOfIssued = Math.round(row.QtyIssued * averageUnitCost * 100);
      return {
        ...row,
        AverageUnitCost: averageUnitCost,
        Difference: fromCents(toCents(row.AmountDeducted) - costOfIssued),
      };
    })
    .sort((a, b) => {
      if (a.PPE_Item_ID === null) return 1;
      if (b.PPE_Item_ID === null) return -1;
      return (a.PPE_Item ?? '').localeCompare(b.PPE_Item ?? '');
    });
}
