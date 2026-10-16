<Screen
  id="captureTransport"
  _customShortcuts={[]}
  _hashParams={[]}
  _searchParams={[]}
  title="Capture Transport"
  uuid="01874577-3adb-4921-b2ee-086840138204"
>
  <Text
    id="txtID_TransEdit"
    hidden="true"
    markdown={true}
    size="medium"
    weight="normal"
  />
  <Container
    id="container1"
    align="flex-start"
    cornerType="square"
    gap={8}
    justify="flex-start"
    layout="row"
    padding={{
      ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
    }}
    widthGrowFactor={1}
  >
    <Container
      id="container3"
      align="flex-start"
      cornerType="square"
      gap={8}
      justify="flex-start"
      layout="column"
      padding={{
        ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
      }}
      widthGrowFactor={1}
    >
      <Select
        id="cboTransGrower"
        allowDeselect={true}
        label="Grower"
        labelPosition="top"
        labels="{{QcboTransGrowers.data.GrowerName}}"
        placeholder="Select an option"
        value=""
        values="{{QcboTransGrowers.data.ID}}"
      />
    </Container>
    <Container
      id="container2"
      align="flex-start"
      cornerType="square"
      gap={8}
      justify="flex-start"
      layout="column"
      padding={{
        ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
      }}
      widthGrowFactor={1}
    >
      <DatePicker
        id="txtTransDate"
        displayTimeZone="local"
        label="Date"
        mode="date"
        value={'{{moment().format("YYYY-MM-DD")}}'}
        valueTimeZone="local"
      />
    </Container>
  </Container>
  <Container
    id="container8"
    align="flex-start"
    cornerType="square"
    gap={8}
    justify="flex-start"
    layout="row"
    padding={{
      ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
    }}
    widthGrowFactor={1}
  >
    <NumberInput
      id="txtDay"
      label="Day"
      placeholder={0}
      stepSize={1}
      value="1"
    />
    <NumberInput
      id="txtRPD"
      disabled="true"
      label="Rate Per Day"
      placeholder={0}
      stepSize={1}
    />
  </Container>
  <Container
    id="container52"
    align="flex-start"
    cornerType="square"
    gap={8}
    justify="flex-start"
    layout="column"
    padding={{
      ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
    }}
    widthGrowFactor={1}
  >
    <Select
      id="cboDriver_Transporter"
      allowCustomValue={true}
      label="Driver"
      labelPosition="top"
      labels="['Jam Jam', 'Richard']"
      placeholder="Select an option"
      value=""
      values="['Jam Jam', 'Richard']"
    />
  </Container>
  <Container
    id="container53"
    align="flex-start"
    cornerType="square"
    gap={8}
    justify="flex-start"
    layout="column"
    padding={{
      ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
    }}
    widthGrowFactor={1}
  >
    <TextArea
      id="txtComments_Transporter"
      label="Comment"
      minLines={4}
      placeholder="Enter value"
    />
  </Container>
  <Container
    id="conButtonGroup2"
    align="flex-start"
    cornerType="square"
    gap={8}
    justify="flex-start"
    layout="row"
    padding={{
      ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
    }}
    widthGrowFactor={1}
  >
    <Container
      id="container25"
      align="flex-start"
      cornerType="square"
      gap={8}
      hidden={
        '{{(txtID_TransEdit === null || txtID_TransEdit.value === "") ? true : false}}'
      }
      justify="flex-start"
      layout="column"
      padding={{
        ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
      }}
      widthGrowFactor={1}
    >
      <Button
        id="bTrans_Delete"
        hidden={
          '{{(txtID_TransEdit === null || txtID_TransEdit.value === "") ? true : false}}'
        }
        size="small"
        style={{ ordered: [{ background: "rgb(76, 0, 0)" }] }}
        text="Delete"
      >
        <Event
          id="ec81c509"
          event="click"
          method="open"
          params={{
            ordered: [
              { title: "Are you sure you want to delete this record?" },
              { description: "" },
              {
                actionItems: [
                  {
                    ordered: [
                      { label: "Yes" },
                      {
                        event: {
                          ordered: [
                            { event: "click" },
                            { method: "trigger" },
                            { pluginId: "QTTransport_Delete" },
                            { type: "datasource" },
                            { waitMs: 0 },
                            { waitType: "debounce" },
                          ],
                        },
                      },
                    ],
                  },
                  {
                    ordered: [
                      { label: "No" },
                      {
                        event: {
                          ordered: [
                            { event: "click" },
                            { method: "trigger" },
                            { pluginId: "" },
                            { type: "datasource" },
                            { waitMs: 0 },
                            { waitType: "debounce" },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          }}
          pluginId=""
          type="alert"
          waitMs="0"
          waitType="debounce"
        />
      </Button>
    </Container>
    <Container
      id="container26"
      align="flex-start"
      cornerType="square"
      gap={8}
      justify="flex-start"
      layout="column"
      padding={{
        ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
      }}
      widthGrowFactor={4}
    >
      <Button
        id="bTrans_Confirm"
        disabled={
          '{{ ( cboTransGrower.value === null ) ||( cboTransGrower.value === "" ) || ( txtTransDate.value === null) || ( txtTransDate.value === "" ) || (QRatePerKM.isFetching) }}'
        }
        size="small"
        style={{ ordered: [{ background: "rgb(3, 48, 5)" }] }}
        text={
          '{{(QRatePerKM.isFetching) ? "Loading" : (txtID_TransEdit === null || txtID_TransEdit.value === "") ? "Add" : "Edit"}}'
        }
      >
        <Event
          id="3ff6c176"
          enabled={'{{bTrans_Confirm.text == "Add"}}'}
          event="click"
          method="open"
          params={{
            ordered: [
              { title: "Are you sure you want to add new record?" },
              { description: "" },
              {
                actionItems: [
                  {
                    ordered: [
                      { label: "Yes" },
                      {
                        event: {
                          ordered: [
                            { event: "click" },
                            { method: "trigger" },
                            { pluginId: "QTTransport_Append" },
                            { type: "datasource" },
                            { waitMs: 0 },
                            { waitType: "debounce" },
                          ],
                        },
                      },
                    ],
                  },
                  {
                    ordered: [
                      { label: "No" },
                      {
                        event: {
                          ordered: [
                            { event: "click" },
                            { method: "trigger" },
                            { pluginId: "" },
                            { type: "datasource" },
                            { waitMs: 0 },
                            { waitType: "debounce" },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          }}
          pluginId=""
          type="alert"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="ec0b6207"
          enabled={'{{bTrans_Confirm.text == "Edit"}}'}
          event="click"
          method="open"
          params={{
            ordered: [
              { title: "Are you sure you want to edit this record?" },
              { description: "" },
              {
                actionItems: [
                  {
                    ordered: [
                      { label: "Yes" },
                      {
                        event: {
                          ordered: [
                            { event: "click" },
                            { method: "trigger" },
                            { pluginId: "QTTransport_Edit" },
                            { type: "datasource" },
                            { waitMs: 0 },
                            { waitType: "debounce" },
                          ],
                        },
                      },
                    ],
                  },
                  {
                    ordered: [
                      { label: "No" },
                      {
                        event: {
                          ordered: [
                            { event: "click" },
                            { method: "trigger" },
                            { pluginId: "" },
                            { type: "datasource" },
                            { waitMs: 0 },
                            { waitType: "debounce" },
                          ],
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          }}
          pluginId=""
          type="alert"
          waitMs="0"
          waitType="debounce"
        />
      </Button>
    </Container>
    <Container
      id="container27"
      align="flex-start"
      cornerType="square"
      gap={8}
      hidden={
        '{{(txtID_TransEdit === null || txtID_TransEdit.value === "") ? true : false}}'
      }
      justify="flex-start"
      layout="column"
      padding={{
        ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
      }}
      widthGrowFactor={1}
    >
      <Button
        id="bTrans_Reset"
        hidden={
          '{{(txtID_TransEdit === null || txtID_TransEdit.value === "") ? true : false}}'
        }
        size="small"
        style={{ ordered: [{ background: "rgb(37, 54, 103)" }] }}
        text="Reset"
      >
        <Event
          id="bab2c5c4"
          event="click"
          method="trigger"
          params={{ ordered: [] }}
          pluginId="jsoResetForm_Trans"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="2b42b6fa"
          event="click"
          method="trigger"
          params={{ ordered: [] }}
          pluginId="QTransport_Data"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
      </Button>
    </Container>
  </Container>
  <CustomCollectionView
    id="colTrans_Data"
    data="{{QTransport_Data.data}}"
    gap={4}
    instances={5}
    numRows={5}
    padding={{
      ordered: [{ left: 4 }, { right: 4 }, { top: 8 }, { bottom: 8 }],
    }}
    pageSize={5}
    showSeparator={true}
  >
    <Container
      id="container21"
      align="center"
      cornerType="square"
      gap={8}
      justify="flex-start"
      layout="row"
      padding={{
        ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
      }}
      widthGrowFactor={1}
    >
      <Container
        id="container22"
        align="flex-start"
        cornerType="square"
        gap={8}
        justify="flex-start"
        layout="row"
        padding={{
          ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
        }}
        widthGrowFactor={2}
      >
        <Text
          id="text4"
          size="large"
          value="{{ moment(item.Date).format('YYYY/MM/DD') }}"
          weight="semibold"
          width="fixed"
        />
      </Container>
      <Container
        id="container23"
        align="flex-start"
        cornerType="square"
        gap={8}
        justify="flex-start"
        layout="column"
        padding={{
          ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
        }}
        widthGrowFactor={2}
      >
        <Text
          id="txtHours_Edit2"
          size="large"
          value="{{ item.KM }} Day"
          weight="semibold"
        />
      </Container>
      <Container
        id="container24"
        align="flex-start"
        cornerType="square"
        gap={8}
        justify="flex-start"
        layout="column"
        padding={{
          ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
        }}
        widthGrowFactor={1}
      >
        <Button
          id="bEdit_HoursRecord2"
          size="small"
          style={{ ordered: [{ background: "rgba(37, 54, 103, 1)" }] }}
          text="Edit"
        >
          <Event
            id="04d81a01"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.ID}}" }] }}
            pluginId="txtID_TransEdit"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="51e09bb1"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.Date}}" }] }}
            pluginId="txtTransDate"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="5b7fe244"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.KM}}" }] }}
            pluginId="txtDay"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="d7088408"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.RatePerKM}}" }] }}
            pluginId="txtRPD"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="6a6854a5"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.Driver}}" }] }}
            pluginId="cboDriver_Transporter"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="9be938ed"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.Comment}}" }] }}
            pluginId="txtComments_Transporter"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
        </Button>
      </Container>
    </Container>
  </CustomCollectionView>
</Screen>
