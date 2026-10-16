# Transport & PPE: Plan and Handover

Status as of **2026-10-16**: **Phases 1 and 2 are complete, merged into `main`, and deployed
to production** at [silentwisefarms.netlify.app](https://silentwisefarms.netlify.app).
[PR #1](https://github.com/BKRademan/silentwise-farms/pull/1) merged implementation commits
`b4b363f` and `912bb07` in merge commit `348f2f3`. The Phase 2 database tables exist on the
live database. The merged feature branch has been removed locally and from origin.

`npx tsc --noEmit` and `npx next build` passed. DAO write checks used rolled-back transactions;
no test records were committed during implementation. Production pages and read APIs were
verified after deployment. **The user has confirmed all production testing is complete** and
the **1 March financial-year start is correct**. No implementation or acceptance tasks remain
for this Transport & PPE plan. Unknown-employee deductions are intentionally left unchanged.

Read this file first, then `database_schema.md`. The original Retool app that
these screens replace is exported in `docs/Silentwise App/` (SQL in `lib/`,
screens in `src/*.rsx`).

---

## Decisions already made (do not re-ask)

| Topic | Decision |
|-------|----------|
| Invoices | Captured **with line items** (item, quantity, unit cost). |
| VAT | All purchase/grower amounts are **excluding VAT**. Employee deductions have no VAT and are compared as-is. |
| Stock | Track stock on hand per item. **Assume zero stock on hand at the start** (see "Stock rule"). |
| Deduction price | Capturing an invoice must **not** change `TPPE_Items.PPE_Item_Value` automatically. When a line's unit cost differs from the item's deduction price, offer a **one-click "update deduction price"** action. |
| Grower recovery | Simple capture of the **total** PPE amount charged to a grower (date, grower, reference, amount). No per-item split. Reported alongside purchases and deductions. |
| Orphaned deductions | ~187 `TDeductions` rows have an `FK_Emp_ID` that matches no employee. **Leave them unchanged**, as confirmed by the user on 2026-10-16; they show as "Unknown employee" in the app. No cleanup is planned. |
| Financial year | Starts on **1 March**, confirmed by the user on 2026-10-16. |
| Drivers | Managed in a `TTransport_Drivers` table with add/edit/delete. `TTransport.Driver` stays a text column holding the name. |
| Transport units | `TTransport.KM` = days, `TTransport.RatePerKM` = rate per day. Don't rename the columns; `TransportDAO` aliases them. |

### Stock rule
Stock on hand for an item = stock adjustments + quantity purchased − quantity issued,
counting only rows dated **on or after the stock tracking start date**.

- Start date: `2026-10-16` (the date the user confirmed there is no stock on hand).
  Put it in one constant, e.g. `PPE_STOCK_TRACKING_START` in `src/lib/constants/ppe.ts`,
  and show it on the stock screen ("Stock tracked from 16 Oct 2026").
- Purchases = `TPPE_Invoice_Lines.Quantity` where the invoice's `Invoice_Date` >= start.
- Issues = count of `TDeductions` rows with `PPE IS NOT NULL` and `FK_PPE_Item` = item,
  `Date` >= start. Each deduction row is one unit issued.
- Adjustments = signed `TPPE_Stock_Adjustments.Quantity`, `Adjustment_Date` >= start.
- Negative stock is allowed; show it in red rather than blocking capture.

The 2021–2026 issue history before the start date is still used for the money report,
not for stock.

---

## Phase 1: done

| Feature | Route | Key files |
|---------|-------|-----------|
| Transport capture/list | `/transport`, `/api/transport` | `src/app/transport/page.tsx`, `src/components/transport/transport-form-dialog.tsx`, `src/lib/db/transport-dao.ts` |
| Driver list | `/api/transport/drivers` | Reads `TTransport_Drivers` since Phase 2 (see 2.2) |
| PPE issues (deductions) | `/ppe`, `/api/ppe/issues` | `src/app/ppe/page.tsx`, `src/components/ppe/ppe-issue-form-dialog.tsx`, `src/lib/db/deductions-dao.ts` |
| PPE items | `/ppe/items`, `/api/ppe/items` (GET/POST/PUT/PATCH price/DELETE) | `src/app/ppe/items/page.tsx`, `src/components/ppe/ppe-item-form-dialog.tsx`, `src/lib/db/ppe-dao.ts` |
| PPE section tabs | n/a | `src/components/ppe/ppe-nav.tsx`: add new tabs here |

Behaviour carried over from Retool: transport rate per day comes from
`TGrowers.RatePerKM` and is read-only on the form; a PPE issue's amount defaults to the
item's deduction price but is editable; "Save & Add Another" keeps date/item/amount
and clears the employee. The old unused `/api/deductions` route was removed.

---

## Phase 2: complete and deployed

| Section | Route(s) | Key files |
|---------|----------|-----------|
| 2.1 Issue form order | `/ppe` | `src/components/ppe/ppe-issue-form-dialog.tsx` (`Combobox` now forwards a ref to its trigger) |
| 2.2 Drivers | `/transport/drivers`, `/api/transport/drivers` | `src/lib/db/driver-dao.ts`, `src/app/transport/drivers/page.tsx`, `src/components/transport/driver-form-dialog.tsx`, `transport-form-dialog.tsx` |
| 2.3 Suppliers | `/ppe/suppliers`, `/api/ppe/suppliers` | `src/lib/db/supplier-dao.ts`, `src/components/ppe/supplier-form-dialog.tsx` |
| 2.4 Invoices | `/ppe/invoices`, `/ppe/invoices/new`, `/ppe/invoices/[id]`, `/api/ppe/invoices` (`?id=` for one invoice) | `src/lib/db/invoice-dao.ts`, `src/components/ppe/invoice-form.tsx` |
| 2.5 Grower charges | `/ppe/grower-charges`, `/api/ppe/grower-charges` | `src/lib/db/grower-charge-dao.ts`, `src/components/ppe/grower-charge-form-dialog.tsx` |
| 2.6 Stock | `/ppe/stock`, `/api/ppe/stock`, `/api/ppe/stock/adjustments` | `src/lib/db/stock-dao.ts`, `src/components/ppe/stock-adjustment-form-dialog.tsx`, `src/lib/constants/ppe.ts` |
| 2.7 Report | `/ppe/report`, `/api/ppe/report` | `src/lib/db/ppe-report-dao.ts`, `src/app/ppe/report/page.tsx` |
| 2.8 Wrap-up | n/a | `PPENav` tabs: Issues, Items, Stock, Invoices, Suppliers, Grower Charges, Report |

Shared pieces added in Phase 2:
- `BaseDAO.withTransaction(fn)` gives `fn` a `{ query, request }` bound to one transaction;
  it commits on success and rolls back and rethrows on error. Used by driver rename/delete and
  invoice save. `decimalParam(value, precision)` sends money/quantities as `DECIMAL(p,2)`.
- `src/lib/db/sql-errors.ts`: `isUniqueViolation` / `isConstraintConflict` (error 2627/2601 and 547,
  optionally by constraint name). DAOs turn these into friendly `ValidationError`s; they back up the
  explicit pre-checks (duplicate names, records in use) when two users race.
- `src/lib/money.ts` (`toCents`, `sumMoney`, `lineTotal`, `hasAtMostTwoDecimals`): client totals
  match SQL Server's `DECIMAL` maths. Schemas reject more than 2 decimals instead of rounding.
- `src/hooks/use-api-data.ts` (`useApiData(url, empty)`): GET + reload, ignores stale responses.
  `usePPEItems` now uses it.
- `ConfirmActionDialog` (non-destructive confirm, used for "Deactivate instead") and `ActiveBadge`.
- `formatDisplayDate` treats `yyyy-MM-dd` strings as local dates; `DATE` columns are returned as
  `yyyy-MM-dd` strings (`CONVERT(char(10), …, 23)`) and parsed with `fromDateOnly`.
- Zod `dateOnly` now rejects impossible dates such as `2026-02-30` (previously a SQL error / 500).

Behaviour worth knowing:
- **Drivers**: the transport form only offers active drivers. When editing a record whose driver
  is inactive or not in the list, that name stays selectable, labelled "(inactive)" or
  "(not in driver list)". The server enforces the same rule: new records need an active driver;
  an edit may keep the record's existing name. Names match case-insensitively and ignore
  surrounding spaces (the column collation is `CI`). Renaming a driver rewrites every
  `TTransport.Driver` that matches the old name, in the same transaction. Deleting is refused
  while any transport row uses the name; the UI offers Deactivate instead.
- **Suppliers**: names are unique (case-insensitive). New invoices need an active supplier; an
  existing invoice may keep its now-inactive supplier. Suppliers with invoices can only be
  deactivated.
- **Invoices**: save replaces all lines in one transaction. Duplicate (supplier, invoice no) is
  rejected with the date of the existing invoice. The line's "Set deduction price to R x" link is
  the only thing that changes `PPE_Item_Value`; saving never does.
- **PPE items** can no longer be deleted once used by a PPE issue, invoice line or stock
  adjustment (the last two also have FKs).
- **Stock adjustments** must be dated on or after `PPE_STOCK_TRACKING_START`. Quantities are
  signed, non-zero and may have up to 2 decimals (the input uses `step={0.01}`), matching
  fractional invoice quantities.
- **Report**: defaults to the financial year to date (`FINANCIAL_YEAR_START_MONTH = 3`, i.e.
  1 March, confirmed by the user). It counts a PPE issue as a `TDeductions` row with
  `PPE` set, **except** the 20 legacy rows with `PPE = 0` and no item, which are loan-only rows
  from the old combined screen. Per-item "Difference" is only shown where the item was purchased
  in the period. A banner warns when the range starts before invoices were captured.

Acceptance testing is complete: the user confirmed all testing was done on 2026-10-16.
The earlier implementation-stage limitation on testing form saves, "Save & Add Another" focus
and the deduction-price shortcut is closed by that confirmation.

An independent review of all Phase 2 changes found one issue, now fixed: the stock adjustment
quantity input used `step={1}`, so the browser blocked decimal adjustments such as `-0.5`.

The original Phase 2 specification follows for reference; all sections below have been implemented.

### 2.1 Issue PPE form field order (small)
In `src/components/ppe/ppe-issue-form-dialog.tsx`, lay the fields out in this order,
one per row: **Date, Employee, PPE item, Amount**. The amount-differs warning
moves with the Amount field. "Save & Add Another" should then focus the Employee field.

### 2.2 Drivers (table already exists: `TTransport_Drivers`, seeded with "Jam Jam", "Richard")
- `src/lib/db/driver-dao.ts`: list (all / active only), add, rename, set active, delete.
- `/api/transport/drivers`: GET returns active drivers (`?all=1` returns all with usage count),
  plus POST / PUT / DELETE. Validate with zod in `src/lib/validations/capture.ts`.
- **Rename** updates `TTransport.Driver` rows with the old name in the same transaction,
  so history stays grouped. Tell the user in the confirm text.
- **Delete**: only if no `TTransport` row uses the name; otherwise offer "Deactivate".
- UI: a Drivers management dialog or page reachable from the Transport page header
  ("Manage Drivers"). Same table + dialog pattern as `/ppe/items`.
- Transport form: replace the free-text `<datalist>` input with a `Combobox` of active
  drivers. When editing a record whose driver is inactive or not in the table, still
  show its current name as the selected value.

### 2.3 Suppliers (`TPPE_Suppliers`)
CRUD under a **PPE → Suppliers** tab, same pattern as PPE Items. Block delete when the
supplier has invoices; offer deactivate instead. Supplier name is unique.

### 2.4 Supplier invoices (`TPPE_Invoices` + `TPPE_Invoice_Lines`)
- **PPE → Invoices** tab: list with date range + supplier filters, totals card
  (invoices, total excl VAT), and columns Date, Supplier, Invoice No, Lines, Total excl VAT.
- Capture/edit as a wide dialog or a full page (`/ppe/invoices/new`, `/ppe/invoices/[id]`):
  header (supplier, invoice no, date, notes) + editable lines table
  (item, quantity, unit cost excl VAT, line total) with add/remove line and a running total.
- For each line, show the item's current deduction price. If it differs from the unit
  cost, show a button **"Set deduction price to R x"** that calls
  `PATCH /api/ppe/items` `{ id, PPE_Item_Value }` (already implemented) and refreshes items.
  Never change the price as a side effect of saving the invoice.
- Save header + lines in **one DB transaction**. On edit, replace all lines. `BaseDAO`
  has no transaction helper yet; add one (e.g. `withTransaction(fn)` exposing a request
  factory) rather than writing transaction code in each DAO.
- Duplicate (supplier, invoice no) is rejected by a unique constraint; turn it into a
  friendly `ValidationError`.
- Delete invoice cascades to lines (FK is `ON DELETE CASCADE`).

### 2.5 Grower PPE charges (`TPPE_Grower_Charges`)
**PPE → Grower Charges** tab: list (date range + grower filter, total) and dialog with
grower, date, reference, amount excl VAT, notes. Standard CRUD.

### 2.6 Stock on hand
**PPE → Stock** tab (or extra columns on Items) following the Stock rule above: per item,
adjustments, purchased, issued and on hand since the start date. Add a "Stock adjustment"
dialog (item, date, signed quantity, reason `opening` / `stock_take` / `write_off`, notes)
and list recent adjustments.

### 2.7 PPE cost report
**PPE → Report** tab, date range filter (default: current financial year to date,
starting on 1 March, as confirmed by the user).

- Summary cards: **Purchased** (invoice lines excl VAT), **Deducted from employees**
  (`TDeductions.PPE`), **Charged to growers**, **Net cost to business**
  = purchased − deducted − charged to growers.
- Per-item table: qty purchased, purchase cost, average unit cost, qty issued,
  amount deducted, difference (deducted − cost of issued at average unit cost, where
  purchase data exists).
- Per-grower table of charges.
- Optional: monthly bar chart of purchased vs deducted vs charged (`recharts` is installed).
- The report covers all history for deductions, but purchases/grower charges only exist
  from Phase 2 onwards; show a note so early periods aren't misread as pure profit.

### 2.8 Wrap-up
Update `PPENav` tabs, `database_schema.md` if anything changes, and this file's status.

---

## Conventions for whoever continues

- **Stack**: Next.js 14 App Router, TypeScript, Tailwind + shadcn-style components in
  `src/components/ui`, `mssql` against Azure SQL (credentials in `.env.local`).
- **API routes**: wrap handlers in `handleApiRoute` (`src/lib/api-utils.ts`); validate bodies
  with zod via `parseOrThrow`; IDs from query strings via `requireIdParam`; throw
  `ValidationError` for user-facing 400s. Schemas live in `src/lib/validations/capture.ts`.
- **Client fetches**: `apiRequest` (`src/lib/api-client.ts`) returns `data` or throws the
  server's message; show it in a destructive toast.
- **DAOs** extend `BaseDAO` and use `executeQuery` with named parameters. Dates go through
  `src/lib/date-time/south-africa.ts` (`toSqlDateTimeStartOfDay`, `addDaysToDateOnly` for
  exclusive end dates). Client sends `yyyy-MM-dd` via `toDateOnlyFromDateParts`.
- **Reusable UI**: `StatCard`, `DateRangeFields`, `ConfirmDeleteDialog`, `DatePicker`
  (works inside dialogs), `Combobox`, `Textarea`; `formatCurrency` / `formatDisplayDate`
  in `src/lib/format.ts`. Employees and growers come from `useData()`.
- **Page layout**: copy `src/app/ppe/items/page.tsx` (header, `PPENav`, table card,
  form dialog, delete confirm).
- **Checks**: `npx tsc --noEmit` must pass. ESLint is not configured in this repo
  (`next lint` prompts for setup), so skip it.
- **Testing against the live DB**: this is production data. Don't create test records
  through the UI or API. Verify write SQL with a throwaway Node script that loads
  `.env.local`, opens `new sql.Transaction(pool)`, runs the statements with
  `new sql.Request(tx)`, inspects the result, then calls `tx.rollback()`. Read
  endpoints can be tested freely against `npx next dev`.
- The Retool app may still be in use and writes to the same `TTransport` / `TDeductions`
  tables; keep those tables' existing columns and meaning unchanged.
