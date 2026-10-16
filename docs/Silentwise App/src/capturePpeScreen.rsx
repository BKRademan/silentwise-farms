<Screen
  id="capturePpeScreen"
  _customShortcuts={[]}
  _hashParams={[]}
  _searchParams={[]}
  title="Capture PPE"
  uuid="26b4bfb0-17b3-4355-b23d-a98629b914c5"
>
  <Text
    id="txtPPE_EditID"
    hidden="true"
    markdown={true}
    size="medium"
    weight="normal"
  />
  <Container
    id="container32"
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
    <Container
      id="container33"
      align="flex-end"
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
        id="container34"
        align="flex-end"
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
          id="container37"
          align="flex-start"
          cornerType="square"
          gap={8}
          justify="flex-start"
          layout="column"
          padding={{
            ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
          }}
          widthGrowFactor={5}
        >
          <Select
            id="cboEmp_PPE"
            allowCustomValue={true}
            allowDeselect={true}
            label="Employee"
            labelPosition="top"
            labels="{{QcboEmployee_PPE.data.Employee}}"
            placeholder="Select an option"
            value=""
            values="{{QcboEmployee_PPE.data.ID}}"
          />
        </Container>
        <Container
          id="container35"
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
            id="bRefreshEmps_PPE"
            iconBefore="bold/interface-arrows-synchronize"
            size="large"
            style={{ ordered: [{ background: "rgb(37, 54, 103)" }] }}
          >
            <Event
              id="a3533242"
              event="click"
              method="resetValue"
              params={{ ordered: [] }}
              pluginId="cboEmp_PPE"
              type="widget"
              waitMs="0"
              waitType="debounce"
            />
          </Button>
        </Container>
      </Container>
      <Container
        id="container36"
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
          id="txtDate_PPE"
          displayTimeZone="local"
          label="Date"
          mode="date"
          value={'{{moment().format("YYYY-MM-DD")}}'}
          valueTimeZone="local"
        />
      </Container>
    </Container>
    <Container
      id="container38"
      align="flex-end"
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
        id="container41"
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
          id="cboPPE_Item"
          allowCustomValue={true}
          allowDeselect={true}
          label="PPE Item"
          labelPosition="top"
          labels="{{QcboPPE.data.PPE_Item}}"
          placeholder="Select an option"
          value=""
          values="{{QcboPPE.data.ID}}"
        >
          <Event
            id="3ca7351c"
            event="change"
            method="focus"
            params={{ ordered: [] }}
            pluginId="txtPPEValue"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="d7738e78"
            event="change"
            method="trigger"
            params={{ ordered: [] }}
            pluginId="QPPEValue"
            type="datasource"
            waitMs="0"
            waitType="debounce"
          />
        </Select>
      </Container>
      <Container
        id="container42"
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
        <NumberInput
          id="txtPPEValue"
          label="Value"
          placeholder={0}
          stepSize={1}
          value="0"
        />
      </Container>
    </Container>
    <Container
      id="container51"
      align="flex-start"
      cornerType="square"
      gap={8}
      justify="flex-start"
      layout="column"
      padding={{
        ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
      }}
      widthGrowFactor={1}
    />
  </Container>
  <Container
    id="container43"
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
      id="container44"
      align="flex-start"
      cornerType="square"
      gap={8}
      hidden={
        '{{(txtPPE_EditID === null || txtPPE_EditID.value === "") ? true : false}}'
      }
      justify="flex-start"
      layout="column"
      padding={{
        ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
      }}
      widthGrowFactor={1}
    >
      <Button
        id="bDelete_PPE"
        disabled="{{QPPEValue.isFetching || QTDeductions_Data.isFetching || QPPE_Append.isFetching || QPPE_Delete.isFetching ? true : false}}"
        hidden={
          '{{(txtPPE_EditID === null || txtPPE_EditID.value === "") ? true : false}}'
        }
        size="small"
        style={{ ordered: [{ background: "rgb(76, 0, 0)" }] }}
        text="Delete"
      >
        <Event
          id="a36a34e5"
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
                            { pluginId: "QPPE_Delete" },
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
      id="container45"
      align="flex-start"
      cornerType="square"
      gap={8}
      justify="flex-start"
      layout="column"
      padding={{
        ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
      }}
      widthGrowFactor={3}
    >
      <Button
        id="bAdd_PPE"
        disabled={
          '{{QPPEValue.isFetching || QTDeductions_Data.isFetching || QPPE_Append.isFetching || QPPE_Delete.isFetching || ( cboEmp_PPE.value === null ) || ( cboEmp_PPE.value === "" ) || ( txtDate_PPE.value === null ) || ( txtDate_PPE.value === "" ) || ( cboPPE_Item.value === null ) || ( cboPPE_Item.value === "" ) || ( txtPPEValue.value === null ) || ( txtPPEValue.value === "" ) ? true : false}}'
        }
        size="small"
        style={{ ordered: [{ background: "rgb(3, 48, 5)" }] }}
        text={
          '{{QPPEValue.isFetching || QTDeductions_Data.isFetching || QPPE_Append.isFetching ? "Loading" :(txtPPE_EditID.value === null || txtPPE_EditID.value === "") ? "Add" : "Edit"}}'
        }
      >
        <Event
          id="8ec03ef0"
          enabled={'{{bAdd_PPE.text == "Add"}}'}
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
                            { pluginId: "QPPE_Append" },
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
          id="78bea8dd"
          enabled={'{{bAdd_PPE.text == "Edit"}}'}
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
                            { pluginId: "QPPE_Edit" },
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
      id="container46"
      align="flex-start"
      cornerType="square"
      gap={8}
      hidden={
        '{{(txtPPE_EditID === null || txtPPE_EditID.value === "") ? true : false}}'
      }
      justify="flex-start"
      layout="column"
      padding={{
        ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
      }}
      widthGrowFactor={1}
    >
      <Button
        id="bNew_PPE"
        disabled="{{QPPEValue.isFetching || QTDeductions_Data.isFetching || QPPE_Append.isFetching || QPPE_Delete.isFetching ? true : false}}"
        hidden={
          '{{(txtPPE_EditID === null || txtPPE_EditID.value === "") ? true : false}}'
        }
        size="small"
        style={{ ordered: [{ background: "rgb(37, 54, 103)" }] }}
        text="Reset"
      >
        <Event
          id="5a01161a"
          event="click"
          method="trigger"
          params={{ ordered: [] }}
          pluginId="jsoResetForm_PPE"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
      </Button>
    </Container>
  </Container>
  <CustomCollectionView
    id="col_PPE_Data"
    data="{{QTDeductions_Data.data}}"
    gap={4}
    instances={5}
    numRows={5}
    padding={{
      ordered: [{ left: 4 }, { right: 4 }, { top: 8 }, { bottom: 8 }],
    }}
    pageSize={5}
  >
    <Container
      id="container47"
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
        id="container48"
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
        <Text
          id="txtEmp_PPE"
          size="large"
          style={{ ordered: [] }}
          value="{{item.Employee}}"
          weight="semibold"
        />
      </Container>
      <Container
        id="container49"
        align="flex-start"
        cornerType="square"
        gap={8}
        justify="center"
        layout="column"
        padding={{
          ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
        }}
        widthGrowFactor={3}
      >
        <Text
          id="txtValue_PPE"
          size="large"
          value="{{ item.PPE }}"
          weight="semibold"
          width="fixed"
        />
      </Container>
      <Container
        id="container50"
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
          id="bEdit_PPE"
          size="small"
          style={{ ordered: [{ background: "rgb(37, 54, 103)" }] }}
          text="Edit"
        >
          <Event
            id="29af79e3"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.ID}}" }] }}
            pluginId="txtPPE_EditID"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="333ed60c"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.PPE}}" }] }}
            pluginId="txtPPEValue"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="9327044c"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.EmpID}}" }] }}
            pluginId="cboEmp_PPE"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
        </Button>
      </Container>
    </Container>
  </CustomCollectionView>
</Screen>
