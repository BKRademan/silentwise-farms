-- Phase 2: transport drivers, PPE purchasing, stock and grower recovery (SQL Server)
--
-- Run against the same database the app connects to (it must contain
-- dbo.TPPE_Items, dbo.TGrowers, dbo.TDeductions and dbo.TTransport). Safe to
-- re-run: every object is created only if it does not already exist.
--
-- All money columns are excluding VAT.
--
--   TTransport_Drivers      Driver list for transport capture (TTransport.Driver stays a name)
--   TPPE_Suppliers          Who we buy PPE from
--   TPPE_Invoices           Supplier invoice header (one per supplier invoice)
--   TPPE_Invoice_Lines      Items on an invoice: item, quantity, unit cost
--   TPPE_Stock_Adjustments  Opening stock and stock-take corrections (+/- qty)
--   TPPE_Grower_Charges     PPE amounts charged on to growers
--
-- Stock on hand per item = adjustments + quantity purchased - quantity issued
-- (issues are the existing dbo.TDeductions rows with PPE set).

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TTransport_Drivers' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.TTransport_Drivers (
    ID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Driver_Name NVARCHAR(50) NOT NULL,          -- same length as TTransport.Driver
    Is_Active BIT NOT NULL DEFAULT 1,
    Created_At DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_TTransport_Drivers_Name UNIQUE (Driver_Name)
  );
END
GO

-- Seed from drivers already captured on transport records.
INSERT INTO dbo.TTransport_Drivers (Driver_Name)
SELECT DISTINCT LTRIM(RTRIM(t.Driver))
FROM dbo.TTransport t
WHERE NULLIF(LTRIM(RTRIM(t.Driver)), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM dbo.TTransport_Drivers d WHERE d.Driver_Name = LTRIM(RTRIM(t.Driver))
  );
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TPPE_Suppliers' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.TPPE_Suppliers (
    ID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Supplier_Name NVARCHAR(150) NOT NULL,
    Contact_Details NVARCHAR(500) NULL,
    Is_Active BIT NOT NULL DEFAULT 1,
    Created_At DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_TPPE_Suppliers_Name UNIQUE (Supplier_Name)
  );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TPPE_Invoices' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.TPPE_Invoices (
    ID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Supplier_ID INT NOT NULL,
    Invoice_No NVARCHAR(50) NOT NULL,
    Invoice_Date DATE NOT NULL,
    Notes NVARCHAR(1000) NULL,
    Created_At DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Updated_At DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_TPPE_Invoices_Supplier FOREIGN KEY (Supplier_ID) REFERENCES dbo.TPPE_Suppliers(ID),
    CONSTRAINT UQ_TPPE_Invoices_SupplierInvoice UNIQUE (Supplier_ID, Invoice_No)
  );
  CREATE INDEX IX_TPPE_Invoices_Date ON dbo.TPPE_Invoices(Invoice_Date);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TPPE_Invoice_Lines' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.TPPE_Invoice_Lines (
    ID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Invoice_ID INT NOT NULL,
    PPE_Item_ID INT NOT NULL,
    Quantity DECIMAL(10,2) NOT NULL,
    Unit_Cost_Excl_VAT DECIMAL(12,2) NOT NULL,
    Line_Total_Excl_VAT AS CAST(Quantity * Unit_Cost_Excl_VAT AS DECIMAL(14,2)) PERSISTED,
    CONSTRAINT FK_TPPE_Invoice_Lines_Invoice FOREIGN KEY (Invoice_ID) REFERENCES dbo.TPPE_Invoices(ID) ON DELETE CASCADE,
    CONSTRAINT FK_TPPE_Invoice_Lines_Item FOREIGN KEY (PPE_Item_ID) REFERENCES dbo.TPPE_Items(ID),
    CONSTRAINT CK_TPPE_Invoice_Lines_Quantity CHECK (Quantity > 0),
    CONSTRAINT CK_TPPE_Invoice_Lines_UnitCost CHECK (Unit_Cost_Excl_VAT >= 0)
  );
  CREATE INDEX IX_TPPE_Invoice_Lines_Invoice ON dbo.TPPE_Invoice_Lines(Invoice_ID);
  CREATE INDEX IX_TPPE_Invoice_Lines_Item ON dbo.TPPE_Invoice_Lines(PPE_Item_ID);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TPPE_Stock_Adjustments' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.TPPE_Stock_Adjustments (
    ID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    PPE_Item_ID INT NOT NULL,
    Adjustment_Date DATE NOT NULL,
    Quantity DECIMAL(10,2) NOT NULL,            -- positive adds stock, negative removes it
    Reason NVARCHAR(30) NOT NULL,               -- opening / stock_take / write_off
    Notes NVARCHAR(500) NULL,
    Created_At DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_TPPE_Stock_Adjustments_Item FOREIGN KEY (PPE_Item_ID) REFERENCES dbo.TPPE_Items(ID),
    CONSTRAINT CK_TPPE_Stock_Adjustments_Reason CHECK (Reason IN ('opening', 'stock_take', 'write_off')),
    CONSTRAINT CK_TPPE_Stock_Adjustments_Quantity CHECK (Quantity <> 0)
  );
  CREATE INDEX IX_TPPE_Stock_Adjustments_Item ON dbo.TPPE_Stock_Adjustments(PPE_Item_ID, Adjustment_Date);
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TPPE_Grower_Charges' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
  CREATE TABLE dbo.TPPE_Grower_Charges (
    ID INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Grower_ID INT NOT NULL,
    Charge_Date DATE NOT NULL,
    Reference NVARCHAR(50) NULL,                -- grower invoice number
    Amount_Excl_VAT DECIMAL(12,2) NOT NULL,
    Notes NVARCHAR(500) NULL,
    Created_At DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_TPPE_Grower_Charges_Grower FOREIGN KEY (Grower_ID) REFERENCES dbo.TGrowers(ID),
    CONSTRAINT CK_TPPE_Grower_Charges_Amount CHECK (Amount_Excl_VAT >= 0)
  );
  CREATE INDEX IX_TPPE_Grower_Charges_Date ON dbo.TPPE_Grower_Charges(Charge_Date);
END
GO
