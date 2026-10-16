let hasFee = QGrowerValues.data.HasManFee[0];
let manFee = QGrowerValues.data.ManFee[0];
let contPerc = QGrowerValues.data.ContPerc[0];
let hrsPerDay = QGrowerValues.data.HrsPerDay[0];

var manFeeString = numbro(manFee).format({output: "percent", mantissa: 2});
var contPercString = numbro(contPerc).format({output: "percent", mantissa: 2});

if (hasFee === true) {

    txtManFee_Perc.setValue(manFeeString);
    txtConTot_Perc.setValue(contPercString);
  
    txtManFee.setValue(manFee);
    txtConTot.setValue(contPerc);
    txtHours.setValue(hrsPerDay);
  
} else {

    txtManFee.setValue(0);
    txtConTot.setValue(contPerc);
    txtHours.setValue(hrsPerDay);

}