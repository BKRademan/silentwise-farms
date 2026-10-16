<GlobalFunctions>
  <JavascriptQuery
    id="jsoGetGrowerValues"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/jsoGetGrowerValues.js", "string")}
    resourceName="JavascriptQuery"
    transformer="// Query results are available as the `data` variable
return data"
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <JavascriptQuery
    id="jsoHasWorked"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/jsoHasWorked.js", "string")}
    resourceName="JavascriptQuery"
    transformer="// Query results are available as the `data` variable
return data"
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <JavascriptQuery
    id="jsoGetEmpRate"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/jsoGetEmpRate.js", "string")}
    resourceName="JavascriptQuery"
    transformer="// Query results are available as the `data` variable
return data"
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <JavascriptQuery
    id="jsoGetRatePerKM"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/jsoGetRatePerKM.js", "string")}
    resourceName="JavascriptQuery"
    transformer="// Query results are available as the `data` variable
return data"
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <JavascriptQuery
    id="jsoResetForm_Hours"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/jsoResetForm_Hours.js", "string")}
    resourceName="JavascriptQuery"
    transformer="// Query results are available as the `data` variable
return data"
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <JavascriptQuery
    id="jsoResetForm_Trans"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/jsoResetForm_Trans.js", "string")}
    resourceName="JavascriptQuery"
    transformer="// Query results are available as the `data` variable
return data"
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <SqlQueryUnified
    id="QEmpRate"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    query={include("./lib/QEmpRate.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    runWhenModelUpdates={false}
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="bf369efe"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="jsoGetEmpRate"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <SqlQueryUnified
    id="QGrowerValues"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    query={include("./lib/QGrowerValues.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="87cb15ec"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="jsoGetGrowerValues"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <SqlQueryUnified
    id="QRatePerKM"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QRatePerKM.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="0cb353ee"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="jsoGetRatePerKM"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <SqlQueryUnified
    id="QEmpCheck_Hours"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QEmpCheck_Hours.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    runWhenModelUpdates={false}
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="1b615a58"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="jsoHasWorked"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <SqlQueryUnified
    id="QcboGrowers"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QcboGrowers.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    resourceTypeOverride=""
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <SqlQueryUnified
    id="QcboEmployee"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QcboEmployee.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <SqlQueryUnified
    id="QcboTransGrowers"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QcboTransGrowers.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    resourceTypeOverride=""
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <SqlQueryUnified
    id="QcboGrowers_Default"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QcboGrowers_Default.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    resourceTypeOverride=""
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <SqlQueryUnified
    id="QcboTransGrowers_Default"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QcboTransGrowers_Default.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    resourceTypeOverride=""
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <SqlQueryUnified
    id="QTHours_Data"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QTHours_Data.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <SqlQueryUnified
    id="QTHours_Append"
    confirmationMessage="Are you sure you want to add new record?"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QTHours_Append.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    runWhenModelUpdates={false}
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="c78b2b4c"
      event="success"
      method="resetValue"
      params={{ ordered: [] }}
      pluginId="cboEmployee"
      type="widget"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="672a924f"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="QTHours_Data"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="c9fe68dd"
      event="success"
      method="resetValue"
      params={{ ordered: [] }}
      pluginId="txtSickLeave"
      type="widget"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="2a093949"
      event="success"
      method="resetValue"
      params={{ ordered: [] }}
      pluginId="txtPubHoliday"
      type="widget"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="9663128a"
      event="success"
      method="resetValue"
      params={{ ordered: [] }}
      pluginId="txtOvertime"
      type="widget"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <SqlQueryUnified
    id="QTHours_Edit"
    confirmationMessage="Are you sure you want to edit this record?"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QTHours_Edit.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    runWhenModelUpdates={false}
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="74d65db3"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="jsoResetForm_Hours"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="bfd9e508"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="QTHours_Data"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <SqlQueryUnified
    id="QTHours_Delete"
    confirmationMessage="Are you sure you want to delete this record?"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QTHours_Delete.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    runWhenModelUpdates={false}
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="0bdda82b"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="jsoResetForm_Hours"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="03ed185a"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="QTHours_Data"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <SqlQueryUnified
    id="QTransport_Data"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    query={include("./lib/QTransport_Data.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <SqlQueryUnified
    id="QTTransport_Append"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QTTransport_Append.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    runWhenModelUpdates={false}
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="166ae70c"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="QTransport_Data"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <SqlQueryUnified
    id="QTTransport_Edit"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    query={include("./lib/QTTransport_Edit.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    runWhenModelUpdates={false}
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="c462f8eb"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="jsoResetForm_Trans"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="1620a1df"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="QTransport_Data"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <SqlQueryUnified
    id="QTTransport_Delete"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QTTransport_Delete.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    runWhenModelUpdates={false}
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="9e32f788"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="jsoResetForm_Trans"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="22908ceb"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="QTransport_Data"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <SqlQueryUnified
    id="QcboPPE"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    query={include("./lib/QcboPPE.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <SqlQueryUnified
    id="QcboEmployee_PPE"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QcboEmployee_PPE.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <SqlQueryUnified
    id="QPPEValue"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QPPEValue.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    runWhenModelUpdates={false}
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="a50e0954"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="jsoGetPPEValue"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <JavascriptQuery
    id="jsoGetPPEValue"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/jsoGetPPEValue.js", "string")}
    resourceName="JavascriptQuery"
    transformer="// Query results are available as the `data` variable
return data"
    workflowActionType={null}
    workflowBlockPluginId={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <SqlQueryUnified
    id="QTDeductions_Data"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QTDeductions_Data.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <JavascriptQuery
    id="jsoResetForm_PPE"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    query={include("./lib/jsoResetForm_PPE.js", "string")}
    resourceName="JavascriptQuery"
    transformer="// Query results are available as the `data` variable
return data"
    workflowActionType={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  />
  <SqlQueryUnified
    id="QPPE_Append"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    isMultiplayerEdited={false}
    query={include("./lib/QPPE_Append.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    runWhenModelUpdates={false}
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="d69ac9ad"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="jsoResetForm_PPE"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="122a8021"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="QTDeductions_Data"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <SqlQueryUnified
    id="QPPE_Delete"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    query={include("./lib/QPPE_Delete.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    runWhenModelUpdates={false}
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="bfddebb3"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="jsoResetForm_PPE"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="08ca2ed2"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="QTDeductions_Data"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
  <SqlQueryUnified
    id="QPPE_Edit"
    errorTransformer="// The variable 'data' allows you to reference the request's data in the transformer. 
// example: return data.find(element => element.isError)
return data.error"
    isHidden={false}
    query={include("./lib/QPPE_Edit.sql", "string")}
    resourceDisplayName="TMEW-Azure Server- Admin"
    resourceName="c4969dca-4816-4f6e-9d58-e09cc766889e"
    runWhenModelUpdates={false}
    transformer="// Query results are available as the `data` variable
return data"
    warningCodes={[]}
    workflowActionType={null}
    workflowBlockUuid={null}
    workflowRunId={null}
  >
    <Event
      id="1d9ef1f3"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="jsoResetForm_PPE"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
    <Event
      id="3d8f7ff3"
      event="success"
      method="trigger"
      params={{ ordered: [] }}
      pluginId="QTDeductions_Data"
      type="datasource"
      waitMs="0"
      waitType="debounce"
    />
  </SqlQueryUnified>
</GlobalFunctions>
