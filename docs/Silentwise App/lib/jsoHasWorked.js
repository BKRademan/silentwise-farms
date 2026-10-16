let willWork = QEmpCheck_Hours.data.Employee_ID_FK[0];
let workID = QEmpCheck_Hours.data.ID[0];

if (willWork != null) {

  if (workID == txtID_HoursEdit.value) {

    txtEmpCheck.setValue("NOT WORKING");
    
  } else {

    txtEmpCheck.setValue("WORKING");
    
  }
  
} else {

  txtEmpCheck.setValue("NOT WORKING");

}