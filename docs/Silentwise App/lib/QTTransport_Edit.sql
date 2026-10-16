UPDATE TTransport
SET Date = {{txtTransDate.value}}, 
Grower_ID_FK = {{cboTransGrower.value}},
KM = {{txtDay.value}},
RatePerKM = {{txtRPD.value}},
Driver = {{cboDriver_Transporter.value}},
Comment = {{txtComments_Transporter.value}}
WHERE ID = {{txtID_TransEdit.value}};