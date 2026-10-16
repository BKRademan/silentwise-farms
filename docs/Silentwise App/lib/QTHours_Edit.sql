UPDATE THours
SET Grower_ID = {{cboGrower.value}}, 
Work_Date = {{txtDate.value}},
Employee_ID_FK = {{cboEmployee.value}},
Hours_Worked = {{txtHours.value}},
Sick_Leave = {{txtSickLeave.value}},
PHoliday = {{txtPubHoliday.value}},
Overtime = {{txtOvertime.value}},
Emp_Rate = {{txtEmpRate.value}},
Con_Tot = {{txtConTot.value}},
Man_Fee = {{txtManFee.value}}
WHERE ID = {{txtID_HoursEdit.value}};