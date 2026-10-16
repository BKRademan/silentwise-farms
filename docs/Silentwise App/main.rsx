<MobileApp>
  <Include src="./functions.rsx" />
  <TabScreen
    id="tabscreen"
    items={[
      {
        ordered: [
          { screen: "captureHours" },
          { detailScreen: "" },
          { title: null },
          { icon: null },
        ],
      },
      {
        ordered: [
          { screen: "captureTransport" },
          { detailScreen: "" },
          { title: "Capture Transport" },
          { icon: null },
        ],
      },
      {
        ordered: [
          { screen: "capturePpeScreen" },
          { detailScreen: "" },
          { title: null },
          { icon: null },
        ],
      },
    ]}
  />
  <Include src="./src/captureHours.rsx" />
  <Include src="./src/captureTransport.rsx" />
  <Include src="./src/capturePpeScreen.rsx" />
</MobileApp>
