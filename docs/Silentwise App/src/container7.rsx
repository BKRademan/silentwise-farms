<Container
  id="container7"
  align="flex-start"
  cornerType="square"
  gap={8}
  justify="flex-start"
  layout="row"
  padding={{ ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }] }}
  widthGrowFactor={1}
>
  <NumberInput
    id="txtEmpRate"
    disabled="true"
    label="Empl Rate"
    placeholder={0}
    stepSize={1}
    value="0"
  />
  <NumberInput
    id="txtConTot"
    disabled="true"
    hidden="true"
    label="Contribution Total"
    placeholder={0}
    stepSize={1}
    value="0"
  />
  <NumberInput
    id="txtManFee"
    disabled="true"
    hidden="true"
    label="Man Fee"
    placeholder={0}
    stepSize={1}
    value="0"
  />
  <TextArea
    id="txtManFee_Perc"
    disabled="true"
    label="Man Fee"
    minLines={1}
    placeholder="0"
    value="0"
  />
  <TextArea
    id="txtConTot_Perc"
    disabled="true"
    label="Cont Total"
    minLines={1}
    placeholder="0"
    value="0"
  />
</Container>
