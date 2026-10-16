INSERT INTO dbo.TDeductions (PPE, Date, FK_Emp_ID, FK_PPE_Item)
VALUES ({{txtPPEValue.value}}, {{txtDate_PPE.value}}, {{cboEmp_PPE.value}}, {{cboPPE_Item.value}});