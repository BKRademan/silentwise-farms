<Screen
  id="captureHours"
  _customShortcuts={[]}
  _hashParams={[]}
  _searchParams={[]}
  title="Capture Hours"
  uuid="e0bb15a3-25b7-487d-a71b-7135dbe2fe0d"
>
  <Text
    id="txtID_HoursEdit"
    hidden="true"
    markdown={true}
    size="medium"
    weight="normal"
  />
  <TextArea
    id="txtEmpCheck"
    hidden="true"
    minLines={1}
    placeholder="Enter value"
  />
  <Container
    id="container4"
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
    <Select
      id="cboGrower"
      allowDeselect={true}
      label="Grower"
      labelPosition="top"
      labels="{{QcboGrowers.data.GrowerName}}"
      placeholder="Select an option"
      value=""
      values="{{QcboGrowers.data.ID}}"
    >
      <Event
        id="070b09be"
        event="change"
        method="clearValue"
        params={{ ordered: [] }}
        pluginId="txtID_HoursEdit"
        type="widget"
        waitMs="0"
        waitType="debounce"
      />
    </Select>
    <DatePicker
      id="txtDate"
      displayTimeZone="local"
      label="Date"
      mode="date"
      value={'{{moment().format("YYYY-MM-DD")}}'}
      valueTimeZone="local"
    >
      <Event
        id="c2feacef"
        enabled="{{cboEmployee.value != null}}"
        event="change"
        method="trigger"
        params={{ ordered: [] }}
        pluginId="QEmpCheck_Hours"
        type="datasource"
        waitMs="0"
        waitType="debounce"
      />
    </DatePicker>
  </Container>
  <Container
    id="container5"
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
      id="container28"
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
        id="container30"
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
          id="cboEmployee"
          allowCustomValue={true}
          allowDeselect={true}
          label="Employee"
          labelPosition="top"
          labels="{{QcboEmployee.data.Employee}}"
          placeholder="Select an option"
          value=""
          values="{{QcboEmployee.data.ID}}"
        >
          <Event
            id="68581cf0"
            event="change"
            method="focus"
            params={{ ordered: [] }}
            pluginId="txtHours"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="0a433587"
            event="change"
            method="trigger"
            params={{ ordered: [] }}
            pluginId="QEmpRate"
            type="datasource"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="8016aa4d"
            enabled="{{txtDate.value != null}}"
            event="change"
            method="trigger"
            params={{ ordered: [] }}
            pluginId="QEmpCheck_Hours"
            type="datasource"
            waitMs="0"
            waitType="debounce"
          />
        </Select>
      </Container>
      <Container
        id="container31"
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
          id="bRefreshCBO"
          iconBefore="bold/interface-arrows-synchronize"
          size="large"
          style={{ ordered: [{ background: "rgb(37, 54, 103)" }] }}
        >
          <Event
            id="d290f1f9"
            event="click"
            method="resetValue"
            params={{ ordered: [] }}
            pluginId="cboEmployee"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
        </Button>
      </Container>
    </Container>
    <Container
      id="container29"
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
        id="txtHours"
        label="Hours"
        placeholder={0}
        stepSize={1}
        value=""
      />
    </Container>
  </Container>
  <Container
    id="container6"
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
      id="txtSickLeave"
      label="Sick Leave"
      placeholder={0}
      stepSize={1}
      value="0"
    />
    <NumberInput
      id="txtPubHoliday"
      label="Public Holiday"
      placeholder={0}
      stepSize={1}
      value="0"
    />
    <NumberInput
      id="txtOvertime"
      label="Overtime"
      placeholder={0}
      stepSize={1}
      value="0"
    />
  </Container>
  <Include src="./container7.rsx" />
  <Container
    id="conButtonGroup"
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
      id="container14"
      align="flex-start"
      cornerType="square"
      gap={8}
      hidden={
        '{{(txtID_HoursEdit === null || txtID_HoursEdit.value === "") ? true : false}}'
      }
      justify="flex-start"
      layout="column"
      padding={{
        ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
      }}
      widthGrowFactor={2}
    >
      <Button
        id="bHours_Delete"
        hidden={
          '{{(txtID_HoursEdit === null || txtID_HoursEdit.value === "") ? true : false}}'
        }
        size="small"
        style={{ ordered: [{ background: "rgb(76, 0, 0)" }] }}
        text="Delete"
      >
        <Event
          id="58cccb4e"
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
                            { pluginId: "QTHours_Delete" },
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
      id="container15"
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
        id="bHours_Confirm"
        disabled={
          '{{ ( cboGrower.value === null ) || ( cboGrower.value === "" ) || ( txtDate.value === null ) || ( txtDate.value === "" ) || ( txtHours.value === null ) || ( txtHours.value === "" ) || ( cboEmployee.value === null) || ( cboEmployee.value === "" ) || ( QEmpRate.isFetching ) || (QEmpCheck_Hours.isFetching) || (QTHours_Append.isFetching)  || (QGrowerValues.isFetching)  || (QTHours_Edit.isFetching) }}'
        }
        size="small"
        style={{ ordered: [{ background: "rgb(3, 48, 5)" }] }}
        text={
          '{{(QEmpCheck_Hours.isFetching || QEmpRate.isFetching || QTHours_Append.isFetching || QGrowerValues.isFetching || QTHours_Edit.isFetching) ? "Loading" : (txtID_HoursEdit === null || txtID_HoursEdit.value === "") ? "Add" : "Edit"}}'
        }
      >
        <Event
          id="e106e658"
          enabled={
            '{{bHours_Confirm.text == "Add" && txtEmpCheck.value == "NOT WORKING"}}'
          }
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
                            { pluginId: "QTHours_Append" },
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
          id="713b3fc9"
          enabled={
            '{{bHours_Confirm.text == "Edit" && txtEmpCheck.value == "NOT WORKING"}}'
          }
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
                            { pluginId: "QTHours_Edit" },
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
          id="5254e9f0"
          enabled={'{{txtEmpCheck.value == "WORKING"}}'}
          event="click"
          method="open"
          params={{
            ordered: [
              { title: "This employee is already working on this date." },
              { description: "" },
              {
                actionItems: [
                  {
                    ordered: [
                      { label: "OK" },
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
      id="container16"
      align="flex-start"
      cornerType="square"
      gap={8}
      hidden={
        '{{(txtID_HoursEdit === null || txtID_HoursEdit.value === "") ? true : false}}'
      }
      justify="flex-start"
      layout="column"
      padding={{
        ordered: [{ left: 0 }, { right: 0 }, { top: 0 }, { bottom: 0 }],
      }}
      widthGrowFactor={2}
    >
      <Button
        id="bNew_Hours"
        hidden={
          '{{(txtID_HoursEdit === null || txtID_HoursEdit.value === "") ? true : false}}'
        }
        size="small"
        style={{ ordered: [{ background: "rgb(37, 54, 103)" }] }}
        text="Reset"
      >
        <Event
          id="179c361a"
          event="click"
          method="trigger"
          params={{ ordered: [] }}
          pluginId="jsoResetForm_Hours"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
        <Event
          id="5eec83a8"
          event="click"
          method="trigger"
          params={{ ordered: [] }}
          pluginId="QTHours_Data"
          type="datasource"
          waitMs="0"
          waitType="debounce"
        />
      </Button>
    </Container>
  </Container>
  <CustomCollectionView
    id="colHours_Data"
    data="{{QTHours_Data.data}}"
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
      id="container9"
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
        id="container10"
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
          id="text1"
          size="large"
          value="{{ item.Employee }}"
          weight="semibold"
          width="fixed"
        />
      </Container>
      <Container
        id="container11"
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
          id="txtHours_Edit"
          size="large"
          value="{{ item.Hours_Worked }} Hours"
          weight="semibold"
        />
      </Container>
      <Container
        id="container12"
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
          id="bEdit_HoursRecord"
          size="small"
          style={{ ordered: [{ background: "rgba(37, 54, 103, 1)" }] }}
          text="Edit"
        >
          <Event
            id="f342a886"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.ID}}" }] }}
            pluginId="txtID_HoursEdit"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="c9c2c0e8"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{ item.Hours_Worked }}" }] }}
            pluginId="txtHours"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="c0fce424"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.Employee_ID_FK}}" }] }}
            pluginId="cboEmployee"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="9cadebcb"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.Sick_Leave}}" }] }}
            pluginId="txtSickLeave"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="f2fcc309"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.PHoliday}}" }] }}
            pluginId="txtPubHoliday"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="4d5c7eea"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.Overtime}}" }] }}
            pluginId="txtOvertime"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="ac3a4084"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.Emp_Rate}}" }] }}
            pluginId="txtEmpRate"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="d6abae9e"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.Con_Tot}}" }] }}
            pluginId="txtConTot"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="8fc0e331"
            event="click"
            method="setValue"
            params={{ ordered: [{ value: "{{item.Man_Fee}}" }] }}
            pluginId="txtManFee"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="f600a214"
            event="click"
            method="setValue"
            params={{
              ordered: [
                {
                  value:
                    '{{numbro(item.Man_Fee).format({output: "percent", mantissa: 2})}}',
                },
              ],
            }}
            pluginId="txtManFee_Perc"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="7b381e33"
            event="click"
            method="setValue"
            params={{
              ordered: [
                {
                  value:
                    '{{numbro(item.Con_Tot).format({output: "percent", mantissa: 2})}}',
                },
              ],
            }}
            pluginId="txtConTot_Perc"
            type="widget"
            waitMs="0"
            waitType="debounce"
          />
          <Event
            id="5dbf20bd"
            event="click"
            method="trigger"
            params={{ ordered: [] }}
            pluginId="QEmpCheck_Hours"
            type="datasource"
            waitMs="0"
            waitType="debounce"
          />
        </Button>
      </Container>
    </Container>
  </CustomCollectionView>
</Screen>
