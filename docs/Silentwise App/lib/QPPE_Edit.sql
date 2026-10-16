UPDATE dbo.TDeductions
SET PPE = {{txtPPEValue.value}},
Date = {{txtDate_PPE.value}},
FK_Emp_ID = {{cboEmp_PPE.value}},
FK_PPE_Item = {{cboPPE_Item.value}}
WHERE ID = {{txtPPE_EditID.value}};